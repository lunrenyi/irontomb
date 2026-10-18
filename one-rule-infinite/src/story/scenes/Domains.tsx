import { useMemo } from 'react'
import { KnowledgeFigure } from '../../viz/knowledgefigure'
import { buildKnowledgeGraph, DOMAINS } from '../../lib/knowledge'
import { easeInOut, range } from '../../lib/easing'
import { knowledgeFramings, segmentCamera, cameraTransform, VIEWPORT, STAGE_PROGRESS, nodeScaleFor } from '../knowledgeTimeline'
import { handoffCamera, introPlan } from '../handoff'
import { Caption, MUTED, SHOOT, Statement } from '../FilmChrome'
import { STAGE_H, STAGE_W } from '../timeline'

/**
 * 第二幕 1/4 · 一项发现，开启多个方向
 *
 * 从一个起点出发，五条方向同时亮起：材料、能源、电磁、计算、制造。
 * 这一段刻意做得很慢，因为观众需要先记住「有五条路」，
 * 后面「路与路之间连起来」才显得 surprising。
 */
export function DomainsScene({ frame }: { frame: number }) {
  const graph = useMemo(() => buildKnowledgeGraph(), [])
  const framings = useMemo(() => knowledgeFramings(graph), [graph])
  // 与第一幕收尾共用同一个镜头，两幕交接处不会有跳变
  const plan = useMemo(() => introPlan(), [])

  const [p0, p1] = STAGE_PROGRESS.domains
  const progress = p0 + (p1 - p0) * easeInOut(range(frame, 30, 400))

  const camera = segmentCamera(
    [
      { at: 0, camera: handoffCamera(plan) },
      { at: 70, camera: framings.root },
      { at: 250, camera: framings.domains },
      { at: 435, camera: framings.domains },
    ],
    frame,
  )

  // 五个方向依次亮起，配合屏幕下方的读数
  const active = Math.min(DOMAINS.length - 1, Math.floor(range(frame, 250, 390) * DOMAINS.length))
  const highlight = frame > 250 && frame < 392 ? ['root', DOMAINS[active].length ? graph.layers[1][active].id : 'root'] : []

  return (
    <>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <g transform={cameraTransform(camera, VIEWPORT)}>
          <KnowledgeFigure graph={graph} progress={progress} cameraScale={camera.scale} nodeScale={nodeScaleFor(camera, framings.whole)} highlight={highlight} />
        </g>
      </svg>

      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 672, textAlign: 'center',
          opacity: range(frame, 250, 278) * (1 - range(frame, 386, 414)),
          fontSize: 38, color: SHOOT, letterSpacing: '0.1em',
        }}
      >
        {'方向 ' + (active + 1) + ' / ' + DOMAINS.length + '：' + DOMAINS[active]}
      </div>

      <Statement frame={frame} from={40} to={112} y={806} size={50}>
        从同一个起点，长出不同的探索方向。
      </Statement>
      <Statement frame={frame} from={238} to={318} y={806} size={50}>
        每一个方向，都会继续分出更多方向。
      </Statement>
      <Statement frame={frame} from={352} to={432} y={806} size={48} color={MUTED}>
        但到这一步为止，它还只是一棵树。
      </Statement>
      <Caption frame={frame} from={40} to={134} size={34}>
        树的语言只有一句话：一个父亲生出若干孩子。
      </Caption>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 900, textAlign: 'center', opacity: range(frame, 380, 420) * 0.55, fontSize: 22, color: '#5c7168' }}>
        接下来这一段，是全片真正想讲的事
      </div>
    </>
  )
}
