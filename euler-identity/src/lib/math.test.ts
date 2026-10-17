import { describe, expect, it } from 'vitest'
import {
  PI,
  SPECIAL_ANGLES,
  TAU,
  angleDistance,
  angleFromSvgPointer,
  arcPath,
  cleanNumber,
  findSpecialIndex,
  formatAngle,
  formatNumber,
  formatPoint,
  formatTrimmed,
  normalizeAngle,
  pointOnUnitCircle,
  snapToSpecial,
  toSvgPoint,
} from './math'

describe('normalizeAngle', () => {
  it('折算到 [0, 2π)', () => {
    expect(normalizeAngle(0)).toBe(0)
    expect(normalizeAngle(TAU)).toBe(0)
    expect(normalizeAngle(-PI / 2)).toBeCloseTo((3 * PI) / 2, 10)
    expect(normalizeAngle(PI * 4 + 0.3)).toBeCloseTo(0.3, 10)
    expect(normalizeAngle(PI * 5 + 0.3)).toBeCloseTo(PI + 0.3, 10)
    expect(normalizeAngle(Number.NaN)).toBe(0)
  })
})

describe('单位圆坐标', () => {
  it('特殊角度的坐标精确', () => {
    const cases: Array<[number, number, number]> = [
      [0, 1, 0],
      [PI / 2, 0, 1],
      [PI, -1, 0],
      [(3 * PI) / 2, 0, -1],
      [TAU, 1, 0],
    ]
    cases.forEach(([theta, x, y]) => {
      const p = pointOnUnitCircle(theta)
      expect(p.x).toBeCloseTo(x, 10)
      expect(p.y).toBeCloseTo(y, 10)
    })
  })

  it('点始终落在单位圆上', () => {
    for (let i = 0; i < 40; i += 1) {
      const { x, y } = pointOnUnitCircle((i / 40) * TAU)
      expect(Math.hypot(x, y)).toBeCloseTo(1, 10)
    }
  })

  it('SVG 坐标的 y 轴被翻转', () => {
    const up = toSvgPoint(0, 0, 100, PI / 2)
    expect(up.x).toBeCloseTo(0, 10)
    expect(up.y).toBeCloseTo(-100, 10)
    expect(toSvgPoint(0, 0, 100, 0).x).toBeCloseTo(100, 10)
  })

  it('指针坐标换算回角度', () => {
    expect(angleFromSvgPointer(0, 0, 1, 0)).toBeCloseTo(0, 10)
    expect(angleFromSvgPointer(0, 0, 0, -1)).toBeCloseTo(PI / 2, 10)
    expect(angleFromSvgPointer(0, 0, -1, 0)).toBeCloseTo(PI, 10)
    expect(angleFromSvgPointer(0, 0, 0, 1)).toBeCloseTo((3 * PI) / 2, 10)
  })
})

describe('浮点误差处理', () => {
  it('sin π 之类的毛刺被清理为 0', () => {
    expect(cleanNumber(Math.sin(PI))).toBe(0)
    expect(cleanNumber(-1e-16)).toBe(0)
    expect(Object.is(cleanNumber(-1e-7), -0)).toBe(false)
  })

  it('数值展示不会出现 -0.000', () => {
    expect(formatNumber(Math.sin(PI))).toBe('0.000')
    expect(formatNumber(-0)).toBe('0.000')
    expect(formatNumber(Math.cos(PI), 0)).toBe('-1')
    expect(formatTrimmed(Math.sin(PI / 2))).toBe('1')
    expect(formatTrimmed(-1.2345)).toBe('-1.234')
  })

  it('特殊角度优先显示精确结果', () => {
    expect(formatPoint(PI)).toBe('(-1, 0)')
    expect(formatPoint(PI / 2)).toBe('(0, 1)')
    expect(formatPoint(0)).toBe('(1, 0)')
    expect(formatAngle(PI).radians).toBe('π')
    expect(formatAngle((3 * PI) / 2).radians).toBe('3π/2')
    expect(formatAngle(1.234).label).toBe(null)
  })
})

describe('特殊角度吸附', () => {
  it('靠近关键角度时吸附，远离时不动', () => {
    expect(findSpecialIndex(PI + 0.01)).toBe(2)
    expect(findSpecialIndex(PI - 0.01)).toBe(2)
    expect(findSpecialIndex(1)).toBe(-1)
    const snapped = snapToSpecial(PI + 0.01)
    expect(snapped.index).toBe(2)
    expect(snapped.value).toBeCloseTo(PI, 10)
    expect(snapToSpecial(1).index).toBe(-1)
  })

  it('拖到接近 2π 时吸附回同一方向 0', () => {
    // 2π 与 0 是同一个方向；只有显式跳到 2π 时才保留「转满一圈」的写法
    const snapped = snapToSpecial(TAU - 0.01)
    expect(snapped.value).toBeCloseTo(0, 10)
    expect(snapped.index).toBe(0)
  })

  it('0 与 2π 同角度时优先显示 0', () => {
    expect(findSpecialIndex(0)).toBe(0)
    expect(findSpecialIndex(TAU)).toBe(4)
    expect(formatAngle(0).radians).toBe('0')
    expect(formatAngle(TAU).radians).toBe('2π')
  })

  it('角度距离考虑环绕', () => {
    expect(angleDistance(TAU - 0.05, 0.05)).toBeCloseTo(0.1, 10)
  })

  it('五个特殊角度的定义与实际三角函数一致', () => {
    SPECIAL_ANGLES.forEach((special) => {
      expect(formatNumber(Math.cos(special.rad), 6)).toBe(formatNumber(special.cos, 6))
      expect(formatNumber(Math.sin(special.rad), 6)).toBe(formatNumber(special.sin, 6))
    })
  })
})

describe('arcPath', () => {
  it('四分之一弧的起止点正确', () => {
    const d = arcPath(0, 0, 100, 0, PI / 2)
    expect(d.startsWith('M 100.0000 0.0000')).toBe(true)
    expect(d.includes('0.0000 -100.0000')).toBe(true)
  })

  it('超过半圈时使用 large-arc 标记', () => {
    expect(arcPath(0, 0, 100, 0, PI)).toContain(' 0 0 ')
    expect(arcPath(0, 0, 100, 0, PI * 1.5)).toContain(' 1 0 ')
  })
})
