import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, type MotionProps } from 'motion/react'
import { Formula } from './Math'
import { GhostButton } from './ui'
import { HERO_QUESTION } from '../content'
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference'

const EASE_OUT = [0.16, 1, 0.3, 1] as const
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const
const HERO_TEX = 'e^{i\\pi} + 1 = 0'

/**
 * 场景 01 · 神秘开场
 * 起：远处一点光进入画面 → 承：几何线条被光「画」出来
 * 转：e / i / π / 1 / 0 用各自不同的方式登场 → 合：组成公式、几何短暂点亮后安静下来
 */
export function HeroScene() {
  const reducedMotion = useReducedMotionPreference()
  const [stage, setStage] = useState<'intro' | 'ready'>('intro')
  const [skipped, setSkipped] = useState(false)
  const [runToken, setRunToken] = useState(0)

  const staticNow = reducedMotion || skipped
  const readyTimer = useRef<number | null>(null)

  useEffect(() => {
    if (staticNow) return
    if (readyTimer.current) window.clearTimeout(readyTimer.current)
    readyTimer.current = window.setTimeout(() => setStage('ready'), 6600)
    return () => {
      if (readyTimer.current) window.clearTimeout(readyTimer.current)
    }
  }, [staticNow, runToken])

  useEffect(() => {
    if (staticNow) setStage('ready')
  }, [staticNow])

  const skip = useCallback(() => {
    setSkipped(true)
    setStage('ready')
  }, [])

  const replay = useCallback(() => {
    setSkipped(false)
    setStage('intro')
    setRunToken((token) => token + 1)
  }, [])

  // 动画中的元素走 motion 关键帧；跳过或减少动态效果时直接给最终状态
  const firstKeyframe = (source: Record<string, any>) =>
    Object.fromEntries(
      Object.entries(source).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
    )
  const lastKeyframe = (source: Record<string, any>) =>
    Object.fromEntries(
      Object.entries(source).map(([key, value]) => [key, Array.isArray(value) ? value[value.length - 1] : value]),
    )

  /**
   * 统一的关键帧入口：传入带数组的关键帧，自动拆成「起始状态 → 关键帧序列」。
   * 减少动态效果或用户跳过时，直接落到最后一帧。
   */
  const anim = (keyframes: Record<string, any>, delay: number, duration: number, ease: readonly number[] = EASE_OUT): MotionProps =>
    staticNow
      ? { initial: false, animate: lastKeyframe(keyframes) }
      : {
          initial: firstKeyframe(keyframes),
          animate: keyframes,
          transition: { delay, duration, ease: ease as never },
        }

  return (
    <section id='hero' className='relative flex min-h-[100svh] items-center px-5 pb-10 pt-24 sm:pb-16 sm:pt-28'>
      <div className='relative mx-auto flex w-full max-w-[1080px] flex-col items-center gap-10'>
        <div key={runToken} className='relative w-full overflow-hidden'>
          {/* 几何背景：开场时由光点画出，结束后降到很低的对比度 */}
          <svg viewBox='0 0 1000 460' className='pointer-events-none absolute inset-0 h-full w-full' aria-hidden='true'>
            <defs>
              <linearGradient id='hero-geom' x1='0' y1='0' x2='1' y2='1'>
                <stop offset='0%' stopColor='#4fe3c1' stopOpacity='0.55' />
                <stop offset='55%' stopColor='#b9a6ff' stopOpacity='0.4' />
                <stop offset='100%' stopColor='#f2b134' stopOpacity='0.35' />
              </linearGradient>
              <radialGradient id='hero-core' cx='50%' cy='50%' r='50%'>
                <stop offset='0%' stopColor='#4fe3c1' stopOpacity='0.45' />
                <stop offset='100%' stopColor='#4fe3c1' stopOpacity='0' />
              </radialGradient>
            </defs>

            <motion.g
              initial={staticNow ? false : { opacity: 0 }}
              animate={{ opacity: staticNow ? 0.14 : [0, 0.55, 0.85, 0.14] }}
              transition={staticNow ? undefined : { delay: 0.7, duration: 5.6, times: [0, 0.22, 0.32, 1], ease: 'easeInOut' }}
              style={{ opacity: staticNow ? 0.14 : undefined }}
            >
              <circle cx='500' cy='230' r='215' fill='url(#hero-core)' />
              <motion.circle
                cx='500'
                cy='230'
                r='186'
                fill='none'
                stroke='url(#hero-geom)'
                strokeWidth='1.1'
                {...anim({ pathLength: [0, 1], opacity: [0, 0.75] }, 0.95, 1.9, EASE_IN_OUT)}
              />
              <motion.circle
                cx='500'
                cy='230'
                r='132'
                fill='none'
                stroke='#8ea4bf'
                strokeOpacity='0.3'
                strokeDasharray='3 9'
                strokeWidth='1'
                {...anim({ pathLength: [0, 1], opacity: [0, 0.6] }, 1.25, 1.7, EASE_IN_OUT)}
              />
              <motion.path
                d='M 314 230 A 186 186 0 0 1 500 44'
                fill='none'
                stroke='#4fe3c1'
                strokeOpacity='0.5'
                strokeWidth='1.4'
                {...anim({ pathLength: [0, 1] }, 1.5, 1.3, EASE_OUT)}
              />
              <motion.path
                d='M 686 230 A 186 186 0 0 1 500 416'
                fill='none'
                stroke='#b9a6ff'
                strokeOpacity='0.45'
                strokeWidth='1.4'
                {...anim({ pathLength: [0, 1] }, 1.75, 1.3, EASE_OUT)}
              />
              <g stroke='#8ea4bf' strokeOpacity='0.18' strokeWidth='1'>
                <line x1='500' y1='30' x2='500' y2='430' />
                <line x1='300' y1='230' x2='700' y2='230' />
              </g>
              <g fill='#8ea4bf' fillOpacity='0.5'>
                <circle cx='500' cy='44' r='2' />
                <circle cx='686' cy='230' r='2' />
                <circle cx='314' cy='230' r='2' />
              </g>
            </motion.g>
          </svg>

          {/* 进入画面的小光点 */}
          <motion.div
            aria-hidden='true'
            className='pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full'
            style={{
              background: 'radial-gradient(circle, rgba(232,255,248,0.95) 0%, rgba(79,227,193,0.3) 40%, rgba(79,227,193,0) 70%)',
            }}
            {...anim(
              {
                opacity: [0, 1, 1, 0],
                x: ['-48vw', '-16vw', '0vw', '2vw'],
                scale: [0.5, 1, 1, 0.6],
              },
              0,
              2.4,
              EASE_IN_OUT,
            )}
          />

          {/* 高潮时柔和的能量汇聚 */}
          <motion.div
            aria-hidden='true'
            className='pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full'
            style={{ background: 'radial-gradient(circle, rgba(79,227,193,0.2) 0%, rgba(79,227,193,0) 62%)' }}
            {...anim({ opacity: [0, 0.6, 0], scale: [0.86, 1.1, 1.16] }, 5.3, 1.6, EASE_IN_OUT)}
          />

          {/* 公式：五个符号各自登场，最后组成完整恒等式 */}
          <div className='relative flex flex-wrap items-start justify-center gap-x-[0.02em] pt-6 sm:pt-10'>
            <motion.span
              className='glyph-math inline-block text-paper'
              style={{ fontSize: 'clamp(3rem, min(15vw, 24vh), 8.5rem)', lineHeight: 0.95 }}
              {...anim({ opacity: [0, 1], x: [0, -140, -40, 0], y: [0, 120, 60, 0], rotate: [-18, -9, -3, 0] }, 1.55, 1.5, EASE_OUT)}
            >
              e
            </motion.span>

            <span className='relative inline-block' style={{ marginLeft: '0.04em' }}>
              <motion.span
                aria-hidden='true'
                className='absolute left-1/2 top-[-1.3em] h-[1.6em] w-px -translate-x-1/2 origin-bottom'
                style={{ background: 'linear-gradient(to top, rgba(185,166,255,0), rgba(185,166,255,0.95))' }}
                {...anim({ scaleY: [0, 1], opacity: [0, 0.9, 0] }, 2.2, 1.15, EASE_OUT)}
              />
              <motion.span
                className='glyph-math inline-block text-imag'
                style={{ fontSize: 'clamp(1.4rem, min(5.4vw, 9vh), 3.1rem)', transform: 'translateY(-0.42em)' }}
                {...anim({ opacity: [0, 1], y: [-52, -14, 0] }, 2.55, 0.8, EASE_OUT)}
              >
                i<span className='not-italic'>π</span>
              </motion.span>
            </span>

            <motion.span
              className='mx-[0.04em] font-display text-muted'
              style={{ fontSize: 'clamp(2.1rem, min(8.5vw, 13vh), 4.8rem)' }}
              {...anim({ opacity: [0, 1], scale: [0.6, 1] }, 4.9, 0.55, EASE_OUT)}
            >
              +
            </motion.span>

            <span className='relative inline-block'>
              <motion.span
                aria-hidden='true'
                className='absolute left-1/2 top-1/2 h-px w-[16rem] origin-right -translate-y-1/2'
                style={{ background: 'linear-gradient(to left, rgba(79,227,193,0.85), rgba(79,227,193,0))' }}
                {...anim({ opacity: [0, 0.8, 0], scaleX: [0.2, 1, 1] }, 3.45, 1.05, EASE_OUT)}
              />
              <motion.span
                className='glyph-math relative block text-vector'
                style={{ fontSize: 'clamp(3rem, min(15vw, 24vh), 8.5rem)', lineHeight: 0.95, marginRight: '-0.04em' }}
                {...anim({ opacity: [0, 1], x: [520, 180, 40, 0] }, 3.45, 1.2, EASE_OUT)}
              >
                1
              </motion.span>
            </span>

            <motion.span
              className='mx-[0.05em] font-display text-muted'
              style={{ fontSize: 'clamp(1.9rem, min(7.8vw, 12vh), 4.4rem)' }}
              {...anim({ opacity: [0, 1], scale: [0.6, 1] }, 5.05, 0.55, EASE_OUT)}
            >
              =
            </motion.span>

            <span className='relative inline-block'>
              <svg
                className='pointer-events-none absolute left-1/2 top-1/2 h-[1.6em] w-[1.6em] -translate-x-1/2 -translate-y-1/2 overflow-visible'
                viewBox='0 0 100 100'
                aria-hidden='true'
              >
                <motion.circle
                  cx='50'
                  cy='50'
                  r='46'
                  fill='none'
                  stroke='#f2efe8'
                  strokeOpacity='0.7'
                  strokeWidth='1.4'
                  {...anim({ pathLength: [0, 1], rotate: [-90, 0], opacity: [0, 0.9, 0.9, 0] }, 3.95, 2.1, EASE_IN_OUT)}
                />
              </svg>
              <motion.span
                className='glyph-math relative block text-paper'
                style={{ fontSize: 'clamp(3rem, min(15vw, 24vh), 8.5rem)', lineHeight: 0.95 }}
                {...anim({ opacity: [0, 1], scale: [0.72, 1] }, 4.6, 0.6, EASE_OUT)}
              >
                0
              </motion.span>
            </span>
          </div>
        </div>

        <div className='relative flex w-full max-w-[660px] flex-col items-center gap-6 text-center'>
          <div className='min-h-[3.2rem]'>
            <motion.p
              className='font-display text-[clamp(1.2rem,3.2vw,1.95rem)] leading-snug text-paper text-balance-cn'
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: stage === 'ready' ? 1 : 0, y: stage === 'ready' ? 0 : 12 }}
              transition={{ duration: 0.8, ease: EASE_OUT, delay: stage === 'ready' ? 0.1 : 0 }}
            >
              {HERO_QUESTION}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: stage === 'ready' ? 1 : 0 }}
            transition={{ duration: 0.9, delay: stage === 'ready' ? 0.25 : 0 }}
          >
            <Formula               tex={HERO_TEX}
              display
              className='text-[clamp(1.05rem,2.8vw,1.55rem)] text-muted'
              label='欧拉恒等式：e 的 i 次方 π 加 1 等于 0'
            />
          </motion.div>

          <motion.div
            className='flex flex-wrap items-center justify-center gap-3'
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: stage === 'ready' ? 1 : 0, y: stage === 'ready' ? 0 : 12 }}
            transition={{ duration: 0.8, delay: stage === 'ready' ? 0.4 : 0 }}
          >
            <a
              href='#growth'
              className='group inline-flex items-center gap-2 rounded-full bg-vector px-6 py-3 text-sm font-semibold text-ink-950 transition-transform duration-200 hover:scale-[1.03] active:scale-95'
            >
              开始探索
              <span aria-hidden='true' className='transition-transform duration-300 group-hover:translate-y-0.5'>
                ↓
              </span>
            </a>
            <GhostButton onClick={replay}>重播开场</GhostButton>
          </motion.div>
        </div>
      </div>

      {stage === 'intro' && !staticNow ? (
        <button
          type='button'
          onClick={skip}
          className='absolute bottom-6 right-5 rounded-full border border-muted/20 px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:border-paper/40 hover:text-paper sm:right-8'
        >
          跳过开场
        </button>
      ) : null}
    </section>
  )
}

export default HeroScene
