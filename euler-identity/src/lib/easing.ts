/**
 * 确定性的插值工具：网站（rAF 驱动）与视频（Remotion 帧驱动）共用同一套。
 * 这里不依赖 motion，也不依赖任何计时器 —— 同样的输入永远得到同样的画面。
 */

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t)

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** 把 frame 映射到 [0,1]，区间外截断 */
export const range = (frame: number, from: number, to: number): number =>
  to <= from ? (frame >= to ? 1 : 0) : clamp01((frame - from) / (to - from))

export const easeIn = (t: number): number => t * t
export const easeOut = (t: number): number => 1 - (1 - t) * (1 - t)
export const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** 轻微回弹，用于「落位」的强调 */
export const easeOutBack = (t: number): number => {
  const c1 = 1.24
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/** 区间内插值：frame 从 from 走到 to 时，value 从 a 走到 b */
export const seg = (frame: number, from: number, to: number, a: number, b: number, ease = easeInOut): number =>
  lerp(a, b, ease(range(frame, from, to)))

/** 脉冲：0 → 1 → 0，峰值在 t = 0.5 */
export const pulse = (frame: number, from: number, to: number, peak = 0.5): number => {
  const t = range(frame, from, to)
  return t < peak ? easeOut(t / peak) : easeIn(1 - (t - peak) / (1 - peak))
}

/** 角度插值走最短路径 */
export const lerpAngle = (a: number, b: number, t: number): number => {
  let delta = (b - a) % (Math.PI * 2)
  if (delta > Math.PI) delta -= Math.PI * 2
  if (delta < -Math.PI) delta += Math.PI * 2
  return a + delta * t
}

/** 逐段绘制：把 [0,1] 的进度切成若干步，用于「一个个点亮」的效果 */
export const stepped = (t: number, steps: number): number => Math.min(Math.ceil(t * steps), steps) / steps
