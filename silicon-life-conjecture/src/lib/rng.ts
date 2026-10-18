/**
 * 确定性随机数。
 *
 * 「同一幕的第 400 帧长什么样」必须可复现：网页里看到的与渲染成 MP4 的必须一模一样。
 * 所以整站不允许直接调用 Math.random()，一律从这里取种子随机数。
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 把任意字符串折成一个稳定的整数种子，方便用「碳」「硅」这样的名字取种子 */
export function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 围绕 0 的对称抖动，避免所有偏差都朝一个方向 */
export function jitter(rand: () => number, amount: number): number {
  return (rand() * 2 - 1) * amount
}

/** 从数组里确定性地取一个元素 */
export function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.min(items.length - 1, Math.floor(rand() * items.length))]
}
