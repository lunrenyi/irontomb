/**
 * 影片背景：深空星场 + 坐标网格。
 *
 * 全部由程序生成，没有任何预制图片。
 * 星点是种子随机数决定的固定集合，只随时间做极缓慢的漂移，
 * 所以同一帧永远是同一片星空。
 */

import { mulberry32 } from '../lib/rng'
import { alpha, CYAN, GREEN, VIOLET, VOID } from './palette'

interface Star {
  x: number
  y: number
  r: number
  /** 闪烁相位 */
  p: number
  /** 颜色倾向 0 青 1 绿 2 紫 */
  c: number
}

const STARS: Star[] = (() => {
  const rand = mulberry32(20261020)
  const out: Star[] = []
  for (let i = 0; i < 420; i += 1) {
    out.push({
      x: rand() * 1920,
      y: rand() * 1080,
      r: 0.6 + rand() * 1.9,
      p: rand() * Math.PI * 2,
      c: rand(),
    })
  }
  return out
})()

const STAR_COLORS = [CYAN, GREEN, VIOLET]

export function FilmBackdrop({ width = 1920, height = 1080, frame = 0 }: { width?: number; height?: number; frame?: number }) {
  const t = frame / 30
  return (
    <svg
      width={width}
      height={height}
      viewBox={'0 0 ' + width + ' ' + height}
      style={{ position: 'absolute', inset: 0, display: 'block' }}
      aria-hidden='true'
    >
      <rect width={width} height={height} fill={VOID} />
      {/* 深空的底色梯度 */}
      <rect width={width} height={height} fill="url(#qz-nebula)" opacity={0.9} />
      {/* 坐标网格 */}
      <g opacity={0.32}>
        {Array.from({ length: 25 }, (_, i) => (
          <line key={'v' + i} x1={i * 80} y1={0} x2={i * 80} y2={height} stroke={CYAN} strokeWidth={0.5} opacity={0.14} />
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <line key={'h' + i} x1={0} y1={i * 80} x2={width} y2={height * 0 + i * 80} stroke={CYAN} strokeWidth={0.5} opacity={0.1} />
        ))}
      </g>
      {/* 星场 */}
      <g>
        {STARS.map((s, i) => {
          const tw = 0.55 + 0.45 * Math.sin(t * 0.9 + s.p)
          const drift = Math.sin(t * 0.06 + s.p * 0.3) * 4
          const c = STAR_COLORS[Math.min(2, Math.floor(s.c * 3))]
          return (
            <circle
              key={i}
              cx={s.x + drift}
              cy={s.y + Math.cos(t * 0.05 + s.p * 0.4) * 3}
              r={s.r}
              fill={c}
              opacity={0.22 + tw * 0.5}
            />
          )
        })}
      </g>
      {/* 扫描线：一道极慢下移的亮带 */}
      <rect
        x={0}
        y={((t * 26) % (height + 400)) - 200}
        width={width}
        height={220}
        fill="url(#qz-scan)"
        opacity={0.1}
      />
      <defs>
        <radialGradient id="qz-nebula" cx="0.72" cy="0.1" r="0.95">
          <stop offset="0%" stopColor="#12305e" stopOpacity={0.55} />
          <stop offset="45%" stopColor="#0a1a38" stopOpacity={0.4} />
          <stop offset="100%" stopColor={VOID} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="qz-scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CYAN} stopOpacity={0} />
          <stop offset="50%" stopColor={CYAN} stopOpacity={0.5} />
          <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** 页面用的背景装饰（不在影片里） */
export function PageBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(1100px_700px_at_78%_-10%,rgba(95,227,208,0.10),transparent_62%),radial-gradient(900px_620px_at_8%_18%,rgba(167,139,250,0.09),transparent_60%),radial-gradient(1200px_900px_at_50%_115%,rgba(3,6,14,0.96),transparent_66%)]" />
      <div className="qz-grid absolute inset-0 opacity-60" />
    </div>
  )
}

export { alpha }
