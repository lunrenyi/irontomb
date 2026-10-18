import { useMemo } from 'react'
import { PlantFigure } from '../../viz/plant'
import { TechFigure, techReveal, TECH_MERGE } from '../../viz/techfigure'
import { cameraAt, cameraTransform, fitBounds, generationFramings, growthCamera, type Camera, type CameraKey } from '../../viz/camera'
import { budAt, planGrowth } from '../../lib/growth'
import { buildTechGraph } from '../../lib/techgraph'
import { easeOut, range } from '../../lib/easing'
import { useGrowthLayers } from '../../hooks/useGrowthLayers'
import { Caption, MUTED, SHOOT, Statement } from '../FilmChrome'
import { STAGE_H, STAGE_W } from '../timeline'

const VIEWPORT = { width: STAGE_W, height: STAGE_H }
const GROW_END = 168

/**
 * 场景 6 · 知识不只是分叉，还会相互连接
 *
 * 树枝先照旧长出来（保证连续），枝条随后变成路径、分叉点变成节点，
 * 然后关键的一步：不同枝条上的节点之间，出现横跨的连线。
 * 从那一刻起它就不再是一棵树，而是一张有向无环图。
 */
/**
 * 把整张图往上抬一点：屏幕下方要给字留位置，
 * 否则图底部的节点会和字幕撞在一起。
 */
function lift(camera: Camera, dy: number): Camera {
  return { x: camera.x, y: camera.y + dy, scale: camera.scale }
}
export function TechScene({ frame }: { frame: number }) {
  const graph = useMemo(() => buildTechGraph(), [])
  const reveal = useMemo(() => techReveal(graph), [graph])
  const plan = useMemo(() => planGrowth(graph.plant.segments, 2, { perSegment: 0.62, breath: 0.18 }), [graph])

  const growthTime = easeOut(range(frame, 0, GROW_END))
  const layers = useGrowthLayers(plan, growthTime)
  const bud = budAt(plan, growthTime)

  // 镜头：四段显式关键帧。生长途中用「那一代该有的取景」，
  // 结构定型之后再由时间线接手，绝不追踪正在变化的包围盒。
  const keys = useMemo<CameraKey[]>(() => {
    const framings = generationFramings(plan, VIEWPORT, { padding: 1.24, maxScale: 2.5 })
    const branchNodes = graph.nodes.filter((n) => n.origin === 'branch')
    const treeBounds = branchNodes.reduce(
      (b, n) => ({ minX: Math.min(b.minX, n.x), minY: Math.min(b.minY, n.y), maxX: Math.max(b.maxX, n.x), maxY: Math.max(b.maxY, n.y) }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
    )
    return [
      { at: 0, camera: lift(fitBounds({ minX: -60, minY: -160, maxX: 60, maxY: 30 }, VIEWPORT, { padding: 1.15, maxScale: 3.0 }), 60) },
      { at: GROW_END, camera: lift(growthCamera(plan, framings, 1), 48) },
      { at: 330, camera: lift(fitBounds(treeBounds, VIEWPORT, { padding: 1.2, maxScale: 2.2 }), 72) },
      { at: 480, camera: lift(fitBounds(graph.bounds, VIEWPORT, { padding: 1.12, maxScale: 1.7 }), 188) },
      { at: 660, camera: lift(fitBounds(graph.bounds, VIEWPORT, { padding: 1.12, maxScale: 1.7 }), 188) },
    ]
  }, [graph, plan])
  const camera = cameraAt(keys, frame)

  // 树淡出、路径亮起：两者画的是同一条曲线，所以看起来是「枝条变成了路径」
  const morph = range(frame, GROW_END - 16, GROW_END + 30)
  const networkProgress = easeOut(range(frame, GROW_END + 8, 548))
  const labelIn = range(frame, 244, 330)

  // 只跟跟树上那几条横跨枝条的汇合边：后面新长出来的节点也有多个前置，但那不是这一镜要讲的事
  const mergeEdges = graph.edges.filter((e) => e.kind === 'merge' && graph.byId[e.from].origin === 'branch' && graph.byId[e.to].origin === 'branch')
  const mergeIndex = Math.min(mergeEdges.length - 1, Math.floor(range(frame, 250, 430) * mergeEdges.length))
  const focusedEdge = mergeEdges[mergeIndex]
  const focusWindow = range(frame, 242, 270) * (1 - range(frame, 434, 462))
  const hub = focusedEdge ? graph.byId[focusedEdge.to] : null

  return (
    <>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <g transform={cameraTransform(camera, VIEWPORT)}>
          <g opacity={1 - morph}>
            <PlantFigure
              done={layers.done}
              growing={layers.growing}
              maxDepth={graph.plant.levels}
              freshDepth={bud ? bud.segment.depth : null}
              tip={bud ? { x: bud.x, y: bud.y } : null}
              tipProgress={frame > 4 ? 1 : 0}
              leaves={false}
            />
          </g>
          <TechFigure
            graph={graph}
            reveal={reveal}
            progress={networkProgress}
            labelOpacity={labelIn}
            cameraScale={camera.scale}
            nodeScale={1.5}
            highlightNodes={focusWindow > 0.2 && hub ? [hub.id, ...hub.prereqs] : []}
            highlightEdges={focusWindow > 0.2 && focusedEdge ? [focusedEdge.from + '>' + focusedEdge.to] : []}
          />
        </g>
      </svg>

      <div style={{ position: 'absolute', left: 110, top: 160, opacity: range(frame, 196, 238) * (1 - range(frame, 560, 606)), color: SHOOT, fontSize: 32, letterSpacing: '0.06em' }}>
        枝条 → 路径 · 分叉点 → 节点
      </div>

      {focusWindow > 0.05 && hub ? (
        <div style={{ position: 'absolute', left: 110, top: 210, opacity: focusWindow, color: TECH_MERGE, fontSize: 28, letterSpacing: '0.04em' }}>
          {hub.label} 需要 {hub.prereqs.length} 个前置
        </div>
      ) : null}

      <Statement frame={frame} from={40} to={118} y={806} size={50}>树枝长到头，就分成新的树枝。</Statement>
      <Statement frame={frame} from={172} to={244} y={806} size={50}>把每个分叉点记下来，它就变成了节点。</Statement>
      <Statement frame={frame} from={266} to={352} y={806} size={54} color={TECH_MERGE}>可是不同的树枝，开始互相连接了。</Statement>
      <Caption frame={frame} from={278} to={362} size={36}>
        一条新的连线，往往横跨了两条本来无关的枝条。
        <br />
        一个成果，需要好几个前置同时到位 —— 这已经不再是一棵树。
      </Caption>
      <Statement frame={frame} from={446} to={520} y={806} size={50}>知识更适合画成一张有向无环图。</Statement>
      <Caption frame={frame} from={458} to={544} size={36}>
        一个发现可以打开多个方向；一个复杂的成果，也可以建立在很多前置之上。
        <br />
        （画面里是一组虚构的示意例子，用来讲清依赖关系，不是技术史。）
      </Caption>
      <Statement frame={frame} from={574} to={650} y={806} size={48} color={MUTED}>那么，再把镜头往外拉一点呢？</Statement>
    </>
  )
}
