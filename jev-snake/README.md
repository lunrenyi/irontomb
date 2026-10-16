---
tags: [experiment, jev, typesafe, snake, llm-decision]
description: Jev 通过 TypeSafe /v1/systemone 结构化决策 API 驱动贪吃蛇 —— 一条只留尺子不留屏幕的测量台。
memo: 一次决策 = 一次网络往返 = 游戏的时钟。这条实验真正的收获在这里。
---

# jev-snake

> 把贪吃蛇的「下一步往哪走」交给一个外部 LLM，然后量一量这件事到底成不成立。

这个目录是从 [elation](https://github.com/lunrenyi/elation)（2026-09-20 ~ 09-25）
里拆出来的**实验本体**：一个可玩的界面，加上一把能跑分的尺子。
elation 那边保留了完整的产品形态，这里只保留能被跑通和被推翻的部分。
重新审视的完整记录在 [`FINDINGS.md`](./FINDINGS.md)。

## 动机

Jev（TypeSafe）不是一个聊天模型，它把问题设计成「给一份状态 + 一组问题，
拿回结构化答案」。这看起来天生适合游戏：不用解析自然语言，
不用正则抠 JSON，直接给几个选项让它选，还能白拿概率和置信度。

elation 就是拿它试的。问题是**试完之后到底得到了什么结论** ——
而原仓库里没有这个结论，只有一个越来越大的界面。所以这里重建一遍，
只为了能回答那个问题。

## 这个实验实际由四个断言组成

1. **协议可用**：`GameState` 序列化成 JSON 塞进 `state`，用一个 `choice`
   问题约束住选项（只能从合法方向里选），拿回
   `{choice, confidence, probabilities}`。
2. **幻觉可挡**：模型返回了我们**没问过**的方向时，不能执行它。
3. **引擎真的不知道决策者是谁**：同一份 `GameState`、同一个出口，
   常量策略 / 算法策略 / 模型策略可以互换，A/B 是公平的。
4. **代价可量**：一步决策要多久、烧多少 token、因此蛇能走多快。

## 跑起来

```bash
cd jev-snake

cargo test                 # 47 个测试，不需要 key、不需要外网

# 0. 打开界面看（默认接 Jev；没 key 也能配本地 mock 看）
cargo run -- play --source greedy --tps 6
cargo run -- play --source jev

# 1. 不接任何东西，纯看协议长什么样
cargo run -- protocol --tick 12

# 2. 拿两个不需要网络的决策源当尺子
cargo run -- bench --source constant --seeds 3
cargo run -- bench --source greedy   --seeds 5

# 3. 端到端：本地起一个假 TypeSafe，让模型源跑完整整一局
cargo run -- mock --latency-ms 400         # 终端 A：记下它打印的地址
TYPESAFE_BASE_URL=http://127.0.0.1:PORT TYPESAFE_API_KEY=dummy \
  cargo run -- play --source jev                    # 终端 B：界面看
  # 或者不开界面，只要数字：
  TYPESAFE_BASE_URL=http://127.0.0.1:PORT TYPESAFE_API_KEY=dummy \
    cargo run -- run --source jev --ticks 20 --trace

# 4. 真实调用（需要 key，且需要能连到 api.typesafe.ai）
TYPESAFE_API_KEY=apikey_xxx cargo run -- run --source jev --ticks 20 --trace
```

`--json` 可以把所有汇总换成 JSON 输出。`bench --seeds N` 跑多个 seed，
回答的是「稳不稳」而不是「这一局多高」。

> `cargo test` 里的 8 条端到端用例会在 `127.0.0.1` 上起一个随机端口的
> mock 服务。它们**不连外网**，但需要能 bind 本地端口 ——
> 被沙箱或严格防火墙挡住时会看到 `PermissionDenied`，那是环境问题，不是代码问题。

## 界面长什么样

```
╭ jev-snake │ model/Jev ─────────────────────────────────────────────╮
│ seed 42 · tick 128 · 得分 7                        服务端节奏 · 每格 = 一次往返 │
╰──────────────────────────────────────────────────────────────────────╯
╭ 棋盘 ──────────────────────────╮╭ 最近一次决策 ──────────────────────╮
│·················●·······       ││方向    ← left                       │
│························       ││置信度  0.91                         │
│························       ││延迟    1243 ms                      │
│····▪▪◆··················       ││                                      │
│························       ││模型给的概率分布                      │
│························       ││left  █████████░░░ 0.72              │
│························       ││right ██░░░░░░░░░░ 0.16              │
│························       ││up    █░░░░░░░░░░░ 0.07              │
╰────────────────────────────────╯╰──────────────────────────────────────╯
╭ 决策流水（新的在上面） ──────────────────────────────────────────────╮
│   128  得分 7    left    0.91     1243 ms                            │
╰──────────────────────────────────────────────────────────────────────╯
╭──────────────────────────────────────────────────────────────────────╮
│ 决策 128 · 错误 0 · p50 1204ms · p95 1310ms · token in 16384 / out 1024 │
│ 空格 暂停 · R 重开 · n 换 seed · q 退出   https://api.typesafe.ai/...  │
╰──────────────────────────────────────────────────────────────────────╯
```

四个区块都在回答同一个问题：**模型每一步在想什么，代价是什么。**
所以界面上没有分数排行榜、没有连击特效 —— 只有方向、置信度、
概率分布、延迟，和一张流水表。

**请求在飞的时候界面不会冻住**，右上角写着「等待模型…」。这是刻意的：
往返时间恰恰是这条实验最该被看见的东西，如果屏幕在等待期间卡死，
就等于把要观察的现象藏起来了。

### 按键

| 键 | 作用 |
|---|---|
| `空格` | 暂停 / 继续 |
| `r` | 同 seed 重开（可复现） |
| `n` | 换个 seed 重开 |
| `+` / `-` | 调速，**只对本地决策源有效** |
| `q` / `Esc` / `Ctrl-C` | 退出 |

模型源下调速键被去掉了：那种情况下节奏由 API 决定，假装能加速
就是骗人。界面右上角一直写着当前是哪种节奏。

## 实测结果（2026-10-16，macOS，24×12 棋盘）

| 决策源 | 平均得分 | 每步延迟 p50 | token/步 | 一局耗时 |
|---|---|---|---|---|
| `constant`（能右就右） | 0.3 | 0 ms | 0 | < 1 ms |
| `greedy`（洪水填充 + 贪心） | 15.8 | 0 ms | 0 | ~5 ms |
| `jev`（真实 API） | **跑不起来** | — | — | — |

最后一行是这个实验目前最重要的结论：

```
POST https://api.typesafe.ai/v1/systemone
→ HTTP 451 {"title":"Typesafe is not available in your region.","status":451}
```

key 是好的（401 才是 key 的问题），被挡的是**地区**。
所以从当前网络环境出发，「让 Jev 玩贪吃蛇」这件事**从来没有跑通过**。
elation 的 `tests/jev_real_api.rs` 在这种情况下是红的，只是没人跑它。

换成能连通的地区之后，剩下的核心问题不是「能不能选对方向」，而是这个：

> **一次决策 = 一次网络往返 = 蛇的一步。**

模型往返要 300ms，蛇就只能每秒走 3 格；往返 2 秒，蛇每秒走 0.5 格。
elation 的引擎在 AI MODEL 模式下只等决策、不自己走（`App::on_tick` 里
只有 `DecisionOutcome::Decision` 才 `game.tick()`），所以**游戏速度完全由
API 决定**，跟 UI 里的「0.5× ~ 4× 调速」没关系 —— 那几个档位对模型源是假的。

这不是 bug，是「用 LLM 当决策器」这个结构的固有成本：
决策的分辨率被网络的分辨率锁死了。本项目把它量化出来：
`run --source jev --json` 里的 `decisions_per_sec` 就是蛇的理论最快速度。

## 代码地图

```
jev-snake/
├── src/
│   ├── game.rs       引擎。只认识 Direction，不认识决策者。
│   │                 legal_directions() 是「什么方向合法」的唯一定义。
│   ├── jev.rs        协议。GameState -> JSON -> POST /v1/systemone -> Decision。
│   ├── provider.rs   三个决策源（constant / greedy / jev），同一个 trait。
│   ├── mock.rs       本地假 TypeSafe：能回幻觉、451、垃圾。
│   ├── ui.rs          界面。一个纯函数 render(frame, state)，没有 I/O。
│   ├── app.rs        事件循环。模型决策丢后台线程，界面不冻。
│   └── main.rs       CLI：play / run / bench / protocol / mock
└── tests/end_to_end.rs  8 条端到端测试，每次 cargo test 都跑
```

依赖方向：`app` 依赖 `ui` / `provider` / `game` / `jev`，
`provider` 依赖 `game` 和 `jev`，`ui` 只依赖 `game` 的类型
（读状态、画格子，不认识引擎），`game` 谁都不依赖。

界面是**纯函数**，所以能在没有终端的情况下测：渲染一屏，逐格读缓冲区，
断言蛇头在不在、概率条对不对、451 有没有显示出来、排版有没有坏。
这套做法是从 elation 的 `tests/render_smoke.rs` 学的，但测的东西不一样
—— 那边测主题配色，这边测信息有没有被正确摆到屏幕上。

## 和 elation 的关系

| | elation | jev-snake |
|---|---|---|
| Rust 行数 | 15,364 | 3,765 |
| 界面 | ratatui，7,430 行 UI/主题/i18n | 有，819 行（另加 339 行界面测试），只画决策信息 |
| 决策源 | 人 / 模型 / 子进程 bot | 常量 / 算法 / 模型 |
| 不联网能不能验证核心路径 | **不能**（真实 API 测试要么跳过要么红） | **能**（本地 mock） |
| 协议错误怎么发现 | 靠 mock client，而 mock 不校验请求 | mock 是真服务端，会把请求存下来给你查 |

被丢掉的东西和丢掉的理由，逐条写在 [`FINDINGS.md`](./FINDINGS.md)。
原仓库仍然是完整的、可运行的，界面和沙箱 bot 那套东西没有丢：

```bash
git clone https://github.com/lunrenyi/elation.git
```

## 遗留问题

- **换个能连通的地区重跑 `run --source jev`。** 这是唯一还没做的一步，
  也是唯一能回答「Jev 到底会不会玩贪吃蛇」的实验。
- **延迟能不能压下来？** 值得试的三条路：一次请求问 N 步（把 lookahead
  打包进一次往返）、缓存相似局面、或者只让模型在**分叉点**决策
  （直道部分交给本地算法）。第三种最可能把「每秒 3 格」变成
  「每秒 8 格 + 每 5 步问一次模型」。
- **`confidence` 到底有没有用？** 现在它只被打印出来。
  一个可能的用法：低置信度时把控制权交回本地算法。
- **prompt 里 state 的排版。** 现在直接塞 compact JSON，没试过别的排版。
  结构化决策 API 对输入格式的敏感度，未测。

## 参考

- elation：`https://github.com/lunrenyi/elation`（原始实验，v0.0.1 ~ v0.0.5）
- TypeSafe systemone：`https://docs.typesafe.ai` —— **未核对**，
  本项目只按线上实际返回的响应形状写解析器。
