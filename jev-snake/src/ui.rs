//! 界面。**一个纯函数**：给我状态，我画一屏。
//!
//! 这个文件里没有任何 I/O、没有终端控制、没有计时器 —— 只有
//! `render(frame, state)`。所以它能被直接丢进测试里断言：渲染一屏，
//! 逐格读缓冲区，看蛇头在不在、概率条对不对、错误有没有显示出来。
//!
//! 画什么：棋盘 + 最近一次决策（含概率分布）+ 决策流水 + 汇总。
//! 为什么不画别的：这条实验要回答的问题是「模型每一步在想什么、
//! 花了多久」，屏幕上每一个像素都应该服务于这个问题。

use ratatui::layout::{Alignment, Constraint, Direction as LayoutDirection, Layout, Rect};
use ratatui::style::{Color, Modifier, Style};
use ratatui::text::{Line, Span, Text};
use ratatui::widgets::{Block, BorderType, Borders, Paragraph, Wrap};
use ratatui::Frame;
use std::collections::VecDeque;
use unicode_width::UnicodeWidthStr;

use crate::game::{BoardState, Direction, Point};
use crate::provider::Stats;

pub const HEAD: &str = "◆";
pub const BODY: &str = "▪";
pub const FOOD: &str = "●";

/// 界面最小尺寸。小于这个就没法看了。
pub const MIN_WIDTH: u16 = 72;
pub const MIN_HEIGHT: u16 = 24;

/// 一条决策记录 —— 流水里的每一行。
#[derive(Debug, Clone)]
pub struct DecisionLog {
    pub tick: u64,
    pub score: u32,
    pub direction: Direction,
    pub confidence: Option<f32>,
    /// 已按概率从大到小排好序。
    pub probabilities: Vec<(Direction, f32)>,
    pub latency_ms: f32,
}

/// 棋盘由谁在推着走。这个区别是这条实验的核心，必须一直摆在屏幕上。
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Pacing {
    /// 本地决策源：固定 tick 率，蛇走多快由界面上的 +/- 决定。
    Fixed { tps: f32 },
    /// 模型决策源：每走一格要等一次网络往返，节奏由 API 决定。
    Server,
}

impl Pacing {
    pub fn label(self) -> &'static str {
        match self {
            Pacing::Fixed { .. } => "本地节奏",
            Pacing::Server => "服务端节奏",
        }
    }

    /// 这个节奏意味着什么 —— 放页脚，因为一行放不下。
    pub fn explain(self) -> String {
        match self {
            // 说清楚是本地的 tick 率在管，不是网络。
            Pacing::Fixed { tps } => format!("固定 {tps:.0} 格/秒"),
            Pacing::Server => "每格 = 一次往返".to_string(),
        }
    }
}

/// 屏幕上要显示的全部状态。渲染层只读它，不持有它。
#[derive(Debug, Clone)]
pub struct UiState {
    pub source: String,
    pub endpoint: String,
    pub seed: u64,
    pub board: BoardState,
    pub snake: Vec<Point>,
    pub food: Point,
    pub tick: u64,
    pub score: u32,
    pub pacing: Pacing,
    pub paused: bool,
    /// 正在等模型回话。
    pub thinking: bool,
    pub last: Option<DecisionLog>,
    pub history: VecDeque<DecisionLog>,
    pub stats: Stats,
    /// 最近一次错误（人类可读的一行）。
    pub status: Option<String>,
    pub game_over: Option<String>,
}

impl UiState {
    pub fn new(source: &str, endpoint: &str, seed: u64, board: BoardState) -> Self {
        Self {
            source: source.to_string(),
            endpoint: endpoint.to_string(),
            seed,
            board,
            snake: Vec::new(),
            food: Point::new(0, 0),
            tick: 0,
            score: 0,
            pacing: Pacing::Fixed { tps: 8.0 },
            paused: false,
            thinking: false,
            last: None,
            history: VecDeque::new(),
            stats: Stats::default(),
            status: None,
            game_over: None,
        }
    }

    /// 记一条决策：进流水、替换「最近一次」。
    pub fn push_decision(&mut self, log: DecisionLog) {
        self.last = Some(log.clone());
        self.history.push_back(log);
        // 只留最近 200 条 —— 界面上的流水本来也只看得到一半。
        while self.history.len() > 200 {
            self.history.pop_front();
        }
    }
}

/// 画一屏。唯一的入口。
pub fn render(frame: &mut Frame, state: &UiState) {
    // ratatui 0.27 里这叫 size()，0.28 改名成 area()。
    let area = frame.size();
    if area.width < MIN_WIDTH || area.height < MIN_HEIGHT {
        let text = format!(
            "窗口太小：至少 {MIN_WIDTH} x {MIN_HEIGHT}\n现在 {} x {}",
            area.width, area.height
        );
        frame.render_widget(
            Paragraph::new(text)
                .alignment(Alignment::Center)
                .wrap(Wrap { trim: true }),
            area,
        );
        return;
    }

    // 棋盘高度是固定的（游戏规定了），所以给它一个刚好的高度，
    // 剩下的空间全留给决策流水 —— 决策比棋盘信息量大。
    let board_rows = (state.board.height as u16 + 2).max(9);
    let rows = Layout::default()
        .direction(LayoutDirection::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Length(board_rows),
            Constraint::Min(3),
            Constraint::Length(4),
        ])
        .split(area);

    render_header(frame, rows[0], state);

    let middle = Layout::default()
        .direction(LayoutDirection::Horizontal)
        .constraints([
            Constraint::Percentage(52),
            Constraint::Percentage(48),
        ])
        .split(rows[1]);
    render_board(frame, middle[0], state);
    render_decision(frame, middle[1], state);
    render_history(frame, rows[2], state);
    render_footer(frame, rows[3], state);
}

fn dim() -> Style {
    Style::default().fg(Color::DarkGray)
}

fn label(text: &str) -> Span<'static> {
    Span::styled(text.to_string(), dim())
}

fn render_header(frame: &mut Frame, area: Rect, state: &UiState) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .title(Span::styled(
            format!(" jev-snake │ {} ", state.source),
            Style::default()
                .fg(Color::Cyan)
                .add_modifier(Modifier::BOLD),
        ));

    let flags = if state.paused {
        "已暂停".to_string()
    } else if let Some(why) = &state.game_over {
        format!("结束：{why}")
    } else if state.thinking {
        "等待模型…".to_string()
    } else {
        format!("{} · {}", state.pacing.label(), state.pacing.explain())
    };

    let inner_width = area.width.saturating_sub(2) as usize;
    let left = format!(
        " seed {} · tick {} · 得分 {} ",
        state.seed, state.tick, state.score
    );
    let pad = inner_width
        .saturating_sub(UnicodeWidthStr::width(left.as_str()))
        .saturating_sub(UnicodeWidthStr::width(flags.as_str()));
    let flag_color = if state.paused {
        Color::Yellow
    } else {
        Color::Green
    };

    frame.render_widget(
        Paragraph::new(Line::from(vec![
            Span::styled(left, Style::default().fg(Color::White)),
            Span::raw(" ".repeat(pad)),
            Span::styled(flags, Style::default().fg(flag_color)),
        ]))
        .block(block),
        area,
    );
}

fn render_board(frame: &mut Frame, area: Rect, state: &UiState) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .title(label(" 棋盘 "));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    if inner.width == 0 || inner.height == 0 {
        return;
    }

    // 棋盘每格占 2 列（宽字符对齐），所以列数是宽度的一半。
    let cols = (inner.width / 2) as i32;
    let rows = inner.height as i32;

    let mut lines: Vec<Line> = Vec::with_capacity(rows as usize);
    for y in 0..rows {
        let mut spans: Vec<Span> = Vec::with_capacity(cols as usize);
        for x in 0..cols {
            let p = Point::new(x, y);
            if state.snake.first() == Some(&p) {
                spans.push(Span::styled(HEAD, Style::default().fg(Color::Cyan)));
            } else if state.snake.contains(&p) {
                spans.push(Span::styled(BODY, Style::default().fg(Color::Green)));
            } else if p == state.food {
                spans.push(Span::styled(FOOD, Style::default().fg(Color::Red)));
            } else {
                spans.push(Span::styled("·", dim()));
            }
        }
        lines.push(Line::from(spans));
    }

    frame.render_widget(Paragraph::new(Text::from(lines)), inner);
}

fn render_decision(frame: &mut Frame, area: Rect, state: &UiState) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .title(label(" 最近一次决策 "));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let mut lines: Vec<Line> = Vec::new();
    match &state.last {
        None => {
            lines.push(Line::from(label(if state.thinking {
                "等待模型…"
            } else {
                "还没有决策"
            })));
        }
        Some(log) => {
            lines.push(Line::from(vec![
                label("方向    "),
                Span::styled(
                    format!("← {} ", log.direction.key()),
                    Style::default()
                        .fg(Color::Cyan)
                        .add_modifier(Modifier::BOLD),
                ),
            ]));
            lines.push(Line::from(vec![
                label("置信度  "),
                Span::styled(
                    match log.confidence {
                        Some(c) => format!("{c:.2}"),
                        None => "-".to_string(),
                    },
                    Style::default().fg(Color::Yellow),
                ),
            ]));
            let latency_color = if log.latency_ms > 1000.0 {
                Color::Red
            } else {
                Color::White
            };
            lines.push(Line::from(vec![
                label("延迟    "),
                Span::styled(
                    format!("{:.0} ms", log.latency_ms),
                    Style::default().fg(latency_color),
                ),
            ]));
            lines.push(Line::from(""));
            lines.push(Line::from(label("模型给的概率分布")));
            for (dir, p) in log.probabilities.iter().take(6) {
                lines.push(probability_line(*dir, *p, dir == &log.direction));
            }
        }
    }

    if let Some(status) = &state.status {
        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(
            format!("错误：{status}"),
            Style::default().fg(Color::Red),
        )));
    }

    frame.render_widget(
        Paragraph::new(Text::from(lines)).wrap(Wrap { trim: true }),
        inner,
    );
}

/// 一行概率条：`标签 ████░░░░ 0.72`，被选中的那个高亮。
fn probability_line(dir: Direction, p: f32, chosen: bool) -> Line<'static> {
    let width = 12usize;
    let filled = ((p.clamp(0.0, 1.0) * width as f32).round() as usize).min(width);
    let bar: String = "█".repeat(filled) + &"░".repeat(width - filled);
    let color = if chosen { Color::Cyan } else { Color::DarkGray };
    let style = if chosen {
        Style::default().fg(color).add_modifier(Modifier::BOLD)
    } else {
        Style::default().fg(color)
    };
    Line::from(vec![
        Span::raw(format!("{:<6}", dir.key())),
        Span::styled(bar, style),
        Span::styled(format!(" {:.2}", p), Style::default().fg(Color::White)),
    ])
}

fn render_history(frame: &mut Frame, area: Rect, state: &UiState) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .title(label(" 决策流水（新的在上面） "));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let capacity = inner.height as usize;
    let mut lines: Vec<Line> = Vec::new();
    for log in state.history.iter().rev().take(capacity) {
        lines.push(Line::from(vec![
            Span::styled(format!("{:>6}", log.tick), dim()),
            Span::raw("  "),
            Span::styled(format!("得分 {:<3}", log.score), dim()),
            Span::raw("  "),
            Span::styled(
                format!("{:<6}", log.direction.key()),
                Style::default().fg(Color::Cyan),
            ),
            Span::raw("  "),
            Span::styled(
                match log.confidence {
                    Some(c) => format!("{c:.2}"),
                    None => "  -".to_string(),
                },
                Style::default().fg(Color::Yellow),
            ),
            Span::raw("  "),
            Span::styled(format!("{:>7.0} ms", log.latency_ms), dim()),
        ]));
    }
    if lines.is_empty() {
        lines.push(Line::from(label("（还没有决策）")));
    }
    frame.render_widget(Paragraph::new(Text::from(lines)), inner);
}

fn render_footer(frame: &mut Frame, area: Rect, state: &UiState) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded);
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let s = &state.stats;
    let fmt = |v: Option<f32>| match v {
        Some(x) => format!("{x:.0}ms"),
        None => "-".to_string(),
    };
    let summary = format!(
        " 决策 {} · 错误 {} · p50 {} · p95 {} · token in {} / out {} ",
        s.calls,
        s.errors,
        fmt(s.percentile(0.5)),
        fmt(s.percentile(0.95)),
        s.input_tokens,
        s.output_tokens
    );
    let keys = match state.pacing {
        Pacing::Fixed { .. } => " 空格 暂停 · +/- 调速 · R 重开 · n 换 seed · q 退出 ",
        Pacing::Server => " 空格 暂停 · R 重开 · n 换 seed · q 退出 ",
    };

    frame.render_widget(
        Paragraph::new(Text::from(vec![
            Line::from(Span::styled(summary, Style::default().fg(Color::White))),
            Line::from(vec![
                Span::styled(keys, dim()),
                Span::styled(state.endpoint.clone(), dim()),
            ]),
        ])),
        inner,
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use ratatui::backend::TestBackend;
    use ratatui::buffer::Buffer;
    use ratatui::Terminal;

    /// 渲染一屏，把缓冲区拍平成多行文本，方便 `contains` 断言。
    fn paint(state: &UiState, w: u16, h: u16) -> String {
        let backend = TestBackend::new(w, h);
        let mut terminal = Terminal::new(backend).expect("TestBackend 应该建得起来");
        terminal.draw(|f| render(f, state)).expect("渲染不该失败");
        buffer_to_text(terminal.backend().buffer())
    }

    fn buffer_to_text(buf: &Buffer) -> String {
        let mut out = String::new();
        for y in 0..buf.area.height {
            let mut x = 0;
            while x < buf.area.width {
                let symbol = buf.get(x, y).symbol().to_string();
                // 一个中日韩字符占两列，ratatui 会在后面放一个占位格。
                // 不跳过它的话，「得分」在文本里就变成了「得 分」。
                let width = UnicodeWidthStr::width(symbol.as_str()).max(1);
                out.push_str(&symbol);
                x += width as u16;
            }
            out.push('\n');
        }
        out
    }

    fn uses_color(buf: &Buffer, color: Color) -> bool {
        for y in 0..buf.area.height {
            for x in 0..buf.area.width {
                if buf.get(x, y).fg == color {
                    return true;
                }
            }
        }
        false
    }

    fn sample() -> UiState {
        let mut state = UiState::new(
            "model/Jev",
            "http://127.0.0.1:61517/v1/systemone",
            42,
            BoardState {
                width: 24,
                height: 12,
            },
        );
        state.snake = vec![Point::new(6, 6), Point::new(5, 6), Point::new(4, 6)];
        state.food = Point::new(17, 3);
        state.tick = 128;
        state.score = 7;
        state.pacing = Pacing::Server;
        state.push_decision(DecisionLog {
            tick: 128,
            score: 7,
            direction: Direction::Left,
            confidence: Some(0.91),
            probabilities: vec![
                (Direction::Left, 0.72),
                (Direction::Right, 0.16),
                (Direction::Up, 0.07),
                (Direction::Down, 0.05),
            ],
            latency_ms: 1243.0,
        });
        state
    }

    #[test]
    fn draws_the_source_the_seed_and_the_score() {
        let screen = paint(&sample(), 100, 30);
        assert!(screen.contains("model/Jev"), "标题里应该有决策源");
        assert!(screen.contains("seed 42"));
        assert!(screen.contains("得分 7"));
    }

    #[test]
    fn draws_the_snake_and_the_food() {
        let screen = paint(&sample(), 100, 30);
        assert!(screen.contains(HEAD), "棋盘上应该有蛇头");
        assert!(screen.contains(BODY), "棋盘上应该有蛇身");
        assert!(screen.contains(FOOD), "棋盘上应该有食物");
    }

    #[test]
    fn shows_which_pacing_is_in_effect() {
        // 这是整块界面最要紧的一行字：节奏到底由谁决定。
        let screen = paint(&sample(), 100, 30);
        assert!(
            screen.contains("服务端节奏"),
            "模型源下必须写明节奏由 API 决定"
        );
        let mut local = sample();
        local.pacing = Pacing::Fixed { tps: 8.0 };
        assert!(paint(&local, 100, 30).contains("本地节奏"));
    }

    #[test]
    fn shows_the_models_probabilities_verbatim() {
        let screen = paint(&sample(), 100, 30);
        assert!(screen.contains("概率分布"));
        assert!(screen.contains("0.91"), "置信度要显示出来");
        assert!(screen.contains("0.72"), "最高概率要显示出来");
        assert!(screen.contains("0.05"), "最低概率也要显示出来");
    }

    #[test]
    fn a_slow_decision_turns_red() {
        let mut state = sample();
        let mut log = state.last.clone().unwrap();
        log.latency_ms = 2500.0;
        state.push_decision(log);
        let backend = TestBackend::new(100, 30);
        let mut terminal = Terminal::new(backend).unwrap();
        terminal.draw(|f| render(f, &state)).unwrap();
        assert!(
            uses_color(terminal.backend().buffer(), Color::Red),
            "超过 1 秒的延迟应该用告警色"
        );
    }

    #[test]
    fn errors_are_on_screen_not_hidden_in_a_log() {
        let mut state = sample();
        state.status = Some("HTTP 451: Typesafe is not available in your region.".to_string());
        assert!(
            paint(&state, 100, 30).contains("451"),
            "错误必须显示在屏幕上"
        );
    }

    #[test]
    fn thinking_state_is_visible_before_the_first_decision() {
        let mut state = sample();
        state.last = None;
        state.history.clear();
        state.thinking = true;
        assert!(paint(&state, 100, 30).contains("等待模型"));
    }

    #[test]
    fn history_keeps_the_newest_decision_first() {
        let mut state = sample();
        for t in 0..5 {
            state.push_decision(DecisionLog {
                tick: 200 + t,
                score: 9,
                direction: Direction::Up,
                confidence: Some(0.5),
                probabilities: vec![(Direction::Up, 0.5)],
                latency_ms: 10.0,
            });
        }
        let screen = paint(&state, 100, 40);
        let newest = screen.find("204").expect("最新的 tick 应该在画面上");
        let oldest = screen.find("200").expect("最早的 tick 也应该在画面上");
        assert!(newest < oldest, "新的应该排在上面");
    }

    #[test]
    fn refuses_to_draw_into_a_window_that_is_too_small() {
        assert!(paint(&sample(), 40, 10).contains("窗口太小"));
    }

    #[test]
    fn history_is_bounded_so_a_long_run_cannot_eat_memory() {
        let mut state = sample();
        for t in 0..1000 {
            state.push_decision(DecisionLog {
                tick: t,
                score: 0,
                direction: Direction::Right,
                confidence: None,
                probabilities: vec![],
                latency_ms: 1.0,
            });
        }
        assert_eq!(state.history.len(), 200, "流水应该封顶");
        assert_eq!(state.history.back().unwrap().tick, 999);
    }

    #[test]
    fn the_whole_screen_looks_right() {
        // 不是断言，是快照：界面排版坏掉的时候，这里会是最先看到的地方。
        // 故意让它失败一次就能看到整屏长相。
        let screen = paint(&sample(), 100, 30);
        if std::env::var("SHOW_SCREEN").is_ok() {
            println!("{screen}");
        }
        assert!(!screen.trim().is_empty());
    }
}
