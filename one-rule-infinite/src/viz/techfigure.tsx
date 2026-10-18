/**
 * 知识依赖网络的画法。
 *
 * 和树的画法共用同一套零件，但多了两件事：
 *   1. 边分两种 —— 顺着枝条长的「支路边」，与横跨枝条的「汇合边」；
 *   2. 节点有前置与解锁的概念，所以多前置的节点会额外套一圈琥珀色的环。
 *
 * 出现顺序由图本身的拓扑顺序决定，不依赖随机数，
 * 因此网页点开和视频渲染出来是同一张图。
 */

import { DashPath } from './parts'
import type { TechEdge, TechGraph, TechNode } from '../lib/techgraph'

export const TECH_BRANCH = '#5f9c8a'
export const TECH_EDGE = '#8ad8ff'
export const TECH_MERGE = '#ffd479'

export interface TechReveal {
  /** 每个节点在 0-1 的时间轴上什么时候出现 */
  nodeAt: Record<string, number>
  /** 每条边在 0-1 的时间轴上什么时候开始画 */
  edgeAt: number[]
}

/** 按拓扑顺序排好出现时间：前置先出现，成果后出现 */
export function techReveal(graph: TechGraph): TechReveal {
  const n = graph.nodes.length
  const nodeAt: Record<string, number> = {}
  graph.nodes.forEach((node, i) => {
    nodeAt[node.id] = n <= 1 ? 0 : i / (n - 1)
  })
  const edgeAt = graph.edges.map((e) => Math.max(nodeAt[e.from] ?? 0, nodeAt[e.to] ?? 0))
  return { nodeAt, edgeAt }
}

function curvedLink(a: TechNode, b: TechNode): string {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.max(1e-3, Math.hypot(dx, dy))
  // 垂直方向掰一点，长连线才不会直挺挺地穿过去
  const bow = Math.min(90, len * 0.18)
  return 'M ' + a.x + ' ' + a.y + ' Q ' + (mx + (-dy / len) * bow) + ' ' + (my + (dx / len) * bow) + ' ' + b.x + ' ' + b.y
}

export function edgePath(graph: TechGraph, edge: TechEdge): string {
  const to = graph.byId[edge.to]
  const from = graph.byId[edge.from]
  if (!to || !from) return ''
  // 顺着枝条长出来的那条边，就用枝条原本的曲线路径，转场才是连续的
  if (edge.kind === 'branch' && to.path && to.origin === 'branch') return to.path
  return curvedLink(from, to)
}

export interface TechFigureProps {
  graph: TechGraph
  reveal: TechReveal
  /** 0-1：整张网络被讲到哪儿了 */
  progress: number
  /** 当前聚焦的节点（网页里点选的那个） */
  selected?: string | null
  /** 额外高亮的节点 */
  highlightNodes?: string[]
  /** 额外高亮的边，格式 from>to */
  highlightEdges?: string[]
  labels?: boolean
  labelScale?: number
  nodeScale?: number
  /**
   * 当前镜头的缩放。节点与标签按屏幕像素计算，
   * 否则镜头拉远一次，整张图就变成一堆看不清的小点。
   */
  cameraScale?: number
  opacity?: number
  /** 标签单独的透明度：这一场里标签要等结构出来之后才该出现 */
  labelOpacity?: number
  dimUnrelated?: boolean
  /** 点击节点（网页交互，视频模式不传） */
  onSelect?: (id: string) => void
}

const NODE_WINDOW = 0.05
const EDGE_WINDOW = 0.11

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export function TechFigure({
  graph,
  reveal,
  progress,
  selected = null,
  highlightNodes = [],
  highlightEdges = [],
  labels = true,
  labelScale = 1,
  nodeScale = 1,
  cameraScale = 1,
  opacity = 1,
  labelOpacity = 1,
  dimUnrelated = false,
  onSelect,
}: TechFigureProps) {
  // 一个世界单位在屏幕上等于多少像素
  const u = 1 / Math.max(0.02, cameraScale)
  const related = new Set<string>()
  if (selected) {
    related.add(selected)
    const node = graph.byId[selected]
    if (node) {
      node.prereqs.forEach((p) => related.add(p))
      node.unlocks.forEach((u) => related.add(u))
    }
  }
  const lit = new Set(highlightNodes)

  return (
    <g opacity={opacity}>
      {/* 先画边再画节点，节点才会压在线的上面 */}
      {graph.edges.map((edge, i) => {
        const t = clamp01((progress - reveal.edgeAt[i]) / EDGE_WINDOW)
        if (t <= 0) return null
        const isMerge = edge.kind === 'merge'
        const focused = highlightEdges.indexOf(edge.from + '>' + edge.to) >= 0
        const dim = dimUnrelated && selected !== null && !related.has(edge.from) && !related.has(edge.to)
        const stroke = focused || isMerge ? TECH_MERGE : TECH_BRANCH
        return (
          <DashPath
            key={edge.from + '>' + edge.to}
            d={edgePath(graph, edge)}
            length={t}
            stroke={stroke}
            strokeWidth={(isMerge ? 1.6 : 1.8) * u}
            strokeOpacity={(focused ? 0.95 : isMerge ? 0.8 : 0.55) * (dim ? 0.12 : 1)}
          />
        )
      })}

      {graph.nodes.map((node) => {
        const t = clamp01((progress - (reveal.nodeAt[node.id] ?? 0)) / NODE_WINDOW)
        if (t <= 0) return null
        const multi = node.prereqs.length >= 2
        const focused = lit.has(node.id) || selected === node.id
        const dim = dimUnrelated && selected !== null && !related.has(node.id)
        const r = (multi ? 6.2 : 4.4) * u * nodeScale * t
        const color = multi ? TECH_MERGE : selected === node.id ? '#ffffff' : TECH_EDGE
        return (
          <g key={node.id} transform={'translate(' + node.x + ' ' + node.y + ')'} onClick={onSelect ? () => onSelect(node.id) : undefined} style={onSelect ? { cursor: 'pointer' } : undefined}>
            <circle r={r * (focused ? 3.4 : 2.1)} fill={color} opacity={(focused ? 0.3 : 0.13) * (dim ? 0.15 : 1)} />
            <circle r={r} fill={color} opacity={(dim ? 0.2 : 1) * (focused ? 1 : 0.92)} />
            {onSelect ? <circle r={Math.max(14 * u, r * 3)} fill='transparent' /> : null}
            {multi ? <circle r={r * 1.85} fill='none' stroke={TECH_MERGE} strokeWidth={1.1 * u} strokeOpacity={dim ? 0.1 : 0.5} /> : null}
            {labels && labelOpacity > 0.01 && !dim ? (
              // 标签走侧边：分叉点都沿着枝条分两边去，
              // 标签再写在远侧就不会挤在一起了
              <text
                x={node.x < -18 ? -(r + 6 * u) : node.x > 18 ? r + 6 * u : 0}
                textAnchor={node.x < -18 ? 'end' : node.x > 18 ? 'start' : 'middle'}
                y={node.x < -18 || node.x > 18 ? 4 * u : -(r * 2.6 + 13 * u)}
                fill={focused ? '#f3efe4' : '#9fb9b0'}
                fontSize={(focused ? 15.5 : 12.5) * u * labelScale}
                letterSpacing='0.04em'
                opacity={(focused ? 1 : 0.82) * labelOpacity}
              >
                {node.label}
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}
