//! jev-snake 的测量台。
//!
//! 不画界面，只跑分。屏幕、主题、字体、动画全是为了**看**，而这条实验要的是
//! **量**：模型一步要多久、一步烧多少 token、它选的方向和一把算术尺子差多少。
//! 界面只保留一块，围绕这条实验重画（见 README）。

use jev_snake::app::{App, PlayConfig};
use jev_snake::game::{GameOver, SnakeGame};
use jev_snake::provider::{DecisionSource, JevSource};
use jev_snake::{jev, mock, provider};
use serde::Serialize;
use std::time::Duration;
use std::time::Instant;

const USAGE: &str = "\
jev-snake —— Jev 驱动贪吃蛇的测量台

USAGE:
    jev-snake play [选项]        打开界面，边看边跑
    jev-snake run [选项]        跑一局，出一张表
    jev-snake bench [选项]      同一批 seed 上跑 N 局，出汇总
    jev-snake protocol [选项]   打印将要发给 /v1/systemone 的请求体（不需要 key）
    jev-snake mock [选项]       起一个本地假 TypeSafe，手动戳

run / bench 选项:
    --source <constant|greedy|jev>   决策源，默认 greedy
    --ticks <N>                      每局最多走多少步，默认 200
    --seed <N>                       随机种子，默认 42
    --seeds <N>                      bench 用：跑多少个 seed，默认 10
    --width <N>                      棋盘宽，默认 24
    --height <N>                     棋盘高，默认 12
    --trace                          每一步都打出来
    --json                           输出 JSON
    --dump <path>                    把每一次决策的原始记录写成 JSON（回答
                                    「probabilities 有没有信息量」靠它）
    --on-error <stop|continue>       模型出错时停手还是沿用原方向，默认 stop

play 选项:
    --source <constant|greedy|jev>   决策源，默认 jev
    --seed <N>                       初始 seed，默认 42
    --width <N> / --height <N>       棋盘大小，默认 24 x 12
    --tps <N>                        本地决策源的初始速度（格/秒），默认 8
    --ticks <N>                      跑够 N 步自动收工；不给就手动退出

play 按键:
    q / Esc / Ctrl-C   退出          空格   暂停 / 继续
    r                  同 seed 重开   n      换个 seed 重开
    + / -              调速（只对本地决策源有效）

protocol 选项:
    --tick <K>                       先空走 K 步再打印，默认 0

mock 选项:
    --mode <cycle|region-blocked|garbage>   默认 cycle
    --latency-ms <N>                        每个回复先睡 N 毫秒。
                                            这是给界面用的：把往返时间拉长，
                                            就能亲眼看见「一格 = 一次往返」是什么意思

环境变量:
    TYPESAFE_API_KEY     真实调用必需；缺了会报 not-configured
    TYPESAFE_MODEL       默认 jev-latest
    TYPESAFE_BASE_URL    默认 https://api.typesafe.ai
    TYPESAFE_TIMEOUT_MS  默认 3000
    TYPESAFE_RETRIES     传输层失败时重试几次，默认 1，设 0 关掉
    https_proxy 等        认 http_proxy / https_proxy / all_proxy / no_proxy
    JEV_PROMPT_LANG      en（默认）| zh —— 2×2 对照实验用
    JEV_STATE_KIND       object（默认）| string —— 2×2 对照实验用
    JEV_PLAN             一次问几步。默认 1；3 = 一次问一条 3 步路线然后本地验着走
";

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let code = match args.first().map(String::as_str) {
        None | Some("-h") | Some("--help") | Some("help") => {
            print!("{USAGE}");
            0
        }
        Some("run") => cmd_run(&Options::parse(&args[1..])),
        Some("play") => cmd_play(&Options::parse(&args[1..])),
        Some("bench") => cmd_bench(&Options::parse(&args[1..])),
        Some("protocol") => cmd_protocol(&Options::parse(&args[1..])),
        Some("mock") => cmd_mock(&Options::parse(&args[1..])),
        Some(other) => {
            eprintln!("不认识的子命令：{other}\n");
            print!("{USAGE}");
            2
        }
    };
    std::process::exit(code);
}

// ---------------------------------------------------------------------------
// 参数
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
struct Options {
    source: String,
    /// 用户有没有显式写 `--source`。`play` 的默认值和 `run` 不同，靠它区分。
    source_explicit: bool,
    ticks: u32,
    seed: u64,
    seeds: u32,
    width: i32,
    height: i32,
    tps: f32,
    trace: bool,
    json: bool,
    dump: String,
    stop_on_error: bool,
    tick: u32,
    mode: String,
    latency_ms: u64,
}

impl Default for Options {
    fn default() -> Self {
        Self {
            source: "greedy".to_string(),
            source_explicit: false,
            ticks: 200,
            seed: 42,
            seeds: 10,
            width: 24,
            height: 12,
            tps: 8.0,
            trace: false,
            json: false,
            dump: String::new(),
            stop_on_error: true,
            tick: 0,
            mode: "cycle".to_string(),
            latency_ms: 0,
        }
    }
}

impl Options {
    fn parse(args: &[String]) -> Options {
        let mut o = Options::default();
        let mut i = 0;
        while i < args.len() {
            let key = args[i].clone();
            let mut next = || {
                i += 1;
                args.get(i).cloned().unwrap_or_default()
            };
            match key.as_str() {
                "--source" => {
                    o.source = next();
                    o.source_explicit = true;
                }
                "--ticks" => o.ticks = next().parse().unwrap_or(o.ticks),
                "--seed" => o.seed = next().parse().unwrap_or(o.seed),
                "--seeds" => o.seeds = next().parse().unwrap_or(o.seeds),
                "--width" => o.width = next().parse().unwrap_or(o.width),
                "--height" => o.height = next().parse().unwrap_or(o.height),
                "--tps" => o.tps = next().parse().unwrap_or(o.tps),
                "--tick" => o.tick = next().parse().unwrap_or(0),
                "--mode" => o.mode = next(),
                "--latency-ms" => o.latency_ms = next().parse().unwrap_or(0),
                "--trace" => o.trace = true,
                "--json" => o.json = true,
                "--dump" => o.dump = next(),
                "--on-error" => o.stop_on_error = next() != "continue",
                other => eprintln!("忽略不认识的参数：{other}"),
            }
            i += 1;
        }
        o
    }
}

// ---------------------------------------------------------------------------
// 跑一局
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
struct Summary {
    source: String,
    endpoint: String,
    seed: u64,
    board: String,
    outcome: String,
    ticks: u64,
    score: u32,
    decisions: u32,
    errors: u32,
    first_error: Option<String>,
    latency_p50_ms: Option<f32>,
    latency_p95_ms: Option<f32>,
    latency_mean_ms: Option<f32>,
    wall_ms: u128,
    /// 每秒能拿到几个决策 —— 也就是蛇最快能走几格。
    decisions_per_sec: f32,
    input_tokens: u32,
    output_tokens: u32,
    /// 网络往返次数（重放计划里的步不算）。
    round_trips: u32,
    /// 传输层失败导致的重试次数。延迟统计**包含**这些重试。
    retries: u32,
    /// 一���往返换来几格。1 = 老老实实每步一问。
    steps_per_round_trip: f32,
}

fn make_source(kind: &str) -> Result<Box<dyn DecisionSource>, String> {
    match kind {
        "constant" => Ok(Box::new(provider::ConstantSource::default())),
        "greedy" => Ok(Box::new(provider::GreedySource::default())),
        "jev" => Ok(Box::new(JevSource::new(jev::JevClient::new(
            jev::JevConfig::from_env(),
        )))),
        other => Err(format!(
            "不认识的决策源：{other}（可选 constant / greedy / jev）"
        )),
    }
}

/// 一次决策的原始记录。留着是为了两件事：
/// 1. 事后能重新分析，不用再烧一遍 token；
/// 2. 「模型给的概率到底准不准」这种问题，只有逐条记录才答得出来。
#[derive(Debug, Clone, Serialize)]
struct DecisionRecord {
    tick: u64,
    score_before: u32,
    head: [i32; 2],
    food: [i32; 2],
    legal: Vec<String>,
    chosen: String,
    confidence: Option<f32>,
    /// 模型给**它自己选的那个方向**的概率。
    p_chosen: Option<f32>,
    probabilities: std::collections::BTreeMap<String, f32>,
    latency_ms: f32,
    /// 这一步吃到了食物。
    ate_food: bool,
    /// 这一步把蛇送死了（撞墙或撞自己）。
    fatal: bool,
}

/// 「置信度能不能当门控」的答案。
///
/// 想法很简单：如果 `confidence` 真的有信息量，那么**高置信度的步应该更少撞死**。
/// 所以对每个阈值 t 问两个问题：
///
/// - 过了 t 的步里，撞死的比例是多少？（precision）
/// - 所有撞死的步里，有多少被 t 放过了？（recall）
///
/// 如果这两个数字几乎不随 t 变化，那这道门就是装饰。
#[derive(Debug, Clone, Serialize)]
struct Probe {
    decisions: usize,
    fatal_steps: usize,
    ate_food: usize,
    overall_fatal_rate: f32,
    mean_p_chosen_survived: Option<f32>,
    mean_p_chosen_fatal: Option<f32>,
    mean_conf_survived: Option<f32>,
    mean_conf_fatal: Option<f32>,
    gate: Vec<GateRow>,
}

#[derive(Debug, Clone, Serialize)]
struct GateRow {
    threshold: f32,
    kept: usize,
    fatal_among_kept: usize,
    fatal_rate_among_kept: f32,
    /// 所有撞死步里被放过的比例。
    fatal_caught_ratio: f32,
    /// 被放过的步里吃到食物的比例 —— 门控会不会把好事一起挡掉。
    food_rate_among_kept: f32,
}

fn probe(records: &[DecisionRecord]) -> Probe {
    let n = records.len();
    let fatal = records.iter().filter(|r| r.fatal).count();
    let ate = records.iter().filter(|r| r.ate_food).count();
    let mean = |rs: &[&DecisionRecord], pick: fn(&DecisionRecord) -> Option<f32>| -> Option<f32> {
        let v: Vec<f32> = rs.iter().filter_map(|r| pick(r)).collect();
        if v.is_empty() {
            None
        } else {
            Some(v.iter().sum::<f32>() / v.len() as f32)
        }
    };
    let survived: Vec<&DecisionRecord> = records.iter().filter(|r| !r.fatal).collect();
    let dead: Vec<&DecisionRecord> = records.iter().filter(|r| r.fatal).collect();

    let mut gate = Vec::new();
    for step in 0..=9 {
        let t = step as f32 / 10.0;
        let kept: Vec<&DecisionRecord> = records.iter().filter(|r| r.confidence.unwrap_or(1.0) >= t).collect();
        if kept.is_empty() {
            continue;
        }
        let fk = kept.iter().filter(|r| r.fatal).count();
        gate.push(GateRow {
            threshold: t,
            kept: kept.len(),
            fatal_among_kept: fk,
            fatal_rate_among_kept: fk as f32 / kept.len() as f32,
            fatal_caught_ratio: if fatal == 0 {
                0.0
            } else {
                fk as f32 / fatal as f32
            },
            food_rate_among_kept: kept.iter().filter(|r| r.ate_food).count() as f32 / kept.len() as f32,
        });
    }

    Probe {
        decisions: n,
        fatal_steps: fatal,
        ate_food: ate,
        overall_fatal_rate: if n == 0 { 0.0 } else { fatal as f32 / n as f32 },
        mean_p_chosen_survived: mean(&survived, |r| r.p_chosen),
        mean_p_chosen_fatal: mean(&dead, |r| r.p_chosen),
        mean_conf_survived: mean(&survived, |r| r.confidence),
        mean_conf_fatal: mean(&dead, |r| r.confidence),
        gate,
    }
}

fn print_probe(p: &Probe) {
    println!("\n--- 概率 / 置信度探针 ---");
    println!(
        "决策 {} 步，其中撞死 {} 步（{:.1}%），吃到食物 {} 步",
        p.decisions,
        p.fatal_steps,
        p.overall_fatal_rate * 100.0,
        p.ate_food
    );
    let f = |v: Option<f32>| v.map(|x| format!("{x:.3}")).unwrap_or_else(|| "-".into());
    println!(
        "存活步平均 p_chosen={} / confidence={}；撞死步 p_chosen={} / confidence={}",
        f(p.mean_p_chosen_survived),
        f(p.mean_conf_survived),
        f(p.mean_p_chosen_fatal),
        f(p.mean_conf_fatal)
    );
    println!("\n阈值   留下步数  其中撞死  撞死率   放过撞死步  留下步里吃到食物");
    for g in &p.gate {
        println!(
            "{:.1}    {:>6}    {:>6}    {:>6.1}%  {:>8.0}%      {:>6.1}%",
            g.threshold,
            g.kept,
            g.fatal_among_kept,
            g.fatal_rate_among_kept * 100.0,
            g.fatal_caught_ratio * 100.0,
            g.food_rate_among_kept * 100.0
        );
    }
}

/// 把探针结果**并进**已有的 JSON，而不是另起一个文档。
///
/// `jq` / `json.load` 只认一个顶层值。之前分成两段打印，看着像小问题，
/// 结果对照脚本直接 `JSONDecodeError` —— 两次实验的数据白跑。
fn json_with_probe<T: Serialize>(summary: &T, p: &Probe) -> String {
    let mut obj = match serde_json::to_value(summary) {
        Ok(serde_json::Value::Object(m)) => m,
        _ => serde_json::Map::new(),
    };
    obj.insert(
        "probe".to_string(),
        serde_json::to_value(p).unwrap_or(serde_json::Value::Null),
    );
    serde_json::to_string_pretty(&serde_json::Value::Object(obj)).unwrap_or_default()
}

/// 跑完一局，返回怎么收场的、计时、**每一次决策的原始延迟**，以及逐条记录。
/// 原始样本要留着 —— 跨局汇总只拿每局的 p50 再平均是没有意义的。
fn play_one(
    opts: &Options,
    seed: u64,
) -> (GameOver, Summary, Vec<f32>, Vec<DecisionRecord>) {
    let mut src = match make_source(&opts.source) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("{e}");
            std::process::exit(2);
        }
    };
    let endpoint = if opts.source == "jev" {
        jev::JevConfig::from_env().endpoint()
    } else {
        "-".to_string()
    };

    let mut game = SnakeGame::new(opts.width, opts.height, seed);
    let started = Instant::now();
    let mut first_error: Option<String> = None;
    let mut records: Vec<DecisionRecord> = Vec::new();

    let outcome = loop {
        if game.tick >= opts.ticks as u64 {
            break GameOver::TicksExhausted {
                tick: game.tick,
                score: game.score,
            };
        }
        let legal = game.legal_directions();
        if legal.is_empty() {
            break GameOver::DeadEnd {
                tick: game.tick,
                score: game.score,
            };
        }

        let state = game.snapshot();
        let chosen = match src.choose(&state, &legal) {
            Ok(m) => m,
            Err(e) => {
                if first_error.is_none() {
                    first_error = Some(e);
                }
                if opts.stop_on_error {
                    break GameOver::TicksExhausted {
                        tick: game.tick,
                        score: game.score,
                    };
                }
                // --on-error continue：沿用当前方向继续走，
                // 这样「模型挂了多久」也能被量到。
                provider::Move {
                    direction: state.direction,
                    latency_ms: 0.0,
                    confidence: None,
                    input_tokens: None,
                    output_tokens: None,
                    probabilities: Vec::new(),
                    from_plan: false,
                    retries: 0,
                }
            }
        };

        if opts.trace {
            let head = game.head();
            let food = game.food();
            let conf = match chosen.confidence {
                Some(c) => format!("{c:.2}"),
                None => "-".to_string(),
            };
            println!(
                "  {:>4}  {:>3}  ({:>2},{:>2})  ({:>2},{:>2})  {:<5} {:>8}  {:>5}",
                game.tick,
                game.score,
                head.x,
                head.y,
                food.x,
                food.y,
                chosen.direction.key(),
                format!("{:.0}ms", chosen.latency_ms),
                conf
            );
        }

        let score_before = game.score;
        let probabilities: std::collections::BTreeMap<String, f32> = chosen
            .probabilities
            .iter()
            .map(|(d, p)| (d.key().to_string(), *p))
            .collect();
        let p_chosen = probabilities.get(chosen.direction.key()).copied();
        records.push(DecisionRecord {
            tick: game.tick,
            score_before,
            head: [game.head().x, game.head().y],
            food: [game.food().x, game.food().y],
            legal: legal.iter().map(|d| d.key().to_string()).collect(),
            chosen: chosen.direction.key().to_string(),
            confidence: chosen.confidence,
            p_chosen,
            probabilities,
            latency_ms: chosen.latency_ms,
            ate_food: false, // 下面按真实结果回填
            fatal: false,
        });

        game.request_direction(chosen.direction);
        let fatal = game.tick();
        if let Some(r) = records.last_mut() {
            r.ate_food = game.score > score_before;
            r.fatal = fatal;
        }
        if fatal {
            break GameOver::Died {
                tick: game.tick,
                score: game.score,
            };
        }
    };

    let wall = started.elapsed();
    let stats = src.stats();
    let per_sec = if wall.as_secs_f32() > 0.0 {
        stats.calls as f32 / wall.as_secs_f32()
    } else {
        0.0
    };
    let summary = Summary {
        source: src.name().to_string(),
        endpoint,
        seed,
        board: format!("{}x{}", opts.width, opts.height),
        outcome: outcome.label().to_string(),
        ticks: outcome.tick(),
        score: outcome.score(),
        decisions: stats.calls,
        errors: stats.errors,
        first_error,
        latency_p50_ms: stats.percentile(0.5),
        latency_p95_ms: stats.percentile(0.95),
        latency_mean_ms: stats.mean(),
        wall_ms: wall.as_millis(),
        decisions_per_sec: per_sec,
        input_tokens: stats.input_tokens,
        output_tokens: stats.output_tokens,
        round_trips: stats.round_trips,
        retries: stats.retries,
        steps_per_round_trip: stats.calls as f32 / stats.round_trips.max(1) as f32,
    };
    (outcome, summary, stats.latencies_ms.clone(), records)
}

fn ms(v: Option<f32>) -> String {
    match v {
        Some(x) => format!("{x:.0} ms"),
        None => "-".to_string(),
    }
}

/// 打开界面。
fn cmd_play(opts: &Options) -> i32 {
    // `run` / `bench` 默认 greedy（不需要网，先给你一把尺子）；
    // `play` 默认 jev（要看的本来就是模型）。用户显式写了就听用户的。
    let source = if opts.source_explicit {
        opts.source.clone()
    } else {
        "jev".to_string()
    };
    let cfg = PlayConfig {
        source,
        seed: opts.seed,
        width: opts.width,
        height: opts.height,
        tps: opts.tps,
    };
    // --ticks 给了就当上限（方便无人值守地录一段），不给就一直玩到手动退出。
    let limit = if opts.ticks == 200 {
        None
    } else {
        Some(opts.ticks as u64)
    };

    let mut app = match App::new(&cfg, limit) {
        Ok(a) => a,
        Err(e) => {
            eprintln!("{e}");
            return 2;
        }
    };
    if let Err(e) = app.run() {
        eprintln!("界面退出时出错：{e}");
        return 1;
    }
    0
}

fn cmd_run(opts: &Options) -> i32 {
    if let Err(e) = make_source(&opts.source) {
        eprintln!("{e}");
        return 2;
    }

    if !opts.json {
        println!(
            "源：{}   棋盘：{}x{}   seed={}   上限={} ticks",
            opts.source, opts.width, opts.height, opts.seed, opts.ticks
        );
        if opts.source == "jev" {
            let cfg = jev::JevConfig::from_env();
            println!(
                "端点：{}   model={}   key={}   提问={}   state={}   JEV_PLAN={}",
                cfg.endpoint(),
                cfg.model,
                match cfg.api_key {
                    Some(_) => "已设置",
                    None => "未设置",
                },
                match cfg.prompt_lang {
                    jev::PromptLang::En => "英文",
                    jev::PromptLang::Zh => "中文",
                },
                match cfg.state_kind {
                    jev::StateKind::Object => "对象",
                    jev::StateKind::String => "字符串",
                },
                cfg.plan_horizon,
            );
        }
        if opts.trace {
            println!("\n tick  得分  蛇头      食物      方向     延迟    置信度");
        }
    }

    let (outcome, summary, _latencies, records) = play_one(opts, opts.seed);

    if !opts.dump.is_empty() {
        match std::fs::write(&opts.dump, serde_json::to_string_pretty(&records).unwrap_or_default()) {
            Ok(()) => eprintln!("逐条决策记录已写到 {}", opts.dump),
            Err(e) => eprintln!("写 dump 失败：{e}"),
        }
    }

    if opts.json {
        println!("{}", json_with_probe(&summary, &probe(&records)));
        return if summary.errors > 0 { 1 } else { 0 };
    }

    println!("\n--- 汇总 ---");
    println!("结果          {}", outcome.label());
    println!("得分          {}", summary.score);
    println!("步数          {}", summary.ticks);
    println!("决策次数      {}", summary.decisions);
    println!("网络往返      {}", summary.round_trips);
    println!("每次往返换    {:.2} 格", summary.steps_per_round_trip);
    println!("决策延迟 p50  {}", ms(summary.latency_p50_ms));
    println!("决策延迟 p95  {}", ms(summary.latency_p95_ms));
    println!("墙钟耗时      {} ms", summary.wall_ms);
    println!("每秒决策      {:.1} 次", summary.decisions_per_sec);
    println!("错误次数      {}", summary.errors);
    println!("传输层重试    {}", summary.retries);
    println!(
        "token         输入 {} / 输出 {}",
        summary.input_tokens, summary.output_tokens
    );
    if let Some(e) = &summary.first_error {
        println!("首次错误      {}", e.lines().next().unwrap_or(e));
    }
    if opts.source == "jev" {
        print_probe(&probe(&records));
    }

    i32::from(summary.errors > 0)
}

#[derive(Debug, Clone, Serialize)]
struct Bench {
    source: String,
    seeds: u32,
    games_played: u32,
    games_finished: u32,
    died: u32,
    dead_ends: u32,
    errors: u32,
    total_score: u32,
    mean_score: f32,
    best_score: u32,
    mean_ticks: f32,
    latency_p50_ms: Option<f32>,
    latency_p95_ms: Option<f32>,
    input_tokens: u32,
    output_tokens: u32,
    wall_ms: u128,
}

/// 多个 seed 的汇总。这里回答的是「这个源稳不稳」，不是「这一局多高」。
fn cmd_bench(opts: &Options) -> i32 {
    if let Err(e) = make_source(&opts.source) {
        eprintln!("{e}");
        return 2;
    }
    let started = Instant::now();
    let mut plays = 0u32;
    let mut finished = 0u32;
    let mut died = 0u32;
    let mut dead_ends = 0u32;
    let mut errors = 0u32;
    let mut scores = Vec::new();
    let mut ticks = Vec::new();
    let mut all_latencies: Vec<f32> = Vec::new();
    let mut input_tokens = 0u32;
    let mut output_tokens = 0u32;
    let mut first_error: Option<String> = None;
    let mut all_records: Vec<DecisionRecord> = Vec::new();

    for n in 0..opts.seeds {
        let seed = opts.seed + n as u64;
        let (outcome, s, latencies, recs) = play_one(opts, seed);
        all_records.extend(recs);
        plays += 1;
        scores.push(s.score);
        ticks.push(outcome.tick() as u32);
        errors += s.errors;
        all_latencies.extend(latencies);
        input_tokens += s.input_tokens;
        output_tokens += s.output_tokens;
        if first_error.is_none() {
            first_error = s.first_error.clone();
        }
        match outcome {
            GameOver::Died { .. } => died += 1,
            GameOver::DeadEnd { .. } => dead_ends += 1,
            GameOver::TicksExhausted { .. } => finished += 1,
        }
        if !opts.json {
            println!(
                "  seed={:<4} {:<15} score={:<4} ticks={:<5} errors={}",
                seed,
                s.outcome,
                s.score,
                s.ticks,
                s.errors
            );
        }
    }

    let mean = |v: &[u32]| -> f32 {
        if v.is_empty() {
            0.0
        } else {
            v.iter().sum::<u32>() as f32 / v.len() as f32
        }
    };
    let percentile = |values: &mut Vec<f32>, p: f32| -> Option<f32> {
        if values.is_empty() {
            return None;
        }
        values.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let idx = ((values.len() - 1) as f32 * p).round() as usize;
        Some(values[idx])
    };
    let p50 = percentile(&mut all_latencies.clone(), 0.5);
    let p95 = percentile(&mut all_latencies.clone(), 0.95);
    let bench = Bench {
        source: opts.source.clone(),
        seeds: opts.seeds,
        games_played: plays,
        games_finished: finished,
        died,
        dead_ends,
        errors,
        total_score: scores.iter().sum(),
        mean_score: mean(&scores),
        best_score: scores.iter().copied().max().unwrap_or(0),
        mean_ticks: mean(&ticks),
        latency_p50_ms: p50,
        latency_p95_ms: p95,
        input_tokens,
        output_tokens,
        wall_ms: started.elapsed().as_millis(),
    };
    if opts.json {
        println!("{}", json_with_probe(&bench, &probe(&all_records)));
    } else {
        println!("\n--- {} 个 seed 的汇总 ---", bench.seeds);
        println!("跑满          {} / {}", bench.games_finished, bench.games_played);
        println!("撞死          {}", bench.died);
        println!("走投无路      {}", bench.dead_ends);
        println!("平均得分      {:.1}（最高 {}）", bench.mean_score, bench.best_score);
        println!("平均步数      {:.1}", bench.mean_ticks);
        println!("错误次数      {}", bench.errors);
        println!("决策延迟 p50  {}", ms(bench.latency_p50_ms));
        println!("决策延迟 p95  {}", ms(bench.latency_p95_ms));
        println!(
            "token         输入 {} / 输出 {}",
            bench.input_tokens, bench.output_tokens
        );
        println!("墙钟耗时      {} ms", bench.wall_ms);
        if let Some(e) = &first_error {
            println!("首次错误      {}", e.lines().next().unwrap_or(e));
        }
        if opts.source == "jev" {
            print_probe(&probe(&all_records));
        }
    }

    if !opts.dump.is_empty() {
        match std::fs::write(&opts.dump, serde_json::to_string_pretty(&all_records).unwrap_or_default()) {
            Ok(()) => eprintln!("逐条决策记录已写到 {}", opts.dump),
            Err(e) => eprintln!("写 dump 失败：{e}"),
        }
    }

    i32::from(bench.errors > 0)
}

/// 打印将要发出去的请求体。没有 key 也能跑 —— 协议本身是可以被审的。
fn cmd_protocol(opts: &Options) -> i32 {
    let mut game = SnakeGame::new(opts.width, opts.height, opts.seed);
    // 空走 tick 步，好看清「棋局走到中盘时发的东西」长什么样。
    for _ in 0..opts.tick {
        let legal = game.legal_directions();
        if legal.is_empty() {
            break;
        }
        game.request_direction(legal[0]);
        if game.tick() {
            break;
        }
    }
    let legal = game.legal_directions();
    let state = game.snapshot();
    let model = jev::JevConfig::from_env().model;
    let cfg = jev::JevConfig::from_env();
    let pretty = jev::build_request(&state, &legal, &model, cfg.prompt_lang, cfg.state_kind)
        .map(|(_, p)| p)
        .unwrap_or_else(|e| format!("构造请求失败：{e}"));

    println!("端点：POST {}", jev::JevConfig::from_env().endpoint());
    println!("模型：{model}");
    println!("合法方向：{:?}", legal.iter().map(|d| d.key()).collect::<Vec<_>>());
    println!("请求体：\n{pretty}");
    0
}

/// 起一个本地假 TypeSafe，方便手动戳。
fn cmd_mock(opts: &Options) -> i32 {
    use mock::{MockJev, Reply};
    let base = match opts.mode.as_str() {
        "region-blocked" => Reply::Status(
            451,
            r#"{"title":"Typesafe is not available in your region.","status":451}"#.to_string(),
        ),
        "garbage" => Reply::Garbage,
        _ => Reply::CycleLegal(0),
    };
    // 延迟是包在外面的：回什么由 --mode 决定，回多慢由 --latency-ms 决定。
    let reply = if opts.latency_ms > 0 {
        Reply::Slow(Duration::from_millis(opts.latency_ms))
    } else {
        base
    };
    let server = match MockJev::start(reply) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("mock 起不来：{e}");
            return 1;
        }
    };
    println!("假 TypeSafe 跑在 {}", server.base_url());
    if opts.latency_ms > 0 {
        println!("每个回复延迟 {} ms", opts.latency_ms);
    }
    println!("另开一个终端：");
    println!(
        "  TYPESAFE_BASE_URL={} TYPESAFE_API_KEY=dummy \
         cargo run -- run --source jev --ticks 20 --trace",
        server.base_url()
    );
    println!("Ctrl-C 结束。");
    loop {
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rec(conf: Option<f32>, p: Option<f32>, fatal: bool, ate: bool) -> DecisionRecord {
        DecisionRecord {
            tick: 0,
            score_before: 0,
            head: [0, 0],
            food: [1, 1],
            legal: vec!["up".into()],
            chosen: "up".into(),
            confidence: conf,
            p_chosen: p,
            probabilities: Default::default(),
            latency_ms: 1.0,
            ate_food: ate,
            fatal,
        }
    }

    #[test]
    fn a_gate_that_works_would_lower_the_fatal_rate_among_kept_steps() {
        // 造一个「置信度真的有用」的世界：撞死的步置信度都低。
        let rs = vec![
            rec(Some(0.9), Some(0.9), false, false),
            rec(Some(0.8), Some(0.8), false, false),
            rec(Some(0.2), Some(0.2), true, false),
            rec(Some(0.1), Some(0.1), true, false),
        ];
        let p = probe(&rs);
        assert_eq!(p.decisions, 4);
        assert_eq!(p.fatal_steps, 2);
        assert_eq!(p.overall_fatal_rate, 0.5);

        // 阈值 0.5 应该把两个撞死的步都挡掉，且不留下的全是致命步。
        let g = p.gate.iter().find(|g| g.threshold == 0.5).unwrap();
        assert_eq!(g.kept, 2, "只有两个高置信度的步该活下来");
        assert_eq!(g.fatal_among_kept, 0);
        assert_eq!(g.fatal_rate_among_kept, 0.0);

        // 0 阈值等于不过门。
        let g0 = p.gate.iter().find(|g| g.threshold == 0.0).unwrap();
        assert_eq!(g0.kept, 4);
        assert!((g0.fatal_rate_among_kept - 0.5).abs() < 1e-6);
    }

    #[test]
    fn a_gate_that_does_nothing_shows_a_flat_fatal_rate() {
        // 造一个「置信度毫无信息量」的世界：置信度均匀铺开，撞不撞死和它无关。
        // 样本要够多 —— 4 条数据里任何模式看着都像信号。
        let rs: Vec<DecisionRecord> = (0..100)
            .map(|i| rec(Some(i as f32 / 100.0), Some(i as f32 / 100.0), i % 2 == 0, false))
            .collect();
        let p = probe(&rs);
        let rates: Vec<f32> = p.gate.iter().map(|g| g.fatal_rate_among_kept).collect();
        for r in &rates {
            assert!(
                (*r - 0.5).abs() < 0.25,
                "没有信息量的话，各阈值下的撞死率都该在 0.5 附近，实际 {rates:?}"
            );
        }
    }

    #[test]
    fn steps_without_confidence_are_not_silently_treated_as_zero() {
        // 没拿到 confidence 的步不能被阈值 0.2 之类的门挡掉 —— 那是在
        // 用「我们没数据」冒充「模型很不确定」。
        let rs = vec![
            rec(None, None, false, false),
            rec(Some(0.1), Some(0.1), true, false),
        ];
        let p = probe(&rs);
        let g = p.gate.iter().find(|g| g.threshold == 0.5).unwrap();
        assert_eq!(g.kept, 1, "没有置信度的步默认保留");
        assert_eq!(g.fatal_among_kept, 0);
    }

    #[test]
    fn an_empty_run_probes_cleanly_instead_of_dividing_by_zero() {
        let p = probe(&[]);
        assert_eq!(p.decisions, 0);
        assert_eq!(p.overall_fatal_rate, 0.0);
        assert!(p.gate.is_empty());
        assert!(p.mean_p_chosen_survived.is_none());
        // 不 panic 就够了。
        print_probe(&p);
    }

    #[test]
    fn json_output_is_one_document_not_two() {
        // 曾经把探针另起一段打印，结果 jq / json.load 直接报 Extra data ——
        // 对照脚本整个挂掉，两次实验白跑。顶层必须是且只有一个 JSON 值。
        let s = Summary {
            source: "model/Jev".into(),
            endpoint: "-".into(),
            seed: 42,
            board: "24x12".into(),
            outcome: "ticks-exhausted".into(),
            ticks: 30,
            score: 2,
            decisions: 30,
            errors: 0,
            first_error: None,
            latency_p50_ms: Some(840.0),
            latency_p95_ms: Some(900.0),
            latency_mean_ms: Some(845.0),
            wall_ms: 25_000,
            decisions_per_sec: 1.2,
            input_tokens: 10,
            output_tokens: 5,
            round_trips: 30,
            retries: 2,
            steps_per_round_trip: 1.0,
        };
        let text = json_with_probe(&s, &probe(&[rec(Some(0.5), Some(0.5), false, false)]));
        let v: serde_json::Value = serde_json::from_str(&text).expect("必须是一个完整 JSON");
        assert_eq!(v["score"], 2, "原有字段要还在原来的位置");
        assert!(v["probe"].is_object(), "探针并进同一个对象");
        assert_eq!(v["probe"]["decisions"], 1);
    }
}
