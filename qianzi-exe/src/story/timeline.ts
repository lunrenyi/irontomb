/**
 * 影片时间轴：唯一的真相来源。
 *
 * 每一幕的起止帧不是手写的常数，而是由 score.ts 里的拍表算出来的：
 * 改一句字幕的长度，对应那一拍自动伸缩，整幕长度也跟着变。
 * 网站播放器与 Remotion 视频读同一份配置 —— 改这里，两边同时变。
 */
import { FPS } from './layout'
import { beatTable, type BeatTable } from './cues'
import { SCORE } from './score'
import { regionCamera, worldCamera, type RegionId } from '../viz/world'
import { transitionCamera, type Camera } from '../lib/camera'

export { FPS, STAGE_H, STAGE_W, STAGE, TYPE } from './layout'

export type SceneId = 'decode' | 'cosmos' | 'nature' | 'civilization' | 'human' | 'daily' | 'whole'

export interface SceneDef {
  id: SceneId
  title: string
  chapter: string
  /** 这一幕在世界的哪一块 */
  region: RegionId
  start: number
  duration: number
  /** 这一幕的拍表 */
  beats: BeatTable
}

interface SceneMeta {
  id: SceneId
  title: string
  chapter: string
  region: RegionId
}

/** 顺序即叙事顺序，也是镜头飞行的路线 */
const ORDER: SceneMeta[] = [
  { id: 'decode', title: '解码', chapter: '序', region: 'decode' },
  { id: 'cosmos', title: '天地时序', chapter: '01', region: 'cosmos' },
  { id: 'nature', title: '山川草木', chapter: '02', region: 'nature' },
  { id: 'civilization', title: '文字与制度', chapter: '03', region: 'civilization' },
  { id: 'human', title: '修身与人事', chapter: '04', region: 'human' },
  { id: 'daily', title: '衣食器用', chapter: '05', region: 'daily' },
  { id: 'whole', title: '完整全景', chapter: '06', region: 'whole' },
]

/** 转场用的交叠帧数（交叉溶解 + 镜头飞行） */
export const SCENE_OVERLAP = 36

/** 从拍表直接生成场景表：start 由前几幕的长度累加得到 */
export const SCENES: SceneDef[] = (() => {
  let cursor = 0
  return ORDER.map((meta) => {
    const beats = beatTable(SCORE[meta.id])
    const duration = beats.length ? beats[beats.length - 1].end : 0
    const scene: SceneDef = { ...meta, start: cursor, duration, beats }
    cursor += duration - SCENE_OVERLAP
    return scene
  })
})()

const LAST = SCENES[SCENES.length - 1]
export const TOTAL_FRAMES = LAST.start + LAST.duration
export const TOTAL_SECONDS = TOTAL_FRAMES / FPS

export interface SceneWindow {
  scene: SceneDef
  start: number
  end: number
  renderFrom: number
  renderTo: number
}

export const SCENE_WINDOWS: SceneWindow[] = SCENES.map((scene) => ({
  scene,
  start: scene.start,
  end: scene.start + scene.duration,
  renderFrom: Math.max(0, scene.start - SCENE_OVERLAP),
  renderTo: scene.start + scene.duration + SCENE_OVERLAP,
}))

/**
 * 某一帧属于哪一幕。
 *
 * 注意：幕与幕之间有 36 帧的交叠（用来交叉溶解与镜头飞行），
 * 所以「渲染窗口」和「正在演的那一幕」不是一回事。
 * 这里先找**正在演**的那一幕（start <= frame < end），
 * 只有在片头片尾找不到时，才退回渲染窗口。
 */
export function sceneAt(frame: number): SceneWindow {
  // 交叠期间两幕同时在画面上；取**最近开始**的那一幕 —— 镜头这时正飞向它
  let current: SceneWindow | undefined
  for (const w of SCENE_WINDOWS) {
    if (w.start <= frame) current = w
    else break
  }
  if (current) return current
  return SCENE_WINDOWS[0]
}

export const sceneById = (id: SceneId): SceneDef | undefined => SCENES.find((s) => s.id === id)

export const beatsOf = (id: SceneId): BeatTable => sceneById(id)!.beats

/* ------------------------------------------------------------------ 镜头 */

/** 一幕之内的镜头：固定取景，最多做一点点极缓的推拉（幅度 < 2.5%） */
function sceneCamera(scene: SceneDef, localFrame: number): Camera {
  const base = scene.region === 'whole' ? worldCamera() : regionCamera(scene.region)
  const p = scene.duration > 0 ? localFrame / scene.duration : 0
  // 极缓的呼吸式推拉；因为是常量函数，同一帧永远一样
  const scale = base.scale * (1 + 0.022 * Math.sin(p * Math.PI * 0.9))
  return { x: base.x, y: base.y, scale }
}

/**
 * 全片镜头。
 *
 * 规则：镜头在幕与幕之间**飞过去**，不是硬切。
 * 转场窗口 = [上一幕的 end - OVERLAP, 上一幕的 end + OVERLAP]，
 * 在这个窗口里镜头从 A 拉到 B，中途拉远一次，让整张知识网络露出来。
 */
export function cameraAtFrame(frame: number): Camera {
  const w = sceneAt(frame)
  const local = frame - w.start

  // 处在转场窗口里？
  for (let i = 0; i < SCENE_WINDOWS.length - 1; i += 1) {
    const a = SCENE_WINDOWS[i]
    const b = SCENE_WINDOWS[i + 1]
    const from = a.end - SCENE_OVERLAP
    const to = a.end + SCENE_OVERLAP
    if (frame >= from && frame <= to) {
      const t = (frame - from) / (to - from)
      const ca = sceneCamera(a.scene, a.scene.duration)
      const cb = sceneCamera(b.scene, 0)
      // 最后一次转场：拉远到整张地图
      if (b.scene.id === 'whole') {
        const wide = worldCamera()
        return transitionCamera(ca, wide, t, 0.3)
      }
      return transitionCamera(ca, cb, t)
    }
  }

  return sceneCamera(w.scene, local)
}

/* -------------------------------------------------- 页面与影片的对接 */

/**
 * 某一句原文在影片里对应的那一帧。
 *
 * 页面上的「点击原文 → 进入对应场景」就是靠它：
 * 找到讲这一句的那一拍，跳到那一拍的中间，并高亮它。
 */
export const PHRASE_FRAME: Map<number, number> = (() => {
  const map = new Map<number, number>()
  for (const scene of SCENES) {
    for (const beat of scene.beats) {
      for (const p of beat.phrases) {
        if (!map.has(p)) map.set(p, scene.start + beat.start + Math.round(beat.dur * 0.45))
      }
    }
  }
  return map
})()

/** 讲某一句的那一幕 */
export const PHRASE_SCENE: Map<number, SceneId> = (() => {
  const map = new Map<number, SceneId>()
  for (const scene of SCENES) {
    for (const beat of scene.beats) {
      for (const p of beat.phrases) {
        if (!map.has(p)) map.set(p, scene.id)
      }
    }
  }
  return map
})()

/** 某一句在影片里有没有讲；没有讲的话，落到它所属模块的那一幕 */
export function sceneForPhrase(index: number): SceneId {
  const direct = PHRASE_SCENE.get(index)
  if (direct) return direct
  return 'decode'
}

export function frameForPhrase(index: number): number {
  return PHRASE_FRAME.get(index) ?? 0
}
