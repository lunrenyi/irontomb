import { useEffect, useMemo } from 'react'
import { animate, motion, motionValue } from 'motion/react'
import { GhostButton, PlaybackBar, PlayButton } from './ui'
import { DashArc } from './DashPath'
import { Formula } from './Math'
import { useSequence } from '../hooks/useSequence'
import { useInView } from '../hooks/useInView'
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference'

const STEPS = [
  { id: 'seed', duration: 1100 },
  { id: 'g1', duration: 520 },
  { id: 'g2', duration: 520 },
  { id: 'g3', duration: 520 },
  { id: 'g4', duration: 560 },
  { id: 'g5', duration: 900 },
  { id: 'scatter', duration: 700 },
  { id: 'curve', duration: 2100 },
  { id: 'run', duration: 1700 },
  { id: 'unfold', duration: 1500 },
]

const ROWS = [1, 2, 4, 8, 16]

/** 场景 02 · 认识 e：从「连续增长」的直觉出发 */
export function GrowthScene() {
  const reducedMotion = useReducedMotionPreference()
  const sequence = useSequence(STEPS, { autoPlay: false, staticMode: reducedMotion })
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 })

  useEffect(() => {
    if (inView && !reducedMotion) sequence.play()
  }, [inView, reducedMotion, sequence.play])
  const index = sequence.index
  const showCurve = reducedMotion || index >= 7
  const unfolding = reducedMotion || index >= 9
  const curvePath = useMemo(() => buildGrowthCurve(), [])
  const dotLength = useMemo(() => motionValue(0.07), [])
  const dotOffset = useMemo(() => motionValue(0), [])

  // 光点沿着画好的曲线跑一遍
  useEffect(() => {
    if (!showCurve) {
      dotOffset.set(0)
      return
    }
    const controls = animate(dotOffset, 1, { duration: 3.4, ease: 'linear' })
    return () => controls.stop()
  }, [dotOffset, showCurve])

  return (
    <div ref={ref} className='grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center'>
      <div>
        <svg
          viewBox='0 0 620 360'
          className='w-full'
          role='img'
          aria-label='一颗种子连续翻倍，数量越来越多，最后汇成一条上升的曲线'
        >
          <defs>
            <linearGradient id='growth-curve' x1='0' y1='1' x2='1' y2='0'>
              <stop offset='0%' stopColor='#8ea4bf' stopOpacity='0.25' />
              <stop offset='60%' stopColor='#4fe3c1' stopOpacity='0.85' />
              <stop offset='100%' stopColor='#f2efe8' stopOpacity='1' />
            </linearGradient>
          </defs>

          <g stroke='#8ea4bf' strokeOpacity='0.22' strokeWidth='1'>
            <line x1='40' y1='320' x2='590' y2='320' />
            <line x1='40' y1='40' x2='40' y2='320' />
          </g>
          <g fontSize='11' fill='#8ea4bf' fillOpacity='0.7' fontFamily='ui-sans-serif, system-ui'>
            <text x='592' y='338' textAnchor='end'>时间</text>
            <text x='32' y='46' textAnchor='end'>数量</text>
          </g>

          {/* 离散翻倍 */}
          <motion.g initial={{ opacity: 1 }} animate={{ opacity: showCurve ? 0 : 1 }} transition={{ duration: 0.5 }}>
            {ROWS.map((count, row) => {
              const visible = index >= row
              const spread = 30
              return (
                <g key={count}>
                  {Array.from({ length: count }).map((_, i) => (
                    <motion.circle
                      key={i + '-' + count}
                      cx={54 + i * spread}
                      cy={300 - row * 46}
                      r={3.4}
                      fill='#4fe3c1'
                      initial={{ opacity: 0, scale: 0.2 }}
                      animate={{ opacity: visible ? 0.45 + row * 0.09 : 0, scale: visible ? 1 : 0.2 }}
                      transition={{ duration: 0.45, delay: i * 0.012, ease: [0.16, 1, 0.3, 1] }}
                    />
                  ))}
                  <motion.text
                    x={54 + count * spread + 12}
                    y={304 - row * 46}
                    fontSize='11'
                    fill='#8ea4bf'
                    fontFamily='ui-monospace, monospace'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: visible ? 0.75 : 0 }}
                  >
                    {count}
                  </motion.text>
                </g>
              )
            })}
          </motion.g>

          {/* 连续的增长曲线 */}
          <motion.path
            d={curvePath}
            fill='none'
            stroke='url(#growth-curve)'
            strokeWidth='2.4'
            strokeLinecap='round'
            initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: showCurve ? 1 : 0, opacity: showCurve ? 1 : 0 }}
            transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* 沿曲线奔跑的光点 */}
          {showCurve ? (
            <DashArc
              d={curvePath}
              fill='none'
              stroke='#f2efe8'
              strokeWidth='3.2'
              strokeLinecap='round'
              strokeOpacity='0.9'
              length={dotLength}
              offset={dotOffset}
            />
          ) : null}

          {/* 光点跑完：圆从终点展开，为下一章的复平面铺路 */}
          <motion.g
            animate={{ opacity: unfolding ? 1 : 0, scale: unfolding ? 1 : 0.3 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: '470px 168px' }}
          >
            <circle cx='470' cy='168' r='84' fill='#b9a6ff' fillOpacity='0.05' />
            <circle cx='470' cy='168' r='84' fill='none' stroke='#b9a6ff' strokeOpacity='0.45' strokeWidth='1.2' />
            <circle cx='554' cy='168' r='4.5' fill='#f2b134' />
          </motion.g>
        </svg>
      </div>

      <div className='flex flex-col gap-5'>
        <div className='min-h-[7.5rem]'>
          <p className='text-[15px] leading-relaxed text-paper'>
            一颗种子，第 1 轮变成 2 颗，第 2 轮变成 4 颗……如果一直翻倍，增长会越来越陡。
            <span className='text-muted'>描述这种「按比例持续增长」的常数，就是 e。</span>
          </p>
          <p className='mt-3 text-[15px] leading-relaxed text-muted'>
            e 是自然指数中最重要的常数，经常出现在连续增长和连续变化的问题里。
          </p>
        </div>

        <div className='rounded-xl border border-node/20 bg-node/[0.06] px-4 py-3'>
          <p className='text-xs leading-relaxed text-muted'>
            <span className='text-node'>先记一句：</span>
            增长讲的是「大小」，旋转讲的是「方向」。等我们在单位圆上转动{' '}
            <Formula tex='e^{i\\theta}' label='e 的 i 次方 θ' className='text-paper' /> 时，它的长度并不会变大。
          </p>
        </div>

        <PlaybackBar>
          <PlayButton playing={sequence.playing} onClick={sequence.toggle} />
          <GhostButton onClick={sequence.replay}>重播</GhostButton>
        </PlaybackBar>
      </div>
    </div>
  )
}

/** y = e^x 的一段，写进 viewBox 坐标系 */
function buildGrowthCurve(): string {
  const points: string[] = []
  const top = Math.exp(2.6)
  for (let i = 0; i <= 48; i += 1) {
    const t = i / 48
    const x = 54 + t * 420
    const y = 320 - (Math.exp(t * 2.6) / top) * 250
    points.push((i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1))
  }
  return points.join(' ')
}

export default GrowthScene
