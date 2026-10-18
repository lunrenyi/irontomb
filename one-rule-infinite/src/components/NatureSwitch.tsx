import { useEffect, useMemo, useState } from 'react'
import { PlantFigure } from '../viz/plant'
import { DashPath } from '../viz/parts'
import { cameraTransform, fitCamera } from '../viz/camera'
import { boundsAt, planGrowth, segmentsAt } from '../lib/growth'
import { DEFAULT_PARAMS, grow, PLANT_GRAMMAR } from '../lib/lsystem'
import { buildRiver, buildVeins, segmentPath } from '../lib/nature'
import { easeOut, range } from '../lib/easing'
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference'
import { Chip, Slider } from './ui'

const VIEWPORT = { width: 980, height: 660 }

type Kind = 'tree' | 'veins' | 'river'

const KINDS: { id: Kind; name: string; note: string; color: string }[] = [
  { id: 'tree', name: '枝条', note: '往两边分，越分越细，为的是采光和支撑。', color: '#63b06b' },
  { id: 'veins', name: '叶脉', note: '在一片有限的叶子里面排布，主脉带出侧脉。', color: '#7fc9a0' },
  { id: 'river', name: '河流', note: '一路向下游汇合，越往下越宽，最后散开。', color: '#7fc4d8' },
]

/**
 * 三种分支：可以自己切换、可以重播。
 * 三种结构分别由 L-系统海龟、叶脉排布、河流参数化三种算法生成。
 */
export function NatureSwitch() {
  const reducedMotion = useReducedMotionPreference()
  const [kind, setKind] = useState<Kind>('tree')
  const [angle, setAngle] = useState(DEFAULT_PARAMS.angle)
  const [tick, setTick] = useState(0)
  const [time, setTime] = useState(reducedMotion ? 1 : 0)

  const tree = useMemo(() => grow(PLANT_GRAMMAR, { ...DEFAULT_PARAMS, angle, originX: 0, originY: 0, length: 66 }, 4), [angle])
  const treePlan = useMemo(() => planGrowth(tree.segments, 4), [tree])
  const river = useMemo(() => buildRiver(5, { angle: Math.min(52, angle + 10) }), [angle])
  const riverPlan = useMemo(() => planGrowth(river.segments, 5), [river])
  const leaf = useMemo(() => buildVeins({ length: 320, width: 168, secondOrder: 8 }), [])

  useEffect(() => {
    if (reducedMotion) {
      setTime(1)
      return
    }
    setTime(0)
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 5200)
      setTime(easeOut(t))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [kind, tick, reducedMotion])

  const treeDrawn = useMemo(() => segmentsAt(treePlan, time), [treePlan, time])
  const riverDrawn = useMemo(() => segmentsAt(riverPlan, time), [riverPlan, time])
  const active = KINDS.find((k) => k.id === kind) as (typeof KINDS)[number]

  const camera =
    kind === 'tree'
      ? fitCamera(treeDrawn.length > 1 ? boundsAt(treePlan, time * 0.96) : tree.bounds, null, VIEWPORT, { padding: 1.2, maxScale: 1.9 })
      : kind === 'river'
        ? fitCamera(riverDrawn.length > 1 ? boundsAt(riverPlan, time * 0.96) : river.bounds, null, VIEWPORT, { padding: 1.14, maxScale: 1.5 })
        : { x: 0, y: -40, scale: 1.15 }

  return (
    <div>
      <div className='relative mx-auto w-full max-w-[min(94vw,620px)]' style={{ aspectRatio: '49 / 33' }}>
        <svg viewBox={'0 0 ' + VIEWPORT.width + ' ' + VIEWPORT.height} className='h-full w-full' role='img' aria-label={active.name + '的程序化生成结果'}>
          <g transform={cameraTransform(camera, VIEWPORT)}>
            {kind === 'tree' ? (
              <PlantFigure segments={treeDrawn} maxDepth={tree.levels} leaves leafFromDepth={2} />
            ) : null}
            {kind === 'river' ? <PlantFigure segments={riverDrawn} maxDepth={river.levels} style='river' leaves={false} /> : null}
            {kind === 'veins' ? (
              <g transform='translate(0 40)'>
                <path d={leaf.outline} fill={'#3f8f5a'} fillOpacity={0.1} stroke={'#7fc9a0'} strokeOpacity={0.32} strokeWidth={1.6} />
                {leaf.segments.map((s) => {
                  const at = (s.id / (leaf.segments.length + 2)) * 0.88
                  const local = easeOut(range(time, at, at + 0.1))
                  return (
                    <DashPath
                      key={s.id}
                      d={segmentPath(s, local)}
                      length={1}
                      stroke={s.depth === 0 ? '#9fe3bd' : '#6fc79a'}
                      strokeWidth={s.width}
                      strokeOpacity={0.9 - s.depth * 0.2}
                    />
                  )
                })}
              </g>
            ) : null}
          </g>
        </svg>
      </div>

      <div className='mt-6 flex flex-wrap items-center gap-2'>
        {KINDS.map((k) => (
          <Chip key={k.id} active={kind === k.id} tone={k.id === 'river' ? 'water' : 'leaf'} onClick={() => setKind(k.id)}>
            {k.name}
          </Chip>
        ))}
        <Chip onClick={() => setTick((t) => t + 1)}>重播生长</Chip>
      </div>

      <div className='mt-5 max-w-[420px]'>
        <Slider id='nature-angle' label='分叉角（影响枝条与河流）' value={angle} min={10} max={45} step={1} suffix='°' onChange={setAngle} />
      </div>

      <p className='mt-5 max-w-[52ch] text-[15px] leading-relaxed text-muted'>
        <span style={{ color: active.color }}>{active.note}</span>{' '}
        它们看起来像同一件事，但生成方式完全不同：树是海龟按规则走的，叶脉是在一片叶子里排布的，河流是一路向下游汇合的。
      </p>
    </div>
  )
}

export default NatureSwitch
