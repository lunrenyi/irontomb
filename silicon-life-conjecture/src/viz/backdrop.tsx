import { alpha, BLUE, DEEP, NAVY, SIGNAL, VIOLET } from './palette'

/**
 * 影片底色：星点 + 极低对比度的网格 + 一层缓慢漂移的星云光。
 * 星点位置写死而不是随机，保证每一次渲染完全一致。
 */
export function FilmBackdrop({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} style={{ position: 'absolute', inset: 0, display: 'block' }} aria-hidden='true'>
      <defs>
        <radialGradient id='slc-nebula' cx='50%' cy='46%' r='62%'>
          <stop offset='0%' stopColor={BLUE} stopOpacity='0.09' />
          <stop offset='45%' stopColor={VIOLET} stopOpacity='0.05' />
          <stop offset='78%' stopColor={DEEP} stopOpacity='0' />
        </radialGradient>
        <linearGradient id='slc-floor' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor={DEEP} stopOpacity='0' />
          <stop offset='100%' stopColor={NAVY} stopOpacity='0.42' />
        </linearGradient>
        <pattern id='slc-grid' width='96' height='96' patternUnits='userSpaceOnUse'>
          <path d='M 96 0 L 0 0 0 96' fill='none' stroke={SIGNAL} strokeOpacity='0.045' strokeWidth='1' />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={DEEP} />
      <rect width={width} height={height} fill='url(#slc-grid)' />
      <g>{STARS.map((s, i) => (
        <circle key={i} cx={s[0]} cy={s[1]} r={s[2]} fill={s[3]} opacity={s[4]} />
      ))}</g>
      <rect width={width} height={height} fill='url(#slc-nebula)' />
      <rect width={width} height={height} fill='url(#slc-floor)' />
    </svg>
  )
}

/** 星点：位置、半径、颜色、亮度全部写死 */
const STARS: Array<[number, number, number, string, number]> = [
  [180, 140, 2.1, '#ffffff', 0.5],
  [520, 90, 1.5, SIGNAL, 0.42],
  [900, 210, 1.9, '#ffffff', 0.34],
  [1380, 120, 2.4, BLUE, 0.4],
  [1760, 260, 1.6, '#ffffff', 0.3],
  [300, 620, 1.7, VIOLET, 0.36],
  [760, 880, 2.2, '#ffffff', 0.28],
  [1240, 760, 1.4, SIGNAL, 0.38],
  [1620, 900, 1.8, '#ffffff', 0.26],
  [110, 380, 1.3, '#ffffff', 0.3],
  [1420, 480, 2, BLUE, 0.28],
  [640, 420, 1.2, '#ffffff', 0.24],
  [1860, 620, 1.5, SIGNAL, 0.3],
  [420, 1000, 1.7, '#ffffff', 0.22],
  [1020, 1020, 1.9, VIOLET, 0.3],
  [1500, 180, 1.1, '#ffffff', 0.26],
  [260, 300, 1.2, BLUE, 0.3],
  [1320, 960, 1.4, '#ffffff', 0.22],
  [1720, 80, 1.8, '#ffffff', 0.3],
  [860, 640, 1, SIGNAL, 0.3],
]

/** 页面背景上那层缓慢呼吸的辉光 */
export function BackdropGlow({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} style={{ display: 'block' }} aria-hidden='true'>
      <defs>
        <radialGradient id='page-glow' cx='30%' cy='20%' r='70%'>
          <stop offset='0%' stopColor={BLUE} stopOpacity='0.1' />
          <stop offset='60%' stopColor={VIOLET} stopOpacity='0.04' />
          <stop offset='100%' stopColor={DEEP} stopOpacity='0' />
        </radialGradient>
      </defs>
      <rect width={width} height={height} fill='url(#page-glow)' />
      <g>{STARS.slice(0, 12).map((s, i) => (
        <circle key={i} cx={(s[0] / 1920) * width} cy={(s[1] / 1080) * height} r={s[2] * 0.6} fill={s[3]} opacity={alpha(s[3], s[4] * 0.7)} />
      ))}</g>
    </svg>
  )
}
