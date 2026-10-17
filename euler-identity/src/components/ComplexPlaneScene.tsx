import { useEffect, useMemo, type ReactNode } from 'react'
import { animate, motion, motionValue, useTransform, type MotionValue } from 'motion/react'
import { GhostButton, PlaybackBar, PlayButton } from './ui'
import { DashArc } from './DashPath'
import { Formula } from './Math'
import { useSequence } from '../hooks/useSequence'
import { useInView } from '../hooks/useInView'
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference'
import { HALF_PI, PI, TAU, fullCirclePath } from '../lib/math'

const STEPS = [
  { id: 'line', duration: 1800 },
  { id: 'to-one', duration: 1000 },
  { id: 'vertical', duration: 1300 },
  { id: 'circle', duration: 1200 },
  { id: 'first-turn', duration: 1500 },
  { id: 'second-turn', duration: 1600 },
  { id: 'result', duration: 2400 },
]

const STEP_THETA = [0, 0, 0, 0, HALF_PI, PI, PI]

const CAPTIONS = [
  '先只有一条数轴：数字沿着一条线排队，向右是正，向左是负。',
  '在实轴上，正方向的那个数字是 1。',
  '现在，让 i 登场：数字世界多出第二个方向——垂直轴从原点长出来。',
  '水平轴与垂直轴合在一起，就是复平面：复数 a + bi 表示「实方向走 a，虚方向走 b」。',
  '把 1 乘以 i：点逆时针转 90°，从 1 走到 i。',
  '再乘以一次 i：又转 90°，点从 i 走到 -1。',
  '连转两次，正好走到相反方向——这就是 i² = -1。',
]

/** 场景 03 · 认识 i：数轴展开成复平面 */
export function ComplexPlaneScene() {
  const reducedMotion = useReducedMotionPreference()
  const sequence = useSequence(STEPS, { autoPlay: false, staticMode: reducedMotion })
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 })

  useEffect(() => {
    if (inView && !reducedMotion) sequence.play()
  }, [inView, reducedMotion, sequence.play])
  const index = sequence.index
  const theta = useMemo(() => motionValue(0), [])

  useEffect(() => {
    if (reducedMotion) return
    const target = STEP_THETA[index] ?? 0
    const duration = index === 4 || index === 5 ? 1.1 : 0.6
    const controls = animate(theta, target, { duration, ease: [0.32, 0.72, 0.24, 1] })
    return () => controls.stop()
  }, [index, reducedMotion, theta])

  const hasPlane = index >= 2
  const hasCircle = index >= 3

  return (
    <div ref={ref} className='grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center'>
      <div className='[perspective:1400px]'>
        <motion.div
          animate={{ rotateY: hasPlane ? 0 : 62, opacity: hasPlane ? 1 : 0.55 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <svg
            viewBox='-180 -180 360 360'
            className='mx-auto w-full max-w-[520px]'
            role='img'
            aria-label='水平数轴上长出一条垂直轴，成为复平面；点乘以 i 两次后从 1 走到 -1'
          >
            <defs>
              <marker id='cp-axis-arrow' viewBox='0 0 10 10' refX='6' refY='5' markerWidth='4' markerHeight='4' orient='auto-start-reverse'>
                <path d='M 0 1.5 L 8 5 L 0 8.5 z' fill='#8ea4bf' />
              </marker>
              <marker id='cp-vector-arrow' viewBox='0 0 10 10' refX='6' refY='5' markerWidth='4.5' markerHeight='4.5' orient='auto-start-reverse'>
                <path d='M 0 1.2 L 9 5 L 0 8.8 z' fill='#4fe3c1' />
              </marker>
            </defs>

            {/* 水平数轴 */}
            <line
              x1='-150'
              y1='0'
              x2='150'
              y2='0'
              stroke='#4fe3c1'
              strokeOpacity='0.5'
              strokeWidth='1.2'
              markerEnd='url(#cp-axis-arrow)'
            />
            <g fontSize='13' fill='#8ea4bf' fontFamily='ui-sans-serif, system-ui'>
              <text x='104' y='-10' textAnchor='middle' fill='#4fe3c1'>1</text>
              <text x='-104' y='-10' textAnchor='middle'>-1</text>
              <text x='0' y='20' textAnchor='middle' fillOpacity='0.7'>0</text>
              <text x='150' y='-10' textAnchor='end' fillOpacity='0.6'>实轴</text>
            </g>

            {/* 垂直轴：从原点长出来 */}
            <motion.line
              x1='0'
              y1='140'
              x2='0'
              y2={hasPlane ? -150 : 140}
              stroke='#b9a6ff'
              strokeOpacity='0.55'
              strokeWidth='1.2'
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: hasPlane ? 1 : 0 }}
              transition={{ duration: 0.6 }}
            />
            <motion.g
              initial={reducedMotion ? false : { opacity: 0, scale: 0.4 }}
              animate={{ opacity: hasPlane ? 1 : 0, scale: hasPlane ? 1 : 0.4 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              style={{ transformOrigin: '0px 0px' }}
            >
              <text x='-8' y='-104' textAnchor='end' fontSize='13' fill='#b9a6ff' fontFamily='ui-sans-serif, system-ui'>
                i
              </text>
              <text x='-8' y='112' textAnchor='end' fontSize='13' fill='#b9a6ff' fontFamily='ui-sans-serif, system-ui'>
                -i
              </text>
              <text x='10' y='-150' fontSize='11' fill='#8ea4bf' fillOpacity='0.65' fontFamily='ui-sans-serif, system-ui'>
                虚轴
              </text>
            </motion.g>

            {/* 网格与单位圆 */}
            <motion.g
              initial={reducedMotion ? false : { opacity: 0, scale: 0.82 }}
              animate={{ opacity: hasCircle ? 1 : 0, scale: hasCircle ? 1 : 0.82 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: '0px 0px' }}
            >
              <g stroke='#8ea4bf' strokeOpacity='0.1' strokeWidth='1'>
                <line x1='-100' y1='-50' x2='100' y2='-50' />
                <line x1='-100' y1='50' x2='100' y2='50' />
                <line x1='-50' y1='-100' x2='-50' y2='100' />
                <line x1='50' y1='-100' x2='50' y2='100' />
              </g>
              <circle cx='0' cy='0' r='100' fill='none' stroke='#8ea4bf' strokeOpacity='0.35' strokeWidth='1.2' />
              <circle cx='0' cy='0' r='100' fill='#4fe3c1' fillOpacity='0.03' />
            </motion.g>

            {/* 旋转中的点 */}
            {index >= 1 ? <RotatingPoint theta={theta} showVector={hasCircle} showArc={index >= 4} /> : null}
          </svg>
        </motion.div>
      </div>

      <div className='flex flex-col gap-5'>
        <p className='min-h-[4.5rem] text-[15px] leading-relaxed text-paper'>{CAPTIONS[index]}</p>

        <div className='flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-muted/12 bg-ink-950/40 px-4 py-3'>
          {index < 4 ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='text-center text-sm text-muted'>
              接下来，让点连乘两次 i，看看它会走到哪里。
            </motion.p>
          ) : null}
          <Reveal show={index >= 4}>
            <Formula tex='1 \\times i = i' className='text-base text-imag' label='1 乘以 i 等于 i' />
          </Reveal>
          <Reveal show={index >= 5}>
            <Formula tex='i \\times i = -1' className='text-base text-imag' label='i 乘以 i 等于负 1' />
          </Reveal>
          <Reveal show={index >= 6}>
            <Formula tex='i^{2} = -1' className='text-xl text-paper' label='i 的平方等于负 1' />
          </Reveal>
        </div>

        <p className='text-xs leading-relaxed text-muted'>
          这是一个便于理解的模型：<span className='text-imag'>乘以 i 就是在复平面上转 90°</span>
          （一般情况下复数相乘还会改变长度，这里只讲乘以 i 的特殊情况）。
        </p>

        <PlaybackBar>
          <PlayButton playing={sequence.playing} onClick={sequence.toggle} />
          <GhostButton onClick={sequence.replay}>重播</GhostButton>
        </PlaybackBar>
      </div>
    </div>
  )
}

function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: show ? 1 : 0 }}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : 6 }}
      transition={{ duration: 0.5 }}
      className='text-center'
    >
      {children}
    </motion.div>
  )
}

function RotatingPoint({ theta, showVector, showArc }: { theta: MotionValue<number>; showVector: boolean; showArc: boolean }) {
  const px = useTransform(theta, (v) => 100 * Math.cos(v))
  const py = useTransform(theta, (v) => -100 * Math.sin(v))
  const sweepFrac = useTransform(theta, (v) => Math.min(v, TAU) / TAU)

  return (
    <g>
      {showArc ? (
        <DashArc
          d={fullCirclePath(0, 0, 32)}
          fill='none'
          stroke='#f2b134'
          strokeWidth='2'
          length={sweepFrac}
        />
      ) : null}
      {showVector ? (
        <motion.line
          x1='0'
          y1='0'
          x2={px}
          y2={py}
          stroke='#4fe3c1'
          strokeWidth='2.4'
          className='hairline glow-vector'
          markerEnd='url(#cp-vector-arrow)'
        />
      ) : null}
      <motion.circle cx={px} cy={py} r='12' fill='#4fe3c1' fillOpacity='0.14' />
      <motion.circle cx={px} cy={py} r='5.5' fill='#4fe3c1' className='glow-vector' />
    </g>
  )
}

export default ComplexPlaneScene
