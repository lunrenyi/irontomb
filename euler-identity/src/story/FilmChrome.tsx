import type { ReactNode } from 'react'
import { range, easeOut, easeIn, clamp01 } from '../lib/easing'
import { Formula } from '../components/Math'

/**
 * 影片里的「字幕 / 公式 / 字形」元件。
 * 全部只依赖 frame：同一帧永远渲染出同一画面，网站与视频完全一致。
 */

export const SERIF = "'Songti SC', 'Source Han Serif SC', 'Noto Serif CJK SC', 'Times New Roman', serif"
export const SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', sans-serif"

export const INK = '#f2efe8'
export const MUTED = '#8ea4bf'
export const FAINT = '#4d5f7a'
export const VECTOR = '#4fe3c1'
export const IMAG = '#b9a6ff'
export const NODE = '#f2b134'
export const RESULT = '#eafff8'

/** 淡入 + 轻微上移的字幕，遵守「一次只讲一件事」 */
export function Caption({
  frame,
  from,
  to,
  children,
  size = 40,
  color = MUTED,
  y = 928,
  maxWidth = 1180,
  fade = 12,
}: {
  frame: number
  from: number
  to: number
  children: ReactNode
  size?: number
  color?: string
  y?: number
  maxWidth?: number
  fade?: number
}) {
  const enter = easeOut(range(frame, from, from + fade))
  const exit = easeIn(range(frame, to - fade, to))
  const opacity = clamp01(enter) * (1 - clamp01(exit))
  if (opacity <= 0.001) return null
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: y,
        display: 'flex',
        justifyContent: 'center',
        opacity,
        transform: 'translateY(' + (1 - enter) * 16 + 'px)',
      }}
    >
      <div
        style={{
          maxWidth,
          textAlign: 'center',
          fontSize: size,
          lineHeight: 1.45,
          color,
          fontFamily: SANS,
          letterSpacing: '0.02em',
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** 画面中央的大号数学陈述（KaTeX） */
export function Statement({
  frame,
  from,
  to,
  tex,
  size = 104,
  color = INK,
  y = 500,
  fade = 12,
  label,
}: {
  frame: number
  from: number
  to: number
  tex: string
  size?: number
  color?: string
  y?: number
  fade?: number
  label?: string
}) {
  const enter = easeOut(range(frame, from, from + fade))
  const exit = easeIn(range(frame, to - fade, to))
  const opacity = clamp01(enter) * (1 - clamp01(exit))
  if (opacity <= 0.001) return null
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: y,
        display: 'flex',
        justifyContent: 'center',
        opacity,
        transform: 'translateY(' + (1 - enter) * 22 + 'px)',
      }}
    >
      <Formula
        tex={tex}
        label={label ?? tex}
        style={{ fontSize: size, lineHeight: 1.2, color, fontFamily: SERIF }}
      />
    </div>
  )
}

export interface FormulaLine {
  id: string
  tex: string
  from: number
  /** 结束帧；不填则一直保留到镜头结束 */
  to?: number
  size?: number
  color?: string
  /** 与上一行的间距倍数 */
  gap?: number
  /** 到这一帧后淡出（用于「换成下一句」） */
  until?: number
}

/**
 * 逐步揭示的公式组：一次只多出一行，上一行不会消失。
 * 这是「不要同时把所有结果一次性显示出来」的实现方式。
 */
export function FormulaStack({
  frame,
  lines,
  x,
  y,
  size = 62,
  align = 'center',
}: {
  frame: number
  lines: FormulaLine[]
  x?: number
  y: number
  size?: number
  align?: 'center' | 'left'
}) {
  const visible = lines.filter((line) => frame >= line.from)
  return (
    <div
      style={{
        position: 'absolute',
        left: x ?? 0,
        right: x === undefined ? 0 : undefined,
        top: y,
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        gap: size * 0.5,
      }}
    >
      {lines.map((line, index) => {
        if (index >= visible.length) return null
        const enter = easeOut(range(frame, line.from, line.from + 14))
        const leave = line.until ? 1 - easeIn(range(frame, line.until, line.until + 12)) : 1
        // 完全淡出的行直接移除，避免留下空行、让下一行掉下来压到别的元素
        if (enter * leave <= 0.001) return null
        const lineSize = line.size ?? size
        return (
          <div
            key={line.id}
            style={{
              opacity: enter * leave,
              transform: 'translateY(' + (1 - enter) * 14 + 'px)',
              textAlign: 'center',
            }}
          >
            <Formula
              tex={line.tex}
              label={line.tex}
              style={{ fontSize: lineSize, lineHeight: 1.15, color: line.color ?? INK, fontFamily: SERIF }}
            />
          </div>
        )
      })}
    </div>
  )
}

export interface GlyphEntrance {
  /** 进场方式 */
  path?: 'curve' | 'beam' | 'arc' | 'slide' | 'ring' | 'rise'
  from: number
  to: number
}

/**
 * 一个数学字形的进场动作。五个符号各有不同的入场方式，
 * 这是「起承转合」里“转”的部分。
 */
export function Glyph({
  frame,
  entrance,
  x,
  y,
  size,
  color = INK,
  children,
  dim = 0,
}: {
  frame: number
  entrance: GlyphEntrance
  x: number
  y: number
  size: number
  color?: string
  children: ReactNode
  /** 额外压暗（用于强调别的元素时） */
  dim?: number
}) {
  const { from, to } = entrance
  const t = easeOut(range(frame, from, to))
  const d = 1 - t

  let transform = 'none'
  let opacity = t
  let extra: React.CSSProperties = {}

  switch (entrance.path) {
    case 'curve':
      transform = 'translate(' + d * -260 + 'px,' + d * 170 + 'px) rotate(' + d * -14 + 'deg)'
      break
    case 'beam':
      transform = 'translateY(' + d * -54 + 'px)'
      break
    case 'arc':
      transform = 'translate(' + d * -240 + 'px,' + d * -190 + 'px) rotate(' + d * -26 + 'deg)'
      break
    case 'slide':
      transform = 'translateX(' + d * 420 + 'px)'
      break
    case 'ring':
      transform = 'scale(' + (0.6 + 0.4 * t) + ')'
      opacity = easeOut(clamp01((frame - from) / ((to - from) * 0.7)))
      break
    case 'rise':
    default:
      transform = 'translateY(' + d * 26 + 'px)'
      break
  }

  if (dim > 0) {
    opacity *= 1 - dim
    extra = { filter: 'brightness(' + (1 - dim * 0.4) + ')' }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        fontSize: size,
        lineHeight: 1,
        fontFamily: SERIF,
        fontStyle: 'italic',
        color,
        opacity,
        // 以字形自身中心为定位点，方便把「落位」写成简单的坐标
        transform: 'translate(-50%, -50%) ' + transform,
        whiteSpace: 'nowrap',
        ...extra,
      }}
    >
      {children}
    </div>
  )
}

/** 数值标签（跟随几何的读数） */
export function Readout({
  x,
  y,
  children,
  size = 34,
  color = VECTOR,
  opacity = 1,
  anchor = 'middle',
  mono = true,
}: {
  x: number
  y: number
  children: ReactNode
  size?: number
  color?: string
  opacity?: number
  anchor?: 'start' | 'middle' | 'end'
  mono?: boolean
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        fontSize: size,
        color,
        opacity,
        textAlign: anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left',
        fontFamily: mono ? "'SFMono-Regular', 'JetBrains Mono', Menlo, monospace" : SANS,
        whiteSpace: 'nowrap',
        transform: 'translate(' + (anchor === 'middle' ? '-50%' : anchor === 'end' ? '-100%' : '0') + ', -50%)',
      }}
    >
      {children}
    </div>
  )
}
