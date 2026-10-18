// 用 browser-guard 起的那一个浏览器（端口 9333）做 QA，不新开浏览器
import WebSocket from 'ws'
import { writeFileSync } from 'node:fs'

const PORT = process.env.QA_BROWSER_PORT || 9333
const base = 'http://localhost:9333'

const targets = await (await fetch(base + '/json/list')).json()
let page = targets.find((t) => t.type === 'page')
if (!page) {
  page = await (await fetch(base + '/json/new?about:blank')).json()
}

const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 })
let id = 0
const pending = new Map()
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const msgId = ++id
    pending.set(msgId, { resolve, reject })
    ws.send(JSON.stringify({ id: msgId, method, params }))
  })

ws.on('message', (raw) => {
  const msg = JSON.parse(String(raw))
  if (msg.id && pending.has(msg.id)) {
    const p = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) p.reject(new Error(JSON.stringify(msg.error)))
    else p.resolve(msg.result)
  }
})

await new Promise((resolve) => ws.on('open', resolve))
await send('Page.enable')
await send('Runtime.enable')

const url = process.argv[2]
const width = Number(process.argv[3] || 1440)
const height = Number(process.argv[4] || 900)
const outDir = process.argv[5] || 'qa/out'
const prefix = process.argv[6] || 'shot'
const mode = process.argv[7] || 'scroll'   // scroll | frame
const startFrame = Number(process.argv[8] || 0)

await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url })
await new Promise((r) => setTimeout(r, 3500))

const shoot = async (name) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(outDir + '/' + name + '.png', Buffer.from(data, 'base64'))
  process.stdout.write('saved ' + name + '.png\n')
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

if (mode === 'scroll') {
  const stops = process.argv.slice(9).map(Number)
  for (const y of stops) {
    await send('Runtime.evaluate', { expression: 'window.scrollTo(0,' + y + ')' })
    await wait(900)
    await shoot(prefix + '-y' + y)
  }
} else {
  // 影片模式：直接调用页面的 seek 总线把影片停在指定帧
  // 先空跑一次：页面刚导航完时 __slcSeek 可能还没挂上，否则第一张会丢
  await send('Runtime.evaluate', { expression: 'window.__slcPause && window.__slcPause(); window.__slcSeek && window.__slcSeek(0)' })
  await wait(900)
  const frames = process.argv.slice(9).map(Number)
  for (const f of frames) {
    await send('Runtime.evaluate', {
      expression:
        'window.__slcPause && window.__slcPause(); window.__slcSeek && window.__slcSeek(' + f + '); document.getElementById("film").scrollIntoView();',
    })
    await wait(700)
    await shoot(prefix + '-f' + String(f).padStart(4, '0'))
  }
}

ws.close()
