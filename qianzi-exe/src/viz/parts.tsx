/**
 * 画面零件：几个到处都要用的几何件。
 *
 * 全部是纯函数 —— 只吃数字，不读时钟、不用随机数。
 */
import { alpha, CYAN, HAN, MONO_HAN, PAPER } from './palette'

export function Ring({
  cx,
  cy,
  r,
  color = CYAN,
  opacity = 0.3,
  width = 1,
  dash,
  fill = 'none',
  stroke,
  strokeWidth,
}: {
  cx: number
  cy: number
  r: number
  color?: string
  opacity?: number
  width?: number
  dash?: string
  fill?: string
  /** stroke / strokeWidth 是 color / width 的别名，方便直接写原生 SVG 属性 */
  stroke?: string
  strokeWidth?: number
}) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      stroke={stroke ?? color}
      strokeWidth={strokeWidth ?? width}
      opacity={opacity}
      strokeDasharray={dash}
    />
  )
}

export function Poly({
  points,
  color = CYAN,
  opacity = 0.5,
  width = 1.2,
  fill = 'none',
  dash,
}: {
  points: Array<[number, number]>
  color?: string
  opacity?: number
  width?: number
  fill?: string
  dash?: string
}) {
  const d = points.map((p, i) => (i === 0 ? 'M ' : 'L ') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  return <path d={d} fill={fill} stroke={color} strokeWidth={width} opacity={opacity} strokeDasharray={dash} />
}

export function Line({
  x1,
  y1,
  x2,
  y2,
  color = CYAN,
  opacity = 0.3,
  width = 1,
  dash,
  stroke,
  strokeWidth,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  color?: string
  opacity?: number
  width?: number
  dash?: string
  stroke?: string
  strokeWidth?: number
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={stroke ?? color}
      strokeWidth={strokeWidth ?? width}
      opacity={opacity}
      strokeDasharray={dash}
    />
  )
}

/** 坐标网格：科学可视化的底纹 */
export function Grid({
  x,
  y,
  w,
  h,
  step = 60,
  color = CYAN,
  opacity = 0.1,
}: {
  x: number
  y: number
  w: number
  h: number
  step?: number
  color?: string
  opacity?: number
}) {
  const cols = Math.floor(w / step)
  const rows = Math.floor(h / step)
  return (
    <g opacity={opacity}>
      {Array.from({ length: cols + 1 }, (_, i) => (
        <Line key={'c' + i} x1={x + i * step} y1={y} x2={x + i * step} y2={y + h} color={color} width={0.6} />
      ))}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <Line key={'r' + i} x1={x} y1={y + i * step} x2={x + w} y2={y + i * step} color={color} width={0.6} />
      ))}
    </g>
  )
}

/** 一行等宽的小标签 */
export function Tag({
  x,
  y,
  text,
  color = CYAN,
  size = 20,
  opacity = 0.9,
  anchor = 'start',
  mono = true,
}: {
  x: number
  y: number
  text: string
  color?: string
  size?: number
  opacity?: number
  anchor?: 'start' | 'middle' | 'end'
  mono?: boolean
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fill={color}
      opacity={opacity}
      textAnchor={anchor}
      fontFamily={mono ? MONO_HAN : HAN}
      style={{ letterSpacing: mono ? '0.16em' : '0.06em' }}
    >
      {text}
    </text>
  )
}

/** 一个带外框与角标的数据读数 */
export function Readout({
  x,
  y,
  label,
  value,
  color = CYAN,
  size = 30,
  unit,
}: {
  x: number
  y: number
  label: string
  value: string | number
  color?: string
  size?: number
  unit?: string
}) {
  return (
    <g>
      {/*
        标签现在是中文：0.4 倍字号在 1920 宽的成片里只有 10px 出头，
        汉字笔画糊成一团。提到 0.5 倍（13px 上下）才读得出来。
      */}
      <Tag x={x} y={y} text={label} color={color} size={size * 0.5} opacity={0.65} />
      <text
        x={x}
        y={y + size * 1.1}
        fontSize={size}
        fill={PAPER}
        fontFamily={MONO_HAN}
        style={{ letterSpacing: '0.04em' }}
      >
        {value}
        {unit ? <tspan fill={color} fontSize={size * 0.5}> {unit}</tspan> : null}
      </text>
    </g>
  )
}

/** 引线：从图上的一点拉到旁边的标注 */
export function Leader({
  x1,
  y1,
  x2,
  y2,
  color = CYAN,
  opacity = 0.6,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  color?: string
  opacity?: number
}) {
  return (
    <g opacity={opacity}>
      <Line x1={x1} y1={y1} x2={x2} y2={y2} color={color} width={0.9} />
      <circle cx={x1} cy={y1} r={2.6} fill={color} />
    </g>
  )
}

/** 一条光晕竖线（扫描线） */
export function Scanline({ x, y, h, color = CYAN, opacity = 0.5 }: { x: number; y: number; h: number; color?: string; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <rect x={x - 1.2} y={y} width={2.4} height={h} fill={color} />
      <rect x={x - 26} y={y} width={52} height={h} fill={color} opacity={0.09} />
    </g>
  )
}

/** 一组同心扩散的波纹（回声、水波、冲击波） */
export function Ripples({
  cx,
  cy,
  count = 5,
  radius = 40,
  step = 26,
  phase,
  color = CYAN,
  opacity = 0.5,
  width = 1.4,
}: {
  cx: number
  cy: number
  count?: number
  radius?: number
  step?: number
  phase: number
  color?: string
  opacity?: number
  width?: number
}) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const t = (phase + i / count) % 1
        const r = radius + t * step * count
        const a = (1 - t) * opacity
        if (a <= 0.01) return null
        return <Ring key={i} cx={cx} cy={cy} r={r} color={color} opacity={a} width={width} />
      })}
    </g>
  )
}

/** 轨道：椭圆轨道加一个行星 */
export function Orbit({
  cx,
  cy,
  rx,
  ry,
  angle,
  bodyR = 9,
  color = CYAN,
  bodyColor = PAPER,
  opacity = 0.3,
  trail = 0,
}: {
  cx: number
  cy: number
  rx: number
  ry: number
  angle: number
  bodyR?: number
  color?: string
  bodyColor?: string
  opacity?: number
  trail?: number
}) {
  const x = cx + Math.cos(angle) * rx
  const y = cy + Math.sin(angle) * ry
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={color} strokeWidth={0.8} opacity={opacity * 0.8} />
      {trail > 0 ? (
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={color}
          strokeWidth={2.4}
          opacity={opacity}
          strokeDasharray={trail}
          strokeDashoffset={-angle * 60}
        />
      ) : null}
      <circle cx={x} cy={y} r={bodyR} fill={bodyColor} opacity={0.95} />
      <circle cx={x} cy={y} r={bodyR * 2.6} fill={color} opacity={0.12} />
    </g>
  )
}

/** 程序化折线（山脉剖面）：用种子噪声生成，返回点列 */
export function ridgePoints(
  x0: number,
  x1: number,
  baseY: number,
  height: number,
  seed: number,
  steps = 160,
  octaves = 5,
  /** 基频：越大峰越密 */
  baseFreq = 4.2,
  /** 脊状：把噪声折成硬峰，山形才立得住 */
  ridged = true,
): Array<[number, number]> {
  const out: Array<[number, number]> = []
  const hash = (i: number, o: number) => {
    let h = (seed + i * 374761393 + o * 668265263) >>> 0
    h = (h ^ (h >>> 13)) >>> 0
    h = Math.imul(h, 1274126177) >>> 0
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  const smooth = (t: number) => t * t * (3 - 2 * t)
  for (let s = 0; s <= steps; s += 1) {
    const t = s / steps
    const x = x0 + (x1 - x0) * t
    let v = 0
    let amp = 1
    let freq = baseFreq
    let norm = 0
    for (let o = 0; o < octaves; o += 1) {
      const p = t * freq
      const i = Math.floor(p)
      const f = smooth(p - i)
      const a = hash(i, o)
      const b = hash(i + 1, o)
      v += (a + (b - a) * f) * amp
      norm += amp
      amp *= 0.52
      freq *= 2.07
    }
    v /= norm
    if (ridged) v = 1 - Math.abs(1 - 2 * v)
    out.push([x, baseY - v * height])
  }
  return out
}

export { alpha }
