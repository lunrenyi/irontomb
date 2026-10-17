import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { UnitCircle } from './UnitCircle'
import { ChipButton, GhostButton, PlaybackBar, PlayButton, cx } from './ui'
import { Formula } from './Math'
import { usePhaseTimeline, type Phase } from '../hooks/usePhaseTimeline'
import { useInView } from '../hooks/useInView'
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference'
import { PI } from '../lib/math'

const PHASES: Phase[] = [
  { id: 'start', duration: 1.5, from: 0, to: 0 },
  { id: 'quarter', duration: 1.5, from: 0, to: PI / 2, ease: 'inOut' },
  { id: 'quarter-hold', duration: 1.4, from: PI / 2, to: PI / 2 },
  { id: 'to-pi', duration: 1.7, from: PI / 2, to: PI, ease: 'inOut' },
  { id: 'pi-hold', duration: 1.7, from: PI, to: PI },
  { id: 'below', duration: 1.7, from: PI, to: (3 * PI) / 2, ease: 'inOut' },
  { id: 'back', duration: 1.5, from: (3 * PI) / 2, to: PI, ease: 'inOut' },
  { id: 'settle', duration: 1.1, from: PI, to: PI },
  { id: 'reveal-cos', duration: 1.8, from: PI, to: PI },
  { id: 'reveal-sin', duration: 1.8, from: PI, to: PI },
  { id: 'substitute', duration: 2.1, from: PI, to: PI },
  { id: 'simplify-a', duration: 2, from: PI, to: PI },
  { id: 'simplify-b', duration: 2.4, from: PI, to: PI },
]

const CAPTIONS = [
  '从 θ = 0 开始。点在单位圆最右侧，坐标 (1, 0)：cos 0 = 1，sin 0 = 0。',
  '先转四分之一圈。点升到正上方：横坐标归零，纵坐标达到 1。',
  'θ = π/2。cos(π/2) = 0，sin(π/2) = 1。',
  '继续转。点在走向正面的反面，横坐标从 0 变成负数，纵坐标从 1 回到 0。',
  'θ = π。半圈走完：实部是 -1，虚部是 0。',
  '再多看一段：转过四分之三圈时 sin 变成 -1，竖直方向落到了实轴下方。',
  '回到半圈。π 这个位置，正是我们要停下来细看的地方。',
  '定格在 θ = π。',
  '先看实部：cos π = -1。',
  '再看虚部：sin π = 0。',
  '把它们代回欧拉公式：e 的 i 次方 θ = cos θ + i sin θ。',
  '把 cos π 与 sin π 的值换进去。',
  'i 乘以 0 什么也不是，于是只剩 -1：e 的 i 次方 π 等于 -1。',
]

const FORMULA_STEPS = [
  { id: 'cos', tex: '\\cos\\pi = -1', tone: 'text-vector' },
  { id: 'sin', tex: '\\sin\\pi = 0', tone: 'text-imag' },
  { id: 'euler', tex: 'e^{i\\pi} = \\cos\\pi + i\\sin\\pi', tone: 'text-paper' },
  { id: 'sub', tex: 'e^{i\\pi} = -1 + i \\times 0', tone: 'text-paper' },
  { id: 'res', tex: 'e^{i\\pi} = -1', tone: 'text-vector' },
]

const PHASE_CHIPS = [
  { label: '0', index: 0 },
  { label: 'π/2', index: 1 },
  { label: 'π', index: 4 },
  { label: '3π/2', index: 5 },
  { label: '化简', index: 8 },
]

/** 场景 05 · 特殊角度：走到 π，并把公式一步步化简出来 */
export function SpecialAngleScene() {
  const reducedMotion = useReducedMotionPreference()
  const timeline = usePhaseTimeline(PHASES, { reducedMotion, autoplay: false })
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 })

  useEffect(() => {
    if (inView && !reducedMotion) timeline.play()
  }, [inView, reducedMotion, timeline.play])

  const index = timeline.phaseIndex
  const settled = reducedMotion || (index >= 4 && index <= 7)
  const revealCount = Math.max(0, Math.min(index - 7, FORMULA_STEPS.length))

  return (
    <div ref={ref} className='grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start'>
      <div className='relative'>
        <div className='relative mx-auto aspect-square w-full max-w-[min(92vw,480px)]'>
          <UnitCircle theta={timeline.theta} showSweep showProjections={settled} showAngleText className='h-full w-full' />

          {/* 半圈被完整点亮的瞬间 */}
          <svg viewBox='-160 -160 320 320' className='pointer-events-none absolute inset-0 h-full w-full' aria-hidden='true'>
            <motion.path
              d='M -100 0 A 100 100 0 0 1 100 0'
              fill='none'
              stroke='#f2efe8'
              strokeWidth='1.3'
              strokeOpacity='0.5'
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: index >= 3 && index <= 6 ? 1 : 0, opacity: index >= 3 && index <= 6 ? 0.55 : 0 }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
        </div>

        {settled ? (
          <div className='mt-4 grid grid-cols-3 gap-3 text-center'>
            <KeyValue label='角度' value='θ = π' tone='text-node' />
            <KeyValue label='实部' value='-1' tone='text-vector' />
            <KeyValue label='虚部' value='0' tone='text-imag' />
          </div>
        ) : null}
      </div>

      <div className='flex flex-col gap-5'>
        <AnimatePresence mode='wait'>
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className='min-h-[4.6rem] text-[15px] leading-relaxed text-paper'
          >
            {CAPTIONS[index] ?? CAPTIONS[CAPTIONS.length - 1]}
          </motion.p>
        </AnimatePresence>

        <div className='flex min-h-[11rem] flex-col items-center justify-center gap-2 rounded-xl border border-muted/12 bg-ink-950/40 px-4 py-4'>
          {FORMULA_STEPS.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: i < revealCount ? 1 : 0, y: i < revealCount ? 0 : 8 }}
              transition={{ duration: reducedMotion ? 0 : 0.5 }}
              className={cx('text-center text-[17px] sm:text-xl', step.tone, i === FORMULA_STEPS.length - 1 ? 'mt-1 text-2xl' : '')}
            >
              {i < revealCount ? <Formula tex={step.tex} label={step.tex} /> : <span className='opacity-40 text-muted'>· · ·</span>}
            </motion.div>
          ))}
        </div>

        <div className='flex flex-wrap gap-2'>
          {PHASE_CHIPS.map((chip) => (
            <ChipButton
              key={chip.label}
              tone='node'
              active={index === chip.index}
              onClick={() => timeline.jumpAndHold(chip.index)}
            >
              {chip.label}
            </ChipButton>
          ))}
        </div>

        <PlaybackBar>
          <PlayButton
            playing={timeline.playing}
            playLabel='播放'
            pauseLabel='暂停'
            onClick={timeline.toggle}
            disabled={timeline.finished}
          />
          <GhostButton onClick={timeline.replay}>重播</GhostButton>
          <GhostButton onClick={timeline.prev}>上一步</GhostButton>
          <GhostButton onClick={timeline.next}>下一步</GhostButton>
        </PlaybackBar>

        <div className='h-[3px] w-full overflow-hidden rounded-full bg-muted/15' aria-hidden='true'>
          <motion.div className='h-full bg-gradient-to-r from-vector to-imag' style={{ scaleX: timeline.progress }} />
        </div>
      </div>
    </div>
  )
}

function KeyValue({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className='rounded-xl border border-muted/12 bg-ink-950/50 px-3 py-3'>
      <div className='text-[11px] text-muted'>{label}</div>
      <div className={cx('mt-1 font-display text-lg', tone)}>{value}</div>
    </div>
  )
}

export default SpecialAngleScene
