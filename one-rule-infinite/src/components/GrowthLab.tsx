import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlantFigure } from '../viz/plant'
import { cameraTransform, generationFramings, lerpCamera } from '../viz/camera'
import { budAt, planGrowth } from '../lib/growth'
import { budCountsByGeneration, DEFAULT_PARAMS, expand, grow, maxGenerationsFor, plantGrammar, type GrowParams } from '../lib/lsystem'
import { clamp01, easeOut } from '../lib/easing'
import { useGrowthLayers } from '../hooks/useGrowthLayers'
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference'
import { Chip, Ghost, PlayButton, Slider } from './ui'

// 参数不同时，可以长的代数不同，上限由 maxGenerationsFor 推定
const DEFAULT_TARGET = 4
const VIEWPORT = { width: 1000, height: 760 }
const SYMBOLS = [
  { ch: 'F', text: '向前延伸' },
  { ch: '+', text: '右转' },
  { ch: '-', text: '左转' },
  { ch: '[', text: '记住' },
  { ch: ']', text: '回来' },
]

/**
 * 生长实验室。
 *
 * 树是每一刻真的算出来的：改分叉角、改每个节点的分支数、改长度衰减、改层数、换种子，
 * 都会重新跑一遍 L-系统，不是换一张图。
 *
 * 镜头只用「每一代各自的取景」，因此连点生长按钮时画面也不会抖。
 */
export function GrowthLab() {
  const reducedMotion = useReducedMotionPreference()
  const [angle, setAngle] = useState(26)
  const [branches, setBranches] = useState(3)
  const [decay, setDecay] = useState(0.74)
  const [maxGen, setMaxGen] = useState(DEFAULT_TARGET)
  const [seed, setSeed] = useState(20240501)
  const [leaves, setLeaves] = useState(true)
  /**
   * 状态模型：target 是「正在长到第几代」，progress 是这一代长到哪儿了。
   * progress 走到 1 就停在画好的这一代；再点一次就从下一代重新开始。
   */
  const [target, setTarget] = useState(DEFAULT_TARGET)
  const [progress, setProgress] = useState(1)
  const [auto, setAuto] = useState(false)
  const [runId, setRunId] = useState(0)
  const targetRef = useRef(DEFAULT_TARGET)
  const progressRef = useRef(1)

  const grammar = useMemo(() => plantGrammar(branches), [branches])
  const params = useMemo<GrowParams>(
    () => ({ ...DEFAULT_PARAMS, angle, seed, lengthDecay: decay, length: 54, originX: 0, originY: 0 }),
    [angle, seed, decay],
  )
  // 参数变强时上限跟着调：可以长的代数变多，但不会长到浏览器卡顿
  const ceiling = useMemo(() => maxGenerationsFor(branches), [branches])
  const plant = useMemo(() => grow(grammar, params, ceiling), [grammar, params, ceiling])
  const plan = useMemo(() => planGrowth(plant.segments, ceiling, { perSegment: 0.5, breath: 0.3 }), [plant, ceiling])
  const framings = useMemo(() => generationFramings(plan, VIEWPORT, { padding: 1.08, maxScale: 3.2 }), [plan])
  const buds = useMemo(() => budCountsByGeneration(grammar, ceiling), [grammar, ceiling])

  // 进度 0→1 对应「正在长出第 target 代」
  const time = useMemo(() => {
    const done = plan.genEnd[Math.min(target, ceiling)] ?? 1
    const prev = plan.genEnd[Math.max(0, target - 1)] ?? 0
    return prev + (done - prev) * easeOut(progress)
  }, [plan, target, progress])

  const layers = useGrowthLayers(plan, time)
  const bud = useMemo(() => budAt(plan, time), [plan, time])

  // 镜头：两代取景之间按进度插值。只有改参数（用户主动操作）才会重新计算
  const from = framings[Math.max(0, target - 1)] ?? framings[0]
  const to = framings[Math.min(target, framings.length - 1)] ?? from
  const camera = useMemo(() => lerpCamera(from, to, clamp01(progress)), [from, to, progress])

  /**
   * 只有一个 rAF 循环，同时负责「长一代」和「连续生长」。
   * runId 每次 +1 就重新启动一次，保证按钮点了真的会动。
   */
  useEffect(() => {
    if (runId === 0) return
    if (reducedMotion) {
      progressRef.current = 1
      setProgress(1)
      return
    }
    let raf = 0
    let last = performance.now()
    const speed = 1.5
    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1)
      last = now
      const next = Math.min(1, progressRef.current + delta * speed)
      progressRef.current = next
      setProgress(next)
      if (next >= 1) {
        const gen = targetRef.current
        if (gen >= maxGen) {
          setAuto(false)
          return
        }
        targetRef.current = gen + 1
        setTarget(gen + 1)
        if (!auto) return
        progressRef.current = 0
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [runId, auto, maxGen, reducedMotion])

  const startGrowth = useCallback(() => {
    progressRef.current = 0
    setProgress(0)
    setRunId((id) => id + 1)
  }, [])

  const rewind = useCallback(() => {
    setAuto(false)
    targetRef.current = DEFAULT_TARGET
    setTarget(DEFAULT_TARGET)
    progressRef.current = 1
    setProgress(1)
  }, [])

  const toggleAuto = useCallback(() => {
    if (auto) {
      setAuto(false)
      return
    }
    if (targetRef.current >= maxGen) rewind()
    if (progressRef.current >= 1) startGrowth()
    setAuto(true)
  }, [auto, maxGen, startGrowth, rewind])

  const growOne = useCallback(() => {
    setAuto(false)
    if (targetRef.current >= maxGen) rewind()
    startGrowth()
  }, [maxGen, startGrowth, rewind])

  const ruleString = expand(grammar, Math.max(1, Math.min(target, ceiling)))
  const count = layers.done.length + layers.growing.length
  const done = target >= maxGen && progress >= 1

  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10'>
      <div className='relative'>
        <div className='relative mx-auto w-full max-w-[min(94vw,580px)]' style={{ aspectRatio: '25 / 19' }}>
          <svg viewBox={'0 0 ' + VIEWPORT.width + ' ' + VIEWPORT.height} className='h-full w-full touch-none select-none' role='img' aria-label={'一棵由 L-系统生成的树，当前长到第 ' + target + ' 代，共 ' + count + ' 根枝条'}>
            <g transform={cameraTransform(camera, VIEWPORT)}>
              <PlantFigure
                done={layers.done}
                growing={layers.growing}
                maxDepth={plant.levels}
                freshDepth={bud ? bud.segment.depth : null}
                tip={bud && progress < 1 ? { x: bud.x, y: bud.y } : null}
                tipProgress={1}
                leaves={leaves}
                leafFromDepth={2}
              />
            </g>
          </svg>
        </div>

        <p className='mt-3 text-center text-xs text-muted'>
          第 {target} / {maxGen} 代 · 已经长出 {count} 根枝条
        </p>
      </div>

      <aside className='flex flex-col gap-5'>
        <div className='glass-panel rounded-2xl p-5'>
          <div className='text-xs uppercase tracking-[0.22em] text-muted'>规则</div>
          <div className='mt-3 break-all text-center font-mono text-lg tracking-[0.06em] text-paper'>
            X → {grammar.rules.X}
          </div>
          <div className='mt-4 grid grid-cols-5 gap-1 text-center'>
            {SYMBOLS.map((s) => (
              <div key={s.ch}>
                <div className='font-mono text-lg text-shoot'>{s.ch}</div>
                <div className='mt-1 text-[11px] leading-tight text-muted'>{s.text}</div>
              </div>
            ))}
          </div>
          <div className='mt-4 rounded-xl border border-moss/12 bg-ink-950/40 px-3 py-2'>
            <div className='text-[11px] uppercase tracking-[0.2em] text-faint'>这一代展开成的字符串</div>
            <div className='mt-1 break-all font-mono text-[11px] leading-relaxed text-moss'>{ruleString.slice(0, 90) || 'X'}</div>
          </div>
        </div>

        <div className='glass-panel flex flex-col gap-4 rounded-2xl p-5'>
          <div className='flex flex-wrap items-center gap-2'>
            <button
              type='button'
              onClick={growOne}
              className='rounded-full bg-shoot px-4 py-1.5 text-[13px] font-semibold text-ink-950 transition-transform duration-200 hover:scale-[1.03] active:scale-95'
            >
              {target >= maxGen ? '重新开始' : '生长一代'}
            </button>
            <PlayButton playing={auto} playLabel='连续生长' pauseLabel='暂停' onClick={toggleAuto} />
            <Ghost onClick={rewind}>重置</Ghost>
            <Ghost onClick={() => setSeed((s) => s + 7919)}>换一棵树</Ghost>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Chip active={leaves} tone='leaf' onClick={() => setLeaves((v) => !v)}>
              {leaves ? '隐藏叶子' : '显示叶子'}
            </Chip>
            <Chip onClick={() => { setMaxGen(ceiling); targetRef.current = ceiling; setTarget(ceiling) }}>一次长到第 {ceiling} 代</Chip>
            {done ? <span className='self-center text-xs text-bud'>已经长到设定的层数</span> : null}
          </div>

          <Slider id='lab-angle' label='分叉角' value={angle} min={10} max={45} step={1} suffix='°' onChange={setAngle} />
          <Slider id='lab-branches' label='每个节点的分支数 b' value={branches} min={2} max={4} step={1} suffix=' 个' onChange={setBranches} />
          <Slider id='lab-decay' label='枝条长度衰减' value={Math.round(decay * 100)} min={50} max={95} step={1} suffix='%' onChange={(v) => setDecay(v / 100)} />
          <Slider id='lab-depth' label='最多长到第几代' value={maxGen} min={1} max={ceiling} step={1} suffix=' 代' onChange={(v) => { setMaxGen(v); if (target > v) { targetRef.current = v; setTarget(v) } }} />
        </div>

        <GrowthStats buds={buds} branches={branches} active={target} count={count} />
      </aside>
    </div>
  )
}

/**
 * 增长统计：第 n 层有多少个生长点。
 *
 * 当每个节点固定产生 b 个子节点时，这个数就是 b^n ——
 * 但这是一条尽量化的规则模型，真实的树不会严格照办。
 * 这一点必须写出来，否则就成了误导。
 */
function GrowthStats({ buds, branches, active, count }: { buds: number[]; branches: number; active: number; count: number }) {
  return (
    <div className='glass-panel rounded-2xl p-5'>
      <div className='text-xs uppercase tracking-[0.22em] text-muted'>增长统计</div>
      <table className='mt-3 w-full text-left text-[13px]'>
        <thead>
          <tr className='text-[11px] uppercase tracking-[0.16em] text-faint'>
            <th className='pb-1 font-normal'>第 n 层</th>
            <th className='pb-1 text-right font-normal'>生长点 bⁿ</th>
            <th className='pb-1 text-right font-normal'>画出来的枝条</th>
          </tr>
        </thead>
        <tbody className='font-mono tabular-nums'>
          {buds.slice(0, 6).map((n, i) => {
            const sum = buds.slice(0, i + 1).reduce((a, b) => a + b, 0)
            const on = i + 1 === active
            return (
              <tr key={i} className={on ? 'text-shoot' : 'text-muted'}>
                <td className='py-[3px]'>{i}</td>
                <td className='py-[3px] text-right'>{n}</td>
                <td className='py-[3px] text-right text-[12px] opacity-70'>{sum}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className='mt-3 text-[12px] leading-relaxed text-faint'>
        每层 {branches} 个分支，第 {active} 层按 bⁿ 算是 {Math.pow(branches, active)} 个生长点；
        屏幕上真正画出来的是 {count} 根枝条（枝条数是各层生长点累加的结果，不等于 bⁿ）。
        <span className='mt-1 block'>这是理想化的规则模型：真实树木并不会严格按固定分支数生长。</span>
      </p>
    </div>
  )
}
