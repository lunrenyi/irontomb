/**
 * 整部影片。
 *
 * 它只接受一个 frame —— 不读时钟、不读滚动、不用定时器、不用随机数。
 * 同一帧永远得到同一画面：Remotion 渲染出的 MP4 与浏览器里播放的是同一部片子。
 *
 * 结构：
 *   背景（屏幕空间）
 *   + 知识网络（世界空间）—— 所有章节共用的连接组织
 *   + 六个模块（世界空间）—— 各自在地图上的一块
 *   + 文字（屏幕空间）—— 章节标题、关键文字、字幕
 */
import { FilmBackdrop } from '../viz/backdrop'
import { KnowledgeNetwork } from '../viz/network'
import { cameraTransform } from '../lib/camera'
import { MODULE_HUE } from '../viz/palette'
import { REGIONS } from '../viz/world'
import { CaptionBand, ChapterTitle, Hud, KeyBeat } from './FilmChrome'
import { DecodeScene } from './scenes/Decode'
import { CosmosScene } from './scenes/Cosmos'
import { NatureScene } from './scenes/Nature'
import { CivilizationScene } from './scenes/Civilization'
import { HumanScene } from './scenes/Human'
import { DailyScene } from './scenes/Daily'
import { WholeScene } from './scenes/Whole'
import { beatIndexAt } from './cues'
import {
  SCENE_WINDOWS,
  STAGE_H,
  STAGE_W,
  beatsOf,
  cameraAtFrame,
  sceneAt,
  type SceneId,
} from './timeline'

const VIEWPORT = { width: STAGE_W, height: STAGE_H }

const RENDERERS: Record<
  SceneId,
  (props: {
    frame: number
    beat: number
    slot: string
    progress: number
    sceneProgress: number
    beatDuration: number
  }) => JSX.Element
> = {
  decode: DecodeScene,
  cosmos: CosmosScene,
  nature: NatureScene,
  civilization: CivilizationScene,
  human: HumanScene,
  daily: DailyScene,
  whole: WholeScene,
}

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
  const camera = cameraAtFrame(frame)
  const win = sceneAt(frame)
  const beats = beatsOf(win.scene.id)
  const local = frame - win.start
  const beatIndex = beatIndexAt(beats, local)
  const accent = win.scene.id === 'decode' || win.scene.id === 'whole' ? '#5fe3d0' : MODULE_HUE[win.scene.id as keyof typeof MODULE_HUE] ?? '#5fe3d0'

  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden', background: '#03060e' }}>
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
        {backdrop ? <FilmBackdrop width={STAGE_W} height={STAGE_H} frame={frame} /> : null}

        {/* 世界空间：知识网络 + 各模块 */}
        {/*
          世界层必须是一个真正的 <svg>。
          之前它是一个 <div>，里面的 <g>/<circle>/<text> 被 React 建成了 HTML 元素 ——
          浏览器不画它们，于是整部影片只有文字层（HTML）出来了，图形一片空白。
        */}
        <svg
          width={STAGE_W}
          height={STAGE_H}
          viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H}
          style={{ position: 'absolute', inset: 0, display: 'block' }}
          aria-hidden='true'
        >
        <g transform={cameraTransform(camera, VIEWPORT)}>
          <KnowledgeNetwork
            focusX={camera.x}
            focusY={camera.y}
            zoom={camera.scale}
            frame={frame}
            radius={2400}
            detail={camera.scale < 0.8 ? 'full' : 'backdrop'}
          />
          {SCENE_WINDOWS.map((w) => {
            if (frame < w.renderFrom || frame > w.renderTo) return null
            const Renderer = RENDERERS[w.scene.id]
            if (!Renderer) return null
            const localFrame = frame - w.start
            const b = beatIndexAt(w.scene.beats, localFrame)
            const bb = w.scene.beats[b]
            // 场景组件画的是「区域内」的坐标；整个世界空间里要把它们搬到各自的区域
            const region = REGIONS[w.scene.region]
            return (
              <g key={w.scene.id} transform={'translate(' + region.x + ' ' + region.y + ')'}>
                <Renderer
                  frame={localFrame}
                  beat={b}
                  slot={bb ? bb.slot : ''}
                  progress={bb ? Math.min(1, Math.max(0, (localFrame - bb.start) / Math.max(1, bb.dur))) : 0}
                  sceneProgress={w.scene.duration > 0 ? Math.min(1, Math.max(0, localFrame / w.scene.duration)) : 0}
                  beatDuration={bb ? bb.dur : 1}
                />
              </g>
            )
          })}
        </g>
        </svg>

        {/* 屏幕空间：文字 */}
        <ChapterTitle
          frame={local}
          beats={beats}
          title={win.scene.title}
          sub={win.scene.id === 'decode' ? 'PROLOGUE' : win.scene.id === 'whole' ? 'EPILOGUE' : 'CHAPTER ' + win.scene.chapter}
          color={accent}
        />
        <KeyBeat frame={local} beats={beats} beatIndex={beatIndex} color={PAPER_COLOR} />
        <CaptionBand frame={local} cues={beats.flatMap((b) => b.cues)} accent={accent} />
        <Hud
          frame={frame}
          chapter={win.scene.id === 'decode' ? '00' : win.scene.id === 'whole' ? '06' : win.scene.chapter}
          title={win.scene.title}
          code={'FRAME ' + String(frame).padStart(5, '0') + ' · ' + win.scene.id.toUpperCase()}
          accent={accent}
        />
      </div>
    </div>
  )
}

const PAPER_COLOR = '#eef4ff'
