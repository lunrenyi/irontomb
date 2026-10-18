/**
 * 三种「分支」共用 Segment 这条数据结构，但生成方式完全不同：
 *
 *   枝条  —— L-系统 + 海龟，向外分叉、越分越细
 *   叶脉  —— 中肋 + 二级脉络，按弧长规律排布，末端收敛
 *   河流  —— 向下游分叉，越往下越宽，末端发散
 *
 * 所以它们只是「长得像」，并不是同一条数学规则的三个马甲。
 */

import { curvedControl, polar, quadPath } from './geometry'
import { jitter, mulberry32 } from './rng'
import { DEFAULT_PARAMS, grow, PLANT_GRAMMAR, type GrowParams, type Plant, type Segment } from './lsystem'

export interface VeinLeaf {
  /** 叶子的外轮廓（矢量路径，本地坐标，向上为 -y） */
  outline: string
  segments: Segment[]
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

/** 叶片轮廓：底宽顶尖的柳叶形 */
export function leafOutline(length: number, width: number): string {
  const w = width / 2
  return (
    'M 0 0 C ' + w * 0.9 + ' ' + -length * 0.22 + ' ' + w + ' ' + -length * 0.72 + ' 0 ' + -length +
    ' C ' + -w + ' ' + -length * 0.72 + ' ' + -w * 0.9 + ' ' + -length * 0.22 + ' 0 0 Z'
  )
}

/**
 * 叶脉：一条中肋，两侧按固定间距生出二级脉络，脉络末端再冒一点三级脉络。
 * 与树完全不同：它不会「越分越细地无限递归」，而是排布在一片有限的叶子。
 */
export function buildVeins(opts: { length?: number; width?: number; seed?: number; secondOrder?: number } = {}): VeinLeaf {
  const length = opts.length ?? 300
  const width = opts.width ?? 150
  const rand = mulberry32(opts.seed ?? 991)
  const pairs = opts.secondOrder ?? 7
  const segments: Segment[] = []

  const ribEnd = { x: 0, y: -length }
  const ribControl = curvedControl(0, 0, ribEnd.x, ribEnd.y, 0)
  segments.push({
    id: 0,
    depth: 0,
    birthGen: 0,
    x1: 0,
    y1: 0,
    x2: ribEnd.x,
    y2: ribEnd.y,
    cx: ribControl.cx,
    cy: ribControl.cy,
    width: 4.2,
    angle: -90,
    hasChildren: true,
  })

  for (let i = 0; i < pairs; i += 1) {
    const t = (i + 1) / (pairs + 1)
    const y = -length * t
    const halfWidth = (width / 2) * Math.sin(Math.PI * Math.pow(t, 0.85))
    for (const side of [-1, 1]) {
      const spread = 58 + jitter(rand, 7)
      const len = halfWidth * (1.28 + jitter(rand, 0.12))
      const startAngle = -90 + side * (90 - spread)
      const end = polar(0, y, len, startAngle + jitter(rand, 3))
      const control = curvedControl(0, y, end.x, end.y, side * 16)
      segments.push({
        id: segments.length,
        depth: 1,
        birthGen: 1,
        x1: 0,
        y1: y,
        x2: end.x,
        y2: end.y,
        cx: control.cx,
        cy: control.cy,
        width: 1.9,
        angle: startAngle,
        hasChildren: false,
      })
      if (t > 0.18 && t < 0.88) {
        const from = polar(0, y, len * 0.62, startAngle + side * 16)
        const to = polar(from.x, from.y, len * 0.42, startAngle + side * (30 + jitter(rand, 6)))
        const c2 = curvedControl(from.x, from.y, to.x, to.y, side * 12)
        segments.push({
          id: segments.length,
          depth: 2,
          birthGen: 2,
          x1: from.x,
          y1: from.y,
          x2: to.x,
          y2: to.y,
          cx: c2.cx,
          cy: c2.cy,
          width: 1,
          angle: startAngle + side * 30,
          hasChildren: false,
        })
      }
    }
  }

  return {
    outline: leafOutline(length, width),
    segments,
    bounds: { minX: -width / 2 - 4, minY: -length - 4, maxX: width / 2 + 4, maxY: 4 },
  }
}

/** 河流：沿 L-系统往下游走，但宽度是「越分越宽」，角度更大更散 */
export function riverParams(overrides: Partial<GrowParams> = {}): GrowParams {
  return {
    ...DEFAULT_PARAMS,
    angle: 34,
    length: 96,
    lengthDecay: 0.84,
    width: 1.6,
    widthDecay: 1.26,
    jitter: 0.32,
    bend: 5,
    gravitropism: 0,
    maxDeviation: 74,
    originAngle: 90,
    seed: 40417,
    ...overrides,
  }
}

export function buildRiver(generations: number, overrides: Partial<GrowParams> = {}): Plant {
  return grow(PLANT_GRAMMAR, riverParams(overrides), generations)
}

/** 把一段 Segment 画成路径字符串（自然分支图与影片共用） */
export function segmentPath(s: Segment, t = 1): string {
  return quadPath(s.x1, s.y1, s.cx, s.cy, s.x1 + (s.x2 - s.x1) * t, s.y1 + (s.y2 - s.y1) * t)
}
