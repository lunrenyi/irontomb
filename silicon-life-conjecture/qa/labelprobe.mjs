// 查一件事：StageLabel 是个 <div>，被放进 <svg> 里时浏览器根本不画它。
// 这个脚本去真实 DOM 里把每一处 StageLabel 的文字找出来，看它有没有尺寸。
import WebSocket from 'ws'

const base = 'http://localhost:9333'
const url = process.argv[2]
const frames = process.argv.slice(3).map(Number)

const targets = await (await fetch(base + '/json/list')).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageProflate: false, maxPayload: 64 * 1024 * 1024 })
let id = 0
const pending = new Map()
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const msgId = ++id
    pending.set(msgId, { resolve, reject })
    ws.send(JSON.stringify({ id: msgId, method, params }))
  })
ws.on('message', (raw) => {
  const m = JSON.parse(String(raw))
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id)
    pending.delete(m.id)
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result)
  }
})
await new Promise((r) => ws.on('open', r))
await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url })
await new Promise((r) => setTimeout(r, 3500))

for (const f of frames) {
  await send('Runtime.evaluate', {
    expression: 'window.__slcPause && window.__slcPause(); window.__slcSeek && window.__slcSeek(' + f + ')',
  })
  await new Promise((r) => setTimeout(r, 300))
  const res = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const stage = Array.from(document.querySelectorAll('div')).find(
        (d) => d.style && d.style.width === '1920px' && d.style.height === '1080px')
      if (!stage) return 'no stage'
      const out = []
      for (const el of stage.querySelectorAll('div')) {
        if (el.children.length !== 0) continue
        const t = (el.textContent || '').trim()
        if (!t) continue
        if (!el.style.position || el.style.position !== 'absolute') continue
        const inSvg = Boolean(el.closest('svg'))
        const r = el.getBoundingClientRect()
        out.push({ t, inSvg, w: Math.round(r.width), h: Math.round(r.height) })
      }
      return out
    })()`,
  })
  const v = res.result && res.result.value
  if (!Array.isArray(v)) {
    console.log('f' + f + ': ' + JSON.stringify(v))
 continue
  }
  const dead = v.filter((x) => x.inSvg)
  const alive = v.filter((x) => !x.inSvg)
  console.log(
    'f' + f + '  StageLabel-like: ' + v.length +
      '  in <svg> (never painted): ' + dead.length +
      '  outside: ' + alive.length
  )
  for (const d of dead.slice(0, 6)) console.log('     DEAD  [' + d.t + '] ' + d.w + 'x' + d.h)
}
ws.close()
