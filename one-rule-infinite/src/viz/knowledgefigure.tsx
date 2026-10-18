/**
 * 知识依赖网络的画法。
 *
 * 与树的画法共用同一套零件，但多两件事：
 *   1. 边分两种 —— 顺着方向长出来的「支路边」，与横跨方向的「汇合边」；
 *   2. 节点与标签按屏幕像素算尺寸，所以镜头拉远时整张图仍然看得清。
 */

import { DashPath } from './parts'
import type { KnowledgeGraph, KnowledgeNode } from '../lib/knowledge'

export const K_BRANCH = '#4e8f7d'
export const K_EDGE = '#8ad8ff'
export const K_MERGE = '#ffd479'
export const K_HUB = '#ffffff'

const NODE_WINDOW = 0.03
const EDGE_WINDOW = 0.07

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/** 两条依赖线：正对时走直线，成角度时轻轻弯一下，避免所有线都笔直 */
export function edgePath(from: KnowledgeNode, to: KnowledgeNode): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.max(1e-3, Math.hypot(dx, dy))
  const bow = Math.min(120, len * 0.13)
  const mx = from.x + dx * 0.5 + (-dy / len) * bow
  const my = from.y + dy * 0.5 + (dx / len) * bow
  return 'M ' + from.x + ' ' + from.y + ' Q ' + mx + ' ' + my + ' ' + to.x + ' ' + to.y
}

export interface KnowledgeFigureProps {
  graph: KnowledgeGraph
  /** 0-1：整张网络被讲到哪儿了 */
  progress: number
  selected?: string | null
  /** 高亮的节点（教学高亮） */
  highlight?: string[]
  /** 高亮的边，格式 from>to */
  highlightEdges?: string[]
  labels?: boolean
  labelOpacity?: number
  /** 0-1：把「没有高亮」的标签压暗，高亮的照常 —— 镜头拉远时用，避免一片小字糊成噪点 */
  fadeUnfocused?: number
  /** 当前镜头缩放：节点与标签按屏幕像素算尺寸 */
  cameraScale?: number
  nodeScale?: number
  opacity?: number
  dimUnrelated?: boolean
  onSelect?: (id: string) => void
}

export function KnowledgeFigure({
  graph,
  progress,
  selected = null,
  highlight = [],
  highlightEdges = [],
  labels = true,
  labelOpacity = 1,
  fadeUnfocused = 0,
  cameraScale = 1,
  nodeScale = 1,
  opacity = 1,
  dimUnrelated = false,
  onSelect,
}: KnowledgeFigureProps) {
  // 一个世界单位在屏幕上等于多少像素
  const u = 1 / Math.max(0.02, cameraScale)
  const related = new Set<string>()
  if (selected) {
    related.add(selected)
    const node = graph.byId[selected]
    if (node) {
      node.prereqs.forEach((p) => related.add(p))
      node.unlocks.forEach((c) => related.add(c))
    }
  }
  const lit = new Set(highlight)

  return (
    <g opacity={opacity}>
      {graph.edges.map((edge) => {
        const t = clamp01((progress - edge.appear) / EDGE_WINDOW)
        if (t <= 0) return null
        const from = graph.byId[edge.from]
        const to = graph.byId[edge.to]
        if (!from || !to) return null
        const isMerge = edge.kind === 'merge'
        const key = edge.from + '>' + edge.to
        const focused = highlightEdges.indexOf(key) >= 0
        const dim = dimUnrelated && selected !== null && !related.has(edge.from) && !related.has(edge.to)
        const stroke = focused ? K_MERGE : isMerge ? K_MERGE : K_BRANCH
        return (
          <DashPath
            key={key}
            d={edgePath(from, to)}
            length={t}
            stroke={stroke}
            strokeWidth={(focused ? 2.6 : isMerge ? 1.7 : 1.5) * u}
            strokeOpacity={(focused ? 1 : isMerge ? 0.7 : 0.42) * (dim ? 0.1 : 1)}
          />
        )
      })}

      {graph.nodes.map((node) => {
        const t = clamp01((progress - node.appear) / NODE_WINDOW)
        if (t <= 0) return null
        const multi = node.prereqs.length >= 2
        const isHub = node.id === 'phone'
        const focused = lit.has(node.id) || selected === node.id
        const dim = dimUnrelated && selected !== null && !related.has(node.id)
        const r = (isHub ? 8.5 : multi ? 6 : 4.6) * u * nodeScale * t
        const color = isHub ? K_HUB : selected === node.id ? K_HUB : multi ? K_MERGE : K_EDGE
        const left = node.x < -24
        const right = node.x > 24
        const textX = left ? -(r + 6 * u) : right ? r + 6 * u : 0
        const textY = left || right ? 4 * u : -(r * 2.6 + 12 * u)
        return (
          <g
            key={node.id}
            transform={'translate(' + node.x + ' ' + node.y + ')'}
            onClick={onSelect ? () => onSelect(node.id) : undefined}
            style={onSelect ? { cursor: 'pointer' } : undefined}
          >
            <circle r={r * (focused ? 3.6 : 2.2)} fill={color} opacity={(focused ? 0.28 : 0.12) * (dim ? 0.12 : 1)} />
            <circle r={r} fill={color} opacity={(dim ? 0.18 : 1) * (focused ? 1 : 0.92)} />
            {multi && !isHub ? <circle r={r * 1.8} fill='none' stroke={K_MERGE} strokeWidth={1 * u} strokeOpacity={dim ? 0.08 : 0.45} /> : null}
            {onSelect ? <circle r={Math.max(15 * u, r * 3)} fill='transparent' /> : null}
            {labels && labelOpacity > 0.01 && !dim ? (
              <text
                x={textX}
                y={textY}
                textAnchor={left ? 'end' : right ? 'start' : 'middle'}
                fill={focused ? '#f6f2e8' : '#a9c0b8'}
                fontSize={(focused ? 15.5 : 12.5) * u * labelScale(labelOpacity)}
                opacity={(focused ? 1 : 0.85 * (1 - clamp01(fadeUnfocused))) * labelOpacity}
                fontWeight={isHub ? 600 : 400}
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

function labelScale(labelOpacity: number): number {
  return 0.85 + 0.15 * clamp01(labelOpacity)
}
