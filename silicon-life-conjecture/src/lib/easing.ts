/** 确定性缓动：全部只吃数字，不吃时间对象，所以视频与网页永远一致。 */

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t)

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * clamp01(t)

export function range(frame: number, start: number, end: number): number {
  if (end <= start) return frame >= end ? 1 : 0
  return clamp01((frame - start) / (end - start))
}

export const easeOut = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3)

export function easeIn(t: number): number {
  return Math.pow(clamp01(t), 3)
}

export function easeInOut(t: number): number {
  const x = clamp01(t)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

/** 一段缓动：0 -> 1 -> 0，中途到顶 */
export function bell(frame: number, from: number, to: number): number {
  return Math.sin(clamp01((frame - from) / Math.max(1e-6, to - from)) * Math.PI)
}

/** 把一段动画包在 [from, to] 窗口里：淡入 + 淡出 */
export function windowFade(frame: number, from: number, to: number, fade = 12): number {
  return easeOut(range(frame, from, from + fade)) * (1 - easeIn(range(frame, to - fade, to)))
}

/** 台阶：到点才跳变，用于「第几代」「第几代指令」这种离散读数 */
export function stepped(frame: number, from: number, every: number, steps: number): number {
  if (frame < from) return 0
  return Math.min(steps, Math.floor((frame - from) / every) + 1)
}

/** 缓动后取整，用来做「每 n 帧换一次读数」 */
export function stageAt(frame: number, from: number, every: number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.floor((frame - from) / every)))
}

/** 平滑的周期性脉动，替代 Math.sin 保持可读 */
export function wobble(frame: number, period: number, phase = 0): number {
  return Math.sin(((frame / Math.max(1e-6, period)) * Math.PI * 2 + phase) % (Math.PI * 2))
}
