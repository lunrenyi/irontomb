/** 全站统一的颜色。影片与网页共用，改这里两边同时变。 */

export const VOID = '#03060e'
export const DEEP = '#060b18'
export const NAVY = '#0b1730'
export const PAPER = '#eef4ff'
export const MUTED = '#8ea3c8'
export const FAINT = '#56658a'

/** 强调色：青、荧光绿、紫、琥珀金 */
export const CYAN = '#5fe3d0'
export const GREEN = '#8dff9e'
export const VIOLET = '#a78bfa'
export const AMBER = '#ffc46b'
export const CORAL = '#ff9d6b'

/** 模块主色 */
export const MODULE_HUE = {
  cosmos: CYAN,
  nature: GREEN,
  civilization: VIOLET,
  human: AMBER,
  daily: CORAL,
} as const

export const SANS =
  "'Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
export const MONO = "'SFMono-Regular', 'JetBrains Mono', Menlo, monospace"
export const HAN = "'PingFang SC', 'Hiragino Sans GB', 'Source Han Sans SC', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif"

/**
 * 等宽栈 + 显式中文字体。
 *
 * SVG 里的终端小标签现在全是中文。如果只写等宽栈，浏览器会把汉字丢给默认中文字体，
 * Remotion 导出时的字体与网页预览可能不一致（字宽、字距都会变）。
 * 因此凡是可能渲染中文的 SVG 文本，一律走这一套显式字体栈。
 */
export const MONO_HAN =
  "'SFMono-Regular', 'JetBrains Mono', Menlo, 'PingFang SC', 'Hiragino Sans GB', 'Source Han Sans SC', 'Noto Sans CJK SC', 'Microsoft YaHei', monospace"

/** 把十六进制颜色加上透明度，直接给 SVG 属性用 */
export const alpha = (hex: string, a: number): string => {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')'
}

/** 十六进制颜色混合 */
export const mix = (a: string, b: string, t: number): string => {
  const pa = a.replace('#', '')
  const pb = b.replace('#', '')
  const ch = (s: string, i: number) => parseInt(s.slice(i, i + 2), 16)
  const r = Math.round(ch(pa, 0) + (ch(pb, 0) - ch(pa, 0)) * t)
  const g = Math.round(ch(pa, 2) + (ch(pb, 2) - ch(pa, 2)) * t)
  const bl = Math.round(ch(pa, 4) + (ch(pb, 4) - ch(pa, 4)) * t)
  return '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')
}
