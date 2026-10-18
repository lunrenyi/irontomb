import { useMemo } from 'react'
import { CosmosFigure } from '../../viz/cosmosfigure'
import { KnowledgeFigure, K_EDGE } from '../../viz/knowledgefigure'
import { buildKnowledgeGraph } from '../../lib/knowledge'
import { buildCosmosWeb, cosmosStats } from '../../lib/cosmos'
import { cameraAt, cameraTransform, fitBounds, lerpCamera } from '../../viz/camera'
import { knowledgeFramings } from '../knowledgeTimeline'
import { clamp01, easeIn, easeInOut, easeOut, range } from '../../lib/easing'
import { Caption, INK, MUTED, SHOOT, Statement } from '../FilmChrome'
import { STAGE_H, STAGE_W } from '../timeline'

const VIEWPORT = { width: STAGE_W, height: STAGE_H }

/** 第三幕用来回扣的三个节点：观测、计算、电磁理论 */
const RECALL = ['d2', 'd3', 'cs0']

/**
 * 第三幕 · 群星
 *
 * 这一幕分三步，而且第三步最容易被做错：
 *   1. 镜头从知识网络继续往外退，网络淡出 —— 这是**视角**在变，不是「科技树变成了宇宙」；
 *   2. 一个**完全独立生成**的宇宙网浮现（丝线、团块、空洞），并标明是示意；
 *   3. 知识网络里的「观测 / 计算 / 电磁」重新出现，
 *      说明我们正是用积累起来的知识与工具在认识它 ——
 *      而不是说两者有相同的形成机制。
 */
export function CosmosScene({ frame }: { frame: number }) {
  const web = useMemo(() => buildCosmosWeb(), [])
  const stats = useMemo(() => cosmosStats(web), [web])
  const graph = useMemo(() => buildKnowledgeGraph(), [])

  // 起点与上一幕的收尾取景一致：观众看到的是同一次「后退」的延续
  // 必须和第二幕收尾用的是同一个取景，否则两幕相接的地方会突然跳一次镜头
  const whole = useMemo(() => knowledgeFramings(graph).whole, [graph])
  const deep = useMemo(() => fitBounds(web.bounds, VIEWPORT, { padding: 1.05, maxScale: 1.25 }), [web])

  const camera = cameraAt(
    [
      { at: 0, camera: whole },
      { at: 230, camera: lerpCamera(whole, deep, 0.5) },
      { at: 420, camera: deep },
      { at: 900, camera: deep },
    ],
    frame,
    easeInOut,
  )

  // 知识网络淡出：节点缩成远处的光点，线先散
  const netFade = 1 - easeIn(range(frame, 20, 190))
  // 宇宙网入场：星场 -> 丝线 -> 团块，跟镜头后退的方向一致
  const cosmosIn = easeOut(range(frame, 150, 520))

  // 第三步：三个知识节点重新亮起，并用一条虚线指向宇宙网
  const recallIn = range(frame, 560, 640) * (1 - range(frame, 672, 742))
  return (
    <>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <g transform={cameraTransform(camera, VIEWPORT)}>
          {netFade > 0.01 ? (
            <g opacity={netFade}>
              <KnowledgeFigure graph={graph} progress={1} labels={false} cameraScale={camera.scale} nodeScale={1.5 - netFade * 1.0} />
            </g>
          ) : null}
          <CosmosFigure web={web} progress={cosmosIn} />

          {/* 我们的知识与工具：三条射线从下方射向宇宙网 */}
          {recallIn > 0.01 ? (
            <g opacity={recallIn}>
              {RECALL.map((id, i) => {
                const node = graph.byId[id]
                const t = clamp01(range(frame, 570 + i * 40, 630 + i * 40))
                if (t <= 0) return null
                const toX = node.x * 0.35
                const toY = (node.y + 260) * 0.35 - 120
                return (
                  <g key={id}>
                    <line
                      x1={node.x}
                      y1={node.y}
                      x2={toX}
                      y2={toY}
                      stroke={K_EDGE}
                      strokeWidth={1.8}
                      strokeOpacity={0.55 * t}
                      strokeDasharray={'6 10'}
                    />
                    <circle cx={node.x} cy={node.y} r={6} fill={K_EDGE} opacity={0.9 * t} />
                    <circle cx={node.x} cy={node.y} r={18} fill={K_EDGE} opacity={0.14 * t} />
                    <text x={node.x} y={node.y + 34} textAnchor='middle' fill={'#9fb9b0'} fontSize={22} opacity={0.8 * t}>
                      {node.label}
                    </text>
                  </g>
                )
              })}
            </g>
          ) : null}
        </g>
      </svg>

      <div style={{ position: 'absolute', right: 96, top: 60, opacity: range(frame, 200, 250) * (1 - range(frame, 560, 620)), fontSize: 22, color: '#7f93a8', letterSpacing: '0.14em' }}>
        宇宙网结构示意 · 受宇宙网启发的程序化可视化
      </div>
      <div style={{ position: 'absolute', right: 96, top: 108, opacity: range(frame, 300, 360) * (1 - range(frame, 520, 570)), fontSize: 24, color: MUTED, textAlign: 'right', lineHeight: 1.7, letterSpacing: '0.06em' }}>
        <div>{stats.knots} 个聚集区 · {stats.filaments} 条丝线</div>
        <div>{Math.round(stats.voidShare * 100)}% 的画面是空的</div>
      </div>

      <Statement frame={frame} from={30} to={110} y={806} size={50}>
        把镜头继续往外拉。
      </Statement>
      <Statement frame={frame} from={140} to={220} y={806} size={50}>
        节点变成远处的光点，连接线渐渐淡去。
      </Statement>
      <Statement frame={frame} from={268} to={344} y={806} size={52}>
        在更大的尺度上，宇宙也有自己的网络。
      </Statement>
      <Statement frame={frame} from={380} to={464} y={806} size={48}>
        星系结成团块，团块连成丝，中间留下巨大的空洞。
      </Statement>
      <Statement frame={frame} from={478} to={556} y={806} size={46} color={'#8fa4d8'}>
        它的成因不是分叉规则，而是引力下的物质演化。
      </Statement>
      <Statement frame={frame} from={600} to={684} y={806} size={48} color={SHOOT}>
        而认识它，靠的正是我们积累起来的知识与工具。
      </Statement>

      <Caption frame={frame} from={478} to={570} size={34}>
        知识网络与宇宙网并不是同一种东西：
        <br />
        前者由人类的探索与积累连成，后者由引力塑造。
      </Caption>

      <div style={{ position: 'absolute', left: 0, right: 0, top: 360, textAlign: 'center', opacity: range(frame, 716, 776), fontSize: 54, color: INK, letterSpacing: '0.1em', lineHeight: 1.4 }}>
        我们用知识连接已知，
        <br />
        再用已知探索未知。
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', opacity: range(frame, 812, 872), fontSize: 40, color: SHOOT, letterSpacing: '0.1em' }}>
        下一条连接，会带我们发现什么？
      </div>
    </>
  )
}
