import { useMemo, useState } from 'react'
import { PlantFigure } from '../viz/plant'
import { cameraTransform, fitBounds, lerpCamera } from '../viz/camera'
import { planGrowth } from '../lib/growth'
import { DEFAULT_PARAMS, grow, PLANT_GRAMMAR } from '../lib/lsystem'
import { useGrowthLayers } from '../hooks/useGrowthLayers'
import { Slider } from './ui'

const VIEWPORT = { width: 1000, height: 620 }
const MAX_GEN = 7

/**
 * 层数与自相似：拖动看「简单」怎么一步步变成「复杂」。
 *
 * 镜头是每一代各自算好的取景，拖动滑块等于在两套确定的镜头之间移动，
 * 所以拖动过程本身也不会有跳动。
 */
export function DepthLab() {
  const [generation, setGeneration] = useState(3)
  const plant = useMemo(() => grow(PLANT_GRAMMAR, { ...DEFAULT_PARAMS, originX: 0, originY: 0, length: 62 }, MAX_GEN), [])
  const plan = useMemo(() => planGrowth(plant.segments, MAX_GEN, { perSegment: 0.66, breath: 0.06 }), [plant])

  // 每一代的取景一次算好；拖动滑块只是在它们之间移动
  const framings = useMemo(() => {
    const out = []
    for (let g = 0; g <= MAX_GEN; g += 1) out.push(fitBounds(boundsOf(plan, g), VIEWPORT, { padding: 1.16, maxScale: 2.6 }))
    return out
  }, [plan])

  const layers = useGrowthLayers(plan, generation / MAX_GEN)
  const from = framings[Math.max(0, generation - 1)] ?? framings[0]
  const to = framings[Math.min(generation, framings.length - 1)] ?? from
  const camera = lerpCamera(from, to, generation - Math.max(1, generation - 1))
  const count = layers.done.length + layers.growing.length

  return (
    <div>
      <div className='relative mx-auto w-full max-w-[min(94vw,680px)]' style={{ aspectRatio: '50 / 31' }}>
        <svg viewBox={'0 0 ' + VIEWPORT.width + ' ' + VIEWPORT.height} className='h-full w-full' role='img' aria-label={'长到第 ' + generation + ' 层的树，共 ' + count + ' 根枝条'}>
          <g transform={cameraTransform(camera, VIEWPORT)}>
            <PlantFigure done={layers.done} growing={layers.growing} maxDepth={plant.levels} leaves leafFromDepth={2} />
          </g>
        </svg>
      </div>

      <div className='mt-6 max-w-[420px]'>
        <Slider id='depth-gen' label='层数' value={generation} min={1} max={MAX_GEN} step={1} suffix=' 层' onChange={setGeneration} />
      </div>

      <p className='mt-5 text-[15px] text-muted'>
        当前：第 {generation} 层 · {count} 根枝条。
        <span className='ml-2 text-leaf'>整体里包含着一个缩小版的自己。</span>
      </p>
      <p className='mt-2 max-w-[58ch] text-[13px] leading-relaxed text-muted'>
        屏幕上永远只有你选的这几层，计算机是一段一段画完的。
        <span className='text-paper/80'>所谓「无限」，是指这条规则还能继续往下迭代，而不是一瞬间就画出了无穷多个分支。</span>
      </p>
    </div>
  )
}

/** 第 g 代长完之后的包围盒（固定值） */
function boundsOf(plan: ReturnType<typeof planGrowth>, gen: number) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const step of plan.steps) {
    if (step.segment.birthGen > gen) break
    const s = step.segment
    minX = Math.min(minX, s.x1 - s.width, s.x2 - s.width)
    minY = Math.min(minY, s.y1 - s.width, s.y2 - s.width)
    maxX = Math.max(maxX, s.x1 + s.width, s.x2 + s.width)
    maxY = Math.max(maxY, s.y1 + s.width, s.y2 + s.width)
  }
  return { minX, minY, maxX, maxY }
}
