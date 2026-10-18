import { DEFAULT_LIF, type LifSample, type LifParams } from '../lib/neuron'
import { BIO, DEEP, INK, MONO, MUTED, SIGNAL } from './palette'

export interface NeuronFigureProps {
  width: number
  height: number
  /** 当前时刻（毫秒），决定动作电位走到轴突的哪一段 */
  t: number
  /** 膜电位轨迹（由 runLif / runFeedforward 真的算出来） */
  trace: readonly LifSample[]
  /** 发放时刻列表 */
  spikes: readonly number[]
  duration: number
  params?: LifParams
  showTrace?: boolean
}

/**
 * 一个生物神经元：树突、胞体、轴突、髓鞘、突触小体。
 *
 * 画它的时候刻意不把它做成一个方框开关：
 * 信号进入树突是连续的电流累加，轴突上跑的是一串尖锐的动作电位，
 * 突触处还要经过神经递质才能影响下一个细胞。
 */
export function NeuronFigure({ width, height, t, trace, spikes, duration, params = DEFAULT_LIF, showTrace = true }: NeuronFigureProps) {
  const somaX = width * 0.3
  const somaY = height * 0.56
  const somaR = Math.min(width, height) * 0.075
  const axonEndX = width * 0.94
  const dendrites = buildDendrites(height, somaX, somaY)
  const myelin = buildMyelin(somaX + somaR * 0.7, axonEndX - 6, 9)

  const potentials = trace.filter((s) => s.t <= t)
  const vNow = potentials.length > 0 ? potentials[potentials.length - 1].v : params.vRest
  // 距离阈值越近，胞体越亮：让「正在整合」这件事看得见
  const charge = Math.max(0, Math.min(1, (vNow - params.vRest) / (params.vThreshold - params.vRest)))

  // 动作电位：一串沿轴突向右跑的亮块
  const pulses: Array<{ x: number; y: number; r: number; a: number }> = []
  for (const at of spikes) {
    const age = t - at
    if (age < 0 || age > duration * 0.55) continue
    const p = age / (duration * 0.55)
    pulses.push({ x: somaX + somaR + (axonEndX - somaX - somaR) * p, y: somaY, r: somaR * (0.95 - 0.45 * p), a: 1 - p * 0.55 })
  }

  // 突触间隙里的神经递质：到达末端后才出现
  const transmitters: Array<{ x: number; y: number; a: number }> = []
  for (const at of spikes) {
    const reach = somaX + somaR + (axonEndX - somaX - somaR) * 0.99
    const arrive = duration * 0.55 * 0.99
    const age = t - at - arrive
    if (age < 0 || age > 22) continue
    const p = age / 22
    for (let i = 0; i < 5; i += 1) {
      const drift = ((i * 7 + at * 3) % 11) / 11
      const dy = (drift - 0.5) * 26
      const dx = reach + 6 + p * 26
      transmitters.push({ x: dx, y: somaY + dy * 0.5, a: (1 - p) * 0.9 })
    }
  }

  return (
    <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} className='block' role='img' aria-label='一个生物神经元的程序化示意图'>
      <defs>
        <radialGradient id='neuron-soma' cx='38%' cy='34%' r='72%'>
          <stop offset='0%' stopColor={BIO} stopOpacity={0.5 + 0.4 * charge} />
          <stop offset='70%' stopColor={BIO} stopOpacity={0.16} />
          <stop offset='100%' stopColor={DEEP} stopOpacity={0.9} />
        </radialGradient>
        <radialGradient id='neuron-halo' cx='50%' cy='50%' r='50%'>
          <stop offset='0%' stopColor={BIO} stopOpacity={0.26 * charge} />
          <stop offset='100%' stopColor={BIO} stopOpacity={0} />
        </radialGradient>
      </defs>

      {dendrites.map((d, i) => (
        <path key={i} d={d.d} fill='none' stroke={BIO} strokeOpacity={0.32 + 0.2 * charge} strokeWidth={d.w} strokeLinecap='round' />
      ))}
      {dendrites.flatMap((d, i) =>
        d.spines.map((s, j) => (
          <g key={i + '-' + j}>
            <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={BIO} strokeOpacity={0.24} strokeWidth={1.6} />
            <circle cx={s.x2} cy={s.y2} r={2.6} fill={BIO} opacity={0.32} />
          </g>
        )),
      )}

      {/* 轴突与髓鞘：髓鞘是生物神经元特有的结构，数字电路里没有对应物 */}
      <line x1={somaX + somaR * 0.7} y1={somaY} x2={axonEndX} y2={somaY} stroke={BIO} strokeOpacity={0.5} strokeWidth={3.2} strokeLinecap='round' />
      {myelin.map((my, i) => (
        <rect key={i} x={my.x0} y={somaY - 9} width={my.x1 - my.x0} height={18} rx={9} fill='none' stroke={SIGNAL} strokeOpacity={0.32} strokeWidth={2} />
      ))}

      <circle cx={somaX} cy={somaY} r={somaR * 2.6} fill='url(#neuron-halo)' />
      <circle cx={somaX} cy={somaY} r={somaR} fill='url(#neuron-soma)' stroke={BIO} strokeOpacity={0.7} strokeWidth={2} />
      <circle cx={somaX + somaR * 0.22} cy={somaY - somaR * 0.18} r={somaR * 0.3} fill={INK} opacity={0.5} />

      {pulses.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={p.r * 2.4} fill={BIO} opacity={p.a * 0.16} />
          <circle cx={p.x} cy={p.y} r={p.r} fill={INK} opacity={p.a * 0.92} />
          <circle cx={p.x} cy={p.y} r={p.r} fill='none' stroke={BIO} strokeWidth={2} opacity={p.a} />
        </g>
      ))}

      {/* 轴突末梢与突触小体 */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <path
            d={'M ' + axonEndX + ' ' + somaY + ' q ' + (16 + i * 4) + ' ' + (-26 + i * 26) + ' ' + (32 + i * 6) + ' ' + (-38 + i * 38)}
            fill='none'
            stroke={BIO}
            strokeOpacity={0.45}
            strokeWidth={2.4}
          />
          <circle cx={axonEndX + 32 + i * 6} cy={somaY - 38 + i * 38} r={6} fill='none' stroke={BIO} strokeOpacity={0.6} strokeWidth={2} />
        </g>
      ))}
      {transmitters.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={2.6} fill={AMBER_DOT} opacity={n.a} />
      ))}

      {showTrace ? <MembraneTrace width={width} height={height} trace={potentials} params={params} /> : null}
    </svg>
  )
}

const AMBER_DOT = '#ffc978'

/** 膜电位曲线：真实的 LIF 轨迹，不是画上去的装饰 */
export function MembraneTrace({ width, height, trace, params }: { width: number; height: number; trace: readonly LifSample[]; params: LifParams }) {
  const padX = width * 0.06
  // 曲线画在下半部分：上半部分留给树突与胞体，两者不要互相压住
  const top = height * 0.66
  const boxH = height * 0.2
  const lo = params.vRest - 8
  const hi = params.vThreshold + 6
  const toY = (v: number) => top + boxH - ((v - lo) / (hi - lo)) * boxH
  const path = trace.map((s, i) => (i === 0 ? 'M' : 'L') + (padX + (s.t / 120) * (width - padX * 2)).toFixed(1) + ' ' + toY(s.v).toFixed(1)).join(' ')
  return (
    <g>
      <line x1={padX} y1={toY(params.vThreshold)} x2={width - padX} y2={toY(params.vThreshold)} stroke={AMBER_DOT} strokeOpacity={0.4} strokeDasharray='8 8' strokeWidth={1.4} />
      <line x1={padX} y1={toY(params.vRest)} x2={width - padX} y2={toY(params.vRest)} stroke={MUTED} strokeOpacity={0.35} strokeDasharray='6 8' strokeWidth={1.2} />
      <text x={padX} y={toY(params.vThreshold) - 10} fill={AMBER_DOT} fontSize={26} fontFamily={MONO} opacity={0.8}>
        阈值 {params.vThreshold} mV
      </text>
      <text x={padX} y={toY(params.vRest) + 24} fill={MUTED} fontSize={26} fontFamily={MONO} opacity={0.7}>
        静息 {params.vRest} mV
      </text>
      <path d={path} fill='none' stroke={BIO} strokeWidth={2.4} strokeLinejoin='round' />
    </g>
  )
}

interface Dendrite {
  d: string
  w: number
  spines: Array<{ x1: number; y1: number; x2: number; y2: number }>
}

/**
 * 树突：从胞体向左分出五条枝，每条末端再二分，末端长满树突棘。
 * 几何全部由 soma 的位置与画面尺寸算出来，因此换任何尺寸都成立。
 */
export function buildDendrites(height: number, somaX: number, somaY: number): Dendrite[] {
  const span = Math.min(somaX, height * 0.44)
  const arms: Array<{ angle: number; length: number }> = [
    { angle: -2.5, length: 1.0 },
    { angle: -1.75, length: 0.92 },
    { angle: -1.05, length: 0.86 },
    { angle: -2.9, length: 0.62 },
    { angle: -0.62, length: 0.66 },
  ]
  const out: Dendrite[] = []
  for (const arm of arms) {
    const reach = span * arm.length
    const tipX = somaX + Math.cos(arm.angle) * reach
    const tipY = somaY + Math.sin(arm.angle) * reach
    const midX = somaX + Math.cos(arm.angle) * reach * 0.52
    const midY = somaY + Math.sin(arm.angle) * reach * 0.52
    const branches = [-0.42, 0.38]
    const spines: Dendrite['spines'] = []
    let d = 'M ' + somaX + ' ' + somaY + ' Q ' + midX + ' ' + midY + ' ' + tipX + ' ' + tipY
    for (const spread of branches) {
      const bAngle = arm.angle + spread
      const bTipX = tipX + Math.cos(bAngle) * reach * 0.34
      const bTipY = tipY + Math.sin(bAngle) * reach * 0.34
      d += ' M ' + tipX + ' ' + tipY + ' Q ' + (tipX + Math.cos(bAngle) * reach * 0.16) + ' ' + (tipY + Math.sin(bAngle) * reach * 0.16) + ' ' + bTipX + ' ' + bTipY
      for (let k = 1; k <= 3; k += 1) {
        const p = 0.3 + k * 0.22
        const bx = tipX + (bTipX - tipX) * p
        const by = tipY + (bTipY - tipY) * p
        spines.push({ x1: bx, y1: by, x2: bx + Math.cos(bAngle + 1.2) * 9, y2: by + Math.sin(bAngle + 1.2) * 9 })
      }
    }
    for (let k = 1; k <= 4; k += 1) {
      const p = k * 0.2
      const bx = somaX + (tipX - somaX) * p
      const by = somaY + (tipY - somaY) * p
      spines.push({ x1: bx, y1: by, x2: bx + Math.cos(arm.angle + 1.35) * 8, y2: by + Math.sin(arm.angle + 1.35) * 8 })
    }
    out.push({ d, w: 3, spines })
  }
  return out
}

/** 髓鞘节段：包在轴突外的一串鞘，生物神经元特有 */
export function buildMyelin(x0: number, x1: number, count: number): Array<{ x0: number; x1: number }> {
  const out: Array<{ x0: number; x1: number }> = []
  const step = (x1 - x0) / count
  for (let i = 0; i < count; i += 1) out.push({ x0: x0 + step * i + step * 0.08, x1: x0 + step * (i + 1) - step * 0.14 })
  return out
}
