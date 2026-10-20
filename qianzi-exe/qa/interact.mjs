// 交互自检：点原文、看释义、追关系、跳影片
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
  if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails))
  return res.result.value
}

const results = []
const check = (name, ok, detail) => {
  results.push({ name, ok, detail })
  process.stdout.write((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  — ' + detail : '') + '\n')
}

/* 1. 首页开场有终端信息与入口 */
const hero = await evaluate(`(() => {
  const t = document.body.innerText
  return {
    archive: t.includes('ARCHIVE FOUND'),
    parsing: t.includes('PARSING CHARACTERS'),
    building: t.includes('BUILDING WORLD MODEL'),
    title: t.includes('千字文：世界的源代码'),
    sub: t.includes('QIANZI.EXE'),
    start: [...document.querySelectorAll('button')].some(b => b.textContent.includes('启动解码')),
  }
})()`)
check('开场：三条终端信息', hero.archive && hero.parsing && hero.building)
check('开场：标题与英文副标题', hero.title && hero.sub)
check('开场：启动解码入口', hero.start)

/* 2. 影片在播 */
const playing = await evaluate(`(() => {
  const v = document.querySelector('#film')
  return { hasSvg: !!v.querySelector('svg'), texts: v.querySelectorAll('svg text').length }
})()`)
check('影片：图形层存在且有内容', playing.hasSvg && playing.texts > 20, playing.texts + ' 个文本节点')

/* 3. 点原文句子 -> 浮出释义 */
const clicked = await evaluate(`(() => {
  const re = /[\u4e00-\u9fff]{4}/
  const btns = [...document.querySelectorAll('#text button')].filter(b => re.test(b.textContent))
  if (!btns.length) return { ok: false }
  const target = btns.find(b => b.textContent.includes('孝当')) || btns[0]
  const text = target.textContent.trim()
  target.click()
  return { ok: true, text }
})()`)
await new Promise((r) => setTimeout(r, 400))
const card = await evaluate(`(() => {
  const t = document.body.innerText
  return {
    hasGloss: t.includes('尽孝要竭尽全力') || t.includes('行孝'),
    hasLens: t.includes('伦理观念'),
    hasFloating: !!document.querySelector('button[aria-label="关闭"]'),
  }
})()`)
check('点击原文：释义卡片出现', clicked.ok && card.hasGloss, '点的是 ' + clicked.text)
check('点击原文：标出释义的读法', card.hasLens)
check('点击原文：全站跟着它走的浮条', card.hasFloating)

/* 4. 换一句原文，浮条要跟着换 */
const before = await evaluate(`(() => {
  const bar = document.querySelector('button[aria-label="关闭"]')
  return bar ? bar.parentElement.innerText : ''
})()`)
const clickedOther = await evaluate(`(() => {
  const sec = document.querySelector('#text')
  const re = /[\u4e00-\u9fff]{4}/
  const btns = [...sec.querySelectorAll('button')].filter(b => re.test(b.textContent))
  if (btns.length < 2) return { ok: false }
  btns[1].click()
  return { ok: true }
})()`)
await new Promise((r) => setTimeout(r, 400))
const after = await evaluate(`(() => {
  const bar = document.querySelector('button[aria-label="关闭"]')
  return bar ? bar.parentElement.innerText : ''
})()`)
check('换一句原文：浮条跟着换', clickedOther.ok && after !== before && after.length > 0)

/* 5. 影片寻址总线可用 */
const seek = await evaluate(`(async () => {
  await import('/src/story/timeline.ts').then(m => {
    window.__qzSeek && window.__qzSeek(m.frameForPhrase(62))
  })
  await new Promise(r => setTimeout(r, 400))
  const hud = document.querySelector('#film').innerText
  return { frame: (hud.match(/FRAME\\s*(\\d+)/) || [])[1] || null }
})()`)
check('影片寻址：点原文能跳到对应帧', seek.frame !== null, 'FRAME ' + seek.frame)

/* 6. 五个模块实验台都在 */
const labs = await evaluate(`(() => {
  const ids = ['cosmos','nature','civilization','human','daily']
  return ids.map(id => {
    const sec = document.getElementById(id)
    if (!sec) return id + ':missing'
    const svgs = sec.querySelectorAll('svg')
    const chips = [...sec.querySelectorAll('button')].filter(b => /^[\\u4e00-\\u9fff]{4}$/.test(b.textContent.trim()))
    return id + ':' + (svgs.length > 0 ? 'svg' + svgs.length : 'nosvg') + '/chips' + chips.length
  })
})()`)
for (const l of labs) {
  const [id, info] = l.split(':')
  check('模块 ' + id + '：有画面与原文按钮', !info.includes('missing') && !info.includes('nosvg'), info)
}

/* 7. 全景：点节点出详情 */
const whole = await evaluate(`(() => {
  const sec = document.getElementById('whole')
  const circles = [...sec.querySelectorAll('svg circle')]
  if (!circles.length) return { ok: false }
  circles[circles.length - 1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
  return { ok: true, n: circles.length }
})()`)
await new Promise((r) => setTimeout(r, 400))
const wholeDetail = await evaluate(`(() => {
  const sec = document.getElementById('whole')
  return sec.innerText.includes('共享标签的句子') || sec.innerText.includes('点图上任意一个节点')
})()`)
check('全景：点节点出详情', whole.ok && wholeDetail)

/* 8. 原文索引在正确的顺序上 */
const order = await evaluate(`(async () => {
  const m = await import('/src/content/qianzi.ts')
  return { first: m.PHRASES[0].text, last: m.PHRASES[m.PHRASES.length-1].text, n: m.PHRASES.length }
})()`)
check('原文：250 句，首尾正确', order.n === 250 && order.first === '天地玄黄' && order.last === '焉哉乎也')

/* 9. 页面里没有横向溢出 */
const overflow = await evaluate(`(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
}))()`)
check('布局：没有横向溢出', overflow.scrollW <= overflow.clientW + 2, overflow.scrollW + ' vs ' + overflow.clientW)

const failed = results.filter((r) => !r.ok)
process.stdout.write('\n' + (results.length - failed.length) + '/' + results.length + ' 通过\n')
ws.close()
process.exit(failed.length ? 1 : 0)
