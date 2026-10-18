/**
 * L-系统：把一条字符串规则变成一棵真正的树。
 *
 * 分两步：
 *   1. expandTagged()  按代展开字符串，并给每个符号打上「它是在第几代出生的」标签；
 *   2. interpret()     用海龟解释字符串，沿途把每一段画成真实的枝条（含弧度、粗细、层级）。
 *
 * 之所以要给符号打代标签：这样「生长一代」就等于「显示 birthGen <= n 的所有枝条」，
 * 而不用每次把整棵树重画一遍。旧枝条留在画面上，新枝条接着长出来。
 */

import { curvedControl, growBounds, polar, type Bounds, EMPTY_BOUNDS } from './geometry'
import { jitter, mulberry32 } from './rng'

export interface Grammar {
  name: string
  axiom: string
  /** 规则左侧是单个符号；右侧是一串指令 */
  rules: Record<string, string>
}

/** 教学用的最简规则：一眼能看懂 F / + / - / [ ] 各自做什么 */
export const LESSON_GRAMMAR: Grammar = {
  name: 'lesson',
  axiom: 'F',
  rules: { F: 'F[+F]F[-F]' },
}

/** 影片与默认树形用的规则：更像一株真正的植物，分叉更密、层次更丰富 */
export const PLANT_GRAMMAR: Grammar = {
  name: 'plant',
  axiom: 'X',
  rules: { X: 'F[+X]F[-X][+X]' },
}

export const GRAMMARS: Record<string, Grammar> = {
  lesson: LESSON_GRAMMAR,
  plant: PLANT_GRAMMAR,
}

/**
 * 每一代各有多少个 F（也就是多少根会被画出来的枝条）。
 *
 * 两条规则里 F 的右侧总是以 F 开头，所以「第 i 个 F」在每一代里落在同一个位置。
 * 于是第 i 根枝条的出生代 = 第一个满足 count(n) > i 的 n。
 */
export function fCountsByGeneration(grammar: Grammar, generations: number): number[] {
  const counts: number[] = []
  let current = grammar.axiom
  for (let g = 0; g <= generations; g += 1) {
    if (g > 0) {
      current = current
        .split('')
        .map((ch) => grammar.rules[ch] ?? ch)
        .join('')
    }
    let n = 0
    for (const ch of current) if (ch === 'F' || ch === 'G') n += 1
    counts.push(n)
    if (current.length > 400000) break
  }
  return counts
}

/** 展开成纯字符串（内部用） */
export function expandTagged(grammar: Grammar, generations: number): string {
  let current = grammar.axiom
  for (let g = 1; g <= generations; g += 1) {
    current = current
      .split('')
      .map((ch) => grammar.rules[ch] ?? ch)
      .join('')
    if (current.length > 400000) break
  }
  return current
}

/** 只要字符串：给页面上的规则面板用 */
export function expand(grammar: Grammar, generations: number): string {
  return expandTagged(grammar, generations)
}

export interface Segment {
  id: number
  /** 海龟栈深度：0 是主干，1 是侧枝，以此类推 */
  depth: number
  /** 这个符号是在第几代出生的 */
  birthGen: number
  x1: number
  y1: number
  x2: number
  y2: number
  /** 二次贝塞尔的控制点，让枝条微微弯曲 */
  cx: number
  cy: number
  width: number
  /** 末端朝向（度）：叶子、脉络都靠它定向 */
  angle: number
  /** 这段末端有没有长出下一代 */
  hasChildren: boolean
}

export interface GrowParams {
  /** 分叉角（度） */
  angle: number
  /** 一级枝条长度 */
  length: number
  /** 每深一层，长度乘以多少 */
  lengthDecay: number
  /** 一级枝条粗细 */
  width: number
  /** 每深一层，粗细乘以多少 */
  widthDecay: number
  /** 自然抖动 0-1：角度、长度、粗细都会带一点随机 */
  jitter: number
  /** 每段枝条的弯曲（度） */
  bend: number
  /** 向光性：每一层把枝条往「向上」拉一点，0 = 完全不拉 */
  gravitropism: number
  /** max deviation from originAngle; Infinity for trees, rivers must not flow uphill */
  maxDeviation?: number
  seed: number
  originX: number
  originY: number
  /** 起始朝向：-90 是向上 */
  originAngle: number
}

export const DEFAULT_PARAMS: GrowParams = {
  angle: 26,
  length: 58,
  lengthDecay: 0.74,
  width: 13,
  widthDecay: 0.62,
  jitter: 0.4,
  bend: 8,
  gravitropism: 0.13,
  seed: 20240501,
  originX: 0,
  originY: 0,
  originAngle: -90,
}

export interface Plant {
  segments: Segment[]
  grammar: Grammar
  params: GrowParams
  /** 一共展开了几代 */
  generations: number
  /** 一共长到几层（= 最大海龟深度 + 1） */
  levels: number
  /** 第 g 代及以前长出来的所有枝条 */
  atGeneration(g: number): Segment[]
  /** 全部枝条的包围盒 */
  bounds: Bounds
  /** 最末端（没有子枝）的那些枝条 */
  tips: Segment[]
}

/** 向光性：把角度往「正上方」拉一点，越深拉得越轻，模拟植物追光 */
function clampDeviation(angle: number, params: GrowParams): number {
  const limit = params.maxDeviation
  if (limit === undefined || !Number.isFinite(limit)) return angle
  const delta = shortestAngle(params.originAngle, angle)
  if (delta > limit) return params.originAngle + limit
  if (delta < -limit) return params.originAngle - limit
  return angle
}

function bendTowardLight(angle: number, params: GrowParams, depth: number): number {
  if (params.gravitropism <= 0) return angle
  const strength = params.gravitropism / (1 + depth * 0.6)
  const delta = shortestAngle(params.originAngle, angle)
  return angle + delta * strength
}

/** 两个角度之间最短的方向差（-180, 180] */
export function shortestAngle(from: number, to: number): number {
  let d = (to - from) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

/** 一次解释：字符串 -> 真实的枝条列表 */
export function interpret(grammar: Grammar, params: GrowParams, generations: number): Segment[] {
  const tokens = expandTagged(grammar, generations)
  const counts = fCountsByGeneration(grammar, generations)
  const birthOf = (index: number) => {
    for (let g = 0; g < counts.length; g += 1) if (counts[g] > index) return g
    return counts.length - 1
  }
  let fIndex = 0
  const rand = mulberry32(params.seed)
  const segments: Segment[] = []

  let x = params.originX
  let y = params.originY
  let angle = params.originAngle
  let depth = 0
  let width = params.width
  const stack: { x: number; y: number; angle: number; depth: number; width: number }[] = []

  for (const ch of tokens) {
    if (ch === 'F' || ch === 'G') {
      const wobble = 1 + jitter(rand, params.jitter * 0.42)
      const len = params.length * Math.pow(params.lengthDecay, depth) * wobble
      const bend = params.bend * jitter(rand, params.jitter * 1.3)
      const nextAngle = angle + bend
      const end = polar(x, y, len, nextAngle)
      const control = curvedControl(x, y, end.x, end.y, bend * 0.9)
      segments.push({
        id: segments.length,
        depth,
        birthGen: birthOf(fIndex),
        x1: x,
        y1: y,
        x2: end.x,
        y2: end.y,
        cx: control.cx,
        cy: control.cy,
        width: Math.max(0.6, width * (1 + jitter(rand, params.jitter * 0.16))),
        angle: nextAngle,
        hasChildren: false,
      })
      x = end.x
      y = end.y
      angle = nextAngle
      fIndex += 1
    } else if (ch === '+') {
      angle += params.angle + jitter(rand, params.jitter * params.angle * 0.35)
      angle = bendTowardLight(angle, params, depth)
      angle = clampDeviation(angle, params)
    } else if (ch === '-') {
      angle -= params.angle + jitter(rand, params.jitter * params.angle * 0.35)
      angle = bendTowardLight(angle, params, depth)
      angle = clampDeviation(angle, params)
    } else if (ch === '[') {
      stack.push({ x, y, angle, depth, width })
      depth += 1
      width = Math.max(0.5, width * params.widthDecay)
    } else if (ch === ']') {
      const saved = stack.pop()
      if (saved) {
        x = saved.x
        y = saved.y
        angle = saved.angle
        depth = saved.depth
        width = saved.width
      }
    }
    // X 是「芽点」，本身不画东西；将来长出枝条时才显形
  }

  return segments
}

/** 终点与别的枝条起点重合即视为「末端还在继续长」 */
export function markChildren(segments: Segment[]): Segment[] {
  const key = (x: number, y: number) => Math.round(x * 100) + ':' + Math.round(y * 100)
  const starts = new Set<string>()
  for (const s of segments) starts.add(key(s.x1, s.y1))
  return segments.map((s) => ({ ...s, hasChildren: s.depth > 0 && starts.has(key(s.x2, s.y2)) }))
}

/** 生成一株完整的植物（同一份输入永远得到同一株） */
export function grow(grammar: Grammar, params: GrowParams, generations: number): Plant {
  const raw = markChildren(interpret(grammar, params, generations))
  let bounds = EMPTY_BOUNDS
  for (const s of raw) {
    bounds = growBounds(bounds, s.x1, s.y1, s.width + 2)
    bounds = growBounds(bounds, s.x2, s.y2, s.width + 2)
  }
  const levels = raw.reduce((max, s) => Math.max(max, s.depth + 1), 0)
  const byGen: Segment[][] = Array.from({ length: generations + 1 }, () => [])
  for (const s of raw) {
    if (s.birthGen <= generations) byGen[s.birthGen].push(s)
  }
  return {
    segments: raw,
    grammar,
    params,
    generations,
    levels,
    bounds,
    tips: raw.filter((s) => !s.hasChildren),
    atGeneration(g) {
      const out: Segment[] = []
      for (let i = 0; i <= Math.min(g, generations); i += 1) out.push(...byGen[i])
      return out
    },
  }
}
