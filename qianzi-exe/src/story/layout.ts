import { HAN } from '../viz/palette'

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

/**
 * 底部那一行文字的**唯一排版规范**。
 *
 * 影片里最靠下的那行字（FilmChrome.tsx 的 CaptionBand）只有这一处来源：
 * 网页预览与 Remotion 导出 MP4 共用同一个 Film 组件，因此也共用这同一套数值。
 *
 * 规范要点：
 *   - 字号、字重、字体、行高、字间距、颜色、对齐方式**对所有字幕一视同仁**，
 *     包括「科学限定」那类补充说明 —— 它们只靠左侧竖线的浓淡区分，不靠字号。
 *   - 文字块底边固定在画面底部上方 CAPTION.bottomSafe 处（基线锚点），
 *     于是台词从一行变两行时，最后一行的位置纹丝不动，画面不会上下跳。
 *   - 水平方向左右各留 CAPTION.sideSafe 的安全边距，最长的一行也不会顶到画面边。
 */
export const CAPTION = {
  /** 字体家族：全站唯一的中文黑体栈，网页与 MP4 完全一致 */
  fontFamily: HAN,
  /** 字号（1920 x 1080 成片坐标）—— 唯一值，不分正文字号与注记字号 */
  size: 32,
  /**
   * 字重 —— 唯一值。
   *
   * 这里必须加重，不能用常规体：汉字笔画本身就细，32px 的常规体在深色底上
   * 笔画只有 2px 上下，经抗锯齿一磨就发灰，看不清。实测像素亮度只有理论值的
   * 不到一半。中文在深色背景上要读得清，得往上加到半粗。
   */
  weight: 600,
  /**
   * 文字颜色 —— 唯一值，写死为 #EEF4FF。
   *
   * 这里刻意不引用 palette 里的 PAPER：PAPER 是全站共享色，
   * 一旦有人调它，底部这一行会跟着变色。底部文字的取色是排版规范的一部分，
   * 必须是这条规范自己的常量。
   */
  color: '#FFFFFF',
  /** 底衬与左侧竖线用的衬色 */
  noteColor: '#EEF4FF',
  /** 行高 —— 唯一值 */
  lineHeight: 1.5,
  /** 字间距 —— 唯一值 */
  letterSpacing: '0.04em',
  /** 水平对齐 —— 唯一值 */
  textAlign: 'center' as const,
  /** 左右安全边距：文字块宽度上限 = STAGE.w - sideSafe * 2 */
  sideSafe: 150,
  /** 左右安全边距之内能放多宽 */
  maxWidth: STAGE.w - 150 * 2,
  /** 底部安全边距：文字块底边离画面底边的距离（基线锚点，全片固定） */
  bottomSafe: 96,
  /** 渐变底衬在文字上下各多留多少 */
  padY: 22,
  /** 渐变底衬在文字左右各多留多少 */
  padX: 48,
} as const

/** 文字块（不含底衬）占据的高度 */
export function captionTextHeight(lines: number, size: number = CAPTION.size): number {
  return Math.round(lines * size * CAPTION.lineHeight)
}

/** 字幕带（含底衬）占据的高度（按行数算，不是拍脑袋定的固定值） */
export function captionBandHeight(lines: number, size: number = CAPTION.size): number {
  return captionTextHeight(lines, size) + CAPTION.padY * 2
}

/** 字幕带的上沿（从画面底往上算）—— 场景图形不得越过这条线 */
export function captionBandTop(lines: number, size: number = CAPTION.size): number {
  return STAGE_H - CAPTION.bottomSafe - captionTextHeight(lines, size) - CAPTION.padY
}

/* ------------------------------------------------------------- 本片的版面节奏 */

/**
 * 上缘留给章节标题与关键文字的那条带子。
 *
 * 每一幕几乎每一拍都会同时出现「一句关键文字」和「一张主视觉图」，
 * 所以画面上缘必须留一条任何一拍都不占用的带子，其余版面整体往下让。
 * score.ts 里所有 key 的 y 都取这个值，两边不会各写一个数字而走偏。
 */
export const KEY_Y = 74

/** 关键文字带的高度（最大字号 keyNum 74 x 行高 1.35） */
export const KEY_BOTTOM = KEY_Y + Math.round(TYPE.keyNum * 1.35)

/**
 * 主视觉区。它的高度是倒推的：一行字幕带的上沿在 y=916，
 * 所以主视觉最多到 896 才不会被压住。
 */
export const STAGE_AREA = { top: 250, height: 646 }

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
  const seconds = Math.max(1.6, lines * 0.8 + chars * 0.06)
  return Math.round(seconds * FPS) + 12
}
