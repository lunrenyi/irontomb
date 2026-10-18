import { useMemo } from 'react'
import { KnowledgeFigure, K_MERGE } from '../../viz/knowledgefigure'
import { PhoneGlyph, PHONE_GLYPH_SCALE } from '../../viz/phone'
import { buildKnowledgeGraph, PHONE_PARTS } from '../../lib/knowledge'
import { clamp01, easeInOut, range } from '../../lib/easing'
import { knowledgeFramings, segmentCamera, cameraTransform, lerpCamera, VIEWPORT, STAGE_PROGRESS, nodeScaleFor } from '../knowledgeTimeline'
import { Caption, MUTED, SHOOT, Statement } from '../FilmChrome'
import { STAGE_H, STAGE_W } from '../timeline'

/**
 * 第二幕 4/4 · 智能手机诞生，以及它如何又变成新的起点
 *
 * 全片的视觉高潮。节奏分两拍：
 *   1. 镜头收拢，五条模块连线一起点亮，手机由线描出来、模块逐个亮起；
 *   2. 手机出现之后，镜头重新拉远 —— 它只是整张网络里的一个点，
 *      而它自己又向外长出了新的应用。
 */
export function PhoneScene({ frame }: { frame: number }) {
  const graph = useMemo(() => buildKnowledgeGraph(), [])
  const framings = useMemo(() => knowledgeFramings(graph), [graph])
  const phone = graph.byId.phone

  const [p0, p1] = STAGE_PROGRESS.phone
  const progress = p0 + (p1 - p0) * easeInOut(range(frame, 10, 540))

  // 第一拍：从全景收拢到手机
  const converge = segmentCamera(
    [
      { at: 0, camera: framings.network },
      { at: 48, camera: framings.network },
      { at: 168, camera: framings.focus },
      { at: 352, camera: framings.focus },
      { at: 528, camera: framings.whole },
      { at: 570, camera: framings.whole },
    ],
    frame,
  )
  // 第二拍：手机已经成形，镜头重新拉远，交代它只是网络的一小部分
  const opening = segmentCamera(
    [
      { at: 0, camera: framings.focus },
      { at: 104, camera: lerpCamera(framings.focus, framings.whole, 0.45) },
      { at: 262, camera: framings.whole },
      { at: 570, camera: framings.whole },
    ],
    frame,
  )
  const openingPhase = 1 - clamp01(range(frame, 358, 398))
  const camera = lerpCamera(opening, converge, openingPhase)

  // 五个模块依次点亮 —— 每一个都对应网络里真实的一个节点
  const parts: Record<string, number> = {}
  PHONE_PARTS.forEach((id, i) => {
    parts[id] = clamp01(range(frame, 118 + i * 42, 174 + i * 42))
  })
  const assemble = clamp01(range(frame, 82, 352))

  // 第二拍：五个应用从手机上方向外长出来
  const appsIn = range(frame, 402, 478)

  return (
    <>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <g transform={cameraTransform(camera, VIEWPORT)}>
          <KnowledgeFigure
            graph={graph}
            progress={progress}
            cameraScale={camera.scale} nodeScale={nodeScaleFor(camera, framings.whole)}
            labelOpacity={range(frame, 30, 74)}
            fadeUnfocused={range(frame, 402, 452)}
            highlight={frame > 402 ? graph.apps : []}
          />
          <g transform={'translate(' + phone.x + ' ' + phone.y + ') scale(' + PHONE_GLYPH_SCALE + ')'}>
            <PhoneGlyph assemble={assemble} parts={parts} cameraScale={camera.scale} />
          </g>
        </g>
      </svg>

      <Statement frame={frame} from={30} to={92} y={806} size={50}>
        所有连线，一起汇聚。
      </Statement>
      <Statement frame={frame} from={112} to={196} y={806} size={48}>
        五个方向，十几年的积累，在一个小盒子里汇合。
      </Statement>
      <Statement frame={frame} from={248} to={340} y={806} size={46}>
        一个成果，可以凝聚多个领域的积累。
      </Statement>
      <Statement frame={frame} from={400} to={462} y={806} size={50}>
        而它并不是终点。
      </Statement>
      <Statement frame={frame} from={482} to={558} y={806} size={50} color={SHOOT}>
        每一个新成果，都可能成为下一次探索的起点。
      </Statement>
      <Caption frame={frame} from={498} to={566} size={34}>
        摄影、地图、支付、远程协作 ——
        <br />
        没有哪一项是手机单独创造的，它们是多项技术共同成熟之后才出现的可能。
      </Caption>

      <div style={{ position: 'absolute', right: 120, top: 148, opacity: appsIn * 0.95, fontSize: 30, color: K_MERGE, letterSpacing: '0.08em' }}>
        新的应用
      </div>
      <div style={{ position: 'absolute', right: 120, top: 192, opacity: appsIn * 0.55, fontSize: 24, color: MUTED, letterSpacing: '0.04em' }}>
        {graph.apps.map((id) => graph.byId[id].label).join(' · ')}
      </div>

    </>
  )
}
