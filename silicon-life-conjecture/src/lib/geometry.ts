/** 包围盒与基础几何：镜头取景与布局都靠它。 */

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export const EMPTY_BOUNDS: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }

export interface Point {
  x: number
  y: number
}

export function growBounds(bounds: Bounds, x: number, y: number, pad = 0): Bounds {
  return {
    minX: Math.min(bounds.minX, x - pad),
    minY: Math.min(bounds.minY, y - pad),
    maxX: Math.max(bounds.maxX, x + pad),
    maxY: Math.max(bounds.maxY, y + pad),
  }
}

export function unionBounds(a: Bounds, b: Bounds): Bounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }
}

export function isEmptyBounds(bounds: Bounds): boolean {
  return !Number.isFinite(bounds.minX) || !Number.isFinite(bounds.maxX)
}

export function boundsOfPoints(points: readonly Point[], pad = 0): Bounds {
  let out = EMPTY_BOUNDS
  for (const p of points) out = growBounds(out, p.x, p.y, pad)
  return out
}

export const boundsCenter = (b: Bounds): Point => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 })

export const boundsSize = (b: Bounds) => ({ width: b.maxX - b.minX, height: b.maxY - b.minY })

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

/** 一条二次贝塞尔曲线上的点，用于画树突、轴突与电路走线 */
export function quadPoint(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  }
}

/** 取二次贝塞尔曲线的控制点（画程序化枝条时用它做递归） */
export function quadControl(a: Point, b: Point, angle: number, ratio: number): Point {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return {
    x: mid.x + (-dy / len) * Math.sin(angle) * len * ratio,
    y: mid.y + (dx / len) * Math.sin(angle) * len * ratio,
  }
}

export function quadraticPath(a: Point, c: Point, b: Point): string {
  return 'M ' + a.x.toFixed(2) + ' ' + a.y.toFixed(2) + ' Q ' + c.x.toFixed(2) + ' ' + c.y.toFixed(2) + ' ' + b.x.toFixed(2) + ' ' + b.y.toFixed(2)
}

export function polylinePath(points: readonly Point[]): string {
  if (points.length === 0) return ''
  return points.map((p, i) => (i === 0 ? 'M ' : 'L ') + p.x.toFixed(2) + ' ' + p.y.toFixed(2)).join(' ')
}
