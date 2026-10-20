/**
 * 影片的排版基准 —— 全部是 1920 x 1080 成片坐标。
 *
 * 画面分三层，互不重叠：
 *   主视觉区    画面上 3/4 的地方，动画主角
 *   关键概念区  幕标题、公式、结论
 *   底部字幕区  固定的一条字幕带，宽度与高度都是算出来的
 */

export const FPS = 30
export const STAGE_W = 1920
export const STAGE_H = 1080

/** 四周安全边距 */
export const SAFE_X = 110
export const SAFE_TOP = 64
export const SAFE_BOTTOM = 64

/** 整块画面 */
export const STAGE = {
  x: SAFE_X,
  y: SAFE_TOP,
  w: STAGE_W - SAFE_X * 2,
  h: STAGE_H - SAFE_TOP - SAFE_BOTTOM,
}

/**
 * 字号层级（1920 宽的成片）。
 * 这次是照着「正常观看距离能读清」定的下限，不是随手取的整数。
 */
export const TYPE = {
  /** 章节主标题 */
  chapter: 84,
  /** 章节副标题 */
  chapterSub: 32,
  /** 核心概念 / 关键公式 */
  key: 62,
  /** 关键数字 */
  keyNum: 74,
  /** 中心陈述句 */
  statement: 52,
  /** 主要解释文字 */
  body: 40,
  /** 图形里的主要节点标签 */
  label: 32,
  /** 次要辅助文字 */
  labelSmall: 28,
  /** 图形里的读数 */
  readout: 30,
  /** 极小注记 */
  micro: 26,
} as const

/** 底部字幕带 */
export const CAPTION = {
  /** 正文字号 */
  size: 38,
  /** 补充说明（小一号、灰一些） */
  noteSize: 30,
  /** 行高 */
  lineHeight: 1.5,
  /** 左右安全边距之内能放多宽 */
  maxWidth: 1560,
  /** 带子底部留白 */
  padBottom: 26,
  /** 带子上沿留白 */
  padTop: 18,
} as const

/** 字幕带占据的高度（按行数算，不是拍脑袋定的固定值） */
export function captionBandHeight(lines: number, size: number = CAPTION.size): number {
  return Math.round(lines * size * CAPTION.lineHeight + CAPTION.padTop + CAPTION.padBottom)
}

/** 字幕带的上沿（从画面底往上算） */
export function captionBandTop(lines: number, size: number = CAPTION.size): number {
  return STAGE.y + STAGE.h - captionBandHeight(lines, size)
}

/* ---------------------------------------------------------- 第四幕的版面节奏 */

/**
 * 第四幕专用：画面上缘留给关键文字的那条带子。
 *
 * 这一幕几乎每一拍都会同时出现「一句关键文字」和「一张主视觉图」，
 * 所以上缘必须留一条任何一拍都不占用的带子，其余版面整体往下让。
 * score.ts 里第四幕所有 key 的 y 都取这个值，两边不会各写一个数字而走偏。
 */
export const COMPUTER_KEY_Y = 66

/** 关键文字带的高度（最大字号 keyNum 74 x 行高 1.35） */
export const COMPUTER_KEY_BOTTOM = COMPUTER_KEY_Y + Math.round(TYPE.keyNum * 1.35)

/** 第四幕的三个版面区，彼此不重叠：关键文字带 -> 阶段条 -> 主视觉 */
export const COMPUTER_PHASE = { cy: 200, labelY: 252, top: 172 } // 阶段圆点的上缘
// 高度是倒推出来的：机器图 viewBox 里最后一块墨迹在 y=765（输入输出设备底边），
// 要让它的底边停在这一幕字幕带的上沿之上，就不能超过这个数。
export const COMPUTER_STAGE = { top: 272, height: 636 }

/* ---------------------------------------------------------- 第五幕的版面节奏 */

/**
 * 第五幕专用：这一幕几乎每一拍都是「一句关键文字 + 一张主视觉」，
 * 所以沿用第四幕那条规矩 —— 上缘留一条任何一拍都不占用的带子。
 */
export const LLM_KEY_Y = 66
export const LLM_KEY_BOTTOM = LLM_KEY_Y + Math.round(TYPE.keyNum * 1.35)

/**
 * 主视觉区。它的高度是倒推的：这一幕的字幕一律排一行，
 * 一行字幕带的上沿在 y=915，所以主视觉最多到 896 才不会被压住。
 */
export const LLM_STAGE = { top: 240, height: 656 }

/* ------------------------------------------------------------- 文字度量 */

/** 一个字符大约多宽（相对字号） */
function charWidth(ch: string): number {
  const code = ch.codePointAt(0) ?? 0
  // CJK 与全角标点按一个字宽算
  if (code >= 0x2e80) return 1
  if (ch === ' ') return 0.34
  if ('iIlj.,:;!|\'`'.includes(ch)) return 0.32
  if (ch >= '0' && ch <= '9') return 0.56
  if (ch >= 'A' && ch <= 'Z') return 0.64
  return 0.56
}

/** 一行文字的宽度（成片像素） */
export function measure(text: string, size: number): number {
  let w = 0
  for (const ch of text) w += charWidth(ch) * size
  return w
}

/**
 * 把一段文字按宽度折行。
 * 中文可以在任意字之间断行；英文尽量在空格处断。
 */
export function wrapLines(text: string, size: number, maxWidth: number = CAPTION.maxWidth): string[] {
  const lines: string[] = []
  let line = ''
  let lineW = 0
  const flush = () => {
    if (line) lines.push(line)
    line = ''
    lineW = 0
  }
  for (const ch of text) {
    const w = charWidth(ch) * size
    if (lineW + w > maxWidth && line) {
      // 英文单词尽量不拆开
      const lastSpace = line.lastIndexOf(' ')
      if (lastSpace > 0 && chWidth(ch) < 0.6) {
        const head = line.slice(0, lastSpace)
        const tail = line.slice(lastSpace + 1)
        lines.push(head)
        line = tail
        lineW = measure(tail, size)
      } else {
        flush()
      }
    }
    line += ch
    lineW += w
  }
  flush()
  return lines.length ? lines : ['']
}

function chWidth(ch: string): number {
  return charWidth(ch)
}

/**
 * 一句字幕至少要占多少帧才够读完。
 * 行数决定读多久，字数决定要多快 —— 两样一起算。
 */
export function readingFrames(text: string, size: number = CAPTION.size, maxWidth: number = CAPTION.maxWidth): number {
  const lines = wrapLines(text, size, maxWidth).length
  const chars = [...text].length
  const seconds = Math.max(1.8, lines * 0.9 + chars * 0.075)
  return Math.round(seconds * FPS) + 18
}
