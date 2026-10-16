//! 事件循环：把引擎、决策源和界面接在一起。
//!
//! 这一层做一件界面才需要、而测量台不需要的事：**决策不能挡住界面**。
//! `run` / `bench` 里 `choose()` 是阻塞的，因为那里要的是干净的墙钟数字；
//! 这里如果也阻塞，屏幕会在每次网络往返期间冻住 —— 而「往返有多长」
//! 恰恰是这条实验最想让人看见的东西。所以模型决策丢到后台线程，
//! 主循环只负责：收键、收结果、画屏。
//!
//! 两种节奏是刻意分开的：
//!
//! - [`Pacing::Fixed`] —— 本地决策源。固定 tick 率，+/- 调速。
//! - [`Pacing::Server`] —— 模型决策源。**每走一格要等一次往返**。
//!   这时候界面上的速度由 API 说了算，调速键是无效的（也因此被去掉了）。

use crossterm::event::{self, Event, KeyCode, KeyEvent, KeyEventKind};
use crossterm::execute;
use crossterm::terminal::{
    disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen,
};
use ratatui::backend::CrosstermBackend;
use ratatui::Terminal;
use std::io::{self, Stdout};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::time::{Duration, Instant};

use crate::game::{GameOver, SnakeGame};
use crate::jev::{JevClient, JevConfig};
use crate::provider::{self, DecisionSource, Move};
use crate::ui::{self, DecisionLog, Pacing, UiState};

/// 界面里的默认刷新间隔。20fps 足够顺滑，也省电。
const FRAME: Duration = Duration::from_millis(50);

/// 连着错这么多次就收工 —— 不然界面会以最快速度把 API 打到拒绝服务为止。
const MAX_CONSECUTIVE_ERRORS: u32 = 5;

#[derive(Debug, Clone)]
pub struct PlayConfig {
    pub source: String,
    pub seed: u64,
    pub width: i32,
    pub height: i32,
    /// 本地决策源的初始 tick 率。
    pub tps: f32,
}

/// 决策源在界面里的两种跑法。
enum Pacer {
    Fixed {
        source: Box<dyn DecisionSource>,
        tps: f32,
    },
    Server {
        client: JevClient,
        tx: Sender<Result<Move, String>>,
        rx: Receiver<Result<Move, String>>,
        /// 有没有请求正在飞。
        in_flight: bool,
        consecutive_errors: u32,
    },
}

impl Pacer {
    fn pacing(&self) -> Pacing {
        match self {
            Pacer::Fixed { tps, .. } => Pacing::Fixed { tps: *tps },
            Pacer::Server { .. } => Pacing::Server,
        }
    }
}

pub struct App {
    game: SnakeGame,
    pacer: Pacer,
    view: UiState,
    next_tick: Instant,
    source_name: String,
    /// 跑够这么多步就自动收工。None = 一直玩到手动退出。
    tick_limit: Option<u64>,
    width: i32,
    height: i32,
    quit: bool,
}

impl App {
    pub fn new(cfg: &PlayConfig, tick_limit: Option<u64>) -> Result<Self, String> {
        let game = SnakeGame::new(cfg.width, cfg.height, cfg.seed);
        let snapshot = game.snapshot();

        let (pacer, source_name, endpoint) = match cfg.source.as_str() {
            "constant" | "greedy" => {
                let source: Box<dyn DecisionSource> = if cfg.source == "constant" {
                    Box::new(provider::ConstantSource::default())
                } else {
                    Box::new(provider::GreedySource::default())
                };
                let name = source.name().to_string();
                (
                    Pacer::Fixed {
                        source,
                        tps: cfg.tps,
                    },
                    name,
                    "-".to_string(),
                )
            }
            "jev" => {
                let config = JevConfig::from_env();
                let (tx, rx) = channel();
                (
                    Pacer::Server {
                        client: JevClient::new(config),
                        tx,
                        rx,
                        in_flight: false,
                        consecutive_errors: 0,
                    },
                    "model/Jev".to_string(),
                    JevConfig::from_env().endpoint(),
                )
            }
            other => return Err(format!("不认识的决策源：{other}")),
        };

        let mut view = UiState::new(&source_name, &endpoint, cfg.seed, snapshot.board);
        view.pacing = pacer.pacing();
        view.food = snapshot.food;
        view.snake = snapshot.snake;

        Ok(Self {
            game,
            pacer,
            view,
            next_tick: Instant::now(),
            source_name,
            tick_limit,
            width: cfg.width,
            height: cfg.height,
            quit: false,
        })
    }

    pub fn run(&mut self) -> io::Result<()> {
        // guard 必须活到循环结束 —— 它一析构就还原终端。
        let (_guard, mut terminal) = enter_tui()?;
        self.loop_until_quit(&mut terminal)
    }

    fn loop_until_quit(&mut self, terminal: &mut Terminal<CrosstermBackend<Stdout>>) -> io::Result<()> {
        while !self.quit {
            let _ = terminal.draw(|f| ui::render(f, &self.view));
            if event::poll(FRAME).unwrap_or(false) {
                if let Ok(Event::Key(key)) = event::read() {
                    if key.kind == KeyEventKind::Press {
                        self.on_key(key);
                    }
                }
            }
            self.advance(Instant::now());
        }
        Ok(())
    }

    fn on_key(&mut self, key: KeyEvent) {
        match key.code {
            KeyCode::Char('q') | KeyCode::Char('Q') | KeyCode::Esc => self.quit = true,
            KeyCode::Char('c') if key.modifiers.contains(crossterm::event::KeyModifiers::CONTROL) => {
                self.quit = true
            }
            KeyCode::Char(' ') => {
                self.view.paused = !self.view.paused;
            }
            KeyCode::Char('r') => self.restart(false),
            KeyCode::Char('n') => self.restart(true),
            KeyCode::Char('+') | KeyCode::Char('=') => self.nudge_tps(1.0),
            KeyCode::Char('-') | KeyCode::Char('_') => self.nudge_tps(-1.0),
            _ => {}
        }
    }

    fn nudge_tps(&mut self, delta: f32) {
        if let Pacer::Fixed { tps, .. } = &mut self.pacer {
            *tps = (*tps + delta).clamp(1.0, 30.0);
            self.view.pacing = Pacing::Fixed { tps: *tps };
        }
        // 服务端节奏下调速是假的 —— 空格按下去也不该假装能加速。
    }

    /// 重开一局。`new_seed` 为真就换个 seed，否则同 seed 重来一遍。
    fn restart(&mut self, new_seed: bool) {
        if new_seed {
            self.view.seed = self.view.seed.wrapping_add(1);
        }
        self.game = SnakeGame::new(self.width, self.height, self.view.seed);
        let snapshot = self.game.snapshot();
        self.view.snake = snapshot.snake;
        self.view.food = snapshot.food;
        self.view.tick = 0;
        self.view.score = 0;
        self.view.paused = false;
        self.view.game_over = None;
        self.view.status = None;
        self.view.last = None;
        self.view.history.clear();
        if let Pacer::Server {
            in_flight,
            consecutive_errors,
            ..
        } = &mut self.pacer
        {
            *in_flight = false;
            *consecutive_errors = 0;
        }
        self.next_tick = Instant::now();
    }

    /// 推进一步。两种节奏在这里分道扬镳。
    fn advance(&mut self, now: Instant) {
        if self.view.paused || self.view.game_over.is_some() {
            self.sync_view();
            return;
        }
        match &mut self.pacer {
            Pacer::Fixed { source, tps } => {
                if now < self.next_tick {
                    return;
                }
                let interval = Duration::from_secs_f32(1.0 / tps.max(0.1));
                self.next_tick = now + interval;
                let legal = self.game.legal_directions();
                if legal.is_empty() {
                    self.finish(GameOver::DeadEnd {
                        tick: self.game.tick,
                        score: self.game.score,
                    });
                    return;
                }
                match source.choose(&self.game.snapshot(), &legal) {
                    Ok(m) => {
                        self.view.stats = source.stats().clone();
                        self.apply(m);
                    }
                    Err(e) => {
                        self.view.status = Some(e);
                    }
                }
            }
            Pacer::Server {
                client,
                tx,
                rx,
                in_flight,
                consecutive_errors,
            } => {
                // 先收结果。回来了才让蛇走 —— 节奏就是 API 的往返时间。
                if let Ok(result) = rx.try_recv() {
                    *in_flight = false;
                    self.view.thinking = false;
                    match result {
                        Ok(m) => {
                            *consecutive_errors = 0;
                            self.view.status = None;
                            self.view.stats.record(m.latency_ms);
                            self.view.stats.input_tokens += m.input_tokens.unwrap_or(0);
                            self.view.stats.output_tokens += m.output_tokens.unwrap_or(0);
                            self.apply(m);
                        }
                        Err(e) => {
                            self.view.stats.errors += 1;
                            self.view.status = Some(e.lines().next().unwrap_or("未知错误").to_string());
                            *consecutive_errors += 1;
                            if *consecutive_errors >= MAX_CONSECUTIVE_ERRORS {
                                self.finish(GameOver::TicksExhausted {
                                    tick: self.game.tick,
                                    score: self.game.score,
                                });
                            }
                        }
                    }
                    return;
                }

                if *in_flight {
                    self.view.thinking = true;
                    return;
                }

                // 还没在飞 —— 发起下一次。这个线程只借用 client 的副本。
                let legal = self.game.legal_directions();
                if legal.is_empty() {
                    self.finish(GameOver::DeadEnd {
                        tick: self.game.tick,
                        score: self.game.score,
                    });
                    return;
                }
                let state = self.game.snapshot();
                let client = client.clone();
                let tx = tx.clone();
                *in_flight = true;
                self.view.thinking = true;
                std::thread::spawn(move || {
                    let result = provider::jev_decide(&client, &state, &legal);
                    let _ = tx.send(result);
                });
            }
        }
        self.sync_view();
    }

    /// 收到一个方向：记流水、让引擎走一步。
    fn apply(&mut self, m: Move) {
        let log = DecisionLog {
            tick: self.game.tick,
            score: self.game.score,
            direction: m.direction,
            confidence: m.confidence,
            probabilities: m.probabilities,
            latency_ms: m.latency_ms,
        };
        self.view.push_decision(log);

        // 引擎只接受 Direction —— 和 run / bench 里一模一样的那道关。
        self.game.request_direction(m.direction);
        if self.game.tick() {
            self.finish(GameOver::Died {
                tick: self.game.tick,
                score: self.game.score,
            });
            return;
        }
        if let Some(limit) = self.tick_limit {
            if self.game.tick >= limit {
                self.finish(GameOver::TicksExhausted {
                    tick: self.game.tick,
                    score: self.game.score,
                });
            }
        }
    }

    fn finish(&mut self, why: GameOver) {
        self.view.game_over = Some(match why {
            GameOver::Died { tick, .. } => format!("第 {tick} 步撞死，得分 {}", self.game.score),
            GameOver::DeadEnd { tick, .. } => format!("第 {tick} 步走投无路"),
            GameOver::TicksExhausted { .. } => "跑够步数了".to_string(),
        });
    }

    /// 把引擎的当前状态刷到界面上。界面不反过来读引擎，只被喂。
    fn sync_view(&mut self) {
        let s = self.game.snapshot();
        self.view.snake = s.snake;
        self.view.food = s.food;
        self.view.tick = s.tick;
        self.view.score = s.score;
        self.view.pacing = self.pacer.pacing();
    }

    pub fn source_name(&self) -> &str {
        &self.source_name
    }
}

/// 终端状态守卫。**无论正常退出、返回错误还是 panic，Drop 都会还原终端** ——
/// 没有这一层，一次 panic 就会把用户留在 raw mode 的残废终端里。
struct TuiGuard;

impl TuiGuard {
    fn enter() -> io::Result<TuiGuard> {
        enable_raw_mode()?;
        let mut stdout = io::stdout();
        execute!(stdout, EnterAlternateScreen)?;
        Ok(TuiGuard)
    }
}

impl Drop for TuiGuard {
    fn drop(&mut self) {
        let _ = disable_raw_mode();
        let _ = execute!(io::stdout(), LeaveAlternateScreen);
    }
}

/// 进 TUI。**守卫和 terminal 一起返回** —— 调用方让守卫活到自己结束，
/// 终端就一定会被还原；中间任何一步失败，守卫也会立刻析构还原。
fn enter_tui() -> io::Result<(TuiGuard, Terminal<CrosstermBackend<Stdout>>)> {
    let guard = TuiGuard::enter()?;
    let mut terminal = Terminal::new(CrosstermBackend::new(io::stdout()))?;
    terminal.clear()?;
    Ok((guard, terminal))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::BoardState;

    fn fixed_app(source: &str, seed: u64) -> App {
        App::new(
            &PlayConfig {
                source: source.to_string(),
                seed,
                width: 24,
                height: 12,
                tps: 1000.0, // 测试里要它尽快走
            },
            None,
        )
        .expect("App 应该建得起来")
    }

    /// 喂一串严格递增的时间戳。真实循环里时间是自己走的，
    /// 测试里得自己造 —— 否则同一个 now 连着调几次，只有第一次会推进。
    fn pump(app: &mut App, steps: u64) {
        let base = Instant::now() + Duration::from_secs(1);
        for i in 0..steps {
            app.advance(base + Duration::from_millis(i * 10));
        }
    }

    #[test]
    fn the_loop_applies_decisions_and_grows_the_tick_counter() {
        let mut app = fixed_app("greedy", 42);
        pump(&mut app, 1);
        assert_eq!(app.view.tick, 1, "走一步，tick 就该 +1");
        assert_eq!(app.view.history.len(), 1);
        assert!(app.view.history.back().unwrap().direction.key().len() > 0);
    }

    #[test]
    fn the_engine_is_still_the_only_place_that_validates_a_direction() {
        // 故意塞一个非法方向进去（出生朝右，却让它掉头）：
        // 引擎必须无视它，而不是崩掉。
        let mut app = fixed_app("greedy", 1);
        assert_eq!(app.game.direction(), crate::game::Direction::Right, "出生朝右");
        app.apply(Move {
            direction: crate::game::Direction::Left,
            latency_ms: 1.0,
            confidence: None,
            input_tokens: None,
            output_tokens: None,
            probabilities: Vec::new(),
        });
        assert_eq!(
            app.game.direction(),
            crate::game::Direction::Right,
            "180 度掉头必须被引擎挡掉"
        );
        assert_eq!(app.view.game_over, None, "非法方向不该导致结束");
    }

    #[test]
    fn walking_into_a_wall_ends_the_run_and_says_where() {
        // 出生在 x=6 朝右，24 宽的棋盘 —— 第 18 步必然撞右墙。
        // 直接喂方向，把「引擎说结束 -> 界面上写出为什么」这一段钉死。
        let mut app = fixed_app("greedy", 42);
        for _ in 0..18 {
            app.apply(Move {
                direction: crate::game::Direction::Right,
                latency_ms: 1.0,
                confidence: None,
                input_tokens: None,
                output_tokens: None,
                probabilities: Vec::new(),
            });
        }
        let why = app.view.game_over.expect("第 18 步应该撞墙");
        assert!(why.contains("撞死"), "结束原因要写清楚怎么死的：{why}");
        assert!(why.contains("18"), "结束原因要写清楚是哪一步：{why}");
    }

    #[test]
    fn restart_resets_the_board_but_keeps_the_seed_unless_asked() {
        let mut app = fixed_app("greedy", 7);
        app.advance(Instant::now());
        assert_eq!(app.view.tick, 1);

        app.restart(false);
        assert_eq!(app.view.tick, 0, "同 seed 重开应该从头开始");
        assert_eq!(app.view.seed, 7, "没要求换 seed 就不该换");

        app.restart(true);
        assert_eq!(app.view.seed, 8, "按 n 才换 seed");
        assert_eq!(app.view.history.len(), 0, "重开要清空流水");
    }

    #[test]
    fn the_tick_limit_stops_a_headless_run() {
        let mut app = App::new(
            &PlayConfig {
                source: "greedy".to_string(),
                seed: 3,
                width: 24,
                height: 12,
                tps: 1000.0,
            },
            Some(5),
        )
        .unwrap();
        pump(&mut app, 10);
        assert_eq!(app.view.tick, 5, "到上限就停");
        assert!(app.view.game_over.is_some());
    }

    #[test]
    fn model_pacing_cannot_be_sped_up_by_the_keyboard() {
        let mut app = App::new(
            &PlayConfig {
                source: "jev".to_string(),
                seed: 1,
                width: 24,
                height: 12,
                tps: 8.0,
            },
            None,
        )
        .unwrap();
        app.on_key(KeyEvent::new(
            KeyCode::Char('+'),
            crossterm::event::KeyModifiers::NONE,
        ));
        assert_eq!(app.view.pacing, Pacing::Server, "模型源的节奏不该被 +/- 改");
    }

    #[test]
    fn board_snapshot_is_what_the_view_shows() {
        let app = fixed_app("greedy", 42);
        let state = app.game.snapshot();
        assert_eq!(app.view.board, BoardState { width: 24, height: 12 });
        assert_eq!(app.view.food, state.food);
        assert_eq!(app.view.snake, state.snake);
    }
}
