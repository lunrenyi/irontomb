//! 三个决策源，共用一份 `GameState`、同一个出口。
//!
//! 这条实验真正要回答的问题是：**能不能把「决定下一步往哪走」这件事
//! 完全交给外部，而引擎一点都不知道。** 三个源里有两个不需要网络，
//! 正好当尺子：模型选的方向，要和一把纯算术的尺子量出来的结果比。

use crate::game::{in_bounds, step, Direction, GameState, Point};
use crate::jev::{JevClient, JevError};
use std::collections::{HashMap, HashSet, VecDeque};

/// 决策源的一次调用结果。`latency_ms` 对算法源恒为 0 —— 那正是对比点。
#[derive(Debug, Clone)]
pub struct Move {
    pub direction: Direction,
    pub latency_ms: f32,
    /// 模型给的置信度；算法源为 None。
    pub confidence: Option<f32>,
    pub input_tokens: Option<u32>,
    pub output_tokens: Option<u32>,
    /// 模型对每个方向的判断，按概率从大到小。算法源是空的 ——
    /// 它们本来就没有「分布」这回事，硬凑一个反而是撒谎。
    pub probabilities: Vec<(Direction, f32)>,
    /// 这一步是「重放模型之前给的路线」，不是新问出来的。
    /// 为 false 才代表真的付了一次网络往返。
    pub from_plan: bool,
    /// 拿到这一步重试了几次。
    pub retries: u32,
}

/// 让模型选一步。
///
/// `JevSource::choose` 和界面里的后台线程共用这一份逻辑 ——
/// 免得出现「界面上的 Jev」和「命令行里的 Jev」其实是两个实现。
pub fn jev_decide(
    client: &JevClient,
    state: &GameState,
    legal: &[Direction],
) -> Result<Move, String> {
    let d = client.decide(state, legal).map_err(|e| {
        report_error(&e);
        e.to_string()
    })?;
    let mut probabilities: Vec<(Direction, f32)> = d.probabilities.into_iter().collect();
    probabilities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    Ok(Move {
        direction: d.direction,
        latency_ms: d.latency.as_secs_f32() * 1000.0,
        confidence: d.confidence,
        input_tokens: d.input_tokens,
        output_tokens: d.output_tokens,
        probabilities,
        from_plan: false,
        retries: d.retries,
    })
}

/// 调用期的累计数字。harness 的汇总表就是从这里来的。
#[derive(Debug, Clone, Default)]
pub struct Stats {
    pub calls: u32,
    pub errors: u32,
    pub latencies_ms: Vec<f32>,
    pub input_tokens: u32,
    pub output_tokens: u32,
    /// 真正付出的网络往返次数。和 `calls` 分开，才能量出「一次往返换几格」。
    pub round_trips: u32,
    /// 因为传输层失败而重试的总次数。上报出来，延迟统计含不含重试就一目了然。
    pub retries: u32,
}

impl Stats {
    pub fn record(&mut self, latency_ms: f32) {
        self.calls += 1;
        self.latencies_ms.push(latency_ms);
    }

    /// 记录一步**没有联网**的决策（重放模型给的路线）。
    ///
    /// 只数步数，**不进延迟分布** —— 把 0 塞进延迟样本会把 p50 拉成 0，
    /// 那是在说谎：这步不是「0 ms」，是「没花钱」。
    pub fn record_local_step(&mut self) {
        self.calls += 1;
    }

    /// 分位数：取第 `round((n-1) * p)` 个样本（0-based）。
    /// 偶数个样本时中位数取靠上的那个，不是两者的平均值 —— 换句话说
    /// 这是一个「真实发生过的时间点」，不是插值出来的数。
    /// 样本为空时返回 None。
    pub fn percentile(&self, p: f32) -> Option<f32> {
        if self.latencies_ms.is_empty() {
            return None;
        }
        let mut sorted = self.latencies_ms.clone();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let idx = ((sorted.len() - 1) as f32 * p).round() as usize;
        Some(sorted[idx])
    }

    pub fn mean(&self) -> Option<f32> {
        if self.latencies_ms.is_empty() {
            return None;
        }
        Some(self.latencies_ms.iter().sum::<f32>() / self.latencies_ms.len() as f32)
    }
}

pub trait DecisionSource {
    fn name(&self) -> &str;
    /// 给一份状态和一份合法方向表，选一个方向。
    fn choose(&mut self, state: &GameState, legal: &[Direction]) -> Result<Move, String>;
    fn stats(&self) -> &Stats;
    fn stats_mut(&mut self) -> &mut Stats;
}

// ---------------------------------------------------------------------------
// 尺子 1：一路向右
// ---------------------------------------------------------------------------

/// 最笨的合法策略：能向右就向右，不能就随便挑一条合法的。
///
/// 存在的意义是当对照组 —— 它几乎不碰食物（5 局平均 0.3 分），
/// 正好把「会算的」和「不会算的」之间的距离量出来。
pub struct ConstantSource {
    stats: Stats,
}

impl Default for ConstantSource {
    fn default() -> Self {
        Self {
            stats: Stats::default(),
        }
    }
}

impl DecisionSource for ConstantSource {
    fn name(&self) -> &str {
        "constant/right"
    }

    fn choose(&mut self, _state: &GameState, legal: &[Direction]) -> Result<Move, String> {
        if legal.is_empty() {
            return Err("没有合法方向".to_string());
        }
        let dir = if legal.contains(&Direction::Right) {
            Direction::Right
        } else {
            legal[0]
        };
        self.stats.record(0.0);
        Ok(Move {
            direction: dir,
            latency_ms: 0.0,
            confidence: None,
            input_tokens: None,
            output_tokens: None,
            probabilities: Vec::new(),
            from_plan: false,
            retries: 0,
        })
    }

    fn stats(&self) -> &Stats {
        &self.stats
    }

    fn stats_mut(&mut self) -> &mut Stats {
        &mut self.stats
    }
}

// ---------------------------------------------------------------------------
// 尺子 2：洪水填充 + 贪心
// ---------------------------------------------------------------------------

/// 一步之后的空地面积。`walls` 是走完那步之后蛇身占的格子，
/// **不包含蛇头自己所在的那格** —— 填充从蛇头出发，把它算成墙会得到 0。
fn reachable_area(start: Point, width: i32, height: i32, walls: &HashSet<Point>) -> usize {
    if !in_bounds(start, width, height) || walls.contains(&start) {
        return 0;
    }
    let mut seen: HashSet<Point> = HashSet::new();
    let mut queue: VecDeque<Point> = VecDeque::new();
    seen.insert(start);
    queue.push_back(start);
    let mut count = 0;
    while let Some(p) = queue.pop_front() {
        count += 1;
        for d in crate::game::ALL_DIRECTIONS {
            let np = step(p, d);
            if in_bounds(np, width, height) && !walls.contains(&np) && seen.insert(np) {
                queue.push_back(np);
            }
        }
    }
    count
}

fn manhattan(a: Point, b: Point) -> i32 {
    (a.x - b.x).abs() + (a.y - b.y).abs()
}

/// 走完 `dir` 之后，蛇身会占住哪些格子。
fn body_after_move(state: &GameState, dir: Direction) -> HashSet<Point> {
    let head = state.snake[0];
    let next = step(head, dir);
    let mut body: HashSet<Point> = state.snake.iter().copied().collect();
    // 尾巴这一步会让开 —— 除非这步正好吃到食物。
    if next != state.food {
        if let Some(&tail) = state.snake.last() {
            body.remove(&tail);
        }
    }
    body.remove(&head); // 蛇头已经挪到 next 去了
    body.insert(next);
    body
}

/// 算法基线。洪水填充 + 贪心，只有一个策略：
///
/// 1. 对每个合法方向算两件事 —— 离食物的曼哈顿距离，以及走完这步之后
///    蛇头还能到的空地面积（洪水填充）；
/// 2. 面积不到最好那步的 1/4 的，是陷阱，丢掉；
/// 3. 剩下的里挑离食物最近的那步。
///
pub struct GreedySource {
    stats: Stats,
}

impl Default for GreedySource {
    fn default() -> Self {
        Self {
            stats: Stats::default(),
        }
    }
}

impl GreedySource {
    /// 单个方向的打分：(离食物的距离, 走完之后的空地面积)。
    pub fn score(&self, state: &GameState, dir: Direction) -> (i32, usize) {
        let next = step(state.snake[0], dir);
        let walls = body_after_move(state, dir);
        (
            manhattan(next, state.food),
            reachable_area(next, state.board.width, state.board.height, &walls),
        )
    }
}

impl DecisionSource for GreedySource {
    fn name(&self) -> &str {
        "greedy/flood-fill"
    }

    fn choose(&mut self, state: &GameState, legal: &[Direction]) -> Result<Move, String> {
        if legal.is_empty() {
            return Err("没有合法方向".to_string());
        }
        let mut scored: Vec<(Direction, i32, usize)> = legal
            .iter()
            .map(|&d| {
                let (food_dist, area) = self.score(state, d);
                (d, food_dist, area)
            })
            .collect();

        let best_area = scored.iter().map(|s| s.2).max().unwrap_or(0);
        let threshold = best_area / 4;
        // 全是陷阱时不筛 —— 死也要死在最大的空地里。
        if scored.iter().any(|s| s.2 >= threshold) {
            scored.retain(|s| s.2 >= threshold);
        }
        scored.sort_by_key(|s| s.1);
        self.stats.record(0.0);
        Ok(Move {
            direction: scored[0].0,
            latency_ms: 0.0,
            confidence: None,
            input_tokens: None,
            output_tokens: None,
            probabilities: Vec::new(),
            from_plan: false,
            retries: 0,
        })
    }

    fn stats(&self) -> &Stats {
        &self.stats
    }

    fn stats_mut(&mut self) -> &mut Stats {
        &mut self.stats
    }
}

// ---------------------------------------------------------------------------
// 被试：Jev
// ---------------------------------------------------------------------------

/// 把 `GameState` 发给 TypeSafe，让 Jev 选一步。
///
/// 和算法源唯一的区别是 `choose()` 要过网络。其余一模一样 —— 这正是
/// 「引擎只接受 Direction」那条设计要兑现的东西。
pub struct JevSource {
    client: JevClient,
    stats: Stats,
    /// 模型一次给了几步、还没走完的路线。`JEV_PLAN=1` 时这个队列永远是空的。
    pending: std::collections::VecDeque<Direction>,
}

impl JevSource {
    pub fn new(client: JevClient) -> Self {
        Self {
            client,
            stats: Stats::default(),
            pending: std::collections::VecDeque::new(),
        }
    }

    pub fn client(&self) -> &JevClient {
        &self.client
    }

}

impl DecisionSource for JevSource {
    fn name(&self) -> &str {
        "model/Jev"
    }

    fn choose(&mut self, state: &GameState, legal: &[Direction]) -> Result<Move, String> {
        // 还有没走完的路线，且下一步在当前棋盘上仍然合法 —— 就直接走，不联网。
        // 这就是「一次往返换 N 格」的全部机制：往返次数不变，每步的边际成本变成 0。
        if let Some(&next) = self.pending.front() {
            if legal.contains(&next) {
                self.pending.pop_front();
                self.stats.record_local_step();
                return Ok(Move {
                    direction: next,
                    latency_ms: 0.0,
                    confidence: None,
                    input_tokens: None,
                    output_tokens: None,
                    probabilities: Vec::new(),
                    from_plan: true,
                    retries: 0,
                });
            }
            // 计划失效（吃过食物、身体变了）—— 丢掉剩下的，重新问。
            self.pending.clear();
        }

        let horizon = self.client.config().plan_horizon;
        if horizon > 1 {
            return self.choose_with_plan(state, legal, horizon);
        }
        match jev_decide(&self.client, state, legal) {
            Ok(m) => {
                self.stats.record(m.latency_ms);
                self.stats.round_trips += 1;
                self.stats.retries += m.retries;
                self.stats.input_tokens += m.input_tokens.unwrap_or(0);
                self.stats.output_tokens += m.output_tokens.unwrap_or(0);
                Ok(m)
            }
            Err(e) => {
                self.stats.errors += 1;
                Err(e)
            }
        }
    }

    fn stats(&self) -> &Stats {
        &self.stats
    }

    fn stats_mut(&mut self) -> &mut Stats {
        &mut self.stats
    }
}

impl JevSource {
    fn choose_with_plan(
        &mut self,
        state: &GameState,
        legal: &[Direction],
        horizon: usize,
    ) -> Result<Move, String> {
        let plan = match self.client.plan(state, legal, horizon) {
            Ok(p) => p,
            Err(e) => {
                report_error(&e);
                return Err(e.to_string());
            }
        };
        self.pending.clear();
        for d in plan.directions.iter().skip(1) {
            self.pending.push_back(*d);
        }
        let first = *plan
            .directions
            .first()
            .expect("parse_plan_key 保证至少一步");
        self.stats.record(plan.latency.as_secs_f32() * 1000.0);
        self.stats.round_trips += 1;
        self.stats.retries += plan.retries;
        self.stats.input_tokens += plan.input_tokens.unwrap_or(0);
        self.stats.output_tokens += plan.output_tokens.unwrap_or(0);
        Ok(Move {
            direction: first,
            latency_ms: plan.latency.as_secs_f32() * 1000.0,
            confidence: plan.confidence,
            input_tokens: plan.input_tokens,
            output_tokens: plan.output_tokens,
            probabilities: Vec::new(),
            from_plan: true,
            retries: plan.retries,
        })
    }
}

/// 把错误打到 stderr。命中已知故障时补一句人话提示 —— 只在真知道的时候说。
fn report_error(e: &JevError) {
    eprintln!("    ! [{}] {}", e.label(), e);
    if let Some(hint) = e.hint() {
        eprintln!("      提示：{hint}");
    }
}

/// 概率表 -> 一行字符串，按概率从大到小。给 `--trace` 用。
pub fn format_probabilities(probs: &HashMap<Direction, f32>) -> String {
    let mut items: Vec<(&str, f32)> = probs.iter().map(|(d, p)| (d.key(), *p)).collect();
    items.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    items
        .iter()
        .map(|(k, v)| format!("{}={:.2}", k, v))
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::SnakeGame;

    /// 用一个决策源把一局跑完，返回吃到的食物数。
    fn play(src: &mut dyn DecisionSource, seed: u64, max_ticks: u32) -> (u32, bool) {
        let mut game = SnakeGame::new(24, 12, seed);
        for _ in 0..max_ticks {
            let legal = game.legal_directions();
            if legal.is_empty() {
                return (game.score, false);
            }
            let m = match src.choose(&game.snapshot(), &legal) {
                Ok(m) => m,
                Err(_) => return (game.score, false),
            };
            assert!(
                legal.contains(&m.direction),
                "{} 选了非法的 {}",
                src.name(),
                m.direction.key()
            );
            game.request_direction(m.direction);
            if game.tick() {
                return (game.score, true);
            }
        }
        (game.score, false)
    }

    #[test]
    fn greedy_never_returns_an_illegal_direction() {
        let mut src = GreedySource::default();
        play(&mut src, 5, 400); // play() 内部已经断言过合法性
    }

    #[test]
    fn greedy_outlives_the_constant_baseline_on_the_same_seed() {
        let (constant_score, _) = play(&mut ConstantSource::default(), 5, 400);
        let (greedy_score, _) = play(&mut GreedySource::default(), 5, 400);
        assert_eq!(constant_score, 0, "一路向右吃不到东西");
        assert!(greedy_score > 0, "洪水填充基线至少得吃到 1 个，实际 {greedy_score}");
    }

    #[test]
    fn tail_cell_is_freed_the_step_it_moves() {
        // 回归测试：算「走完这步还剩多少空地」时尾巴必须先让开，
        // 否则所有方向的面积都会被自己挡掉一大块。
        let state = GameState {
            board: crate::game::BoardState {
                width: 10,
                height: 10,
            },
            snake: vec![Point::new(4, 5), Point::new(3, 5), Point::new(2, 5)],
            food: Point::new(8, 5),
            direction: Direction::Right,
            score: 0,
            tick: 0,
            seed: Some(3),
        };
        let after = body_after_move(&state, Direction::Right);
        assert!(!after.contains(&Point::new(2, 5)), "尾巴 (2,5) 这一步已经挪走");
        assert!(after.contains(&Point::new(5, 5)), "新蛇头 (5,5) 算障碍");
        assert!(after.contains(&Point::new(3, 5)), "中段 (3,5) 还在");
    }

    #[test]
    fn percentile_handles_empty_and_sorted_samples() {
        let mut s = Stats::default();
        assert_eq!(s.percentile(0.5), None);
        s.record(100.0);
        assert_eq!(s.percentile(0.0), Some(100.0));
        assert_eq!(s.percentile(1.0), Some(100.0));
        for ms in [10.0, 20.0, 30.0] {
            s.record(ms);
        }
        // 排序后 [10, 20, 30, 100]，round((4-1)*0.5) = 2 -> 30。
        assert_eq!(s.percentile(0.5), Some(30.0));
        assert_eq!(s.percentile(0.75), Some(30.0)); // round(2.25) = 2
        assert_eq!(s.percentile(1.0), Some(100.0)); // round(3.0) = 3
        assert_eq!(s.mean(), Some(40.0));
    }

    #[test]
    fn probabilities_render_highest_first() {
        let mut probs = HashMap::new();
        probs.insert(Direction::Up, 0.1);
        probs.insert(Direction::Right, 0.7);
        probs.insert(Direction::Down, 0.2);
        assert_eq!(
            format_probabilities(&probs),
            "right=0.70 down=0.20 up=0.10"
        );
    }
}
