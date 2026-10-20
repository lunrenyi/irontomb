// 用 browser-guard 起的那一个浏览器（端口 9333）做 QA，不新开浏览器
import WebSocket from 'ws'

const PORT = process.env.QA_BROWSER_PORT || 9333
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
const expression = process.argv[3]

await send('Page.navigate', { url })
await new Promise((r) => setTimeout(r, 4000))
const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
console.log(JSON.stringify(res.result.value, null, 2))
ws.close()
