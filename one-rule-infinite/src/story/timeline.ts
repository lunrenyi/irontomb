/**
 * 影片时间轴：唯一的真相来源。
 * 网站播放器与 Remotion 视频读同一份配置 —— 改这里，两边同时变。
 */

export const FPS = 30
export const STAGE_W = 1920
export const STAGE_H = 1080

/** 场景之间的交叠帧数（交叉溶解） */
export const SCENE_OVERLAP = 16

export interface SceneDef {
  id: string
  title: string
  start: number
  duration: number
}

const seconds = (s: number) => Math.round(s * FPS)

export const SCENES: SceneDef[] = [
  { id: 'seed', title: '一颗种子', start: 0, duration: seconds(17) },
  { id: 'branch', title: '分叉', start: seconds(16.5), duration: seconds(16) },
  { id: 'nature', title: '三种分支', start: seconds(32), duration: seconds(19) },
  { id: 'lesson', title: '规则', start: seconds(50.5), duration: seconds(18) },
  { id: 'depth', title: '从简单到复杂', start: seconds(68), duration: seconds(19) },
  { id: 'tech', title: '不只是分叉', start: seconds(86.5), duration: seconds(22) },
  { id: 'cosmos', title: '宇宙网', start: seconds(108), duration: seconds(25) },
]

export const TOTAL_FRAMES = SCENES[SCENES.length - 1].start + SCENES[SCENES.length - 1].duration
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

/** 第 n 帧属于哪个场景 */
export function sceneAt(frame: number): SceneWindow {
  const found = SCENE_WINDOWS.find((w) => frame >= w.renderFrom && frame <= w.renderTo)
  return found ?? SCENE_WINDOWS[SCENE_WINDOWS.length - 1]
}
