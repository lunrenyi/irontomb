import { useMemo } from 'react'
import { KnowledgeFigure, K_MERGE } from '../../viz/knowledgefigure'
import { buildKnowledgeGraph, CROSS_EDGES } from '../../lib/knowledge'
import { easeInOut, range } from '../../lib/easing'
import { knowledgeFramings, segmentCamera, cameraTransform, VIEWPORT, STAGE_PROGRESS, nodeScaleFor } from '../knowledgeTimeline'
import { Caption, MUTED, Statement } from '../FilmChrome'
import { STAGE_H, STAGE_W } from '../timeline'

/**
 * 第二幕 3/4 · 真正的转折：树变成网络
 *
 * 这是整部作品最重要的认知转折，也是全片的第一个高潮。
 *
 * 做法很朴素：把几条**横跨方向的连线**一条一条点出来。
 * 观众会自己发现，从这里开始，这张图已经不能叫「树」了 ——
 * 因为任何一个节点都可以有多个父亲，也可以有多个孩子。
 */
export function NetworkScene({ frame }: { frame: number }) {
  const graph = useMemo(() => buildKnowledgeGraph(), [])
  const framings = useMemo(() => knowledgeFramings(graph), [graph])

  const [p0, p1] = STAGE_PROGRESS.network
  const progress = p0 + (p1 - p0) * easeInOut(range(frame, 20, 400))

  const camera = segmentCamera(
    [
      { at: 0, camera: framings.fields },
      { at: 40, camera: framings.fields },
      { at: 286, camera: framings.network },
      { at: 420, camera: framings.network },
    ],
    frame,
  )

  // 四条跨方向的连线，一条一条点亮
  const links = CROSS_EDGES.map(([to, from]) => to + '>' + from)
  const focusIndex = Math.min(links.length - 1, Math.floor(range(frame, 170, 350) * links.length))
  const focused = links[focusIndex]
  const focusWindow = range(frame, 165, 195) * (1 - range(frame, 296, 328))
  const [focusTo, focusFrom] = focused.split('>') as [string, string]
  const focusNodes = [focusTo, focusFrom]

  return (
    <>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <g transform={cameraTransform(camera, VIEWPORT)}>
          <KnowledgeFigure
            graph={graph}
            progress={progress}
            cameraScale={camera.scale} nodeScale={nodeScaleFor(camera, framings.whole)}
            labelOpacity={range(frame, 40, 90)}
            highlight={focusWindow > 0.2 ? focusNodes : []}
            highlightEdges={focusWindow > 0.2 ? [focused] : []}
          />
        </g>
      </svg>

      {focusWindow > 0.05 ? (
        <div style={{ position: 'absolute', left: 110, top: 148, opacity: focusWindow, color: K_MERGE, fontSize: 30, letterSpacing: '0.04em' }}>
          {graph.byId[focusFrom].label} → {graph.byId[focusTo].label}
          <span style={{ color: MUTED, marginLeft: 16, fontSize: 24 }}>跨越了不同方向</span>
        </div>
      ) : null}

      <Statement frame={frame} from={40} to={112} y={806} size={50}>
        然后，事情开始变化。
      </Statement>
      <Statement frame={frame} from={172} to={256} y={806} size={54} color={K_MERGE}>
        不同的分支，开始互相连接。
      </Statement>
      <Statement frame={frame} from={296} to={392} y={806} size={56} color={'#7df0c0'}>
        知识的增长，不只是分叉，更是连接。
      </Statement>
      <Caption frame={frame} from={306} to={404} size={34}>
        一个成果可以建立在多个前置之上；一项基础技术也会被反复复用。
        <br />
        从这里开始，这张图已经不能叫「树」了。
      </Caption>
    </>
  )
}
