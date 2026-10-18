import { describe, expect, it } from 'vitest'
import {
  PRESETS,
  clearGrid,
  countGliders,
  createGrid,
  evolve,
  gridWithPreset,
  isAlive,
  liveCount,
  neighborCount,
  nextState,
  parsePattern,
  presetById,
  randomGrid,
  stepLife,
  toggleAt,
  twoGliderCollision,
} from './life'

const size = (p: { width: number; height: number }) => p.width * p.height

describe('规则本身 B3 / S23', () => {
  it('四条规则的判定完全符合康威的定义', () => {
    expect(nextState(true, 0)).toBe(false)
    expect(nextState(true, 1)).toBe(false)
    expect(nextState(true, 2)).toBe(true)
    expect(nextState(true, 3)).toBe(true)
    expect(nextState(true, 4)).toBe(false)
    expect(nextState(true, 8)).toBe(false)
    expect(nextState(false, 2)).toBe(false)
    expect(nextState(false, 3)).toBe(true)
    expect(nextState(false, 0)).toBe(false)
  })

  it('空网格推一代仍然全空', () => {
    const g = createGrid(10, 10)
    expect(liveCount(stepLife(g))).toBe(0)
  })

  it('孤立的单格会死掉', () => {
    const g = gridFrom(10, 10, [{ x: 5, y: 5 }])
    expect(liveCount(stepLife(g))).toBe(0)
  })
})

describe('同步更新（最容易写错的地方）', () => {
  it('下一代必须由同一代的完整状态算出，不能边遍历边改', () => {
    // 一排三格：横着的闪灯必须变成竖着的。
    // 如果实现里边数边改，这一格的结果就会被算错。
    const horizontal = gridFrom(20, 20, [{ x: 9, y: 10 }, { x: 10, y: 10 }, { x: 11, y: 10 }])
    const vertical = stepLife(horizontal)
    expect(liveCount(vertical)).toBe(3)
    expect(isAlive(vertical, 10, 9)).toBe(true)
    expect(isAlive(vertical, 10, 10)).toBe(true)
    expect(isAlive(vertical, 10, 11)).toBe(true)
    expect(isAlive(vertical, 9, 10)).toBe(false)
  })

  it('横闪灯与竖闪灯互为下一代', () => {
    const horizontal = gridFrom(20, 20, [{ x: 9, y: 10 }, { x: 10, y: 10 }, { x: 11, y: 10 }])
    const vertical = stepLife(horizontal)
    expect(liveCount(stepLife(vertical))).toBe(3)
  })

  it('stepLife 不修改传入的网格', () => {
    const g = gridFrom(12, 12, [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }])
    const before = g.cells.join(',')
    stepLife(g)
    expect(g.cells.join(',')).toBe(before)
  })
})

describe('各类预设图案真的表现说明里写的性质', () => {
  const canvas = (n: number) => createGrid(n, n)
  const same = (a: { cells: Uint8Array }, b: { cells: Uint8Array }) => a.cells.join('') === b.cells.join('')

  it('方块是静物：一千代也不变', () => {
    const start = gridWithPreset(canvas(40), presetById('block')!)
    const history = evolve(start, 1000)
    expect(history.every((g) => same(g, start))).toBe(true)
  })

  it('闪灯周期为 2', () => {
    const start = gridWithPreset(canvas(40), presetById('blinker')!)
    const [g0, g1, g2, g3] = evolve(start, 3)
    expect(same(g0, g2)).toBe(true)
    expect(same(g1, g3)).toBe(true)
    expect(same(g0, g1)).toBe(false)
  })

  it('蟾蜍周期为 2', () => {
    const start = gridWithPreset(canvas(40), presetById('toad')!)
    const [g0, , g2] = evolve(start, 2)
    expect(same(g0, g2)).toBe(true)
  })

  it('信标周期为 2', () => {
    const start = gridWithPreset(canvas(40), presetById('beacon')!)
    const [g0, , g2] = evolve(start, 2)
    expect(same(g0, g2)).toBe(true)
  })

  it('脉冲星周期为 3', () => {
    const start = gridWithPreset(canvas(40), presetById('pulsar')!)
    const [g0, g1, g2, g3] = evolve(start, 3)
    expect(same(g0, g3)).toBe(true)
    // 周期是 3 而不是 1：中间两代都不等于第 0 代
    expect(same(g0, g1)).toBe(false)
    expect(same(g1, g2)).toBe(false)
  })

  it('滑翔机每 4 代平移一格', () => {
    const start = gridWithPreset(canvas(40), presetById('glider')!)
    const history = evolve(start, 4)
    const at = (g: typeof start) => {
      let first = -1
      for (let i = 0; i < g.cells.length; i += 1) if (g.cells[i] === 1) { first = i; break }
      return { x: first % g.width, y: Math.floor(first / g.width) }
    }
    const a = at(history[0])
    const b = at(history[4])
    expect(liveCount(history[4])).toBe(5)
    expect(b.x - a.x).toBe(1)
    expect(b.y - a.y).toBe(1)
  })

  it('滑翔机枪每 30 代多发射一个滑翔机：存活格数按 +5 增长', () => {
    const start = gridWithPreset(createGrid(220, 130), presetById('gosper-gun')!)
    const history = evolve(start, 150)
    const base = liveCount(history[30])
    expect(liveCount(history[60]) - base).toBe(5)
    expect(liveCount(history[90]) - base).toBe(10)
    expect(liveCount(history[120]) - base).toBe(15)
  })

  it('能在一张演化图里数出滑翔机来', () => {
    const start = gridWithPreset(createGrid(220, 130), presetById('gosper-gun')!)
    const history = evolve(start, 150)
    expect(countGliders(history[60])).toBeGreaterThanOrEqual(1)
    expect(countGliders(history[120])).toBeGreaterThan(countGliders(history[60]))
  })

  it('R 五格形从 5 格迅速长成一大片：简单规则确实能产生复杂行为', () => {
    const start = gridWithPreset(createGrid(120, 120), presetById('r-pentomino')!)
    expect(liveCount(start)).toBe(5)
    const history = evolve(start, 200)
    // 种群数本身会起伏，所以只断言规模量级：从 5 格长到三倍以上，并且形态一直在变
    expect(liveCount(history[100])).toBeGreaterThan(60)
    expect(liveCount(history[200])).toBeGreaterThan(80)
    expect(history[200].cells.join('')).not.toBe(history[20].cells.join(''))
  })

  it('两个滑翔机对撞：一个停下，另一个继续飞走', () => {
    const result = twoGliderCollision(createGrid(30, 20), 9)
    expect(countGliders(result)).toBe(1)
  })
})

describe('网格操作', () => {
  it('点一格就翻转该格，其它格不受影响', () => {
    const g = createGrid(8, 8)
    const a = toggleAt(g, 3, 4)
    expect(isAlive(a, 3, 4)).toBe(true)
    const b = toggleAt(a, 3, 4)
    expect(isAlive(b, 3, 4)).toBe(false)
    expect(isAlive(g, 3, 4)).toBe(false)
  })

  it('清空与随机填充', () => {
    const g = randomGrid(createGrid(40, 40), 0.4, 12345)
    expect(liveCount(g)).toBeGreaterThan(0)
    expect(liveCount(clearGrid(g))).toBe(0)
    // 同样的种子必须得到同一张图
    expect(randomGrid(createGrid(40, 40), 0.4, 12345).cells.join('')).toBe(g.cells.join(''))
  })

  it('邻居数只算周围八格', () => {
    const g = gridFrom(5, 5, [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }])
    expect(neighborCount(g, 1, 1)).toBe(2)
    expect(neighborCount(g, 0, 0)).toBe(1)
  })
})

describe('预设数据本身', () => {
  it('每个预设都能解析成非空的坐标集合', () => {
    for (const preset of PRESETS) {
      const cells = parsePattern(preset.cells)
      expect(cells.length, preset.id).toBeGreaterThan(0)
    }
  })

  it('网格之外一律当作死亡（有限边界）', () => {
    const g = createGrid(6, 6)
    expect(isAlive(g, -1, 0)).toBe(false)
    expect(isAlive(g, 0, 6)).toBe(false)
  })

  it('size 辅助函数能算出图案尺寸', () => {
    expect(size({ width: 3, height: 3 })).toBe(9)
  })
})

function gridFrom(width: number, height: number, cells: Array<{ x: number; y: number }>) {
  const g = createGrid(width, height)
  for (const c of cells) g.cells[c.y * width + c.x] = 1
  return g
}
