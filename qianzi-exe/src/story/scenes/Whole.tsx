/**
 * 终章：完整的知识全景。
 *
 * 这一幕不画新的东西 —— 它把镜头拉远，
 * 让前面五幕的节点在同一张图上重新连起来。
 */
import { CYAN, PAPER, MODULE_HUE } from '../../viz/palette'
import { Line, Ring, Tag } from '../../viz/parts'
import { range } from '../../lib/easing'
import { MODULES } from '../../content/modules'
import { PHRASES } from '../../content/qianzi'
import { GRID_POSITIONS, NODES, REGIONS } from '../../viz/world'
import { ALL_CHARS } from '../../content/qianzi'
import type { SceneProps } from './shared'

const charModule: string[] = (() => {
  const map: string[] = []
  for (const p of PHRASES) for (let k = 0; k < 4; k += 1) map.push(p.module)
  return map
})()

export function WholeScene({ frame, beat }: SceneProps) {
  const pullback = beat === 0
  const clusters = beat === 1
  const trace = beat === 2
  const end = beat === 3

  return (
    <g>
      {/* 五个区域的名牌 */}
      <g>
        {MODULES.map((m, i) => {
          const r = REGIONS[m.id]
          const on = range(frame, 10 + i * 8, 30 + i * 8)
          const hue = MODULE_HUE[m.id]
          return (
            <g key={m.id} opacity={on}>
              <rect
                x={r.x + 30}
                y={r.y + 20}
                width={r.w - 60}
                height={r.h - 40}
                fill="none"
                stroke={hue}
                strokeWidth={2}
                opacity={0.16}
                strokeDasharray="14 10"
              />
              <Tag x={r.x + 46} y={r.y + 52} text={m.index + '  ' + m.name} color={hue} size={34} opacity={0.9} />
              <Tag x={r.x + 46} y={r.y + 86} text={m.nameZh} color={PAPER} size={26} opacity={0.5} />
            </g>
          )
        })}
      </g>

      {/* 解码区：一千个字，在全景里就是一块字面纹理 */}
      <g opacity={0.5}>
        {ALL_CHARS.map((ch, i) => {
          const [gx, gy] = GRID_POSITIONS[i]
          const mod = charModule[i]
          const hue = MODULE_HUE[mod as keyof typeof MODULE_HUE] ?? CYAN
          return (
            <text
              key={i}
              x={gx}
              y={gy}
              fontSize={27}
              textAnchor="middle"
              fill={hue}
              opacity={0.4}
              fontFamily="'PingFang SC',sans-serif"
            >
              {ch}
            </text>
          )
        })}
        <Tag x={REGIONS.decode.x + 40} y={REGIONS.decode.y + 70} text="1000 CHARACTERS" color={CYAN} size={30} opacity={0.8} />
      </g>

      {/* 簇之间的长线：模块之间共享的语义标签 */}
      <g opacity={clusters || trace ? 1 : 0.3}>
        {MODULES.map((m, i) => {
          const a = REGIONS[m.id]
          return MODULES.slice(i + 1).map((n) => {
            const b = REGIONS[n.id]
            // 统计这两个模块之间共享的标签
            const shared = new Set<string>()
            for (const p of PHRASES) {
              if (p.module !== m.id && p.module !== n.id) continue
              for (const t of p.tags) {
                const inM = PHRASES.some((q) => q.module === m.id && q.tags.includes(t))
                const inN = PHRASES.some((q) => q.module === n.id && q.tags.includes(t))
                if (inM && inN) shared.add(t)
              }
            }
            const count = shared.size
            if (count === 0) return null
            const x1 = a.x + a.w / 2
            const y1 = a.y + a.h / 2
            const x2 = b.x + b.w / 2
            const y2 = b.y + b.h / 2
            const mx = (x1 + x2) / 2
            const my = (y1 + y2) / 2 - 140
            return (
              <path
                key={m.id + '-' + n.id}
                d={'M ' + x1 + ' ' + y1 + ' Q ' + mx + ' ' + my + ' ' + x2 + ' ' + y2}
                fill="none"
                stroke={MODULE_HUE[m.id]}
                strokeWidth={Math.min(6, count * 0.6)}
                opacity={0.1 + Math.min(0.22, count * 0.022)}
              />
            )
          })
        })}
      </g>

      {/* 追踪：挑一句出来，看它连着谁 */}
      {trace ? (
        <g>
          {(() => {
            const p = PHRASES[62]
            const node = NODES[62]
            const neighbors = PHRASES.filter(
              (q) => q.i !== 62 && q.tags.some((t) => p.tags.includes(t)),
            ).slice(0, 14)
            const on = range(frame, 6, 26)
            return (
              <g opacity={on}>
                <Ring cx={node.x} cy={node.y} r={70} fill="none" stroke={CYAN} strokeWidth={3} opacity={0.7} />
                <Tag x={node.x + 86} y={node.y - 20} text={p.text} color={PAPER} size={40} />
                <Tag x={node.x + 86} y={node.y + 18} text={p.gloss} color={CYAN} size={22} opacity={0.85} />
                {neighbors.map((q) => {
                  const nn = NODES[q.i]
                  return (
                    <g key={q.i}>
                      <Line x1={node.x} y1={node.y} x2={nn.x} y2={nn.y} color={CYAN} width={1.4} opacity={0.4} />
                      <circle cx={nn.x} cy={nn.y} r={11} fill={MODULE_HUE[q.module]} opacity={0.85} />
                      <Tag x={nn.x + 18} y={nn.y + 6} text={q.text} color={PAPER} size={26} opacity={0.85} />
                    </g>
                  )
                })}
              </g>
            )
          })()}
        </g>
      ) : null}

      {/* 结尾 */}
      {end ? (
        <g opacity={range(frame, 0, 30)}>
          <Tag x={0} y={0} text="" color={PAPER} size={0} />
        </g>
      ) : null}

      {pullback ? (
        <g opacity={range(frame, 0, 26)}>
          <Tag x={960} y={140} text="把镜头拉远" color={CYAN} size={30} anchor="middle" />
        </g>
      ) : null}
    </g>
  )
}
