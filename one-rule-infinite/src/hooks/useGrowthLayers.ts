import { useMemo } from 'react'
import { growingGenerationAt, grownSegments, growingSegments, type DrawnSegment, type GrowthPlan } from '../lib/growth'

export interface GrowthLayers {
  generation: number
  done: DrawnSegment[]
  growing: DrawnSegment[]
}

/**
 * 把「生长」分成两层。
 *
 * 抖动的第二个关键：已经长好的枝条从此不再进入每帧的重算。
 * useMemo 只在「长完那一代」的时刻生成新数组，之后它的身份完全不变，
 * 因此叶片、子路径这些派生数据都只在跨代时被重算一次。
 */
export function useGrowthLayers(plan: GrowthPlan, time: number): GrowthLayers {
  const generation = growingGenerationAt(plan, time)
  const done = useMemo(() => grownSegments(plan, generation - 1), [plan, generation])
  const growing = useMemo(() => growingSegments(plan, time, generation), [plan, time, generation])
  return { generation, done, growing }
}
