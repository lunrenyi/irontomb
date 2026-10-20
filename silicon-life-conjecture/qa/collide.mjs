// 排版自检：在真实渲染出来的 DOM 里量每一段文字的盒子，报出互相压在一起的组合。
// 复用 browser-guard 起的那一个浏览器，不新开。
//
//   node qa/collide.mjs <url> <frame...>
import WebSocket from 'ws'

const base = 'http://localhost:9333'
const url = process.argv[2]
const frames = process.argv.slice(3).map(Number)
// 每帧停多久再量。seek 是同步状态更新，getBoundingClientRect 会强制重排，
// 所以批量扫描用 100ms 就够；单帧细看时用默认的 260ms。
const SETTLE = Number(process.env.SLC_SETTLE || 260)

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
await new Promise((r) => ws.on('open', r))
await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url })
await new Promise((r) => setTimeout(r, 3500))

const PROBE = `(() => {
  const stage = Array.from(document.querySelectorAll('div')).find(
    (d) => d.style && d.style.width === '1920px' && d.style.height === '1080px'
  )
  if (!stage) return { error: 'stage not found' }
  const box = stage.getBoundingClientRect()
  const k = box.width / 1920
  const opacityOf = (el) => {
    let o = 1
    let n = el
    while (n && n !== document.body) {
      const s = getComputedStyle(n)
      if (s.display === 'none' || s.visibility === 'hidden') return 0
      o *= parseFloat(s.opacity)
      n = n.parentElement
    }
    return o
  }
  const out = []
  for (const el of stage.querySelectorAll('*')) {
    const tag = el.tagName.toLowerCase()
    const isSvgText = tag === 'text'
    const isHtmlText = /^(div|span|p|li|b|strong|em)$/.test(tag) && el.children.length === 0
    if (!isSvgText && !isHtmlText) continue
    const txt = (el.textContent || '').trim()
    if (!txt) continue
    if (opacityOf(el) < 0.25) continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    out.push({
      t: txt.length > 24 ? txt.slice(0, 24) + '...' : txt,
      x: Math.round((r.left - box.left) / k),
      y: Math.round((r.top - box.top) / k),
      w: Math.round(r.width / k),
      h: Math.round(r.height / k),
    })
  }
  return { scale: k, items: out }
})()`

const clock = (f) => Math.floor(f / 30) + ':' + String(f % 60).padStart(2, '0')
let bad = 0
for (const f of frames) {
  await send('Runtime.evaluate', {
    expression: 'window.__slcPause && window.__slcPause(); window.__slcSeek && window.__slcSeek(' + f + ')',
  })
  await new Promise((r) => setTimeout(r, SETTLE))
  const res = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true })
  const val = res.result && res.result.value
  if (!val || val.error) {
    console.log('f' + f + '  PROBE FAILED ' + JSON.stringify(val) + ' ' + JSON.stringify(res.exceptionDetails || {}).slice(0, 400))
    continue
  }
  const items = val.items
  const hits = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]
      const b = items[j]
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
      if (ox <= 2 || oy <= 2) continue
      const area = ox * oy
      const minArea = Math.min(a.w * a.h, b.w * b.h)
      if (area / minArea < 0.12) continue
      hits.push({ a, b, pct: Math.round((area / minArea) * 100) })
    }
  }
  // 越出画面的文字：跑到屏幕外的东西不会跟别的字相撞，但一样是排版事故
  const off = items.filter(
    (it) => it.x < -2 || it.y < -2 || it.x + it.w > 1922 || it.y + it.h > 1082
  )
  if (hits.length || off.length) {
    bad++
    console.log('')
    console.log('f' + f + ' = ' + clock(Math.round(f / 30)) + '  ' + hits.length + ' overlap(s), ' + off.length + ' off-frame')
    for (const h of hits.slice(0, 12)) {
      console.log(
        '   ' + String(h.pct).padStart(3) + '%  [' + h.a.t + '] ' + h.a.x + ',' + h.a.y + ' ' + h.a.w + 'x' + h.a.h +
          '   X   [' + h.b.t + '] ' + h.b.x + ',' + h.b.y + ' ' + h.b.w + 'x' + h.b.h,
      )
    }
    for (const o of off.slice(0, 8)) {
      console.log('   OFF  [' + o.t + '] ' + o.x + ',' + o.y + ' ' + o.w + 'x' + o.h)
    }
  }
}
console.log('')
console.log('==== frames with overlap: ' + bad + ' / ' + frames.length + ' ====')
ws.close()
