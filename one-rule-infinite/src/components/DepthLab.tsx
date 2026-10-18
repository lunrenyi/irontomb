import { useMemo, useState } from 'react'
import { PlantFigure } from '../viz/plant'
import { cameraTransform, fitCamera } from '../viz/camera'
import { boundsAt, planGrowth, segmentsAt } from '../lib/growth'
import { DEFAULT_PARAMS, grow, PLANT_GRAMMAR } from '../lib/lsystem'
import { Slider } from './ui'

const VIEWPORT = { width: 1000, height: 620 }
const MAX_GEN = 7

/**
 * 层数与自相似：拖动看「简单」怎么一步步变成「复杂」。
 * 诚实说明：屏幕上永远只有这几层，「无限」说的是规则可以继续迭代。
 */
export function DepthLab() {
  const [generation, setGeneration] = useState(3)
  const [circuit, setCircuit] = useState(0)
  const plant = useMemo(() => grow(PLANT_GRAMMAR, { ...DEFAULT_PARAMS, originX: 0, originY: 0, length: 62 }, MAX_GEN), [])
  const plan = useMemo(() => planGrowth(plant.segments, MAX_GEN, { perSegment: 0.66, breath: 0.06 }), [plant])
  const time = generation / MAX_GEN
  const drawn = useMemo(() => segmentsAt(plan, Math.min(1, time)), [plan, time])
  const camera = useMemo(() => fitCamera(boundsAt(plan, time * 0.96), null, VIEWPORT, { padding: 1.16, maxScale: 2.6 }), [plan, time])

  return (
    <div>
      <div className='relative mx-auto w-full max-w-[min(94vw,680px)]' style={{ aspectRatio: '50 / 31' }}>
        <svg viewBox={'0 0 ' + VIEWPORT.width + ' ' + VIEWPORT.height} className='h-full w-full' role='img' aria-label={'长到第 ' + generation + ' 层的树，共 ' + drawn.length + ' 根枝条'}>
          <g transform={cameraTransform(camera, VIEWPORT)}>
            <PlantFigure segments={drawn} maxDepth={plant.levels} leaves leafFromDepth={2} circuit={circuit} />
          </g>
        </svg>
      </div>

      <div className='mt-6 grid gap-5 sm:grid-cols-2'>
        <Slider id='depth-gen' label='层数' value={generation} min={1} max={MAX_GEN} step={1} suffix=' 层' onChange={setGeneration} />
        <Slider id='depth-circuit' label='枝条 → 线路' value={Math.round(circuit * 100)} min={0} max={100} step={1} suffix='%' onChange={(v) => setCircuit(v / 100)} />
      </div>

      <p className='mt-5 text-[15px] text-muted'>
        当前：第 {generation} 层 · {drawn.length} 根枝条。
        <span className='ml-2 text-leaf'>整体里包含着一个缩小版的自己。</span>
      </p>
      <p className='mt-2 max-w-[56ch] text-[13px] leading-relaxed text-muted'>
        屏幕上永远只有你选的这几层，计算机是一段一段画完的。
        <span className='text-paper/80'>所谓「无限」，是指这条规则还能继续往下迭代，而不是一瞬间就画出了无穷多个分支。</span>
      </p>
    </div>
  )
}

export default DepthLab
