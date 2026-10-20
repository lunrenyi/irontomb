/**
 * 底部那一行文字的排版自检。
 *
 * 在每一幕取三帧，读出那一行文字的计算样式与实际位置，
 * 确认所有场景共用同一套字体、字号、字重、颜色、行高、字距、对齐与基线。
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

const url = process.argv[2]
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url })
await new Promise((r) => setTimeout(r, 4500))

const evaluate = async (expression) => {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails).slice(0, 600))
  return res.result.value
}

/* 先看看影片舞台在 DOM 里长什么样 */
const shape = await evaluate(`(() => {
  const v = document.getElementById('film')
  const walk = (n, d) => d > 3 ? [] : [...n.children].flatMap((c) => [[d + ':' + c.tagName + (c.style.position ? '[' + c.style.position + ']' : '')], ...walk(c, d + 1)])
  return walk(v, 0).slice(0, 24)
})()`)
process.stdout.write('舞台结构：\n  ' + shape.join('\n  ') + '\n')

const probe = await evaluate(`(async () => {
  const t = await import('/src/story/timeline.ts')
  window.__qzPause && window.__qzPause()
  // 每一幕取两条：最短的一条与最长的一条（长的那条必然折成两行）
  // 于是「正文 / 科学限定」「一行 / 两行」两种情况都被覆盖到
  const frames = []
  for (const s of t.SCENES) {
    const all = s.beats.flatMap((b) => b.cues)
    const pick = [all.reduce((a, b) => (b.text.length <= a.text.length ? b : a)), all.reduce((a, b) => (b.text.length >= a.text.length ? b : a))]
    for (const c of pick) {
      // beat.cues 的 from/to 是幕内相对帧，要加上幕的起始帧才是全片帧号
      frames.push({ f: s.start + c.from + Math.min(14, Math.floor((c.to - c.from) / 2)), scene: s.id, note: c.note })
    }
  }
  const seen = []
  for (const item of frames) {
    window.__qzSeek(item.f)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const band = document.querySelector('#film [data-qz="caption-band"]')
    if (!band) { seen.push({ frame: item.f, err: 'no band' }); continue }
    const line = band.querySelector('[data-qz="caption-line"]')
    if (!line) { seen.push({ frame: item.f, err: 'no line' }); continue }
    const cs = getComputedStyle(line)
    seen.push({
      frame: item.f, scene: item.scene, note: item.note, family: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight,
      color: cs.color, lh: cs.lineHeight, sp: cs.letterSpacing, align: cs.textAlign,
      bottom: Math.round(line.getBoundingClientRect().bottom),
      lines: band.querySelectorAll('[data-qz="caption-line"]').length,
      text: (line.textContent || '').slice(0, 22),
    })
  }
  const u = (k) => [...new Set(seen.map((x) => x[k]))]
  return { n: seen.length, seen, size: u('size'), weight: u('weight'), color: u('color'),
    lh: u('lh'), sp: u('sp'), align: u('align'), fam: u('family'), bottom: u('bottom') }
})()`)

const u = (k) => [...new Set(probe.seen.map((x) => x[k]))]
process.stdout.write('\n采样帧数：' + probe.n + '\n')
for (const row of probe.seen) {
  process.stdout.write(
    '  f' + String(row.frame).padStart(5, '0') +
    '  ' + String(row.size || row.err || '-').padEnd(9) +
    ' 行数 ' + (row.lines ?? '-') +
    ' 底 ' + String(row.bottom ?? '-').padEnd(5) +
    '  ' + (row.text || '') + '\n',
  )
}
process.stdout.write(
  '\n字号 ' + JSON.stringify(probe.size) +
  '\n字重 ' + JSON.stringify(probe.weight) +
  '\n颜色 ' + JSON.stringify(probe.color) +
  '\n行高 ' + JSON.stringify(probe.lh) +
  '\n字距 ' + JSON.stringify(probe.sp) +
  '\n对齐 ' + JSON.stringify(probe.align) +
  '\n字体 ' + JSON.stringify(probe.fam) +
  '\n底边 ' + JSON.stringify(probe.bottom) + '\n',
)

const same =
  probe.seen.every((x) => !x.err) &&
  u('size').length === 1 && u('weight').length === 1 && u('color').length === 1 &&
  u('lh').length === 1 && u('sp').length === 1 && u('align').length === 1 && u('family').length === 1
process.stdout.write('\n排版统一：' + (same ? 'PASS' : 'FAIL') + '\n')
const fixed = u('bottom').length === 1
process.stdout.write('基线固定：' + (fixed ? 'PASS' : 'FAIL') + '  ' + JSON.stringify(probe.bottom) + '\n')
ws.close()
process.exit(same && fixed ? 0 : 1)
