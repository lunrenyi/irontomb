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

export { FPS, STAGE_H, STAGE_W, STAGE, TYPE } from './layout'

export type SceneId = 'bits' | 'life' | 'neural' | 'computer' | 'mind' | 'silicon'

/** 场景之间的交叠帧数（交叉溶解） */
export const SCENE_OVERLAP = 15

export interface SceneDef {
  id: SceneId
  title: string
  chapter: string
  start: number
  duration: number
  /** 这一幕的拍表：画面与字幕都从这里取时间 */
  beats: BeatTable
}

interface SceneMeta {
  id: SceneId
  title: string
  chapter: string
}

/** 顺序即叙事顺序 */
const ORDER: SceneMeta[] = [
  { id: 'bits', title: '0 和 1', chapter: '第一幕' },
  { id: 'life', title: '生命游戏', chapter: '第二幕' },
  { id: 'neural', title: '神经与芯片', chapter: '第三幕' },
  { id: 'computer', title: '指令执行', chapter: '第四幕' },
  { id: 'mind', title: '灵魂与 AI', chapter: '第五幕' },
  { id: 'silicon', title: '硅基生命', chapter: '第六幕' },
]

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

/** 影片长度 = 最后一幕的最后一帧（幕与幕之间的交叠已经算进 start 里了） */
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

export function sceneAt(frame: number): SceneWindow {
  const found = SCENE_WINDOWS.find((w) => frame >= w.renderFrom && frame <= w.renderTo)
  return found ?? SCENE_WINDOWS[SCENE_WINDOWS.length - 1]
}

export const sceneById = (id: SceneId): SceneDef | undefined => SCENES.find((s) => s.id === id)

/** 某一幕的拍表（场景文件用它取时间） */
export const beatsOf = (id: SceneId): BeatTable => sceneById(id)!.beats
