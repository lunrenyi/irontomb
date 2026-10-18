/**
 * 镜头。
 *
 * 生长不该只是「元素在原地越长越大」：镜头要跟着正在生长的那一端走，
 * 等树冠铺开时再平滑地拉远。镜头完全由帧号决定（不做状态记忆），
 * 所以网页和渲染出的 MP4 看到的运动完全一致。
 */

import { boundsCenter, boundsSize, type Bounds, EMPTY_BOUNDS } from '../lib/geometry'

export interface Camera {
  /** 世界坐标里被放在画面中心的那个点 */
  x: number
  y: number
  /** 每个世界单位对应多少像素 */
  scale: number
}

export interface Viewport {
  width: number
  height: number
}

export interface FitOptions {
  /** 画面四周留白比例 */
  padding?: number
  /** 最多放大到多少倍（防止刚发芽时糊屏） */
  maxScale?: number
  /** 最近多少比例都算「跟拍」 */
  tipWeight?: number
}

/** 镜头需要提前多久开始追：把镜头时间往后挪一点，画面就自然稳了 */
export const CAMERA_LAG = 0.055

/** 把包围盒装进画面，并让镜头略微偏向正在生长的那一端 */
export function fitCamera(
  bounds: Bounds,
  tip: { x: number; y: number } | null,
  viewport: Viewport,
  options: FitOptions = {},
): Camera {
  const padding = options.padding ?? 1.18
  const maxScale = options.maxScale ?? 2.4
  const tipWeight = options.tipWeight ?? 0.28

  if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.maxX)) {
    return { x: 0, y: 0, scale: maxScale }
  }

  const center = boundsCenter(bounds)
  const { width, height } = boundsSize(bounds)
  const scale = Math.min(viewport.width / (width * padding), viewport.height / (height * padding), maxScale)

  const focus = tip && Number.isFinite(tip.x) ? { x: center.x + (tip.x - center.x) * tipWeight, y: center.y + (tip.y - center.y) * tipWeight } : center
  return { x: focus.x, y: focus.y, scale: Math.max(0.02, scale) }
}

/** 把世界坐标投影到画布坐标 */
export function project(camera: Camera, viewport: Viewport, x: number, y: number) {
  return {
    x: viewport.width / 2 + (x - camera.x) * camera.scale,
    y: viewport.height / 2 + (y - camera.y) * camera.scale,
  }
}

/** 镜头变换矩阵：直接交给 SVG 的 <g transform> */
export function cameraTransform(camera: Camera, viewport: Viewport): string {
  return 'translate(' + viewport.width / 2 + ' ' + viewport.height / 2 + ') scale(' + camera.scale + ') translate(' + -camera.x + ' ' + -camera.y + ')'
}

export { EMPTY_BOUNDS }
