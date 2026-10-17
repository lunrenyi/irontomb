---
tags: [euler, math, visualization, react, remotion]
description: 动画优先的欧拉恒等式科普 —— 一部 100 秒的数学短片、一个可以亲手转的单位圆实验室，以及一条命令导出的 MP4。
memo: 影片与页面共用同一个纯函数：给它一个帧号，它就返回那一帧该有的画面。
---

# 欧拉恒等式：动画优先版

打开网站先看到的是**一部 100 秒的无声数学短片**，不是一篇加了动效的文章；
短片讲完，你还能自己上手拖动单位圆；同一套画面可以用一条命令导出成 MP4。

- **影片**：`src/story/`。六个场景、约 101.5 秒、1920×1080、30fps。
- **实验室**：`src/components/RotationLab.tsx`。拖点、滑块、播放/暂停、特殊角度、讲解重播。
- **视频导出**：Remotion Composition `EulerIdentity`，输出 `out/euler-identity.mp4`。

## 跑起来

```bash
npm install          # 已安装可跳过
npm run dev          # 网站：http://localhost:5173
npm test             # 23 个单测：数学计算 + TeX 字面量
npm run build        # 类型检查 + 生产构建 → dist/
```

## 导出 MP4

```bash
npm run export:mp4   # → out/euler-identity.mp4（H.264 / yuv420p / 1920×1080 / 30fps / 无音轨）
npm run film:preview # 打开 Remotion Studio，逐帧检查时间轴
npm run film:still   # 导出一张静帧做快速校对（默认第 1150 帧）
```

渲染需要一次本地浏览器：Remotion 会把 Chrome Headless Shell 下载到
`node_modules/.remotion/`。第一次执行会下载，之后离线可用。
若要指定浏览器：`npx remotion browser ensure`。

规格集中在 `src/story/timeline.ts`（FPS / 宽 / 高 / 各场景起止），改那里即可换分辨率或时长；
`remotion/Root.tsx` 直接读同一份配置，不存在第二套数字。

## 影片时间轴

| # | 场景 | 起点 | 内容 |
|---|---|---|---|
| 1 | 五个常数 | 0:00 | e / i / π / 1 / 0 各走各的路径进场，合成 `e^(iπ) + 1 = 0`，只留一句提问 |
| 2 | 复平面 | 0:08 | 数轴 → 虚轴长出 → 点乘 i 两次：1 → i → -1，`i² = -1` |
| 3 | 单位圆 | 0:22 | 圆被画出、向量起转、横纵投影实时读数，几何点亮 `e^(iθ) = cos θ + i sin θ` |
| 4 | 半圈 | 0:43 | 0 → π 走完半圈，投影同步变化，再一步步化简出 `e^(iπ) = -1` |
| 5 | 抵消 | 1:07 | 圆被压平成数轴，-1 与 +1 相向滑向原点，公式走到 `= 0`，再落回完整恒等式 |
| 6 | 收束 | 1:25 | 五个符号重新合体，一句话总结，画面留白 |

场景之间有 18 帧交叠做交叉溶解；整片没有任何随机数，
同一个帧号在任何机器上渲染出的画面都相同。

## 工程上的关键决定

- **一部影片，两个消费者。** `EulerFilm({ frame })` 是纯函数：只接收帧号，不读时钟、
  不读滚动、不用定时器。网站由 `FilmPlayer` 用 rAF 换算帧号喂给它，
  Remotion 由 `useCurrentFrame()` 喂给它 —— 两边看到的是同一部片子。
- **数学计算与渲染分离。** `src/lib/math.ts`（纯函数 + 单测）、`src/lib/format.ts`（数字怎么写）、
  `src/lib/tex.ts`（全站 TeX 字面量）。影片里所有图形都由同一个 `theta` 推导，
  点、向量、弧、投影、读数不可能不同步。
- **TeX 只有一个出处。** JSX 的字符串属性不处理转义，`tex='e^{i\\theta}'` 会把两个反斜杠
  原样交给 KaTeX，渲染成 “eitheta”。所以全站公式都从 `src/lib/tex.ts` 取，
  `tex.test.ts` 用 KaTeX 严格模式逐条验证，任何坏转义都会让测试变红。
- **实验室仍是一个数据源。** `src/state/rotationStore.ts` 用 `useSyncExternalStore` 订阅，
  同时导出一个 MotionValue 给 SVG 直接读，拖动时只有几何在动，不触发整棵树重渲染。
- **降级。** 跟随系统 `prefers-reduced-motion`：影片停在第一帧并提示可用进度条逐章查看；
  实验室与测验照常可用。所有文字信息在关掉动画后仍然完整。

## 数学上刻意保持的准确

- 欧拉公式 `e^(iθ) = cos θ + i sin θ` 与欧拉恒等式 `e^(iπ) + 1 = 0` 分开称呼（页脚有说明）。
- 单位圆坐标 x = cos θ、y = sin θ；SVG 的 y 轴向下，统一经 `toSvgPoint` 翻转。
- 读数用 `formatComponent`：理论上为零的地方显示 `0`，不会出现 `-0.000` 或 `0.000`。
- 「乘以 i 就是转 90°」在页面与影片里都当作直观模型，不冒充严格证明。

## 怎么打倒它

```bash
npm test                                  # 数学与 TeX 的单测
npm run typecheck                        # 只跑类型检查
npm run film:still -- --frame=2400       # 抵消那一场的静帧，改时间轴后先看它
npm run export:mp4 && ffprobe out/euler-identity.mp4   # 导出并核对规格
```

浏览器里：把点拖到 π 附近，投影、cos/sin、坐标、公式代入必须同时变；
开「减少动态效果」后逐屏翻，每一屏仍然读得懂结论；缩到 360px 宽，不允许出现横向滚动条。

## 遗留问题

- 手机竖屏下 16:9 的字幕偏小，页面已提示横屏或全屏观看；更好的做法是单独做一版竖屏 Composition
  （时间轴已经是共享的，只需再写一套排版）。
- 构建产物单包约 610 KB（gzip 约 190 KB），主要来自 motion 与 katex。
- 影片开场与收束用 HTML 字形排版（为了逐个编排入场），其余公式走 KaTeX，两套排版的字距略有差异。
