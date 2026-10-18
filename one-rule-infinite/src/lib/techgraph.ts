/**
 * 第二阶段：知识不是树，是有向无环图。
 *
 * 树只能表达「一个父节点生出若干子节点」。
 * 但知识依赖是另一回事：
 *   - 一个发现常常同时打开好几个方向（出度 > 1）；
 *   - 一个更复杂的成果，往往建立在好几个前置之上（入度 > 1）。
 *
 * 所以这里不再造一棵树，而是造一张**示意性的**依赖网络：
 *   - 前 9 个节点直接长在上一阶段那棵树的枝条上（枝条 -> 路径，分叉点 -> 节点）；
 *   - 再补几条横跨不同枝条的「汇合边」，画面上立刻能看出它已经不再是树；
 *   - 之后新的节点沿着依赖继续往外长，直到形成一个有层次的网。
 *
 * 诚实声明：下面的技术名称是为了讲清楚「依赖关系」而虚构的示意例子，
 * 不是真实的技术史，也不代表任何严格的因果顺序。
 */

import { growBounds, quadPath, type Bounds, EMPTY_BOUNDS } from './geometry'
import { grow, PLANT_GRAMMAR, type GrowParams, type Plant, type Segment } from './lsystem'

export interface TechNode {
  id: string
  label: string
  note: string
  /** 世界坐标 */
  x: number
  y: number
  /** 依赖层级：优先级，用来验证「前置一定比自己早」 */
  level: number
  /** 展示层级：枝条上的是树的深度，后来长出来的继续往上排：只用于布局 */
  tier: number
  /** 它依赖谁（可以不止一个） */
  prereqs: string[]
  /** 它解锁了谁 */
  unlocks: string[]
  /** 这个节点属于哪一段：树的枝条，还是后来长出来的 */
  origin: 'branch' | 'grown'
  /** 从父节点走到这一个节点的路径：树上就是那条枝条本身 */
  path?: string
}

export interface TechEdge {
  from: string
  to: string
  /** branch = 沿着枝条长出来的；merge = 横跨枝条的汇合 */
  kind: 'branch' | 'merge'
}

export interface TechGraph {
  nodes: TechNode[]
  /** 开发这张图所用的那棵树：前两个场景里长出来的就是它 */
  plant: Plant
  edges: TechEdge[]
  byId: Record<string, TechNode>
  levels: string[][]
  bounds: Bounds
}

export const TECH_GENERATIONS = 2

export const BASE_LABELS: { label: string; note: string }[] = [
  { label: '基础观测', note: '一切依赖的起点：先看清楚，再动手。' },
  { label: '材料工艺', note: '有了可以上手的东西，才谈得上去改造它。' },
  { label: '能量转化', note: '另一条独立的起点：把一种能量变成另一种。' },
  { label: '计算工具', note: '材料这一支先长出来的一个方向。' },
  { label: '精密测量', note: '材料这一支的另一个方向。' },
  { label: '信号处理', note: '能量这一支先长出来的一个方向。' },
  { label: '网络互联', note: '信号这一支继续往前。' },
  { label: '自动控制', note: '能量这一支的另一个方向。' },
  { label: '分布式系统', note: '信号这一支的另一个方向。' },
]

export const EXTRA_LABELS: { label: string; note: string }[] = [
  { label: '传感网络', note: '新的知识出现，同时打开了好几个方向。' },
  { label: '大规模计算', note: '另一条新路，起点不同，方向也不同。' },
  { label: '远程协作', note: '同时需要传感网络与分布式系统。' },
  { label: '智能调度', note: '同时需要传感网络与大规模计算。' },
  { label: '预测模型', note: '同时需要自动控制与大规模计算。' },
  { label: '综合平台', note: '同时需要远程协作、智能调度与预测模型。' },
  { label: '自适应系统', note: '所有前置都到位之后，才出现的新东西。' },
]

/** 横跨枝条的汇合边：[被需要的节点, 提供另一半前置的节点] */
export const MERGE_EDGES: [string, string][] = [
  ['node-1', 'node-6'],
  ['node-2', 'node-5'],
  ['node-4', 'node-2'],
]

/** 后来长出来的节点：靠依赖挂在已经存在的节点上 */
export const EXTRA_SPECS: { id: string; prereqs: string[] }[] = [
  { id: 'extra-0', prereqs: ['node-4'] },
  { id: 'extra-1', prereqs: ['node-5'] },
  { id: 'extra-2', prereqs: ['extra-0', 'node-7'] },
  { id: 'extra-3', prereqs: ['extra-0', 'extra-1'] },
  { id: 'extra-4', prereqs: ['node-6', 'extra-1'] },
  { id: 'extra-5', prereqs: ['extra-2', 'extra-3'] },
  { id: 'extra-6', prereqs: ['extra-5', 'extra-4'] },
]

export const DEFAULT_TECH_PARAMS: GrowParams = {
  angle: 30,
  length: 132,
  lengthDecay: 0.82,
  width: 11,
  widthDecay: 0.62,
  jitter: 0.18,
  bend: 7,
  gravitropism: 0.1,
  seed: 20240501,
  originX: 0,
  originY: 0,
  originAngle: -90,
}

function unique(list: string[]): string[] {
  return list.filter((v, i) => list.indexOf(v) === i)
}

/** id 的前置链里是否已经出现过 target：出现过就说明再加这条边会成环 */
function dependsOn(byId: Record<string, TechNode>, id: string, target: string): boolean {
  const seen = new Set<string>()
  const walk = (cur: string): boolean => {
    if (cur === target) return true
    if (seen.has(cur)) return false
    seen.add(cur)
    const node = byId[cur]
    return node ? node.prereqs.some(walk) : false
  }
  return walk(id)
}

/**
 * 拓扑层级：level(node) = 1 + max(level(prereq))。
 *
 * 这一层不是树的深度，而是「依赖上的先后」：
 * 一个需要三个前置的成果，层级一定比它的任何一个前置都高。
 * 于是即使汇合边连的是同一批枝条上的节点，层级关系仍然自洽。
 */
export function computeLevels(nodes: TechNode[]): Map<string, number> {
  const level = new Map<string, number>()
  let pending = nodes.slice()
  let guard = 0
  while (pending.length > 0 && guard < nodes.length + 4) {
    guard += 1
    const next: TechNode[] = []
    for (const node of pending) {
      if (!node.prereqs.every((p) => level.has(p))) {
        next.push(node)
        continue
      }
      const level0 = node.prereqs.length === 0 ? 0 : Math.max(...node.prereqs.map((p) => level.get(p) ?? 0)) + 1
      level.set(node.id, level0)
    }
    if (next.length === pending.length) break
    pending = next
  }
  for (const node of nodes) if (!level.has(node.id)) level.set(node.id, 0)
  return level
}

/** 前置 id 是否指向一个真实存在的枝条节点 */
function knownBranch(id: string, segments: Segment[]): boolean {
  if (id === 'root') return true
  if (id.indexOf('node-') !== 0) return false
  const num = Number(id.slice(5))
  return Number.isFinite(num) && num >= 0 && num < segments.length
}

/**
 * 把后来长出来的节点排成一行一行往上走。
 *
 * 用「按层排版」而不是「按角度撒开」：层与层之间是固定间距，
 * 同一层里横向摊开，于是整张图是上宽下窄的一株树，
 * 正好装得进 16:9 的画面，也不会出现标签挤成一团。
 * 同一层里的左右次序由前置位置决定，因此完全可复现。
 */
function placeExtras(specs: { id: string; prereqs: string[] }[], byId: Record<string, TechNode>, tierOf: Map<string, number>, treeTop: number) {
  const byTier = new Map<number, { id: string; x: number; y: number }[]>()
  for (const spec of specs) {
    const tier = tierOf.get(spec.id) ?? 1
    let cx = 0
    let cy = 0
    let n = 0
    for (const p of spec.prereqs) {
      const node = byId[p]
      if (node) {
        cx += node.x
        cy += node.y
        n += 1
      }
    }
    const centroid = n > 0 ? { x: cx / n, y: cy / n } : { x: 0, y: 0 }
    // 顺着前置的方向往外推一点：连线看起来是有意为之，而不是乱放
    const angle = Math.atan2(centroid.x, -centroid.y) * 0.5
    if (!byTier.has(tier)) byTier.set(tier, [])
    byTier.get(tier)?.push({ id: spec.id, x: centroid.x + Math.sin(angle) * 30, y: centroid.y - Math.cos(angle) * 30 })
  }

  const placed = new Map<string, { x: number; y: number }>()
  const tiers = [...byTier.keys()].sort((a, b) => a - b)
  const rowGap = 208
  const firstGap = 126
  tiers.forEach((tier, index) => {
    const group = (byTier.get(tier) ?? [])
      .slice()
      .sort((a, b) => a.x - b.x || (a.id < b.id ? -1 : 1))
    const half = 430 + index * 330
    const y = treeTop - firstGap - index * rowGap
    group.forEach((item, i) => {
      const t = group.length === 1 ? 0.5 : i / (group.length - 1)
      placed.set(item.id, { x: -half + half * 2 * t, y })
    })
  })
  return placed
}

/**
 * 造出整张示意网络。
 * 前 9 个节点坐在树的枝条上，后面 7 个沿着依赖继续往外长。
 */
export function buildTechGraph(params: Partial<GrowParams> = {}): TechGraph {
  const plant = grow(PLANT_GRAMMAR, { ...DEFAULT_TECH_PARAMS, ...params }, TECH_GENERATIONS)
  const segments = plant.segments

  const nodes: TechNode[] = []
  const byId: Record<string, TechNode> = {}
  const add = (node: TechNode) => {
    nodes.push(node)
    byId[node.id] = node
  }

  add({
    id: 'root',
    label: BASE_LABELS[0].label,
    note: BASE_LABELS[0].note,
    x: 0,
    y: 0,
    level: 0,
    tier: 0,
    prereqs: [],
    unlocks: [],
    origin: 'branch',
  })

  segments.forEach((s) => {
    const meta = BASE_LABELS[Math.min(BASE_LABELS.length - 1, nodes.length)]
    const id = 'node-' + s.id
    const prereqs = [s.parent >= 0 ? 'node-' + segments[s.parent].id : 'root']
    for (const pair of MERGE_EDGES) {
      if (pair[0] !== id || dependsOn(byId, id, pair[1])) continue
      prereqs.push(pair[1])
    }
    // 横跨枝条的前置：这正是让它不再是树的那几条边
    for (const pair of MERGE_EDGES) if (pair[0] === id) prereqs.push(pair[1])
    add({
      id,
      label: meta.label,
      note: meta.note,
      x: s.x2,
      y: s.y2,
      path: quadPath(s.x1, s.y1, s.cx, s.cy, s.x2, s.y2),
      level: 0,
      tier: s.depth,
      prereqs: unique(prereqs.filter((p) => p !== id && knownBranch(p, segments))),
      unlocks: [],
      origin: 'branch',
    })
  })

  EXTRA_SPECS.forEach((spec, index) => {
    const meta = EXTRA_LABELS[Math.min(EXTRA_LABELS.length - 1, index)]
    add({
      id: spec.id,
      label: meta.label,
      note: meta.note,
      x: 0,
      y: 0,
      level: 0,
      tier: 0,
      prereqs: spec.prereqs.slice(),
      unlocks: [],
      origin: 'grown',
    })
  })

  // 层级：纯依赖关系决定，与画面无关
  const levelOf = computeLevels(nodes)
  for (const node of nodes) node.level = levelOf.get(node.id) ?? 0

  // 展示层级：枝条上用树的深度，后来长出来的从最深的那个前置继续往上排
  // EXTRA_SPECS 本身就是从前到后的依赖顺序，一遍即可
  const tierOf = new Map<string, number>()
  for (const node of nodes) if (node.origin === 'branch') tierOf.set(node.id, node.tier)
  const branchTier = Math.max(0, ...[...tierOf.values()].map((v) => v))
  for (const spec of EXTRA_SPECS) {
    tierOf.set(spec.id, Math.max(branchTier, ...spec.prereqs.map((p) => tierOf.get(p) ?? 0)) + 1)
  }

  // 所有布局只依赖层级与前置位置，永远可复现
  const treeTop = Math.min(0, ...nodes.filter((n) => n.origin === 'branch').map((n) => n.y))
  const placed = placeExtras(EXTRA_SPECS, byId, tierOf, treeTop)
  for (const node of nodes) {
    if (node.origin !== 'grown') continue
    const spot = placed.get(node.id)
    node.x = spot ? spot.x : 0
    node.y = spot ? spot.y : 0
    node.tier = tierOf.get(node.id) ?? 0
  }

  const edges: TechEdge[] = []
  for (const node of nodes) {
    node.prereqs.forEach((p, index) => {
      edges.push({ from: p, to: node.id, kind: index > 0 ? 'merge' : 'branch' })
      if (byId[p]) byId[p].unlocks.push(node.id)
    })
  }

  const levels: string[][] = []
  for (const node of nodes) {
    if (!levels[node.level]) levels[node.level] = []
    levels[node.level].push(node.id)
  }

  let bounds = EMPTY_BOUNDS
  for (const n of nodes) bounds = growBounds(bounds, n.x, n.y, 70)

  return { nodes, edges, byId, levels, bounds, plant }
}

/** 有向无环图的拓扑顺序：用来验证「前置一定排在后面」 */
export function topoOrder(graph: TechGraph): string[] {
  const indegree: Record<string, number> = {}
  const outgoing: Record<string, string[]> = {}
  for (const n of graph.nodes) {
    indegree[n.id] = 0
    outgoing[n.id] = []
  }
  for (const e of graph.edges) {
    if (!(e.from in indegree) || !(e.to in indegree)) continue
    indegree[e.to] += 1
    outgoing[e.from].push(e.to)
  }
  const queue = graph.nodes.filter((n) => indegree[n.id] === 0).map((n) => n.id)
  const order: string[] = []
  while (queue.length > 0) {
    const id = queue.shift() as string
    order.push(id)
    for (const next of outgoing[id]) {
      indegree[next] -= 1
      if (indegree[next] === 0) queue.push(next)
    }
  }
  return order
}

export interface GraphCheck {
  ok: boolean
  problems: string[]
}

/** 能讲清楚故事的依赖图，必须满足：没有环、前置都存在、确有汇合节点与跨枝条连接 */
export function checkTechGraph(graph: TechGraph): GraphCheck {
  const problems: string[] = []
  for (const node of graph.nodes) {
    for (const p of node.prereqs) {
      if (!graph.byId[p]) problems.push(node.id + ' 的前置 ' + p + ' 不存在')
      else if (graph.byId[p].level >= node.level) problems.push(node.id + ' 的前置 ' + p + ' 层级没有更早')
    }
  }
  if (topoOrder(graph).length !== graph.nodes.length) problems.push('图里存在环')
  if (graph.nodes.filter((n) => n.prereqs.length >= 2).length === 0) problems.push('没有多前置的汇合节点')
  if (graph.edges.filter((e) => e.kind === 'merge').length === 0) problems.push('没有横跨枝条的连接')
  return { ok: problems.length === 0, problems }
}
