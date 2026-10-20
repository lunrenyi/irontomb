/**
 * THE WHOLE MODEL —— 完整的知识全景。
 *
 * 把 250 句按模块摆成五个扇区，句子之间按共享的语义标签连线。
 * 点任何一个节点，就能看到它是什么、怎么讲、和谁有关。
 *
 * 这是**本站生成的关联图**，不是《千字文》原有的结构 —— 界面上写明了。
 */
import { useMemo, useState } from 'react'
import { EDGES, LENS_COLOR, LENS_LABEL, PHRASES, relatedPhrases } from '../content/qianzi'
import { MODULES } from '../content/modules'
import { MODULE_HUE, alpha, CYAN, PAPER } from '../viz/palette'
import { selectPhrase, useSelection } from '../state/selection'
import { cx } from './ui'

const W = 760
const H = 560
const CX = W / 2
const CY = H / 2

interface Placed {
  i: number
  x: number
  y: number
  text: string
  module: string
}

export function WholeModel() {
  const selection = useSelection()
  const [hover, setHover] = useState<number | null>(null)

  const placed = useMemo(() => {
    const out: Placed[] = []
    const sector = (Math.PI * 2) / MODULES.length
    MODULES.forEach((m, mi) => {
      const list = PHRASES.filter((p) => p.module === m.id)
      const base = -Math.PI / 2 + mi * sector
      const half = sector * 0.42
      list.forEach((p, k) => {
        const t = list.length === 1 ? 0.5 : (k + 0.5) / list.length
        const a = base - half + t * half * 2
        // 两圈：奇偶交错，避免点挤在一起
        const r = 150 + (k % 3) * 58
        out.push({
          i: p.i,
          x: CX + Math.cos(a) * r * 1.42,
          y: CY + Math.sin(a) * r * 0.92,
          text: p.text,
          module: m.id,
        })
      })
    })
    return out
  }, [])

  const byIndex = useMemo(() => {
    const map = new Map<number, Placed>()
    for (const p of placed) map.set(p.i, p)
    return map
  }, [placed])

  const active = selection.index ?? hover
  const activePhrase = active != null ? PHRASES[active] : null
  const related = activePhrase ? relatedPhrases(activePhrase.i, 12) : []

  const edges = useMemo(
    () =>
      EDGES.map((e) => {
        const a = byIndex.get(e.a)
        const b = byIndex.get(e.b)
        if (!a || !b) return null
        return { key: e.a + '-' + e.b, a, b, shared: e.shared }
      }).filter(Boolean) as Array<{ key: string; a: Placed; b: Placed; shared: string[] }>,
    [byIndex],
  )

  return (
    <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]'>
      <div className='relative overflow-hidden rounded-2xl border border-white/10 bg-void'>
        <svg viewBox={'0 0 ' + W + ' ' + H} className='block w-full'>
          {/* 底纹 */}
          <g opacity={0.3}>
            {Array.from({ length: 9 }, (_, i) => (
              <line key={'v' + i} x1={(i + 1) * 76} y1={0} x2={(i + 1) * 76} y2={H} stroke={CYAN} strokeWidth={0.4} opacity={0.16} />
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <line key={'h' + i} x1={0} y1={(i + 1) * 62} x2={W} y2={(i + 1) * 62} stroke={CYAN} strokeWidth={0.4} opacity={0.16} />
            ))}
          </g>

          {/* 边 */}
          <g>
            {edges.map((e) => {
              const on = active != null && (e.a.i === active || e.b.i === active)
              const dim = active != null && !on
              const mx = (e.a.x + e.b.x) / 2
              const my = (e.a.y + e.b.y) / 2
              const dx = e.b.x - e.a.x
              const dy = e.b.y - e.a.y
              const len = Math.hypot(dx, dy) || 1
              const ox = (-dy / len) * Math.min(40, len * 0.12)
              const oy = (dx / len) * Math.min(40, len * 0.12)
              return (
                <path
                  key={e.key}
                  d={'M ' + e.a.x + ' ' + e.a.y + ' Q ' + (mx + ox).toFixed(1) + ' ' + (my + oy).toFixed(1) + ' ' + e.b.x + ' ' + e.b.y}
                  fill='none'
                  stroke={on ? CYAN : MODULE_HUE[e.a.module as keyof typeof MODULE_HUE]}
                  strokeWidth={on ? 1.8 : 0.5}
                  opacity={on ? 0.85 : dim ? 0.04 : 0.14}
                />
              )
            })}
          </g>

          {/* 节点 */}
          <g>
            {placed.map((p) => {
              const on = active === p.i
              const hue = MODULE_HUE[p.module as keyof typeof MODULE_HUE]
              return (
                <g
                  key={p.i}
                  onMouseEnter={() => setHover(p.i)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => selectPhrase(on ? null : p.i)}
                  style={{ cursor: 'pointer' }}
                >
                  {on ? <circle cx={p.x} cy={p.y} r={13} fill='none' stroke={CYAN} strokeWidth={1.4} opacity={0.7} /> : null}
                  <circle cx={p.x} cy={p.y} r={on ? 6 : 3.4} fill={on ? PAPER : hue} opacity={on ? 1 : 0.85} />
                  <text
                    x={p.x}
                    y={p.y - 9}
                    textAnchor='middle'
                    fontSize={on ? 13 : 10}
                    fill={on ? PAPER : alpha('#dce8ff', 0.72)}
                    fontFamily="'PingFang SC',sans-serif"
                  >
                    {p.text}
                  </text>
                </g>
              )
            })}
          </g>

          {/* 中心 */}
          <g>
            <circle cx={CX} cy={CY} r={72} fill='#03060e' stroke={CYAN} strokeWidth={1.2} opacity={0.95} />
            <circle cx={CX} cy={CY} r={86} fill='none' stroke={CYAN} strokeWidth={0.6} opacity={0.25} strokeDasharray='6 8' />
            <text x={CX} y={CY - 14} textAnchor='middle' fontSize={22} fill={PAPER} fontFamily="'PingFang SC',sans-serif">
              千字文
            </text>
            <text x={CX} y={CY + 14} textAnchor='middle' fontSize={13} fill={CYAN} fontFamily="'SFMono-Regular',monospace">
              1000 字
            </text>
            <text x={CX} y={CY + 36} textAnchor='middle' fontSize={11} fill={alpha('#dce8ff', 0.5)} fontFamily="'SFMono-Regular',monospace">
              250 句 · 6 个模块
            </text>
          </g>

          {/* 扇区名 */}
          <g>
            {MODULES.map((m, mi) => {
              const sector = (Math.PI * 2) / MODULES.length
              const base = -Math.PI / 2 + mi * sector
              const a = base
              const x = CX + Math.cos(a) * 246
              const y = CY + Math.sin(a) * 186
              return (
                <text
                  key={m.id}
                  x={x}
                  y={y}
                  textAnchor='middle'
                  fontSize={13}
                  fill={MODULE_HUE[m.id]}
                  opacity={0.85}
                  fontFamily="'SFMono-Regular',monospace"
                  style={{ letterSpacing: '0.18em' }}
                >
                  {m.name}
                </text>
              )
            })}
          </g>
        </svg>
      </div>

      <div className='min-w-0'>
        <div className='flex flex-wrap gap-1.5'>
          {MODULES.map((m) => {
            const n = PHRASES.filter((p) => p.module === m.id).length
            return (
              <span key={m.id} className='flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[12px] text-muted'>
                <span className='h-2 w-2 rounded-full' style={{ background: MODULE_HUE[m.id] }} />
                {m.name}
                <span className='font-mono text-[10px] text-faint'>{n}</span>
              </span>
            )
          })}
        </div>

        {activePhrase ? (
          <div className='mt-4 rounded-xl border border-white/12 bg-white/[0.02] p-4'>
            <div className='flex items-baseline gap-3'>
              <span className='font-display text-[26px] tracking-[0.1em] text-paper'>{activePhrase.text}</span>
              <span
                className='rounded-full border px-2 py-0.5 text-[10px] tracking-[0.14em]'
                style={{ borderColor: alpha(LENS_COLOR[activePhrase.lens], 0.5), color: LENS_COLOR[activePhrase.lens] }}
              >
                {LENS_LABEL[activePhrase.lens]}
              </span>
            </div>
            <p className='mt-2 text-[14px] leading-relaxed text-paper'>{activePhrase.gloss}</p>
            {activePhrase.modern ? (
              <p className='mt-2 border-l border-cyan/40 pl-3 text-[12.5px] leading-relaxed text-muted'>{activePhrase.modern}</p>
            ) : null}
            <div className='mt-3 flex flex-wrap gap-1.5'>
              {activePhrase.tags.map((tag) => (
                <span key={tag} className='rounded-full border border-white/12 px-2 py-0.5 text-[11px] text-muted'>
                  {tag}
                </span>
              ))}
            </div>
            {related.length ? (
              <div className='mt-4 border-t border-white/10 pt-3'>
                <div className='font-mono text-[10px] uppercase tracking-[0.2em] text-faint'>共享标签的句子</div>
                <div className='mt-2 flex flex-wrap gap-1.5'>
                  {related.map((r) => (
                    <button
                      key={r.i}
                      type='button'
                      onClick={() => selectPhrase(r.i)}
                      className={cx(
                        'rounded-md border border-white/10 px-2 py-1 text-[12px] text-paper/80 transition-colors hover:border-cyan/50 hover:text-cyan',
                      )}
                    >
                      {r.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className='mt-4 text-[13px] leading-relaxed text-muted'>
            点图上任意一个节点。那是一句《千字文》的原文；连着它的线是它和其它句子共享的语义标签。
          </p>
        )}

        <p className='mt-4 text-[11.5px] leading-relaxed text-faint'>
          这张图由本站生成：语义标签是本站的编辑标注，连接规则是「共享至少一个标签就连一条线」。
          《千字文》本身没有留下这样一张图。
        </p>
      </div>
    </div>
  )
}
