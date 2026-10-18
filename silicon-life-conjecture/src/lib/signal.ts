/**
 * 第一幕：模拟量怎么变成数字。
 *
 * 一条连续的光波先被采样（取有限个时刻的值），再被量化（把每个值落到有限档位），
 * 最后才得到一串 0 和 1。三步都真的算在这里，画面上的光点、竖线和数字都从它来。
 */

export const WAVE_KINDS = ['sine', 'chirp', 'beat'] as const
export type WaveKind = (typeof WAVE_KINDS)[number]

/** 一条确定性的波形。chirp 是频率逐渐升高的扫频，beat 是两个相近频率的叠加。 */
export function waveAt(t: number, kind: WaveKind = 'sine'): number {
  if (kind === 'chirp') return Math.sin(2 * Math.PI * (0.9 * t + 0.55 * t * t))
  if (kind === 'beat') return 0.72 * Math.sin(2 * Math.PI * 2.2 * t) + 0.28 * Math.sin(2 * Math.PI * 2.9 * t)
  return Math.sin(2 * Math.PI * 2.2 * t)
}

export interface Sample {
  index: number
  /** 采样时刻 */
  t: number
  /** 采样得到的连续值，-1 到 1 */
  value: number
}

/** 采样：等间隔取 N 个点。把连续世界切成有限信息的第一步。 */
export function sampleWave(duration: number, count: number, kind: WaveKind = 'sine', phase = 0): Sample[] {
  const out: Sample[] = []
  for (let i = 0; i < count; i += 1) {
    const t = phase + (duration * i) / count
    out.push({ index: i, t, value: waveAt(t, kind) })
  }
  return out
}

/** 量化：把每个采样值落到有限个档位上，得到一个整数。 */
export function quantize(samples: readonly Sample[], levels: number): number[] {
  if (levels < 2) throw new Error('量化至少要有两档')
  const step = 2 / (levels - 1)
  return samples.map((s) => {
    const shifted = (s.value + 1) / step
    return Math.min(levels - 1, Math.max(0, Math.round(shifted)))
  })
}

/** 二值化：只问「高于门限还是低于门限」，这就是一个比特。 */
export function thresholdBits(samples: readonly Sample[], threshold = 0): number[] {
  return samples.map((s) => (s.value >= threshold ? 1 : 0))
}

/** 一串比特按 8 位一组翻译成可打印字符 */
export function bitsToText(bits: readonly number[]): string {
  let out = ''
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let value = 0
    for (let b = 0; b < 8; b += 1) value = value * 2 + bits[i + b]
    out += value >= 32 && value < 127 ? String.fromCharCode(value) : '.'
  }
  return out
}

/* ------------------------------------------------------------ 像素与图像 */

/**
 * 一张程序生成的抽象图。
 * 没有任何图片素材，全是几何函数的叠加：径向渐变 + 一个环形 + 一条斜带。
 */
export function proceduralImage(size: number): number[][] {
  const out: number[][] = []
  const c = (size - 1) / 2
  for (let y = 0; y < size; y += 1) {
    const row: number[] = []
    for (let x = 0; x < size; x += 1) {
      const dx = (x - c) / c
      const dy = (y - c) / c
      const r = Math.hypot(dx, dy)
      const ring = Math.exp(-Math.pow((r - 0.58) * 7, 2))
      const core = Math.exp(-Math.pow(r * 2.6, 2))
      const band = Math.exp(-Math.pow((dx * 0.7 + dy * 0.7) * 4.2, 2)) * 0.55
      row.push(Math.min(1, Math.max(0, ring * 0.9 + core * 0.8 + band)))
    }
    out.push(row)
  }
  return out
}

export interface Pixel {
  x: number
  y: number
  value: number
  bit: number
}

/** 把一张图变成比特：每个像素问一次「亮不亮」，信息量真的降到 1 比特 / 像素。 */
export function imageToBits(image: readonly (readonly number[])[], threshold = 0.5): Pixel[] {
  const out: Pixel[] = []
  image.forEach((row, y) => {
    row.forEach((value, x) => {
      out.push({ x, y, value, bit: value >= threshold ? 1 : 0 })
    })
  })
  return out
}

/** 按行优先把像素比特排成一长串：0 和 1 的海洋就是从这里开始的 */
export const pixelsToBits = (pixels: readonly Pixel[]): number[] => pixels.map((p) => p.bit)
