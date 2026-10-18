import { FilmBackdrop } from '../viz/backdrop'
import { CaptionBand } from './FilmChrome'
import { BitsScene } from './scenes/Bits'
import { LifeScene } from './scenes/Life'
import { NeuralScene } from './scenes/Neural'
import { ComputerScene } from './scenes/Computer'
import { MindScene } from './scenes/Mind'
import { SiliconScene } from './scenes/Silicon'
import { easeIn, easeOut, range } from '../lib/easing'
import { SCENE_OVERLAP, SCENE_WINDOWS, STAGE_H, STAGE_W, beatsOf, type SceneId } from './timeline'

const RENDERERS: Record<SceneId, (props: { frame: number }) => JSX.Element> = {
  bits: BitsScene,
  life: LifeScene,
  neural: NeuralScene,
  computer: ComputerScene,
  mind: MindScene,
  silicon: SiliconScene,
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
    <div style={{ position: 'relative', width, height, overflow: 'hidden', background: '#04060d' }}>
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

/**
 * 单个镜头：交叉溶解。
 * 进来的那一幕在自己的 start 之前淡入，走的那一幕在 start 之后淡出 ——
 * 两者用的是同一段重叠帧，所以是溶解，不是两幕叠在一起。
 */
function Shot({ win, frame }: { win: (typeof SCENE_WINDOWS)[number]; frame: number }) {
  if (frame < win.renderFrom || frame > win.renderTo) return null
  const isLast = win === SCENE_WINDOWS[SCENE_WINDOWS.length - 1]
  // 淡入走完 [start - OVERLAP, start]，淡出走 [end - OVERLAP, end]：
 // 两段正好首尾相接于同一批重叠帧，所以是溶解而不是叠加。
  const fadeIn = easeOut(range(frame, win.renderFrom, win.start))
  const fadeOut = isLast ? 1 : 1 - easeIn(range(frame, win.end - SCENE_OVERLAP, win.end))
  const opacity = fadeIn * fadeOut
  if (opacity <= 0.002) return null
  const Renderer = RENDERERS[win.scene.id]
  if (!Renderer) return null
  return (
    <div style={{ position: 'absolute', inset: 0, opacity }}>
      <Renderer frame={frame - win.start} />
      <CaptionBand frame={frame - win.start} cues={beatsOf(win.scene.id).flatMap((b) => b.cues)} />
    </div>
  )
}
