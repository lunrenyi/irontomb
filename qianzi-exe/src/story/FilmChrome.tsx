/**
 * 影片里的文字只有三类，全部是动画的一部分：
 *   1. 章节标题 ChapterTitle —— 幕开场出现，随后淡出
 *   2. 关键文字 KeyBeat     —— 一幕的核心那一句
 *   3. 字幕带   CaptionBand —— 底部一行，原文 + 释义
 *
 * 全部只依赖 frame：同一帧永远渲染出同一画面。
 */
import { range, easeOut, easeIn } from '../lib/easing'
import { CYAN, PAPER, MUTED, FAINT, alpha, MONO, HAN } from '../viz/palette'
import { CAPTION, STAGE, TYPE, captionBandHeight, wrapLines } from './layout'
import { keySize, type BeatTable, type CueWindow } from './cues'
import { MODULE_HUE } from '../viz/palette'

/** 章节标题：占住幕的开头一小段，然后让位给主动画 */
export function ChapterTitle({
  frame,
  beats,
  title,
  sub,
  color = PAPER,
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
  const outT = 1 - easeIn(range(frame, beat.start + beat.dur * 0.35, beat.start + beat.dur * 0.85))
  const opacity = inT * outT
  if (opacity <= 0.004) return null
  const rise = (1 - easeOut(range(frame, beat.start, beat.start + 30))) * 26
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: STAGE.y + 128,
        textAlign: 'center',
        opacity,
        transform: 'translateY(' + rise + 'px)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: TYPE.chapter, fontFamily: HAN, color, letterSpacing: '0.16em', lineHeight: 1.1 }}>
        {title}
      </div>
      {sub ? (
        <div style={{ marginTop: 20, fontSize: TYPE.chapterSub, fontFamily: MONO, color: MUTED, letterSpacing: '0.26em' }}>
          {sub}
        </div>
      ) : null}
      <div style={{ margin: '26px auto 0', width: 200, height: 1, background: alpha(CYAN, 0.5) }} />
    </div>
  )
}

/** 关键文字：一幕的核心那一句 */
export function KeyBeat({
  frame,
  beats,
  beatIndex,
  color = PAPER,
  y: defaultY = STAGE.y + 44,
}: {
  frame: number
  beats: BeatTable
  beatIndex: number
  color?: string
  y?: number
}) {
  const beat = beats[beatIndex]
  const key = beat?.key
  if (!key) return null
  const size = keySize(key.tone)
  const inT = easeOut(range(frame, beat.start, beat.start + 20))
  const outT = 1 - easeIn(range(frame, beat.end - 22, beat.end - 2))
  const opacity = inT * outT
  if (opacity <= 0.004) return null
  const y = beat.keyY ?? defaultY
  const lines = wrapLines(key.text, size, 1500)
  const rise = (1 - inT) * 18
  return (
    <div
      style={{
        position: 'absolute',
        left: STAGE.x,
        width: STAGE.w,
        top: y,
        textAlign: 'center',
        opacity,
        transform: 'translateY(' + rise + 'px)',
        pointerEvents: 'none',
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontSize: size,
            lineHeight: 1.24,
            fontFamily: HAN,
            color,
            letterSpacing: '0.1em',
            textShadow: '0 0 18px rgba(3,6,14,1), 0 0 46px rgba(3,6,14,1)',
          }}
        >
          {line}
        </div>
      ))}
    </div>
  )
}

/** 字幕带：底部一条，原文 + 释义 */
export function CaptionBand({
  frame,
  cues,
  accent = CYAN,
}: {
  frame: number
  cues: CueWindow[]
  accent?: string
}) {
  const active = cues.filter((c) => frame >= c.from && frame <= c.to)
  if (active.length === 0) return null
  const cue = active[active.length - 1]
  const fade = 10
  const opacity =
    easeOut(range(frame, cue.from, cue.from + fade)) * (1 - easeIn(range(frame, cue.to - fade, cue.to)))
  if (opacity <= 0.004) return null
  const size = cue.size
  const lines = wrapLines(cue.text, size, CAPTION.maxWidth)
  const height = captionBandHeight(lines.length, size)
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: CAPTION.maxWidth,
          padding: '10px 34px',
          borderLeft: cue.note ? '1px solid ' + alpha(accent, 0.35) : '1px solid ' + alpha(accent, 0.8),
          background: 'linear-gradient(90deg, rgba(3,6,14,0) 0%, rgba(3,6,14,0.82) 12%, rgba(3,6,14,0.82) 88%, rgba(3,6,14,0) 100%)',
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize: size,
              lineHeight: CAPTION.lineHeight,
              textAlign: 'center',
              color: cue.note ? MUTED : PAPER,
              fontFamily: HAN,
              letterSpacing: '0.04em',
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}

/** 右上角的读数：像一台机器在报状态 */
export function Hud({
  frame,
  chapter,
  title,
  code,
  accent = CYAN,
}: {
  frame: number
  chapter: string
  title: string
  code: string
  accent?: string
}) {
  const t = (frame / 30) % 1
  return (
    <div
      style={{
        position: 'absolute',
        right: STAGE.x,
        top: STAGE.y - 6,
        textAlign: 'right',
        fontFamily: MONO,
        pointerEvents: 'none',
        opacity: 0.62,
      }}
    >
      <div style={{ fontSize: 19, color: accent, letterSpacing: '0.24em' }}>
        {chapter} / {title}
      </div>
      <div style={{ fontSize: 15, color: FAINT, letterSpacing: '0.18em', marginTop: 6 }}>
        {code}
      </div>
      <div
        style={{
          marginTop: 8,
          marginLeft: 'auto',
          width: 120,
          height: 2,
          background: alpha(accent, 0.2),
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: (t * 100).toFixed(1) + '%',
            background: accent,
            opacity: 0.8,
          }}
        />
      </div>
    </div>
  )
}

export { MODULE_HUE }
