import { useState } from 'react'
import { motion } from 'motion/react'
import { Formula } from './Math'
import { FIVE_CONSTANTS, type ColorToken } from '../content'
import { seekFilm } from '../story/playerBus'
import { FPS, SCENES } from '../story/timeline'
import { cx } from './ui'
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference'

const TONE: Record<ColorToken, { text: string; border: string }> = {
  vector: { text: 'text-vector', border: 'border-vector/40' },
  imag: { text: 'text-imag', border: 'border-imag/40' },
  node: { text: 'text-node', border: 'border-node/40' },
  paper: { text: 'text-result', border: 'border-paper/30' },
}

const RECAP = SCENES.find((scene) => scene.id === 'recap')

/**
 * 五个常数：不是卡片墙，而是一条可点选的胶片。
 * 点一个符号会展开它在影片里做过的那次具体运动；也可以直接跳回影片的收束一场。
 */
export function ConstantsStrip() {
  const [active, setActive] = useState<string | null>(null)
  const reducedMotion = useReducedMotionPreference()
  const selected = FIVE_CONSTANTS.find((item) => item.symbol === active)

  return (
    <div>
      <ul className='grid gap-px overflow-hidden rounded-2xl border border-muted/12 bg-muted/12 sm:grid-cols-2 lg:grid-cols-5'>
        {FIVE_CONSTANTS.map((item) => {
          const tone = TONE[item.color]
          const isActive = active === item.symbol
          return (
            <li key={item.symbol} className='bg-ink-950/85'>
              <button
                type='button'
                aria-pressed={isActive}
                onClick={() => setActive(isActive ? null : item.symbol)}
                className={cx(
                  'flex h-full w-full flex-col items-start gap-2 px-4 py-5 text-left transition-colors duration-300',
                  isActive ? 'bg-ink-900' : 'hover:bg-ink-900/70',
                )}
              >
                <Formula
                  tex={item.tex}
                  label={item.name}
                  className={cx('text-3xl leading-none transition-colors', isActive ? tone.text : 'text-paper/85')}
                />
                <span className='text-[11px] uppercase tracking-[0.22em] text-faint'>{item.name}</span>
                <span className='text-[13px] leading-relaxed text-muted'>{item.summary}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className='mt-6 min-h-[5.5rem] border-l border-muted/15 pl-5'>
        {selected ? (
          <motion.div
            key={selected.symbol}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className={cx('text-[15px] leading-relaxed', TONE[selected.color].text)}>{selected.role}</p>
            <p className='mt-1.5 text-[15px] leading-relaxed text-muted'>{selected.detail}</p>
          </motion.div>
        ) : (
          <p className='text-[15px] leading-relaxed text-muted'>
            点一个符号，看看它在整部影片里做过哪一次具体的运动。
          </p>
        )}
      </div>

      {RECAP ? (
        <button
          type='button'
          onClick={() => {
            seekFilm(RECAP.start)
            document.getElementById('film')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          className={cx(
            'mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] transition-colors duration-300',
            TONE.paper.border,
            'text-muted hover:text-paper',
          )}
        >
          <span aria-hidden='true'>↺</span> 回到影片 {Math.round(RECAP.start / FPS)} 秒，看它们重新合体
        </button>
      ) : null}
    </div>
  )
}

export default ConstantsStrip
