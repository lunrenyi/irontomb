import { FilmBackdrop } from '../viz/parts'
import { MysteryScene } from './scenes/Mystery'
import { ComplexPlaneScene } from './scenes/ComplexPlane'
import { UnitCircleScene } from './scenes/UnitCircle'
import { HalfTurnScene } from './scenes/HalfTurn'
import { CancellationScene } from './scenes/Cancellation'
import { RecapScene } from './scenes/Recap'
import { clamp01, easeIn, easeOut, range } from '../lib/easing'
import { SCENES, SCENE_OVERLAP, SCENE_WINDOWS, STAGE_H, STAGE_W, type SceneWindow } from './timeline'

const RENDERERS: Record<string, (props: { frame: number }) => JSX.Element> = {
  mystery: MysteryScene,
  plane: ComplexPlaneScene,
  circle: UnitCircleScene,
  halfturn: HalfTurnScene,
  cancel: CancellationScene,
  recap: RecapScene,
}

/**
 * 整部影片。
 *
 * 它只接受一个 frame —— 不读时钟、不读滚动、不用定时器。
 * 因此同一帧永远得到同一画面：Remotion 渲染出的 MP4 与浏览器里播放的是同一部片子。
 */
export function EulerFilm({
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
    <div
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        background: '#05070f',
      }}
    >
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
        {backdrop ? <FilmBackdrop width={STAGE_W} height={STAGE_H} glow={glowFor(frame)} /> : null}
        {SCENE_WINDOWS.map((win) => (
          <Shot key={win.scene.id} win={win} frame={frame} />
        ))}
      </div>
    </div>
  )
}

/** 背景光晕随场景轻微呼吸，纯粹为了空间感 */
function glowFor(frame: number): number {
  const active = SCENE_WINDOWS.find((w) => frame >= w.start && frame <= w.end)
  if (!active) return 0
  if (active.scene.id === 'cancel' || active.scene.id === 'halfturn') return 0.35
  if (active.scene.id === 'recap') return 0.2
  return 0
}

/** 单个镜头：进入淡入、退出淡出，中间留出重叠形成交叉溶解 */
function Shot({ win, frame }: { win: SceneWindow; frame: number }) {
  if (frame < win.renderFrom || frame > win.renderTo) return null
  const opacity = clamp01(easeOut(range(frame, win.renderFrom, win.start + SCENE_OVERLAP))) *
    (1 - clamp01(easeIn(range(frame, win.end, win.end + SCENE_OVERLAP))))
  if (opacity <= 0.002) return null

  const local = frame - win.start
  const Renderer = RENDERERS[win.scene.id]
  if (!Renderer) return null

  return (
    <div style={{ position: 'absolute', inset: 0, opacity }}>
      <Renderer frame={local} />
    </div>
  )
}

/** 影片元信息：网站播放器与文档都用它 */
export const FILM_INFO = {
  fps: 30,
  width: STAGE_W,
  height: STAGE_H,
  totalFrames: SCENE_WINDOWS[SCENE_WINDOWS.length - 1].end,
  scenes: SCENES,
}
