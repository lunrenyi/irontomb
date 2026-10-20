/**
 * 中文化自检：全站面向用户的英文必须为零。
 *
 * 扫描范围刻意覆盖到「代码搜索看不出来的」那些地方：
 *   页面正文、全站 SVG 里画出来的文字（影片、模块实验台、全景图）、
 *   title / aria-label / alt / placeholder 等面向用户的属性、
 *   <meta> 里的标题与描述，以及浏览器标签页标题。
 */
import WebSocket from 'ws'

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

await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: process.argv[2] })
await new Promise((r) => setTimeout(r, 4500))

const SCAN = `(() => {
  const attrs = [...document.querySelectorAll('[title], [aria-label], [alt], [placeholder]')]
    .map((n) => [n.getAttribute('title'), n.getAttribute('aria-label'), n.getAttribute('alt'), n.getAttribute('placeholder')].join(' '))
  // viewport 与 og:type 是给机器看的协议字段，不是给人看的内容，不计
  const MACHINE_ONLY = ['viewport', 'og:type', 'theme-color']
  const meta = [...document.querySelectorAll('meta[name], meta[property]')]
    .filter((n) => !MACHINE_ONLY.includes(n.getAttribute('name')) && !MACHINE_ONLY.includes(n.getAttribute('property')))
    .map((n) => n.getAttribute('content') || '')
  const svg = [...document.querySelectorAll('svg text, svg tspan, svg textPath')].map((n) => n.textContent || '')
  const blocks = [
    { name: '正文', s: document.body.innerText },
    { name: 'SVG', s: svg.join(' ') },
    { name: '属性', s: attrs.join(' ') },
    { name: '元信息', s: meta.join(' ') },
    { name: '标签页标题', s: document.title },
  ]
  const hits = []
  let total = 0
  for (const b of blocks) {
    total += b.s.length
    for (const m of b.s.matchAll(/[A-Za-z][A-Za-z .\\u00b7/&'-]{2,}/g)) {
      const hit = m[0].trim()
      if (/[A-Za-z]{3,}/.test(hit)) hits.push(b.name + '：' + hit)
    }
  }
  return { title: document.title, blocks: total, hits: [...new Set(hits)].slice(0, 25) }
})()`

const res = await send('Runtime.evaluate', { expression: SCAN, returnByValue: true, awaitPromise: true })
if (res.exceptionDetails) {
  process.stdout.write('扫描失败：' + JSON.stringify(res.exceptionDetails).slice(0, 500) + '\n')
  process.exit(1)
}

const scan = res.result.value
process.stdout.write('页面标题：' + scan.title + '\n')
process.stdout.write('扫描到的文本块：' + scan.blocks + '\n')
process.stdout.write('英文片段：' + (scan.hits.length ? scan.hits.join(' | ') : '（无）') + '\n')
process.stdout.write('\n中文化：' + (scan.hits.length ? 'FAIL' : 'PASS') + '\n')
ws.close()
process.exit(scan.hits.length ? 1 : 0)
