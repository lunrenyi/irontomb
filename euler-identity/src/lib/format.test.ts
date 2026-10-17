import { describe, expect, it } from 'vitest'
import { PI } from './math'
import { complexTex, eIPowThetaTex, thetaTex } from './format'

describe('complexTex', () => {
  it('拼出可以读懂的复数', () => {
    expect(complexTex(1, 0)).toBe('1')
    expect(complexTex(-1, 0)).toBe('-1')
    expect(complexTex(0, 1)).toBe('i')
    expect(complexTex(0, -1)).toBe('-i')
    expect(complexTex(0.5, 0.866)).toBe('0.5 + 0.866i')
    expect(complexTex(-0.759, -0.651)).toBe('-0.759 - 0.651i')
  })

  it('浮点误差不会写出 +0i', () => {
    expect(complexTex(Math.cos(PI), Math.sin(PI))).toBe('-1')
  })
})

describe('thetaTex', () => {
  it('特殊角度用 π 的写法', () => {
    expect(thetaTex(0)).toBe('0')
    expect(thetaTex(PI / 2)).toBe('π/2')
    expect(thetaTex(PI)).toBe('π')
    expect(thetaTex(1.234)).toBe('1.23')
    expect(eIPowThetaTex(PI)).toBe('e^{iπ}')
    expect(eIPowThetaTex(0)).toBe('e^{i0}')
  })
})
