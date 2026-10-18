import { useMemo } from 'react'
import { KnowledgeFigure, K_MERGE } from '../../viz/knowledgefigure'
import { buildKnowledgeGraph } from '../../lib/knowledge'
import { easeInOut, range } from '../../lib/easing'
import { knowledgeFramings, segmentCamera, cameraTransform, VIEWPORT, STAGE_PROGRESS, nodeScaleFor } from '../knowledgeTimeline'
import { Caption, MUTED, Statement } from '../FilmChrome'
import { STAGE_H, STAGE_W } from '../timeline'

/**
 * 第二幕 2/4 · 技术需要多个领域共同发展
 *
 * 每条方向继续长出具体的技术积累。
 * 这一段要让观众注意到一件事：
 * 越往上，每个节点要的前置就越多 —— 图开始显得「挤」，那正是依赖变深的信号。
 */
export function FieldsScene({ frame }: { frame: number }) {
  const graph = useMemo(() => buildKnowledgeGraph(), [])
  const framings = useMemo(() => knowledgeFramings(graph), [graph])

  const [p0, p1] = STAGE_PROGRESS.fields
  const progress = p0 + (p1 - p0) * easeInOut(range(frame, 26, 480))

  const camera = segmentCamera(
    [
      { at: 0, camera: framings.domains },
      { at: 40, camera: framings.domains },
      { at: 520, camera: framings.fields },
      { at: 540, camera: framings.fields },
    ],
    frame,
  )

  // 走到第三个技术模块时，把它的四个前置一起点亮：这是「多前置」的第一个提示
  const chipDemo = range(frame, 380, 410) * (1 - range(frame, 500, 528))
  const chip = graph.byId.chip

  return (
    <>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <g transform={cameraTransform(camera, VIEWPORT)}>
          <KnowledgeFigure
            graph={graph}
            progress={progress}
            cameraScale={camera.scale} nodeScale={nodeScaleFor(camera, framings.whole)}
            labelOpacity={range(frame, 40, 90)}
            highlight={chipDemo > 0.2 ? [chip.id, ...chip.prereqs] : []}
          />
        </g>
      </svg>

      {chipDemo > 0.05 ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 672, textAlign: 'center', opacity: chipDemo, color: K_MERGE, fontSize: 30, letterSpacing: '0.04em' }}>
          一块芯片要同时用到 {chip.prereqs.length} 个方向的前置
        </div>
      ) : null}

      <Statement frame={frame} from={40} to={122} y={806} size={50}>
        每条方向上，都积累了具体的技术。
      </Statement>
      <Statement frame={frame} from={196} to={286} y={806} size={50}>
        越往上，一个成果需要的前置就越多。
      </Statement>
      <Statement frame={frame} from={340} to={420} y={806} size={48} color={MUTED}>
        于是，图开始变得拥挤。
      </Statement>
      <Caption frame={frame} from={60} to={200} size={34}>
        材料、化学、电磁、算法、工艺……
        <br />
        每一条都在自己的方向上积累了很多年。
      </Caption>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 906, textAlign: 'center', opacity: range(frame, 120, 170) * 0.5, fontSize: 22, color: '#5c7168' }}>
        （这是一张简化的概念模型，用来讲清依赖关系，不是技术史谱系）
      </div>
    </>
  )
}
