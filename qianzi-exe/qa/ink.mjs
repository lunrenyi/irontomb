/**
 * 量字幕「笔画」的浓淡：拿有字幕的一帧和无字幕的一帧相减，
 * 只留下「这一帧比那一帧明显变亮」的像素 —— 那就是文字本身，
 * 背景与星点会被自动排除。
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const raster = (file) => {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '/tmp/_ink.rgb'])
  return readFileSync('/tmp/_ink.rgb')
}

const withText = raster(process.argv[2])
const without = raster(process.argv[3])
const Y0 = Number(process.argv[4] || 920)
const Y1 = Number(process.argv[5] || 990)
const W = 1920

let peak = 0
let peakRGB = [0, 0, 0]
let n = 0
let sum = 0
const hist = new Array(9).fill(0)

for (let y = Y0; y < Y1; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3
    const r = withText[i]
    const g = withText[i + 1]
    const b = withText[i + 2]
    // 只认「因为字幕出现而变亮」的像素
    if (r < without[i] + 40 && g < without[i + 1] + 40) continue
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
    n += 1
    sum += l
    if (l > peak) { peak = l; peakRGB = [r, g, b] }
    hist[Math.min(8, Math.floor(l / 32))] += 1
  }
}

process.stdout.write(
  '笔画像素 ' + n +
  ' | 平均亮度 ' + (n ? Math.round(sum / n) : 0) +
  ' | 峰值 RGB ' + peakRGB.join(',') + ' (' + Math.round(peak) + ')\n' +
  '亮度分布 ' + hist.map((c) => String(c).padStart(4)).join('') +
  '   ← 每格 32 亮度：' + hist.map((c, k) => (c ? k * 32 + '+' : '')).filter(Boolean).join(' ') + '\n',
)
