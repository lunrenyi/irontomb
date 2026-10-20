/**
 * 镜头。
 *
 * 硬规矩（踩过的坑）：**镜头只能由参数决定，不能由「这一帧长到哪儿了」决定。**
 *   - 每帧重新按当前包围盒取景 -> 缩放每帧都在变 -> 画面像在呼吸；
 *   - 镜头追着正在生长的东西跑 -> 画面被甩一下一下地震动。
 *
 * 所以这里只有两种镜头：
 *   1. `regionCamera` —— 一个模块的固定取景（常量）；
 *   2. `transitionCamera` —— 两段固定取景之间的显式飞行（关键帧写死）。
 *
 * 镜头永远不追踪正在变化的图形，于是同一帧永远得到同一画面：
 * 浏览器里播放的与导出成 MP4 的完全一致。
 */

import { clamp01, easeInOutSine } from './easing'

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

export const IDENTITY_CAMERA: Camera = { x: 0, y: 0, scale: 1 }

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
  /** 时刻（帧号或 0-1 比例，只要单位一致） */
  at: number
  camera: Camera
}

/** 显式关键帧镜头：每一段运动都写清楚起点、终点与缓动 */
export function cameraAt(keys: CameraKey[], time: number, ease: (t: number) => number = easeInOutSine): Camera {
  if (keys.length === 0) return IDENTITY_CAMERA
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

/**
 * 转场镜头：从 A 飞到 B，中途拉远一次。
 *
 * 这就是「连续镜头运动」的关键动作 ——
 * 不是两幕硬切，也不是两幕叠在一起，而是**镜头自己走过去**：
 *   起手 A（近）-> 拉远看清整张知识网络 -> 落到 B（近）。
 *
 * `t` 是 0..1 的转场进度。
 */
export function transitionCamera(a: Camera, b: Camera, t: number, dipScale = 0.42): Camera {
  const k = clamp01(t)
  // 用正弦缓动：镜头的速度曲线更平，推拉更像是「滑过去」而不是「甩过去」
  const eased = easeInOutSine(k)
  const base = lerpCamera(a, b, eased)
  // 中途最深的一次拉远：sin 曲线，两端回到 0，中间到 1
  const dip = Math.sin(k * Math.PI) * (1 - dipScale)
  return { x: base.x, y: base.y, scale: base.scale * (1 - dip) }
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
