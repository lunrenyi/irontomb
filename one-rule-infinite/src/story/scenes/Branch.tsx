import { useMemo } from 'react'
import { PlantFigure } from '../../viz/plant'
import { cameraTransform, fitCamera } from '../../viz/camera'
import { boundsAt, growingTip, planGrowth, segmentsAt } from '../../lib/growth'
import { DEFAULT_PARAMS, grow, PLANT_GRAMMAR } from '../../lib/lsystem'
import { easeOut, range } from '../../lib/easing'
import { Caption, Readout, SHOOT, Statement } from '../FilmChrome'
import { STAGE_H, STAGE_W } from '../timeline'

const GENERATIONS = 4
const VIEWPORT = { width: STAGE_W, height: STAGE_H }

/**
 * 场景 2 · 分叉
 * 只看一根枝条：它长到末端，长出两根新的；新的再长，又各长出两根。
 * 每一代都把新长出来的部分点亮，让「重复」这件事看得见。
 */
export function BranchScene({ frame }: { frame: number }) {
  const plant = useMemo(() => grow(PLANT_GRAMMAR, { ...DEFAULT_PARAMS, originX: 0, originY: 0, length: 78, angle: 30 }, GENERATIONS), [])
  const plan = useMemo(() => planGrowth(plant.segments, GENERATIONS, { perSegment: 0.5, breath: 0.26 }), [plant])

  const time = easeOut(range(frame, 10, 300))
  const drawn = segmentsAt(plan, time)
  const tip = growingTip(plan, time)
  const cameraBounds = boundsAt(plan, time * 0.94)
  const camera = fitCamera(cameraBounds, tip, VIEWPORT, { padding: 1.3, maxScale: 2.6, tipWeight: 0.34 })

  const count = drawn.length
  const depth = tip ? tip.segment.depth : 0
  const sway = (x: number) => Math.sin((frame / 30) + x * 0.02) * 1.6

  return (
    <>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <g transform={cameraTransform(camera, VIEWPORT)}>
          <PlantFigure
            segments={drawn}
            maxDepth={plant.levels}
            freshDepth={depth}
            tip={tip ? { x: tip.x, y: tip.y } : null}
            tipProgress={range(frame, 10, 30)}
            leaves
            leafFromDepth={3}
            sway={sway}
          />
        </g>
      </svg>

      <Readout x={120} y={168} size={30} color={SHOOT} anchor='start'>
        {'已经长出 ' + count + ' 根枝条'}
      </Readout>
      <Readout x={120} y={214} size={26} color={'#8fa79c'} anchor='start'>
        {'当前层数 ' + (depth + 1)}
      </Readout>

      <Statement frame={frame} from={40} to={130} y={806} size={52}>
        一根枝条，长到末端，就长出两根新的。
      </Statement>
      <Statement frame={frame} from={150} to={250} y={806} size={52}>
        新的枝条，也会照着做一遍。
      </Statement>
      <Statement frame={frame} from={270} to={360} y={806} size={56} color={SHOOT}>
        每一次分叉，用的都是同一条规则。
      </Statement>
      <Statement frame={frame} from={380} to={470} y={806} size={52}>
        这件事有个名字，叫递归。
      </Statement>

      <Caption frame={frame} from={470} to={520} size={36}>
        递归不是把图形画得更复杂，而是让「长出新的」这件事，自己再来一遍。
      </Caption>
    </>
  )
}
