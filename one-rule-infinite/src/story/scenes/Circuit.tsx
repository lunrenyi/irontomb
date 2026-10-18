import { useMemo } from 'react'
import { PlantFigure } from '../../viz/plant'
import { Dot } from '../../viz/parts'
import { cameraTransform, fitCamera } from '../../viz/camera'
import { boundsAt, planGrowth, segmentsAt } from '../../lib/growth'
import { quadAt } from '../../lib/geometry'
import { DEFAULT_PARAMS, grow, PLANT_GRAMMAR } from '../../lib/lsystem'
import { easeOut, range } from '../../lib/easing'
import { Caption, CIRCUIT, SHOOT, Statement } from '../FilmChrome'
import { STAGE_H, STAGE_W } from '../timeline'

const VIEWPORT = { width: STAGE_W, height: STAGE_H }
const GENERATIONS = 5

/**
 * 场景 6 · 路径之树
 * 枝条慢慢变成电路板上那种带拐角的走线，节点亮起来，
 * 有几束光沿着路径跑向新长出来的末端。
 * 这里只讲「一条路径会长出新的路径」，不替数学史下结论。
 */
export function CircuitScene({ frame }: { frame: number }) {
  const plant = useMemo(() => grow(PLANT_GRAMMAR, { ...DEFAULT_PARAMS, originX: 0, originY: 0, length: 62 }, GENERATIONS), [])
  const plan = useMemo(() => planGrowth(plant.segments, GENERATIONS, { perSegment: 0.72, breath: 0.05 }), [plant])

  const growEnd = 250
  const time = easeOut(range(frame, 14, growEnd))
  const drawn = segmentsAt(plan, time)
  const bounds = boundsAt(plan, time * 0.95)

  // 先把树长完（保持有机），再慢慢「电路化」，最后拉远
  const morph = range(frame, 210, 340)
  const pullBack = range(frame, 300, 470)
  const camera = fitCamera(bounds, null, VIEWPORT, { padding: 1.16 + pullBack * 0.1, maxScale: 2.4 - pullBack * 1.1 })

  const nodes = useMemo(() => drawn.filter((d) => d.segment.depth >= 1 && d.segment.depth <= 3 && d.t > 0.95), [drawn])
  const pulse = range(frame, 330, 470)
  const sway = (x: number) => Math.sin((frame / 30) + x * 0.02) * 1.4

  return (
    <>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <g transform={cameraTransform(camera, VIEWPORT)}>
          <PlantFigure
            segments={drawn}
            maxDepth={plant.levels}
            leaves
            leafFromDepth={2}
            circuit={morph}
            sway={sway}
          />

          {/* 节点：分叉处亮起的小光点 */}
          {nodes.map((d) => (
            <Dot
              key={'node-' + d.segment.id}
              x={d.segment.x2}
              y={d.segment.y2}
              r={2.4 + morph * 1.6}
              fill={CIRCUIT}
              opacity={morph * 0.85}
              glow={6 * morph}
            />
          ))}

          {/* 沿路径跑的光束：三条就够，多了就成噪点了 */}
          {[0, 1, 2].map((i) => {
            const candidates = drawn.filter((d) => d.segment.depth >= 2 && d.t > 0.99)
            if (candidates.length === 0) return null
            const s = candidates[Math.floor(((i + 1) / 4) * candidates.length) % candidates.length]
            const t = (frame / 46 + i * 0.33) % 1
            const at = quadAt(t, s.segment.x1, s.segment.y1, s.segment.cx, s.segment.cy, s.segment.x2, s.segment.y2)
            return <Dot key={'beam-' + i} x={at.x} y={at.y} r={3.4} fill={SHOOT} opacity={pulse * 0.8} glow={10 * pulse} />
          })}
        </g>
      </svg>

      <Statement frame={frame} from={40} to={120} y={806} size={52}>
        一条路径走到尽头，会长出新的路径。
      </Statement>
      <Statement frame={frame} from={150} to={240} y={806} size={52}>
        每条新路径，又会长出更多可能。
      </Statement>
      <Statement frame={frame} from={300} to={420} y={806} size={56} color={CIRCUIT}>
        同一件事，在树上和电路里长得几乎一样。
      </Statement>
      <Caption frame={frame} from={330} to={470} size={36}>
        分支是一种很省力的形状：
        <br />
        走过的路可以复用，探索新方向的成本也不会翻倍。
      </Caption>
      <Caption frame={frame} from={460} to={520} size={34}>
        这只是形态上的联想，不是说知识真的长在树上。
      </Caption>
    </>
  )
}
