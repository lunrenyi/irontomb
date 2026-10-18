import { useMemo, useState } from 'react'
import { BitRow, BitStream, PixelFigure, WaveFigure } from '../viz/digits'
import { VoltageRailFigure } from '../viz/circuitfigure'
import { RAIL, readLevel } from '../lib/circuit'
import { imageToBits, proceduralImage, sampleWave, thresholdBits, WAVE_KINDS, type WaveKind } from '../lib/signal'
import { Chip, Slider } from './ui'

const COUNT = 24

/**
 * 采样实验室。
 *
 * 拖动采样密度、换波形、动门限电压，看同一段连续信号怎么变成一串 0 和 1。
 * 采样点的高度、门限线的位置、下面的比特，全都来自 sampleWave() 与 thresholdBits()。
 */
export function SampleLab() {
  const [kind, setKind] = useState<WaveKind>('beat')
  const [threshold, setThreshold] = useState(50)
  const [probe, setProbe] = useState(40)
  const [toBits, setToBits] = useState(false)

  const thresholdValue = (threshold / 100 - 0.5) * 2
  const samples = useMemo(() => sampleWave(1, COUNT, kind), [kind])
  const bits = useMemo(() => thresholdBits(samples, thresholdValue), [samples, thresholdValue])
  const image = useMemo(() => proceduralImage(16), [])
  const pixels = useMemo(() => imageToBits(image, 0.5), [image])
  const probeVolts = (probe / 100) * RAIL.vdd
  const level = readLevel(probeVolts)

  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10'>
      <div className='flex flex-col gap-6'>
        <div className='glass-panel overflow-hidden rounded-2xl p-2'>
          <svg viewBox='0 0 1200 820' className='block h-auto w-full' role='img' aria-label='波形采样与量化'>
            <WaveFigure width={1200} height={560} progress={1} revealed={COUNT} samples={samples} bits={bits} />
            <BitRow x={600 - ((COUNT - 1) * 44) / 2} y={600} bits={bits} revealed={COUNT} spacing={44} />
            <text x={80} y={694} fill='#8d99b6' fontSize={20}>
              采样点数 {COUNT} · 门限 {thresholdValue.toFixed(2)}
            </text>
            <text x={80} y={736} fill='#6fe3d0' fontSize={22}>
              得到 {bits.reduce((a, b) => a + b, 0)} 个 1、{bits.filter((b) => b === 0).length} 个 0
            </text>
            <text x={80} y={782} fill='#ffc978' fontSize={20}>
              信息只剩 {COUNT} 个比特 —— 采样越稀，能还原的细节越少
            </text>
          </svg>
        </div>

        <div className='grid gap-6 sm:grid-cols-2'>
          <div className='glass-panel rounded-2xl p-4'>
            <svg viewBox='0 0 460 460' className='block h-auto w-full' role='img' aria-label='图像分解为像素与比特'>
              <PixelFigure x={30} y={40} size={400} dissolve={1} toBits={toBits ? 1 : 0} cell={16} />
              <text x={230} y={470} textAnchor='middle' fill='#8d99b6' fontSize={19}>
                {toBits ? '每个像素只剩 1 比特' : '256 个像素，每个有灰度'}
              </text>
            </svg>
            <div className='mt-3 flex justify-center'>
              <Chip active={toBits} tone='violet' onClick={() => setToBits((v) => !v)}>
                {toBits ? '看回灰度图' : '二值化'}
              </Chip>
            </div>
          </div>
          <div className='glass-panel rounded-2xl p-4'>
            <svg viewBox='0 0 460 330' className='block h-auto w-full' role='img' aria-label='连续电压如何被判成 0 或 1'>
              <VoltageRailFigure x={30} y={40} width={400} height={230} probe={probeVolts} />
            </svg>
            <p className='mt-2 text-center text-[13px] leading-relaxed text-muted'>
              现在探针在 <span className='font-mono text-paper'>{probeVolts.toFixed(2)} V</span>，
              接收端会把它判成 <span className={level.bit === null ? 'text-amber' : 'text-signal'}>{level.bit === null ? '未定义' : level.bit}</span>。
            </p>
            <div className='mt-3'>
              <Slider id='lab-probe' label='探针电压' value={probe} min={0} max={100} step={1} suffix='%' onChange={setProbe} />
            </div>
          </div>
        </div>

        {toBits ? (
          <div className='glass-panel overflow-x-auto rounded-2xl p-4'>
            <svg viewBox='0 0 1100 700' className='block h-auto w-full' role='img' aria-label='像素比特排成的长串'>
              <BitStream x={20} y={20} bits={pixels.map((p) => p.bit)} perRow={32} cell={32} />
            </svg>
          </div>
        ) : null}
      </div>

      <aside className='glass-panel flex flex-col gap-5 rounded-2xl p-5'>
        <div>
          <div className='text-xs uppercase tracking-[0.22em] text-muted'>波形</div>
          <div className='mt-3 flex flex-wrap gap-2'>
            {WAVE_KINDS.map((k) => (
              <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
                {k === 'sine' ? '单频正弦' : k === 'chirp' ? '扫频' : '两个频率叠加'}
              </Chip>
            ))}
          </div>
        </div>
        <Slider id='lab-threshold' label='判定门限' value={threshold} min={0} max={100} step={1} suffix='%' onChange={setThreshold} />
        <p className='border-t border-signal/10 pt-4 text-[13px] leading-relaxed text-muted'>
          门限线往上移，更多采样点被判成 1，往下移则相反。
          <span className='mt-2 block text-faint'>同一段连续信号，换一个门限就得到完全不同的比特序列 —— 这正说明 0 和 1 是一种约定。</span>
        </p>
      </aside>
    </div>
  )
}
