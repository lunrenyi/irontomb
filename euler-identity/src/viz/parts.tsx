import type { ReactNode } from 'react'

/**
 * 纯 SVG 零件：不依赖 motion、不依赖帧号，只接受数值。
 * 影片（Remotion）与网站共用它们，保证两边看到的是同一套图形语言。
 */

/** 用 pathLength=1 + dasharray 表示「画到路径的百分之几」 */
export function DashArc({
  d,
  length,
  offset = 0,
  spacing = 1,
  stroke,
  strokeWidth = 2,
  strokeOpacity = 1,
  fill = 'none',
  lineCap = 'round',
}: {
  d: string
  length: number
  offset?: number
  spacing?: number
  stroke: string
  strokeWidth?: number | string
  strokeOpacity?: number | string
  fill?: string
  lineCap?: 'round' | 'butt' | 'square'
}) {
  return (
    <path
      d={d}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeOpacity={strokeOpacity}
      strokeLinecap={lineCap}
      pathLength={1}
      strokeDasharray={clamp01(length) + ' ' + spacing}
      strokeDashoffset={-offset}
      style={{ mixBlendMode: 'normal' }}
    />
  )
}

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)

/** 箭头：把一条线段变成有方向的矢量 */
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  color,
  width = 3,
  headSize = 12,
  headAt = 'end',
  opacity = 1,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  width?: number
  headSize?: number
  headAt?: 'start' | 'end'
  opacity?: number | string
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const sign = headAt === 'end' ? 1 : -1
  const tipX = headAt === 'end' ? x2 : x1
  const tipY = headAt === 'end' ? y2 : y1
  const spread = 0.42
  const p1 = [tipX - headSize * Math.cos(angle - spread) * sign, tipY - headSize * Math.sin(angle - spread) * sign]
  const p2 = [tipX - headSize * Math.cos(angle + spread) * sign, tipY - headSize * Math.sin(angle + spread) * sign]
  return (
    <g opacity={opacity}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap='round' />
      <polygon points={tipX + ',' + tipY + ' ' + p1[0] + ',' + p1[1] + ' ' + p2[0] + ',' + p2[1]} fill={color} />
    </g>
  )
}

/** 影片底色：极低对比度的网格与光晕，跨场景保持一致的空间感 */
export function FilmBackdrop({ width, height, glow = 0 }: { width: number; height: number; glow?: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={'0 0 ' + width + ' ' + height}
      style={{ position: 'absolute', inset: 0, display: 'block' }}
      aria-hidden='true'
    >
      <defs>
        <radialGradient id='film-core' cx='50%' cy='46%' r='52%'>
          <stop offset='0%' stopColor='#4fe3c1' stopOpacity={0.09 + glow * 0.16} />
          <stop offset='70%' stopColor='#05070f' stopOpacity={0} />
        </radialGradient>
        <linearGradient id='film-floor' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor='#05070f' stopOpacity={0} />
          <stop offset='100%' stopColor='#0a1120' stopOpacity={0.55} />
        </linearGradient>
        <pattern id='film-grid' width='80' height='80' patternUnits='userSpaceOnUse'>
          <path d='M 80 0 L 0 0 0 80' fill='none' stroke='#8ea4bf' strokeOpacity='0.05' strokeWidth='1' />
        </pattern>
      </defs>
      <rect width={width} height={height} fill='#05070f' />
      <rect width={width} height={height} fill='url(#film-grid)' />
      <rect width={width} height={height} fill='url(#film-core)' />
      <rect width={width} height={height} fill='url(#film-floor)' />
    </svg>
  )
}

/**
 * 画面内的装饰性圆环：跨场景延续同一个「仪器」母题。
 * 自带一层 svg —— 它经常被直接放在 Layer（div）里，而不是放进某个大 svg。
 */
export function AmbientRings({
  cx,
  cy,
  r,
  opacity = 0.1,
  dash = '4 12',
}: {
  cx: number
  cy: number
  r: number
  opacity?: number
  dash?: string
}) {
  return (
    <svg
      width='100%'
      height='100%'
      viewBox={'0 0 1920 1080'}
      style={{ position: 'absolute', inset: 0, display: 'block' }}
      aria-hidden='true'
    >
      <g opacity={opacity} fill='none' stroke='#8ea4bf' strokeWidth='1'>
        <circle cx={cx} cy={cy} r={r} strokeDasharray={dash} />
        <circle cx={cx} cy={cy} r={r * 1.34} strokeOpacity='0.5' />
      </g>
    </svg>
  )
}

export function Layer({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'block',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
