//! TypeSafe `/v1/systemone` 客户端 —— 这个实验真正的被试。
//!
//! 协议类型（`SystemOneRequest` / `SystemOneQuestions` / `ChoiceAnswer` /
//! `Usage`）是照着 `docs.typesafe.ai/api` 写的，不是照着某个实现的抄的 ——
//! 2026-10-17 逐字段核对过。
//! Score / Noul 两种答案保留但不用 —— 存在的意义是证明**解析器遇到
//! 没问过的答案类型不会噎住**。
//!
//! 协议一句话：**把状态丢给模型，让它在给定的几个选项里选一个，
//! 顺便告诉你每个选项的概率和它有多确定。**

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::time::{Duration, Instant};

use crate::game::{Direction, GameState};
use crate::proxy::{self, ProxySetting, ProxyTarget};

/// `POST /v1/systemone` 的问题名，响应里用同一个 key 取答案。
pub const QUESTION_NEXT_MOVE: &str = "next_move";
/// 多步规划用的���题名。
pub const QUESTION_PLAN: &str = "plan";

/// 文档写死的一条限制：Choice 最多 255 个选项。超了就报错，
/// 绝不悄悄截断 —— 截断等于偷偷删掉模型本可以选的棋路。
const MAX_CHOICE_OPTIONS: usize = 255;

#[derive(Debug, Clone)]
pub struct JevConfig {
    pub base_url: String,
    pub api_key: Option<String>,
    pub model: String,
    pub timeout: Duration,
    /// 代理怎么定。默认从 `from_env` 来的实例是 [`ProxySetting::FromEnv`]，
    /// 因为 2026-10-17 实测：不走代理这台机器被 451 挡住，走代理能拿到 200。
    pub proxy: ProxySetting,
    /// 提问用什么语言。见 [`PromptLang`]。
    pub prompt_lang: PromptLang,
    /// `state` 怎么编码。见 [`StateKind`]。
    pub state_kind: StateKind,
    /// 一次请求问几步。1 = 每步都问（默认）；N > 1 = 一次问一条 N 步的路线，
    /// 然后本地一步步验着走。`JEV_PLAN=N`。
    pub plan_horizon: usize,
    /// 传输层失败时重试几次。`TYPESAFE_RETRIES`，默认 1，设 0 关掉。
    pub retries: u32,
}

/// 提问语言。默认英文 —— 文档明说 Jev 主语言是英语，CJK「准确率更低」。
///
/// 中文那一档不是给日常用的，是为了复现 2026-10-16 那个「蛇一直向右」的
/// 条件，好和英文档做 2×2 对照（见 `FINDINGS.md` 第六节第 4 条）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum PromptLang {
    #[default]
    En,
    Zh,
}

impl PromptLang {
    pub fn parse(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "en" | "english" => Some(PromptLang::En),
            "zh" | "cn" | "chinese" => Some(PromptLang::Zh),
            _ => None,
        }
    }
}

/// `state` 字段怎么编码。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum StateKind {
    /// 直接传 JSON 对象 —— 文档推荐的形式。
    #[default]
    Object,
    /// 「把 JSON 塞进字符串里」—— 2026-10-16 之前一直用的那种双重编码。
    String,
}

impl StateKind {
    pub fn parse(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "object" => Some(StateKind::Object),
            "string" => Some(StateKind::String),
            _ => None,
        }
    }
}

impl JevConfig {
    /// 从环境变量读配置。缺 key 不报错，返回 `api_key: None`，
    /// 让上层如实报告「没配」，而不是 panic。
    pub fn from_env() -> Self {
        let non_empty = |k: &str| std::env::var(k).ok().filter(|v| !v.trim().is_empty());
        Self {
            base_url: non_empty("TYPESAFE_BASE_URL")
                .unwrap_or_else(|| "https://api.typesafe.ai".to_string()),
            api_key: non_empty("TYPESAFE_API_KEY"),
            model: non_empty("TYPESAFE_MODEL").unwrap_or_else(|| "jev-latest".to_string()),
            timeout: Duration::from_millis(
                non_empty("TYPESAFE_TIMEOUT_MS")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(3_000),
            ),
            // 默认认环境变量。这是让这条实验在这个网络环境下能跑通的唯一办法。
            proxy: ProxySetting::FromEnv,
            prompt_lang: non_empty("JEV_PROMPT_LANG")
                .and_then(|v| PromptLang::parse(&v))
                .unwrap_or_default(),
            state_kind: non_empty("JEV_STATE_KIND")
                .and_then(|v| StateKind::parse(&v))
                .unwrap_or_default(),
            plan_horizon: non_empty("JEV_PLAN")
                .and_then(|v| v.parse().ok())
                .filter(|n| *n >= 1)
                .unwrap_or(1),
            retries: non_empty("TYPESAFE_RETRIES")
                .and_then(|v| v.parse().ok())
                .unwrap_or(1),
        }
    }

    pub fn endpoint(&self) -> String {
        format!("{}/v1/systemone", self.base_url.trim_end_matches('/'))
    }
}

/// 客户端能出的所有错。每一种都对应汇总表里一行不同的结论，所以不合并。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum JevError {
    NotConfigured,
    Network(String),
    Timeout,
    Http { status: u16, body: String },
    Invalid(String),
}

impl JevError {
    /// 短标签，进汇总表用。
    pub fn label(&self) -> &'static str {
        match self {
            JevError::NotConfigured => "not-configured",
            JevError::Network(_) => "network",
            JevError::Timeout => "timeout",
            JevError::Http { .. } => "http",
            JevError::Invalid(_) => "invalid",
        }
    }

    /// 已知故障的人话解释。没命中就返回 None —— 不编。
    pub fn hint(&self) -> Option<&'static str> {
        match self {
            JevError::Http { status: 451, .. } => {
                Some("TypeSafe 在当前地区不提供服务（HTTP 451）。设置 https_proxy / all_proxy 走代理，或换网络环境。")
            }
            JevError::Http { status: 401, .. } => Some("API key 无效或已过期。"),
            JevError::Http { status: 429, .. } => Some("被限流了（429）。"),
            _ => None,
        }
    }
}

impl std::fmt::Display for JevError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            JevError::NotConfigured => write!(f, "TYPESAFE_API_KEY 未设置"),
            JevError::Network(e) => write!(f, "network: {e}"),
            JevError::Timeout => write!(f, "timeout"),
            JevError::Http { status, body } => write!(f, "HTTP {status}: {body}"),
            JevError::Invalid(e) => write!(f, "invalid response: {e}"),
        }
    }
}

/// 这个错值得再来一次吗？只有传输层的才算。
fn is_transient(e: &JevError) -> bool {
    matches!(e, JevError::Network(_) | JevError::Timeout)
}

// ---------------------------------------------------------------------------
// 请求体
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct SystemOneRequest {
    /// 模型读的上下文。我们放的是 `GameState` 的 JSON。
    ///
    /// 是**对象**，不是「JSON 塞进字符串里」—— 文档明确说
    /// "Use an object for most requests so each part of the state has a
    /// descriptive name"。多套一层编码只会白白吃掉上下文。
    pub state: serde_json::Value,
    pub model: String,
    pub questions: SystemOneQuestions,
}

#[derive(Debug, Clone, Serialize)]
pub struct SystemOneQuestions {
    pub next_move: ChoiceQuestion,
}

/// 多步规划用的请求体。和单步的 `SystemOneRequest` 分成两个类型，
/// 而不是把 `questions` 退化成 `serde_json::Value` —— 那样会失去
/// 「问题 id 必须和答案 key 对上」这个保证。
#[derive(Debug, Clone, Serialize)]
pub struct SystemOnePlanRequest {
    pub state: serde_json::Value,
    pub model: String,
    pub questions: SystemOnePlanQuestions,
}

#[derive(Debug, Clone, Serialize)]
pub struct SystemOnePlanQuestions {
    pub plan: ChoiceQuestion,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChoiceQuestion {
    #[serde(rename = "type")]
    pub kind: &'static str,
    /// 单步提问是编译期就定好的字符串；规划提问要带上步数，所以用 `Cow`
    /// 让两者共用这一个结构，又不必把字符串全变成堆分配。
    pub instructions: std::borrow::Cow<'static, str>,
    /// 选项 key -> 人话描述。key 必须是 `up/down/left/right`，
    /// 且**只包含引擎这一步真的会接受的方向**。
    pub criteria: HashMap<String, String>,
}

/// 拼出请求体 + 它的 pretty JSON。
///
/// 后者给 `--dry-run` 用：没有 key 也能看清楚「到底要发给模型什么」。
pub fn build_request(
    state: &GameState,
    legal: &[Direction],
    model: &str,
    lang: PromptLang,
    kind: StateKind,
) -> Result<(SystemOneRequest, String), JevError> {
    let mut criteria = HashMap::new();
    for &d in legal {
        criteria.insert(d.key().to_string(), criterion(lang, d).to_string());
    }
    let state = match kind {
        StateKind::Object => serde_json::to_value(state)
            .map_err(|e| JevError::Invalid(format!("序列化棋局失败：{e}")))?,
        // 故意保留的对照组：JSON 套在字符串里，多一层编码。
        StateKind::String => serde_json::Value::String(
            serde_json::to_string(state).map_err(|e| JevError::Invalid(format!("序列化棋局失败：{e}")))?,
        ),
    };
    let request = SystemOneRequest {
        state,
        model: model.to_string(),
        questions: SystemOneQuestions {
            next_move: ChoiceQuestion {
                kind: "choice",
                instructions: std::borrow::Cow::Borrowed(instructions(lang)),
                criteria,
            },
        },
    };
    let pretty = serde_json::to_string_pretty(&request).unwrap_or_default();
    Ok((request, pretty))
}

/// 两种语言的提问。英文是文档推荐的那一档。
fn instructions(lang: PromptLang) -> &'static str {
    match lang {
        PromptLang::En => "Which direction should the snake move next? The snake must reach the food without hitting a wall or its own body. Answer with exactly one of the given options.",
        PromptLang::Zh => "蛇下一步应该往哪走？从给出的选项里挑一个。",
    }
}

/// 选项描述。坐标约定写在这里，所以模型不用猜 y 往哪边长。
fn criterion(lang: PromptLang, d: Direction) -> &'static str {
    match (lang, d) {
        (PromptLang::En, Direction::Up) => "Move the snake one cell up. y decreases by 1, x is unchanged.",
        (PromptLang::En, Direction::Down) => "Move the snake one cell down. y increases by 1, x is unchanged.",
        (PromptLang::En, Direction::Left) => "Move the snake one cell left. x decreases by 1, y is unchanged.",
        (PromptLang::En, Direction::Right) => "Move the snake one cell right. x increases by 1, y is unchanged.",
        (PromptLang::Zh, Direction::Up) => "向上走一格（y 减 1）。",
        (PromptLang::Zh, Direction::Down) => "向下走一格（y 加 1）。",
        (PromptLang::Zh, Direction::Left) => "向左走一格（x 减 1）。",
        (PromptLang::Zh, Direction::Right) => "向右走一格（x 加 1）。",
    }
}

// ---------------------------------------------------------------------------
// 多步规划：一次往返换 N 格
// ---------------------------------------------------------------------------

/// 枚举 `horizon` 步的候选路线。
///
/// 第一步必须在 `legal` 里；之后每一步只要不和上一步 180 度掉头就算候选。
/// 剩下的合法性（会不会撞墙、会不会撞自己）**执行时再验** —— 现在的棋盘推不出
/// 几步之后的棋盘，硬要在请求里排除只会引入我们自己的幻觉。
pub fn plan_options(legal: &[Direction], horizon: usize) -> Vec<Vec<Direction>> {
    let mut current: Vec<Vec<Direction>> = legal.iter().map(|d| vec![*d]).collect();
    for _ in 1..horizon.max(1) {
        let mut next = Vec::new();
        for seq in &current {
            let last = *seq.last().expect("序列不会为空");
            for &d in legal {
                if d.is_opposite(last) {
                    continue;
                }
                let mut s = seq.clone();
                s.push(d);
                next.push(s);
            }
        }
        current = next;
    }
    current
}

/// 一条路线的 key：方向用逗号连起来，例如 `up,up,left`。
fn plan_key(seq: &[Direction]) -> String {
    seq.iter().map(|d| d.key()).collect::<Vec<_>>().join(",")
}

fn parse_plan_key(key: &str, horizon: usize) -> Result<Vec<Direction>, JevError> {
    let parts: Vec<&str> = key.split(',').map(str::trim).collect();
    if parts.len() != horizon {
        return Err(JevError::Invalid(format!(
            "模型给的路线有 {} 步，我们要的是 {horizon} 步：{key}",
            parts.len()
        )));
    }
    let mut out = Vec::with_capacity(horizon);
    for p in parts {
        out.push(
            Direction::parse(p)
                .ok_or_else(|| JevError::Invalid(format!("路线里有不认识的方向：{p}")))?,
        );
    }
    for w in out.windows(2) {
        if w[0].is_opposite(w[1]) {
            return Err(JevError::Invalid(format!(
                "路线里有 180 度掉头：{}",
                plan_key(&out)
            )));
        }
    }
    Ok(out)
}

fn plan_criterion(lang: PromptLang, seq: &[Direction]) -> String {
    let steps: Vec<&str> = seq
        .iter()
        .map(|d| match d {
            Direction::Up => "up",
            Direction::Down => "down",
            Direction::Left => "left",
            Direction::Right => "right",
        })
        .collect();
    match lang {
        PromptLang::En => format!(
            "Move {}, and keep moving in exactly this order for {} moves in total. Reach the food without hitting a wall or your own body.",
            steps.join(", then "),
            seq.len()
        ),
        PromptLang::Zh => format!(
            "依次走：{}，一共 {} 步。不要撞墙，也不要撞到自己。",
            steps.join(" -> "),
            seq.len()
        ),
    }
}

fn plan_instructions(lang: PromptLang, horizon: usize) -> String {
    let base = match lang {
        PromptLang::En => "Which sequence of moves should the snake follow? Pick exactly one of the given sequences.",
        PromptLang::Zh => "蛇接下来该按哪条路线走？从给出的路线里挑一条。",
    };
    // 把步数也说出来：路线长度是选路的一部分，不能只存在于 key 里。
    format!("{base} Every sequence is exactly {horizon} moves long.")
}

/// 一次规划决策的产出。
#[derive(Debug, Clone)]
pub struct Plan {
    pub directions: Vec<Direction>,
    pub confidence: Option<f32>,
    pub input_tokens: Option<u32>,
    pub output_tokens: Option<u32>,
    pub latency: Duration,
    /// 为了拿到这条路线重试了几次。
    pub retries: u32,
}

/// 把响应解成一条路线。
///
/// 除了「路线里的方向必须是我们候选过的那些」之外，还要验长度对得上、
/// 相邻两步不能掉头 —— 这两条是模型可能给、但引擎一定不能执行的。
pub fn into_plan(
    response: SystemOneResponse,
    horizon: usize,
    latency: Duration,
) -> Result<Plan, JevError> {
    let answer = response
        .answers
        .get(QUESTION_PLAN)
        .ok_or_else(|| JevError::Invalid(format!("响应里没有 {QUESTION_PLAN} 答案")))?;
    let choice = match answer {
        Answer::Choice(c) => c,
        other => {
            return Err(JevError::Invalid(format!(
                "{QUESTION_PLAN} 不是 choice 类型，是 {other:?}"
            )))
        }
    };
    Ok(Plan {
        directions: parse_plan_key(&choice.choice, horizon)?,
        confidence: choice.confidence,
        input_tokens: response.usage.as_ref().and_then(|u| u.input_tokens),
        output_tokens: response.usage.as_ref().and_then(|u| u.output_tokens),
        latency,
        retries: 0,
    })
}

// ---------------------------------------------------------------------------
// 响应体
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize)]
pub struct SystemOneResponse {
    pub model: String,
    pub answers: HashMap<String, Answer>,
    #[serde(default)]
    pub usage: Option<Usage>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Answer {
    Choice(ChoiceAnswer),
    Score(ScoreAnswer),
    Noul(NoulAnswer),
    /// 我们没建模的答案类型 —— 目前文档里有 `box`（图片框，要 jev-preview
    /// + danger-zone 头），以后还会有别的。
    ///
    /// 以前没有这个分支，于是**一个没见过的类型会让整个响应反序列化失败**：
    /// `answers` 是 `HashMap<String, Answer>`，一个条目炸掉，整局拿不到任何
    /// 决策。模型新加一种答案类型，这条实验就会无声地整个停摆。
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChoiceAnswer {
    /// 被选中的 key。
    pub choice: String,
    /// 模型对这次选择有多确定，[0, 1]。
    #[serde(default)]
    pub confidence: Option<f32>,
    /// 每个 key 的概率。
    #[serde(default)]
    pub probabilities: HashMap<String, f32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ScoreAnswer {
    pub score: f32,
    #[serde(default)]
    pub legend: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NoulAnswer {
    pub noul: f32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Usage {
    #[serde(default)]
    pub input_tokens: Option<u32>,
    #[serde(default)]
    pub output_tokens: Option<u32>,
}

/// 一次决策的全部产出：模型说了什么 + 我们怎么用。
#[derive(Debug, Clone)]
pub struct Decision {
    pub direction: Direction,
    pub confidence: Option<f32>,
    pub probabilities: HashMap<Direction, f32>,
    pub model: String,
    pub input_tokens: Option<u32>,
    pub output_tokens: Option<u32>,
    /// 这次决策花了多久（墙钟）。**游戏时钟被它绑架** —— 见 README。
    pub latency: Duration,
    /// 为了拿到这个决策重试了几次。延迟统计**包含**了重试的时间。
    pub retries: u32,
}

/// 把响应解成一次决策。
///
/// `legal` 是我们问出去的那几个方向。模型如果选了一个我们**没问**的 key，
/// 那是幻觉 —— 当错误处理，不当方向用。
pub fn into_decision(
    response: SystemOneResponse,
    legal: &[Direction],
    latency: Duration,
) -> Result<Decision, JevError> {
    let answer = response
        .answers
        .get(QUESTION_NEXT_MOVE)
        .ok_or_else(|| JevError::Invalid(format!("响应里没有 {QUESTION_NEXT_MOVE} 答案")))?;
    let choice = match answer {
        Answer::Choice(c) => c,
        other => {
            return Err(JevError::Invalid(format!(
                "{QUESTION_NEXT_MOVE} 不是 choice 类型，是 {other:?}"
            )))
        }
    };

    let direction = Direction::parse(&choice.choice)
        .ok_or_else(|| JevError::Invalid(format!("未知的方向 key：{}", choice.choice)))?;
    if !legal.contains(&direction) {
        return Err(JevError::Invalid(format!(
            "模型选了没被允许的方向 {}",
            direction.key()
        )));
    }

    let mut probabilities = HashMap::new();
    for (k, v) in &choice.probabilities {
        if let Some(d) = Direction::parse(k) {
            probabilities.insert(d, *v);
        }
    }

    Ok(Decision {
        direction,
        confidence: choice.confidence,
        probabilities,
        model: response.model,
        input_tokens: response.usage.as_ref().and_then(|u| u.input_tokens),
        output_tokens: response.usage.as_ref().and_then(|u| u.output_tokens),
        latency,
        retries: 0,
    })
}

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct JevClient {
    pub config: JevConfig,
}

impl JevClient {
    pub fn new(config: JevConfig) -> Self {
        Self { config }
    }

    pub fn config(&self) -> &JevConfig {
        &self.config
    }

    /// 只对**传输层**的毛病重试。
    ///
    /// 为什么需要：2026-10-17 实测走代理时 TLS 握手会被随机掐断
    /// （`the handshake process was interrupted`），实测失败率 20~37%。
    /// 不重试的话，一局 30 步有三分之一变成「沿用旧方向」，
    /// 得分里混的全是网络噪声 —— 跨配置比较就失去意义了。
    ///
    /// 为什么只重试传输层：`Http` 是服务端的**回答**（451/429/…），重试没有意义；
    /// `Invalid` 是我们自己解析不出来，再来一次多半还是同样的坏数据。
    /// 只有 `Network` / `Timeout` 才是「可能下次就好了」。
    ///
    /// **重试次数会被记下来并上报** —— 延迟统计因此包含了重试，
    /// 这是实测的诚实代价，不藏起来。设 `TYPESAFE_RETRIES=0` 可以关掉。
    fn with_retries<T, F, A>(&self, mut attempt: F, stamp: A) -> Result<T, JevError>
    where
        F: FnMut() -> Result<T, JevError>,
        A: Fn(&mut T, u32),
    {
        let mut retries = 0u32;
        loop {
            match attempt() {
                Ok(mut ok) => {
                    stamp(&mut ok, retries);
                    return Ok(ok);
                }
                Err(e) if retries < self.config.retries && is_transient(&e) => {
                    retries += 1;
                }
                Err(e) => return Err(e),
            }
        }
    }

    /// 问一次。阻塞。
    ///
    /// 这里是阻塞的：让「一次决策 = 一次网络往返」直接摊在墙钟上，
    /// 没有并发把问题藏起来。（界面上要用后台线程不冻屏，那是 app 层的事。）
    pub fn decide(
        &self,
        state: &GameState,
        legal: &[Direction],
    ) -> Result<Decision, JevError> {
        self.with_retries(|| self.attempt_decide(state, legal), |d, n| d.retries = n)
    }

    /// 单次尝试。整个 `decide` 的本体。
    fn attempt_decide(
        &self,
        state: &GameState,
        legal: &[Direction],
    ) -> Result<Decision, JevError> {
        if self.config.api_key.is_none() {
            return Err(JevError::NotConfigured);
        }
        let (request, _) = build_request(
            state,
            legal,
            &self.config.model,
            self.config.prompt_lang,
            self.config.state_kind,
        )?;
        let body = serde_json::to_vec(&request)
            .map_err(|e| JevError::Invalid(format!("序列化请求失败：{e}")))?;

        let url = self.config.endpoint();
        let started = Instant::now();
        let raw = if let Some(rest) = url.strip_prefix("https://") {
            self.post_https(rest, &body)?
        } else if let Some(rest) = url.strip_prefix("http://") {
            self.post_http(rest, &body)?
        } else {
            return Err(JevError::Invalid(format!("看不懂的 URL scheme：{url}")));
        };

        let elapsed = started.elapsed();
        if elapsed > self.config.timeout {
            return Err(JevError::Timeout);
        }

        let (status, body) = raw;
        if !(200..300).contains(&status) {
            return Err(JevError::Http {
                status,
                body: String::from_utf8_lossy(&body).chars().take(240).collect(),
            });
        }
        let response: SystemOneResponse = serde_json::from_slice(&body)
            .map_err(|e| JevError::Invalid(format!("解析响应失败：{e}")))?;
        into_decision(response, legal, elapsed)
    }

    /// 一次问一条 `horizon` 步的路线。
    ///
    /// 这是对「一次决策 = 一次网络往返 = 蛇的一步」这个结构成本的正面试探：
    /// 往返次数不变，但一次往返能换回 N 步。
    pub fn plan(
        &self,
        state: &GameState,
        legal: &[Direction],
        horizon: usize,
    ) -> Result<Plan, JevError> {
        self.with_retries(
            || self.attempt_plan(state, legal, horizon),
            |p, n| p.retries = n,
        )
    }

    fn attempt_plan(
        &self,
        state: &GameState,
        legal: &[Direction],
        horizon: usize,
    ) -> Result<Plan, JevError> {
        if self.config.api_key.is_none() {
            return Err(JevError::NotConfigured);
        }
        let horizon = horizon.max(1);
        let options = plan_options(legal, horizon);
        if options.len() > MAX_CHOICE_OPTIONS {
            // 文档规定 Choice 最多 255 个选项。超了就说清楚，
            // 不要偷偷截断 —— 截断等于悄悄删掉模型本可以选的棋路。
            return Err(JevError::Invalid(format!(
                "{horizon} 步会生成 {} 条路线，超过文档上限 {MAX_CHOICE_OPTIONS}。调小 JEV_PLAN。",
                options.len()
            )));
        }

        let mut criteria = HashMap::new();
        for seq in &options {
            criteria.insert(
                plan_key(seq),
                plan_criterion(self.config.prompt_lang, seq),
            );
        }
        let state_value = match self.config.state_kind {
            StateKind::Object => serde_json::to_value(state)
                .map_err(|e| JevError::Invalid(format!("序列化棋局失败：{e}")))?,
            StateKind::String => serde_json::Value::String(
                serde_json::to_string(state)
                    .map_err(|e| JevError::Invalid(format!("序列化棋局失败：{e}")))?,
            ),
        };

        let request = SystemOnePlanRequest {
            state: state_value,
            model: self.config.model.clone(),
            questions: SystemOnePlanQuestions {
                plan: ChoiceQuestion {
                    kind: "choice",
                    instructions: std::borrow::Cow::Owned(plan_instructions(
                        self.config.prompt_lang,
                        horizon,
                    )),
                    criteria,
                },
            },
        };
        let body = serde_json::to_vec(&request)
            .map_err(|e| JevError::Invalid(format!("序列化请求失败：{e}")))?;

        let url = self.config.endpoint();
        let started = Instant::now();
        let (status, raw) = if let Some(rest) = url.strip_prefix("https://") {
            self.post_https(rest, &body)?
        } else if let Some(rest) = url.strip_prefix("http://") {
            self.post_http(rest, &body)?
        } else {
            return Err(JevError::Invalid(format!("看不懂的 URL scheme：{url}")));
        };
        let elapsed = started.elapsed();
        if !(200..300).contains(&status) {
            return Err(JevError::Http {
                status,
                body: String::from_utf8_lossy(&raw).chars().take(240).collect(),
            });
        }
        let response: SystemOneResponse = serde_json::from_slice(&raw)
            .map_err(|e| JevError::Invalid(format!("解析响应失败：{e}")))?;
        into_plan(response, horizon, elapsed)
    }

    /// 这个 URL 该走哪个代理。`ProxySetting::FromEnv` 才查环境变量。
    fn proxy_for(&self, scheme: &str, host: &str) -> Result<Option<ProxyTarget>, JevError> {
        match &self.config.proxy {
            ProxySetting::Direct => Ok(None),
            ProxySetting::Fixed(p) => Ok(Some(p.clone())),
            ProxySetting::FromEnv => proxy::resolve(scheme, host)
                .map_err(|e| JevError::Network(e.to_string())),
        }
    }

    /// 建一条指向 `(host, port)` 的连接，可能已经穿过代理。
    ///
    /// 两条路径都收敛成 `PrefixedStream<TcpStream>`，所以下面 TLS 握手那几行
    /// **一个字都不用改** —— 代理工作在 TCP 层，SNI 和证书校验照常对着
    /// 真域名做。这也是为什么代理能透明地接进来。
    fn connect(
        &self,
        scheme: &str,
        host: &str,
        port: u16,
    ) -> Result<proxy::PrefixedStream<TcpStream>, JevError> {
        match self.proxy_for(scheme, host)? {
            Some(p) => {
                proxy::tunnel(&p, host, port, self.config.timeout)
                    .map_err(|e| JevError::Network(e.to_string()))
            }
            None => {
                let addr = (host, port)
                    .to_socket_addrs()
                    .map_err(|e| JevError::Network(format!("解析域名失败：{e}")))?
                    .next()
                    .ok_or_else(|| JevError::Network("域名没有解析出任何地址".to_string()))?;
                let s = TcpStream::connect_timeout(&addr, self.config.timeout)
                    .map_err(|e| JevError::Network(format!("连接失败：{e}")))?;
                s.set_read_timeout(Some(self.config.timeout))
                    .map_err(|e| JevError::Network(format!("设置读超时失败：{e}")))?;
                s.set_write_timeout(Some(self.config.timeout))
                    .map_err(|e| JevError::Network(format!("设置写超时失败：{e}")))?;
                Ok(proxy::PrefixedStream::direct(s))
            }
        }
    }

    fn head(&self, path: &str, host_header: &str, body: &[u8]) -> String {
        let api_key = self.config.api_key.as_deref().unwrap_or("");
        let eol = "\r\n";
        format!(
            "POST {path} HTTP/1.1{eol}Host: {host_header}{eol}\
             Content-Type: application/json{eol}Content-Length: {}{eol}\
             Connection: close{eol}Authorization: Bearer {api_key}{eol}{eol}",
            body.len()
        )
    }

    fn post_http(&self, rest: &str, body: &[u8]) -> Result<(u16, Vec<u8>), JevError> {
        let (host, port, path) = split_url(rest, 80)?;
        let mut stream = self.connect("http", &host, port)?;
        let head = self.head(&path, &format!("{host}:{port}"), body);
        stream
            .write_all(head.as_bytes())
            .and_then(|_| stream.write_all(body))
            .and_then(|_| stream.flush())
            .map_err(|e| JevError::Network(format!("发送失败：{e}")))?;
        read_http_response(&mut stream)
    }

    fn post_https(&self, rest: &str, body: &[u8]) -> Result<(u16, Vec<u8>), JevError> {
        use native_tls::TlsConnector;
        let (host, port, path) = split_url(rest, 443)?;
        let connector = TlsConnector::new()
            .map_err(|e| JevError::Network(format!("初始化 TLS 失败：{e}")))?;
        let tcp = self.connect("https", &host, port)?;
        let mut tls = connector
            .connect(&host, tcp)
            .map_err(|e| JevError::Network(format!("TLS 握手失败：{e}")))?;
        let head = self.head(&path, &host, body);
        tls.write_all(head.as_bytes())
            .and_then(|_| tls.write_all(body))
            .and_then(|_| tls.flush())
            .map_err(|e| JevError::Network(format!("TLS 发送失败：{e}")))?;
        read_http_response(&mut tls)
    }
}

// ---------------------------------------------------------------------------
// 读响应：三种传输方式都要认
// ---------------------------------------------------------------------------

/// 读全一个 HTTP/1.1 响应，返回 (状态码, 解好传输编码的 body)。
///
/// 为什么要专门写这个：**真实 API 回的是 `Transfer-Encoding: chunked`**
/// （Cloudflare 在后面）。原来那版只是按第一个空行一切，于是把 chunk 帧
/// （形如 `7a` + 换行 + 118 字节 JSON + 换行 + `0` + 空行）当 JSON 喂给
/// serde，于是报「解析响应失败：expected value at line 1 column 1」——
/// 一个完全看不出所以然的错。
///
/// 这个 bug 藏了这么久，是因为**这个客户端从来没收到过真实 API 的成功响应**：
/// 直连永远是 451，而本地 mock 永远发 `Content-Length`。
pub fn read_http_response<R: Read>(r: &mut R) -> Result<(u16, Vec<u8>), JevError> {
    let mut buf = Buffered::new(r);
    let status_line = buf.read_line()?;
    let status = status_line
        .split_whitespace()
        .nth(1)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| JevError::Invalid(format!("看不懂的状态行：{status_line}")))?;

    let mut headers: Vec<(String, String)> = Vec::new();
    loop {
        let line = buf.read_line()?;
        if line.is_empty() {
            break; // 空行 = 头结束
        }
        if let Some((k, v)) = line.split_once(':') {
            headers.push((k.trim().to_ascii_lowercase(), v.trim().to_string()));
        }
    }
    let find = |name: &str| {
        headers
            .iter()
            .find(|(k, _)| k == name)
            .map(|(_, v)| v.clone())
    };

    let body = if find("transfer-encoding")
        .is_some_and(|v| v.to_ascii_lowercase().contains("chunked"))
    {
        decode_chunked(&mut buf)?
    } else if let Some(len) = find("content-length").and_then(|v| v.trim().parse::<usize>().ok()) {
        buf.take(len)?
    } else {
        // 既没长度也没 chunked —— 读到连接关闭为止。
        buf.rest()?
    };
    Ok((status, body))
}

/// 解 chunked 传输编码：先一行十六进制长度，再这么多字节，再一个空行；
/// 长度为 `0` 的块表示结束，后面可以跟 trailer，读到空行为止。
fn decode_chunked<R: Read>(buf: &mut Buffered<R>) -> Result<Vec<u8>, JevError> {
    let mut out = Vec::new();
    loop {
        let size_line = buf.read_line()?;
        let size = usize::from_str_radix(size_line.split(';').next().unwrap_or("").trim(), 16)
            .map_err(|e| JevError::Invalid(format!("看不懂的 chunk 大小 {size_line:?}：{e}")))?;
        if size == 0 {
            while !buf.read_line()?.is_empty() {}
            return Ok(out);
        }
        out.extend_from_slice(&buf.take(size)?);
        buf.read_line()?; // 每个 chunk 后面跟一个空 CRLF
    }
}

/// 一点点缓冲，让「按行读」「读满 n 字节」不用一个字节一个字节地怼 socket。
struct Buffered<'a, R> {
    inner: &'a mut R,
    buf: Vec<u8>,
}

impl<'a, R: Read> Buffered<'a, R> {
    fn new(inner: &'a mut R) -> Self {
        Self {
            inner,
            buf: Vec::new(),
        }
    }

    /// 读到 CRLF 为止（不含换行符）。
    fn read_line(&mut self) -> Result<String, JevError> {
        loop {
            if let Some(i) = self.buf.windows(2).position(|w| w == b"\r\n") {
                let line = String::from_utf8_lossy(&self.buf[..i]).into_owned();
                self.buf.drain(..i + 2);
                return Ok(line);
            }
            let mut chunk = [0u8; 1024];
            let n = self
                .inner
                .read(&mut chunk)
                .map_err(|e| JevError::Network(format!("读取失败：{e}")))?;
            if n == 0 {
                return Err(JevError::Invalid("响应在读完之前就断了".to_string()));
            }
            self.buf.extend_from_slice(&chunk[..n]);
        }
    }

    /// 读满 n 字节。连接提前断掉就是错，不拿半个 body 去糊弄解析器。
    fn take(&mut self, n: usize) -> Result<Vec<u8>, JevError> {
        while self.buf.len() < n {
            let mut chunk = vec![0u8; (n - self.buf.len()).max(4096)];
            let got = self
                .inner
                .read(&mut chunk)
                .map_err(|e| JevError::Network(format!("读取失败：{e}")))?;
            if got == 0 {
                return Err(JevError::Invalid(format!(
                    "响应提前断了：还要 {n} 字节，只剩 {}",
                    self.buf.len()
                )));
            }
            self.buf.extend_from_slice(&chunk[..got]);
        }
        Ok(self.buf.drain(..n).collect())
    }

    /// 读到连接关闭。
    fn rest(&mut self) -> Result<Vec<u8>, JevError> {
        let mut out = std::mem::take(&mut self.buf);
        self.inner
            .read_to_end(&mut out)
            .map_err(|e| JevError::Network(format!("读取失败：{e}")))?;
        Ok(out)
    }
}

/// `host[:port]/path` 拆成三段。
fn split_url(rest: &str, default_port: u16) -> Result<(String, u16, String), JevError> {
    let (host_port, path) = match rest.find('/') {
        Some(i) => (&rest[..i], rest[i..].to_string()),
        None => (rest, "/".to_string()),
    };
    let (host, port) = match host_port.rsplit_once(':') {
        Some((h, p)) => (
            h.to_string(),
            p.parse::<u16>()
                .map_err(|e| JevError::Invalid(format!("端口 {p} 不认识：{e}")))?,
        ),
        None => (host_port.to_string(), default_port),
    };
    if host.is_empty() {
        return Err(JevError::Invalid("URL 里没有 host".to_string()));
    }
    Ok((host, port, path))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 官方 quickstart 里的响应形状：choice / score / noul 混在一起。
    const DOCUMENTED: &str = r#"{
        "model": "jev-1.13.0",
        "answers": {
            "department": {
                "type": "choice", "choice": "technical", "confidence": 0.74,
                "probabilities": {"sales": 0.0, "billing": 0.17, "technical": 0.83}
            },
            "frustration": {
                "type": "score", "score": 1.0, "confidence": 1.0,
                "legend": {"0": "calm", "1": "frustrated", "2": "angry"}
            },
            "is_urgent": { "type": "noul", "noul": 0.99 }
        },
        "usage": { "input_tokens": 425, "output_tokens": 73 }
    }"#;

    const NEXT_MOVE: &str = r#"{
        "model": "jev-1.13.0",
        "answers": {
            "next_move": {
                "type": "choice", "choice": "left", "confidence": 0.91,
                "probabilities": {"up": 0.07, "down": 0.05, "left": 0.72, "right": 0.16}
            }
        },
        "usage": { "input_tokens": 425, "output_tokens": 73 }
    }"#;

    fn parse(s: &str) -> SystemOneResponse {
        serde_json::from_str(s).expect("fixture 必须能解析")
    }

    fn sample_state() -> GameState {
        GameState {
            board: crate::game::BoardState {
                width: 24,
                height: 12,
            },
            snake: vec![crate::game::Point::new(6, 2), crate::game::Point::new(6, 3)],
            food: crate::game::Point::new(3, 0),
            direction: Direction::Up,
            score: 0,
            tick: 4,
            seed: Some(42),
        }
    }

    #[test]
    fn parses_a_next_move_choice_with_all_its_fields() {
        let legal = [Direction::Up, Direction::Down, Direction::Left, Direction::Right];
        let d = into_decision(parse(NEXT_MOVE), &legal, Duration::from_millis(120)).unwrap();
        assert_eq!(d.direction, Direction::Left);
        assert_eq!(d.confidence, Some(0.91));
        assert_eq!(d.probabilities.len(), 4);
        assert_eq!(d.probabilities[&Direction::Left], 0.72);
        assert_eq!(d.input_tokens, Some(425));
        assert_eq!(d.output_tokens, Some(73));
    }

    #[test]
    fn parser_survives_answer_shapes_we_never_asked_for() {
        let response = parse(DOCUMENTED);
        assert!(matches!(
            response.answers.get("department"),
            Some(Answer::Choice(_))
        ));
        assert!(matches!(
            response.answers.get("frustration"),
            Some(Answer::Score(_))
        ));
        assert!(matches!(
            response.answers.get("is_urgent"),
            Some(Answer::Noul(_))
        ));

        // 我们没问 next_move，取它必须干净地变成错误，而不是 panic。
        let err = into_decision(response, &[Direction::Up], Duration::ZERO).unwrap_err();
        assert!(matches!(err, JevError::Invalid(_)), "实际是 {err}");
    }

    #[test]
    fn a_direction_we_never_offered_is_rejected_not_obeyed() {
        // 只问了 up / right，模型却回了 left —— 幻觉，按错误处理。
        let legal = [Direction::Up, Direction::Right];
        let err = into_decision(parse(NEXT_MOVE), &legal, Duration::ZERO).unwrap_err();
        assert!(matches!(err, JevError::Invalid(_)), "实际是 {err}");
    }

    #[test]
    fn request_only_advertises_legal_directions() {
        let (_, pretty) = build_request(
            &sample_state(),
            &[Direction::Up, Direction::Right],
            "jev-latest",
            PromptLang::En,
            StateKind::Object,
        )
        .unwrap();
        assert!(pretty.contains("up"));
        assert!(pretty.contains("right"));
        assert!(!pretty.contains("down"), "down 不合法，不该出现在选项里");
        assert!(!pretty.contains("left"), "left 不合法，不该出现在选项里");
    }

    #[test]
    fn url_parsing_handles_scheme_default_ports() {
        assert_eq!(
            split_url("api.typesafe.ai/v1/systemone", 443).unwrap(),
            (
                "api.typesafe.ai".to_string(),
                443,
                "/v1/systemone".to_string()
            )
        );
        assert_eq!(
            split_url("127.0.0.1:8787/v1/systemone", 80).unwrap(),
            ("127.0.0.1".to_string(), 8787, "/v1/systemone".to_string())
        );
    }

    #[test]
    fn no_api_key_means_no_request_is_sent() {
        let cfg = JevConfig {
            base_url: "http://127.0.0.1:1".to_string(),
            api_key: None,
            model: "jev-latest".to_string(),
            timeout: Duration::from_millis(100),
            proxy: ProxySetting::Direct,
            prompt_lang: Default::default(),
            state_kind: Default::default(),
            plan_horizon: 1,
            retries: 0,
        };
        let err = JevClient::new(cfg)
            .decide(&sample_state(), &[Direction::Up])
            .unwrap_err();
        assert_eq!(err, JevError::NotConfigured);
    }

    // ---- 传输层。下面三条是从「真实 API 第一次真的回了我 200」这件事里长出来的。

    /// 真实响应长这样（Cloudflare，2026-10-17 实测）：
    /// `Transfer-Encoding: chunked`，body 前面挂着一层 chunk 帧。
    #[test]
    fn a_chunked_response_decodes_into_plain_json() {
        let payload = r#"{"model":"jev-1.13.0","answers":{"next_move":{"type":"choice","choice":"up","probabilities":{"up":1.0},"confidence":0.99}},"usage":{"input_tokens":277,"output_tokens":21}}"#;
        let hex = format!("{:x}", payload.len());
        let raw = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nTransfer-Encoding: chunked\r\nConnection: keep-alive\r\n\r\n{hex}\r\n{payload}\r\n0\r\n\r\n"
        );

        let (status, body) = read_http_response(&mut raw.as_bytes()).unwrap();
        assert_eq!(status, 200);
        // 关键：拿到的必须是干净 JSON，不能残留 `7a` 这种 chunk 帧头。
        let parsed: SystemOneResponse = serde_json::from_slice(&body).expect("应该解得出 JSON");
        assert_eq!(parsed.model, "jev-1.13.0");
    }

    #[test]
    fn a_chunked_body_split_across_many_reads_still_reassembles() {
        // 真 socket 不会一次给你整个响应 —— 读边界落在 chunk 帧中间是常态。
        let payload = r#"{"a":1}"#;
        let hex = format!("{:x}", payload.len());
        let raw = format!(
            "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n{hex}\r\n{payload}\r\n0\r\n\r\n"
        );

        // 每次只给 3 字节。
        struct Trickle<'a> {
            data: &'a [u8],
            pos: usize,
        }
        impl Read for Trickle<'_> {
            fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
                if self.pos >= self.data.len() {
                    return Ok(0);
                }
                let n = 3.min(buf.len()).min(self.data.len() - self.pos);
                buf[..n].copy_from_slice(&self.data[self.pos..self.pos + n]);
                self.pos += n;
                Ok(n)
            }
        }

        let mut trickle = Trickle {
            data: raw.as_bytes(),
            pos: 0,
        };
        let (status, body) = read_http_response(&mut trickle).unwrap();
        assert_eq!(status, 200);
        assert_eq!(body, br#"{"a":1}"#);
    }

    #[test]
    fn content_length_and_close_delimited_bodies_both_work() {
        // 本地 mock 走的是这一条。
        let raw = "HTTP/1.1 200 OK\r\nContent-Length: 7\r\n\r\n{\"a\":1}";
        let (status, body) = read_http_response(&mut raw.as_bytes()).unwrap();
        assert_eq!((status, body.as_slice()), (200, &br#"{"a":1}"#[..]));

        // 没有长度也没有 chunked：读到连接关闭。
        let raw = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"b\":2}";
        let (status, body) = read_http_response(&mut raw.as_bytes()).unwrap();
        assert_eq!((status, body.as_slice()), (200, &br#"{"b":2}"#[..]));
    }

    #[test]
    fn an_error_status_carries_its_body_through_chunked_too() {
        let payload = r#"{"title":"Typesafe is not available in your region.","status":451}"#;
        let hex = format!("{:x}", payload.len());
        let raw = format!(
            "HTTP/1.1 451 Unavailable For Legal Reasons\r\nTransfer-Encoding: chunked\r\n\r\n{hex}\r\n{payload}\r\n0\r\n\r\n"
        );
        let (status, body) = read_http_response(&mut raw.as_bytes()).unwrap();
        assert_eq!(status, 451);
        assert!(String::from_utf8_lossy(&body).contains("not available in your region"));
    }

    // ---- 协议加固。下面两条各对应一个「本来会静悄悄坏掉」的地方。

    #[test]
    fn an_answer_type_we_do_not_model_does_not_poison_the_whole_response() {
        // 文档现在有第四种答案 `box`（图片框）。以前 `answers` 是
        // HashMap<String, Answer> 而枚举只认三种，于是**一个 box 就会让整个
        // 响应反序列化失败**，一局一个决策都拿不到 —— 模型加个类型，实验停摆。
        let raw = r#"{
            "model": "jev-1.14.0",
            "answers": {
                "mug": { "type": "box", "x1": 0.1, "y1": 0.2, "x2": 0.3, "y2": 0.4, "confidence": 0.92 },
                "next_move": {
                    "type": "choice", "choice": "left", "confidence": 0.91,
                    "probabilities": {"left": 0.72}
                }
            },
            "usage": { "input_tokens": 425, "output_tokens": 73 }
        }"#;
        let parsed = parse(raw);
        assert!(matches!(parsed.answers.get("mug"), Some(Answer::Unknown)));

        // 关键：没建模的类型在场，我们问的那个答案照样能用。
        let legal = [Direction::Up, Direction::Left];
        let d = into_decision(parsed, &legal, Duration::from_millis(120)).unwrap();
        assert_eq!(d.direction, Direction::Left);
        assert_eq!(d.input_tokens, Some(425));
    }

    #[test]
    fn the_question_is_asked_in_english_and_the_state_is_a_real_object() {
        let (request, _) = build_request(
            &sample_state(),
            &[Direction::Up, Direction::Right],
            "jev-latest",
            PromptLang::En,
            StateKind::Object,
        )
        .unwrap();

        // 文档：Jev 的主语言是英语，CJK「accepted but currently have lower
        // accuracy」。用中文提问 = 在测量结果里掺一个语言变量。
        let text = serde_json::to_string(&request).unwrap();
        assert!(
            !text.chars().any(|c| ('\u{4e00}'..='\u{9fff}').contains(&c)),
            "instructions/criteria 里不该有汉字：{text}"
        );
        assert!(
            request.questions.next_move.instructions.contains("snake"),
            "instructions 应该是英文指令"
        );

        // state 直接是对象，不是「JSON 套进字符串里」。
        assert!(request.state.is_object(), "state 应该直接是 JSON 对象");
        assert!(request.state.get("snake").is_some());
        assert!(request.state.get("board").is_some());
    }

    /// 2×2 对照实验的四个格子必须真的不同 —— 否则「A/B 跑过了」是假的。
    #[test]
    fn the_four_experimental_cells_are_actually_distinct() {
        let build = |lang, kind| {
            build_request(
                &sample_state(),
                &[Direction::Up, Direction::Right],
                "jev-latest",
                lang,
                kind,
            )
            .unwrap()
            .0
        };

        let en_obj = build(PromptLang::En, StateKind::Object);
        let en_str = build(PromptLang::En, StateKind::String);
        let zh_obj = build(PromptLang::Zh, StateKind::Object);
        let zh_str = build(PromptLang::Zh, StateKind::String);

        // 语言只动 instructions/criteria，不动 state 的编码。
        assert_eq!(en_obj.state, zh_obj.state, "语言不该影响 state 的编码");
        assert_ne!(
            en_obj.questions.next_move.instructions,
            zh_obj.questions.next_move.instructions
        );
        // 编码只动 state，不动提问。
        assert_eq!(
            en_obj.questions.next_move.instructions,
            en_str.questions.next_move.instructions
        );
        assert!(en_obj.state.is_object());
        assert!(en_str.state.is_string(), "对照组才是双重编码");
        assert!(zh_str.state.is_string());
        assert_eq!(
            zh_obj.questions.next_move.instructions,
            zh_str.questions.next_move.instructions,
            "换编码不该动提问语言"
        );
        // 中文档原样复现 2026-10-16 的条件。
        assert_eq!(zh_obj.questions.next_move.instructions, "蛇下一步应该往哪走？从给出的选项里挑一个。");
        assert_eq!(
            zh_obj.questions.next_move.criteria["up"],
            "向上走一格（y 减 1）。"
        );
    }

    // ---- 多步规划

    #[test]
    fn plan_options_never_contain_an_immediate_u_turn() {
        let legal = [Direction::Up, Direction::Down, Direction::Left, Direction::Right];
        for horizon in 1..=4 {
            for seq in plan_options(&legal, horizon) {
                assert_eq!(seq.len(), horizon);
                assert!(legal.contains(&seq[0]), "第一步必须是合法方向");
                for w in seq.windows(2) {
                    assert!(!w[0].is_opposite(w[1]), "路线 {:?} 里有 180 度掉头", seq);
                }
            }
        }
    }

    #[test]
    fn plan_option_count_is_what_the_math_says_it_is() {
        // 两个**互为掉头**的合法方向：第一步 2 种，之后每步都被上一���的
        // 掉头排除掉，只剩 1 种 —— 所以路线数不随步数增长，永远是 2 条。
        // （这正说明候选数不能想当然地按 2 的幂算。）
        let two = [Direction::Up, Direction::Down];
        assert_eq!(plan_options(&two, 1).len(), 2);
        assert_eq!(plan_options(&two, 2).len(), 2);
        assert_eq!(plan_options(&two, 3).len(), 2);
        assert_eq!(plan_options(&two, 4).len(), 2);
        // 四个方向：4 * 3 * 3 * 3 = 108，还在文档的 255 上限内。
        let four = [
            Direction::Up,
            Direction::Down,
            Direction::Left,
            Direction::Right,
        ];
        assert_eq!(plan_options(&four, 4).len(), 108);
    }

    #[test]
    fn a_plan_we_never_offered_is_rejected_not_obeyed() {
        // 掉头、步数不对、方向不存在 —— 三种都得是错误，不是照做。
        assert!(parse_plan_key("up,down,left", 3).is_err());
        assert!(parse_plan_key("up,left", 3).is_err());
        assert!(parse_plan_key("up,sideways", 2).is_err());
        assert_eq!(
            parse_plan_key("up,up,left", 3).unwrap(),
            vec![Direction::Up, Direction::Up, Direction::Left]
        );
    }

    // ---- 重试。代理下 TLS 握手会被随机掐断，实测失败率 20~37%。

    fn retrying_client(retries: u32) -> JevClient {
        JevClient::new(JevConfig {
            base_url: "http://127.0.0.1:1".into(),
            api_key: None,
            model: "jev-latest".into(),
            timeout: Duration::from_millis(50),
            proxy: ProxySetting::Direct,
            prompt_lang: Default::default(),
            state_kind: Default::default(),
            plan_horizon: 1,
            retries,
        })
    }

    #[test]
    fn only_transport_errors_are_worth_retrying() {
        assert!(is_transient(&JevError::Network("TLS 握手失败".into())));
        assert!(is_transient(&JevError::Timeout));
        let denied = JevError::Http {
            status: 451,
            body: String::new(),
        };
        assert!(!is_transient(&denied));
        assert!(!is_transient(&JevError::NotConfigured));
        assert!(!is_transient(&JevError::Invalid("解析响应失败".into())));
    }

    #[test]
    fn a_flaky_transport_layer_is_retried_and_the_count_is_reported() {
        let c = retrying_client(3);
        let mut calls = 0;
        let got = c
            .with_retries(
                || {
                    calls += 1;
                    if calls < 3 {
                        Err(JevError::Network("握手中断".into()))
                    } else {
                        Ok(7u32)
                    }
                },
                |v, n| *v += n,
            )
            .unwrap();
        assert_eq!(got, 9, "结果要带上重试次数");
        assert_eq!(calls, 3);
    }

    #[test]
    fn retries_are_bounded_and_the_last_error_is_what_surfaces() {
        let c = retrying_client(2);
        let mut calls = 0;
        let err = c
            .with_retries(
                || {
                    calls += 1;
                    Err(JevError::Network("一直失败".into()))
                },
                |_: &mut JevError, _| {},
            )
            .unwrap_err();
        assert_eq!(calls, 3, "1 次原始尝试 + 2 次重试，然后放弃");
        assert_eq!(err, JevError::Network("一直失败".into()));
    }

    #[test]
    fn a_server_side_error_is_never_retried_even_with_retries_available() {
        let c = retrying_client(5);
        let mut calls = 0;
        let _ = c.with_retries(
            || {
                calls += 1;
                Err(JevError::Http {
                    status: 451,
                    body: String::new(),
                })
            },
            |_: &mut JevError, _| {},
        );
        assert_eq!(calls, 1, "451 是服务端的回答，重试只是白烧 token");
    }
}
