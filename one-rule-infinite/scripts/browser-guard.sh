#!/usr/bin/env bash
#
# 浏览器进程守门人。
#
# 为什么需要它：本仓库的 QA 依赖一个常驻的 headless Chrome（CDP，端口 9333）。
# 反复「再开一个」会在几小时内堆出二十多个 chrome-headless-shell 进程，把机器烤热。
# 所以这里把「最多一个」写进脚本，而不是靠记性：
#
#   scripts/browser-guard.sh ensure   # 已有实例就复用，没有才起一个（幂等）
#   scripts/browser-guard.sh stop     # 收工时关掉，避免留在后台空烧 CPU
#   scripts/browser-guard.sh status   # 只看现状，不做任何改动
#
# 纪律：
#   1. 起浏览器前先跑 ensure，不要直接敲 chrome-headless-shell 命令；
#   2. 一轮 QA 跑完必须跑 stop；
#   3. 不要让每个 QA 脚本各开各的浏览器 —— 全部复用 ensure 起的这一个；
#   4. 只 kill 本项目的 headless shell，绝不碰 euler-identity 的，也绝不碰用户自己的 Chrome。
#
set -uo pipefail

PORT="${QA_BROWSER_PORT:-9333}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# 只用本项目自己的浏览器
BIN="$ROOT/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell"
PATTERN='chrome-headless-shell-mac-arm64/chrome-headless-shell'

running() {
  curl -s --max-time 2 "http://localhost:$PORT/json/version" 2>/dev/null | grep -q '"Browser"'
}

# 只数「浏览器根进程」：一个浏览器会自己带几个 helper 子进程，
# 把 helper 也算进来会让人误以为堆了很多个。
count_browsers() {
  ps -eo pid,ppid,comm 2>/dev/null \
    | awk -v pat="$PATTERN" 'index($0, pat) { print $1, $2 }' \
    | awk '{ parent[$1] = $2 } END { n = 0; for (k in parent) { if (!(parent[k] in parent)) n++ } print n + 0 }'
}

case "${1:-status}" in
  ensure)
    if running; then
      echo "browser: already listening on $PORT, reusing it"
      exit 0
    fi
    stale=$(count_browsers)
    if [ "${stale:-0}" != "0" ]; then
      echo "browser: cleaning $stale stale headless browser(s) first"
      pkill -f "$PATTERN" >/dev/null 2>&1
      sleep 1
    fi
    if [ ! -x "$BIN" ]; then
      echo "browser: not installed yet, run 'npx remotion browser ensure' first" >&2
      exit 1
    fi
    echo "browser: starting a single instance on $PORT"
    nohup "$BIN" --headless --remote-debugging-port="$PORT" \
      --no-sandbox --disable-gpu --hide-scrollbars about:blank >/tmp/qa-browser.log 2>&1 &
    for _ in $(seq 1 40); do
      sleep 0.25
      if running; then
        echo "browser: ready on $PORT"
        exit 0
      fi
    done
    echo "browser: failed to start, see /tmp/qa-browser.log" >&2
    exit 1
    ;;
  stop)
    n=$(count_browsers)
    if [ "${n:-0}" != "0" ]; then
      pkill -f "$PATTERN" >/dev/null 2>&1
      echo "browser: stopped $n headless browser(s)"
    else
      echo "browser: nothing to stop"
    fi
    ;;
  status)
    if running; then
      echo "browser: running on $PORT"
    else
      echo "browser: not running"
    fi
    echo "browser: headless browsers alive = $(count_browsers)"
    ;;
  *)
    echo "usage: $0 {ensure|stop|status}" >&2
    exit 2
    ;;
esac
