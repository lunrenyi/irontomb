import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CosmosFigure } from '../viz/cosmosfigure'
import { cameraTransform, fitBounds } from '../viz/camera'
import { buildCosmosWeb, cosmosStats } from '../lib/cosmos'
import { easeOut } from '../lib/easing'
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference'
import { Ghost, Slider } from './ui'

const VIEWPORT = { width: 980, height: 620 }

/**
 * 宇宙网。
 *
 * 这一块最要紧的不是好看，是别骗人：
 * 画面上一直挂着「程序生成的示意结构」，并且写清楚真实的形成机制是引力与物质演化。
 * 换一片宇宙只是换一个随机种子，形状完全不同，但成因不会因此改变。
 */
export function CosmosView() {
  const reducedMotion = useReducedMotionPreference()
  const [seed, setSeed] = useState(881204)
  const [knots, setKnots] = useState(16)
  const [tick, setTick] = useState(0)
  const [progress, setProgress] = useState(reducedMotion ? 1 : 0)
  const runId = useRef(0)

  const web = useMemo(() => buildCosmosWeb({ seed, knots }), [seed, knots])
  const stats = useMemo(() => cosmosStats(web), [web])
  const camera = useMemo(() => fitBounds(web.bounds, VIEWPORT, { padding: 1.04, maxScale: 1.5 }), [web])

  useEffect(() => {
    if (reducedMotion) {
      setProgress(1)
      return
    }
    runId.current += 1
    const mine = runId.current
    setProgress(0)
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      if (mine !== runId.current) return
      const t = Math.min(1, (now - start) / 3600)
      setProgress(easeOut(t))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [seed, knots, tick, reducedMotion])

  const respawn = useCallback(() => setSeed((s) => s + 5077), [])

  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10'>
      <div>
        <div className='relative mx-auto w-full max-w-[min(94vw,640px)]' style={{ aspectRatio: '49 / 31' }}>
          <svg viewBox={'0 0 ' + VIEWPORT.width + ' ' + VIEWPORT.height} className='h-full w-full' role='img' aria-label='程序生成的宇宙网示意：发光的团块、连接它们的丝状结构，以及大片留空的区域'>
            <g transform={cameraTransform(camera, VIEWPORT)}>
              <CosmosFigure web={web} progress={progress} />
            </g>
          </svg>
          <span className='pointer-events-none absolute left-3 top-3 rounded-full border border-moss/20 bg-ink-950/60 px-3 py-1 text-[11px] tracking-[0.14em] text-[#7f93a8]'>
            宇宙网结构示意 · 程序化生成
          </span>
        </div>

        <div className='mt-5 flex flex-wrap items-center gap-2'>
          <Ghost onClick={respawn}>换一片宇宙</Ghost>
          <Ghost onClick={() => setTick((t) => t + 1)}>重播</Ghost>
        </div>
        <div className='mt-4 max-w-[420px]'>
          <Slider id='cosmos-knots' label='聚集区数量' value={knots} min={8} max={28} step={1} suffix=' 个' onChange={setKnots} />
        </div>
      </div>

      <aside className='flex flex-col gap-4'>
        <div className='glass-panel rounded-2xl p-5'>
          <div className='text-xs uppercase tracking-[0.22em] text-muted'>这一片宇宙</div>
          <div className='mt-3 space-y-1 font-mono text-[14px] tabular-nums text-paper'>
            <div>{stats.knots} 个聚集区</div>
            <div>{stats.filaments} 条丝线 · {stats.points} 个成员点</div>
            <div className='text-[#8fa4d8]'>{Math.round(stats.voidShare * 100)}% 是空的</div>
          </div>
          <p className='mt-4 text-[13px] leading-relaxed text-muted'>
            真实宇宙里，星系就是这样分布的：物质先塌缩成团，团与团之间沿捷径连成丝，
            丝与丝之间留下巨大的空洞。
          </p>
          <p className='mt-3 text-[13px] leading-relaxed text-paper/80'>
            它和树枝、技术网络看起来有几分相似，
            <span className='text-bud'>但成因完全不同 —— 靠的是引力下物质的长期演化，不是那条分叉规则。</span>
          </p>
        </div>

        <p className='text-[12px] leading-relaxed text-faint'>
          说明：这一页的宇宙网是受真实宇宙网启发的<b className='text-muted'>程序化可视化</b>，
          由固定种子生成、每次渲染一致，并没有使用任何真实的观测数据。
        </p>
      </aside>
    </div>
  )
}

export default CosmosView
