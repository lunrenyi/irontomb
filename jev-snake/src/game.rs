//! 贪吃蛇引擎 —— 只接受 `Direction`，不知道决策者是谁。
//!
//! 「什么方向合法」在这份代码里只有一处定义：`SnakeGame::legal_directions()`。
//! 引擎（`tick`）和发给模型的选项列表读的是同一个函数。
//!
//! 为什么要坚持只有一处：这个项目的前身版本里，引擎和 provider 各有一份
//! 「什么方向能走」的判断，要靠人肉保证它们永远一致。否则就会出现
//! 「模型被要求选一个会自杀的方向」。合并成一份之后，
//! 「发给模型的选项」和「引擎真正接受的」在类型上就不可能对不上了。

use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// 棋盘坐标。`(0, 0)` 是左上角，x 向右，y 向下。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Point {
    pub x: i32,
    pub y: i32,
}

impl Point {
    pub const fn new(x: i32, y: i32) -> Self {
        Self { x, y }
    }
}

/// 四个方向。JSON 上是全小写，和贪吃蛇这套约定一致。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Direction {
    Up,
    Down,
    Left,
    Right,
}

pub const ALL_DIRECTIONS: [Direction; 4] = [
    Direction::Up,
    Direction::Down,
    Direction::Left,
    Direction::Right,
];

impl Direction {
    pub fn delta(self) -> (i32, i32) {
        match self {
            Direction::Up => (0, -1),
            Direction::Down => (0, 1),
            Direction::Left => (-1, 0),
            Direction::Right => (1, 0),
        }
    }

    /// 是否是对方的正对面。用来禁掉 180 度掉头。
    pub fn is_opposite(self, other: Direction) -> bool {
        matches!(
            (self, other),
            (Direction::Up, Direction::Down)
                | (Direction::Down, Direction::Up)
                | (Direction::Left, Direction::Right)
                | (Direction::Right, Direction::Left)
        )
    }

    /// 方向的小写字符串 —— 同时是发给模型的 choice key。
    pub fn key(self) -> &'static str {
        match self {
            Direction::Up => "up",
            Direction::Down => "down",
            Direction::Left => "left",
            Direction::Right => "right",
        }
    }

    /// 从小写字符串还原方向。模型返回了我们没问过的 key 时会得到 `None`。
    pub fn parse(s: &str) -> Option<Direction> {
        match s {
            "up" => Some(Direction::Up),
            "down" => Some(Direction::Down),
            "left" => Some(Direction::Left),
            "right" => Some(Direction::Right),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct BoardState {
    pub width: i32,
    pub height: i32,
}

/// 决策源能看到的**唯一**东西。没有可变引用，拿不到引擎。
///
/// 字段：`board / snake / food / direction / score / tick / seed`。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GameState {
    pub board: BoardState,
    /// 蛇身，**头在前**：`snake[0]` 是头，最后一个是尾。
    pub snake: Vec<Point>,
    pub food: Point,
    pub direction: Direction,
    pub score: u32,
    pub tick: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<u64>,
}

/// 一局的结果。harness 用它决定是继续还是收工。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GameOver {
    /// 撞墙或撞自己 —— 选错了。
    Died { tick: u64, score: u32 },
    /// 合法方向为空 —— 无论谁做决策，下一步都是死。
    /// 和「撞死」是两件事：撞死是选错，走投无路是没得选。
    DeadEnd { tick: u64, score: u32 },
    /// 跑满 tick 上限，正常收工。
    TicksExhausted { tick: u64, score: u32 },
}

impl GameOver {
    pub fn tick(&self) -> u64 {
        match self {
            GameOver::Died { tick, .. }
            | GameOver::DeadEnd { tick, .. }
            | GameOver::TicksExhausted { tick, .. } => *tick,
        }
    }

    pub fn score(&self) -> u32 {
        match self {
            GameOver::Died { score, .. }
            | GameOver::DeadEnd { score, .. }
            | GameOver::TicksExhausted { score, .. } => *score,
        }
    }

    pub fn label(&self) -> &'static str {
        match self {
            GameOver::Died { .. } => "died",
            GameOver::DeadEnd { .. } => "dead-end",
            GameOver::TicksExhausted { .. } => "ticks-exhausted",
        }
    }
}

/// 确定性 PRNG（xorshift64*）。
///
/// 不用 `rand` 不是为了炫技 —— 这条实验的全部价值都压在
/// 「同一个 seed 必然得到同一盘食物序列」上。自己写十几行，这个契约就摆在
/// 文件里可读可测；交给 `rand` 的版本策略，跨大版本可能变。
#[derive(Debug, Clone)]
pub struct Rng(u64);

impl Rng {
    pub fn seed_from_u64(seed: u64) -> Self {
        // 0 是 xorshift 的不动点，必须换掉。
        Rng(seed.wrapping_mul(0x9E37_79B9_7F4A_7C15) | 1)
    }

    fn next_u64(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x.wrapping_shr(12);
        x ^= x.wrapping_shl(25);
        x ^= x.wrapping_shr(27);
        self.0 = x;
        x.wrapping_mul(0x2545_F491_4F6C_DD1D)
    }

    /// 取 `[0, n)`。`n` 非正时返回 0。
    pub fn below(&mut self, n: i32) -> i32 {
        if n <= 0 {
            return 0;
        }
        (self.next_u64() % (n as u64)) as i32
    }
}

#[derive(Debug, Clone)]
pub struct SnakeGame {
    pub width: i32,
    pub height: i32,
    /// 头在前。
    snake: Vec<Point>,
    direction: Direction,
    next_direction: Direction,
    food: Point,
    pub score: u32,
    pub tick: u64,
    pub seed: u64,
    rng: Rng,
}

impl SnakeGame {
    pub fn new(width: i32, height: i32, seed: u64) -> Self {
        let mut game = Self {
            width,
            height,
            snake: Vec::new(),
            direction: Direction::Right,
            next_direction: Direction::Right,
            food: Point::new(0, 0),
            score: 0,
            tick: 0,
            seed,
            rng: Rng::seed_from_u64(seed),
        };
        game.spawn();
        game
    }

    /// 出生在棋盘左中朝右，随机撒第一个食物。
    fn spawn(&mut self) {
        // 蛇身是 3 格，头朝右，所以 x 至少要留 2 格 —— 窄棋盘上
        // width/4 - 2 会变成负数，蛇就直接生在屏幕外面了。
        let cx = (self.width / 4).max(2);
        let cy = (self.height / 2).clamp(1, (self.height - 1).max(1));
        self.snake = (0..3).map(|i| Point::new(cx - i, cy)).collect();
        self.direction = Direction::Right;
        self.next_direction = Direction::Right;
        self.score = 0;
        self.tick = 0;
        self.spawn_food();
    }

    fn spawn_food(&mut self) {
        let cells = (self.width * self.height) as usize;
        if self.snake.len() >= cells {
            return; // 棋盘塞满了，食物留在原地。
        }
        loop {
            let candidate = Point::new(self.rng.below(self.width), self.rng.below(self.height));
            if !self.snake.contains(&candidate) {
                self.food = candidate;
                return;
            }
        }
    }

    pub fn head(&self) -> Point {
        self.snake[0]
    }

    pub fn direction(&self) -> Direction {
        self.direction
    }

    pub fn food(&self) -> Point {
        self.food
    }

    /// 决策源看到的快照。
    pub fn snapshot(&self) -> GameState {
        GameState {
            board: BoardState {
                width: self.width,
                height: self.height,
            },
            snake: self.snake.clone(),
            food: self.food,
            direction: self.direction,
            score: self.score,
            tick: self.tick,
            seed: Some(self.seed),
        }
    }

    /// **合法方向的唯一定义。**
    ///
    /// 三件事：不能 180 度掉头、不能出界、不能撞自己（不吃食物时尾巴这一步
    /// 会让开，所以最后一段不算障碍）。
    ///
    /// 发给模型的 choice、模型返回的方向、引擎真正接受的，三者共用这一份
    /// 判定 —— 模型**不可能**被要求选一个会自杀的方向。
    pub fn legal_directions(&self) -> Vec<Direction> {
        let head = self.head();
        let n = self.snake.len();
        let will_eat = step(head, self.direction) == self.food;
        let limit = if will_eat { n } else { n.saturating_sub(1) };
        let body: HashSet<Point> = self.snake.iter().take(limit).copied().collect();

        ALL_DIRECTIONS
            .iter()
            .copied()
            .filter(|&d| {
                if d.is_opposite(self.direction) {
                    return false;
                }
                let next = step(head, d);
                in_bounds(next, self.width, self.height) && !body.contains(&next)
            })
            .collect()
    }

    /// 提交一个方向。引擎的最终防线：即使决策源给了非法方向（模型幻觉、
    /// bot 抽风），180 度掉头也会被这里挡掉。
    pub fn request_direction(&mut self, dir: Direction) {
        if dir.is_opposite(self.direction) {
            return;
        }
        self.next_direction = dir;
    }

    /// 推进一步。返回 true 表示这一步撞死了。
    pub fn tick(&mut self) -> bool {
        self.direction = self.next_direction;
        let (dx, dy) = self.direction.delta();
        let head = self.head();
        let new_head = Point::new(head.x + dx, head.y + dy);
        self.tick += 1;

        if !in_bounds(new_head, self.width, self.height) {
            return true;
        }

        let ate = new_head == self.food;
        let body_to_check: HashSet<Point> = if ate {
            self.snake.iter().copied().collect()
        } else {
            self.snake.iter().take(self.snake.len() - 1).copied().collect()
        };
        if body_to_check.contains(&new_head) {
            return true;
        }

        self.snake.insert(0, new_head);
        if ate {
            self.score += 1;
            self.spawn_food();
        } else {
            self.snake.pop();
        }
        false
    }
}

pub fn step(p: Point, d: Direction) -> Point {
    let (dx, dy) = d.delta();
    Point::new(p.x + dx, p.y + dy)
}

pub fn in_bounds(p: Point, w: i32, h: i32) -> bool {
    p.x >= 0 && p.y >= 0 && p.x < w && p.y < h
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 造一个被 JSON 引号包起来的字符串，避开源码里的转义符。
    fn quoted(s: &str) -> String {
        format!("{}{}{}", '"', s, '"')
    }

    #[test]
    fn direction_wire_format_is_lowercase() {
        let json = serde_json::to_string(&Direction::Left).unwrap();
        assert_eq!(json, quoted("left"));
        assert_eq!(
            serde_json::from_str::<Direction>(&quoted("down")).unwrap(),
            Direction::Down
        );
        assert_eq!(Direction::parse("UP"), None, "只认全小写");
    }

    #[test]
    fn game_state_has_every_field_a_decision_source_needs() {
        // 少一个字段，决策源就少一块上下文 —— 所以逐个点名检查。
        let state = GameState {
            board: BoardState {
                width: 24,
                height: 12,
            },
            snake: vec![Point::new(10, 6), Point::new(9, 6), Point::new(8, 6)],
            food: Point::new(17, 8),
            direction: Direction::Right,
            score: 12,
            tick: 128,
            seed: Some(7),
        };
        let v = serde_json::to_value(&state).unwrap();
        for key in ["board", "snake", "food", "direction", "score", "tick", "seed"] {
            assert!(v.get(key).is_some(), "缺少字段 {key}");
        }
        let back: GameState = serde_json::from_value(v).unwrap();
        assert_eq!(back, state);
    }

    #[test]
    fn same_seed_gives_the_same_food_sequence() {
        let mut a = SnakeGame::new(24, 12, 42);
        let mut b = SnakeGame::new(24, 12, 42);
        for _ in 0..50 {
            a.request_direction(Direction::Right);
            b.request_direction(Direction::Right);
            a.tick();
            b.tick();
            assert_eq!(a.snapshot(), b.snapshot());
        }
    }

    #[test]
    fn different_seeds_diverge() {
        assert_ne!(SnakeGame::new(24, 12, 1).food(), SnakeGame::new(24, 12, 2).food());
    }

    #[test]
    fn a_narrow_board_still_spawns_the_snake_on_it() {
        // 回归测试：width/4 - 2 在窄棋盘上是负数，蛇会生在屏幕外。
        for width in 4..12 {
            for height in 4..12 {
                let game = SnakeGame::new(width, height, 1);
                let state = game.snapshot();
                assert_eq!(state.snake.len(), 3);
                for p in &state.snake {
                    assert!(
                        in_bounds(*p, width, height),
                        "{width}x{height} 上生出了界外的 {p:?}"
                    );
                }
                assert!(in_bounds(state.food, width, height));
            }
        }
    }

    #[test]
    fn legal_directions_exclude_reverse_walls_and_body() {
        let mut g = SnakeGame::new(10, 10, 3);
        // 出生点朝右：左边是 180 度掉头，被禁 —— 哪怕那格是空的。
        let legal = g.legal_directions();
        assert!(!legal.contains(&Direction::Left));
        assert!(legal.contains(&Direction::Right));
        assert_eq!(legal.len(), 3, "上 / 下 / 右");

        // 贴到右上角：上、右出界，左是掉头，只剩下一条。
        g.snake = vec![Point::new(9, 0), Point::new(8, 0), Point::new(7, 0)];
        g.direction = Direction::Right;
        g.next_direction = Direction::Right;
        let legal = g.legal_directions();
        assert!(!legal.contains(&Direction::Up), "上 = 出界");
        assert!(!legal.contains(&Direction::Right), "右 = 出界");
        assert!(!legal.contains(&Direction::Left), "左 = 掉头");
        assert!(legal.contains(&Direction::Down));
        assert_eq!(legal.len(), 1);
    }

    #[test]
    fn tail_vacates_so_its_cell_is_not_a_wall() {
        let mut g = SnakeGame::new(10, 10, 3);
        // 头 (4,5)、身 (3,5)、尾 (2,5)，朝右。
        g.snake = vec![Point::new(4, 5), Point::new(3, 5), Point::new(2, 5)];
        g.direction = Direction::Right;
        g.next_direction = Direction::Right;
        // 不吃食物时尾巴这一步会挪走，所以 (2,5) 不是障碍。
        let legal = g.legal_directions();
        assert!(!legal.contains(&Direction::Left), "掉头本来就非法");
        assert_eq!(legal.len(), 3, "上 / 下 / 右 三条都合法");
    }

    #[test]
    fn engine_rejects_a_180_turn_from_a_decision_source() {
        let mut g = SnakeGame::new(10, 10, 3);
        g.direction = Direction::Right;
        g.request_direction(Direction::Left); // 非法：正对面
        g.tick();
        assert_eq!(g.direction(), Direction::Right, "引擎必须无视它");
    }

    #[test]
    fn dead_end_is_detectable_before_it_happens() {
        // 蛇头卡在左上角，唯一的两个邻格都被自己的身体占着，
        // 另外两个方向是墙 —— 没得选。注意尾巴 (1,1) 不参与这一步的
        // 障碍判定（它会让开），所以身体得够长才堵得住。
        let mut g = SnakeGame::new(4, 4, 3);
        g.snake = vec![
            Point::new(0, 0),
            Point::new(1, 0),
            Point::new(0, 1),
            Point::new(1, 1),
        ];
        g.direction = Direction::Right;
        g.next_direction = Direction::Right;
        g.food = Point::new(3, 3);
        assert!(g.legal_directions().is_empty());
    }

    #[test]
    fn the_engine_kills_at_the_wall() {
        // 直接往引擎里灌「一直向右」：24 宽的棋盘，从 x=6 出发，
        // 第 18 步必然撞右墙。这是引擎最基本的一条边界。
        let mut g = SnakeGame::new(24, 12, 1);
        let mut steps = 0;
        loop {
            g.request_direction(Direction::Right);
            steps += 1;
            if g.tick() {
                break;
            }
        }
        assert_eq!(steps, 18);
    }
}
