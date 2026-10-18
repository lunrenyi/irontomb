import { useMemo } from 'react'
import { quadAt, quadPath } from '../lib/geometry'
import type { DrawnSegment } from '../lib/growth'
import type { Segment } from '../lib/lsystem'
import { DashPath, hairlineProps } from './parts'

/** 生长色带：越新的枝条越亮，最后一点点是薄荷青 */
export const BARK = ['#1f3a2f', '#2b5040', '#3a6a4e', '#4c8a5e', '#63a96d']
export const NEW_SHOOT = '#7df0c0'
export const BUD = '#ffd479'
export const LEAF = ['#2f6f45', '#3d8551', '#4e9a5c', '#63b06b']

/** 枝条颜色按深度取样：深根、浅梢 */
export function barkColor(depth: number, maxDepth: number): string {
  const t = maxDepth <= 1 ? 0 : depth / (maxDepth - 1)
  const index = Math.min(BARK.length - 1, Math.floor(t * BARK.length))
  return BARK[index]
}

export function leafColor(depth: number, maxDepth: number): string {
  const t = maxDepth <= 1 ? 0 : depth / (maxDepth - 1)
  const index = Math.min(LEAF.length - 1, Math.floor(t * LEAF.length))
  return LEAF[index]
}

/** 一片叶子：两段二次曲线拼出来的柳叶形，再加一根主脉 */
export function leafPath(length: number, width: number): string {
  const w = width / 2
  return (
    'M 0 0 Q ' + w + ' ' + -length * 0.42 + ' 0 ' + -length +
    ' Q ' + -w + ' ' + -length * 0.42 + ' 0 0 Z'
  )
}

export interface LeafProps {
  x: number
  y: number
  angle: number
  length: number
  width: number
  fill: string
  opacity?: number
  /** 轻微摆动（弧度），由帧号决定 */
  sway?: number
  vein?: boolean
}

export function Leaf({ x, y, angle, length, width, fill, opacity = 1, sway = 0, vein = true }: LeafProps) {
  return (
    <g transform={'translate(' + x + ' ' + y + ') rotate(' + (angle + sway) + ')'} opacity={opacity}>
      <path d={leafPath(length, width)} fill={fill} fillOpacity={0.9} />
      {vein ? <line x1={0} y1={0} x2={0} y2={-length * 0.86} stroke='#dff5e4' strokeOpacity={0.28} strokeWidth={Math.max(0.35, width * 0.06)} /> : null}
    </g>
  )
}

interface LeafNode {
  key: string
  x: number
  y: number
  angle: number
  size: number
  color: string
  depth: number
  sway: number
}

/** 三种自然分支共用同一套渲染管线，但参数与配色完全不同 */
export type PlantStyle = 'tree' | 'veins' | 'river'

export interface PlantFigureProps {
  segments: DrawnSegment[]
  maxDepth: number
  /** 正在长出来的那几段：用亮色标出来 */
  freshDepth?: number | null
  /** 正在生长的末端，画一个芽点 */
  tip?: { x: number; y: number } | null
  tipProgress?: number
  leaves?: boolean
  style?: PlantStyle
  /** 线路模式：把枝条换成电路板一样的直角走线 */
  circuit?: number
  widthScale?: number
  leafFromDepth?: number
  sway?: (x: number, y: number) => number
}

/** 线路走线：把一条枝条的贝塞尔压成折线，拐角带圆弧 */
export function circuitPath(s: Segment, t: number): string {
  const midX = s.x1 + (s.x2 - s.x1) * 0.5
  const endX = s.x1 + (s.x2 - s.x1) * t
  const endY = s.y1 + (s.y2 - s.y1) * t
  const horizontalFirst = Math.abs(s.x2 - s.x1) >= Math.abs(s.y2 - s.y1)
  const corner = Math.min(14, Math.abs(s.x2 - s.x1) * 0.4, Math.abs(s.y2 - s.y1) * 0.4 || 14)
  const midY = horizontalFirst ? endY : s.y1
  const cornerX = horizontalFirst ? endX - Math.sign(s.x2 - s.x1 || 1) * corner : endX
  const cornerY = horizontalFirst ? endY : endY - Math.sign(s.y2 - s.y1 || 1) * corner
  void midX
  void midY
  return (
    'M ' + s.x1 + ' ' + s.y1 +
    ' L ' + cornerX + ' ' + s.y1 +
    ' Q ' + cornerX + ' ' + cornerY + ' ' + (horizontalFirst ? cornerX + Math.sign(s.x2 - s.x1 || 1) * corner : cornerX) + ' ' + cornerY +
    ' L ' + endX + ' ' + endY
  )
}

export function PlantFigure({
  segments,
  maxDepth,
  freshDepth = null,
  tip = null,
  tipProgress = 1,
  leaves = true,
  style = 'tree',
  circuit = 0,
  widthScale = 1,
  leafFromDepth = 2,
  sway = () => 0,
}: PlantFigureProps) {
  // 叶子不是长在「端点」上的：真实植物的梢头是一小簇一小簇的
  const leafNodes = useMemo(() => {
    if (!leaves || style !== 'tree') return []
    const nodes: LeafNode[] = []
    for (const drawn of segments) {
      const s = drawn.segment
      if (s.hasChildren || s.depth < leafFromDepth) continue
      const outer = s.depth >= maxDepth - 1
      const count = outer ? 3 : s.depth >= maxDepth - 2 ? 2 : 1
      for (let i = 0; i < count; i += 1) {
        const t = Math.min(0.97, 0.66 + i * 0.15)
        if (drawn.t < t + 0.02) continue
        const at = quadAt(t, s.x1, s.y1, s.cx, s.cy, s.x2, s.y2)
        const side = i % 2 === 0 ? 1 : -1
        nodes.push({
          key: 'leaf-' + s.id + '-' + i,
          x: at.x,
          y: at.y,
          angle: s.angle + 90 + side * (34 + (i % 3) * 9),
          size: Math.max(5, 26 * Math.pow(0.8, s.depth - leafFromDepth) * (0.82 + 0.18 * (1 - i / count))),
          color: leafColor(s.depth, maxDepth),
          depth: s.depth,
          sway: sway(at.x, at.y),
        })
      }
    }
    return nodes
  }, [segments, leaves, style, leafFromDepth, maxDepth, sway])

  const baseWidth = style === 'veins' ? 0.55 : style === 'river' ? 1 : 1

  return (
    <g>
      {segments.map((drawn) => {
        const s = drawn.segment
        const fresh = freshDepth !== null && s.depth === freshDepth
        const depthRatio = maxDepth <= 1 ? 0 : s.depth / Math.max(1, maxDepth - 1)
        const widen = style === 'river' ? 1 + (s.depth / Math.max(1, maxDepth)) * 0.9 : 1
        const width = Math.max(0.35, s.width * widthScale * baseWidth * widen)
        const stroke =
          style === 'river'
            ? '#5c93a8'
            : fresh
              ? NEW_SHOOT
              : style === 'veins'
                ? '#8fd3b6'
                : barkColor(s.depth, maxDepth)
        const opacity = fresh ? 0.95 : style === 'veins' ? 0.62 : 0.95 - depthRatio * 0.18
        const endX = s.x1 + (s.x2 - s.x1) * drawn.t
        const endY = s.y1 + (s.y2 - s.y1) * drawn.t
        const d = circuit > 0.5 ? circuitPath(s, drawn.t) : quadPath(s.x1, s.y1, s.cx, s.cy, endX, endY)
        return (
          <DashPath
            key={s.id}
            d={d}
            length={1}
            stroke={stroke}
            strokeWidth={width}
            strokeOpacity={opacity}
          />
        )
      })}

      {leafNodes.map((leaf) => (
        <Leaf
          key={leaf.key}
          x={leaf.x}
          y={leaf.y}
          angle={leaf.angle}
          length={leaf.size}
          width={leaf.size * 0.52}
          fill={leaf.color}
          opacity={0.92}
          sway={leaf.sway}
        />
      ))}

      {tip ? <TipBud x={tip.x} y={tip.y} progress={tipProgress} /> : null}
    </g>
  )
}

/** 生长点：一颗会呼吸的芽 */
export function TipBud({ x, y, progress = 1, r = 5 }: { x: number; y: number; progress?: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * (1.6 + progress)} fill={BUD} opacity={0.1 * progress} />
      <circle cx={x} cy={y} r={r} fill={BUD} opacity={0.85 * progress} />
    </g>
  )
}

/** 沿枝条跑的一道光：新长出来的那一小段会发亮 */
export function ShootGlow({ drawn, color = NEW_SHOOT }: { drawn: DrawnSegment; color?: string }) {
  const s = drawn.segment
  if (drawn.t >= 0.999) return null
  const head = quadAt(Math.max(0, drawn.t - 0.32), s.x1, s.y1, s.cx, s.cy, s.x2, s.y2)
  const tail = quadAt(drawn.t, s.x1, s.y1, s.cx, s.cy, s.x2, s.y2)
  return <line x1={head.x} y1={head.y} x2={tail.x} y2={tail.y} stroke={color} strokeWidth={Math.max(1, s.width * 1.1)} strokeLinecap='round' strokeOpacity={0.55} />
}

/** 叶片上的露珠感高光，只在最新的几片叶子上出现 */
export function LeafSpark({ x, y, opacity }: { x: number; y: number; opacity: number }) {
  if (opacity <= 0.01) return null
  return <circle cx={x} cy={y} r={1.6} fill='#e8fff2' opacity={opacity * 0.8} />
}

export { hairlineProps }
