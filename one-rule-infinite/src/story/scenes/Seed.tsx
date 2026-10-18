import { useMemo } from 'react'
import { PlantFigure, BUD } from '../../viz/plant'
import { cameraTransform, fitBounds, generationFramings, growthCamera, lerpCamera } from '../../viz/camera'
import { budAt, planGrowth } from '../../lib/growth'
import { DEFAULT_PARAMS, grow, PLANT_GRAMMAR } from '../../lib/lsystem'
import { easeInOut, easeOut, range } from '../../lib/easing'
import { useGrowthLayers } from '../../hooks/useGrowthLayers'
import { Caption, Readout, Title } from '../FilmChrome'
import { STAGE_H, STAGE_W } from '../timeline'

const GENERATIONS = 5
const VIEWPORT = { width: STAGE_W, height: STAGE_H }

/**
 * 场景 1 · 一颗种子
 * 从一个几乎看不见的点开始，一根枝条长出来，分叉，再分叉……
 * 镜头由「每一代各自的取景」决定：只拉远，不跟拍，不追踪包围盒。
 */
export function SeedScene({ frame }: { frame: number }) {
  const plant = useMemo(() => grow(PLANT_GRAMMAR, { ...DEFAULT_PARAMS, originX: 0, originY: 0 }, GENERATIONS), [])
  const plan = useMemo(() => planGrowth(plant.segments, GENERATIONS, { perSegment: 0.62, breath: 0.1 }), [plant])

  // 镜头路线：完全由参数算出来，任何一帧都不会临时重新取景
  const framings = useMemo(() => generationFramings(plan, VIEWPORT, { padding: 1.2, maxScale: 3.1 }), [plan])
  const wide = useMemo(() => fitBounds(plant.bounds, VIEWPORT, { padding: 1.12, maxScale: 3.1 }), [plant])

  const growFrom = 54
  const growTo = 408
  const time = easeOut(range(frame, growFrom, growTo))
  const layers = useGrowthLayers(plan, time)
  const bud = budAt(plan, time)

  // 生长途中跟着「那一代该有的镜头」；标题出现前再补一段明确的拉远
  const camera = lerpCamera(
    growthCamera(plan, framings, time),
    wide,
    easeInOut(range(frame, growTo - 40, growTo + 84)),
  )

  const seedScale = range(frame, 4, 30) * (1 - range(frame, growFrom, growFrom + 26) * 0.75)
  const seedGlow = 0.5 + 0.5 * Math.sin((frame / 26) % (Math.PI * 2))
  const tipVisible = range(frame, growFrom, growFrom + 18) * (1 - range(frame, growTo - 10, growTo + 20))
  // 标题出现时把树压暗，文字才读得清
  const treeDim = 1 - range(frame, 372, 416) * 0.62

  return (
    <>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <g transform={cameraTransform(camera, VIEWPORT)} opacity={treeDim}>
          <PlantFigure
            done={layers.done}
            growing={layers.growing}
            maxDepth={plant.levels}
            freshDepth={bud ? bud.segment.depth : null}
            tip={tipVisible > 0.02 && bud ? { x: bud.x, y: bud.y } : null}
            tipProgress={tipVisible}
            leaves
            leafFromDepth={2}
          />
        </g>

        {/* 种子：一切开始之前的那一个点 */}
        {seedScale > 0.01 ? (
          <g transform={cameraTransform({ x: 0, y: 0, scale: 1 }, VIEWPORT)} opacity={seedScale}>
            <circle cx={0} cy={0} r={20} fill={BUD} opacity={0.12 + seedGlow * 0.12} />
            <ellipse cx={0} cy={0} rx={11} ry={15} fill={BUD} opacity={0.55 + seedGlow * 0.25} />
          </g>
        ) : null}
      </svg>

      {frame < 40 ? <Readout x={STAGE_W / 2} y={STAGE_H / 2 + 150} size={28} color={'#8fa79c'}>生长点</Readout> : null}

      <Caption frame={frame} from={8} to={62} size={38}>在开始之前，这里只有一个点。</Caption>
      <Caption frame={frame} from={74} to={140} size={38}>一根枝条长出来，长到末端，就分叉。</Caption>
      <Caption frame={frame} from={150} to={214} size={38}>新长出来的枝条，也会继续分叉。</Caption>
      <Caption frame={frame} from={226} to={292} size={38}>每一次分叉，用的都是同一条规则。</Caption>
      <Caption frame={frame} from={300} to={368} size={38}>重复得足够多次，简单就会长成复杂。</Caption>

      <Title
        frame={frame}
        from={392}
        to={530}
        title={'一条规则，长出无限'}
        subtitle={'从一根枝条开始，看简单的规则如何创造复杂的世界。'}
        size={92}
        y={430}
      />
    </>
  )
}
