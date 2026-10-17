import { useCallback, useEffect, useId, useMemo, useReducer, useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { motion, useTransform, type MotionValue } from 'motion/react'
import {
  TAU,
  angleFromSvgPointer,
  findSpecialIndex,
  fullCirclePath,
  normalizeAngle,
  snapToSpecial,
  toSvgPoint,
} from '../lib/math'
import { rotationStore, thetaMotion } from '../state/rotationStore'
import { DashArc } from './DashPath'

export const VIEW_BOX = 320
export const CIRCLE_RADIUS = 100

const SPEED_OF_LIGHT = '#4fe3c1'
const IMAGINARY = '#b9a6ff'
const NODE = '#f2b134'

export interface UnitCircleProps {
  /** 驱动角度；缺省时使用全局旋转状态 */
  theta?: MotionValue<number>
  /** 是否允许拖动（写回全局旋转状态） */
  interactive?: boolean
  showSweep?: boolean
  showTrail?: boolean
  showProjections?: boolean
  showAngleText?: boolean
  showTicks?: boolean
  showThemedAxes?: boolean
  sweepColor?: string
  vectorColor?: string
  className?: string
  ariaLabel?: string
  onUserTheta?: (theta: number) => void
  onDragChange?: (dragging: boolean) => void
  onSnap?: (index: number) => void
}

/** 画布坐标（SVG 用户单位）→ 角度 */
function userPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const rect = svg.getBoundingClientRect()
  const size = Math.min(rect.width, rect.height) || 1
  const offsetX = (rect.width - size) / 2
  const offsetY = (rect.height - size) / 2
  return {
    x: -CIRCLE_RADIUS - 60 + ((clientX - rect.left - offsetX) / size) * VIEW_BOX,
    y: -CIRCLE_RADIUS - 60 + ((clientY - rect.top - offsetY) / size) * VIEW_BOX,
  }
}

/**
 * 单位圆：整个网站的核心数学图形。
 * 角度只有一个来源（MotionValue），所有元素都由它派生，
 * 因此点、向量、圆弧、投影永远不会与数值脱节。
 */
export function UnitCircle({
  theta,
  interactive = false,
  showSweep = true,
  showTrail = false,
  showProjections = true,
  showAngleText = true,
  showTicks = true,
  showThemedAxes = true,
  sweepColor = NODE,
  vectorColor = SPEED_OF_LIGHT,
  className,
  ariaLabel = '单位圆，拖动圆周上的点可以改变角度',
  onUserTheta,
  onDragChange,
  onSnap,
}: UnitCircleProps) {
  const uid = useId().replace(/:/g, '')
  const svgRef = useRef<SVGSVGElement | null>(null)
  const angle = theta ?? thetaMotion

  const cosT = useTransform(angle, (v) => Math.cos(v))
  const sinT = useTransform(angle, (v) => Math.sin(v))
  const px = useTransform(cosT, (v) => v * CIRCLE_RADIUS)
  const py = useTransform(sinT, (v) => -v * CIRCLE_RADIUS)

  // 从 0 扫到当前角度的圆弧（逆时针）
  const sweepFrac = useTransform(angle, (v) => Math.min(normalizeAngle(v), TAU) / TAU)
  const arcTipX = useTransform(angle, (v) => CIRCLE_RADIUS * 0.3 * Math.cos(v))
  const arcTipY = useTransform(angle, (v) => -CIRCLE_RADIUS * 0.3 * Math.sin(v))

  const handlePointer = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      const svg = svgRef.current
      if (!svg) return
      const p = userPoint(svg, event.clientX, event.clientY)
      const distance = Math.hypot(p.x, p.y) / CIRCLE_RADIUS
      // 触摸端放宽命中范围，桌面端避免误拖
      if (distance > 1.35) return
      const raw = angleFromSvgPointer(0, 0, p.x, p.y)
      const snapped = event.pointerType === 'touch' ? { value: raw, index: -1 } : snapToSpecial(raw)
      rotationStore.setTheta(snapped.value, 'user')
      onUserTheta?.(snapped.value)
      if (snapped.index >= 0) onSnap?.(snapped.index)
    },
    [onSnap, onUserTheta],
  )

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      if (!interactive) return
      const svg = svgRef.current
      if (!svg) return
      const p = userPoint(svg, event.clientX, event.clientY)
      if (Math.hypot(p.x, p.y) / CIRCLE_RADIUS > 1.35) return
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // 某些环境（合成事件 / 指针已释放）下捕获会失败，不影响拖动本身
      }
      rotationStore.takeControl()
      rotationStore.setDragging(true)
      onDragChange?.(true)
      handlePointer(event)
    },
    [handlePointer, interactive, onDragChange],
  )

  const endDrag = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      if (!interactive) return
      try {
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
      } catch {
        // 同上：释放失败可以安全忽略
      }
      rotationStore.setDragging(false)
      onDragChange?.(false)
    },
    [interactive, onDragChange],
  )

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGSVGElement>) => {
      if (!interactive) return
      const current = thetaMotion.get()
      const stepSize = event.shiftKey ? Math.PI / 12 : Math.PI / 180
      let next: number | null = null
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = current + stepSize
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = current - stepSize
      else if (event.key === 'PageUp') next = Math.min(current + Math.PI / 4, TAU)
      else if (event.key === 'PageDown') next = Math.max(current - Math.PI / 4, 0)
      else if (event.key === 'Home') next = 0
      else if (event.key === 'End') next = TAU
      if (next === null) return
      event.preventDefault()
      rotationStore.takeControl()
      rotationStore.setTheta(normalizeAngle(next === TAU ? TAU : next), 'user')
      onUserTheta?.(next)
    },
    [interactive, onUserTheta],
  )

  // 交互模式下把角度写进 ARIA 属性，让屏幕阅读器也能读到当前值
  useEffect(() => {
    const node = svgRef.current
    if (!node || !interactive) return
    const write = (value: number) => {
      const degrees = Math.round((value * 180) / Math.PI)
      node.setAttribute('aria-valuenow', String(degrees))
      const index = findSpecialIndex(value)
      if (index >= 0 && value > TAU - 1e-6) node.setAttribute('aria-valuetext', '2π 弧度，360 度')
      else if (index >= 0) node.setAttribute('aria-valuetext', '特殊角度，' + degrees + ' 度')
      else node.setAttribute('aria-valuetext', value.toFixed(2) + ' 弧度，' + degrees + ' 度')
    }
    write(angle.get())
    return angle.on('change', write)
  }, [angle, interactive])

  return (
    <svg
      ref={svgRef}
      viewBox={'-160 -160 320 320'}
      className={className}
      role={interactive ? 'slider' : 'img'}
      aria-label={ariaLabel}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? 360 : undefined}
      tabIndex={interactive ? 0 : -1}
      onKeyDown={onKeyDown}
    >
      <defs>
        <marker
          id={uid + '-arrow-vector'}
          viewBox='0 0 10 10'
          refX='6'
          refY='5'
          markerWidth='5'
          markerHeight='5'
          orient='auto-start-reverse'
        >
          <path d='M 0 1 L 9 5 L 0 9 z' fill={vectorColor} />
        </marker>
        <marker
          id={uid + '-arrow-sweep'}
          viewBox='0 0 10 10'
          refX='5'
          refY='5'
          markerWidth='4.5'
          markerHeight='4.5'
          orient='auto-start-reverse'
        >
          <path d='M 0 1.5 L 8.5 5 L 0 8.5 z' fill={sweepColor} />
        </marker>
        <marker
          id={uid + '-arrow-axis'}
          viewBox='0 0 10 10'
          refX='6'
          refY='5'
          markerWidth='4'
          markerHeight='4'
          orient='auto-start-reverse'
        >
          <path d='M 0 1.5 L 8 5 L 0 8.5 z' fill={SPEED_OF_LIGHT} />
        </marker>
        <marker
          id={uid + '-arrow-axis-imag'}
          viewBox='0 0 10 10'
          refX='6'
          refY='5'
          markerWidth='4'
          markerHeight='4'
          orient='auto-start-reverse'
        >
          <path d='M 0 1.5 L 8 5 L 0 8.5 z' fill={IMAGINARY} />
        </marker>
        <radialGradient id={uid + '-disc'} cx='50%' cy='50%' r='50%'>
          <stop offset='0%' stopColor={vectorColor} stopOpacity='0.10' />
          <stop offset='100%' stopColor={vectorColor} stopOpacity='0' />
        </radialGradient>
        <linearGradient id={uid + '-trail'} x1='0' y1='1' x2='1' y2='0'>
          <stop offset='0%' stopColor={vectorColor} stopOpacity='0' />
          <stop offset='70%' stopColor={vectorColor} stopOpacity='0.35' />
          <stop offset='100%' stopColor={vectorColor} stopOpacity='0.95' />
        </linearGradient>
      </defs>

      {/* 圆盘底色 */}
      <circle cx='0' cy='0' r={CIRCLE_RADIUS} fill={'url(#' + uid + '-disc)'} />

      {/* 单位圆内网格 */}
      <g stroke='#8ea4bf' strokeOpacity='0.12' strokeWidth='1'>
        <line x1={-CIRCLE_RADIUS} y1={-CIRCLE_RADIUS / 2} x2={CIRCLE_RADIUS} y2={-CIRCLE_RADIUS / 2} />
        <line x1={-CIRCLE_RADIUS} y1={CIRCLE_RADIUS / 2} x2={CIRCLE_RADIUS} y2={CIRCLE_RADIUS / 2} />
        <line x1={-CIRCLE_RADIUS / 2} y1={-CIRCLE_RADIUS} x2={-CIRCLE_RADIUS / 2} y2={CIRCLE_RADIUS} />
        <line x1={CIRCLE_RADIUS / 2} y1={-CIRCLE_RADIUS} x2={CIRCLE_RADIUS / 2} y2={CIRCLE_RADIUS} />
      </g>

      {/* 坐标轴 */}
      <g className='hairline' strokeWidth='1.25'>
        <line x1={-CIRCLE_RADIUS - 34} y1='0' x2={CIRCLE_RADIUS + 34} y2='0' stroke={showThemedAxes ? SPEED_OF_LIGHT : '#8ea4bf'} strokeOpacity='0.55' markerEnd={'url(#' + uid + '-arrow-axis)'} />
        <line x1='0' y1={CIRCLE_RADIUS + 34} x2='0' y2={-CIRCLE_RADIUS - 34} stroke={showThemedAxes ? IMAGINARY : '#8ea4bf'} strokeOpacity='0.45' markerEnd={'url(#' + uid + '-arrow-axis-imag)'} />
      </g>

      {/* 单位圆 */}
      <circle
        cx='0'
        cy='0'
        r={CIRCLE_RADIUS}
        fill='none'
        stroke='#8ea4bf'
        strokeOpacity='0.3'
        strokeWidth='1.25'
      />

      {/* 刻度与标签 */}
      {showTicks ? (
        <g fontSize='13' fill='#8ea4bf' fillOpacity='0.85' fontFamily='ui-sans-serif, system-ui'>
          <text x={CIRCLE_RADIUS + 12} y='4' fill={SPEED_OF_LIGHT}>1</text>
          <text x={-CIRCLE_RADIUS - 12} y='4' textAnchor='end'>-1</text>
          <text x='-7' y={-CIRCLE_RADIUS - 14} textAnchor='end' fill={IMAGINARY}>i</text>
          <text x='-7' y={CIRCLE_RADIUS + 22} textAnchor='end' fill={IMAGINARY}>-i</text>
          <text x='4' y='16' fillOpacity='0.7'>0</text>
        </g>
      ) : null}

      {/* 运动轨迹 */}
      {showTrail ? <CometTrail angle={angle} gradientId={uid + '-trail'} color={vectorColor} /> : null}

      {/* 角度圆弧 */}
      {showSweep ? (
        <DashArc
          d={fullCirclePath(0, 0, CIRCLE_RADIUS * 0.3)}
          fill='none'
          stroke={sweepColor}
          strokeOpacity='0.85'
          strokeWidth='2'
          length={sweepFrac}
        />
      ) : null}
      {showSweep ? (
        <motion.g style={{ x: arcTipX, y: arcTipY }} aria-hidden='true'>
          <circle r='2.6' fill={sweepColor} />
        </motion.g>
      ) : null}

      {/* 坐标投影 */}
      {showProjections ? (
        <g>
          <motion.line
            x1={px}
            y1={py}
            x2={px}
            y2='0'
            stroke={vectorColor}
            strokeOpacity='0.32'
            strokeWidth='1'
            strokeDasharray='4 4'
          />
          <motion.line
            x1={px}
            y1={py}
            x2='0'
            y2={py}
            stroke={IMAGINARY}
            strokeOpacity='0.32'
            strokeWidth='1'
            strokeDasharray='4 4'
          />
          <motion.line x1='0' y1='0' x2={px} y2='0' stroke={vectorColor} strokeOpacity='0.75' strokeWidth='2.5' className='hairline' />
          <motion.line x1='0' y1='0' x2='0' y2={py} stroke={IMAGINARY} strokeOpacity='0.7' strokeWidth='2.5' className='hairline' />
        </g>
      ) : null}

      {/* 旋转向量 */}
      <motion.g>
        <motion.line
          x1='0'
          y1='0'
          x2={px}
          y2={py}
          stroke={vectorColor}
          strokeWidth='2.5'
          className='hairline glow-vector'
          markerEnd={'url(#' + uid + '-arrow-vector)'}
        />
        <motion.circle cx={px} cy={py} r='13' fill={vectorColor} fillOpacity='0.12' />
        <motion.circle cx={px} cy={py} r='5.5' fill={vectorColor} className='glow-vector' />
        <motion.circle cx={px} cy={py} r='5.5' fill='none' stroke='#05070f' strokeOpacity='0.6' strokeWidth='1' />
      </motion.g>

      {/* 命中区域（比圆本身大，方便手指拖动） */}
      <rect
        x='-160'
        y='-160'
        width='320'
        height='320'
        fill='transparent'
        style={{ cursor: interactive ? 'grab' : 'default', touchAction: 'none' }}
        pointerEvents={interactive ? 'auto' : 'none'}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture?.(event.pointerId)) handlePointer(event)
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />

      {/* 角度文字（跟随圆弧末端） */}
      {showAngleText ? <AngleLabel angle={angle} /> : null}
    </svg>
  )
}

/** 圆弧末端的实心小点，帮助读出角度位置 */
function AngleLabel({ angle }: { angle: MotionValue<number> }) {
  return (
    <motion.g
      style={{
        x: useTransform(angle, (v) => CIRCLE_RADIUS * 0.46 * Math.cos(v)),
        y: useTransform(angle, (v) => -CIRCLE_RADIUS * 0.46 * Math.sin(v)),
      }}
      aria-hidden='true'
    >
      <circle r='2.4' fill={NODE} opacity='0.9' />
    </motion.g>
  )
}

/**
 * 拖尾：只保留最近一小段运动，越靠近当前点越亮，
 * 并在最新一段上画出箭头，让方向一目了然。
 */
function CometTrail({ angle, gradientId, color }: { angle: MotionValue<number>; gradientId: string; color: string }) {
  const [, bump] = useReducer((n: number) => n + 1, 0)
  const points = useRef<Array<{ x: number; y: number }>>([])

  useEffect(() => {
    const unsubscribe = angle.on('change', (v) => {
      const list = points.current
      const last = list[list.length - 1]
      const next = toSvgPoint(0, 0, CIRCLE_RADIUS, v)
      if (last && Math.hypot(next.x - last.x, next.y - last.y) < 1.6) return
      list.push(next)
      if (list.length > 46) list.shift()
      bump()
    })
    return unsubscribe
  }, [angle])

  const { path, head } = useMemo(() => {
    const list = points.current
    if (list.length < 2) return { path: '', head: null }
    const d = list.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(2) + ' ' + p.y.toFixed(2)).join(' ')
    const a = list[list.length - 2]
    const b = list[list.length - 1]
    const angleOfHead = Math.atan2(b.y - a.y, b.x - a.x)
    return { path: d, head: { x: b.x, y: b.y, angleOfHead } }
  }, [points.current.length])

  if (!path) return null

  return (
    <g aria-hidden='true'>
      <path d={path} fill='none' stroke={'url(#' + gradientId + ')'} strokeWidth='3' className='hairline' />
      {head ? (
        <path
          d={'M ' + head.x.toFixed(2) + ' ' + head.y.toFixed(2) + ' l -7 -4.2 l 0 8.4 z'}
          fill={color}
          transform={'rotate(' + ((head.angleOfHead * 180) / Math.PI).toFixed(1) + ' ' + head.x.toFixed(2) + ' ' + head.y.toFixed(2) + ')'}
        />
      ) : null}
    </g>
  )
}

export default UnitCircle
