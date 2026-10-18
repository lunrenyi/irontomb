/** 纯 SVG 零件：影片与网页共用，只接受数值，不含任何动画逻辑。 */

/** pathLength=1 + dasharray：把一条路径「画到百分之几」交给 CSS 之外的纯数学 */
export function DashPath({
  d,
  length,
  spacing = 1,
  offset = 0,
  stroke,
  strokeWidth = 2,
  strokeOpacity = 1,
  fill = 'none',
  cap = 'round',
}: {
  d: string
  length: number
  spacing?: number
  offset?: number
  stroke: string
  strokeWidth?: number
  strokeOpacity?: number
  fill?: string
  cap?: 'round' | 'butt' | 'square'
}) {
  const t = Math.min(1, Math.max(0, length))
  return (
    <path
      d={d}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeOpacity={strokeOpacity}
      strokeLinecap={cap}
      pathLength={1}
      strokeDasharray={t + ' ' + spacing}
      strokeDashoffset={-offset}
    />
  )
}

/** 圆点：芽、光点、节点 */
export function Dot({
  x,
  y,
  r,
  fill,
  opacity = 1,
  glow = 0,
}: {
  x: number
  y: number
  r: number
  fill: string
  opacity?: number
  glow?: number
}) {
  return (
    <g opacity={opacity}>
      {glow > 0 ? <circle cx={x} cy={y} r={r + glow} fill={fill} opacity={0.16} /> : null}
      <circle cx={x} cy={y} r={r} fill={fill} />
    </g>
  )
}

/** 枝条与脉络共用的线条样式 */
export function hairlineProps(stroke: string, width: number, opacity = 1) {
  return {
    stroke,
    strokeWidth: width,
    strokeOpacity: opacity,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  }
}
