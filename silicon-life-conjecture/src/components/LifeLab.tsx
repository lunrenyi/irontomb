import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LifeGridFigure } from '../viz/lifegrid'
import {
  PRESETS,
  clearGrid,
  createGrid,
  gridWithPreset,
  gridWithPresets,
  liveCount,
  presetById,
  presetSize,
  randomGrid,
  stepLife,
  toggleAt,
  type Cell,
  type LifeGrid,
  type LifePreset,
} from '../lib/life'
import { Chip, Ghost, Slider, type Tone } from './ui'

const SIZE = 60
const SPEEDS = [
  { label: '很慢', fps: 3 },
  { label: '慢', fps: 8 },
  { label: '正常', fps: 15 },
  { label: '快', fps: 30 },
  { label: '很快', fps: 60 },
]

function toneOf(preset: LifePreset): Tone {
  if (preset.kind === 'still') return 'blue'
  if (preset.kind === 'oscillator') return 'violet'
  if (preset.kind === 'spaceship') return 'signal'
  if (preset.kind === 'gun') return 'bio'
  return 'amber'
}

/**
 * 生命游戏实验室。
 *
 * 棋盘上的每一格都由 stepLife() 真算：点一格改一格，按一次单步推进一代，
 * 换预设就重新摆一套图案。这里没有任何预先制作的动画。
 */
export function LifeLab() {
  const [grid, setGrid] = useState<LifeGrid>(() => gridWithPreset(createGrid(SIZE, SIZE), presetById('glider')!))
  const [previous, setPrevious] = useState<LifeGrid | null>(null)
  const [generation, setGeneration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speedIndex, setSpeedIndex] = useState(2)
  const [density, setDensity] = useState(32)
  const [seed, setSeed] = useState(20260410)
  const [activeId, setActiveId] = useState('glider')
  const [flash, setFlash] = useState<Cell[]>([])
  const [mixMode, setMixMode] = useState(false)
  const [beat, setBeat] = useState(0)
  const accumulator = useRef(0)

  const toggle = useCallback((x: number, y: number) => {
    setGrid((current) => toggleAt(current, x, y))
    setPlaying(false)
    setFlash([{ x, y }])
  }, [])

  const step = useCallback(() => {
    setPlaying(false)
    setGrid((current) => {
      const next = stepLife(current)
      setPrevious(current)
      return next
    })
    setGeneration((g) => g + 1)
  }, [])

  const loadPreset = useCallback((preset: LifePreset) => {
    setPlaying(false)
    setPrevious(null)
    setGeneration(0)
    setActiveId(preset.id)
    setMixMode(false)
    setGrid(gridWithPreset(createGrid(SIZE, SIZE), preset))
    setFlash([])
  }, [])

  const loadMix = useCallback(() => {
    setPlaying(false)
    setPrevious(null)
    setGeneration(0)
    setActiveId('mix')
    setMixMode(true)
    setGrid(gridWithPresets(createGrid(SIZE, SIZE), PRESETS.slice(0, 5), seed))
  }, [seed])

  const randomize = useCallback(() => {
    setPlaying(false)
    setPrevious(null)
    setGeneration(0)
    setActiveId('random')
    setMixMode(false)
    setGrid(randomGrid(createGrid(SIZE, SIZE), density / 100, seed))
  }, [density, seed])

  const reset = useCallback(() => {
    setPlaying(false)
    setPrevious(null)
    setGeneration(0)
    setFlash([])
    if (mixMode) return loadMix()
    if (activeId === 'random') return randomize()
    const preset = presetById(activeId)
    if (preset) setGrid(gridWithPreset(createGrid(SIZE, SIZE), preset))
  }, [activeId, loadMix, mixMode, randomize])

  const clear = useCallback(() => {
    setPlaying(false)
    setPrevious(null)
    setGeneration(0)
    setActiveId('empty')
    setMixMode(false)
    setFlash([])
    setGrid(clearGrid(createGrid(SIZE, SIZE)))
  }, [])

  // 唯一的 rAF 循环：按当前速度推进代数
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const fps = SPEEDS[speedIndex].fps
    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.25)
      last = now
      accumulator.current += delta * fps
      while (accumulator.current >= 1) {
        accumulator.current -= 1
        setGrid((current) => {
          const next = stepLife(current)
          setPrevious(current)
          return next
        })
        setGeneration((g) => g + 1)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speedIndex])

  // 暂停时的呼吸感：只在停下时缓慢亮灭，避免密集重排时抖动
  useEffect(() => {
    if (playing) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      setBeat(((now - start) / 1000) % 1)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  const activePreset = useMemo(() => (mixMode ? null : presetById(activeId) ?? null), [mixMode, activeId])
  const size = activePreset ? presetSize(activePreset) : null
  const pop = liveCount(grid)

  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10'>
      <div className='relative'>
        <div className='relative mx-auto w-full max-w-[min(94vw,640px)]'>
          <div className='relative' style={{ aspectRatio: '1 / 1', border: '1px solid rgba(111,227,208,0.18)', borderRadius: 14, background: 'radial-gradient(120% 120% at 50% 0%, rgba(20,36,74,0.5), rgba(4,6,13,0.92))', padding: 8 }}>
            <LifeGridFigure grid={grid} previous={previous} progress={1} onToggle={toggle} breathe={playing ? 0 : beat} highlight={flash} />
          </div>
        </div>
        <p className='mt-3 text-center font-mono text-xs tabular-nums text-muted'>
          第 {generation} 代 · {pop} 个存活格 {size ? ' · 图案 ' + size.width + 'x' + size.height : ''}
        </p>
      </div>

      <aside className='flex flex-col gap-5'>
        <div className='glass-panel rounded-2xl p-5'>
          <div className='text-xs uppercase tracking-[0.22em] text-muted'>规则 B3 / S23</div>
          <ol className='mt-3 space-y-1.5 text-[13px] leading-relaxed text-muted'>
            <li>1. 存活 + 邻居少于 2 → 死亡</li>
            <li>2. 存活 + 邻居 2 或 3 → 存活</li>
            <li>3. 存活 + 邻居多于 3 → 死亡</li>
            <li>4. 死亡 + 邻居恰好 3 → 复活</li>
          </ol>
          <p className='mt-3 border-t border-signal/10 pt-3 text-[12px] leading-relaxed text-faint'>
            下一代完全由上一代同时算出。页面上的每一次推进都跑的是同一份实现。
          </p>
        </div>

        <div className='glass-panel flex flex-col gap-4 rounded-2xl p-5'>
          <div className='flex flex-wrap items-center gap-2'>
            <button
              type='button'
              onClick={() => setPlaying((p) => !p)}
              className='inline-flex items-center gap-2 rounded-full bg-signal px-4 py-1.5 text-[13px] font-semibold text-ink-950 transition-transform duration-200 hover:scale-[1.03] active:scale-95'
            >
              <span aria-hidden='true'>{playing ? '❚❚' : '▶'}</span>
              {playing ? '暂停' : '播放'}
            </button>
            <Ghost onClick={step}>单步推进一代</Ghost>
            <Ghost onClick={clear}>清空</Ghost>
            <Ghost onClick={reset}>重新开始</Ghost>
          </div>

          <Slider id='lab-speed' label='演化速度' value={speedIndex} min={0} max={SPEEDS.length - 1} step={1} suffix={' · ' + SPEEDS[speedIndex].label} onChange={setSpeedIndex} />
          <Slider id='lab-density' label='随机填充密度' value={density} min={5} max={70} step={1} suffix='%' onChange={setDensity} />
          <div className='flex flex-wrap gap-2'>
            <Ghost onClick={() => setSeed((s) => s + 7919)}>换一个种子</Ghost>
            <Ghost onClick={randomize}>随机生成</Ghost>
            <Ghost onClick={loadMix}>多个图案一起</Ghost>
          </div>
        </div>

        <div className='glass-panel rounded-2xl p-5'>
          <div className='text-xs uppercase tracking-[0.22em] text-muted'>预设图案</div>
          <div className='mt-3 flex flex-wrap gap-2'>
            {PRESETS.map((preset) => (
              <Chip key={preset.id} active={preset.id === activeId} tone={toneOf(preset)} onClick={() => loadPreset(preset)}>
                {preset.name}
              </Chip>
            ))}
          </div>
          {activePreset ? (
            <div className='mt-4 border-t border-signal/10 pt-3'>
              <p className='text-[13px] leading-relaxed text-paper/90'>{activePreset.note}</p>
              <p className='mt-2 text-[12px] leading-relaxed text-faint'>{activePreset.detail}</p>
            </div>
          ) : mixMode ? (
            <p className='mt-4 border-t border-signal/10 pt-3 text-[13px] leading-relaxed text-paper/90'>
              五个图案被错开摆在一起。看看边界附近会发生什么 —— 相互作用往往比单独看更有意思。
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
