//! TypeSafe `/v1/systemone` 客户端 —— 这个实验真正的被试。
//!
//! 从 elation 的 `src/model/typesafe.rs`（789 行）精简而来。协议部分
//! （`SystemOneRequest` / `SystemOneQuestions` / `ChoiceAnswer` / `Usage`）
//! 原样保留；砍掉的是给 UI 用的 Chat 兼容层、`pretty_print`、
//! `MockTypeSafeClient`（这里用真的本地 mock server 代替）。
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

use crate::game::Direction;

/// `POST /v1/systemone` 的问题名，响应里用同一个 key 取答案。
pub const QUESTION_NEXT_MOVE: &str = "next_move";

#[derive(Debug, Clone)]
pub struct JevConfig {
    pub base_url: String,
    pub api_key: Option<String>,
    pub model: String,
    pub timeout: Duration,
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
                Some("TypeSafe 在当前地区不提供服务（HTTP 451）。换地区或走本地代理。")
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

// ---------------------------------------------------------------------------
// 请求体
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct SystemOneRequest {
    /// 模型读的上下文。我们放的是 `GameState` 的 JSON。
    pub state: String,
    pub model: String,
    pub questions: SystemOneQuestions,
}

#[derive(Debug, Clone, Serialize)]
pub struct SystemOneQuestions {
    pub next_move: ChoiceQuestion,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChoiceQuestion {
    #[serde(rename = "type")]
    pub kind: &'static str,
    pub instructions: &'static str,
    /// 选项 key -> 人话描述。key 必须是 `up/down/left/right`，
    /// 且**只包含引擎这一步真的会接受的方向**。
    pub criteria: HashMap<String, String>,
}

/// 拼出请求体 + 它的 pretty JSON。
///
/// 后者给 `--dry-run` 用：没有 key 也能看清楚「到底要发给模型什么」。
pub fn build_request(
    state_json: &str,
    legal: &[Direction],
    model: &str,
) -> (SystemOneRequest, String) {
    let mut criteria = HashMap::new();
    for &d in legal {
        criteria.insert(
            d.key().to_string(),
            match d {
                Direction::Up => "向上走一格（y 减 1）。",
                Direction::Down => "向下走一格（y 加 1）。",
                Direction::Left => "向左走一格（x 减 1）。",
                Direction::Right => "向右走一格（x 加 1）。",
            }
            .to_string(),
        );
    }
    let request = SystemOneRequest {
        state: state_json.to_string(),
        model: model.to_string(),
        questions: SystemOneQuestions {
            next_move: ChoiceQuestion {
                kind: "choice",
                instructions: "蛇下一步应该往哪走？从给出的选项里挑一个。",
                criteria,
            },
        },
    };
    let pretty = serde_json::to_string_pretty(&request).unwrap_or_default();
    (request, pretty)
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

    /// 问一次。阻塞。
    ///
    /// elation 在这里是后台线程 + `poll()` 状态机，好让 UI 保持响应。
    /// 这里是测量台不是游戏 —— 阻塞版让「一次决策 = 一次网络往返」直接
    /// 摊在墙钟上，没有并发把问题藏起来。
    pub fn decide(
        &self,
        state_json: &str,
        legal: &[Direction],
    ) -> Result<Decision, JevError> {
        if self.config.api_key.is_none() {
            return Err(JevError::NotConfigured);
        }
        let (request, _) = build_request(state_json, legal, &self.config.model);
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

        let (status, body) = split_status_and_body(&raw)?;
        if !(200..300).contains(&status) {
            return Err(JevError::Http {
                status,
                body: String::from_utf8_lossy(body).chars().take(240).collect(),
            });
        }
        let response: SystemOneResponse = serde_json::from_slice(body)
            .map_err(|e| JevError::Invalid(format!("解析响应失败：{e}")))?;
        into_decision(response, legal, elapsed)
    }

    fn connect(&self, host: &str, port: u16) -> Result<TcpStream, JevError> {
        let addr = (host, port)
            .to_socket_addrs()
            .map_err(|e| JevError::Network(format!("解析域名失败：{e}")))?
            .next()
            .ok_or_else(|| JevError::Network("域名没有解析出任何地址".to_string()))?;
        let stream = TcpStream::connect_timeout(&addr, self.config.timeout)
            .map_err(|e| JevError::Network(format!("连接失败：{e}")))?;
        stream
            .set_read_timeout(Some(self.config.timeout))
            .map_err(|e| JevError::Network(format!("设置读超时失败：{e}")))?;
        stream
            .set_write_timeout(Some(self.config.timeout))
            .map_err(|e| JevError::Network(format!("设置写超时失败：{e}")))?;
        Ok(stream)
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

    fn post_http(&self, rest: &str, body: &[u8]) -> Result<Vec<u8>, JevError> {
        let (host, port, path) = split_url(rest, 80)?;
        let mut stream = self.connect(&host, port)?;
        let head = self.head(&path, &format!("{host}:{port}"), body);
        stream
            .write_all(head.as_bytes())
            .and_then(|_| stream.write_all(body))
            .and_then(|_| stream.flush())
            .map_err(|e| JevError::Network(format!("发送失败：{e}")))?;
        read_to_end(&mut stream)
    }

    fn post_https(&self, rest: &str, body: &[u8]) -> Result<Vec<u8>, JevError> {
        use native_tls::TlsConnector;
        let (host, port, path) = split_url(rest, 443)?;
        let connector = TlsConnector::new()
            .map_err(|e| JevError::Network(format!("初始化 TLS 失败：{e}")))?;
        let tcp = self.connect(&host, port)?;
        let mut tls = connector
            .connect(&host, tcp)
            .map_err(|e| JevError::Network(format!("TLS 握手失败：{e}")))?;
        let head = self.head(&path, &host, body);
        tls.write_all(head.as_bytes())
            .and_then(|_| tls.write_all(body))
            .and_then(|_| tls.flush())
            .map_err(|e| JevError::Network(format!("TLS 发送失败：{e}")))?;
        read_to_end(&mut tls)
    }
}

fn read_to_end<S: Read>(stream: &mut S) -> Result<Vec<u8>, JevError> {
    let mut raw = Vec::new();
    stream
        .read_to_end(&mut raw)
        .map_err(|e| JevError::Network(format!("读取失败：{e}")))?;
    Ok(raw)
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

fn split_status_and_body(raw: &[u8]) -> Result<(u16, &[u8]), JevError> {
    let text = std::str::from_utf8(raw)
        .map_err(|_| JevError::Invalid("响应不是 UTF-8".to_string()))?;
    let (head, _) = text
        .split_once("\r\n\r\n")
        .ok_or_else(|| JevError::Invalid("响应里没有空行分隔的 head/body".to_string()))?;
    // body 从分隔符之后开始 —— 字节偏移，不是字符偏移。
    let body_start = head.len() + 4;
    let status_line = head
        .lines()
        .next()
        .ok_or_else(|| JevError::Invalid("响应没有状态行".to_string()))?;
    let status = status_line
        .split_whitespace()
        .nth(1)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| JevError::Invalid(format!("看不懂的状态行：{status_line}")))?;
    Ok((status, raw.get(body_start..).unwrap_or(&[])))
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
        let (_, pretty) = build_request("{}", &[Direction::Up, Direction::Right], "jev-latest");
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
        };
        let err = JevClient::new(cfg)
            .decide("{}", &[Direction::Up])
            .unwrap_err();
        assert_eq!(err, JevError::NotConfigured);
    }
}
