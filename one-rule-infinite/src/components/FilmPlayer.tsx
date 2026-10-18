import { useCallback, useEffect, useRef, useState } from 'react'
import { GrowthFilm } from '../story/Film'
import { onFilmSeek } from '../story/playerBus'
import { FPS, SCENES, TOTAL_FRAMES } from '../story/timeline'
import { useInView } from '../hooks/useInView'
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference'
import { cx } from './ui'

const STAGE_ASPECT = 16 / 9

function clock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0')
}

/** 影片此刻属于哪一章 */
function chapterAt(frame: number): string {
  const active = [...SCENES].reverse().find((scene) => frame >= scene.start)
  return active ? active.id : SCENES[0].id
}

/**
 * 影片播放器。
 * 只做一件事：用 rAF 把「过去了多少帧」换算成时间，再交给纯函数的 GrowthFilm。
 */
export function FilmPlayer({ className }: { className?: string }) {
  const reducedMotion = useReducedMotionPreference()
  const stageRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef(0)
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [box, setBox] = useState({ width: 960, height: 540 })
  const { ref: inViewRef, inView } = useInView<HTMLDivElement>({ threshold: 0.4, once: false })

  useEffect(() => {
    const node = stageRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect || rect.width <= 0) return
      setBox({ width: rect.width, height: rect.width / STAGE_ASPECT })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const seek = useCallback((next: number) => {
    const clamped = Math.min(Math.max(0, Math.round(next)), TOTAL_FRAMES - 1)
    frameRef.current = clamped
    setFrame(clamped)
    setStarted(true)
    if (clamped >= TOTAL_FRAMES - 1) setPlaying(false)
  }, [])

  useEffect(() => onFilmSeek(seek), [seek])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    let accumulator = 0
    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.2)
      last = now
      accumulator += delta * FPS
      if (accumulator >= 1) {
        const advance = Math.floor(accumulator)
        accumulator -= advance
        const next = frameRef.current + advance
        if (next >= TOTAL_FRAMES - 1) {
          frameRef.current = TOTAL_FRAMES - 1
          setFrame(TOTAL_FRAMES - 1)
          setPlaying(false)
          return
        }
        frameRef.current = next
        setFrame(next)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  useEffect(() => {
    if (reducedMotion) return
    if (inView && !started) {
      setStarted(true)
      setPlaying(true)
    } else if (!inView && playing) {
      setPlaying(false)
    }
  }, [inView, started, playing, reducedMotion])

  const toggle = useCallback(() => {
    setStarted(true)
    setPlaying((was) => {
      if (!was && frameRef.current >= TOTAL_FRAMES - 1) {
        frameRef.current = 0
        setFrame(0)
      }
      return !was
    })
  }, [])

  const replay = useCallback(() => {
    seek(0)
    setPlaying(true)
  }, [seek])

  const stepScene = useCallback(
    (direction: 1 | -1) => {
      const index = SCENES.findIndex((scene) => scene.id === chapterAt(frameRef.current))
      const target = SCENES[Math.min(Math.max(index + direction, 0), SCENES.length - 1)]
      seek(target.start)
    },
    [seek],
  )

  const scrubTo = useCallback(
    (clientX: number, element: HTMLElement) => {
      const rect = element.getBoundingClientRect()
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
      seek(ratio * (TOTAL_FRAMES - 1))
    },
    [seek],
  )

  const activeChapter = chapterAt(frame)
  const finished = frame >= TOTAL_FRAMES - 1
  const progress = (frame / (TOTAL_FRAMES - 1)) * 100

  return (
    <div className={cx('w-full', className)}>
      <div
        ref={(node) => {
          stageRef.current = node
          inViewRef.current = node
        }}
        className='relative aspect-video w-full overflow-hidden rounded-2xl border border-moss/15 bg-ink-950 shadow-[0_30px_90px_-46px_rgba(125,240,192,0.5)]'
      >
        <GrowthFilm frame={frame} width={box.width} height={box.height} />
        <div className='pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/5' />
        {finished ? (
          <button
            type='button'
            onClick={replay}
            className='absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-ink-950/75 px-4 py-3 text-sm text-paper backdrop-blur-sm transition-colors hover:bg-ink-950/90'
          >
            <span aria-hidden='true'>↺</span> 再看一遍这棵树
          </button>
        ) : null}
      </div>

      <div className='mt-4'>
        <div
          role='slider'
          tabIndex={0}
          aria-label='影片进度'
          aria-valuemin={0}
          aria-valuemax={TOTAL_FRAMES}
          aria-valuenow={Math.round(frame)}
          aria-valuetext={clock(frame / FPS) + '，' + (SCENES.find((scene) => scene.id === activeChapter)?.title ?? '')}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') seek(frameRef.current + FPS)
            else if (event.key === 'ArrowLeft') seek(frameRef.current - FPS)
            else if (event.key === 'Home') seek(0)
            else if (event.key === 'End') seek(TOTAL_FRAMES - 1)
            else return
            event.preventDefault()
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            scrubTo(event.clientX, event.currentTarget)
          }}
          onPointerMove={(event) => {
            if (event.buttons !== 1) return
            scrubTo(event.clientX, event.currentTarget)
          }}
          className='group relative flex h-8 cursor-pointer touch-none items-center'
        >
          <div className='relative h-[3px] w-full overflow-hidden rounded-full bg-moss/15'>
            <div className='absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-shoot/60 to-shoot' style={{ width: progress + '%' }} />
          </div>
          <div className='pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full border border-shoot bg-ink-950' style={{ left: progress + '%' }} />
        </div>

        <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2'>
          <div className='flex items-center gap-2'>
            <button type='button' onClick={toggle} aria-label={playing ? '暂停影片' : '播放影片'} className='flex h-9 w-9 items-center justify-center rounded-full border border-moss/25 text-paper transition-colors hover:border-shoot/70 hover:text-shoot'>
              {playing ? (
                <span className='flex gap-[3px]' aria-hidden='true'>
                  <span className='h-3.5 w-[3px] rounded-full bg-current' />
                  <span className='h-3.5 w-[3px] rounded-full bg-current' />
                </span>
              ) : (
                <span className='ml-0.5 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-current' aria-hidden='true' />
              )}
            </button>
            <button type='button' onClick={replay} className='rounded-full border border-moss/25 px-3 py-1.5 text-[13px] text-muted transition-colors hover:border-paper/50 hover:text-paper'>
              重播
            </button>
            <button type='button' onClick={() => stepScene(-1)} aria-label='上一章' className='rounded-full border border-moss/20 px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:text-paper'>
              ‹
            </button>
            <button type='button' onClick={() => stepScene(1)} aria-label='下一章' className='rounded-full border border-moss/20 px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:text-paper'>
              ›
            </button>
            <span className='ml-1 font-mono text-xs tabular-nums text-faint'>
              {clock(frame / FPS)} / {clock(TOTAL_FRAMES / FPS)}
            </span>
          </div>
          <button type='button' onClick={() => stageRef.current?.requestFullscreen?.()} className='rounded-full border border-moss/20 px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-paper'>
            全屏观看
          </button>
        </div>
      </div>

      <ol className='mt-4 flex flex-wrap gap-2'>
        {SCENES.map((scene, index) => {
          const active = scene.id === activeChapter
          return (
            <li key={scene.id}>
              <button
                type='button'
                onClick={() => seek(scene.start)}
                aria-current={active ? 'true' : undefined}
                className={cx(
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-200',
                  active ? 'border-shoot/50 bg-shoot/10 text-shoot' : 'border-moss/15 text-muted hover:border-paper/40 hover:text-paper',
                )}
              >
                <span className='font-mono text-[10px] text-faint'>{String(index + 1).padStart(2, '0')}</span>
                {scene.title}
                <span className='font-mono text-[10px] text-faint'>{clock(scene.start / FPS)}</span>
              </button>
            </li>
          )
        })}
      </ol>

      {reducedMotion ? (
        <p className='mt-3 text-xs leading-relaxed text-muted'>系统开启了「减少动态效果」，影片停在第一帧。可以拖动进度条逐章查看，画面上的文字与公式一样完整。</p>
      ) : null}
      <p className='mt-3 text-xs leading-relaxed text-muted sm:hidden'>影片是 16:9 的宽银幕画面。横过手机，或者点「全屏观看」，字幕会更清楚。</p>
    </div>
  )
}

export default FilmPlayer
