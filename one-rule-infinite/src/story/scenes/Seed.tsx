import { useMemo } from 'react'
import { PlantFigure } from '../../viz/plant'
import { BUD } from '../../viz/plant'
import { cameraTransform, fitCamera } from '../../viz/camera'
import { boundsAt, growingTip, planGrowth, segmentsAt } from '../../lib/growth'
import { DEFAULT_PARAMS, grow, PLANT_GRAMMAR } from '../../lib/lsystem'
import { easeOut, range } from '../../lib/easing'
import { Caption, Readout, Title } from '../FilmChrome'
import { STAGE_H, STAGE_W } from '../timeline'

const GENERATIONS = 5
const VIEWPORT = { width: STAGE_W, height: STAGE_H }

/**
 * 场景 1 · 一颗种子
 * 从一个几乎看不见的点开始，一根枝条长出来，分叉，再分叉……
 * 镜头先贴着生长点走，等树冠铺开再慢慢拉远。
 */
export function SeedScene({ frame }: { frame: number }) {
  const plant = useMemo(() => grow(PLANT_GRAMMAR, { ...DEFAULT_PARAMS, originX: 0, originY: 0 }, GENERATIONS), [])
  const plan = useMemo(() => planGrowth(plant.segments, GENERATIONS, { perSegment: 0.62, breath: 0.1 }), [plant])

  const growFrom = 54
  const growTo = 408
  const time = easeOut(range(frame, growFrom, growTo))
  const drawn = segmentsAt(plan, time)
  const tip = growingTip(plan, time)

  // 镜头比生长慢半拍：先跟住梢头，等结构铺开才拉远
  const cameraTime = easeOut(range(frame, growFrom + 26, growTo + 60))
  const cameraBounds = boundsAt(plan, cameraTime)
  const cameraTip = growingTip(plan, cameraTime, 10)
  const pulling = range(frame, growTo - 90, growTo + 40)
  const camera = fitCamera(cameraBounds, pulling > 0.6 ? null : cameraTip, VIEWPORT, {
    padding: 1.22 - pulling * 0.12,
    maxScale: 3.1,
    tipWeight: 0.42 - pulling * 0.3,
  })

  const seedScale = range(frame, 4, 30) * (1 - range(frame, growFrom, growFrom + 26) * 0.75)
  const seedGlow = 0.5 + 0.5 * Math.sin((frame / 26) % (Math.PI * 2))
  const freshDepth = tip ? tip.segment.depth : null
  const tipVisible = range(frame, growFrom, growFrom + 18) * (1 - range(frame, growTo - 10, growTo + 20))
  const sway = (x: number, y: number) => Math.sin((frame / 34) + x * 0.02 + y * 0.013) * 1.9
  // 标题出现时把树压暗，文字才读得清
  const treeDim = 1 - range(frame, 372, 416) * 0.62

  return (
    <>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <g transform={cameraTransform(camera, VIEWPORT)} opacity={treeDim}>
          <PlantFigure
            segments={drawn}
            maxDepth={plant.levels}
            freshDepth={freshDepth}
            tip={tipVisible > 0.02 && tip ? { x: tip.x, y: tip.y } : null}
            tipProgress={tipVisible}
            leaves
            leafFromDepth={2}
            sway={sway}
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

      <Caption frame={frame} from={8} to={62} size={38}>
        在开始之前，这里只有一个点。
      </Caption>
      <Caption frame={frame} from={74} to={140} size={38}>
        一根枝条长出来，长到末端，就分叉。
      </Caption>
      <Caption frame={frame} from={150} to={214} size={38}>
        新长出来的枝条，也会继续分叉。
      </Caption>
      <Caption frame={frame} from={226} to={292} size={38}>
        每一次分叉，用的都是同一条规则。
      </Caption>
      <Caption frame={frame} from={300} to={368} size={38}>
        重复得足够多次，简单就会长成复杂。
      </Caption>

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
