<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

## 跑 QA / 渲染时的硬性纪律：浏览器进程只允许有一个

这个仓库的浏览器 QA 依赖一个常驻的 `chrome-headless-shell`（CDP，默认端口 9333）。
**踩过的坑**：反复「再开一个」，几小时内堆出 21 个 chrome-headless-shell 进程，
CPU 常驻、机器发烫。Remotion 每次 still / render 也会自己再拉一个浏览器，
所以「先截 12 张图」这种写法会短时间拉起一堆。

规则（不是建议，是硬规矩）：

1. **不要直接敲 chrome-headless-shell 命令行。** 一律走
   `one-rule-infinite/scripts/browser-guard.sh`：
   - `ensure` —— 已有实例就复用，没有才起一个，**幂等**；
   - `stop` —— 一轮 QA 结束必须调用，否则进程会留在后台空烧；
   - `status` —— 只看不改。
2. **所有 QA 脚本共用 ensure 起的这同一个浏览器**，不要让每个脚本各开各的。
3. **Remotion 渲染完成后确认没有残留**：status 应该回到
   `headless browsers alive = 0`（或 1，若你打算继续用）。
4. **只 kill 本项目的 headless shell**：脚本里的模式串是
   `chrome-headless-shell-mac-arm64/chrome-headless-shell`，路径取自本项目
   `node_modules/.remotion/`。**绝不要碰** `euler-identity/` 的浏览器，
   更不要用会误伤用户自己 Chrome 与 VS Code 的宽泛 pkill 写法。
5. **批量取帧不要循环调 remotion still**：先 render 出成片，再用 ffmpeg
   按帧号抽帧，比逐张 still 快一个数量级，也不重复起浏览器。

参考实现：`one-rule-infinite/scripts/browser-guard.sh`（`count_browsers()` 只数
浏览器根进程，不把 helper 子进程算进来，避免误判成「堆了一堆」）。
