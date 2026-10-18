/**
 * 第三阶段：宇宙网。
 *
 * 重要说明（画面上也会写出来）：
 * 这里的宇宙网是**程序生成的示意结构**，不是任何真实的观测数据。
 *
 * 真实宇宙的大尺度结构，是引力作用下物质分布长期演化出来的：
 * 物质先塌缩成团块，团块再沿捷径连线，形成丝状结构与巨大的空洞。
 * 它和树枝、技术网络在「看起来很像」这一层有共同点，
 * 但成因完全不同，所以不能说它们都由同一条规则生成。
 */

import { growBounds, type Bounds, EMPTY_BOUNDS } from './geometry'
import { mulberry32 } from './rng'

export interface CosmosKnot {
  id: number
  x: number
  y: number
  /** 这个团块有多「重」，决定周围丝线的亮度与数量 */
  mass: number
  /** 周围有多少个成员点 */
  members: { x: number; y: number; r: number }[]
}

export interface CosmosFilament {
  a: number
  b: number
  /** 采样点：从团块 a 走到团块 b */
  points: { x: number; y: number; r: number }[]
  /** 这条丝线有多重（中间粗、两头细） */
  weight: number
}

export interface CosmosWeb {
  knots: CosmosKnot[]
  filaments: CosmosFilament[]
  /** 更远处的背景星点 */
  field: { x: number; y: number; r: number; a: number }[]
  bounds: Bounds
}

export interface CosmosOptions {
  seed?: number
  knots?: number
  /** 世界的横向跨度 */
  extent?: number
}

/**
 * 生成一张宇宙网。
 *
 * 步骤：
 *   1. 用固定种子撒下若干团块（星系聚集区）；
 *   2. 把彼此足够近的团块连起来（这些连线就是丝状结构）；
 *   3. 沿每条连线撒点，中间密两头疏 —— 这正是真实大尺度结构的样子；
 *   4. 团块附近再撒一圈密集的成员点；
 *   5. 剩下大片没有丝线的地方，就是空洞。
 *
 * 全程只用 mulberry32，不碰 Math.random，所以每次渲染完全一致。
 */
export function buildCosmosWeb(options: CosmosOptions = {}): CosmosWeb {
  const seed = options.seed ?? 881204
  const knotCount = options.knots ?? 16
  const extent = options.extent ?? 1500
  const rand = mulberry32(seed)

  const width = extent
  const height = extent * 0.72

  // 1. 团块：先撒点，太近的丢掉，于是自然形成疏密不均的分布
  const seeds: { x: number; y: number; mass: number }[] = []
  const minDist = Math.min(width, height) / (knotCount * 0.62)
  let guard = 0
  while (seeds.length < knotCount && guard < knotCount * 400) {
    guard += 1
    const x = (rand() * 2 - 1) * width * 0.5
    const y = (rand() * 2 - 1) * height * 0.5
    if (seeds.some((k) => Math.hypot(k.x - x, k.y - y) < minDist)) continue
    seeds.push({ x, y, mass: 0.35 + rand() * 0.65 })
  }

  // 2. 丝线：每个团块连向最近的几个邻居，权重由距离决定
  const rawLinks: { a: number; b: number; d: number }[] = []
  seeds.forEach((k, i) => {
    const near = seeds
      .map((other, j) => ({ j, d: Math.hypot(other.x - k.x, other.y - k.y) }))
      .filter((o) => o.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 3)
    for (const o of near) {
      const key = i < o.j ? i + '-' + o.j : o.j + '-' + i
      if (rawLinks.some((l) => (l.a < l.b ? l.a + '-' + l.b : l.b + '-' + l.a) === key)) continue
      rawLinks.push({ a: Math.min(i, o.j), b: Math.max(i, o.j), d: o.d })
    }
  })

  // 3. 沿丝线采样：中间密、两头疏
  const filaments: CosmosFilament[] = rawLinks.map((link) => {
    const from = seeds[link.a]
    const to = seeds[link.b]
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.max(1e-3, Math.hypot(dx, dy))
    const nx = -dy / len
    const ny = dx / len
    // 用固定相位的正弦扰动代替随机偏移：既能弯，又每次都一样
    const bendPhase = rand() * Math.PI * 2
    const bendAmp = len * (0.04 + rand() * 0.07)
    const steps = Math.max(8, Math.round(len / 26))
    const points: { x: number; y: number; r: number }[] = []
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps
      const swell = Math.sin(Math.PI * t)
      const bow = swell * bendAmp
      // 波动也在两端归零，不然东西不能接上团块
      const wobble = Math.sin(t * 5.4 + bendPhase) * len * 0.014 * swell
      points.push({
        x: from.x + dx * t + nx * (bow + wobble),
        y: from.y + dy * t + ny * (bow + wobble),
        r: 0.7 + swell * 1.5 + rand() * 0.5,
      })
    }
    return { a: link.a, b: link.b, points, weight: 0.45 + (1 - link.d / (Math.max(width, height) * 0.9)) * 0.85 }
  })

  // 4. 团块的成员点
  const knots: CosmosKnot[] = seeds.map((k, i) => {
    const members: { x: number; y: number; r: number }[] = []
    const count = 6 + Math.round(k.mass * 16)
    const spread = 16 + k.mass * 46
    for (let j = 0; j < count; j += 1) {
      const a = rand() * Math.PI * 2
      const rr = Math.pow(rand(), 0.65) * spread
      members.push({ x: k.x + Math.cos(a) * rr, y: k.y + Math.sin(a) * rr * 0.8, r: 0.6 + rand() * (1 + k.mass * 1.5) })
    }
    return { id: i, x: k.x, y: k.y, mass: k.mass, members }
  })

  // 5. 背景星场
  const field: { x: number; y: number; r: number; a: number }[] = []
  for (let i = 0; i < 240; i += 1) {
    field.push({
      x: (rand() * 2 - 1) * width * 0.58,
      y: (rand() * 2 - 1) * height * 0.58,
      r: 0.35 + rand() * 0.9,
      a: 0.12 + rand() * 0.4,
    })
  }

  let bounds = EMPTY_BOUNDS
  for (const k of knots) bounds = growBounds(bounds, k.x, k.y, 90)
  for (const f of field) bounds = growBounds(bounds, f.x, f.y, 4)

  return { knots, filaments, field, bounds }
}

export interface CosmosStats {
  knots: number
  filaments: number
  points: number
  /** 空洞占比：画面上没有任何点的格子比例，用来解释「大片空着」 */
  voidShare: number
}

/** 顺手算几个读数：丝线数、点数、空洞比例 */
export function cosmosStats(web: CosmosWeb): CosmosStats {
  let points = 0
  for (const k of web.knots) points += k.members.length
  for (const f of web.filaments) points += f.points.length

  const cell = 60
  const cols = Math.ceil((web.bounds.maxX - web.bounds.minX) / cell)
  const rows = Math.ceil((web.bounds.maxY - web.bounds.minY) / cell)
  const grid = new Uint8Array(Math.max(1, cols * rows))
  const stamp = (x: number, y: number) => {
    const cx = Math.floor((x - web.bounds.minX) / cell)
    const cy = Math.floor((y - web.bounds.minY) / cell)
    for (let dx = -2; dx <= 2; dx += 1) {
      for (let dy = -2; dy <= 2; dy += 1) {
        const gx = cx + dx
        const gy = cy + dy
        if (gx >= 0 && gy >= 0 && gx < cols && gy < rows) grid[gy * cols + gx] = 1
      }
    }
  }
  for (const k of web.knots) for (const m of k.members) stamp(m.x, m.y)
  for (const f of web.filaments) for (const p of f.points) stamp(p.x, p.y)
  let empty = 0
  for (let i = 0; i < grid.length; i += 1) if (grid[i] === 0) empty += 1

  return {
    knots: web.knots.length,
    filaments: web.filaments.length,
    points,
    voidShare: grid.length > 0 ? empty / grid.length : 0,
  }
}
