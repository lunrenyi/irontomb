//! jev-snake —— Jev 通过 TypeSafe `/v1/systemone` 驱动贪吃蛇。
//!
//! 四个模块，各自只有一个职责：
//!
//! - [`game`] 引擎。只认识 `Direction`，不认识决策者。
//! - [`jev`] 协议。把 `GameState` 发出去，把答案读回来。
//! - [`provider`] 三个决策源（常量 / 洪水填充算法 / Jev），同一个接口。
//! - [`mock`] 本地假 TypeSafe，让上面那条协议路径不靠 key 也能验。
//! - [`ui`] 界面。纯函数 `render(frame, state)`，可以在没有终端的情况下测。
//! - [`app`] 事件循环：把引擎、决策源和界面接在一起。

pub mod game;
pub mod app;
pub mod jev;
pub mod mock;
pub mod provider;
pub mod ui;
