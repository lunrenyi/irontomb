/**
 * 纯数学工具：角度、单位圆坐标、特殊角度、数值清洗、SVG 几何路径。
 * 这里不出现任何 React 或 DOM 依赖，便于独立测试。
 */

export const PI = Math.PI
export const TAU = Math.PI * 2
export const HALF_PI = Math.PI / 2

/** 小于该阈值的数值视为 0，用来消除浮点误差（sin π 约等于 1.2e-16） */
export const EPSILON = 1e-9

export interface SpecialAngle {
  /** 弧度值；2π 与 0 是同一方向，这里单列 2π 表示“转满一圈” */
  rad: number
  /** 数学写法，如 π/2 */
  label: string
  /** 位置含义 */
  note: string
  /** 该角度上精确的余弦值 */
  cos: number
  /** 该角度上精确的正弦值 */
  sin: number
}

export const SPECIAL_ANGLES: readonly SpecialAngle[] = [
  { rad: 0, label: '0', note: '正方向', cos: 1, sin: 0 },
  { rad: HALF_PI, label: '\u03c0/2', note: '正上方', cos: 0, sin: 1 },
  { rad: PI, label: '\u03c0', note: '正方向的反面', cos: -1, sin: 0 },
  { rad: (3 * PI) / 2, label: '3\u03c0/2', note: '正下方', cos: 0, sin: -1 },
  { rad: TAU, label: '2\u03c0', note: '转满一圈，回到起点', cos: 1, sin: 0 },
]

/** 把任意角度折算到 [0, 2π) */
export function normalizeAngle(theta: number): number {
  if (!Number.isFinite(theta)) return 0
  const wrapped = theta % TAU
  return wrapped < 0 ? wrapped + TAU : wrapped
}

/** 角度差（考虑环绕），返回 [0, π] 内的最短夹角 */
export function angleDistance(a: number, b: number): number {
  const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b))
  return Math.min(diff, TAU - diff)
}

export function toDegrees(theta: number): number {
  return (theta * 180) / PI
}

export function toRadians(degrees: number): number {
  return (degrees * PI) / 180
}

export interface Point {
  x: number
  y: number
}

/** 单位圆上的点（数学坐标系：y 轴向上） */
export function pointOnUnitCircle(theta: number): Point {
  return { x: Math.cos(theta), y: Math.sin(theta) }
}

/** 数学坐标系 → SVG 坐标系（SVG 的 y 轴向下，需要翻转） */
export function toSvgPoint(cx: number, cy: number, radius: number, theta: number): Point {
  return {
    x: cx + radius * Math.cos(theta),
    y: cy - radius * Math.sin(theta),
  }
}

/** 指针位置（SVG 用户坐标）→ 极角 */
export function angleFromSvgPointer(cx: number, cy: number, x: number, y: number): number {
  return normalizeAngle(Math.atan2(cy - y, x - cx))
}

export function findSpecialIndex(theta: number, tolerance = 0.045): number {
  // 明确落在 2π 上时保留「转满一圈」的写法（normalizeAngle 会把它折回 0，所以要先判断）
  if (theta >= TAU - 1e-6) return SPECIAL_ANGLES.length - 1
  const a = normalizeAngle(theta)
  let best = -1
  let bestDist = tolerance
  SPECIAL_ANGLES.forEach((special, index) => {
    const dist = angleDistance(a, special.rad)
    // 用严格小于：θ = 0 时应该判成 0，而不是同样距离的 2π
    if (dist < bestDist) {
      best = index
      bestDist = dist
    }
  })
  return best
}

/**
 * 特殊角度吸附。tolerance 默认约 2.6 度，只在指针本就靠近关键角度时轻微帮忙，
 * 不妨碍连续拖动。
 */
export function snapToSpecial(theta: number, tolerance = 0.045): { value: number; index: number } {
  const index = findSpecialIndex(theta, tolerance)
  if (index < 0) return { value: normalizeAngle(theta), index: -1 }
  const target = SPECIAL_ANGLES[index].rad
  return { value: target === TAU ? TAU : normalizeAngle(target), index }
}

export function getSpecial(theta: number, tolerance = 0.045): SpecialAngle | null {
  const index = findSpecialIndex(theta, tolerance)
  return index < 0 ? null : SPECIAL_ANGLES[index]
}

/** 消除 -0 与浮点毛刺 */
export function cleanNumber(value: number, epsilon = EPSILON): number {
  if (!Number.isFinite(value)) return 0
  if (Math.abs(value) < epsilon) return 0
  const rounded = Math.round(value * 1e12) / 1e12
  return Object.is(rounded, -0) ? 0 : rounded
}

/** 固定小数位展示，负零显示为 0 */
export function formatNumber(value: number, digits = 3): string {
  const clean = cleanNumber(value)
  const fixed = clean.toFixed(digits)
  return clean === 0 ? fixed.replace('-', '') : fixed
}

/** 读取器式展示：整数不补小数，小数最多保留 digits 位 */
export function formatTrimmed(value: number, digits = 3): string {
  const clean = cleanNumber(value)
  if (Number.isInteger(clean)) return String(clean)
  return clean.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '')
}

/** 实部 / 虚部的带符号展示，用于公式代入 */
export function formatSigned(value: number, digits = 2): string {
  const rounded = Number(cleanNumber(value).toFixed(digits))
  if (rounded === 0) return '0'
  const text = rounded.toFixed(digits).replace(/\.?0+$/, '')
  return rounded > 0 ? `+ ${text}` : text
}

/** 角度展示：命中特殊角度时给 π 的写法，否则给弧度 + 度数 */
export function formatAngle(theta: number): { radians: string; degrees: string; label: string | null } {
  const special = getSpecial(theta)
  if (special) {
    const deg = formatNumber(toDegrees(special.rad), 0)
    return {
      radians: special.label,
      degrees: `${deg}\u00b0`,
      label: special.label,
    }
  }
  return {
    radians: `${formatTrimmed(theta, 3)} rad`,
    degrees: `${formatNumber(toDegrees(theta), 1)}\u00b0`,
    label: null,
  }
}

/** 坐标展示：(cos θ, sin θ) */
export function formatPoint(theta: number, digits = 3): string {
  const special = getSpecial(theta)
  if (special) {
    // 特殊角度显示精确、干净的结果：(-1, 0) 而不是 (-1.000, 0.000)
    return `(${formatTrimmed(special.cos, digits)}, ${formatTrimmed(special.sin, digits)})`
  }
  const { x, y } = pointOnUnitCircle(theta)
  return `(${formatNumber(x, digits)}, ${formatNumber(y, digits)})`
}

export function degreesToTheta(degrees: number): number {
  return toRadians(degrees)
}

export function thetaToDegrees(theta: number): number {
  return toDegrees(normalizeAngle(theta))
}

/** 极坐标圆弧的 SVG path，方向始终为数学上的逆时针 */
export function arcPath(cx: number, cy: number, radius: number, from: number, to: number): string {
  const start = normalizeAngle(from)
  const sweep = normalizeAngle(to - from)
  const startPoint = toSvgPoint(cx, cy, radius, start)
  if (sweep < EPSILON) {
    return `M ${startPoint.x.toFixed(4)} ${startPoint.y.toFixed(4)}`
  }
  const end = toSvgPoint(cx, cy, radius, start + sweep)
  const largeArc = sweep > PI ? 1 : 0
  // SVG 的 y 轴翻转后，逆时针对应 sweep-flag = 0
  return `M ${startPoint.x.toFixed(4)} ${startPoint.y.toFixed(4)} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x.toFixed(4)} ${end.y.toFixed(4)}`
}

/** 完整圆（用于“回到 0”时的整圈轨迹） */
export function fullCirclePath(cx: number, cy: number, radius: number): string {
  const l = (cx - radius).toFixed(4)
  const r = (cx + radius).toFixed(4)
  return `M ${l} ${cy.toFixed(4)} A ${radius} ${radius} 0 1 1 ${r} ${cy.toFixed(4)} A ${radius} ${radius} 0 1 1 ${l} ${cy.toFixed(4)}`
}

export function quadraticPoint(p0: Point, c: Point, p1: Point, t: number): Point {
  const mt = 1 - t
  return {
    x: mt * mt * p0.x + 2 * mt * t * c.x + t * t * p1.x,
    y: mt * mt * p0.y + 2 * mt * t * c.y + t * t * p1.y,
  }
}

/** 在 [0,1] 上采样二次贝塞尔，交给 motion 做关键帧 */
export function sampleQuadratic(p0: Point, c: Point, p1: Point, steps = 24): Point[] {
  const points: Point[] = []
  for (let i = 0; i <= steps; i += 1) points.push(quadraticPoint(p0, c, p1, i / steps))
  return points
}
