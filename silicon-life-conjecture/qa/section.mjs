import WebSocket from 'ws'
import { writeFileSync } from 'node:fs'
const targets = await (await fetch('http://localhost:9333/json/list')).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false })
let id = 0
const pending = new Map()
const send = (m, p = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
ws.on('message', (raw) => { const msg = JSON.parse(String(raw)); if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.rej(new Error(JSON.stringify(msg.error))) : p.res(msg.result) } })
await new Promise((r) => ws.on('open', r))
await send('Page.enable')
const [url, width, height, outDir, prefix, width2] = process.argv.slice(2)
await send('Emulation.setDeviceMetricsOverride', { width: Number(width), height: Number(height), deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url })
await new Promise((r) => setTimeout(r, 4000))
for (const id2 of ['film', 'bits', 'life', 'neural', 'computer', 'mind', 'silicon', 'closing']) {
  await send('Runtime.evaluate', { expression: 'document.getElementById("' + id2 + '").scrollIntoView({block:"start"})' })
  await new Promise((r) => setTimeout(r, 1100))
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(outDir + '/' + prefix + '-' + id2 + '.png', Buffer.from(data, 'base64'))
  console.log('saved ' + prefix + '-' + id2)
}
ws.close()
