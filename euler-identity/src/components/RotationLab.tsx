import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { UnitCircle } from './UnitCircle'
import { ChipButton, GhostButton, PlaybackBar, PlayButton, cx } from './ui'
import { Formula } from './Math'
import { EULER_FORMULA_TEX } from '../content'
import { PI, SPECIAL_ANGLES, TAU, formatNumber, formatPoint } from '../lib/math'
import { complexTex, eIPowThetaTex, thetaTex } from '../lib/format'
import { rotationStore, tweenToTheta, useRotation } from '../state/rotationStore'

const NARRATION = [
  { rad: 0, caption: '从 θ = 0 出发：点在 (1, 0)，正对着实轴。' },
  { rad: PI / 2, caption: '转过四分之一圈 θ = π/2：cos θ = 0，sin θ = 1。' },
  { rad: PI, caption: '转过半圈 θ = π：cos θ = -1，sin θ = 0。' },
  { rad: (3 * PI) / 2, caption: '转过四分之三圈 θ = 3π/2：sin θ = -1，虚部变成负数。' },
  { rad: TAU, caption: '转满整圈 2π：回到起点。注意长度一直是 1，转动并不会让它变大。' },
]

export function RotationLab() {
  const showTrail = useRotation((s) => s.showTrail)
  const [snapped, setSnapped] = useState<number | null>(null)
  const snapTimer = useRef<number | null>(null)

  const handleSnap = useCallback((index: number) => {
    setSnapped(index)
    if (snapTimer.current) window.clearTimeout(snapTimer.current)
    snapTimer.current = window.setTimeout(() => setSnapped(null), 1100)
  }, [])

  useEffect(
    () => () => {
      if (snapTimer.current) window.clearTimeout(snapTimer.current)
    },
    [],
  )

  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_336px] lg:items-start lg:gap-10'>
      <div className='relative'>
        <div className='relative mx-auto aspect-square w-full max-w-[min(92vw,540px)]'>
          <UnitCircle
            interactive
            showTrail={showTrail}
            onSnap={handleSnap}
            className='h-full w-full touch-none select-none'
          />
        </div>

        <AnimatePresence>
          {snapped !== null ? (
            <motion.div
              key={snapped}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24 }}
              className='pointer-events-none absolute left-1/2 top-3 -translate-x-1/2'
            >
              <span className='rounded-full border border-node/40 bg-node/10 px-3 py-1 text-xs text-node'>
                已吸附到 θ = {SPECIAL_ANGLES[snapped].label}
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <p className='mt-2 text-center text-xs text-muted'>
          拖动圆周上的点，或直接在圆内按住拖动 · 也支持键盘方向键
        </p>
      </div>

      <aside className='flex flex-col gap-5'>
        <Readout />
        <AngleSlider />
        <PresetRow />
        <TransportBar />
        <NarrationControl />
      </aside>
    </div>
  )
}

/** 实时数值：与圆上的点读取同一份角度状态 */
function Readout() {
  const theta = useRotation((s) => s.theta)
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  const exact = SPECIAL_ANGLES.find((s) => Math.abs(s.rad - theta) < 1e-9)
  const label = exact ? exact.label : formatNumber(theta, 2)

  return (
    <div className='glass-panel rounded-2xl p-5'>
      <div className='flex items-baseline justify-between gap-3'>
        <span className='text-xs uppercase tracking-[0.28em] text-muted'>当前角度 θ</span>
        {exact ? <span className='rounded-full bg-node/15 px-2 py-0.5 text-[11px] text-node'>特殊角度</span> : null}
      </div>

      <div className='mt-2 flex items-end gap-3'>
        <span className='font-display text-4xl leading-none text-paper'>{label}</span>
        <span className='pb-1 text-sm text-muted'>
          rad · {formatNumber((theta * 180) / PI, 0)}°
        </span>
      </div>

      <div className='mt-5 grid grid-cols-3 gap-3 text-center'>
        <Value label='cos θ' value={formatNumber(cos, 3)} tone='text-vector' />
        <Value label='sin θ' value={formatNumber(sin, 3)} tone='text-imag' />
        <Value label='坐标 (x, y)' value={formatPoint(theta, 2)} tone='text-paper' small />
      </div>

      <div className='mt-5 rounded-xl border border-muted/12 bg-ink-950/40 px-4 py-3'>
        <div className='text-[11px] uppercase tracking-[0.2em] text-muted'>欧拉公式 · 实时代入</div>
        <Formula           tex={EULER_FORMULA_TEX}
          className='mt-2 block text-center text-[15px] text-paper sm:text-lg'
          label='e 的 i 次方 θ 等于 cos θ 加 i sin θ'
        />
        <Formula           tex={eIPowThetaTex(theta) + ' = ' + complexTex(cos, sin)}
          className='mt-3 block text-center text-[15px] text-vector sm:text-lg'
          label={'当前数值：' + complexTex(cos, sin, 3)}
        />
        <div className='mt-3 flex items-center justify-center gap-2 text-center text-xs text-muted'>
          <span className='inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-vector' aria-hidden='true' />
          模长 |e^iθ| = 1：转得再远，e^iθ 也没有变大
        </div>
      </div>
    </div>
  )
}

function Value({ label, value, tone, small }: { label: string; value: string; tone: string; small?: boolean }) {
  return (
    <div className='rounded-xl border border-muted/10 bg-ink-950/40 px-2 py-3'>
      <div className='text-[11px] text-muted'>{label}</div>
      <div
        className={cx(
          'mt-1 whitespace-nowrap font-mono tabular-nums',
          small ? 'text-[12px]' : 'text-lg',
          tone,
        )}
      >
        {value}
      </div>
    </div>
  )
}

/** 角度滑块：与圆共享同一个角度状态 */
function AngleSlider() {
  const theta = useRotation((s) => s.theta)
  const degrees = theta >= TAU - 1e-9 ? 360 : Math.min((theta * 180) / PI, 360)

  return (
    <div className='glass-panel rounded-2xl p-5'>
      <label
        htmlFor='theta-slider'
        className='flex items-baseline justify-between text-xs uppercase tracking-[0.22em] text-muted'
      >
        <span>拖动角度</span>
        <span className='font-mono text-sm normal-case tracking-normal text-paper'>{formatNumber(degrees, 1)}°</span>
      </label>
      <input
        id='theta-slider'
        type='range'
        className='angle-range mt-3 w-full'
        min={0}
        max={360}
        step={0.5}
        value={degrees}
        aria-label='角度，单位为度'
        onChange={(event) => {
          rotationStore.takeControl()
          rotationStore.setTheta((Number(event.target.value) * PI) / 180, 'user')
        }}
      />
      <div className='mt-1 flex justify-between text-[11px] text-faint'>
        <span>0°</span>
        <span>90°</span>
        <span>180°</span>
        <span>270°</span>
        <span>360°</span>
      </div>
    </div>
  )
}

function PresetRow() {
  const theta = useRotation((s) => s.theta)
  return (
    <div className='glass-panel rounded-2xl p-5'>
      <div className='text-xs uppercase tracking-[0.22em] text-muted'>跳到特殊角度</div>
      <div className='mt-3 flex flex-wrap gap-2'>
        {SPECIAL_ANGLES.map((special) => {
          const active = Math.abs(special.rad - theta) < 1e-6
          return (
            <ChipButton
              key={special.label}
              tone='node'
              active={active}
              onClick={() => {
                void tweenToTheta(special.rad, 0.8)
              }}
              aria-label={'跳转到 θ = ' + special.label}
            >
              {special.label}
            </ChipButton>
          )
        })}
      </div>
      <p className='mt-3 text-xs leading-relaxed text-muted'>
        在特殊角度附近拖动时，点会被轻微吸附，方便停在精确位置；连续拖动不会被卡住。
      </p>
    </div>
  )
}

function TransportBar() {
  const playing = useRotation((s) => s.playing)
  const showTrail = useRotation((s) => s.showTrail)

  return (
    <PlaybackBar>
      <PlayButton playing={playing} playLabel='播放' pauseLabel='暂停' onClick={() => rotationStore.togglePlaying()} />
      <GhostButton onClick={() => rotationStore.reset()}>重置</GhostButton>
      <GhostButton onClick={() => rotationStore.toggleTrail()} className={showTrail ? 'text-vector' : undefined}>
        {showTrail ? '隐藏轨迹' : '显示轨迹'}
      </GhostButton>
    </PlaybackBar>
  )
}

function NarrationControl() {
  const [index, setIndex] = useState<number | null>(null)
  const runId = useRef(0)
  const mounted = useRef(true)
  const theta = useRotation((s) => s.theta)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      runId.current += 1
    }
  }, [])

  const run = useCallback(async () => {
    runId.current += 1
    const token = runId.current
    rotationStore.takeControl()
    setIndex(0)
    for (let i = 0; i < NARRATION.length; i += 1) {
      if (!mounted.current || token !== runId.current) return
      setIndex(i)
      await tweenToTheta(NARRATION[i].rad, 1.05)
      await new Promise((resolve) => setTimeout(resolve, 650))
    }
    if (mounted.current && token === runId.current) setIndex(null)
  }, [])

  return (
    <div className='glass-panel rounded-2xl p-5'>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-xs uppercase tracking-[0.22em] text-muted'>讲解动画</div>
        <GhostButton onClick={() => void run()}>重新播放讲解</GhostButton>
      </div>
      <div className='mt-3 min-h-[3.4rem] text-sm leading-relaxed text-paper'>
        {index === null ? (
          <span className='text-muted'>让点自己走一遍五个特殊角度，边走边讲；你随时拖动就能打断它。</span>
        ) : (
          <motion.span key={index} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {NARRATION[index].caption}
          </motion.span>
        )}
      </div>
      <div className='mt-2 flex gap-1.5' aria-hidden='true'>
        {NARRATION.map((step, i) => (
          <span
            key={step.rad}
            className={cx(
              'h-1 flex-1 rounded-full transition-colors duration-300',
              index !== null && i <= index ? 'bg-vector' : 'bg-muted/20',
            )}
          />
        ))}
      </div>
      <p className='mt-3 text-xs text-muted'>当前角度的公式写法：θ = {thetaTex(theta)}</p>
    </div>
  )
}

export default RotationLab
