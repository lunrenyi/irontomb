import type { ReactNode } from 'react'
import { range, easeOut, easeIn, clamp01 } from '../lib/easing'

/**
 * 影片里的字幕 / 标题 / 读数。
 * 全部只依赖 frame：同一帧永远渲染出同一画面。
 */

export const SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
export const SERIF = "'Songti SC', 'Source Han Serif SC', 'Noto Serif CJK SC', 'Times New Roman', serif"

export const INK = '#f3efe4'
export const MUTED = '#8fa79c'
export const FAINT = '#5c7168'
export const LEAF = '#63b06b'
export const SHOOT = '#7df0c0'
export const BUD = '#ffd479'
export const WATER = '#7fc4d8'
export const CIRCUIT = '#8ad8ff'

/** 画面底部的一行短句 */
export function Caption({
  frame,
  from,
  to,
  children,
  size = 40,
  color = MUTED,
  y = 936,
  maxWidth = 1160,
  fade = 14,
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
  const opacity = easeOut(range(frame, from, from + fade)) * (1 - easeIn(range(frame, to - fade, to)))
  if (opacity <= 0.002) return null
  const rise = (1 - easeOut(range(frame, from, from + fade))) * 14
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', opacity, transform: 'translateY(' + rise + 'px)' }}>
      <div style={{ maxWidth, textAlign: 'center', fontSize: size, lineHeight: 1.5, color, fontFamily: SANS, letterSpacing: '0.02em' }}>
        {children}
      </div>
    </div>
  )
}

/** 大标题 */
export function Title({
  frame,
  from,
  to,
  title,
  subtitle,
  size = 96,
  y = 452,
}: {
  frame: number
  from: number
  to: number
  title: string
  subtitle?: string
  size?: number
  y?: number
}) {
  const opacity = easeOut(range(frame, from, from + 20)) * (1 - easeIn(range(frame, to - 20, to)))
  if (opacity <= 0.002) return null
  const rise = (1 - easeOut(range(frame, from, from + 26))) * 26
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, textAlign: 'center', opacity, transform: 'translateY(' + rise + 'px)' }}>
      <div style={{ fontSize: size, fontFamily: SERIF, color: INK, letterSpacing: '0.08em', lineHeight: 1.15 }}>{title}</div>
      {subtitle ? <div style={{ marginTop: 22, fontSize: 30, fontFamily: SANS, color: MUTED, letterSpacing: '0.06em' }}>{subtitle}</div> : null}
    </div>
  )
}

/** 画面中央的短陈述 */
export function Statement({
  frame,
  from,
  to,
  children,
  size = 54,
  color = INK,
  y = 470,
  maxWidth = 1240,
}: {
  frame: number
  from: number
  to: number
  children: ReactNode
  size?: number
  color?: string
  y?: number
  maxWidth?: number
}) {
  const opacity = easeOut(range(frame, from, from + 16)) * (1 - easeIn(range(frame, to - 16, to)))
  if (opacity <= 0.002) return null
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', opacity }}>
      <div style={{ maxWidth, textAlign: 'center', fontSize: size, lineHeight: 1.5, color, fontFamily: SANS, letterSpacing: '0.04em' }}>{children}</div>
    </div>
  )
}

/** 跟随几何的读数 */
export function Readout({
  x,
  y,
  children,
  size = 30,
  color = SHOOT,
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

/** 逐字浮现的一行字：用于 L-系统的规则说明 */
export function RevealText({
  frame,
  from,
  text,
  size = 44,
  color = INK,
  y = 520,
  step = 3,
  highlight = [],
  mono = false,
}: {
  frame: number
  from: number
  text: string
  size?: number
  color?: string
  y?: number
  step?: number
  highlight?: number[]
  mono?: boolean
}) {
  const chars = [...text]
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', gap: 2, fontSize: size, fontFamily: mono ? "'SFMono-Regular', 'JetBrains Mono', Menlo, monospace" : SERIF, letterSpacing: '0.06em' }}>
      {chars.map((ch, i) => {
        const t = clamp01(range(frame, from + i * step, from + i * step + 8))
        return (
          <span key={i} style={{ opacity: t, color: highlight.includes(i) ? SHOOT : color, transform: 'translateY(' + (1 - t) * 10 + 'px)', display: 'inline-block' }}>
            {ch === ' ' ? '\u00a0' : ch}
          </span>
        )
      })}
    </div>
  )
}
