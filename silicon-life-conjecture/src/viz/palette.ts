/** 全站统一的颜色与字体。影片与网页共用，改这里两边同时变。 */

export const INK = '#f4f1e8'
export const MUTED = '#8d99b6'
export const FAINT = '#59647f'
export const SIGNAL = '#6fe3d0'
export const BLUE = '#6aa8ff'
export const VIOLET = '#b48cff'
export const AMBER = '#ffc978'
export const BIO = '#7ef0b0'
export const CIRCUIT = '#8ad8ff'
export const DEEP = '#04060d'
export const NAVY = '#14244a'

export const SANS =
  "'Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
export const SERIF = "'Songti SC', 'Source Han Serif SC', 'Noto Serif CJK SC', 'Times New Roman', serif"
export const MONO = "'SFMono-Regular', 'JetBrains Mono', Menlo, monospace"

/** 把十六进制颜色加上透明度，直接给 SVG 属性用 */
export const alpha = (hex: string, a: number): string => {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')'
}
