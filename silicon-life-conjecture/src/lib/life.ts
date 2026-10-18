/**
 * 康威生命游戏（B3/S23）—— 真算，不是放动画。
 *
 * 硬规矩（也是正确性的全部来源）：
 *   下一代必须根据**同一代**的完整状态同步算出来。
 *   所以这里先数邻居写进一块全新的缓冲区，绝不边遍历边改当前代 ——
 *   那样算出来的就不是康威的游戏了（经典的 B3/S23 实现错误几乎都出在这里）。
 *
 * 这里的 nextState() 是全站唯一的规则定义：网页、影片与单元测试共用它。
 */

import { mulberry32 } from './rng'

export interface LifeGrid {
  readonly width: number
  readonly height: number
  /** 长度 = width * height，1 = 存活，0 = 死亡 */
  readonly cells: Uint8Array
}

export interface Cell {
  x: number
  y: number
}

/** B3/S23 —— 规则本身只有这一处。 */
export function nextState(alive: boolean, neighbors: number): boolean {
  // 存活：邻居 2 或 3 继续存活（S23）
  if (alive) return neighbors === 2 || neighbors === 3
  // 死亡：邻居恰好 3 时复活（B3）
  return neighbors === 3
}

export function createGrid(width: number, height: number): LifeGrid {
  return { width, height, cells: new Uint8Array(Math.max(0, width * height)) }
}

export const isAlive = (grid: LifeGrid, x: number, y: number): boolean =>
  x < 0 || y < 0 || x >= grid.width || y >= grid.height ? false : grid.cells[y * grid.width + x] === 1

/** 周围的 8 格：网格之外一律当作死亡（有限网格 + 死亡边界） */
export function neighborCount(grid: LifeGrid, x: number, y: number): number {
  let n = 0
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue
      if (isAlive(grid, x + dx, y + dy)) n += 1
    }
  }
  return n
}

/** 同步推进一代：新状态全部写进新数组，再整体替换。 */
export function stepLife(grid: LifeGrid): LifeGrid {
  const { width, height, cells } = grid
  const next = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const n = neighborCount(grid, x, y)
      const alive = cells[y * width + x] === 1
      next[y * width + x] = nextState(alive, n) ? 1 : 0
    }
  }
  return { width, height, cells: next }
}

/** 连续跑 n 代，返回第 0 代到第 n 代的全部快照（影片按它做确定性动画） */
export function evolve(grid: LifeGrid, generations: number): LifeGrid[] {
  const out: LifeGrid[] = [grid]
  let current = grid
  for (let g = 0; g < generations; g += 1) {
    current = stepLife(current)
    out.push(current)
  }
  return out
}

export function liveCount(grid: LifeGrid): number {
  let n = 0
  for (let i = 0; i < grid.cells.length; i += 1) n += grid.cells[i]
  return n
}

export function liveCells(grid: LifeGrid): Cell[] {
  const out: Cell[] = []
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      if (grid.cells[y * grid.width + x] === 1) out.push({ x, y })
    }
  }
  return out
}

export function toggleAt(grid: LifeGrid, x: number, y: number): LifeGrid {
  const next = new Uint8Array(grid.cells)
  const i = y * grid.width + x
  next[i] = next[i] === 1 ? 0 : 1
  return { width: grid.width, height: grid.height, cells: next }
}

export function gridFromCells(width: number, height: number, cells: readonly Cell[]): LifeGrid {
  const out = new Uint8Array(width * height)
  for (const c of cells) {
    if (c.x < 0 || c.y < 0 || c.x >= width || c.y >= height) continue
    out[c.y * width + c.x] = 1
  }
  return { width, height, cells: out }
}

export function clearGrid(grid: LifeGrid): LifeGrid {
  return { width: grid.width, height: grid.height, cells: new Uint8Array(grid.cells.length) }
}

/** 随机初始状态：给定种子就一定得到同一张图（网页与影片因此一致） */
export function randomGrid(grid: LifeGrid, density: number, seed: number): LifeGrid {
  const rand = mulberry32(seed)
  const next = new Uint8Array(grid.cells.length)
  for (let i = 0; i < next.length; i += 1) next[i] = rand() < density ? 1 : 0
  return { width: grid.width, height: grid.height, cells: next }
}

/* ------------------------------------------------------------------ 预设图案 */

export type PresetKind = 'still' | 'oscillator' | 'spaceship' | 'chaos' | 'gun'

export interface LifePreset {
  id: string
  name: string
  kind: PresetKind
  /** 一句话说清它会怎样 —— 这是这一格教给观众的东西 */
  note: string
  /** 展开一点：周期 / 位移 / 结局 */
  detail: string
  /** '#' 与 'O' 都表示存活，空格与 '.' 表示死亡 */
  cells: string[]
}

export const GLIDER_ROWS = ['.#.', '..#', '###']

export const PRESETS: LifePreset[] = [
  {
    id: 'block',
    name: '方块 · 静物',
    kind: 'still',
    note: '四格围成方块，每格都有 3 个邻居，谁也不死 —— 静止不动。',
    detail: '方块是康威游戏里最小的静物：每个存活格恰好有 3 个存活邻居，符合 S23，所以永远保持原样。',
    cells: ['##', '##'],
  },
  {
    id: 'blinker',
    name: '闪灯 · 振荡子',
    kind: 'oscillator',
    note: '三格横着亮，转一代变成竖着，再转回来 —— 周期 2。',
    detail: '闪灯是典型的振荡子：第 2 代与第 0 代完全相同，周期正好是 2。周期 2 是这个游戏里最短的周期。',
    cells: ['.#.', '.#.', '.#.'],
  },
  {
    id: 'toad',
    name: '蟾蜍 · 振荡子',
    kind: 'oscillator',
    note: '两排错开的三格互相推挤，整体左右晃动 —— 周期 2。',
    detail: '蟾蜍每次更新都让两组格子交换位置，于是形状周期性地左右摆动。',
    cells: ['.###', '###.'],
  },
  {
    id: 'beacon',
    name: '信标 · 振荡子',
    kind: 'oscillator',
    note: '两个方块彼此吃掉又吐回对方的一格，反复闪烁 —— 周期 2。',
    detail: '信标由两个 2×2 方块斜对角排布组成，每代各自让出一格给对面，因此呈现「明—暗」的闪烁。',
    cells: ['##..', '##..', '..##', '..##'],
  },
  {
    id: 'glider',
    name: '滑翔机',
    kind: 'spaceship',
    note: '五格的小东西，每 4 代就整体挪一格 —— 它在网格上「飞」。',
    detail: '滑翔机是已知的最小滑翔机。每 4 代之后它平移一格；中间几步形状会变形，只看终态容易以为它没动。',
    cells: GLIDER_ROWS,
  },
  {
    id: 'pulsar',
    name: '脉冲星 · 大振荡子',
    kind: 'oscillator',
    note: '三个环各自扩张、收缩再合拢 —— 周期 3。',
    detail: '脉冲星是著名的周期 3 振荡子，由 13×13 的三段对称结构构成。复杂图案也可以严格周期地重复。',
    cells: [
      '..###...###..',
      '.............',
      '#....#.#....#',
      '#....#.#....#',
      '#....#.#....#',
      '..###...###..',
      '.............',
      '..###...###..',
      '#....#.#....#',
      '#....#.#....#',
      '#....#.#....#',
      '.............',
      '..###...###..',
    ],
  },
]

PRESETS.push(
  {
    id: 'r-pentomino',
    name: 'R · 混沌图案',
    kind: 'chaos',
    note: '只有 5 格，却要演化 1103 代才安定 —— 简单规则放出漫长复杂的历史。',
    detail:
      'R 五格形是著名的「长寿图案」。它持续喷发细胞与滑翔机，经过 1103 代后才稳定，剩下 6 个滑翔机四处飞散。这是「简单规则可以产生复杂整体行为」最直观的一次演示。',
    cells: ['.##', '##.', '.#.'],
  },
  {
    id: 'gosper-gun',
    name: '滑翔机枪 · 自持结构',
    kind: 'gun',
    note: '它会不断吐出滑翔机，一发接一发，永远不停。',
    detail: '滑翔机枪是自持振荡器：内部结构周期性回到自己，同时沿一个方向释放滑翔机。局部规则支撑起了长时间的定向输出。',
    cells: [
      '........................O...........',
      '......................O.O...........',
      '............OO......OO............OO',
      '...........O...O....OO............OO',
      'OO........O.....O...OO..............',
      'OO........O...O.OO....O.O...........',
      '..........O.....O.......O...........',
      '...........O...O.....................',
      '............OO.......................',
    ],
  },
)

export const presetById = (id: string): LifePreset | undefined => PRESETS.find((p) => p.id === id)

/** 把 ASCII 图案读成一组坐标，'#' 与 'O' 都算存活 */
export function parsePattern(rows: readonly string[]): Cell[] {
  const out: Cell[] = []
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x]
      if (ch === '#' || ch === 'O' || ch === '1') out.push({ x, y })
    }
  })
  return out
}

export function presetSize(preset: LifePreset): { width: number; height: number } {
  return { width: preset.cells.reduce((m, r) => Math.max(m, r.length), 0), height: preset.cells.length }
}

/** 把预设放到网格中央；返回一个全新网格，原网格不受影响 */
export function gridWithPreset(grid: LifeGrid, preset: LifePreset): LifeGrid {
  const size = presetSize(preset)
  const cells = new Uint8Array(grid.width * grid.height)
  const originX = Math.floor((grid.width - size.width) / 2)
  const originY = Math.floor((grid.height - size.height) / 2)
  for (const c of parsePattern(preset.cells)) {
    const x = originX + c.x
    const y = originY + c.y
    if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) continue
    cells[y * grid.width + x] = 1
  }
  return { width: grid.width, height: grid.height, cells }
}

/** 一次放多个预设（错开摆放），用来演示图案之间的相互作用 */
export function gridWithPresets(grid: LifeGrid, presets: readonly LifePreset[], seed = 20250101): LifeGrid {
  const rand = mulberry32(seed)
  const cells = new Uint8Array(grid.width * grid.height)
  const used: Array<{ x: number; y: number; w: number; h: number }> = []
  for (const preset of presets) {
    const size = presetSize(preset)
    let placed = false
    for (let attempt = 0; attempt < 80 && !placed; attempt += 1) {
      const ox = Math.floor(rand() * Math.max(1, grid.width - size.width))
      const oy = Math.floor(rand() * Math.max(1, grid.height - size.height))
      const clash = used.some(
        (u) => ox < u.x + u.w + 8 && ox + size.width + 8 > u.x && oy < u.y + u.h + 8 && oy + size.height + 8 > u.y,
      )
      if (clash) continue
      used.push({ x: ox, y: oy, w: size.width, h: size.height })
      for (const c of parsePattern(preset.cells)) {
        const x = ox + c.x
        const y = oy + c.y
        if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) continue
        cells[y * grid.width + x] = 1
      }
      placed = true
    }
  }
  return { width: grid.width, height: grid.height, cells }
}

/* --------------------------------------- 用于「通用计算」那一拍的检测与构造 */

/**
 * 滑翔机在 4 代里的 4 种外形。
 *
 * 注意这不是「4 个旋转朝向」—— 滑翔机的 4 个中间形态并不是彼此旋转得到的。
 * 所以这里干脆在一块小网格上真的跑 4 代，把每一代的包围盒压成字符串：
 * 形状由模拟本身给出，不会写错一个字符。
 */
const GLIDER_SHAPES: readonly string[] = (() => {
  const shapes: string[] = []
  let grid = gridFromCells(7, 7, parsePattern(GLIDER_ROWS).map((c) => ({ x: c.x + 2, y: c.y + 2 })))
  for (let g = 0; g < 4; g += 1) {
    const cells = liveCells(grid)
    const xs = cells.map((c) => c.x)
    const ys = cells.map((c) => c.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    let text = ''
    for (let y = minY; y <= Math.max(...ys); y += 1) {
      for (let x = minX; x <= Math.max(...xs); x += 1) text += isAlive(grid, x, y) ? '#' : '.'
    }
    shapes.push(text)
    grid = stepLife(grid)
  }
  return shapes
})()

/** 数一数画面里有多少个独立的滑翔机（3×3 窗口精确匹配） */
export function countGliders(grid: LifeGrid): number {
  let n = 0
  for (let y = 0; y + 3 <= grid.height; y += 1) {
    for (let x = 0; x + 3 <= grid.width; x += 1) {
      let window = ''
      for (let j = 0; j < 3; j += 1) {
        for (let i = 0; i < 3; i += 1) window += isAlive(grid, x + i, y + j) ? '#' : '.'
      }
      if (GLIDER_SHAPES.includes(window)) n += 1
    }
  }
  return n
}

/**
 * 两个滑翔机对撞。
 * 撞完以后留下一个静止的方块，外加一个继续朝反方向飞的滑翔机：
 * 两组运动 → 一组静止 + 一组运动。滑翔机在这里扮演的是「信号」。
 */
export function twoGliderCollision(grid: LifeGrid, steps: number): LifeGrid {
  const width = grid.width
  const cells = new Uint8Array(grid.width * grid.height)
  const put = (pattern: readonly Cell[], ox: number, oy: number) => {
    for (const c of pattern) {
      const x = ox + c.x
      const y = oy + c.y
      if (x < 0 || y < 0 || x >= width || y >= grid.height) continue
      cells[y * width + x] = 1
    }
  }
  const midY = Math.floor(grid.height / 2) - 1
  const left = Math.floor(grid.width * 0.32)
  put(parsePattern(GLIDER_ROWS), left, midY)
  put(parsePattern(['###', '#..', '.#.']), left + 8, midY)
  let current: LifeGrid = { width: grid.width, height: grid.height, cells }
  for (let s = 0; s < steps; s += 1) current = stepLife(current)
  return current
}
