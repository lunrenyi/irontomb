import { memo } from 'react'
import { formatNumber, fullCirclePath, normalizeAngle, TAU } from '../lib/math'
import { DashArc } from './parts'

export interface UnitCircleFigureProps {
  cx: number
  cy: number
  r: number
  /** 当前角度（弧度） */
  theta: number
  /** 画布尺寸；不传则自动取以圆心为中心的一圈 */
  viewBox?: string
  width?: number | string
  height?: number | string
  showSweep?: boolean
  showProjections?: boolean
  showVector?: boolean
  showPoint?: boolean
  showTicks?: boolean
  showAxisLabels?: boolean
  showOriginLabel?: boolean
  /** 已走过的角度区间（用于画出发光轨迹），undefined 表示不画 */
  traceFrom?: number
  traceTo?: number
  sweepColor?: string
  vectorColor?: string
  circleOpacity?: number
  labelStyle?: { fill?: string; fontSize?: number; fontFamily?: string; opacity?: number }
}

/**
 * 单位圆：影片与互动实验室共用的同一个图形。
 * 只接受数值 —— 不含 motion、不含帧号 —— 所以两边渲染结果必然一致。
 */
export function UnitCircleFigure({
  cx,
  cy,
  r,
  theta,
  viewBox,
  width = '100%',
  height = '100%',
  showSweep = false,
  showProjections = false,
  showVector = true,
  showPoint = true,
  showTicks = true,
  showAxisLabels = true,
  showOriginLabel = true,
  traceFrom,
  traceTo,
  sweepColor = '#f2b134',
  vectorColor = '#4fe3c1',
  circleOpacity = 1,
  labelStyle,
}: UnitCircleFigureProps) {
  const angle = normalizeAngle(theta)
  const px = cx + r * Math.cos(angle)
  const py = cy - r * Math.sin(angle)
  const pad = r * 0.42
  const box = viewBox ?? [cx - r - pad, cy - r - pad, (r + pad) * 2, (r + pad) * 2].join(' ')
  const traceStart = traceFrom ?? 0
  const traceSweep = Math.max(0, (traceTo ?? angle) - traceStart)

  return (
    <svg viewBox={box} width={width} height={height} style={{ display: 'block', overflow: 'visible' }} aria-hidden='true'>
      <defs>
        <radialGradient id={'uc-disc-' + cx + '-' + cy}>
          <stop offset='0%' stopColor={vectorColor} stopOpacity='0.08' />
          <stop offset='100%' stopColor={vectorColor} stopOpacity='0' />
        </radialGradient>
        <linearGradient id={'uc-trace-' + cx + '-' + cy} x1='0' y1='1' x2='1' y2='0'>
          <stop offset='0%' stopColor={vectorColor} stopOpacity='0.05' />
          <stop offset='65%' stopColor={vectorColor} stopOpacity='0.45' />
          <stop offset='100%' stopColor={vectorColor} stopOpacity='0.95' />
        </linearGradient>
      </defs>

      {/* 圆盘 */}
      <circle cx={cx} cy={cy} r={r} fill={'url(#uc-disc-' + cx + '-' + cy + ')'} />

      {/* 象限参考线 */}
      <g stroke='#8ea4bf' strokeOpacity='0.1' strokeWidth='1'>
        <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} />
        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} />
      </g>

      {/* 坐标轴 */}
      <g strokeWidth='1.4' strokeLinecap='round'>
        <line x1={cx - r * 1.34} y1={cy} x2={cx + r * 1.3} y2={cy} stroke={vectorColor} strokeOpacity='0.4' />
        <line x1={cx} y1={cy + r * 1.34} x2={cx} y2={cy - r * 1.3} stroke='#b9a6ff' strokeOpacity='0.38' />
      </g>

      {/* 单位圆 */}
      <circle cx={cx} cy={cy} r={r} fill='none' stroke='#8ea4bf' strokeOpacity={0.34 * circleOpacity} strokeWidth='1.6' />

      {showTicks ? (
        <g fill='#8ea4bf' fontSize={13 * (r / 330)} fontFamily="'Inter', sans-serif">
          <circle cx={cx + r} cy={cy} r='3' fill={vectorColor} />
          <circle cx={cx - r} cy={cy} r='3' />
          <circle cx={cx} cy={cy - r} r='3' fill='#b9a6ff' />
          <circle cx={cx} cy={cy + r} r='3' fill='#b9a6ff' />
        </g>
      ) : null}

      {showAxisLabels ? (
        <g
          fill={labelStyle?.fill ?? '#8ea4bf'}
          fontSize={(labelStyle?.fontSize ?? 26) * (r / 330)}
          fontFamily={labelStyle?.fontFamily ?? "'Inter', sans-serif"}
          opacity={labelStyle?.opacity ?? 1}
        >
          <text x={cx + r + 26} y={cy + 10} fill={vectorColor}>1</text>
          <text x={cx - r - 26} y={cy + 10} textAnchor='end'>-1</text>
          <text x={cx - 20} y={cy - r - 24} textAnchor='end' fill='#b9a6ff'>i</text>
          <text x={cx - 20} y={cy + r + 34} textAnchor='end' fill='#b9a6ff'>-i</text>
          {showOriginLabel ? <text x={cx + 16} y={cy + 30}>0</text> : null}
        </g>
      ) : null}

      {/* 发光轨迹 */}
      {traceSweep > 0.001 ? (
        <DashArc
          d={fullCirclePath(cx, cy, r)}
          length={Math.min(traceSweep / TAU, 1)}
          offset={traceStart / TAU}
          stroke={'url(#uc-trace-' + cx + '-' + cy + ')'}
          strokeWidth={r * 0.016}
        />
      ) : null}

      {/* 角度弧 */}
      {showSweep && angle > 0.001 ? (
        <DashArc
          d={fullCirclePath(cx, cy, r * 0.26)}
          length={Math.min(angle / TAU, 1)}
          stroke={sweepColor}
          strokeWidth={r * 0.012}
          strokeOpacity={0.9}
        />
      ) : null}

      {/* 坐标投影 */}
      {showProjections ? (
        <g>
          <line x1={px} y1={py} x2={px} y2={cy} stroke={vectorColor} strokeOpacity='0.3' strokeWidth='1.4' strokeDasharray='7 7' />
          <line x1={px} y1={py} x2={cx} y2={py} stroke='#b9a6ff' strokeOpacity='0.3' strokeWidth='1.4' strokeDasharray='7 7' />
          <line x1={cx} y1={cy} x2={px} y2={cy} stroke={vectorColor} strokeOpacity='0.75' strokeWidth={r * 0.014} />
          <line x1={cx} y1={cy} x2={cx} y2={py} stroke='#b9a6ff' strokeOpacity='0.7' strokeWidth={r * 0.014} />
        </g>
      ) : null}

      {/* 向量与点 */}
      {showVector ? (
        <line x1={cx} y1={cy} x2={px} y2={py} stroke={vectorColor} strokeWidth={r * 0.017} strokeLinecap='round' opacity='0.95' />
      ) : null}
      {showPoint ? (
        <g>
          <circle cx={px} cy={py} r={r * 0.055} fill={vectorColor} fillOpacity='0.16' />
          <circle cx={px} cy={py} r={r * 0.032} fill={vectorColor} />
          <circle cx={px} cy={py} r={r * 0.032} fill='none' stroke='#05070f' strokeOpacity='0.6' strokeWidth='1.5' />
        </g>
      ) : null}
    </svg>
  )
}

/** 只在圆心 / 半径 / 样式变化时重绘，省掉每帧的静态部分开销 */
export const UnitCircleFigureStatic = memo(function UnitCircleFigureStatic(props: UnitCircleFigureProps) {
  const { theta, showSweep, showProjections, traceFrom, traceTo, ...rest } = props
  void theta
  void showSweep
  void showProjections
  void traceFrom
  void traceTo
  return <UnitCircleFigure {...(rest as UnitCircleFigureProps)} theta={0} showSweep={false} showProjections={false} />
})

/** 读取当前点坐标的显示文本 */
export function pointLabel(theta: number): string {
  const x = Math.cos(theta)
  const y = Math.sin(theta)
  return '(' + formatNumber(x, 2) + ', ' + formatNumber(y, 2) + ')'
}
