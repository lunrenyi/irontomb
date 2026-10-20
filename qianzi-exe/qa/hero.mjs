// 首页开场的定时截图：开场是随时间演的一段动画，所以要按秒取
import WebSocket from 'ws'
import { writeFileSync } from 'node:fs'

const base = 'http://localhost:9333'
const targets = await (await fetch(base + '/json/list')).json()
let page = targets.find((t) => t.type === 'page')
if (!page) page = await (await fetch(base + '/json/new?about:blank')).json()

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
const outDir = process.argv[3] || 'qa/out'
const stops = (process.argv[4] || '1.5,4,6.5,9').split(',').map(Number)

await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url })
const t0 = Date.now()
for (const s of stops) {
  const wait = s * 1000 - (Date.now() - t0)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  const name = 'hero-t' + String(s).replace('.', '_') + '.png'
  writeFileSync(outDir + '/' + name, Buffer.from(data, 'base64'))
  process.stdout.write('saved ' + name + '\n')
}
ws.close()
