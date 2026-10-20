/**
 * 知识网络：250 个句子按共享的语义标签连起来。
 *
 * 这张图是**本站生成的**，不是《千字文》原有的结构 —— 界面上会写明这一点。
 * 边 = 两句共享至少一个语义标签；标签越多，边越亮。
 *
 * 三种看法由缩放决定（zoom 是世界单位 → 像素的比例）：
 *   近（zoom > 0.5）  节点带字，边是弧线
 *   中（0.2 - 0.5）   节点是点，字隐去
 *   远（< 0.2）       整张图像一张星图
 */

import { EDGES, PHRASES, type Phrase } from '../content/qianzi'
import { MODULE_HUE, alpha, CYAN, PAPER } from './palette'
import { NODES, type Node } from './world'

export interface NetworkProps {
  /** 当前镜头中心（世界坐标） */
  focusX: number
  focusY: number
  /** 缩放 */
  zoom: number
  /** 帧号，用来做一点点流动 */
  frame?: number
  /** 被选中的句子下标 */
  selected?: number | null
  /** 只画与选中句子相关的边 */
  isolate?: boolean
  /** 是否画字 */
  showLabels?: boolean
  /** 参与连线的关系半径（世界单位），超出就不画 */
  radius?: number
  /** 强调某个模块 */
  highlightModule?: string | null
  /** 已经解析出多少句 —— 没解析到的节点先不出现，网络是「长」出来的 */
  revealCount?: number
  /**
   * 画到什么程度。
   *   backdrop —— 只留一层很淡的连线当底纹（近景用，避免压住主视觉）
   *   full     —— 节点、字、连线全都画出来（远景用）
   */
  detail?: 'backdrop' | 'full'
}

const NODE_R = 11

function edgePath(a: Node, b: Node, bow: number): string {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  // 垂直于连线方向偏移，弯成一个弧
  const ox = (-dy / len) * bow
  const oy = (dx / len) * bow
  return (
    'M ' +
    a.x.toFixed(1) +
    ' ' +
    a.y.toFixed(1) +
    ' Q ' +
    (mx + ox).toFixed(1) +
    ' ' +
    (my + oy).toFixed(1) +
    ' ' +
    b.x.toFixed(1) +
    ' ' +
    b.y.toFixed(1)
  )
}

export function KnowledgeNetwork({
  focusX,
  focusY,
  zoom,
  frame = 0,
  selected = null,
  isolate = false,
  showLabels = true,
  radius = 2200,
  highlightModule = null,
  revealCount = Infinity,
  detail = 'full',
}: NetworkProps) {
  const t = frame / 30
  const far = zoom < 0.22
  const mid = zoom < 0.5
  const backdrop = detail === 'backdrop'
  const labelSize = Math.max(11, Math.min(30, 26 / Math.max(0.12, zoom)))

  const visible = new Map<number, Node>()
  for (const n of NODES) {
    if (n.i >= revealCount) continue
    const d = Math.hypot(n.x - focusX, n.y - focusY)
    if (d < radius) visible.set(n.i, n)
  }


  const edges = EDGES.map((e) => {
    const a = visible.get(e.a)
    const b = visible.get(e.b)
    if (!a || !b) return null
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    if (dist > radius * 1.6) return null
    if (isolate && selected != null && e.a !== selected && e.b !== selected) return null
    if (highlightModule && a.phrase.module !== highlightModule && b.phrase.module !== highlightModule) return null
    const near = 1 - Math.min(1, dist / (radius * 1.6))
    const strength = Math.min(1, e.shared.length / 2)
    const color = MODULE_HUE[a.phrase.module] ?? CYAN
    const isSel = selected != null && (e.a === selected || e.b === selected)
    return {
      key: e.a + '-' + e.b,
      d: edgePath(a, b, Math.min(160, dist * 0.16)),
      opacity: isSel ? 0.95 : backdrop ? 0.032 : far ? 0.1 + strength * 0.1 : 0.1 + near * 0.24 + strength * 0.08,
      color: isSel ? CYAN : color,
      width: isSel ? 2.6 : far ? 0.7 : 0.9 + strength * 0.7,
      shared: e.shared,
    }
  }).filter(Boolean) as Array<{
    key: string
    d: string
    opacity: number
    color: string
    width: number
    shared: string[]
  }>

  return (
    <g>
      <g>
        {edges.map((e) => (
          <path key={e.key} d={e.d} fill="none" stroke={e.color} strokeWidth={e.width} opacity={e.opacity} />
        ))}
      </g>

      <g>
        {(backdrop ? [] : NODES).map((n) => {
          if (!visible.has(n.i)) return null
          const isSel = selected === n.i
          const isNeighbour =
            selected != null &&
            EDGES.some((e) => (e.a === selected && e.b === n.i) || (e.b === selected && e.a === n.i))
          const dim = isolate && selected != null && !isSel && !isNeighbour
          const color = MODULE_HUE[n.phrase.module] ?? CYAN
          const pulse = isSel ? 1 + 0.18 * Math.sin(t * 4) : 1
          const r = (far ? 4.5 : mid ? 6.5 : NODE_R * 0.42) * pulse
          return (
            <g key={n.i} opacity={dim ? 0.18 : 1}>
              {isSel ? (
                <circle cx={n.x} cy={n.y} r={r * 3.4} fill="none" stroke={CYAN} strokeWidth={1.4} opacity={0.5} />
              ) : null}
              <circle cx={n.x} cy={n.y} r={r} fill={isSel ? PAPER : color} opacity={isSel ? 0.95 : far ? 0.75 : 0.85} />
              {far ? null : (
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r * 2.2}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.6}
                  opacity={isSel ? 0.4 : 0.12}
                />
              )}
            </g>
          )
        })}
      </g>

      {showLabels && !mid && !far && !backdrop ? (
        <g>
          {NODES.map((n) => {
            if (!visible.has(n.i)) return null
            const isSel = selected === n.i
            const isNeighbour =
              selected != null &&
              EDGES.some((e) => (e.a === selected && e.b === n.i) || (e.b === selected && e.a === n.i))
            const dim = isolate && selected != null && !isSel && !isNeighbour
            if (dim && !isNeighbour) return null
            return (
              <text
                key={n.i}
                x={n.x + 15}
                y={n.y + 9}
                fontSize={isSel ? labelSize * 1.15 : labelSize}
                fill={isSel ? PAPER : alpha('#dce8ff', isNeighbour ? 0.95 : 0.72)}
                fontFamily="'PingFang SC','Hiragino Sans GB',sans-serif"
                style={{ letterSpacing: '0.08em' }}
              >
                {n.phrase.text}
              </text>
            )
          })}
        </g>
      ) : null}
    </g>
  )
}

/** 供页面使用的「相关句子」摘要 */
export function neighborsOf(index: number): Phrase[] {
  return PHRASES.filter(
    (p) => p.i !== index && p.tags.some((t) => PHRASES[index].tags.includes(t)),
  )
}
