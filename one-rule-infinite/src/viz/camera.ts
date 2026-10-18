/**
 * 镜头。
 *
 * 这里曾经是画面抖动的主要来源，所以现在有一条硬规矩：
 *
 *   镜头只能由「参数」决定，不能由「当前这一刻长到了哪儿」决定。
 *
 * 之前每帧都拿「正在生长的包围盒」和「正在生长的梢头」重新取景：
 *   - 包围盒每帧都不一样 -> 缩放每帧都在变 -> 整棵树看起来在呼吸；
 *   - 梢头会在不同枝条之间突然跳 -> 画面被甩一下一下地震动；
 *   - 第一根枝条出现前包围盒是空的 -> 取景从「原点特写」硬跳到「全景」。
 *
 * 现在镜头只认三样东西：
 *   1. 固定的包围盒 fitBounds()，一次算好；
 *   2. 每一代各自的取景 generationFramings()（只依赖参数，与当前帧无关）；
 *   3. 明确写下的关键帧 cameraAt()，每一段运动都有起点、终点与缓动。
 *
 * 于是生长过程中画面绝对稳定：枝条不会因为镜头而漂移，镜头也不会因为枝条而抽搐。
 */

import { boundsCenter, boundsSize, growBounds, type Bounds, unionBounds, EMPTY_BOUNDS } from '../lib/geometry'
import { growingGenerationAt, type GrowthPlan } from '../lib/growth'
import { clamp01, easeInOut } from '../lib/easing'

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
}

export function isValidBounds(bounds: Bounds): boolean {
  return (
    Number.isFinite(bounds.minX) &&
    Number.isFinite(bounds.maxX) &&
    Number.isFinite(bounds.minY) &&
    Number.isFinite(bounds.maxY)
  )
}

/**
 * 把一个**固定**的包围盒装进画面。
 *
 * 刻意不接受「正在生长的梢头」这类逐帧变化的目标：
 * 包围盒是常量，取景就是常量，画面就不会呼吸。
 */
export function fitBounds(bounds: Bounds, viewport: Viewport, options: FitOptions = {}): Camera {
  const padding = options.padding ?? 1.18
  const maxScale = options.maxScale ?? 2.4

  if (!isValidBounds(bounds)) {
    // 还没有任何枝条：画面停在「盯着生长点」的近景，等待第一根枝条把它带出去。
    // 这不是一次跳变，而是一段显式的起手镜头。
    return { x: 0, y: 0, scale: maxScale }
  }

  const center = boundsCenter(bounds)
  const size = boundsSize(bounds)
  const scale = Math.min(viewport.width / (size.width * padding), viewport.height / (size.height * padding), maxScale)
  return { x: center.x, y: center.y, scale: Math.max(0.02, scale) }
}

/** 镜头之间插值：位置线性，缩放按对数走（推拉在视觉上是匀速的） */
export function lerpCamera(a: Camera, b: Camera, t: number): Camera {
  const k = clamp01(t)
  const from = Math.max(1e-4, a.scale)
  const to = Math.max(1e-4, b.scale)
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    scale: Math.exp(Math.log(from) + (Math.log(to) - Math.log(from)) * k),
  }
}

export interface CameraKey {
  /** 时刻（0-1 或帧号都行，只要单位一致） */
  at: number
  camera: Camera
}

/**
 * 显式关键帧镜头：每一段运动都写清楚起点、终点与缓动。
 * 场景转场、拉远、俯冲都用它，而不是「每帧重新取景」。
 */
export function cameraAt(keys: CameraKey[], time: number, ease: (t: number) => number = easeInOut): Camera {
  if (keys.length === 0) return { x: 0, y: 0, scale: 1 }
  if (time <= keys[0].at) return keys[0].camera
  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i]
    const b = keys[i + 1]
    if (time <= b.at) {
      const span = Math.max(1e-6, b.at - a.at)
      return lerpCamera(a.camera, b.camera, ease((time - a.at) / span))
    }
  }
  return keys[keys.length - 1].camera
}

/** 第 g 代及以前长完的枝条的包围盒（固定值，只依赖参数） */
export function boundsForGeneration(plan: GrowthPlan, gen: number): Bounds {
  let bounds = EMPTY_BOUNDS
  for (const step of plan.steps) {
    if (step.segment.birthGen > gen) break
    const s = step.segment
    bounds = growBounds(bounds, s.x1, s.y1, s.width + 2)
    bounds = growBounds(bounds, s.x2, s.y2, s.width + 2)
  }
  return bounds
}

/** 整棵树长完之后的包围盒 */
export function boundsForAll(plan: GrowthPlan): Bounds {
  return boundsForGeneration(plan, plan.generations)
}

/**
 * 每一代各自的取景。
 *
 * framings[g] = 「第 g 代长完时，完整装下它需要什么镜头」。
 * 它只取决于参数，所以整个生长过程里镜头路线是完全确定的。
 * 又因为每一代的包围盒只会变大，取景只会平稳地拉远，不会来回呼吸。
 */
export function generationFramings(plan: GrowthPlan, viewport: Viewport, options: FitOptions = {}): Camera[] {
  const framings: Camera[] = []
  let bounds = EMPTY_BOUNDS
  for (let g = 0; g <= plan.generations; g += 1) {
    for (const step of plan.steps) {
      if (step.segment.birthGen !== g) continue
      const s = step.segment
      bounds = growBounds(bounds, s.x1, s.y1, s.width + 2)
      bounds = growBounds(bounds, s.x2, s.y2, s.width + 2)
    }
    framings[g] = fitBounds(bounds, viewport, options)
  }
  return framings
}

/**
 * 生长过程中的镜头：在「上一代长完的取景」与「这一代长完的取景」之间，
 * 按这一代的进度平滑推进。没有跟拍、没有包围盒追踪，因此不会抖。
 */
export function growthCamera(
  plan: GrowthPlan,
  framings: Camera[],
  time: number,
  options: { ease?: (t: number) => number } = {},
): Camera {
  if (framings.length === 0) return { x: 0, y: 0, scale: 1 }
  const gen = growingGenerationAt(plan, time)
  const from = gen > 0 ? plan.genEnd[gen - 1] : 0
  const to = plan.genEnd[gen] ?? from
  const raw = to > from ? (time - from) / (to - from) : 1
  const ease = options.ease ?? easeInOut
  const a = framings[Math.max(0, gen - 1)] ?? framings[0]
  const b = framings[Math.min(gen, framings.length - 1)] ?? a
  return lerpCamera(a, b, ease(raw))
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
  return (
    'translate(' +
    viewport.width / 2 +
    ' ' +
    viewport.height / 2 +
    ') scale(' +
    camera.scale +
    ') translate(' +
    -camera.x +
    ' ' +
    -camera.y +
    ')'
  )
}

export { EMPTY_BOUNDS, unionBounds }
