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

export const SCENES: SceneDef[] = [
  // 第一幕 · 枝条（约 13%）：只做引子，把接力棒交给第二幕。
  // 收尾那一拍（树居中 + 梢头点亮 + 字幕 + 标题卡）特意留了 3.8 秒，多出来的 2 秒给它。
  { id: 'growth', title: '枝条', start: 0, duration: 390 },
  // 第二幕 · 知识（约 64%）：全片的主体与高潮
  { id: 'domains', title: '五个方向', start: 375, duration: 440 },
  { id: 'fields', title: '积累', start: 800, duration: 480 },
  { id: 'network', title: '连接', start: 1265, duration: 430 },
  { id: 'phone', title: '智能手机', start: 1680, duration: 570 },
  // 第三幕 · 星海（约 26%）：把视野拉到宇宙，再回到人
  { id: 'cosmos', title: '星海', start: 2235, duration: 780 },
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
