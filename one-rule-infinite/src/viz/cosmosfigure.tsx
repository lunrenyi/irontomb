/**
 * 宇宙网的画法。
 *
 * 三层：背景星场 -> 丝状结构 -> 团块。
 * 出现顺序是「从中心往外」，与镜头拉远的方向一致，
 * 所以观众会觉得自己是在往后退，而不是在看一张贴图。
 *
 * 画面上必须一直挂着「程序生成的示意结构」这句话，别让人误以为这是真实观测数据。
 */

import type { CosmosWeb } from '../lib/cosmos'

export const COSMOS_FAR = '#8fa4d8'
export const COSMOS_MID = '#c9d8ff'
export const COSMOS_HOT = '#fff2d0'

export interface CosmosFigureProps {
  web: CosmosWeb
  /** 0-1：宇宙网出现到哪儿了 */
  progress: number
  fieldOpacity?: number
  filamentOpacity?: number
  knotOpacity?: number
  scale?: number
  opacity?: number
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export function CosmosFigure({
  web,
  progress,
  fieldOpacity = 1,
  filamentOpacity = 1,
  knotOpacity = 1,
  scale = 1,
  opacity = 1,
}: CosmosFigureProps) {
  // 丝线按「距离中心的远近」决定出场顺序：中心先亮，边缘后亮
  const span = Math.max(
    1,
    Math.max(Math.abs(web.bounds.minX), Math.abs(web.bounds.maxX), Math.abs(web.bounds.minY), Math.abs(web.bounds.maxY)),
  )
  const order = (x: number, y: number) => Math.hypot(x, y) / span

  return (
    <g opacity={opacity}>
      {web.field.map((p, i) => (
        <circle key={'f' + i} cx={p.x} cy={p.y} r={p.r * scale} fill={COSMOS_FAR} opacity={p.a * fieldOpacity * clamp01(progress * 4)} />
      ))}

      {web.filaments.map((f, i) => {
        const mid = f.points[Math.floor(f.points.length / 2)]
        const at = order(mid.x, mid.y)
        const t = clamp01((progress - 0.12 - at * 0.5) / 0.24)
        if (t <= 0) return null
        // 丝线本身由点串成：越密的地方看起来越亮，正好对应物质聚集
        const visible = Math.max(2, Math.round(f.points.length * t))
        const d = 'M ' + f.points.map((p) => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' L ')
        return (
          <g key={'w' + i}>
            <path d={d} fill='none' stroke={COSMOS_MID} strokeWidth={f.weight * 1.7 * scale} strokeOpacity={0.16 * f.weight * t * filamentOpacity} strokeLinecap='round' />
            {f.points.slice(0, visible).map((p, k) => (
              <circle key={k} cx={p.x} cy={p.y} r={p.r * scale} fill={COSMOS_MID} opacity={0.72 * f.weight * filamentOpacity} />
            ))}
          </g>
        )
      })}

      {web.knots.map((k) => {
        const t = clamp01((progress - 0.34 - order(k.x, k.y) * 0.42) / 0.2)
        if (t <= 0) return null
        return (
          <g key={'k' + k.id} opacity={knotOpacity * t}>
            {/* 团块的暖色核心：越浓的团块越亮，这也符合「越集中越亮」 */}
            <circle cx={k.x} cy={k.y} r={(6 + k.mass * 9) * scale} fill={COSMOS_HOT} opacity={0.5 + k.mass * 0.3} />
            {k.members.map((m, i) => (
              <circle key={i} cx={m.x} cy={m.y} r={m.r * scale} fill={k.mass > 0.72 ? COSMOS_HOT : COSMOS_MID} opacity={0.72} />
            ))}
          </g>
        )
      })}
    </g>
  )
}
