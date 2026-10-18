import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PARAMS,
  GRAMMARS,
  LESSON_GRAMMAR,
  PLANT_GRAMMAR,
  expand,
  grow,
  type GrowParams,
} from './lsystem'
import { boundsAt, planGrowth, segmentsAt } from './growth'
import { mulberry32 } from './rng'

const params: GrowParams = { ...DEFAULT_PARAMS, originX: 0, originY: 0 }
const key = (x: number, y: number) => Math.round(x * 100) + ':' + Math.round(y * 100)

describe('L-系统展开', () => {
  it('教学规则 F → F[+F]F[-F] 每代翻倍', () => {
    expect(expand(LESSON_GRAMMAR, 0)).toBe('F')
    expect(expand(LESSON_GRAMMAR, 1)).toBe('F[+F]F[-F]')
    const counts = [0, 1, 2, 3, 4].map((g) => grow(LESSON_GRAMMAR, params, g).segments.length)
    expect(counts).toEqual([1, 4, 16, 64, 256])
  })

  it('同一株植物永远是同一株（确定性）', () => {
    const a = grow(PLANT_GRAMMAR, params, 6)
    const b = grow(PLANT_GRAMMAR, params, 6)
    expect(a.segments.length).toBe(b.segments.length)
    expect(a.segments[37]).toEqual(b.segments[37])
  })

  it('换种子会长出不同的树', () => {
    const a = grow(PLANT_GRAMMAR, { ...params, seed: 1 }, 6)
    const b = grow(PLANT_GRAMMAR, { ...params, seed: 2 }, 6)
    expect(a.segments.length).toBe(b.segments.length)
    expect(a.segments[20].x2).not.toBe(b.segments[20].x2)
  })
})

describe('海龟解释出的枝条', () => {
  const plant = grow(PLANT_GRAMMAR, params, 7)

  it('每根枝条都长在某根枝条的末端上（真的连着）', () => {
    const ends = new Set(plant.segments.map((s) => key(s.x2, s.y2)))
    const orphans = plant.segments.filter(
      (s) => s.depth > 0 && !ends.has(key(s.x1, s.y1)) && key(s.x1, s.y1) !== key(params.originX, params.originY),
    )
    expect(orphans.length).toBe(0)
  })

  it('越深的枝条越细', () => {
    const byDepth = new Map<number, number[]>()
    for (const s of plant.segments) {
      const list = byDepth.get(s.depth) ?? []
      list.push(s.width)
      byDepth.set(s.depth, list)
    }
    const widths = [...byDepth.keys()]
      .sort((a, b) => a - b)
      .map((d) => {
        const list = byDepth.get(d) as number[]
        return list.reduce((sum, value) => sum + value, 0) / list.length
      })
    for (let i = 1; i < widths.length; i += 1) {
      expect(widths[i]).toBeLessThan(widths[i - 1])
    }
  })

  it('分叉角越大树冠越宽', () => {
    const narrow = grow(PLANT_GRAMMAR, { ...params, angle: 12, jitter: 0 }, 7)
    const wide = grow(PLANT_GRAMMAR, { ...params, angle: 38, jitter: 0 }, 7)
    expect(wide.bounds.maxX - wide.bounds.minX).toBeGreaterThan(narrow.bounds.maxX - narrow.bounds.minX)
  })

  it('包围盒有限且包含全部枝条', () => {
    expect(Number.isFinite(plant.bounds.minX)).toBe(true)
    for (const s of plant.segments) {
      expect(s.x1).toBeGreaterThanOrEqual(plant.bounds.minX)
      expect(s.x2).toBeLessThanOrEqual(plant.bounds.maxX)
    }
  })

  it('atGeneration 只给出已经长出来的枝条，且逐代变多', () => {
    let previous = 0
    for (let g = 0; g <= 7; g += 1) {
      const list = plant.atGeneration(g)
      expect(list.length).toBeGreaterThanOrEqual(previous)
      previous = list.length
    }
    expect(plant.atGeneration(7).length).toBe(plant.segments.length)
  })
})

describe('生长调度', () => {
  const plant = grow(PLANT_GRAMMAR, params, 7)
  const plan = planGrowth(plant.segments, 7)

  it('时间轴单调递增且不重叠', () => {
    for (let i = 1; i < plan.steps.length; i += 1) {
      expect(plan.steps[i].start).toBeGreaterThanOrEqual(plan.steps[i - 1].start)
      expect(plan.steps[i].end).toBeGreaterThanOrEqual(plan.steps[i - 1].end)
    }
  })

  it('主干先长，侧枝后长', () => {
    const firstTen = plan.steps.slice(0, 10)
    const last = plant.segments.length - 1
    const lateSteps = plan.steps.slice(-10)
    const meanDepth = (list: typeof firstTen) => list.reduce((a, s) => a + s.segment.depth, 0) / list.length
    expect(meanDepth(firstTen)).toBeLessThan(meanDepth(lateSteps))
    expect(last).toBeGreaterThan(0)
  })

  it('时间前进时树越画越大', () => {
    const early = boundsAt(plan, 0.2)
    const late = boundsAt(plan, 0.9)
    expect(late.maxX - late.minX + late.maxY - late.minY).toBeGreaterThan(early.maxX - early.minX + early.maxY - early.minY)
  })

  it('segmentsAt 给出的位置始终落在自己的枝条上', () => {
    for (const drawn of segmentsAt(plan, 0.5)) {
      expect(drawn.t).toBeGreaterThan(0)
      expect(drawn.t).toBeLessThanOrEqual(1)
      const s = drawn.segment
      const expectedX = s.x1 + (s.x2 - s.x1) * drawn.t
      expect(Math.abs(drawn.x - expectedX)).toBeLessThan(1e-6)
    }
  })
})

describe('随机数', () => {
  it('同一个种子给出同一串数', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const first = [a(), a(), a()]
    const second = [b(), b(), b()]
    expect(first).toEqual(second)
    expect(first.every((v) => v >= 0 && v < 1)).toBe(true)
  })

  it('GRAMMARS 里两个规则都可直接使用', () => {
    expect(Object.keys(GRAMMARS)).toEqual(['lesson', 'plant'])
  })
})

describe('时间与代数的对应关系', () => {
  const params2 = { ...DEFAULT_PARAMS, originX: 0, originY: 0 }
  const lesson = grow(LESSON_GRAMMAR, params2, 5)
  const lessonPlan = planGrowth(lesson.segments, 5)

  it('genEnd 严格递增，并且能反查当前是第几代', () => {
    for (let g = 1; g < lessonPlan.genEnd.length; g += 1) {
      expect(lessonPlan.genEnd[g]).toBeGreaterThan(lessonPlan.genEnd[g - 1])
    }
    expect(lessonPlan.generationAt(0)).toBe(0)
    for (let g = 1; g <= 5; g += 1) {
      expect(lessonPlan.generationAt(lessonPlan.genEnd[g])).toBe(g)
      // 还没长完这一代时，读数应当停在上一代
      expect(lessonPlan.generationAt(lessonPlan.genEnd[g] - 0.01)).toBe(g - 1)
    }
  })

  it('「长到第 g 代」的时刻，画出来的正好是前 g 代的枝条', () => {
    for (let g = 1; g <= 5; g += 1) {
      const drawn = segmentsAt(lessonPlan, lessonPlan.genEnd[g])
      expect(drawn.length).toBe(lesson.atGeneration(g).length)
    }
  })

  it('每根枝条分到的时间大致相同：画面不会在最后一代突然卡住', () => {
    const plant = grow(PLANT_GRAMMAR, params2, 6)
    const plan = planGrowth(plant.segments, 6)
    const counts: number[] = []
    for (let g = 0; g <= 6; g += 1) {
      counts.push(plant.atGeneration(g).length - (g > 0 ? plant.atGeneration(g - 1).length : 0))
    }
    const pace = counts
      .map((count, g) => {
        const span = plan.genEnd[g] - plan.genEnd[g > 0 ? g - 1 : 0]
        return count > 0 ? span / count : 0
      })
      .filter((v) => v > 0)
    expect(pace.length).toBeGreaterThan(3)
    expect(Math.max(...pace) / Math.min(...pace)).toBeLessThan(1.25)
  })
})
