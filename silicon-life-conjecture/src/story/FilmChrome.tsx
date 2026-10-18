import type { ReactNode } from 'react'
import { range, easeOut, easeIn, clamp01 } from '../lib/easing'
import { INK, MUTED, MONO, SANS, SERIF, SIGNAL, AMBER, DEEP, alpha } from '../viz/palette'
import { CAPTION, STAGE, TYPE, captionBandHeight, wrapLines } from './layout'
import { keySize, type BeatTable, type CueWindow } from './cues'

/**
 * 影片里的文字只有三类，全部是动画的一部分：
 *   1. 章节标题  ChapterTitle —— 幕开场出现，随后淡出
 *   2. 知识标签  StageLabel  —— 贴在正在变化的对象旁边
 *   3. 关键文字  KeyBeat     —— 公式 / 数字 / 核心问题，只在高潮短暂出现
 *
 * 没有任何常驻的底部说明文字。全部只依赖 frame：同一帧永远渲染出同一画面。
 */

/** 章节标题：占住幕的开头一小段，然后让位给主动画 */
export function ChapterTitle({
  frame,
  beats,
  title,
  sub,
  color = INK,
}: {
  frame: number
  beats: BeatTable
  title: string
  sub?: string
  color?: string
}) {
  const beat = beats[0]
  if (!beat) return null
  const inT = easeOut(range(frame, beat.start, beat.start + 22))
  const outT = 1 - easeIn(range(frame, beat.start + beat.dur * 0.4, beat.start + beat.dur * 0.88))
  const opacity = inT * outT
  if (opacity <= 0.004) return null
  const rise = (1 - easeOut(range(frame, beat.start, beat.start + 30))) * 26
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: STAGE.y + 150,
        textAlign: 'center',
        opacity,
        transform: 'translateY(' + rise + 'px)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: TYPE.chapter, fontFamily: SERIF, color, letterSpacing: '0.14em', lineHeight: 1.1 }}>{title}</div>
      {sub ? (
        <div style={{ marginTop: 22, fontSize: TYPE.chapterSub, fontFamily: SANS, color: MUTED, letterSpacing: '0.22em' }}>{sub}</div>
      ) : null}
      <div style={{ margin: '30px auto 0', width: 220, height: 1, background: alpha(SIGNAL, 0.5) }} />
    </div>
  )
}

/**
 * 知识标签：贴在正在变化的对象旁边。
 * 标签和图形同生共死 —— 图形走了，标签也走；不会留下没有主人的字。
 */
export function StageLabel({
  frame,
  from,
  to,
  x,
  y,
  children,
  color = SIGNAL,
  size = TYPE.label,
  anchor = 'start',
  leader,
  mono = false,
}: {
  frame: number
  from: number
  to: number
  x: number
  y: number
  children: ReactNode
  color?: string
  size?: number
  anchor?: 'start' | 'middle' | 'end'
  /** 从标签拉一条细线指向对象 */
  leader?: { x: number; y: number }
  mono?: boolean
}) {
  const fade = 12
  const opacity = easeOut(range(frame, from, from + fade)) * (1 - easeIn(range(frame, to - fade, to)))
  if (opacity <= 0.004) return null
  const shift = anchor === 'middle' ? '-50%' : anchor === 'end' ? '-100%' : '0'
  return (
    <>
      {leader ? (
        <svg width={STAGE.w + STAGE.x * 2} height={STAGE.h + STAGE.y * 2} style={STAGE_SVG} className='block' pointerEvents='none'>
          <line
            x1={x}
            y1={y}
            x2={leader.x}
            y2={leader.y}
            stroke={alpha(color, 0.45)}
            strokeWidth={1.6}
            strokeDasharray='5 7'
            opacity={opacity}
          />
          <circle cx={leader.x} cy={leader.y} r={4} fill={color} opacity={opacity} />
        </svg>
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: 'translate(' + shift + ', -50%)',
          fontSize: size,
          fontFamily: mono ? MONO : SANS,
          letterSpacing: mono ? '0.16em' : '0.12em',
          color,
          opacity,
          whiteSpace: 'nowrap',
          textShadow: '0 2px 14px ' + alpha(DEEP, 0.9),
          pointerEvents: 'none',
        }}
      >
        {children}
      </div>
    </>
  )
}

/** 整幅画面尺寸的 svg 必须绝对定位，否则同一幕里两层图形会上下堆叠 */
export const STAGE_SVG = { position: 'absolute', inset: 0 } as const

/**
 * 关键文字：公式、关键数字、核心问题。
 * 只在这一拍里出现，看完就退场 —— 它不是解说，而是画面上的一个重音。
 */
export function KeyBeat({
  frame,
  beat,
  text,
  tone,
  y = 430,
  maxWidth = 1500,
}: {
  frame: number
  beat: { start: number; end: number; dur: number }
  text: string
  tone: 'term' | 'formula' | 'number' | 'question'
  y?: number
  maxWidth?: number
}) {
  if (frame < beat.start || frame > beat.end) return null
  const size = keySize(tone)
  const inT = easeOut(range(frame, beat.start + 6, beat.start + 30))
  const outT = 1 - easeIn(range(frame, beat.end - 26, beat.end))
  const opacity = inT * outT
  if (opacity <= 0.004) return null
  const color = tone === 'question' ? INK : tone === 'number' ? SIGNAL : tone === 'formula' ? AMBER : INK
  const family = tone === 'number' || tone === 'formula' ? MONO : tone === 'question' ? SERIF : SANS
  const scale = 0.94 + 0.06 * easeOut(range(frame, beat.start + 6, beat.start + 34))
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: y,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth,
          textAlign: 'center',
          fontSize: size,
          lineHeight: 1.35,
          fontFamily: family,
          letterSpacing: tone === 'question' ? '0.06em' : '0.1em',
          color,
          opacity,
          transform: 'scale(' + scale + ')',
          textShadow: '0 4px 40px ' + alpha(DEEP, 0.92),
        }}
      >
        {text}
      </div>
    </div>
  )
}

/** 跟随几何的读数 */
export function Readout({
  x,
  y,
  children,
  size = TYPE.readout,
  color = SIGNAL,
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
  const shift = anchor === 'middle' ? '-50%' : anchor === 'end' ? '-100%' : '0'
  const align = anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left'
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        fontSize: size,
        color,
        opacity,
        textAlign: align,
        fontFamily: mono ? MONO : SANS,
        whiteSpace: 'nowrap',
        transform: 'translate(' + shift + ', -50%)',
        pointerEvents: 'none',
      }}
    >
      {children}
    </div>
  )
}

/** 一段进度点阵：把「第几代 / 第几步」这种离散读数画成图形，而不是写成句子 */
export function ProgressDots({
  x,
  y,
  total,
  index,
  color = SIGNAL,
  gap = 26,
  r = 5,
}: {
  x: number
  y: number
  total: number
  index: number
  color?: string
  gap?: number
  r?: number
}) {
  return (
    <g pointerEvents='none'>
      {Array.from({ length: total }, (_, i) => (
        <circle key={i} cx={x + i * gap} cy={y} r={r} fill={i <= index ? color : alpha(color, 0.22)} />
      ))}
    </g>
  )
}

export { clamp01, MONO, MUTED, SANS, SERIF, SIGNAL, AMBER, INK, DEEP, alpha }

/**
 * 一幕里全部的关键文字，按拍表的位置依次出现。
 * 标题拍的文字放在标题下方；其余拍放在画面上缘，别和图形抢中间。
 */
export function SceneKeys({
  frame,
  beats,
  specs,
}: {
  frame: number
  beats: BeatTable
  specs: readonly { chapter?: boolean; key?: { text: string; tone: 'term' | 'formula' | 'number' | 'question'; y?: number } }[]
}) {
  return (
    <>
      {specs.map((spec, i) => {
        if (!spec.key || !beats[i]) return null
        const y = spec.key.y ?? (spec.key.tone === 'question' ? 430 : spec.chapter ? 470 : 170)
        return <KeyBeat key={i} frame={frame} beat={beats[i]} text={spec.key.text} tone={spec.key.tone} y={y} />
      })}
    </>
  )
}

/**
 * 底部字幕带。
 *
 * 高度是算出来的（行数 x 字号 x 行高），所以再长的句子也放得下 ——
 * 不会被裁掉，也不会顶到画面外面。左右有明确的安全边距，文字自动换行。
 * 字幕带只占最下面一条，主视觉区在它上面，两块不重叠。
 */
export function CaptionBand({ frame, cues }: { frame: number; cues: readonly CueWindow[] }) {
  const active = cues.find((c) => frame >= c.from && frame <= c.to)
  if (!active) return null
  const fade = 12
  const opacity = easeOut(range(frame, active.from, active.from + fade)) * (1 - easeIn(range(frame, active.to - fade, active.to)))
  if (opacity <= 0.004) return null
  const lines = wrapLines(active.text, active.size)
  const bandH = captionBandHeight(lines.length, active.size)
  const bottom = STAGE.y + STAGE.h
  const top = bottom - bandH
  return (
    <>
      {/* 柔和的压暗，让字幕在任何画面上都读得清 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: STAGE.h - (top - STAGE.y) + 96,
          background: 'linear-gradient(to bottom, rgba(4,6,13,0) 0%, rgba(4,6,13,0.72) 46%, rgba(4,6,13,0.94) 100%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: CAPTION.padBottom,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            maxWidth: CAPTION.maxWidth,
            textAlign: 'center',
            fontSize: active.size,
            lineHeight: CAPTION.lineHeight,
            fontFamily: SANS,
            letterSpacing: '0.02em',
            color: active.note ? MUTED : INK,
            opacity,
            textShadow: '0 2px 18px rgba(4,6,13,0.9)',
          }}
        >
          {active.text}
        </div>
      </div>
    </>
  )
}
