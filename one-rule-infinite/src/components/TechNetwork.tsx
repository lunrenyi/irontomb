import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TechFigure, techReveal } from '../viz/techfigure'
import { cameraTransform, fitBounds } from '../viz/camera'
import { buildTechGraph } from '../lib/techgraph'
import { easeOut } from '../lib/easing'
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference'
import { Chip, Ghost } from './ui'

const VIEWPORT = { width: 980, height: 680 }

/** 三条可以切换观察的路线：两条从树上长出来的，一条专门看汇合 */
const ROUTES = [
  { id: 'all', name: '全部', nodes: [] as string[] },
  { id: 'left', name: '材料这一支', nodes: ['node-2', 'node-3', 'node-4'] },
  { id: 'right', name: '信号这一支', nodes: ['node-5', 'node-6', 'node-7'] },
  { id: 'merge', name: '只看汇合', nodes: ['node-3', 'node-7', 'node-6', 'node-5', 'node-2'] },
]

/**
 * 知识依赖网络：可以点开每个节点，看它的前置与解锁。
 *
 * 这张图是程序生成的示意网络（不是真实技术史），
 * 它的目的是让人看出「知识不只是树」：既有分支，也有汇合。
 */
export function TechNetwork() {
  const reducedMotion = useReducedMotionPreference()
  const graph = useMemo(() => buildTechGraph(), [])
  const reveal = useMemo(() => techReveal(graph), [graph])
  const camera = useMemo(() => fitBounds(graph.bounds, VIEWPORT, { padding: 1.1, maxScale: 1.7 }), [graph])

  const [selected, setSelected] = useState<string | null>(null)
  const [route, setRoute] = useState('all')
  const [tick, setTick] = useState(0)
  const [progress, setProgress] = useState(reducedMotion ? 1 : 0)
  const progressRef = useRef(progress)
  const runId = useRef(0)

  useEffect(() => {
    if (reducedMotion) {
      setProgress(1)
      progressRef.current = 1
      return
    }
    runId.current += 1
    const mine = runId.current
    progressRef.current = 0
    setProgress(0)
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      if (mine !== runId.current) return
      const t = Math.min(1, (now - start) / 4200)
      progressRef.current = easeOut(t)
      setProgress(progressRef.current)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [tick, reducedMotion])

  const active = ROUTES.find((r) => r.id === route) ?? ROUTES[0]
  const node = selected ? graph.byId[selected] : null
  const focusNode = useCallback((id: string) => setSelected((cur) => (cur === id ? null : id)), [])

  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10'>
      <div>
        <div className='relative mx-auto w-full max-w-[min(94vw,620px)]' style={{ aspectRatio: '49 / 34' }}>
          <svg viewBox={'0 0 ' + VIEWPORT.width + ' ' + VIEWPORT.height} className='h-full w-full touch-manipulation' role='img' aria-label='一张示意性的技术依赖网络：节点之间既有分支，也有跨枝条的汇合'>
            <g transform={cameraTransform(camera, VIEWPORT)}>
              <TechFigure
                graph={graph}
                reveal={reveal}
                progress={progress}
                selected={selected}
                highlightNodes={active.nodes}
                dimUnrelated={active.id !== 'all' || selected !== null}
                cameraScale={camera.scale}
                nodeScale={1}
                labelScale={1}
                onSelect={focusNode}
              />
            </g>
          </svg>
        </div>

        <div className='mt-5 flex flex-wrap items-center gap-2'>
          {ROUTES.map((r) => (
            <Chip key={r.id} active={route === r.id} tone={r.id === 'merge' ? 'bud' : 'shoot'} onClick={() => setRoute(r.id)}>
              {r.name}
            </Chip>
          ))}
          <Ghost onClick={() => setTick((t) => t + 1)}>重播</Ghost>
          <Ghost onClick={() => setSelected(null)} disabled={selected === null}>
            取消选中
          </Ghost>
        </div>
        <p className='mt-3 text-[12px] leading-relaxed text-faint'>
          点任意一个节点，看它需要哪些前置、又解锁了什么。带琥珀色环的节点，前置不止一个。
        </p>
      </div>

      <aside className='flex flex-col gap-4'>
        <div className='glass-panel rounded-2xl p-5'>
          <div className='text-xs uppercase tracking-[0.22em] text-muted'>
            {node ? '选中节点' : '这是什么'}
          </div>
          {node ? (
            <div className='mt-3'>
              <div className='font-display text-[20px] text-paper'>{node.label}</div>
              <p className='mt-2 text-[13px] leading-relaxed text-muted'>{node.note}</p>
              <div className='mt-4 text-[11px] uppercase tracking-[0.18em] text-faint'>前置（{node.prereqs.length}）</div>
              <ul className='mt-2 flex flex-wrap gap-1.5'>
                {node.prereqs.length === 0 ? <li className='text-[13px] text-faint'>没有，这是最早的起点</li> : null}
                {node.prereqs.map((p) => (
                  <li key={p}>
                    <button
                      type='button'
                      onClick={() => setSelected(p)}
                      className='rounded-full border border-moss/25 px-2.5 py-1 text-[12px] text-muted transition-colors hover:border-shoot/60 hover:text-shoot'
                    >
                      {graph.byId[p] ? graph.byId[p].label : p}
                    </button>
                  </li>
                ))}
              </ul>
              <div className='mt-4 text-[11px] uppercase tracking-[0.18em] text-faint'>解锁（{node.unlocks.length}）</div>
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
              这是一张<b className='text-paper'>示意性的依赖网络</b>：节点坐在树枝的分叉点上，
              路径顺着枝条延伸。
              <span className='mt-2 block text-bud'>注意那些横跨枝条的连线：它们把两条本来无关的路线接在了一起。</span>
              <span className='mt-2 block'>所以它已经不再是一棵树 —— 一棵树没法表达「一个成果需要好几个前置」。</span>
            </div>
          )}
        </div>

        <p className='text-[13px] leading-relaxed text-muted'>
          真实的技术依赖关系确实更适合用有向无环图来画，而不是树。
          <span className='mt-1 block text-faint'>本页的名字是为了讲清依赖关系而虚构的示意例子，不代表真实的技术史或因果顺序。</span>
        </p>
      </aside>
    </div>
  )
}

export default TechNetwork
