import { useMemo } from 'react'
import { PlantFigure, BUD } from '../../viz/plant'
import { cameraAt, cameraTransform, generationFramings, growthCamera } from '../../viz/camera'
import { budAt } from '../../lib/growth'
import { easeInOut, easeOut, range } from '../../lib/easing'
import { useGrowthLayers } from '../../hooks/useGrowthLayers'
import { Caption, Title } from '../FilmChrome'
import { handoffCamera, introPlan, introPlant } from '../handoff'
import { STAGE_H, STAGE_W } from '../timeline'

const VIEWPORT = { width: STAGE_W, height: STAGE_H }

/**
 * 第一幕 · 生长（引子，只有十几秒）
 *
 * 这里**故意不讲递归、不讲分形、不讲 L-系统**。
 * 第一幕只负责一件事：让观众看见「复杂可以从一个简单的起点长出来」，
 * 然后立刻把接力棒交给第二幕。
 *
 * 枝条本身仍然是那一套已经修好抖动的程序化生成：
 * 固定种子、稳定 ID、逐代取景、路径描边生长。
 */
export function GrowthScene({ frame }: { frame: number }) {
  const plant = useMemo(() => introPlant(), [])
  const plan = useMemo(() => introPlan(), [])
  // padding 1.55：树长完之后根部落在 y ≈ 888，不会撞到底部那行字幕
  const framings = useMemo(() => generationFramings(plan, VIEWPORT, { padding: 1.55, maxScale: 3.4 }), [plan])

  const growFrom = 34
  const growTo = 250
  const time = easeOut(range(frame, growFrom, growTo))
  const layers = useGrowthLayers(plan, time)
  const bud = budAt(plan, time)

  // 结尾的镜头正对整棵树的中心（见 handoff.ts），第二幕用它同一个镜头开场
  const handoff = useMemo(() => handoffCamera(plan), [plan])
  const camera = cameraAt(
    [
      { at: 0, camera: growthCamera(plan, framings, 0) },
      { at: growTo + 10, camera: growthCamera(plan, framings, 1) },
      { at: 300, camera: handoff },
      { at: 450, camera: handoff },
    ],
    frame,
    easeInOut,
  )

  // 收尾时点亮五个方向感最强的梢头，暗示「接下来是五条不同的路」
  const tips = useMemo(() => pickTips(plant.segments, 5), [plant])
  const glow = range(frame, 258, 302) * (1 - range(frame, 404, 444))

  return (
    <>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <g transform={cameraTransform(camera, VIEWPORT)}>
          <PlantFigure
            done={layers.done}
            growing={layers.growing}
            maxDepth={plant.levels}
            freshDepth={bud ? bud.segment.depth : null}
            tip={bud && frame < growTo + 30 ? { x: bud.x, y: bud.y } : null}
            tipProgress={frame > 10 && frame < growTo + 30 ? 1 : 0}
            leaves
            leafFromDepth={2}
          />
          {tips.map((tip, i) => (
            <circle
              key={'tip' + i}
              cx={tip.x}
              cy={tip.y}
              r={7 + i * 0.5}
              fill={BUD}
              opacity={glow * 0.9}
            />
          ))}
        </g>
      </svg>

      <Caption frame={frame} from={14} to={74} size={44}>
        复杂，从一个简单的起点开始。
      </Caption>
      <Caption frame={frame} from={98} to={164} size={40}>
        一根枝条长到末端，就分叉。
      </Caption>
      <Caption frame={frame} from={186} to={252} size={40}>
        新的枝条继续生长，长成一张局部的树。
      </Caption>
      <Caption frame={frame} from={276} to={384} size={42} color={'#ffd479'}>
        但真正的世界，不只有分叉。
      </Caption>

      <Title
        frame={frame}
        from={380}
        to={450}
        title={'从枝条到星海'}
        subtitle={'知识如何从分叉走向连接，最终让我们看见更大的世界。'}
        size={86}
        y={40}
      />
    </>
  )
}

/** 从所有末端里挑出角度分布最开的几个：收尾时它们会依次亮起 */
function pickTips(segments: { x1: number; y1: number; x2: number; y2: number }[], count: number) {
  const angles = segments.map((s) => Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * (180 / Math.PI))
  const order = segments.map((_, i) => i).sort((a, b) => angles[a] - angles[b])
  const out: { x: number; y: number }[] = []
  for (const i of order) {
    if (out.length >= count) break
    out.push({ x: segments[i].x2, y: segments[i].y2 })
  }
  return out
}
