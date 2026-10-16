---
tags: [review, elation, audit]
description: 2026-10-16 对 elation 的重新审视 —— 跑过的、坏的、砍掉的，逐条记账。
memo: 结论：那条实验的核心路径在当前地区从未跑通，而仓库里没有一个人写下这件事。
---

# 重新审视 elation

对象：`https://github.com/lunrenyi/elation`，HEAD = `b04c282`（v0.0.5）。
全部 9 个提交落在 2026-09-20 ~ 09-25 五天里，之后再没动过。

方法：把仓库完整克隆下来，`cargo build` + `cargo test` 全跑一遍，
然后用环境里已有的 `TYPESAFE_API_KEY` 打一次真实 API。

**下面每一条都是跑出来的，不是读出来的。跑不出来的部分明确写着「没跑」。**

---

## 一、跑出来的结果

### 1. 编译通过。全新 clone 上 `cargo test` **直接失败**

```
test install_algorithm_provider_drives_real_bot ... FAILED
compile failed: BotCompileError("cannot find libelation_bot_sdk-*.rlib under
target/debug/deps — run `cargo build -p elation-bot-sdk` first")
```

`tests/algorithm_install.rs` 需要 bot-sdk 的 rlib，而 workspace 默认构建
不产出它。README 只在「开发备忘」提了一句「bot-sdk 必须先 build」。
补上 `cargo build -p elation-bot-sdk` 之后，62 个单测 + 各集成测试全绿。

不是致命问题，但意味着**克隆下来第一件事就是红的**，而这条实验的价值
恰好在它跑不跑得起来上。

### 2. 真实 API 从当前地区调不通（HTTP 451）

```
POST https://api.typesafe.ai/v1/systemone
→ 451 {"title":"Typesafe is not available in your region.","status":451}
```

这不是 key 的问题（401 才是），也不是代码的问题 —— 请求发出去了，
服务端明确拒绝，body 里写着地区。

**推论：elation 标榜的 AI MODEL 模式，从当前网络环境出发从来没有跑通过。**

为什么没人发现：`tests/jev_real_api.rs` 在没有 `TYPESAFE_API_KEY` 时
直接 `return`，测试通过；有 key 但被地区挡时，测试是**红的**——
但显然没人跑过带 key 的那一遍。两种情况都不是「验证过」。

（本项目的 `tests/end_to_end.rs::the_regional_block_is_reported_as_a_block_not_a_crash`
把 451 固化成了一个用例，以后不会再有人把它当成新问题。）

### 3. 那个「snake 一直向右走」的 bug 是结构性的，不是 bug

elation 的 `tests/loop_repro.rs` 开头写着
"Reproduce the \"snake just goes right forever\" bug"。
原因在 `src/app.rs::on_tick`：

```rust
Some(DecisionOutcome::Decision(dir)) => { self.game.request_direction(dir); self.game.tick(); }
Some(DecisionOutcome::Keep) => { /* 蛇站着不动 */ }
```

AI MODEL 模式下，引擎**只在决策到手的那一 tick 才走一格**。
所以蛇的速度 = 1 /（模型往返时间）。网络慢的时候，它就在原地漂；
网络断了的时候，它靠 `DecisionOutcome::Error` 分支继续用旧方向漂——
于是看起来就是「一直向右」。

这不是可以修的 bug，是**用 LLM 当逐帧决策器**这件事本身的成本。
README 里「可调速度 0.5× ~ 4×」那套 UI 控件，对模型源是不生效的，
但界面上看不出这一点。

---

## 二、代码层面的三个问题

### 4. 「什么方向合法」有两份实现

- `SnakeGame::tick`（`src/game.rs`）：出界 + 自撞 + 180° 掉头。
- `ModelProvider::plan`（`src/decision/model.rs`）：再加一条
  「这一步会不会吃到食物」来决定尾巴算不算障碍。

两处逻辑必须永远一致，否则就会出现「模型被要求选一个会自杀的方向」。
靠人肉维持这个不变量，是典型的铁墓。

**处理**：合并成 `SnakeGame::legal_directions()` 一份。发给模型的 choice、
模型返回的方向、引擎接受的，物理上不可能对不上。

### 5. `MockTypeSafeClient` 证明不了协议是对的

`src/model/typesafe.rs` 里的 mock 只是按顺序吐出预设响应，
**它不校验请求、不看 criteria、不看 state**。所以所有基于它的测试证明的是
"我 mock 的东西能被我自己的 parser 解析"，而不是"真实 API 会返回这样的东西"。

真正验证过协议形状的只有两个 fixture，而 fixture 是手写的。

**处理**：把 mock 从「客户端里的假数据」改成「真的本地 HTTP 服务」
（`src/mock.rs`）。服务端会读请求、会按你给的 criteria 回答案，
还会把收到的请求体存下来供断言。这才让「我们到底发了什么」可被检查。

### 6. OpenAI 兼容层是历史包袱，且会误导下一个人

`TypeSafeClient::complete()` 实现了 `ModelClient` 的 OpenAI 风格签名
（`Vec<ChatMessage>` → `ChatResponse`），但内部调用的是 `system_one`，
再把结构化答案 `pretty_print()` 成一段人类可读文本塞回 `ChatResponse`
里给「下游消费者」看。

`/v1/systemone` 根本不吃 chat 消息。这层存在的唯一理由是
`ModelProvider` 早先是通过 `complete()` 调的。留着它，下一个人会以为
换成一个 OpenAI 兼容端点就能用。

**处理**：删掉。`JevClient::decide()` 直接收发结构化类型。

### 附：一处小问题

`src/decision/model.rs` 有个 `#[doc(hidden)] pub fn force_last_for_test(&mut self, ...)`，
直接改生产状态给 UI 快照测试用。这类钩子会让「测试通过」和「代码正确」
之间的等号变得可疑。这里没有测试需要它，删了。

---

## 三、规模：实验是 15%，界面是 48%

| 区块 | 行数 | 占 Rust 代码 |
|---|---|---|
| `src/ui/` + `src/theme/` + `lang.rs` + `config.rs` | 7,430 | 48% |
| `tests/` | 2,712 | 18% |
| **实验本体**（`game` + `model` + `decision`） | **2,266** | **15%** |
| `bot-sdk` + `bots/` + `sandbox/` | 1,772 | 12% |
| `app.rs` + `main.rs` + `build.rs` | 1,095 | 7% |
| **合计** | **15,364** | |

另外还有：1.6 MB 的 `image/logo.png`、1,313 行的 `Cargo.lock`、
933 行的 `README.md` + `MANUAL.md`。

最说明问题的一个数字：`src/ui/path_pixel_logos.rs` 单文件 925 行，
用来把 12 个星神 logo 画成终端像素图。这条实验一个字都没提到它们。

---

## 四、砍了什么，逐条记账

| 砍掉的 | 理由 | 还能找回吗 |
|---|---|---|
| `src/ui/` 全部（7 个文件） | 为了看；实验要的是量 —— **这条后来推翻了，见四之二** | 原仓库 |
| `src/theme/` 全部（16 个文件，12 套主题） | 同上 | 原仓库 |
| `src/lang.rs` 中英双语文案 | 没有界面就没有文案 | 原仓库 |
| `src/config.rs` 持久化配置 | UI 的持久化 | 原仓库 |
| `bot-sdk/` + `bots/`（3 个 bot） | 子进程 bot 协议是另一条实验 | 原仓库 |
| `src/sandbox/`（编译 + 沙箱 + 超时） | 同上；且 README 自己承认没有 OS 级网络隔离 | 原仓库 |
| `image/logo.png` | 1.6 MB，实验用不上 | 原仓库 |
| `MANUAL.md`（612 行玩家手册） | 讲的是界面怎么用 | 原仓库 |
| phantom 的 AGGRESSIVE / CAUTIOUS 人格 | 玩法，不是这个实验要回答的问题 | 原仓库 |
| `poll()` / `Keep` / 后台线程状态机 | 服务 UI 响应；测量台宁可阻塞 —— **这条后来推翻了，见四之二** | 原仓库 |
| OpenAI 兼容层 | 见上文问题 6 | — |
| `rand` 依赖 | 自己写 15 行确定性 PRNG，seed 契约可读可测 | — |
| UI 里的 0.5×~4× 调速档位 | 对模型源不生效，见上文问题 3 | 原仓库 |

### 保留下来的

| 保留的 | 从哪来 | 改动 |
|---|---|---|
| `GameState` / `Direction` / `Point` 线格式 | `src/game/state.rs` | 字段一个没少，测试逐个点名检查 |
| 引擎的碰撞 / 生长 / 计分 | `src/game.rs` | 删 `best` / `length` / 暂停分支 |
| 合法方向判定 | `src/decision/model.rs::plan` | 提为 `SnakeGame::legal_directions()` |
| `/v1/systemone` 请求与响应结构 | `src/model/typesafe.rs` | 删 Chat 兼容层和 mock client |
| HTTP / HTTPS 传输 | `src/model/typesafe.rs` | 抽出 connect / head / 读响应三份公共部分，去掉重复 |
| 洪水填充安全启发式 | `bots/phantom_bot.rs`（BALANCED） | 只留一档策略 |
| 官方 quickstart 响应 fixture | `tests/fixtures/` | 内联成测试常量 |

---

## 四之二、后来加回来的：界面

**上面那张表里「砍掉界面」这一条，后来被推翻了。**

第一轮我砍掉全部 UI 的理由是：这条实验要回答的是量，不是看；
7,430 行界面换不来一个结论。砍完之后 `jev-snake` 是 2,480 行、
能跑分、能跑测试，就是不能看。

然后我被要求保留可视化界面。回头看，**第一轮的理由对了一半**：

对的那一半：主题、像素 logo、中英双语、12 套调色板，和这条实验
没有关系，砍掉是对的，到现在也没加回来。

错的那一半：**「看」不是「装饰」。** 一条关于 LLM 决策的实验，
最该被看见的东西恰恰是「模型每一步选了什么、有多确定、代价多少」。
而这个恰恰是界面最擅长表达的 —— 概率分布用一条横条比一列 JSON
直观得多，延迟从 p50/p95 两个数字变成一行行滚动的流水。
把可观测性当成装饰砍掉，是把手段当成了目的。

所以加回来的不是 elation 的界面，是**围绕这条实验重画的一个**：

| | elation 的 UI | 加回来的 UI |
|---|---|---|
| 行数 | 7,430（含 12 主题 / 像素 logo / 双语） | 819（另加 339 行界面测试） |
| 画什么 | 棋盘 + 12 套主题 + logo + 中英切换 | 棋盘 + 方向 + 置信度 + 概率条 + 延迟 + 流水 |
| 节奏真相 | 调速档位对模型源是假的，界面上看不出来 | 右上角一直写着「服务端节奏 · 每格 = 一次往返」 |
| 能不能测 | `render_smoke.rs` 测主题配色 | 渲染成缓冲区，逐格断言信息在不在 |
| 依赖 | ratatui + crossterm + unicode-width + rand + toml + ... | ratatui + crossterm + unicode-width |

### 一个被推翻了的技术决定

第一轮我把 elation 的 `poll()` 状态机（后台线程 + `Keep` / `InFlight`）
一起砍了，理由是「测量台宁可阻塞，让延迟摊在墙钟上」。这条理由本身没错。

但有了界面之后它必须回来 —— 不是原样搬，而是以另一个理由：
**如果决策在主线程上阻塞，屏幕会在每次网络往返期间冻住。**
而「往返有多长」正是这条实验最该被看见的现象，把要观察的东西
藏进一次卡顿里，是最糟糕的失败方式。

实测（本地 mock，每次回复延迟 400ms）：

```
请求发出 → 界面立刻显示「等待模型…」→ 402ms 后决策到达 → 蛇走一格
请求发出 → 界面立刻显示「等待模型…」→ 401ms 后决策到达 → 蛇走一格
```

12 步跑完，token 计数精确地每步 +128 / +8，p50 405ms。
**一格 = 一次往返**，屏幕上看得见。

### 加界面时顺手挖出来的两个真 bug

1. **窄棋盘上蛇会生在屏幕外。** 出生点算的是 `width / 4 - 2`，
   棋盘宽度小于 8 时这个数是负的。第一轮没发现，因为默认棋盘是 24。
   现在 `cx = (width / 4).max(2)`，并且有一条测试遍历 4..12 的宽高组合
   逐格检查蛇身和食物都在界内。

2. **ratatui 的宽字符占位会撕裂文本。** 中文在终端里占两列，
   ratatui 会在后面放一个占位格。测试里按格拼字符串时，
   「得分」会变成「得 分」—— 断言全部失真，界面看起来「什么都没渲染」。
   修法是按字符显示宽度跳格（所以引入了 `unicode-width`）。
   这个 bug 只在写界面测试时才会撞上，而且症状极具误导性。

### 一条记给下一个人看的

「砍掉界面」这个决定，在写下它的当天是自洽的：当时要的是结论，
不是演示。**错的是把它当成了终局判断，而不是一个阶段性的取舍。**
实验做到某个阶段，工具就该跟着阶段变 —— 加回来的时候记清楚为什么加，
比假装一开始就planned 好。

---

## 五、这个项目没有回答的问题

写下来是为了不让下一个人以为已经回答过了：

- **Jev 到底会不会玩贪吃蛇？** 不知道。连不上。
- **它比随机走强多少？** 不知道。需要真数据。
- **`probabilities` 有没有信息量？** 不知道。拿到的每一个数
  都是 mock 自己编的。
- **一次请求问 N 步行不行？** 没试。协议支持，但没测过模型给
  5 步预测时的准确率衰减。
- **12 套主题 / 像素 logo / 双语界面投入的工时值不值？**
  这不是技术问题，是优先级问题。答案是「对这条实验不值」，
  但当时它们看起来像是让实验更完整的东西 —— 这本身值得记一笔。
