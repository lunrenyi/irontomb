/**
 * 全站唯一的 TeX 字面量表。
 *
 * 为什么不能把 TeX 直接写在 JSX 属性里：JSX 的字符串属性不做转义处理，
 * `tex='e^{i\\theta}'` 会把两个反斜杠原样交给 KaTeX，结果渲染成 “eitheta”。
 * 这里改用 TypeScript 字符串（`'\\theta'` → 一个反斜杠），
 * 再由 tex.test.ts 用 KaTeX 严格模式逐条验证，杜绝这类静默错误。
 */

export const TEX = {
  // —— 欧拉公式 / 欧拉恒等式 ——
  eulerFormula: 'e^{i\\theta} = \\cos\\theta + i\\sin\\theta',
  eulerIdentity: 'e^{i\\pi} + 1 = 0',

  // —— 复指数 ——
  eIPowTheta: 'e^{i\\theta}',
  eIPowPi: 'e^{i\\pi}',
  modulusOne: '|e^{i\\theta}| = 1',

  // —— 三角分量 ——
  cosTheta: '\\cos\\theta',
  sinTheta: '\\sin\\theta',
  iSinTheta: 'i\\sin\\theta',
  cosPi: '\\cos\\pi = -1',
  sinPi: '\\sin\\pi = 0',

  // —— 半圈推导（逐步化简）——
  atPi: 'e^{i\\pi} = \\cos\\pi + i\\sin\\pi',
  piTimesZero: 'e^{i\\pi} = -1 + i \\times 0',
  eIPowPiIsMinusOne: 'e^{i\\pi} = -1',

  // —— 最终抵消 ——
  plusOne: 'e^{i\\pi} + 1',
  minusOnePlusOne: '= -1 + 1',
  equalsZero: '= 0',

  // —— 复平面 ——
  oneTimesI: '1 \\times i = i',
  iTimesI: 'i \\times i = -1',
  iSquared: 'i^{2} = -1',
  chainOneINegOne: '1 \\rightarrow i \\rightarrow -1',

  // —— 坐标 ——
  pi: '\\pi',
  coordAb: '(a,\\ b)',
  coordCosSin: '(\\cos\\theta,\\ \\sin\\theta)',
  point10: '(1,\\ 0)',
  point0m1: '(-1,\\ 0)',
  point01: '(0,\\ 1)',
  point0mOne: '(0,\\ -1)',
} as const

export type TexKey = keyof typeof TEX
