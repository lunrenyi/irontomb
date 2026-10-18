import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlantFigure } from '../viz/plant'
import { cameraTransform, fitCamera } from '../viz/camera'
import { boundsAt, growingTip, planGrowth, segmentsAt } from '../lib/growth'
import { DEFAULT_PARAMS, expand, grow, LESSON_GRAMMAR, type GrowParams } from '../lib/lsystem'
import { easeOut } from '../lib/easing'
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference'
import { Chip, Ghost, PlayButton, Slider } from './ui'

// lesson rule 4x per generation: gen 5 is already 1024 segments, more would choke the browser
const MAX_GEN = 5
const VIEWPORT = { width: 1000, height: 760 }
const RULE = 'F → F[+F]F[-F]'
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
 * 树是每一刻真的算出来的：改分叉角、改层数、换种子，
 * 都会重新跑一遍 L-系统，不是换一张图。
 */
export function GrowthLab() {
  const reducedMotion = useReducedMotionPreference()
  const [angle, setAngle] = useState(DEFAULT_PARAMS.angle)
  const [maxGen, setMaxGen] = useState(4)
  const [seed, setSeed] = useState(DEFAULT_PARAMS.seed)
  const [leaves, setLeaves] = useState(true)
  /**
   * 状态模型：target 是「正在长到第几代」，progress 是这一代长到哪儿了。
   * progress 走到 1 就停在画好的这一代；再点一次就从下一代重新开始。
   */
  const [target, setTarget] = useState(2)
  const [progress, setProgress] = useState(1)
  const [auto, setAuto] = useState(false)
  const [runId, setRunId] = useState(0)
  const targetRef = useRef(2)
  const progressRef = useRef(1)

  const params = useMemo<GrowParams>(() => ({ ...DEFAULT_PARAMS, angle, seed, length: 54, originX: 0, originY: 0 }), [angle, seed])
  const plant = useMemo(() => grow(LESSON_GRAMMAR, params, MAX_GEN), [params])
  const plan = useMemo(() => planGrowth(plant.segments, MAX_GEN, { perSegment: 0.5, breath: 0.3 }), [plant])

  // 进度 0→1 对应「正在长出第 target 代」
  // 时间取「这一代长完的那一刻」，两代之间再插值
  const time = useMemo(() => {
    const done = plan.genEnd[Math.min(target, MAX_GEN)] ?? 1
    const prev = plan.genEnd[Math.max(0, target - 1)] ?? 0
    return prev + (done - prev) * easeOut(progress)
  }, [plan, target, progress])
  const drawn = useMemo(() => segmentsAt(plan, Math.min(1, time)), [plan, time])
  const tip = useMemo(() => growingTip(plan, Math.min(1, time)), [plan, time])
  const camera = useMemo(
    () => fitCamera(drawn.length > 1 ? boundsAt(plan, Math.min(1, time) * 0.96) : plant.bounds, tip, VIEWPORT, { padding: 1.08, maxScale: 3.2, tipWeight: 0.3 }),
    [plan, time, drawn.length, plant.bounds, tip],
  )
  const sway = useCallback((x: number, y: number) => Math.sin(performance.now() / 900 + x * 0.02 + y * 0.012) * 1.6, [])

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
    const speed = 1.5 // 一秒左右长完一代
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

  const toggleAuto = useCallback(() => {
    if (auto) {
      setAuto(false)
      return
    }
    if (targetRef.current >= maxGen) {
      targetRef.current = 2
      setTarget(2)
      progressRef.current = 1
      setProgress(1)
    }
    if (progressRef.current >= 1) startGrowth()
    setAuto(true)
  }, [auto, maxGen, startGrowth])

  const growOne = useCallback(() => {
    setAuto(false)
    if (targetRef.current >= maxGen) {
      targetRef.current = 2
      setTarget(2)
      progressRef.current = 1
      setProgress(1)
    }
    startGrowth()
  }, [maxGen, startGrowth])

  const reset = useCallback(() => {
    setAuto(false)
    targetRef.current = 2
    setTarget(2)
    progressRef.current = 1
    setProgress(1)
  }, [])

  const ruleString = expand(LESSON_GRAMMAR, Math.max(1, Math.min(target, MAX_GEN)))
  const done = target >= maxGen && progress >= 1

  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10'>
      <div className='relative'>
        <div className='relative mx-auto w-full max-w-[min(94vw,560px)]' style={{ aspectRatio: '25 / 19' }}>
          <svg viewBox={'0 0 ' + VIEWPORT.width + ' ' + VIEWPORT.height} className='h-full w-full touch-none select-none' role='img' aria-label={'一棵由 L-系统生成的树，当前长到第 ' + target + ' 代'}>
            <g transform={cameraTransform(camera, VIEWPORT)}>
              <PlantFigure
                segments={drawn}
                maxDepth={plant.levels}
                freshDepth={tip ? tip.segment.depth : null}
                tip={tip && progress < 1 ? { x: tip.x, y: tip.y } : null}
                tipProgress={1}
                leaves={leaves}
                leafFromDepth={2}
                sway={sway}
              />
            </g>
          </svg>
        </div>

        <p className='mt-3 text-center text-xs text-muted'>
          第 {target} / {maxGen} 代 · 已经长出 {drawn.length} 根枝条
        </p>
      </div>

      <aside className='flex flex-col gap-5'>
        <div className='glass-panel rounded-2xl p-5'>
          <div className='text-xs uppercase tracking-[0.22em] text-muted'>规则</div>
          <div className='mt-3 text-center font-mono text-xl tracking-[0.08em] text-paper'>{RULE}</div>
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
            <div className='mt-1 break-all font-mono text-[11px] leading-relaxed text-moss'>{ruleString.slice(0, 90) || 'F'}</div>
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
            <Ghost onClick={reset}>重置</Ghost>
            <Ghost onClick={() => setSeed((s) => s + 7919)}>换一棵树</Ghost>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Chip active={leaves} tone='leaf' onClick={() => setLeaves((v) => !v)}>
              {leaves ? '隐藏叶子' : '显示叶子'}
            </Chip>
            {done ? <span className='self-center text-xs text-bud'>已经长到设定的层数</span> : null}
          </div>

          <Slider id='lab-angle' label='分叉角' value={angle} min={10} max={45} step={1} suffix='°' onChange={setAngle} />
          <Slider id='lab-depth' label='最多长到第几代' value={maxGen} min={1} max={MAX_GEN} step={1} suffix=' 代' onChange={(v) => { setMaxGen(v); if (target > v) reset() }} />
        </div>

        <p className='text-[13px] leading-relaxed text-muted'>
          每按一次「生长一代」，程序就把当前的字符串按规则再展开一次，然后用海龟把新的 F 画成枝条。
          分叉角与层数都会真正改变结果。
        </p>
      </aside>
    </div>
  )
}

export default GrowthLab
