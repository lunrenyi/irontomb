import { useCallback, useEffect, useRef, useState } from 'react'

export interface SequenceStep {
  id: string
  duration: number
}

export interface SequenceControls {
  index: number
  playing: boolean
  finished: boolean
  play: () => void
  pause: () => void
  toggle: () => void
  replay: () => void
  seek: (index: number) => void
}

/** 简单的分步叙事：每一步停留固定时长，可播放 / 暂停 / 重播 / 跳步 */
export function useSequence(
  steps: SequenceStep[],
  options: { autoPlay?: boolean; staticMode?: boolean } = {},
): SequenceControls {
  const { autoPlay = true, staticMode = false } = options
  const [index, setIndex] = useState(staticMode ? Math.max(steps.length - 1, 0) : 0)
  const [playing, setPlaying] = useState(autoPlay && !staticMode)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!playing || staticMode) return
    const duration = steps[index]?.duration ?? 800
    timerRef.current = window.setTimeout(() => {
      setIndex((current) => {
        if (current + 1 >= steps.length) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, duration)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [index, playing, staticMode, steps])

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const play = useCallback(() => {
    setIndex((current) => (current >= steps.length - 1 ? 0 : current))
    setPlaying(true)
  }, [steps.length])

  const pause = useCallback(() => setPlaying(false), [])
  const toggle = useCallback(() => {
    if (playing) pause()
    else play()
  }, [pause, play, playing])
  const replay = useCallback(() => {
    setIndex(0)
    setPlaying(!staticMode)
  }, [staticMode])
  const seek = useCallback(
    (next: number) => {
      setPlaying(false)
      setIndex(Math.min(Math.max(next, 0), steps.length - 1))
    },
    [steps.length],
  )

  return {
    index,
    playing,
    finished: index >= steps.length - 1 && !playing,
    play,
    pause,
    toggle,
    replay,
    seek,
  }
}
