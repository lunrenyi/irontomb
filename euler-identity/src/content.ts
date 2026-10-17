import { PI } from './lib/math'

export interface Chapter {
  id: string
  nav: string
  kicker: string
  title: string
}

export const CHAPTERS: Chapter[] = [
  { id: 'hero', nav: '序章', kicker: '序章', title: '为什么最后是 0' },
  { id: 'growth', nav: 'e 的直觉', kicker: '第一站', title: '认识 e：增长的直觉' },
  { id: 'imaginary', nav: '第二个方向', kicker: '第二站', title: '认识 i：多出一个方向' },
  { id: 'rotation', nav: '旋转实验室', kicker: '互动实验室', title: '把角度握在手里' },
  { id: 'special', nav: '走到 π', kicker: '第三站', title: 'π 是关键的一半' },
  { id: 'cancellation', nav: '抵消', kicker: '第四站', title: '为什么最后是 0' },
  { id: 'constants', nav: '五个常数', kicker: '第五站', title: '五个角色，一张合影' },
  { id: 'quiz', nav: '你来试试', kicker: '互动挑战', title: '轮到你来猜' },
]

export type ColorToken = 'vector' | 'imag' | 'node' | 'paper'

export interface ConstantCard {
  symbol: string
  name: string
  tex: string
  color: ColorToken
  summary: string
  detail: string
}

export const FIVE_CONSTANTS: ConstantCard[] = [
  {
    symbol: 'e',
    name: '自然常数',
    tex: 'e',
    color: 'vector',
    summary: '在指数与连续变化中反复出现的那个常数。',
    detail: '任何“每过一小段时间就按比例多一点点”的过程，最后都会遇到 e。它也是 e^{iθ} 里那个 e。',
  },
  {
    symbol: 'i',
    name: '虚数单位',
    tex: 'i',
    color: 'imag',
    summary: '满足 i² = -1 的数，它给数字世界加上了第二个方向。',
    detail: '在复平面上乘以 i，相当于逆时针转 90°；连续转两次，就走到了相反方向。',
  },
  {
    symbol: 'π',
    name: '圆周率',
    tex: '\pi',
    color: 'node',
    summary: '在单位圆上转 π 弧度，正好是半圈。',
    detail: '弧度是把“转了多少”换算成圆心角大小的方式。转 π 弧度 = 转 180° = 半圈。',
  },
  {
    symbol: '1',
    name: '乘法单位元',
    tex: '1',
    color: 'vector',
    summary: '任何数乘以 1 都还是它自己。',
    detail: '在恒等式里，这个 1 是“正方向的那个一”——它要和半圈得到的 -1 做邻居。',
  },
  {
    symbol: '0',
    name: '加法单位元',
    tex: '0',
    color: 'paper',
    summary: '任何数加上 0 都不变；这里，它就是最终的结果。',
    detail: '-1 与 +1 大小相等、方向相反，相加正好抵消，只剩下 0。',
  },
]

export interface QuizOption {
  id: string
  tex: string
  hint: string
  correct: boolean
}

export type QuizDemo = 'half-turn' | 'sine' | 'cancel'

export interface QuizQuestion {
  id: string
  index: number
  question: string
  /** 题干里可选的公式（用 KaTeX 渲染） */
  math?: string
  options: QuizOption[]
  explanation: string
  demo: QuizDemo
}

export const QUIZ: QuizQuestion[] = [
  {
    id: 'half-turn',
    index: 1,
    question: '圆周上的点从 (1, 0) 开始，逆时针转半圈，会停在哪里？',
    options: [
      { id: 'a', tex: '(-1,\ 0)', correct: true, hint: '对！半圈就是转到正方向的反面，也就是 -1。' },
      { id: 'b', tex: '(0,\ 1)', correct: false, hint: '那是四分之一圈（θ = π/2）的位置，再多转一会儿试试。' },
      { id: 'c', tex: '(0,\ -1)', correct: false, hint: '那是转了四分之三圈（θ = 3π/2）的位置，比半圈多了一点。' },
    ],
    explanation: '半圈对应 θ = π，此时 cos π = -1、sin π = 0，所以点落在 (-1, 0)。',
    demo: 'half-turn',
  },
  {
    id: 'sine',
    index: 2,
    question: '当 θ = π 时，sin θ 等于多少？',
    options: [
      { id: 'a', tex: '0', correct: true, hint: '没错。点落在实轴上，竖直方向没有偏移，所以 sin π = 0。' },
      { id: 'b', tex: '1', correct: false, hint: 'sin θ = 1 出现在 θ = π/2（四分之一圈，最高点）。' },
      { id: 'c', tex: '-1', correct: false, hint: 'sin θ = -1 出现在 θ = 3π/2（四分之三圈，最低点）。' },
    ],
    explanation: 'sin θ 读的是点在竖直方向的位置。转到 π 时点正好落回实轴，竖直分量为 0。',
    demo: 'sine',
  },
  {
    id: 'cancel',
    index: 3,
    question: '既然 e 的 i 次方 π 等于 -1，那么再把 1 加上去，会得到什么？',
    options: [
      { id: 'a', tex: '0', correct: true, hint: '正是如此！-1 + 1 互相抵消，原点留下一个 0。' },
      { id: 'b', tex: '1', correct: false, hint: '别忘了 e^{iπ} = -1，这一式子是 -1 + 1，不是 1 + 1。' },
      { id: 'c', tex: '-1', correct: false, hint: '-1 + 1 中和了符号，正好回到原点。' },
    ],
    math: 'e^{i\\pi} = -1 \\quad\\Rightarrow\\quad e^{i\\pi} + 1 = ?',
    explanation: '把 e 的 i 次方 π 换成 -1，这一式子就成了 -1 + 1，正好抵消成 0。这就是欧拉恒等式。',
    demo: 'cancel',
  },
]

export const HERO_QUESTION = '为什么五个看似毫不相关的数学常数，会出现在同一个公式里？'

export const EULER_FORMULA_TEX = 'e^{i\\theta} = \\cos\\theta + i\\sin\\theta'
export const EULER_IDENTITY_TEX = 'e^{i\\pi} + 1 = 0'
export const PI_VALUE = PI
