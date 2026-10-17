import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { UnitCircle } from './UnitCircle'
import { GhostButton, PlaybackBar, PlayButton, cx } from './ui'
import { Formula } from './Math'
import { usePhaseTimeline, type Phase } from '../hooks/usePhaseTimeline'
import { useInView } from '../hooks/useInView'
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference'
import { PI } from '../lib/math'

const PHASES: Phase[] = [
  { id: 'minus', duration: 1.6, from: PI, to: PI },
  { id: 'plus', duration: 1.5, from: PI, to: PI },
  { id: 'equal', duration: 2, from: PI, to: PI },
  { id: 'converge', duration: 2, from: PI, to: PI },
  { id: 'meet', duration: 1.5, from: PI, to: PI },
  { id: 'formula-one', duration: 1.9, from: PI, to: PI },
  { id: 'formula-two', duration: 1.9, from: PI, to: PI },
  { id: 'formula-zero', duration: 2.1, from: PI, to: PI },
  { id: 'return', duration: 2.4, from: PI, to: PI },
]

const CAPTIONS = [
  '先把前面得到的 -1 放到数轴上：它落在实轴的正方向反面。',
  '再放上 +1：恒等式里要加上的那个 1。',
  '它们离原点一样远，方向却正好相反：长度相同、符号相反。',
  '让它们相向移动。',
  '在原点相遇，互相抵消。',
  '把这件事写回式子：e 的 i 次方 π，再加 1。',
  'e 的 i 次方 π 是 -1，于是这一式子变成 -1 + 1。',
  '结果落在原点——0。',
  '把它整理成完整的样子。',
]

const FORMULA = [
  { id: 'a', tex: 'e^{i\\pi} + 1', tone: 'text-paper' },
  { id: 'b', tex: '= -1 + 1', tone: 'text-muted' },
  { id: 'c', tex: '= 0', tone: 'text-result' },
]

const ORIGIN_X = 300
const LEFT_X = 130
const RIGHT_X = 470
const BEAM_Y = 108

/** 场景 06 · 最终高潮：为什么最后是 0 */
export function CancellationScene() {
  const reducedMotion = useReducedMotionPreference()
  const timeline = usePhaseTimeline(PHASES, { reducedMotion, autoplay: false })
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 })

  useEffect(() => {
    if (inView && !reducedMotion) timeline.play()
  }, [inView, reducedMotion, timeline.play])

  const index = timeline.phaseIndex
  const showMinus = index >= 0
  const showPlus = index >= 1
  const showEquality = index >= 2
  const converging = index >= 3
  const met = index >= 4
  const zeroVisible = index >= 4
  const glow = index >= 4 && index <= 5
  const formulaCount = index >= 5 ? Math.min(index - 4, FORMULA.length) : 0
  const showCircle = index >= 8

  const minusX = showMinus ? (converging ? ORIGIN_X : LEFT_X) : LEFT_X
  const plusX = showPlus ? (converging ? ORIGIN_X : RIGHT_X) : RIGHT_X

  return (
    <div ref={ref} className='grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center'>
      <div className='relative'>
        {/* 单位圆在最后重新浮现，呼应前面半圈的结论 */}
        <motion.div
          className='pointer-events-none absolute left-1/2 top-1/2 -z-0 aspect-square w-[min(86%,420px)] -translate-x-1/2 -translate-y-1/2'
          initial={{ opacity: 0, scale: 0.86 }}
          animate={{ opacity: showCircle ? 0.5 : 0, scale: showCircle ? 1 : 0.86 }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <UnitCircle theta={timeline.theta} showSweep={false} showProjections={false} showAngleText={false} className='h-full w-full' />
        </motion.div>

        <svg viewBox='0 0 600 300' className='relative w-full' role='img' aria-label='数轴上 -1 与 +1 相向移动，在原点抵消成 0'>
          <defs>
            <radialGradient id='cancel-glow' cx='50%' cy='50%' r='50%'>
              <stop offset='0%' stopColor='#eafff8' stopOpacity='0.55' />
              <stop offset='100%' stopColor='#eafff8' stopOpacity='0' />
            </radialGradient>
          </defs>

          {/* 数轴 */}
          <line x1='46' y1={BEAM_Y} x2='554' y2={BEAM_Y} stroke='#8ea4bf' strokeOpacity='0.35' strokeWidth='1.2' />
          {[LEFT_X, ORIGIN_X, RIGHT_X].map((x) => (
            <line key={x} x1={x} y1={BEAM_Y - 9} x2={x} y2={BEAM_Y + 9} stroke='#8ea4bf' strokeOpacity='0.5' strokeWidth='1' />
          ))}
          <g fontSize='13' fill='#8ea4bf' fontFamily='ui-sans-serif, system-ui'>
            <text x={ORIGIN_X} y={BEAM_Y + 30} textAnchor='middle' fillOpacity='0.8'>
              0
            </text>
          </g>

          {/* 相遇时的柔和能量汇聚 */}
          <motion.circle
            cx={ORIGIN_X}
            cy={BEAM_Y}
            r='86'
            fill='url(#cancel-glow)'
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: glow ? 1 : 0, scale: glow ? 1 : 0.7 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: ORIGIN_X + 'px ' + BEAM_Y + 'px' }}
          />

          {/* -1 与 +1 两条相向的光线 */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: showMinus ? (converging ? 0.4 : 1) : 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.g initial={{ x: LEFT_X }} animate={{ x: minusX }} transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}>
              <line x1='0' y1={BEAM_Y} x2='62' y2={BEAM_Y} stroke='#4fe3c1' strokeWidth='3' className='hairline glow-vector' />
              <circle cx='0' cy={BEAM_Y} r='6' fill='#4fe3c1' className='glow-vector' />
              <motion.text
                x='0'
                y={BEAM_Y - 26}
                textAnchor='middle'
                fontSize='26'
                fill='#4fe3c1'
                fontFamily='ui-serif, serif'
                initial={{ opacity: 1 }}
                animate={{ opacity: converging ? 0 : 1 }}
                transition={{ duration: 0.5 }}
              >
                -1
              </motion.text>
            </motion.g>
          </motion.g>

          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: showPlus ? (converging ? 0.4 : 1) : 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.g initial={{ x: RIGHT_X }} animate={{ x: plusX }} transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}>
              <line x1='-62' y1={BEAM_Y} x2='0' y2={BEAM_Y} stroke='#b9a6ff' strokeWidth='3' className='hairline glow-imag' />
              <circle cx='0' cy={BEAM_Y} r='6' fill='#b9a6ff' className='glow-imag' />
              <motion.text
                x='0'
                y={BEAM_Y - 26}
                textAnchor='middle'
                fontSize='26'
                fill='#b9a6ff'
                fontFamily='ui-serif, serif'
                initial={{ opacity: 1 }}
                animate={{ opacity: converging ? 0 : 1 }}
                transition={{ duration: 0.5 }}
              >
                +1
              </motion.text>
            </motion.g>
          </motion.g>

          {/* 长度相同、方向相反 */}
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: showEquality && !met ? 1 : 0 }} transition={{ duration: 0.7 }}>
            <path
              d={'M ' + (LEFT_X + 31) + ' ' + (BEAM_Y - 34) + ' L ' + (RIGHT_X - 31) + ' ' + (BEAM_Y - 34)}
              stroke='#8ea4bf'
              strokeOpacity='0.4'
              strokeWidth='1'
              strokeDasharray='3 5'
            />
            <text x={ORIGIN_X} y={BEAM_Y - 42} textAnchor='middle' fontSize='12' fill='#8ea4bf' fontFamily='ui-sans-serif, system-ui'>
              大小相同 · 方向相反
            </text>
          </motion.g>

          {/* 原点上的 0 */}
          <motion.line
            x1={ORIGIN_X}
            y1={BEAM_Y}
            x2={ORIGIN_X}
            y2={BEAM_Y - 42}
            stroke='#eafff8'
            strokeOpacity='0.35'
            strokeWidth='1'
            initial={{ opacity: 0 }}
            animate={{ opacity: met ? 1 : 0 }}
            transition={{ duration: 0.6 }}
          />
          <motion.text
            x={ORIGIN_X}
            y={BEAM_Y - 50}
            textAnchor='middle'
            fontSize='56'
            fill='#eafff8'
            fontFamily='ui-serif, serif'
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: zeroVisible ? 1 : 0, scale: zeroVisible ? 1 : 0.6 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: ORIGIN_X + 'px ' + (BEAM_Y - 30) + 'px' }}
          >
            0
          </motion.text>
        </svg>
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

        <div className='flex min-h-[9rem] flex-col items-center justify-center gap-2 rounded-xl border border-muted/12 bg-ink-950/40 px-4 py-4'>
          {FORMULA.map((line, i) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: i < formulaCount ? 1 : 0, y: i < formulaCount ? 0 : 8 }}
              transition={{ duration: reducedMotion ? 0 : 0.5 }}
              className={cx('text-center text-xl sm:text-2xl', line.tone)}
            >
              {i < formulaCount ? (
                <Formula tex={line.tex} label={line.tex} />
              ) : (
                <span className='opacity-40 text-muted'>· · ·</span>
              )}
            </motion.div>
          ))}
          {formulaCount >= 3 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showCircle ? 1 : 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.8 }}
              className='mt-2 text-center'
            >
              <Formula tex='e^{i\\pi} + 1 = 0' className='text-[clamp(1.4rem,5vw,2.2rem)] text-result breathe' label='欧拉恒等式' />
            </motion.div>
          ) : null}
        </div>

        <PlaybackBar>
          <PlayButton
            playing={timeline.playing}
            onClick={timeline.toggle}
            disabled={timeline.finished}
            playLabel='播放'
            pauseLabel='暂停'
          />
          <GhostButton onClick={timeline.replay}>重播</GhostButton>
          <GhostButton onClick={timeline.next}>下一步</GhostButton>
        </PlaybackBar>

        <div className='h-[3px] w-full overflow-hidden rounded-full bg-muted/15' aria-hidden='true'>
          <motion.div className='h-full bg-gradient-to-r from-vector via-result to-imag' style={{ scaleX: timeline.progress }} />
        </div>
      </div>
    </div>
  )
}

export default CancellationScene
