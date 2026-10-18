/**
 * 第四幕那张「计算机组成原理」图的版面。
 *
 * 版面是常量，所以每次渲染画面完全一样，信号动画也就不会跳动。
 * 数据通路画成一条贯穿下方的总线：CPU、内存、存储设备、输入输出都挂在它上面。
 */

export const VIEW_W = 1720
export const VIEW_H = 800

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export const MEMORY: Box = { x: 90, y: 60, w: 340, h: 430 }
export const CPU: Box = { x: 520, y: 40, w: 700, h: 480 }
export const CONTROL: Box = { x: 545, y: 70, w: 300, h: 120 }
export const ALU: Box = { x: 875, y: 70, w: 320, h: 200 }
export const REGISTERS: Box = { x: 545, y: 220, w: 300, h: 270 }
export const IRU: Box = { x: 875, y: 300, w: 320, h: 190 }
export const STORAGE: Box = { x: 1300, y: 60, w: 330, h: 300 }
// 输入输出紧贴在总线下方，把画面最底下那条带子整条让出来给数据流与阶段指示
export const INPUT: Box = { x: 90, y: 600, w: 380, h: 92 }
export const OUTPUT: Box = { x: 1250, y: 600, w: 380, h: 92 }

/** 贯穿下方的那条总线 */
export const BUS_Y = 590
export const BUS_X0 = 120
export const BUS_X1 = 1600

/** 各部件挂在总线上的接点 */
export const BUS_TAP = {
  memory: 260,
  cpu: 870,
  storage: 1465,
  input: 280,
  output: 1440,
}

/** CPU 内部的寄存器组：10 个寄存器，位置固定 */
export const REGISTER_SLOTS: Box[] = Array.from({ length: 10 }, (_, i) => {
  const col = i % 2
  const row = Math.floor(i / 2)
  return { x: REGISTERS.x + 18 + col * 136, y: REGISTERS.y + 52 + row * 42, w: 128, h: 34 }
})

/** ALU 的三个功能块 */
export const ALU_BLOCKS: Array<Box & { label: string }> = [
  { x: ALU.x + 18, y: ALU.y + 52, w: 138, h: 56, label: '加 / 减' },
  { x: ALU.x + 164, y: ALU.y + 52, w: 138, h: 56, label: '逻辑' },
  { x: ALU.x + 18, y: ALU.y + 120, w: 138, h: 56, label: '乘 / 除' },
  { x: ALU.x + 164, y: ALU.y + 120, w: 138, h: 56, label: '比较' },
]

export interface Route {
  id: string
  points: [number, number][]
}

const up = (x: number, y: number): [number, number] => [x, y]
const cpuTapX = BUS_TAP.cpu

/** 数据在部件之间流动的几条固定路线 */
export const ROUTES: Record<string, Route> = {
  'pc-to-mem': { id: 'pc-to-mem', points: [up(cpuTapX, BUS_Y), up(cpuTapX, 552), up(210, 552), up(210, MEMORY.y + MEMORY.h)] },
  'mem-to-cpu': { id: 'mem-to-cpu', points: [up(300, MEMORY.y + MEMORY.h), up(300, 552), up(cpuTapX, 552), up(cpuTapX, BUS_Y)] },
  'mem-to-output': { id: 'mem-to-output', points: [up(BUS_TAP.memory, MEMORY.y + MEMORY.h), up(BUS_TAP.memory, BUS_Y), up(BUS_TAP.output, BUS_Y), up(BUS_TAP.output, OUTPUT.y)] },
  'cpu-to-output': { id: 'cpu-to-output', points: [up(cpuTapX, BUS_Y), up(BUS_TAP.output, BUS_Y), up(BUS_TAP.output, OUTPUT.y)] },
  'input-to-mem': { id: 'input-to-mem', points: [up(BUS_TAP.input, INPUT.y + INPUT.h), up(BUS_TAP.input, BUS_Y), up(BUS_TAP.memory, BUS_Y), up(BUS_TAP.memory, MEMORY.y + MEMORY.h)] },
  'storage-to-mem': { id: 'storage-to-mem', points: [up(BUS_TAP.storage, STORAGE.y + STORAGE.h), up(BUS_TAP.storage, BUS_Y), up(BUS_TAP.memory, BUS_Y), up(BUS_TAP.memory, MEMORY.y + MEMORY.h)] },
  'internal-alu': { id: 'internal-alu', points: [up(REGISTERS.x + REGISTERS.w, 250), up(REGISTERS.x + REGISTERS.w + 30, 250), up(REGISTERS.x + REGISTERS.w + 30, 150), up(ALU.x, 150)] },
  'internal-regs': { id: 'internal-regs', points: [up(ALU.x + ALU.w, 150), up(ALU.x + ALU.w + 26, 150), up(ALU.x + ALU.w + 26, 250), up(REGISTERS.x + REGISTERS.w, 250)] },
  'internal-ctrl': { id: 'internal-ctrl', points: [up(CONTROL.x + CONTROL.w / 2, CONTROL.y + CONTROL.h), up(CONTROL.x + CONTROL.w / 2, 265), up(IRU.x + IRU.w / 2, 265), up(IRU.x + IRU.w / 2, IRU.y)] },
}

/** 沿折线取一个点：t 从 0 到 1 */
export function alongRoute(points: readonly [number, number][], t: number): { x: number; y: number; angle: number } {
  if (points.length === 0) return { x: 0, y: 0, angle: 0 }
  if (points.length === 1) return { x: points[0][0], y: points[0][1], angle: 0 }
  const lengths: number[] = []
  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    const len = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
    lengths.push(len)
    total += len
  }
  if (total <= 0) return { x: points[0][0], y: points[0][1], angle: 0 }
  let remain = Math.max(0, Math.min(1, t)) * total
  for (let i = 0; i < lengths.length; i += 1) {
    if (remain <= lengths[i] || i === lengths.length - 1) {
      const k = lengths[i] > 0 ? remain / lengths[i] : 0
      const [x0, y0] = points[i]
      const [x1, y1] = points[i + 1]
      return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, angle: Math.atan2(y1 - y0, x1 - x0) }
    }
    remain -= lengths[i]
  }
  return { x: points[points.length - 1][0], y: points[points.length - 1][1], angle: 0 }
}

/** 内存里要显示的格数 */
export const MEMORY_ROWS = 14
