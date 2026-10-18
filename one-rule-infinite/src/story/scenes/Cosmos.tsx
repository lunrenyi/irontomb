import { useMemo } from 'react'
import { CosmosFigure } from '../../viz/cosmosfigure'
import { TechFigure, techReveal } from '../../viz/techfigure'
import { cameraAt, cameraTransform, fitBounds, lerpCamera, type CameraKey } from '../../viz/camera'
import { buildCosmosWeb, cosmosStats } from '../../lib/cosmos'
import { buildTechGraph } from '../../lib/techgraph'
import { easeIn, easeOut, range } from '../../lib/easing'
import { Caption, MUTED, SHOOT, Statement } from '../FilmChrome'
import { STAGE_H, STAGE_W } from '../timeline'

const VIEWPORT = { width: STAGE_W, height: STAGE_H }

/**
 * 场景 7 · 从知识网络到宇宙网
 *
 * 这不是「把科技树缩小塞进星空」。
 * 镜头继续沿着上一场的轨迹往外退，技术网络淡出，
 * 一个**完全不同**的程序生成结构接管画面：丝状结构、团块、大片空洞。
 *
 * 两者只做结构上的对照，不做任何因果暗示：
 * 宇宙的大尺度结构由引力与物质演化决定，和分叉规则没有关系。
 */
export function CosmosScene({ frame }: { frame: number }) {
  const web = useMemo(() => buildCosmosWeb(), [])
  const stats = useMemo(() => cosmosStats(web), [web])
  const graph = useMemo(() => buildTechGraph(), [])
  const reveal = useMemo(() => techReveal(graph), [graph])

  const keys = useMemo<CameraKey[]>(() => {
    // 起点与上一场的收尾取景一致：观众看到的是同一次「后退」的延续
    const start = fitBounds(graph.bounds, VIEWPORT, { padding: 1.14, maxScale: 1.5 })
    const end = fitBounds(web.bounds, VIEWPORT, { padding: 1.06, maxScale: 1.4 })
    return [
      { at: 0, camera: start },
      { at: 210, camera: lerpCamera(start, end, 0.55) },
      { at: 400, camera: end },
      { at: 760, camera: end },
    ]
  }, [graph, web])
  const camera = cameraAt(keys, frame)

  // 科技网络淡出：节点缩成远处的一点，线先散
  const techFade = 1 - easeIn(range(frame, 10, 168))
  // 宇宙网入场：星场 -> 丝线 -> 团块，跟镜头后退的方向一致
  const cosmosIn = easeOut(range(frame, 130, 500))
  const statsIn = range(frame, 500, 560) * (1 - range(frame, 690, 726))

  return (
    <>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <g transform={cameraTransform(camera, VIEWPORT)}>
          <g opacity={techFade}>
            <TechFigure graph={graph} reveal={reveal} progress={1} labels={false} cameraScale={camera.scale} nodeScale={1.5 - techFade * 0.85} />
          </g>
          <CosmosFigure web={web} progress={cosmosIn} />
        </g>
      </svg>

      <div
        style={{
          position: 'absolute', right: 96, top: 120, opacity: statsIn,
          fontSize: 24, color: MUTED, textAlign: 'right', lineHeight: 1.8, letterSpacing: '0.06em',
        }}
      >
        <div>{stats.knots} 个聚集区 · {stats.filaments} 条丝线</div>
        <div>{Math.round(stats.voidShare * 100)}% 的画面是空的</div>
      </div>

      <div
        style={{
          position: 'absolute', right: 96, top: 62, opacity: range(frame, 140, 200) * (1 - range(frame, 660, 710)),
          fontSize: 22, color: '#6f8391', letterSpacing: '0.16em',
        }}
      >
        宇宙网结构示意 · 受宇宙网启发的程序化可视化
      </div>

      <Statement frame={frame} from={30} to={108} y={806} size={50}>镜头一直往外退，节点变成了远处的光点。</Statement>
      <Statement frame={frame} from={140} to={228} y={806} size={50}>连线散开之后，剩下的空间里有东西。</Statement>
      <Statement frame={frame} from={268} to={360} y={806} size={54} color={SHOOT}>物质先聚成团，再沿捷径连成丝，中间留下巨大的空洞。</Statement>
      <Caption frame={frame} from={280} to={372} size={36}>
        这就是宇宙网：星系并不均匀分布，而是织成一张网。
        <br />
        它的成因是引力作用下物质的长期演化，不是分叉规则。
      </Caption>
      <Statement frame={frame} from={420} to={502} y={806} size={50}>它和树枝、网络，长得确实有几分像。</Statement>
      <Statement frame={frame} from={534} to={620} y={806} size={52} color={SHOOT}>但长得像，从来不等于成因一样。</Statement>
      <Caption frame={frame} from={546} to={650} size={36}>
        从一根枝条，到一张知识网络，再到宇宙中的巨大结构：
        <br />
        我们可以比较它们怎么组织、怎么连接、怎么演化 —— 但要说清楚的是，这三者的成因各不相同。
      </Caption>
    </>
  )
}
