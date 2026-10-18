import { ChapterTitle, SceneKeys, STAGE_SVG, StageLabel } from '../FilmChrome'
import { NeuronFigure } from '../../viz/neuronfigure'
import { GateFigure, GateNetworkFigure, TruthTableFigure, TransistorFigure, VoltageRailFigure } from '../../viz/circuitfigure'
import { DEFAULT_LIF, runLif } from '../../lib/neuron'
import { easeOut } from '../../lib/easing'
import { BIO, CIRCUIT, INK, MUTED, alpha } from '../../viz/palette'
import { STAGE_H, STAGE_W, beatsOf } from '../timeline'
import { frac } from '../cues'
import { SCORE } from '../score'

const B = beatsOf('neural')
const SPEC = SCORE.neural

const DURATION = 120
const DT = 0.25
// 神经元的电位轨迹是 LIF 模型真的算出来的
const single = runLif((t) => Math.pow(Math.max(0, Math.sin((t / DURATION) * Math.PI * 4)), 3), DURATION, DT, DEFAULT_LIF)
const GATE_ROW = [
  { a: 0 as const, b: 0 as const },
  { a: 0 as const, b: 1 as const },
  { a: 1 as const, b: 0 as const },
  { a: 1 as const, b: 1 as const },
]

/**
 * 第三幕：神经元与芯片。
 * 左边的电位曲线是模型算出来的，右边的真值表也是真的；
 * 文字只有贴在结构上的短标签，和最后那一句需要想一想的问题。
 */
export function NeuralScene({ frame }: { frame: number }) {
  return (
    <>
      <ChapterTitle frame={frame} beats={B} title='神经与芯片' sub='NEURON · CIRCUIT' />
      <SceneKeys frame={frame} beats={B} specs={SPEC} />
      {frame < B[4].start ? <NeuronStage frame={frame} /> : null}
      {frame >= B[4].start && frame < B[5].start ? <GateStage frame={frame} /> : null}
      {frame >= B[5].start && frame < B[6].start ? <TruthStage frame={frame} /> : null}
      {frame >= B[6].start && frame < B[7].start ? <RailStage frame={frame} /> : null}
      {frame >= B[7].start && frame < B[8].start ? <NetworkStage /> : null}
      {frame >= B[8].start ? <DiffStage frame={frame} /> : null}
    </>
  )
}

/** 第 1-3 拍：一个生物神经元，标签直接贴在结构上 */
function NeuronStage({ frame }: { frame: number }) {
  const out = easeOut(frac(frame, B, 4, 0, 0.55))
  const t = frac(frame, B, 1, 0.05, 1) * DURATION
  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={1 - out}>
      <g transform='translate(30 250)'>
        <NeuronFigure width={1860} height={700} t={t} trace={single.trace} spikes={single.spikeTimes} duration={DURATION} />
      </g>
      <StageLabel frame={frame} from={B[1].start + 10} to={B[4].start} x={180} y={940} color={BIO} leader={{ x: 430, y: 720 }}>
        树突
      </StageLabel>
      <StageLabel frame={frame} from={B[1].start + 10} to={B[4].start} x={700} y={980} color={BIO} leader={{ x: 620, y: 700 }}>
        胞体
      </StageLabel>
      <StageLabel frame={frame} from={B[1].start + 10} to={B[4].start} x={1320} y={980} color={BIO} leader={{ x: 1240, y: 700 }}>
        轴突
      </StageLabel>
      <StageLabel frame={frame} from={B[2].start + 12} to={B[4].start} x={1770} y={700} anchor='end' color={BIO}>
        突触
      </StageLabel>
    </svg>
  )
}

/** 第 4 拍：晶体管与逻辑门 */
function GateStage({ frame }: { frame: number }) {
  const out = easeOut(frac(frame, B, 5, 0, 0.55))
  const idx = Math.min(3, Math.floor(frac(frame, B, 4, 0.15, 0.9) * 4))
  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={1 - out}>
      <TransistorFigure x={360} y={430} on={idx % 2 === 1} scale={2.1} label={idx % 2 === 1 ? '导通' : '截止'} />
      <StageLabel frame={frame} from={B[4].start + 10} to={B[5].start} x={360} y={720} anchor='middle' color={CIRCUIT}>
        晶体管
      </StageLabel>
      {GATE_ROW.map((row, i) => (
        <g key={i} transform={'translate(780 ' + (250 + i * 210) + ')'}>
          <GateFigure x={0} y={0} kind='AND' a={row.a} b={row.b} active={i === idx} scale={1.6} />
        </g>
      ))}
      <StageLabel frame={frame} from={B[4].start + 10} to={B[5].start} x={900} y={880} anchor='middle' color={CIRCUIT}>
        逻辑门
      </StageLabel>
    </svg>
  )
}

/** 第 5 拍：真值表 */
function TruthStage({ frame }: { frame: number }) {
  const out = easeOut(frac(frame, B, 6, 0, 0.55))
  const idx = Math.floor(frac(frame, B, 5, 0.15, 0.95) * 4)
  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={1 - out}>
      <TruthTableFigure x={640} y={300} highlightRow={idx} />
      <StageLabel frame={frame} from={B[5].start + 10} to={B[6].start} x={640} y={900} color={CIRCUIT}>
        四种输入，四种输出
      </StageLabel>
    </svg>
  )
}

/** 第 6 拍：电压轨 */
function RailStage({ frame }: { frame: number }) {
  const out = easeOut(frac(frame, B, 7, 0, 0.55))
  const probe = frac(frame, B, 6, 0.05, 0.95) * 1.9 - 0.05
  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={1 - out}>
      <VoltageRailFigure x={260} y={260} width={1400} height={560} probe={probe} />
    </svg>
  )
}

/** 第 7 拍：两张网络图并排 */
function NetworkStage() {
  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block'>
      <g transform={'translate(70 260)'}>
        <GateNetworkFigure width={870} height={560} seed={11} columns={11} rows={6} />
      </g>
      <g transform={'translate(980 260)'}>
        <GateNetworkFigure width={870} height={560} seed={29} columns={11} rows={6} />
      </g>
      <StageLabel frame={B[7].start} from={B[7].start} to={B[8].start} x={70} y={200} color={CIRCUIT}>
        数字电路
      </StageLabel>
      <StageLabel frame={B[7].start} from={B[7].start} to={B[8].start} x={980} y={200} color={BIO}>
        神经网络
      </StageLabel>
      <StageLabel frame={B[7].start} from={B[7].start} to={B[8].start} x={960} y={900} anchor='middle' color={MUTED}>
        单元 × 连接
      </StageLabel>
    </svg>
  )
}

/** 第 8-9 拍：机制不同 */
function DiffStage({ frame }: { frame: number }) {
  const t = easeOut(frac(frame, B, 8, 0, 0.4))
  const cols = [
    { head: '生物神经元', color: BIO, items: ['电化学', '突触可塑性', '代谢与身体反馈', '电位连续变化'] },
    { head: '数字电路', color: CIRCUIT, items: ['按设计好的逻辑运行', '电压分成若干档', '同一块硬件换程序', '状态基本只有两态'] },
  ]
  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={t}>
      {cols.map((col, c) => (
        <g key={col.head} transform={'translate(' + (c === 0 ? 330 : 1010) + ' 250)'}>
          <rect x={-70} y={-64} width={700} height={430} rx={22} fill={alpha(col.color, 0.06)} stroke={alpha(col.color, 0.34)} strokeWidth={1.6} />
          <text x={0} y={0} fill={col.color} fontSize={46}>
            {col.head}
          </text>
          {col.items.map((item, i) => (
            <text key={item} x={0} y={82 + i * 78} fill={INK} fontSize={36}>
              · {item}
            </text>
          ))}
        </g>
      ))}
    </svg>
  )
}
