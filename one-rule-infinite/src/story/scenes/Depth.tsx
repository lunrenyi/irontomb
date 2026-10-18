import { useMemo } from 'react'
import { PlantFigure } from '../../viz/plant'
import { cameraTransform, fitBounds, generationFramings, growthCamera, lerpCamera } from '../../viz/camera'
import { budAt, planGrowth } from '../../lib/growth'
import { DEFAULT_PARAMS, grow, PLANT_GRAMMAR } from '../../lib/lsystem'
import { easeInOut, easeOut, range } from '../../lib/easing'
import { useGrowthLayers } from '../../hooks/useGrowthLayers'
import { Caption, MUTED, SHOOT, Statement } from '../FilmChrome'
import { STAGE_H, STAGE_W } from '../timeline'

const VIEWPORT = { width: STAGE_W, height: STAGE_H }
const MAX_GEN = 6
const STEP = 62

/**
 * 场景 5 · 从简单到复杂
 * 一层一层往上加，镜头一路后退：
 * 屏幕能画出来的永远只有这几层，但规则本身可以继续迭代。
 */
export function DepthScene({ frame }: { frame: number }) {
  const plant = useMemo(() => grow(PLANT_GRAMMAR, { ...DEFAULT_PARAMS, originX: 0, originY: 0, length: 66 }, MAX_GEN), [])
  const plan = useMemo(() => planGrowth(plant.segments, MAX_GEN, { perSegment: 0.68, breath: 0.06 }), [plant])
  const framings = useMemo(() => generationFramings(plan, VIEWPORT, { padding: 1.18, maxScale: 3.4 }), [plan])

  const growTo = 20 + STEP * MAX_GEN
  const time = easeOut(range(frame, 20, growTo))
  const layers = useGrowthLayers(plan, time)
  const bud = budAt(plan, time)
  // 长完之后镜头按时间线继续后撤，而不是突然跳一下
  const camera = lerpCamera(growthCamera(plan, framings, time), fitBounds(plant.bounds, VIEWPORT, { padding: 1.14, maxScale: 3.4 }), easeInOut(range(frame, growTo - 24, growTo + 56)))

  // 自相似：把树冠的一小块放大到右上角的窗口里
  const zoomIn = range(frame, 400, 452)
  const zoomOut = 1 - range(frame, 520, 566)
  const insetOpacity = zoomIn * zoomOut
  const whole = Math.max(0.0001, 1 - zoomIn * 0.55)
  const INSET_CX = 1525
  const INSET_CY = 405
  const focusX = plant.bounds.minX + (plant.bounds.maxX - plant.bounds.minX) * 0.56
  const focusY = plant.bounds.minY + (plant.bounds.maxY - plant.bounds.minY) * 0.3
  const insetScale = 1.4 + zoomIn * 6.2
  const insetTransform = 'translate(' + INSET_CX + ' ' + INSET_CY + ') scale(' + insetScale + ') translate(' + -focusX + ' ' + -focusY + ')'

  const generation = Math.max(1, Math.min(MAX_GEN, layers.generation + 1))
  const count = layers.done.length + layers.growing.length

  return (
    <>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <g transform={cameraTransform(camera, VIEWPORT)}>
          <g opacity={whole}>
            <PlantFigure
              done={layers.done}
              growing={layers.growing}
              maxDepth={plant.levels}
              freshDepth={bud ? bud.segment.depth : null}
              tip={bud ? { x: bud.x, y: bud.y } : null}
              tipProgress={range(frame, 20, 40)}
              leaves
              leafFromDepth={2}
            />
          </g>
        </g>

        {/* 局部放大：把一小块枝条拉到眼前 */}
        {insetOpacity > 0.01 ? (
          <g opacity={insetOpacity}>
            <defs>
              <clipPath id='depth-inset'>
                <rect x={1290} y={190} width={470} height={430} rx={18} />
              </clipPath>
            </defs>
            <rect x={1290} y={190} width={470} height={430} rx={18} fill='#08150f' stroke={'#2f5a48'} strokeWidth={1.4} />
            <g clipPath={'url(#depth-inset)'}>
              <g transform={insetTransform}>
                <PlantFigure done={layers.done} growing={layers.growing} maxDepth={plant.levels} leaves leafFromDepth={3} />
              </g>
            </g>
            <rect x={1290} y={190} width={470} height={430} rx={18} fill='none' stroke={'#2f5a48'} strokeWidth={1.4} />
            <text x={1525} y={664} textAnchor='middle' fill={MUTED} fontSize={26} letterSpacing='0.14em'>
              局部放大
            </text>
          </g>
        ) : null}
      </svg>

      <div style={{ position: 'absolute', left: 120, top: 180, color: SHOOT, fontSize: 44, letterSpacing: '0.06em', opacity: range(frame, 20, 44) }}>
        {'第 ' + generation + ' 层 · ' + count + ' 根枝条'}
      </div>
      <div style={{ position: 'absolute', left: 120, top: 240, color: MUTED, fontSize: 26, opacity: range(frame, 30, 54) }}>
        每加一层，就把同一条规则再执行一遍
      </div>

      <Statement frame={frame} from={90} to={160} y={806} size={50}>一层，只比一根枝条多一点。</Statement>
      <Statement frame={frame} from={230} to={300} y={806} size={50}>六层，已经需要镜头往后退。</Statement>
      <Statement frame={frame} from={420} to={500} y={806} size={50} color={SHOOT}>把局部放大，还是这个样子。</Statement>
      <Caption frame={frame} from={440} to={560} size={36}>
        整体里包含着一个缩小版的自己 —— 这就是分形。
        <br />
        不过屏幕上永远只有这 6 层：计算机每画一段就停一下。
        <br />
        所谓「无限」，是指规则还能继续往下迭代，而不是一瞬间画出了无穷多个分支。
      </Caption>
    </>
  )
}
