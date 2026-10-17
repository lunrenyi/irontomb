import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { TEX } from './tex'
import { complexTex, eIPowThetaTex, formatComponent, thetaTex } from './format'
import { PI, SPECIAL_ANGLES, TAU } from './math'

/** TeX 渲染必须无错：throwOnError 会让任何一个坏转义立刻暴露出来 */
function render(tex: string) {
  return katex.renderToString(tex, { throwOnError: true, output: 'html', strict: 'error' })
}

describe('TeX 字面量表', () => {
  it('每一条都能被 KaTeX 严格渲染，且不产生错误标记', () => {
    for (const [key, tex] of Object.entries(TEX)) {
      const html = render(tex)
      expect(html, `${key} = ${tex}`).not.toContain('katex-error')
      expect(html.length, key).toBeGreaterThan(0)
    }
  })

  it('反斜杠命令解析为真正的希腊字母，而不是字面字母', () => {
    // 曾经的 bug：JSX 属性不转义，'\\theta' 变成 '\\\\theta'，渲染成 “iθ” 变 “itheta”
    const thetaHtml = render(TEX.eIPowTheta).replace(/<[^>]+>/g, '')
    expect(thetaHtml).toContain('θ')
    expect(thetaHtml).not.toContain('theta')

    const piHtml = render(TEX.eulerIdentity).replace(/<[^>]+>/g, '')
    expect(piHtml).toContain('π')
    expect(piHtml).not.toContain('pi')
  })
})

describe('动态生成的 TeX（来自角度状态）', () => {
  it('特殊角度使用 π 的写法而不是小数', () => {
    for (const special of SPECIAL_ANGLES) {
      expect(thetaTex(special.rad)).toBe(special.label)
      expect(eIPowThetaTex(special.rad)).toBe(`e^{i${special.label === '0' ? '0' : special.label}}`)
    }
  })

  it('任意角度生成的公式都能渲染', () => {
    for (const theta of [0, 0.3, PI / 2, PI, (3 * PI) / 2, TAU - 0.001, TAU, 4.2, 5.9]) {
      expect(() => render(eIPowThetaTex(theta) + ' = ' + complexTex(Math.cos(theta), Math.sin(theta)))).not.toThrow()
    }
  })

  it('理论上为零时不显示 -0', () => {
    expect(complexTex(Math.cos(PI), Math.sin(PI))).toBe('-1')
    expect(complexTex(Math.cos(PI / 2), Math.sin(PI / 2))).toBe('i')
    expect(complexTex(Math.cos(0), Math.sin(0))).toBe('1')
    expect(formatComponent(Math.sin(PI))).toBe('0')
    expect(formatComponent(-1.8e-16)).toBe('0')
    expect(formatComponent(-1)).toBe('-1')
    expect(formatComponent(0.5)).toBe('0.5')
    expect(formatComponent(0.70710678)).toBe('0.707')
  })
})
