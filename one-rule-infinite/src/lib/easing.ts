/** 确定性缓动：全部只吃数字，不吃时间对象，所以视频与网页永远一致。 */

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t)

export function range(frame: number, start: number, end: number): number {
  if (end <= start) return frame >= end ? 1 : 0
  return clamp01((frame - start) / (end - start))
}

export const easeOut = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3)

export const easeIn = (t: number): number => Math.pow(clamp01(t), 3)

export function easeInOut(t: number): number {
  const x = clamp01(t)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

/** 把一段动画包在 [from, to] 窗口里：淡入 + 淡出 */
export function windowFade(frame: number, from: number, to: number, fade = 12): number {
  return easeOut(range(frame, from, from + fade)) * (1 - easeIn(range(frame, to - fade, to)))
}

/** 在窗口之间平滑起伏：0 -> 1 -> 0 */
export function pulse(frame: number, from: number, to: number): number {
  const t = clamp01((frame - from) / Math.max(1e-6, to - from))
  return Math.sin(t * Math.PI)
}

/** 台阶：到点才跳变，用于「第几代」这种离散读数 */
export function stepped(frame: number, from: number, every: number, steps: number): number {
  if (frame < from) return 0
  return Math.min(steps, Math.floor((frame - from) / every) + 1)
}
