// 交互冒烟测试：真的去点、去按，确认实验是可操作的（不是播放动画）
import WebSocket from 'ws'
const targets = await (await fetch('http://localhost:9333/json/list')).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false })
let id = 0
const pending = new Map()
const errors = []
const send = (m, p = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
ws.on('message', (raw) => {
  const msg = JSON.parse(String(raw))
  if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.rej(new Error(JSON.stringify(msg.error))) : p.res(msg.result); return }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text)
})
await new Promise((r) => ws.on('open', r))
await send('Runtime.enable')
await send('Page.enable')
await send('Page.navigate', { url: process.argv[2] })
await new Promise((r) => setTimeout(r, 4000))

const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
// 按可见文字找按钮，只在该章节内部找
const clickIn = async (section, text) => ev(`(() => { const root = document.getElementById(${JSON.stringify(section)}); const b = [...root.querySelectorAll('button')].find(x => x.textContent.trim().includes(${JSON.stringify(text)})); if (!b) return 'NOT FOUND'; b.click(); return 'ok'; })()`)
// 从章节文本里抓第一个匹配的正则
const readIn = async (section, re) => ev(`(() => { const m = document.getElementById(${JSON.stringify(section)}).innerText.match(${re}); return m ? m[0] : '(no match)'; })()`)
const out = []
const check = (label, value) => out.push(label.padEnd(34) + value)
const cmp = (label, a, b) => check(label + '真的变了', a !== b ? 'YES' : 'NO  <-- BUG')
const GEN = '/第 \\d+ 代 · \\d+ 个存活格/'
const CPU = '/已执行 \\d+ \\/ \\d+ 条指令 · \\d+ 个微阶段/'

// ---------- 生命游戏 ----------
await ev('document.getElementById("life").scrollIntoView()'); await wait(700)
const g0 = await readIn('life', GEN)
await clickIn('life', '单步推进一代'); await wait(400)
const g1 = await readIn('life', GEN)
check('生命游戏 · 单步推进', g0 + ' -> ' + g1); cmp('生命游戏 · 单步', g0, g1)

const c0 = await readIn('life', GEN)
// 用真实的鼠标事件（而不是 JS 合成事件）来点格子
const grid = JSON.parse(await ev('(() => { const r = document.querySelector("#life svg[role=img]").getBoundingClientRect(); return JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height}); })()'))
await clickIn('life', '清空'); await wait(350)
const emptyCount = await readIn('life', GEN)
for (const [fx, fy] of [[0.25, 0.25], [0.5, 0.5]]) {
  const x = grid.x + grid.w * fx
  const y = grid.y + grid.h * fy
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, pointerType: 'mouse' })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, pointerType: 'mouse' })
  await wait(350)
}
const clickedCount = await readIn('life', GEN)
const c1 = await readIn('life', GEN)
check('生命游戏 · 点两格（真实鼠标）', emptyCount + ' -> ' + clickedCount)
cmp('生命游戏 · 点格子', emptyCount, clickedCount)

await clickIn('life', '清空'); await wait(400)
check('生命游戏 · 清空', await readIn('life', GEN))
await clickIn('life', '滑翔机枪'); await wait(500)
check('生命游戏 · 载入滑翔机枪', await readIn('life', GEN))
for (let i = 0; i < 4; i++) { await clickIn('life', '单步推进一代'); await wait(150) }
const gun = await readIn('life', GEN)
check('生命游戏 · 滑翔机枪走 4 代', gun)

// ---------- CPU ----------
await ev('document.getElementById("computer").scrollIntoView()'); await wait(700)
const m0 = await readIn('computer', CPU)
await clickIn('computer', '执行下一步'); await wait(400)
const m1 = await readIn('computer', CPU)
check('CPU · 执行下一步', m0 + ' -> ' + m1); cmp('CPU · 单步', m0, m1)
await clickIn('computer', '跑到结束'); await wait(900)
check('CPU · 加法程序跑到结束', await readIn('computer', CPU))
check('CPU · 输出设备显示', (await readIn('computer', '/输出设备[\\s\\S]{0,12}/')).replace(/\n/g, ' '))

await clickIn('computer', '推理'); await wait(400)
await clickIn('computer', '跑到结束'); await wait(1200)
check('CPU · 推理程序输出', (await readIn('computer', '/输出设备[\\s\\S]{0,16}/')).replace(/\n/g, ' '))
await clickIn('computer', '文字'); await wait(400)
await clickIn('computer', '跑到结束'); await wait(1200)
check('CPU · 文字程序输出', (await readIn('computer', '/输出设备[\\s\\S]{0,16}/')).replace(/\n/g, ' '))
await clickIn('computer', '图像'); await wait(400)
await clickIn('computer', '跑到结束'); await wait(1200)
check('CPU · 图像程序输出', (await readIn('computer', '/输出设备[\\s\\S]{0,20}/')).replace(/\n/g, ' '))

// ---------- 采样 ----------
await ev('document.getElementById("bits").scrollIntoView()'); await wait(700)
const b0 = await readIn('bits', '/得到 \\d+ 个 1、\\d+ 个 0/')
await clickIn('bits', '扫频'); await wait(600)
const b1 = await readIn('bits', '/得到 \\d+ 个 1、\\d+ 个 0/')
check('采样 · 换波形', b0 + ' -> ' + b1); cmp('采样 · 波形', b0, b1)
await ev(`(() => { const s = document.getElementById('lab-threshold'); const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; set.call(s,'90'); s.dispatchEvent(new Event('input',{bubbles:true})); return 1 })()`)
await wait(600)
const b2 = await readIn('bits', '/得到 \\d+ 个 1、\\d+ 个 0/')
check('采样 · 拖门限', b1 + ' -> ' + b2); cmp('采样 · 门限', b1, b2)

// ---------- 判断实验 ----------
await ev('document.getElementById("mind").scrollIntoView()'); await wait(700)
await ev('document.querySelectorAll("#mind input[type=checkbox]")[0].click()'); await wait(500)
const mindTxt = await ev('document.getElementById("mind").innerText')
check('判断实验 · 勾选后给出解读', mindTxt.includes('智能：') && mindTxt.includes('体验：') ? 'YES' : 'NO  <-- BUG')
check('判断实验 · 无对错判定', /正确答案|错误答案|答错/.test(mindTxt) ? 'FAIL  <-- BUG' : 'YES')

// ---------- 进化 ----------
await ev('document.getElementById("silicon").scrollIntoView()'); await wait(700)
const e0 = await readIn('silicon', '/第 \\d+ 代 · 最好 \\d+% · 平均 \\d+%/')
await ev(`(() => { const s = document.getElementById('lab-generation'); const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; set.call(s,'30'); s.dispatchEvent(new Event('input',{bubbles:true})); return 1 })()`)
await wait(700)
const e1 = await readIn('silicon', '/第 \\d+ 代 · 最好 \\d+% · 平均 \\d+%/')
check('进化 · 拖动代数', e0 + ' -> ' + e1); cmp('进化 · 世代', e0, e1)

console.log(out.join('\n'))
console.log('\n运行期异常：' + (errors.length ? errors.slice(0, 3).join(' | ') : '无'))
ws.close()
