import { useEffect, useSyncExternalStore } from 'react'
import { animate, motionValue, type AnimationPlaybackControls, type MotionValue } from 'motion/react'
import { findSpecialIndex, normalizeAngle, TAU } from '../lib/math'

export type ThetaSource = 'init' | 'user' | 'auto' | 'preset' | 'scene' | 'quiz'

export interface RotationState {
  /** 唯一可信数据源：当前角度（弧度，归一到 [0, 2π)） */
  theta: number
  /** 自动旋转是否播放中 */
  playing: boolean
  /** 是否显示发光轨迹 */
  showTrail: boolean
  /** 用户是否正在拖动圆周上的点 */
  dragging: boolean
  /** 当前吸附到的特殊角度序号，-1 表示没有吸附 */
  snapIndex: number
  /** 最近一次改动的来源，便于界面做针对性反馈 */
  source: ThetaSource
}

const initialState: RotationState = {
  theta: 0,
  playing: false,
  showTrail: true,
  dragging: false,
  snapIndex: -1,
  source: 'init',
}

let state: RotationState = initialState
const listeners = new Set<() => void>()
let presetAnimation: AnimationPlaybackControls | null = null

/** 几何图形直接订阅这个 motion value，避免每帧触发 React 重渲染 */
export const thetaMotion: MotionValue<number> = motionValue(0)

function emit() {
  listeners.forEach((listener) => listener())
}

function setState(patch: Partial<RotationState>) {
  state = { ...state, ...patch }
  emit()
}

const SPECIAL_VALUES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, TAU]

export const rotationStore = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  /** 设置角度（弧度）。只有 user / quiz 来源会做特殊角度吸附判定 */
  setTheta(theta: number, source: ThetaSource = 'user') {
    const normalized = normalizeAngle(theta)
    const snapIndex = source === 'user' || source === 'quiz' ? findSpecialIndex(normalized) : -1
    if (thetaMotion.get() !== normalized) thetaMotion.set(normalized)
    if (state.theta === normalized && state.snapIndex === snapIndex && state.source === source) return
    setState({ theta: normalized, snapIndex, source })
  },
  /** 精确设为某个特殊角度（含 2π） */
  setSpecial(index: number, source: ThetaSource = 'preset') {
    const value = SPECIAL_VALUES[index]
    if (value === undefined) return
    if (thetaMotion.get() !== value) thetaMotion.set(value)
    setState({ theta: value, snapIndex: index, source })
  },
  setPlaying(playing: boolean) {
    if (state.playing === playing) return
    setState({ playing })
  },
  togglePlaying() {
    setState({ playing: !state.playing })
  },
  setShowTrail(showTrail: boolean) {
    setState({ showTrail })
  },
  toggleTrail() {
    setState({ showTrail: !state.showTrail })
  },
  setDragging(dragging: boolean) {
    setState({ dragging })
  },
  /** 用户操作时立刻接管控制权，停止自动播放 */
  takeControl() {
    if (presetAnimation) {
      presetAnimation.stop()
      presetAnimation = null
    }
    if (state.playing) setState({ playing: false })
  },
  /** 平滑地把点转到目标角度（沿最短路径），Promise 在动画结束时兑现 */
  reset() {
    if (presetAnimation) {
      presetAnimation.stop()
      presetAnimation = null
    }
    thetaMotion.set(0)
    setState({ theta: 0, snapIndex: 0, source: 'init', dragging: false })
  },
}

/** 订阅 store 的某个字段（selector 需返回原始值或稳定引用） */
export function useRotation<T>(selector: (s: RotationState) => T): T {
  return useSyncExternalStore(
    rotationStore.subscribe,
    () => selector(rotationStore.getState()),
    () => selector(initialState),
  )
}

/** 平滑转到目标角度（沿最短路径）；动画结束（或被打断）时兑现 Promise */
export function tweenToTheta(target: number, duration = 0.85): Promise<void> {
  return new Promise((resolve) => {
    rotationStore.takeControl()
    const from = rotationStore.getState().theta
    if (target >= TAU - 1e-9 && from < 0.06) {
      // 已经停在起点，把它记作「转满一圈」
      rotationStore.setSpecial(4, 'preset')
      resolve()
      return
    }
    let delta = normalizeAngle(target - from)
    if (delta > Math.PI) delta -= TAU
    const destination = from + delta
    presetAnimation = animate(thetaMotion, destination, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (value) => rotationStore.setTheta(value, 'preset'),
      onComplete: () => {
        presetAnimation = null
        // 归一化会把正好 2π 折回 0，这里显式记成「转满一圈」，读数才显示 2π
        if (target >= TAU - 1e-9 && TAU - rotationStore.getState().theta < 0.08) {
          rotationStore.setSpecial(4, 'preset')
        }
        resolve()
      },
    })
  })
}

/** 自动旋转引擎：整个应用只挂一个 rAF 循环，卸载时必定清理 */
export function useAutoRotationEngine(speed = 0.9) {
  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.05)
      last = now
      rotationStore.setTheta(rotationStore.getState().theta + speed * delta, 'auto')
      raf = requestAnimationFrame(tick)
    }

    const start = () => {
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }

    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    const sync = () => (rotationStore.getState().playing ? start() : stop())
    const unsubscribe = rotationStore.subscribe(sync)
    sync()

    return () => {
      unsubscribe()
      stop()
    }
  }, [speed])
}
