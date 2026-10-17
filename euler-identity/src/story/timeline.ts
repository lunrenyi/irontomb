/**
 * 影片时间轴：唯一的真相来源。
 * 网站播放器与 Remotion 视频都读这一份配置 —— 改这里，两边同时变。
 */

export const FPS = 30
export const STAGE_W = 1920
export const STAGE_H = 1080

/** 场景之间的交叠帧数（用于交叉溶解） */
export const SCENE_OVERLAP = 18

export interface SceneDef {
  id: string
  /** 章节名（网站导航 / 播放器刻度用） */
  title: string
  /** 起始帧 */
  start: number
  /** 时长（帧） */
  duration: number
}

const seconds = (s: number) => Math.round(s * FPS)

export const SCENES: SceneDef[] = [
  { id: 'mystery', title: '五个常数', start: 0, duration: seconds(8) },
  { id: 'plane', title: '复平面', start: seconds(8), duration: seconds(14.5) },
  { id: 'circle', title: '单位圆', start: seconds(22.5), duration: seconds(21) },
  { id: 'halfturn', title: '半圈', start: seconds(43.5), duration: seconds(24) },
  { id: 'cancel', title: '抵消', start: seconds(67.5), duration: seconds(18) },
  { id: 'recap', title: '收束', start: seconds(85.5), duration: seconds(16) },
]

export const TOTAL_FRAMES = SCENES[SCENES.length - 1].start + SCENES[SCENES.length - 1].duration
export const TOTAL_SECONDS = TOTAL_FRAMES / FPS

export interface SceneWindow {
  scene: SceneDef
  /** 场景真正开始 / 结束的帧（用于内容的时间计算） */
  start: number
  end: number
  /** 含交叠的渲染窗口 */
  renderFrom: number
  renderTo: number
  /** 场景内部时间：第 0 帧就是 start */
  local: (frame: number) => number
}

export const SCENE_WINDOWS: SceneWindow[] = SCENES.map((scene) => {
  const end = scene.start + scene.duration
  return {
    scene,
    start: scene.start,
    end,
    renderFrom: Math.max(0, scene.start - SCENE_OVERLAP),
    renderTo: end + SCENE_OVERLAP,
    local: (frame: number) => frame - scene.start,
  }
})

export function sceneAt(frame: number): SceneWindow {
  const found = SCENE_WINDOWS.find((w) => frame >= w.renderFrom && frame <= w.renderTo)
  return found ?? SCENE_WINDOWS[SCENE_WINDOWS.length - 1]
}

/** 影片统一的取景：几何都围绕这些点摆，保证跨场景的空间连续性 */
export const STAGE = {
  cx: 960,
  /** 单位圆圆心在 S2–S3；S4 会把它稍微上移缩小 */
  cy: 500,
  /** 单位圆半径 */
  r: 330,
  /** 数轴（S5） */
  lineY: 620,
  lineFrom: 300,
  lineTo: 1620,
} as const
