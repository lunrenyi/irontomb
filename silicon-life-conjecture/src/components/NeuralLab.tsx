import { useMemo, useState } from 'react'
import { NeuronFigure } from '../viz/neuronfigure'
import { GateFigure, GateNetworkFigure, TruthTableFigure, VoltageRailFigure } from '../viz/circuitfigure'
import { DEFAULT_LIF, runFeedforward, type NeuronNode, type Synapse } from '../lib/neuron'
import { Chip, Slider } from './ui'

const DURATION = 120
const DT = 0.25

const LAYERS: NeuronNode[][] = [
  [
    { id: 'a0', x: 0, y: 0 },
    { id: 'a1', x: 0, y: 1 },
    { id: 'a2', x: 0, y: 2 },
    { id: 'a3', x: 0, y: 3 },
  ],
  [
    { id: 'b0', x: 1, y: 0 },
    { id: 'b1', x: 1, y: 1 },
    { id: 'b2', x: 1, y: 2 },
    { id: 'b3', x: 1, y: 3 },
  ],
  [
    { id: 'c0', x: 2, y: 1 },
    { id: 'c1', x: 2, y: 2 },
  ],
]

const SYNAPSES: Synapse[] = LAYERS.flatMap((_, depth) =>
  depth === 0 ? [] :
    LAYERS[depth].flatMap((node) =>
      LAYERS[depth - 1].map((from) => ({ from: from.id, to: node.id, weight: 1.6 })),
    ),
)

/**
 * 神经与芯片的对照实验室。
 * 左边的动作电位是 LIF 模型算出来的；右边的真值表与门输出是真的布尔运算。
 * 拖动时间轴就能看到「同样的连接，不同的机制」。
 */
export function NeuralLab() {
  const [t, setT] = useState(40)
  const [a, setA] = useState<0 | 1>(1)
  const [b, setB] = useState<0 | 1>(0)
  const net = useMemo(() => runFeedforward(LAYERS, SYNAPSES, DURATION, DT, DEFAULT_LIF), [])

  const trace = useMemo(
    () => net.traces.b1.map((v, i) => ({ t: i * DT, v, input: 0, spiked: net.spikes.b1[i] })),
    [net],
  )
  const spikes = useMemo(() => net.spikeTimes.b1, [net])
  const row = [0, 1].flatMap((x) => [0, 1].map((y) => (x << 1) | y)).indexOf((a << 1) | b)

  return (
    <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8'>
      <div className='glass-panel rounded-2xl p-4'>
        <div className='flex items-baseline justify-between px-2'>
          <h3 className='text-[15px] font-semibold text-bio'>生物神经元</h3>
          <span className='font-mono text-[11px] text-faint'>t = {t.toFixed(1)} ms</span>
        </div>
        <svg viewBox='0 0 900 520' className='mt-2 block h-auto w-full' role='img' aria-label='生物神经元及其膜电位'>
          <NeuronFigure width={900} height={520} t={t} trace={trace} spikes={spikes} duration={DURATION} />
        </svg>
        <Slider id='lab-nt' label='时间' value={Math.round(t)} min={0} max={DURATION} step={1} suffix=' ms' onChange={setT} />
        <p className='mt-2 text-[12px] leading-relaxed text-faint'>
          曲线是漏电整合发放模型真的算出来的：静息 -70 mV，阈值 -55 mV，发放后进入不应期。
          下游神经元 {spikes.length > 0 ? '在 ' + spikes.slice(0, 3).map((s) => s.toFixed(0) + ' ms').join('、') + ' 处收到了信号' : '还没有收到信号'}。
        </p>
      </div>

      <div className='flex flex-col gap-6'>
        <div className='glass-panel rounded-2xl p-4'>
          <h3 className='px-2 text-[15px] font-semibold text-circuit'>数字逻辑门</h3>
          <div className='mt-2 flex flex-wrap items-center gap-2 px-2'>
            <Chip active={a === 1} tone='signal' onClick={() => setA((v) => (v ? 0 : 1))}>
              输入 a = {a}
            </Chip>
            <Chip active={b === 1} tone='violet' onClick={() => setB((v) => (v ? 0 : 1))}>
              输入 b = {b}
            </Chip>
          </div>
          <svg viewBox='0 0 640 200' className='mt-2 block h-auto w-full' role='img' aria-label='逻辑门输入输出'>
            <GateFigure x={180} y={70} kind='AND' a={a} b={b} active scale={0.85} />
            <GateFigure x={430} y={70} kind='XOR' a={a} b={b} active scale={0.85} />
          </svg>
          <svg viewBox='0 0 640 220' className='mt-2 block h-auto w-full' role='img' aria-label='逻辑门真值表'>
            <TruthTableFigure x={20} y={40} highlightRow={row} />
          </svg>
        </div>

        <div className='glass-panel rounded-2xl p-4'>
          <h3 className='px-2 text-[15px] font-semibold text-circuit'>从单个单元放大到网络</h3>
          <svg viewBox='0 0 640 300' className='mt-2 block h-auto w-full' role='img' aria-label='由逻辑门组成的网络'>
            <GateNetworkFigure width={640} height={300} seed={7} columns={9} rows={5} />
          </svg>
          <svg viewBox='0 0 640 150' className='mt-2 block h-auto w-full' role='img' aria-label='电压与 0/1 的关系'>
            <VoltageRailFigure x={20} y={30} width={600} height={110} probe={a ? 1.6 : 0.2} />
          </svg>
          <p className='mt-2 text-[12px] leading-relaxed text-faint'>
            两边都能靠大量简单单元的连接完成单个单元做不到的事。但左边是连续的电位、突触电流与可塑性；右边是固定的逻辑与设计好的结构。
          </p>
        </div>
      </div>
    </div>
  )
}
