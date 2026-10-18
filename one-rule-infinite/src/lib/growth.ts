/**
 * 生长调度：把「一株已经长完的树」翻译成「它是怎么长出来的」。
 *
 * 关键约定：按代（birthGen）由早到晚生长，主干先长，然后侧枝，最后才是细枝。
 * 每一代占用的时间按它自己的枝条数量分配 —— 否则第 7 代（几百根）
 * 和第 1 代（两根）会拿到同样的时间，画面会在最后突然一顿。
 */

import { unionBounds, type Bounds, EMPTY_BOUNDS } from './geometry'
import type { Segment } from './lsystem'

export interface GrowthStep {
  segment: Segment
  /** 这段开始生长的时刻，0-1 */
  start: number
  /** 生长完成时刻，0-1 */
  end: number
}

export interface GrowthPlan {
  steps: GrowthStep[]
  generations: number
  /** 画完时的时刻 */
  finish: number
  /** genEnd[g]：第 g 代长完的那一刻。实验室按它跳转，影片按它读数 */
  genEnd: number[]
  /** 某一刻长到了第几代 */
  generationAt(time: number): number
}

export interface PlanOptions {
  /** 每段枝条生长所占的时间比例（剩下的留给停顿） */
  perSegment?: number
  /** 每代之间的呼吸停顿 */
  breath?: number
  /**
   * 每代至少分到多少时间。
   *
   * 只按枝条数量分配时间的话，第 1 代只有两根枝条，
   * 全片里只能拿到不到 1%：两根枝条在几帧内长完，镜头也被拉得很急。
   * 给每代一个底线，节奏就稳住了。
   */
  minShare?: number
}

/** 每一代内部的绘制顺序：先主干，再一级侧枝，最后细枝 */
function orderWithinGeneration(segments: Segment[]): Segment[] {
  return [...segments].sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth
    return Math.hypot(a.x1, a.y1) - Math.hypot(b.x1, b.y1)
  })
}

export function planGrowth(segments: Segment[], generations: number, options: PlanOptions = {}): GrowthPlan {
  const perSegment = options.perSegment ?? 0.55
  const breath = options.breath ?? 0.12
  const minShare = options.minShare ?? 0.07

  const byGen: Segment[][] = Array.from({ length: generations + 1 }, () => [])
  for (const s of segments) {
    if (s.birthGen <= generations) byGen[s.birthGen].push(s)
  }
  const counts = byGen.map((list) => list.length)
  const total = counts.reduce((a, b) => a + b, 0) || 1

  const steps: GrowthStep[] = []
  const genEnd: number[] = []
  let cursor = 0
  const nonEmpty = byGen.filter((list) => list.length > 0).length || 1

  for (let g = 0; g <= generations; g += 1) {
    const list = orderWithinGeneration(byGen[g])
    if (list.length === 0) {
      genEnd[g] = cursor
      continue
    }
    // 先给每个非空的一代留一个底线，剩下的时间再按枝条数量比例分配
    const floorTotal = Math.min(0.9, minShare * nonEmpty)
    const restTotal = Math.max(0, 1 - breath - floorTotal)
    const share = minShare + (restTotal * list.length) / total
    const slot = (share * perSegment) / list.length
    list.forEach((segment, index) => {
      steps.push({ segment, start: cursor + slot * index, end: cursor + slot * (index + 1) })
    })
    cursor += share
    genEnd[g] = cursor
  }

  return {
    steps,
    generations,
    finish: cursor,
    genEnd,
    generationAt(time) {
      let g = 0
      for (let i = 0; i < genEnd.length; i += 1) {
        if (time >= genEnd[i] - 1e-9) g = i
      }
      return g
    },
  }
}

export interface DrawnSegment {
  segment: Segment
  /** 0-1：这根枝条自己长到了哪里 */
  t: number
  /** 画到路径上的哪个位置 */
  x: number
  y: number
}

/** 某一时刻已经长出来的枝条（一段之内只有一段前缀可见） */
export function segmentsAt(plan: GrowthPlan, time: number): DrawnSegment[] {
  const out: DrawnSegment[] = []
  for (const step of plan.steps) {
    if (time <= step.start) continue
    const t = Math.min(1, (time - step.start) / Math.max(1e-6, step.end - step.start))
    const s = step.segment
    out.push({ segment: s, t, x: s.x1 + (s.x2 - s.x1) * t, y: s.y1 + (s.y2 - s.y1) * t })
  }
  return out
}

/** 到某一刻为止，整棵树已经长到的包围盒（镜头据此拉远） */
export function boundsAt(plan: GrowthPlan, time: number): Bounds {
  let bounds = EMPTY_BOUNDS
  for (const step of plan.steps) {
    if (time < step.start) break
    const t = Math.min(1, (time - step.start) / Math.max(1e-6, step.end - step.start))
    const s = step.segment
    bounds = unionBounds(bounds, { minX: s.x1, minY: s.y1, maxX: s.x1, maxY: s.y1 })
    bounds = unionBounds(bounds, {
      minX: s.x1 + (s.x2 - s.x1) * t,
      minY: s.y1 + (s.y2 - s.y1) * t,
      maxX: s.x1 + (s.x2 - s.x1) * t,
      maxY: s.y1 + (s.y2 - s.y1) * t,
    })
  }
  return bounds
}

/** 最近正在生长的若干段的端点：芽点与镜头都跟着它走 */
export function growingTip(plan: GrowthPlan, time: number, window = 6): DrawnSegment | null {
  let best: DrawnSegment | null = null
  let seen = 0
  for (let i = plan.steps.length - 1; i >= 0; i -= 1) {
    const step = plan.steps[i]
    if (time <= step.start) continue
    seen += 1
    const t = Math.min(1, (time - step.start) / Math.max(1e-6, step.end - step.start))
    if (!best) {
      best = {
        segment: step.segment,
        t,
        x: step.segment.x1 + (step.segment.x2 - step.segment.x1) * t,
        y: step.segment.y1 + (step.segment.y2 - step.segment.y1) * t,
      }
    }
    if (seen >= window) break
  }
  return best
}

/**
 * 此刻正在生长的那一代。
 *
 * plan.steps 本来就是按 birthGen 升序分组的，所以“今天还没长完的那一代”是可以反推的，
 * 而不用逐帧扫描。镜头与只在这一代上变化。
 */
export function growingGenerationAt(plan: GrowthPlan, time: number): number {
  const t = Math.max(0, time)
  for (let g = 0; g < plan.genEnd.length; g += 1) {
    if (t <= plan.genEnd[g] + 1e-9) return g
  }
  return plan.generations
}

/**
 * 第 g 代及以前长完的枝条（t 恒为 1）。
 *
 * 这些是「已经长好的」：无论时间怎么变，它们的几何都不变。
 * 返回值的身份只依赖代数，因此可以被 React 缓存或直接复用。
 */
export function grownSegments(plan: GrowthPlan, gen: number): DrawnSegment[] {
  const out: DrawnSegment[] = []
  for (const step of plan.steps) {
    if (step.segment.birthGen > gen) break
    const s = step.segment
    out.push({ segment: s, t: 1, x: s.x2, y: s.y2 })
  }
  return out
}

/** 正在长的那一代：每帧都会变，所以只把它自己交给 React */
export function growingSegments(plan: GrowthPlan, time: number, gen: number): DrawnSegment[] {
  const out: DrawnSegment[] = []
  for (const step of plan.steps) {
    if (time <= step.start) continue
    if (step.segment.birthGen !== gen) continue
    const t = Math.min(1, (time - step.start) / Math.max(1e-6, step.end - step.start))
    const s = step.segment
    out.push({ segment: s, t, x: s.x1 + (s.x2 - s.x1) * t, y: s.y1 + (s.y2 - s.y1) * t })
  }
  return out
}

/** 正在生长的芽点（镜头不跟它，只有芽点自己跟着走） */
export function budAt(plan: GrowthPlan, time: number): DrawnSegment | null {
  const gen = growingGenerationAt(plan, time)
  const list = growingSegments(plan, time, gen)
  return list.length > 0 ? list[list.length - 1] : null
}
