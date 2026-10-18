/**
 * 漏电整合发放神经元（leaky integrate-and-fire）。
 *
 * 这一幕要说清一件容易被动画掩盖的事：生物神经元不是 0/1 开关。
 * 它的膜电位是一个连续变化的量，靠漏电、整合、阈值与不应期共同决定要不要发放。
 * 画面上那条起伏的电位曲线，就是这个模型真的算出来的轨迹，不是画上去的装饰。
 */

export interface LifParams {
  /** 膜时间常数（毫秒）：越大，漏电越慢 */
  tauM: number
  /** 静息电位（毫伏），约 -70 */
  vRest: number
  /** 发放阈值（毫伏），约 -55 */
  vThreshold: number
  /** 发放后重置到（毫伏），约 -70 */
  vReset: number
  /** 不应期（毫秒） */
  tRefractory: number
  /** 膜电阻与输入电流的换算（毫伏 / 任意输入单位） */
  gain: number
}

export const DEFAULT_LIF: LifParams = {
  tauM: 20,
  vRest: -70,
  vThreshold: -55,
  vReset: -70,
  tRefractory: 2,
  /** 单位输入电流带来的去极化速度（毫伏 / 毫秒） */
  gain: 2.2,
}

export interface LifSample {
  t: number
  v: number
  input: number
  spiked: boolean
}

/**
 * 推进一步。
 * 发放时把电位重置，并在随后 tRefractory 毫秒内不再发放 ——
 * 这段不应期是生物神经元与理想逻辑门最直观的差别之一。
 */
export function stepLif(
 v: number,
 input: number,
 refractoryLeft: number,
 params: LifParams,
 dt: number,
): { v: number; refractoryLeft: number; spiked: boolean } {
  if (refractoryLeft > 0) {
    const decayed = v + ((params.vRest - v) / params.tauM) * dt
    return { v: decayed, refractoryLeft: refractoryLeft - dt, spiked: false }
 }
 // 输入电流只取非负部分：抑制在演示里交给权重为负的突触，而不是靠负电流无限超极化
 const drive = params.gain * Math.max(0, input)
 const leak = ((params.vRest - v) / params.tauM) * dt
 // 膜电位不会无限往下掉：这里加一道下限，等价于分流抑制
 const next = Math.max(params.vRest - 4, v + leak + drive * dt)
 if (next >= params.vThreshold) {
   return { v: params.vReset, refractoryLeft: params.tRefractory, spiked: true }
 }
 return { v: next, refractoryLeft: 0, spiked: false }
}

export interface LifRun {
  trace: LifSample[]
  spikeTimes: number[]
}

/** 跑一整段输入，返回电位轨迹与发放时刻 */
export function runLif(
 input: (t: number) => number,
 duration: number,
 dt: number,
 params: LifParams = DEFAULT_LIF,
): LifRun {
  const trace: LifSample[] = []
  const spikeTimes: number[] = []
  let v = params.vRest
  let refractory = 0
  const steps = Math.round(duration / dt)
  for (let i = 0; i <= steps; i += 1) {
   const t = i * dt
   const current = input(t)
   const result = stepLif(v, current, refractory, params, dt)
   v = result.v
   refractory = result.refractoryLeft
   if (result.spiked) spikeTimes.push(t)
   trace.push({ t, v, input: current, spiked: result.spiked })
  }
  return { trace, spikeTimes }
}

/* ----------------------------------------------------------- 突触与网络 */

export interface NeuronNode {
  id: string
  /** 胞体位置（画面坐标） */
  x: number
  y: number
}

export interface Synapse {
  from: string
  to: string
  /** 权重：正为兴奋，负为抑制 */
  weight: number
}

export interface NetworkResult {
  traces: Record<string, number[]>
  spikes: Record<string, boolean[]>
  spikeTimes: Record<string, number[]>
}

/** 突触电流的时间常数（毫秒）：上游发放后，电位会缓缓退回去 */
export const TAU_SYNAPSE = 8

const synKey = (s: Synapse) => s.from + '->' + s.to

/**
 * 一个极简的前馈网络：同一套 LIF 模型在多个神经元上跑，突触权重决定输入电流。
 * 画面上「信号从树突进来、累加、过阈值、沿轴突传出去」讲的就是这件事。
 */
export function runFeedforward(
  layers: readonly NeuronNode[][],
  synapses: readonly Synapse[],
  duration: number,
  dt: number,
  params: LifParams = DEFAULT_LIF,
): NetworkResult {
  const steps = Math.round(duration / dt)
  const v: Record<string, number> = {}
  const refractory: Record<string, number> = {}
  const traces: Record<string, number[]> = {}
  const spikes: Record<string, boolean[]> = {}
  const spikeTimes: Record<string, number[]> = {}
  for (const layer of layers) {
    for (const n of layer) {
      v[n.id] = params.vRest
      refractory[n.id] = 0
      traces[n.id] = []
      spikes[n.id] = []
      spikeTimes[n.id] = []
    }
  }

  // 每个突触一条持续衰减的电流：上游每发放一次就加一笔电荷，然后慢慢漏掉
  const current: Record<string, number> = {}
  for (const s of synapses) current[synKey(s)] = 0
  const decay = Math.exp(-dt / TAU_SYNAPSE)

  for (let i = 0; i <= steps; i += 1) {
    const t = i * dt
    const fire: Record<string, boolean> = {}
    layers.forEach((layer, depth) => {
      for (const n of layer) {
        let input = 0
        for (const s of synapses) {
          if (s.to !== n.id) continue
          input += current[synKey(s)] ?? 0
        }
        // 第一层接受外界输入：一段有节律的持续驱动（范围 0.1 到 1.1）
        if (depth === 0) input += 0.6 + 0.5 * Math.sin((t / duration) * Math.PI * 6)
        const result = stepLif(v[n.id], input, refractory[n.id], params, dt)
        v[n.id] = result.v
        refractory[n.id] = result.refractoryLeft
        fire[n.id] = result.spiked
      }
    })
    // 上游本步发放，就给它的下游突触电流加一笔；随后所有电流按时间常数衰减
    for (const s of synapses) {
      const key = synKey(s)
      if (fire[s.from]) current[key] = (current[key] ?? 0) + s.weight
      current[key] = (current[key] ?? 0) * decay
    }
    for (const layer of layers) {
      for (const n of layer) {
        traces[n.id].push(v[n.id])
        spikes[n.id].push(fire[n.id] === true)
        if (fire[n.id]) spikeTimes[n.id].push(t)
      }
    }
  }
  return { traces, spikes, spikeTimes }
}
