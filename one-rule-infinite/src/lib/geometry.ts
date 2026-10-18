/** 纯几何工具：包围盒、二次贝塞尔、极坐标。与渲染无关，方便单测。 */

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export const EMPTY_BOUNDS: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }

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

export function boundsSize(bounds: Bounds): { width: number; height: number } {
  return { width: Math.max(1e-6, bounds.maxX - bounds.minX), height: Math.max(1e-6, bounds.maxY - bounds.minY) }
}

export function boundsCenter(bounds: Bounds): { x: number; y: number } {
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 }
}

export function polar(x: number, y: number, length: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  return { x: x + Math.cos(rad) * length, y: y + Math.sin(rad) * length }
}

/** 把直线加一点弧度，得到更像真实枝条的二次贝塞尔 */
export function curvedControl(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bendDeg: number,
): { cx: number; cy: number } {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.max(1e-6, Math.hypot(dx, dy))
  const nx = -dy / len
  const ny = dx / len
  const offset = Math.tan((bendDeg * Math.PI) / 180) * (len / 2)
  return { cx: mx + nx * offset, cy: my + ny * offset }
}

/** 二次贝塞尔求点：把叶片、拖尾、光点定位到路径上 */
export function quadAt(t: number, x1: number, y1: number, cx: number, cy: number, x2: number, y2: number) {
  const u = 1 - t
  return {
    x: u * u * x1 + 2 * u * t * cx + t * t * x2,
    y: u * u * y1 + 2 * u * t * cy + t * t * y2,
  }
}

export function quadPath(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number): string {
  return 'M ' + x1 + ' ' + y1 + ' Q ' + cx + ' ' + cy + ' ' + x2 + ' ' + y2
}
