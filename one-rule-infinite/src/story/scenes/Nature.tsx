import { useMemo } from 'react'
import { PlantFigure } from '../../viz/plant'
import { DashPath } from '../../viz/parts'
import { cameraTransform, fitCamera, type Camera } from '../../viz/camera'
import { boundsAt, growingTip, planGrowth, segmentsAt } from '../../lib/growth'
import { DEFAULT_PARAMS, grow, PLANT_GRAMMAR } from '../../lib/lsystem'
import { buildRiver, buildVeins, segmentPath } from '../../lib/nature'
import { clamp01, easeIn, easeInOut, easeOut, range } from '../../lib/easing'
import { Caption, Statement } from '../FilmChrome'
import { STAGE_H, STAGE_W } from '../timeline'

const VIEWPORT = { width: STAGE_W, height: STAGE_H }
const TREE_GEN = 4
const TREE: [number, number] = [10, 176]
const VEIN: [number, number] = [176, 330]
const RIVER: [number, number] = [330, 520]

/** 两个镜头之间插值：位置线性，缩放按对数走，切换时不会忽大忽小 */
function lerpCamera(a: Camera, b: Camera, t: number): Camera {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    scale: Math.exp(Math.log(a.scale) + (Math.log(b.scale) - Math.log(a.scale)) * t),
  }
}

/**
 * 场景 3 · 三种分支
 * 枝条 → 叶脉 → 河流。三种都由程序生成，用的是三套完全不同的算法。
 * 这一场要说明的是「形态相似」，而不是「成因相同」。
 */
export function NatureScene({ frame }: { frame: number }) {
  const tree = useMemo(() => grow(PLANT_GRAMMAR, { ...DEFAULT_PARAMS, originX: 0, originY: 0, length: 72 }, TREE_GEN), [])
  const treePlan = useMemo(() => planGrowth(tree.segments, TREE_GEN), [tree])
  const river = useMemo(() => buildRiver(5), [])
  const riverPlan = useMemo(() => planGrowth(river.segments, 5), [river])
  const leaf = useMemo(() => buildVeins({ length: 360, width: 176, secondOrder: 8 }), [])

  const treeTime = easeOut(range(frame, TREE[0], TREE[1]))
  const veinTime = easeOut(range(frame, VEIN[0], VEIN[1]))
  const riverTime = easeOut(range(frame, RIVER[0], RIVER[1]))

  const treeTip = growingTip(treePlan, treeTime)
  const riverTip = growingTip(riverPlan, riverTime)
  const treeDrawn = segmentsAt(treePlan, treeTime)
  const riverDrawn = segmentsAt(riverPlan, riverTime)

  // 三段各算一个镜头，在交接处平滑过渡
  const treeCam = fitCamera(boundsAt(treePlan, treeTime * 0.96), treeTip, VIEWPORT, { padding: 1.18, maxScale: 2.1, tipWeight: 0.3 })
  const veinCam: Camera = { x: 0, y: -30, scale: 1.4 }
  const riverCam = fitCamera(boundsAt(riverPlan, riverTime * 0.96), riverTip, VIEWPORT, { padding: 1.12, maxScale: 1.45, tipWeight: 0.25 })
  const toVein = easeInOut(range(frame, TREE[1] - 22, TREE[1] + 26))
  const toRiver = easeInOut(range(frame, VEIN[1] - 22, VEIN[1] + 26))
  const camera = lerpCamera(lerpCamera(treeCam, veinCam, toVein), riverCam, toRiver)

  const treeOpacity = 1 - easeIn(range(frame, TREE[1] - 26, TREE[1] + 22))
  const veinOpacity = easeOut(range(frame, VEIN[0] - 6, VEIN[0] + 30)) * (1 - easeIn(range(frame, VEIN[1] - 24, VEIN[1] + 22)))
  const riverOpacity = easeOut(range(frame, RIVER[0] - 6, RIVER[0] + 30))

  const sway = (x: number, y: number) => Math.sin((frame / 32) + x * 0.02 + y * 0.011) * 1.7
  const labelOpacity = (a: number, b: number) => easeOut(range(frame, a, a + 20)) * (1 - easeIn(range(frame, b - 20, b)))
  const LABEL_FONT = 30

  return (
    <>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <g transform={cameraTransform(camera, VIEWPORT)}>
          <g opacity={treeOpacity}>
            <PlantFigure
              segments={treeDrawn}
              maxDepth={tree.levels}
              freshDepth={treeTip ? treeTip.segment.depth : null}
              tip={treeTip ? { x: treeTip.x, y: treeTip.y } : null}
              tipProgress={range(frame, TREE[0], TREE[0] + 20)}
              leaves
              leafFromDepth={2}
              sway={sway}
            />
          </g>

          {/* 叶脉：叶片轮廓 + 中肋 + 二三级脉络。世界坐标，跟随镜头 */}
          <g opacity={veinOpacity} transform={'translate(0 ' + (60 + veinTime * 80) + ')'}>
            <path d={leaf.outline} fill={'#3f8f5a'} fillOpacity={0.1} stroke={'#7fc9a0'} strokeOpacity={0.32} strokeWidth={1.6} />
            {leaf.segments.map((s) => {
              const at = (s.id / (leaf.segments.length + 2)) * 0.88
              const local = clamp01(range(veinTime, at, at + 0.08))
              if (local <= 0) return null
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

          {/* 河流：越往下越宽，末端散开 */}
          <g opacity={riverOpacity}>
            <PlantFigure
              segments={riverDrawn}
              maxDepth={river.levels}
              style='river'
              freshDepth={riverTip ? riverTip.segment.depth : null}
              tip={riverTip ? { x: riverTip.x, y: riverTip.y } : null}
              tipProgress={range(frame, RIVER[0], RIVER[0] + 20)}
              leaves={false}
            />
          </g>
        </g>
      </svg>

      <div style={{ position: 'absolute', left: 0, right: 0, top: 150, opacity: labelOpacity(24, 150), color: '#7fc9a0', fontSize: LABEL_FONT, letterSpacing: '0.2em', textAlign: 'center' }}>
        枝 条
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 150, opacity: labelOpacity(202, 320), color: '#7fc9a0', fontSize: LABEL_FONT, letterSpacing: '0.2em', textAlign: 'center' }}>
        叶 脉
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 150, opacity: labelOpacity(354, 470), color: '#7fc4d8', fontSize: LABEL_FONT, letterSpacing: '0.2em', textAlign: 'center' }}>
        河 流
      </div>

      <Statement frame={frame} from={12} to={92} y={806} size={50}>
        树枝会分叉。
      </Statement>
      <Statement frame={frame} from={190} to={268} y={806} size={50}>
        叶脉也会分叉。
      </Statement>
      <Statement frame={frame} from={342} to={420} y={806} size={50}>
        河流同样会分叉。
      </Statement>
      <Statement frame={frame} from={468} to={566} y={786} size={50}>
        形态很像，但它们不是被同一条规则造出来的。
      </Statement>
      <Caption frame={frame} from={478} to={570} size={36} y={880}>
        树为了采光与支撑，叶脉负责运输，河流靠重力汇流。
        <br />
        长得像，只说明「分支」是一种很省力的形状。
      </Caption>
    </>
  )
}
