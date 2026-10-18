import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { KnowledgeFigure } from '../viz/knowledgefigure'
import { PhoneGlyph, PHONE_GLYPH_SCALE } from '../viz/phone'
import { cameraTransform, fitBounds } from '../viz/camera'
import { buildKnowledgeGraph, PHONE_PARTS } from '../lib/knowledge'
import { clamp01 } from '../lib/easing'
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference'
import { Chip, Ghost, PlayButton } from './ui'

const VIEWPORT = { width: 900, height: 720 }
const REVEAL_MS = 9000

type ViewMode = 'all' | 'upstream' | 'downstream'

/**
 * 第二幕的可探索网络。
 *
 * 三种看法：
 *   全景 —— 整张网络按依赖顺序展开；
 *   前置基础 —— 只看这个东西站在什么之上；
 *   下游应用 —— 只看这个东西撑起了什么。
 *
 * 点任意节点会高亮它与相关节点之间的连线，并把无关的部分压暗。
 */
export function KnowledgeNet() {
  const reducedMotion = useReducedMotionPreference()
  const graph = useMemo(() => buildKnowledgeGraph(), [])
  const camera = useMemo(() => fitBounds(graph.bounds, VIEWPORT, { padding: 1.12, maxScale: 1.3 }), [graph])

  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<ViewMode>('all')
  const [progress, setProgress] = useState(reducedMotion ? 1 : 0)
  const [playing, setPlaying] = useState(!reducedMotion)
  const [runId, setRunId] = useState(0)
  const progressRef = useRef(progress)

  useEffect(() => {
    if (!playing || reducedMotion) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1)
      last = now
      const next = Math.min(1, progressRef.current + (delta * 1000) / REVEAL_MS)
      progressRef.current = next
      setProgress(next)
      if (next >= 1) {
        setPlaying(false)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, runId, reducedMotion])

  const replay = useCallback(() => {
    progressRef.current = 0
    setProgress(0)
    setPlaying(true)
    setRunId((id) => id + 1)
  }, [])

  const node = selected ? graph.byId[selected] : null

  // 三种看法对应的「该点亮谁」
  const { highlight } = useMemo(() => {
    if (!node) return { highlight: [] as string[] }
    if (mode === 'upstream') {
      const set = new Set<string>([node.id])
      node.prereqs.forEach((p) => {
        set.add(p)
        graph.byId[p].prereqs.forEach((q) => set.add(q))
      })
      return { highlight: [...set] }
    }
    if (mode === 'downstream') {
      const set = new Set<string>([node.id])
      node.unlocks.forEach((c) => {
        set.add(c)
        graph.byId[c].unlocks.forEach((g) => set.add(g))
      })
      return { highlight: [...set] }
    }
    const set = new Set<string>([node.id, ...node.prereqs, ...node.unlocks])
    return { highlight: [...set] }
  }, [node, mode, graph])

  const phone = graph.byId.phone
  // 手机在网络展开到一定程度之后才组装起来
  const parts: Record<string, number> = {}
  PHONE_PARTS.forEach((id, i) => {
    parts[id] = clamp01((progress - 0.84 - i * 0.018) / 0.05)
  })
  const assemble = clamp01((progress - 0.82) / 0.12)
  const dimOn = selected !== null

  const pick = useCallback((id: string) => {
    setSelected((cur) => (cur === id ? null : id))
  }, [])

  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10'>
      <div>
        <div className='relative mx-auto w-full max-w-[min(94vw,860px)]' style={{ aspectRatio: '5 / 4' }}>
          <svg viewBox={'0 0 ' + VIEWPORT.width + ' ' + VIEWPORT.height} className='h-full w-full touch-manipulation' role='img' aria-label='知识依赖网络示意：节点之间既有分支，也有跨方向的连接'>
            <g transform={cameraTransform(camera, VIEWPORT)}>
              <KnowledgeFigure
                graph={graph}
                progress={progress}
                selected={selected}
                highlight={highlight}
                highlightEdges={selected
                  ? graph.edges
                      .filter((e) => e.to === selected || e.from === selected)
                      .map((e) => e.from + '>' + e.to)
                  : []}
                cameraScale={camera.scale}
                dimUnrelated={dimOn}
                labelOpacity={0.9}
                onSelect={pick}
              />
              {assemble > 0.01 ? (
                <g transform={'translate(' + phone.x + ' ' + phone.y + ') scale(' + PHONE_GLYPH_SCALE + ')'}>
                  <PhoneGlyph assemble={assemble} parts={parts} cameraScale={camera.scale} />
                </g>
              ) : null}
            </g>
          </svg>
        </div>

        <div className='mt-5 flex flex-wrap items-center gap-2'>
          <PlayButton playing={playing} playLabel='播放展开' pauseLabel='暂停' onClick={() => (progress >= 1 ? replay() : setPlaying((p) => !p))} />
          <Ghost onClick={replay}>重播整段</Ghost>
          <Ghost onClick={() => { setSelected(null); setMode('all') }} disabled={selected === null}>
            恢复整张网络
          </Ghost>
        </div>
        <p className='mt-3 text-[12px] leading-relaxed text-faint'>
          点任意一个节点：它需要什么、又能撑起什么都会亮起来。
          带琥珀色环的节点，前置不止一个 —— 那就是「连接」。
        </p>
      </div>

      <aside className='flex flex-col gap-4'>
        <div className='glass-panel rounded-2xl p-5'>
          <div className='text-xs uppercase tracking-[0.22em] text-muted'>{node ? '选中节点' : '怎么看这张图'}</div>

          {node ? (
            <div className='mt-3'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='font-display text-[20px] text-paper'>{node.label}</span>
                {node.prereqs.length >= 2 ? (
                  <span className='rounded-full border border-bud/50 px-2 py-0.5 text-[11px] text-bud'>
                    {node.prereqs.length} 个前置
                  </span>
                ) : null}
              </div>
              <p className='mt-2 text-[13px] leading-relaxed text-muted'>{node.note}</p>

              <div className='mt-4 flex gap-2'>
                {(['all', 'upstream', 'downstream'] as ViewMode[]).map((m) => (
                  <Chip key={m} active={mode === m} tone={m === 'downstream' ? 'bud' : 'shoot'} onClick={() => setMode(m)}>
                    {m === 'all' ? '直接相关' : m === 'upstream' ? '前置基础' : '下游应用'}
                  </Chip>
                ))}
              </div>

              <div className='mt-4 text-[11px] uppercase tracking-[0.18em] text-faint'>
                前置基础（{node.prereqs.length}）
              </div>
              <ul className='mt-2 flex flex-wrap gap-1.5'>
                {node.prereqs.length === 0 ? <li className='text-[13px] text-faint'>没有，这是最早的起点</li> : null}
                {node.prereqs.map((p) => (
                  <li key={p}>
                    <button
                      type='button'
                      onClick={() => setSelected(p)}
                      className='rounded-full border border-moss/25 px-2.5 py-1 text-[12px] text-muted transition-colors hover:border-bud/60 hover:text-bud'
                    >
                      {graph.byId[p] ? graph.byId[p].label : p}
                    </button>
                  </li>
                ))}
              </ul>

              <div className='mt-4 text-[11px] uppercase tracking-[0.18em] text-faint'>
                能撑起什么（{node.unlocks.length}）
              </div>
              <ul className='mt-2 flex flex-wrap gap-1.5'>
                {node.unlocks.length === 0 ? <li className='text-[13px] text-faint'>暂时没有</li> : null}
                {node.unlocks.map((u) => (
                  <li key={u}>
                    <button
                      type='button'
                      onClick={() => setSelected(u)}
                      className='rounded-full border border-shoot/35 px-2.5 py-1 text-[12px] text-shoot transition-colors hover:border-shoot/70'
                    >
                      {graph.byId[u] ? graph.byId[u].label : u}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className='mt-3 text-[13px] leading-relaxed text-muted'>
              点上面任意一个节点，看看它站在什么之上、又能撑起什么。
              <span className='mt-2 block text-bud'>带琥珀色环的节点有多个前置 —— 它们往往来自不同的方向。</span>
            </div>
          )}
        </div>

        <p className='text-[12px] leading-relaxed text-faint'>
          示意模型：名称为讲清依赖关系而设，不代表真实技术史或因果顺序。
        </p>
      </aside>
    </div>
  )
}

export default KnowledgeNet
