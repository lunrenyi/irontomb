import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motionValue, type MotionValue } from 'motion/react'

export interface Phase {
  id: string
  /** 阶段时长（秒） */
  duration: number
  /** 阶段开始时的角度 */
  from: number
  /** 阶段结束时的角度 */
  to: number
  /** 缓动方式：连续旋转用 linear，其余用平滑缓入缓出 */
  ease?: 'inOut' | 'linear' | 'out'
}

export interface TimelineControls {
  /** 当前阶段序号 */
  phaseIndex: number
  /** 是否播放中 */
  playing: boolean
  /** 全部阶段是否结束 */
  finished: boolean
  /** 全局进度 0–1 */
  progress: number
  /** 当前角度，直接喂给 SVG 的 motion value */
  theta: MotionValue<number>
  play: () => void
  pause: () => void
  toggle: () => void
  replay: () => void
  next: () => void
  prev: () => void
  jumpTo: (index: number) => void
  /** 跳到某个阶段并停留（用于手动查看某一步） */  jumpAndHold: (index: number) => void
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

function applyEase(t: number, ease: Phase['ease']) {
  if (ease === 'linear') return t
  if (ease === 'out') return easeOut(t)
  return easeInOut(t)
}

/**
 * 分阶段时间轴：场景 05 / 06 共用的调度器。
 * rAF 只写 motion value，阶段切换才触发 React 重渲染。
 */
export function usePhaseTimeline(
  phases: Phase[],
  options: { reducedMotion?: boolean; autoplay?: boolean; onFinish?: () => void } = {},
): TimelineControls {
  const { reducedMotion = false, autoplay = true, onFinish } = options
  const total = useMemo(() => phases.reduce((sum, p) => sum + p.duration, 0), [phases])
  const theta = useMemo(() => motionValue(phases[0]?.from ?? 0), [phases])
  const finishedRef = useRef(reducedMotion)
  const [phaseIndex, setPhaseIndex] = useState(reducedMotion ? Math.max(phases.length - 1, 0) : 0)
  const [playing, setPlaying] = useState(autoplay && !reducedMotion)
  const [finished, setFinished] = useState(reducedMotion)
  const [progress, setProgress] = useState(reducedMotion ? 1 : 0)

  const elapsedRef = useRef(0)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const phaseRef = useRef(phaseIndex)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  const setPhase = useCallback((index: number) => {
    phaseRef.current = index
    setPhaseIndex((prev) => (prev === index ? prev : index))
  }, [])

  const applyElapsed = useCallback(
    (elapsed: number) => {
      let cursor = 0
      let value = phases[0]?.from ?? 0
      for (let i = 0; i < phases.length; i += 1) {
        const phase = phases[i]
        const end = cursor + phase.duration
        if (elapsed <= end || i === phases.length - 1) {
          const local = phase.duration <= 0 ? 1 : Math.min(Math.max((elapsed - cursor) / phase.duration, 0), 1)
          value = phase.from + (phase.to - phase.from) * applyEase(local, phase.ease)
          if (i !== phaseRef.current) setPhase(i)
          break
        }
        cursor = end
      }
      theta.set(value)
      setProgress(total <= 0 ? 1 : Math.min(elapsed / total, 1))
    },
    [phases, setPhase, theta, total],
  )

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }, [])

  const startLoop = useCallback(() => {
    if (rafRef.current) return
    lastRef.current = performance.now()
    const tick = (now: number) => {
      const delta = Math.min((now - lastRef.current) / 1000, 0.06)
      lastRef.current = now
      const next = Math.min(elapsedRef.current + delta, total)
      elapsedRef.current = next
      applyElapsed(next)
      if (next >= total) {
        stopLoop()
        setPlaying(false)
        setFinished(true)
        finishedRef.current = true
        onFinishRef.current?.()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [applyElapsed, stopLoop, total])

  // reduced motion：直接落到最后一步，把所有信息一次讲完
  useEffect(() => {
    if (!reducedMotion) return
    elapsedRef.current = total
    applyElapsed(total)
    stopLoop()
    setPlaying(false)
    setFinished(true)
    finishedRef.current = true
    // applyElapsed 依赖 phaseIndex，这里只在 reducedMotion 变化时重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion])

  useEffect(() => stopLoop, [stopLoop])

  const play = useCallback(() => {
    if (finishedRef.current) return
    setPlaying(true)
    startLoop()
  }, [startLoop])

  const pause = useCallback(() => {
    stopLoop()
    setPlaying(false)
  }, [stopLoop])

  const toggle = useCallback(() => {
    if (playing) pause()
    else play()
  }, [pause, play, playing])

  const replay = useCallback(() => {
    stopLoop()
    elapsedRef.current = 0
    finishedRef.current = false
    setFinished(false)
    setPhase(0)
    applyElapsed(0)
    if (reducedMotion) {
      elapsedRef.current = total
      applyElapsed(total)
      setFinished(true)
      finishedRef.current = true
      setPlaying(false)
      return
    }
    setPlaying(true)
    startLoop()
  }, [applyElapsed, reducedMotion, setPhase, startLoop, stopLoop, total])

  const jumpTo = useCallback(
    (index: number) => {
      stopLoop()
      let cursor = 0
      for (let i = 0; i < index; i += 1) cursor += phases[i].duration
      elapsedRef.current = cursor
      finishedRef.current = false
      setFinished(false)
      setPlaying(false)
      applyElapsed(cursor)
    },
    [applyElapsed, phases, stopLoop],
  )

  const next = useCallback(() => {
    jumpTo(Math.min(phaseIndex + 1, phases.length - 1))
  }, [jumpTo, phaseIndex, phases.length])

  const prev = useCallback(() => {
    jumpTo(Math.max(phaseIndex - 1, 0))
  }, [jumpTo, phaseIndex])

  /** 跳到某个阶段并停在这一步的末尾（便于停下来慢慢读公式） */
  const jumpAndHold = useCallback(
    (index: number) => {
      stopLoop()
      let cursor = 0
      for (let i = 0; i < index; i += 1) cursor += phases[i].duration
      cursor += (phases[index]?.duration ?? 0) * 0.999
      elapsedRef.current = Math.min(cursor, total)
      finishedRef.current = false
      setFinished(false)
      setPlaying(false)
      applyElapsed(elapsedRef.current)
    },
    [applyElapsed, phases, stopLoop, total],
  )

  return {
    phaseIndex,
    playing,
    finished,
    progress,
    theta,
    play,
    pause,
    toggle,
    replay,
    next,
    prev,
    jumpTo,
    jumpAndHold,
  }
}
