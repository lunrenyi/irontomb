import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { GhostButton, PlaybackBar, cx } from './ui'
import { Formula } from './Math'
import { FIVE_CONSTANTS, type ColorToken } from '../content'
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference'

const TONE_TEXT: Record<ColorToken, string> = {
  vector: 'text-vector',
  imag: 'text-imag',
  node: 'text-node',
  paper: 'text-paper',
}

const TONE_RING: Record<ColorToken, string> = {
  vector: 'border-vector/60 shadow-[0_0_26px_rgba(79,227,193,0.28)]',
  imag: 'border-imag/60 shadow-[0_0_26px_rgba(185,166,255,0.28)]',
  node: 'border-node/60 shadow-[0_0_26px_rgba(242,177,52,0.26)]',
  paper: 'border-paper/50 shadow-[0_0_26px_rgba(242,239,232,0.18)]',
}

/** 场景 07 · 五个常数重新登场 */
export function ConstantsScene() {
  const reducedMotion = useReducedMotionPreference()
  const [active, setActive] = useState(0)
  const [touring, setTouring] = useState(!reducedMotion)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!touring) return
    timerRef.current = window.setTimeout(() => {
      setActive((current) => {
        if (current + 1 >= FIVE_CONSTANTS.length) {
          setTouring(false)
          return current
        }
        return current + 1
      })
    }, 1500)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [touring, active])

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const current = FIVE_CONSTANTS[active]

  return (
    <div className='flex flex-col items-center gap-10'>
      <div className='relative w-full max-w-[720px]'>
        <svg viewBox='0 0 700 120' className='absolute inset-x-0 top-1/2 h-24 w-full -translate-y-1/2' aria-hidden='true'>
          <motion.path
            d='M 40 70 Q 350 -10 660 70'
            fill='none'
            stroke='#8ea4bf'
            strokeOpacity='0.22'
            strokeWidth='1'
            initial={reducedMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>

        <ul className='relative grid grid-cols-5 gap-2'>
          {FIVE_CONSTANTS.map((item, index) => {
            const isActive = index === active
            return (
              <li key={item.symbol} className='flex flex-col items-center gap-3'>
                <motion.button
                  type='button'
                  onClick={() => {
                    setTouring(false)
                    setActive(index)
                  }}
                  aria-pressed={isActive}
                  aria-label={item.name + '：' + item.summary}
                  className={cx(
                    'flex h-14 w-14 items-center justify-center rounded-full border bg-ink-950/70 transition-all duration-300 sm:h-16 sm:w-16',
                    isActive ? TONE_RING[item.color] : 'border-muted/20 hover:border-muted/50',
                  )}
                  animate={{ scale: isActive ? 1.08 : 1 }}
                  whileTap={{ scale: 0.94 }}
                >
                  <Formula tex={item.tex} className={cx('text-2xl sm:text-3xl', TONE_TEXT[item.color])} label={item.symbol} />
                </motion.button>
                <span className={cx('text-center text-[10px] transition-colors sm:text-[11px]', isActive ? 'text-paper' : 'text-faint')}>
                  {item.name}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <AnimatePresence mode='wait'>
        <motion.div
          key={current.symbol}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35 }}
          className='max-w-[52ch] text-center'
        >
          <p className='font-display text-xl text-paper'>{current.name}</p>
          <p className='mt-2 text-[15px] leading-relaxed text-muted'>{current.detail}</p>
        </motion.div>
      </AnimatePresence>

      <div className='flex flex-col items-center gap-5'>
        <Formula           tex='e^{i\\pi} + 1 = 0'
          display
          className='text-[clamp(1.4rem,4.5vw,2.4rem)] text-paper breathe'
          label='欧拉恒等式：e 的 i 次方 π 加 1 等于 0'
        />
        <p className='max-w-[46ch] text-center text-sm leading-relaxed text-muted'>
          现在这五个符号你应该都认识了：它们各自来自不同的问题，却在这个式子里精确地咬合在一起。
        </p>

        <PlaybackBar>
          <GhostButton
            onClick={() => {
              setActive(0)
              setTouring(true)
            }}
          >
            逐个点亮
          </GhostButton>
        </PlaybackBar>
      </div>
    </div>
  )
}

export default ConstantsScene
