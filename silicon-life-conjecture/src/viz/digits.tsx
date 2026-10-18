import { proceduralImage, sampleWave, thresholdBits, type Sample, type WaveKind } from '../lib/signal'
import { AMBER, BLUE, DEEP, FAINT, MONO, MUTED, SIGNAL, VIOLET, alpha } from './palette'

export interface WaveFigureProps {
  width: number
  height: number
  /** 0-1：扫描线从左向右推进 */
  progress: number
  /** 显示到第几个采样点 */
  revealed: number
  samples: readonly Sample[]
  bits: readonly number[]
}

export const makeWave = (count: number, kind: WaveKind = 'beat') => {
  const samples = sampleWave(1, count, kind)
  return { samples, bits: thresholdBits(samples) }
}

export { proceduralImage }

/**
 * 第一幕的主画面：一条连续的光波被一排采样点切开，
 * 每个点的电压再被门限切成 0 或 1。画面上竖线的高度就是真实的采样值。
 */
export function WaveFigure({ width, height, progress, revealed, samples, bits }: WaveFigureProps) {
  const midY = height * 0.5
  const amp = height * 0.3
  const span = width - 120
  const x0 = 60
  const path = samples
    .map((s, i) => {
      const x = x0 + (span * i) / Math.max(1, samples.length - 1)
      return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + (midY - s.value * amp).toFixed(1)
    })
    .join(' ')
  const scanX = x0 + span * Math.max(0, Math.min(1, progress))

  return (
    <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} className='block' role='img' aria-label='一条连续波形被采样并转换成二进制'>
      <line x1={30} y1={midY} x2={width - 30} y2={midY} stroke={alpha(BLUE, 0.35)} strokeWidth={1.2} strokeDasharray='6 8' />
      <text x={width - 34} y={midY - 10} fill={FAINT} fontSize={21} fontFamily={MONO} textAnchor='end'>
        0 V
      </text>
      <path d={path} fill='none' stroke={BLUE} strokeWidth={2.6} opacity={0.9} />
      <line x1={scanX} y1={height * 0.12} x2={scanX} y2={height * 0.94} stroke={AMBER} strokeWidth={1.6} opacity={0.6} />
      <circle cx={scanX} cy={height * 0.12} r={5} fill={AMBER} />
      {samples.slice(0, Math.min(revealed, samples.length)).map((s, i) => {
        const x = x0 + (span * i) / Math.max(1, samples.length - 1)
        const y = midY - s.value * amp
        const bit = bits[i] ?? 0
        return (
          <g key={i}>
            <line x1={x} y1={midY} x2={x} y2={y} stroke={bit ? AMBER : VIOLET} strokeOpacity={0.5} strokeWidth={1.4} />
            <circle cx={x} cy={y} r={4.6} fill={bit ? AMBER : VIOLET} />
          </g>
        )
      })}
    </svg>
  )
}

/** 采样点下方的那一排 0 / 1 */
export function BitRow({ x, y, bits, revealed, spacing = 34 }: { x: number; y: number; bits: readonly number[]; revealed: number; spacing?: number }) {
  return (
    <g role='img' aria-label='二进制比特流'>
      {bits.slice(0, Math.max(0, Math.min(revealed, bits.length))).map((bit, i) => (
        <g key={i}>
          <rect x={x + i * spacing - 15} y={y} width={30} height={40} rx={6} fill={bit ? alpha(AMBER, 0.2) : alpha(VIOLET, 0.14)} stroke={bit ? AMBER : VIOLET} strokeWidth={1.4} />
          <text x={x + i * spacing} y={y + 29} fill={bit ? AMBER : VIOLET} fontSize={28} fontFamily={MONO} textAnchor='middle'>
            {bit}
          </text>
        </g>
      ))}
    </g>
  )
}

export interface PixelFigureProps {
  x: number
  y: number
  size: number
  /** 0-1：连续的图像溶成方格像素的进度 */
  dissolve: number
  /** 0-1：像素进一步变成只有 0 和 1 */
  toBits: number
  cell: number
}

/**
 * 一张程序生成的抽象图，先溶成像素，再变成只有 0 和 1 的方格。
 * 从灰度到二值那一步，颜色信息真的被丢掉了 —— 这正是数字化的代价。
 */
export function PixelFigure({ x, y, size, dissolve, toBits, cell = 16 }: PixelFigureProps) {
  const image = proceduralImage(cell)
  const step = size / cell
  const tiles = []
  for (let row = 0; row < cell; row += 1) {
    for (let col = 0; col < cell; col += 1) {
      const value = image[row][col]
      const bit = value >= 0.5 ? 1 : 0
      const grey = Math.round(6 + value * 200)
      const fill = toBits > 0.5 ? (bit ? AMBER : alpha(VIOLET, 0.18)) : 'rgb(' + grey + ',' + grey + ',' + grey + ')'
      tiles.push(
        <rect
          key={col + '-' + row}
          x={x + col * step}
          y={y + row * step}
          width={step}
          height={step}
          fill={fill}
          opacity={dissolve}
        />,
      )
    }
  }
  return (
    <g role='img' aria-label={'一张抽象图像分解成 ' + cell + ' 乘 ' + cell + ' 个像素，再变成二进制'}>
      <defs>
        <radialGradient id={'img-smooth-' + x + '-' + y} cx='50%' cy='50%' r='50%'>
          <stop offset='0%' stopColor='#e8eef6' stopOpacity='0.92' />
          <stop offset='34%' stopColor='#9fb0c6' stopOpacity='0.72' />
          <stop offset='62%' stopColor='#39445c' stopOpacity='0.5' />
          <stop offset='100%' stopColor='#04060d' stopOpacity='0' />
        </radialGradient>
      </defs>
      {/* 连续的那张图：随着像素化推进逐渐让位给方格 */}
      <rect x={x} y={y} width={size} height={size} fill={'url(#img-smooth-' + x + '-' + y + ')'} opacity={Math.max(0, 1 - dissolve)} />
      <rect x={x - 4} y={y - 4} width={size + 8} height={size + 8} rx={6} fill='none' stroke={alpha(SIGNAL, 0.26)} strokeWidth={1.2} />
      {tiles}
    </g>
  )
}

export interface BitStreamProps {
  x: number
  y: number
  bits: readonly number[]
  perRow?: number
  cell?: number
  opacity?: number
  color?: string
}

/** 一长串二进制：影片里从像素流出来的那一段 */
export function BitStream({ x, y, bits, perRow = 32, cell = 26, opacity = 1, color = SIGNAL }: BitStreamProps) {
  return (
    <g opacity={opacity} role='img' aria-label='二进制比特流'>
      {bits.map((bit, i) => {
        const col = i % perRow
        const row = Math.floor(i / perRow)
        return (
          <g key={i}>
            <rect
              x={x + col * cell}
              y={y + row * cell}
              width={cell - 4}
              height={cell - 4}
              rx={4}
              fill={bit ? alpha(color, 0.24) : alpha(DEEP, 0.7)}
              stroke={bit ? color : alpha(color, 0.3)}
              strokeWidth={1}
            />
            <text
              x={x + col * cell + (cell - 4) / 2}
              y={y + row * cell + (cell - 4) / 2 + 6}
              fill={bit ? color : MUTED}
              fontSize={21}
              fontFamily={MONO}
              textAnchor='middle'
            >
              {bit}
            </text>
          </g>
        )
      })}
    </g>
  )
}
