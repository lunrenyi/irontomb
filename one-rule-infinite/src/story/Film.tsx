import { FilmBackdrop } from '../viz/backdrop'
import { GrowthScene } from './scenes/Growth'
import { DomainsScene } from './scenes/Domains'
import { FieldsScene } from './scenes/Fields'
import { NetworkScene } from './scenes/Network'
import { PhoneScene } from './scenes/Phone'
import { CosmosScene } from './scenes/Cosmos'
import { clamp01, easeIn, easeOut, range } from '../lib/easing'
import { SCENE_OVERLAP, SCENE_WINDOWS, STAGE_H, STAGE_W } from './timeline'

const RENDERERS: Record<string, (props: { frame: number }) => JSX.Element> = {
  growth: GrowthScene,
  domains: DomainsScene,
  fields: FieldsScene,
  network: NetworkScene,
  phone: PhoneScene,
  cosmos: CosmosScene,
}

/**
 * 整部影片。
 *
 * 它只接受一个 frame —— 不读时钟、不读滚动、不用定时器、不用随机数。
 * 同一帧永远得到同一画面：Remotion 渲染出的 MP4 与浏览器里播放的是同一部片子。
 */
export function Film({
  frame,
  width = STAGE_W,
  height = STAGE_H,
  backdrop = true,
}: {
  frame: number
  width?: number
  height?: number
  backdrop?: boolean
}) {
  const scale = Math.min(width / STAGE_W, height / STAGE_H)
  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden', background: '#060f0c' }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: STAGE_W,
          height: STAGE_H,
          transform: 'translate(-50%, -50%) scale(' + scale + ')',
          transformOrigin: 'center center',
        }}
      >
        {backdrop ? <FilmBackdrop width={STAGE_W} height={STAGE_H} /> : null}
        {SCENE_WINDOWS.map((win) => (
          <Shot key={win.scene.id} win={win} frame={frame} />
        ))}
      </div>
    </div>
  )
}

/** 单个镜头：进入淡入、退出淡出，中间留出重叠形成交叉溶解 */
function Shot({ win, frame }: { win: (typeof SCENE_WINDOWS)[number]; frame: number }) {
  if (frame < win.renderFrom || frame > win.renderTo) return null
  const opacity =
    clamp01(easeOut(range(frame, win.renderFrom, win.start + SCENE_OVERLAP))) *
    (1 - clamp01(easeIn(range(frame, win.end, win.end + SCENE_OVERLAP))))
  if (opacity <= 0.002) return null
  const Renderer = RENDERERS[win.scene.id]
  if (!Renderer) return null
  return (
    <div style={{ position: 'absolute', inset: 0, opacity }}>
      <Renderer frame={frame - win.start} />
    </div>
  )
}
