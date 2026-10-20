/**
 * 节奏引擎：拍表（beat）与字幕（cue）。
 *
 * 一拍 = 一个可以独立看懂的小动作，外加这一拍要说的话。
 * 一拍的实际长度 = max(画面自己需要的秒数, 这一拍那些字幕读完需要的秒数)。
 * 于是把某句话改长一点，它所在的那一拍会自动变长 ——
 * 观众没读完，画面绝不会切走。
 *
 * 全部只吃数字（frame），不读时钟、不用定时器 —— 网页播放器与 MP4 完全一致。
 */
import { CAPTION, FPS, TYPE, readingFrames, wrapLines } from './layout'

/** 关键文字的四种语气 */
export type KeyTone = 'term' | 'formula' | 'number' | 'question' | 'statement'

export interface KeyText {
  text: string
  tone: KeyTone
  /** 这一句在成片里的纵向位置；不填就用 SceneKeys 的默认位置 */
  y?: number
}

/** 一条字幕 */
export interface CueSpec {
  text: string
  /** 补充说明：通常用来放科学限定。字号、字重与正文完全一致，只靠左侧竖线区分 */
  note?: boolean
}

export interface BeatSpec {
  /** 这一拍画面自己至少要多久（秒） */
  min: number
  /** 这一拍要说的字幕（按顺序一条一条出现） */
  cues?: CueSpec[]
  /** 这一拍是整幕的标题拍：开场出现标题，随后淡出 */
  chapter?: boolean
  /** 这一拍中央出现的那一句关键文字 */
  key?: KeyText
  /** 这一拍讲到的原文句子下标（用来把页面上的点击接到影片的这一拍） */
  phrases?: number[]
  /** 这一拍对应场景里的哪些图形（给场景自己用） */
  slot?: string
  /** 关键文字的纵向位置（成片像素）；不填就用默认那条带子 */
  keyY?: number
}

/** 一条字幕在时间轴上的位置 */
export interface CueWindow {
  text: string
  from: number
  to: number
  /** 字幕字号。取自唯一的排版规范 CAPTION.size，所有字幕（含注记）都一样 */
  size: number
  note: boolean
}

export interface Beat {
  index: number
  /** 幕内起始帧 */
  start: number
  /** 幕内结束帧（不含） */
  end: number
  dur: number
  /** 实际排出来的秒数 */
  seconds: number
  /** 这一拍的字幕（在幕内的绝对帧） */
  cues: CueWindow[]
  /** 这一拍讲到的原文句子下标 */
  phrases: number[]
  /** 这一拍的场景槽位 */
  slot: string
  /** 这一拍中央的关键文字 */
  key?: KeyText
  /** 关键文字的纵向位置 */
  keyY?: number
}

export type BeatTable = readonly Beat[]

/** 两条字幕之间至少隔这么多帧，避免上一句还没退场下一句就压上来 */
export const CUE_GAP = 14

/** 关键文字用多大字号 */
export const keySize = (tone: KeyTone): number => {
  if (tone === 'question' || tone === 'statement') return TYPE.statement
  if (tone === 'number') return TYPE.keyNum
  return TYPE.key
}

/** 一句关键文字至少要占多少帧才够读完 */
export function keyFrames(key: KeyText): number {
  const size = keySize(key.tone)
  const lines = wrapLines(key.text, size, 1500).length
  const chars = [...key.text].length
  const seconds = Math.max(2.2, Math.max(lines * 1.1, chars * 0.155))
  return Math.round(seconds * FPS) + 24
}

/** 文字自检：任何一段关键文字都不能大到吃掉半个画面 */
export function textFits(key: KeyText): boolean {
  const size = keySize(key.tone)
  const lines = wrapLines(key.text, size, 1500).length
  return lines * size * 1.35 < 1080 * 0.42
}

/** 一拍里字幕要占的总帧数（含间隔） */
function cueFrames(cues: readonly CueSpec[]): number {
  if (cues.length === 0) return 0
  const total = cues.reduce((sum, c) => sum + readingFrames(c.text, CAPTION.size), 0)
  return total + CUE_GAP * (cues.length - 1)
}

/** 用每一拍的规格造一张拍表 */
export function beatTable(specs: readonly BeatSpec[]): BeatTable {
  let cursor = 0
  return specs.map((spec, index) => {
    const needed = cueFrames(spec.cues ?? [])
    // 这一拍中央那句关键文字也要留够读完的时间
    const keyNeeded = spec.key ? keyFrames(spec.key) + 18 : 0
    const dur = Math.max(Math.round(spec.min * FPS), needed, keyNeeded)
    // 字幕从这一拍的开头就开始，依次排下去
    const windows: CueWindow[] = []
    let t = cursor
    for (const c of spec.cues ?? []) {
      const size = CAPTION.size
      const frames = readingFrames(c.text, size)
      windows.push({ text: c.text, from: t, to: t + frames, size, note: Boolean(c.note) })
      t += frames + CUE_GAP
    }
    const beat: Beat = {
      index,
      start: cursor,
      end: cursor + dur,
      dur,
      seconds: dur / FPS,
      cues: windows,
      phrases: spec.phrases ?? [],
      slot: spec.slot ?? '',
      key: spec.key,
      keyY: spec.keyY,
    }
    cursor += dur
    return beat
  })
}

export const beatLength = (b: BeatTable) => (b.length ? b[b.length - 1].end : 0)
export const beatSeconds = (b: BeatTable) => beatLength(b) / FPS

/** 第 i 拍的起点 / 终点 */
export const start = (b: BeatTable, i: number) => b[i]?.start ?? 0
export const end = (b: BeatTable, i: number) => b[i]?.end ?? 0

/** 把 0..1 的比例映射到第 i 拍的 [p0, p1] 区间（返回 0..1） */
export function frac(frame: number, b: BeatTable, i: number, p0 = 0, p1 = 1): number {
  const beat = b[i]
  if (!beat) return frame >= 0 ? 1 : 0
  const from = beat.start + beat.dur * p0
  const to = beat.start + beat.dur * p1
  if (to <= from) return frame >= to ? 1 : 0
  const t = (frame - from) / (to - from)
  return t < 0 ? 0 : t > 1 ? 1 : t
}

/** 当前帧落在第几拍 */
export function beatIndexAt(b: BeatTable, frame: number): number {
  if (!b.length) return 0
  for (let i = 0; i < b.length; i += 1) if (frame < b[i].end) return i
  return b.length - 1
}

/** 某条字幕在时间轴上的窗口（幕内绝对帧） */
export function cueWindows(b: BeatTable, frame: number): CueWindow[] {
  for (const beat of b) {
    if (frame >= beat.start && frame < beat.end) return beat.cues
  }
  return []
}

/**
 * 自检：把这一幕排出来可能出的问题全列出来。
 * 字幕排不下、两条撞在一起、某一拍被字幕撑爆 —— 都会在这里被抓住。
 */
export function auditScene(specs: readonly BeatSpec[]): string[] {
  const problems: string[] = []
  const table = beatTable(specs)
  specs.forEach((spec, i) => {
    const beat = table[i]
    ;(spec.cues ?? []).forEach((cue, j) => {
      const lines = wrapLines(cue.text, CAPTION.size)
      if (lines.some((l) => l.length === 0)) problems.push(`b${i} cue${j}: 有空行`)
      if (cue.text.length > 90) problems.push(`b${i} cue${j}: 太长了，该拆成两句`)
    })
    const need = cueFrames(spec.cues ?? [])
    if (need > beat.dur) problems.push(`b${i}: 字幕比这一拍还长`)
    // 同一拍里两条字幕不能重叠
    const wins = beat.cues
    for (let a = 1; a < wins.length; a += 1) {
      if (wins[a].from < wins[a - 1].to) problems.push(`b${i}: 两条字幕撞在一起`)
    }
  })
  // 跨拍也不能撞
  for (let i = 1; i < table.length; i += 1) {
    const prev = table[i - 1].cues
    const cur = table[i].cues
    if (prev.length && cur.length) {
      const last = prev[prev.length - 1]
      const first = cur[0]
      if (first.from < last.to) problems.push(`b${i}: 与上一拍的字幕撞在一起`)
    }
  }
  return problems
}
