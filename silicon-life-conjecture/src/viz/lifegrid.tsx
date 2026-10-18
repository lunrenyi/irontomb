import { isAlive, liveCount, type Cell, type LifeGrid } from '../lib/life'
import { AMBER, DEEP, INK, MONO, SIGNAL, BLUE, alpha } from './palette'
import type { PointerEvent as ReactPointerEvent } from 'react'

export interface LifeGridFigureProps {
  grid: LifeGrid
  /** 上一代：影片里用它让出生与死亡有渐变，实验室里不需要 */
  previous?: LifeGrid | null
  /** 0-1：从上一代过渡到这一代的进度 */
  progress?: number
  /** 可点击时传进来；点击会调用它切换一格 */
  onToggle?: (x: number, y: number) => void
  /** 暂停时的呼吸感（秒），实验室里用；影片里交给帧 */
  breathe?: number
  /** 高亮这几格（比如刚被翻转的那一格） */
  highlight?: Cell[]
  showGrid?: boolean
}

/**
 * 生命游戏的画面。
 * 每一个方格的状态都直接来自模拟结果，没有预先录好的动画：
 * 改一个格子、按一次单步，格子立刻就变了。
 */
export function LifeGridFigure({
  grid,
  previous = null,
  progress = 1,
  onToggle,
  breathe = 0,
  highlight,
  showGrid = true,
}: LifeGridFigureProps) {
  const w = grid.width
  const h = grid.height
  const pulse = breathe > 0 ? 0.86 + 0.14 * Math.sin(breathe * Math.PI * 2) : 1
  const highlightKey = (highlight ?? []).map((c) => c.x + ':' + c.y).join(',')
  const cells: JSX.Element[] = []

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const now = isAlive(grid, x, y)
      const before = previous ? isAlive(previous, x, y) : now
      let opacity = 0
      if (now && before) opacity = 1
      else if (now && !before) opacity = progress
      else if (!now && before) opacity = 1 - progress
      if (opacity <= 0.01) continue
      const isHot = highlightKey.length > 0 && (highlight ?? []).some((c) => c.x === x && c.y === y)
      cells.push(
        <rect
          key={x + '-' + y}
          x={x + 0.06}
          y={y + 0.06}
          width={0.88}
          height={0.88}
          rx={0.12}
          fill={isHot ? AMBER : SIGNAL}
          opacity={opacity * pulse}
        />,
      )
    }
  }

  const handleToggle = (event: ReactPointerEvent<SVGRectElement>) => {
    const svg = event.currentTarget.ownerSVGElement
    if (!svg || !onToggle) return
    const box = svg.getBoundingClientRect()
    const scale = Math.min(box.width / w, box.height / h)
    const ox = (box.width - w * scale) / 2
    const oy = (box.height - h * scale) / 2
    const gx = Math.floor((event.clientX - box.left - ox) / scale)
    const gy = Math.floor((event.clientY - box.top - oy) / scale)
    if (gx < 0 || gy < 0 || gx >= w || gy >= h) return
    onToggle(gx, gy)
  }

  return (
    <svg
      viewBox={'0 0 ' + w + ' ' + h}
      className='h-full w-full touch-none select-none'
      role='img'
      aria-label={'生命游戏棋盘，' + w + ' 乘 ' + h + '，当前 ' + liveCount(grid) + ' 个存活格'}
      preserveAspectRatio='xMidYMid meet'
    >
      <rect width={w} height={h} rx={w * 0.012} fill={DEEP} />
      {showGrid
        ? Array.from({ length: w + 1 }, (_, i) => (
            <line key={'v' + i} x1={i} y1={0} x2={i} y2={h} stroke={BLUE} strokeOpacity={0.09} strokeWidth={0.03} />
          ))
        : null}
      {showGrid
        ? Array.from({ length: h + 1 }, (_, i) => (
            <line key={'h' + i} x1={0} y1={i} x2={w} y2={i} stroke={BLUE} strokeOpacity={0.09} strokeWidth={0.03} />
          ))
        : null}
      <g>{cells}</g>
      {onToggle
        ? Array.from({ length: h }, (_, y) => (
            <rect key={'hit' + y} x={0} y={y} width={w} height={1} fill='transparent' onPointerDown={handleToggle} />
          ))
        : null}
      {onToggle && liveCount(grid) === 0 ? (
        <text x={w / 2} y={h / 2} fill={INK} opacity={0.45} fontSize={w * 0.075} fontFamily={MONO} textAnchor='middle'>
          棋盘是空的
        </text>
      ) : null}
    </svg>
  )
}

/** 网格外的一圈淡框，让棋盘在深色背景上有明确的边界 */
export function LifeFrame({ size, className }: { size: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        border: '1px solid ' + alpha(SIGNAL, 0.18),
        borderRadius: 14,
        background: 'radial-gradient(120% 120% at 50% 0%, rgba(20,36,74,0.55), rgba(4,6,13,0.9))',
        padding: 8,
      }}
    >
      <LifeGridFigure grid={{ width: size, height: size, cells: new Uint8Array(size * size) }} />
    </div>
  )
}
