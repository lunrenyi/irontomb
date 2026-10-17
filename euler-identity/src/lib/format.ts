import { cleanNumber, formatTrimmed, getSpecial, normalizeAngle } from './math'

/** 把实部 / 虚部拼成 “0.34 + 0.94i” 这样的复数文本 */
export function complexTex(real: number, imag: number, digits = 3): string {
  const r = cleanNumber(Number(real.toFixed(digits)))
  const i = cleanNumber(Number(imag.toFixed(digits)))
  const realText = formatTrimmed(r, digits)
  const imagText = formatTrimmed(Math.abs(i), digits)
  if (i === 0) return realText
  // 纯虚数写成 i / -i，而不是 1i / -1i
  if (r === 0) {
    const sign = i > 0 ? '' : '-'
    const magnitude = Math.abs(i) === 1 ? '' : imagText
    return sign + magnitude + 'i'
  }
  return r > 0 ? realText + ' + ' + imagText + 'i' : realText + ' - ' + imagText + 'i'
}

/** 角度写成公式里的样子：命中特殊角度就用 π 的写法 */
export function thetaTex(theta: number, digits = 2): string {
  const special = getSpecial(theta)
  if (special) return special.label
  const value = formatTrimmed(normalizeAngle(theta), digits)
  return value === '1' ? '1' : value
}

/** e^{iθ} 的完整写法，用于代入展示 */
export function eIPowThetaTex(theta: number): string {
  const special = getSpecial(theta)
  if (special) return 'e^{i' + (special.label === '0' ? '0' : special.label) + '}'
  const value = formatTrimmed(theta, 3)
  return 'e^{i' + value + '}'
}
