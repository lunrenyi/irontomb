/** 影片底色：极低对比度的网格与光晕，跨场景保持一致的空间感。 */

export function FilmBackdrop({ width, height }: { width: number; height: number }) {
  const motes = MOTE_POSITIONS.map((m, i) => (
    <circle key={i} cx={m[0]} cy={m[1]} r={m[2]} fill='#9fe8c4' opacity={0.1 + (i % 3) * 0.05} />
  ))
  return (
    <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} style={{ position: 'absolute', inset: 0, display: 'block' }} aria-hidden='true'>
      <defs>
        <radialGradient id='film-core' cx='50%' cy='44%' r='54%'>
          <stop offset='0%' stopColor='#3fbf8f' stopOpacity='0.1' />
          <stop offset='72%' stopColor='#060f0c' stopOpacity='0' />
        </radialGradient>
        <linearGradient id='film-floor' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor='#060f0c' stopOpacity='0' />
          <stop offset='100%' stopColor='#0a1a14' stopOpacity='0.6' />
        </linearGradient>
        <pattern id='film-grid' width='80' height='80' patternUnits='userSpaceOnUse'>
          <path d='M 80 0 L 0 0 0 80' fill='none' stroke='#7fb79c' strokeOpacity='0.05' strokeWidth='1' />
        </pattern>
      </defs>
      <rect width={width} height={height} fill='#060f0c' />
      <rect width={width} height={height} fill='url(#film-grid)' />
      <rect width={width} height={height} fill='url(#film-core)' />
      <g>{motes}</g>
      <rect width={width} height={height} fill='url(#film-floor)' />
    </svg>
  )
}

/** 固定的光点位置：写死而不是随机，保证每次渲染完全一致 */
const MOTE_POSITIONS: [number, number, number][] = [
  [240, 180, 2],
  [620, 96, 1.5],
  [1180, 150, 1.8],
  [1640, 260, 2.2],
  [380, 720, 1.6],
  [980, 880, 2],
  [1520, 800, 1.5],
  [1420, 60, 1.2],
  [820, 420, 1.3],
  [180, 460, 1.7],
]
