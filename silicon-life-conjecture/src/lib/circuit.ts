/**
 * 逻辑电路：真值表、全加器、四位行波进位加法器。
 *
 * 这一幕的电路不是装饰 —— 画面上每一个门的输出、每一根进位线，
 * 都来自这里真的布尔运算。输入 a + b 的结果与 TypeScript 的加法结果必须一致，
 * 测试里就是这么验的。
 */

export type Bit = 0 | 1

export const NOT = (a: Bit): Bit => (a ? 0 : 1)
export const AND = (a: Bit, b: Bit): Bit => (a && b ? 1 : 0)
export const OR = (a: Bit, b: Bit): Bit => (a || b ? 1 : 0)
export const XOR = (a: Bit, b: Bit): Bit => (a || b) && !(a && b) ? 1 : 0

export interface TruthRow {
  a: Bit
  b: Bit
  notA: Bit
  and: Bit
  or: Bit
  xor: Bit
}

/** NOT / AND / OR / XOR 的完整真值表 —— 画面上那张表就是它 */
export const GATE_TRUTH: readonly TruthRow[] = [0, 1].flatMap((a) =>
  [0, 1].map((b) => ({
    a: a as Bit,
    b: b as Bit,
    notA: NOT(a as Bit),
    and: AND(a as Bit, b as Bit),
    or: OR(a as Bit, b as Bit),
    xor: XOR(a as Bit, b as Bit),
  })),
)

export interface HalfAdder {
  sum: Bit
  carry: Bit
}

/** 半加器：和 = a XOR b，进位 = a AND b */
export function halfAdder(a: Bit, b: Bit): HalfAdder {
  return { sum: XOR(a, b), carry: AND(a, b) }
}

export interface FullAdder {
  sum: Bit
  /** 向更高一位传出去的进位 */
  cout: Bit
}

/** 全加器：两个加数加上来自低一位的进位 cin */
export function fullAdder(a: Bit, b: Bit, cin: Bit): FullAdder {
  const first = halfAdder(a, b)
  const second = halfAdder(first.sum, cin)
  return { sum: second.sum, cout: OR(first.carry, second.carry) }
}

export interface RippleAdder {
  /** 每一位全加器的输出，进位线就是画面上那条链 */
  stages: FullAdder[]
  sum: number
  cout: Bit
}

/**
 * 四位行波进位加法器。
 * 每一位都要等低位传来的进位，所以进位是一级一级传播的 ——
 * 这正是「局部连接加在一起，完成单个单元做不到的事」的最小实例。
 */
export function rippleAdd4(a: number, b: number): RippleAdder {
  const stages: FullAdder[] = []
  let carry: Bit = 0
  let sum = 0
  for (let i = 0; i < 4; i += 1) {
    const ai = ((a >> i) & 1) as Bit
    const bi = ((b >> i) & 1) as Bit
    const fa = fullAdder(ai, bi, carry)
    stages.push(fa)
    carry = fa.cout
    sum |= fa.sum << i
  }
  return { stages, sum, cout: carry }
}

export const bitsOf = (n: number, width = 4): Bit[] => {
  const out: Bit[] = []
  for (let i = 0; i < width; i += 1) out.push(((n >> i) & 1) as Bit)
  return out
}

export const fromBits = (bits: readonly Bit[]): number => bits.reduce<number>((acc, b, i) => acc | (b << i), 0)

/* -------------------------------------------------- 电压：0 与 1 的物理基础 */

export interface VoltageRail {
  /** 电源轨，伏特 */
  vdd: number
  /** 地轨，伏特 */
  gnd: number
}

export const RAIL: VoltageRail = { vdd: 1.8, gnd: 0 }

/**
 * 数字电路里的电压不是一个点，而是一个范围。
 * 接收端只保证「高于这个门限算 1，低于那个门限算 0」，中间那段是噪声容限。
 * 所以 0 和 1 是对连续物理量的一种数字化约定，不是世界本身只有两种状态。
 */
export interface LogicLevel {
  volts: number
  /** 未定义区里这个值既不算 0 也不算 1，所以是 null */
  bit: Bit | null
  state: 'strong-0' | 'weak-0' | 'undefined' | 'weak-1' | 'strong-1'
}

export function readLevel(volts: number, rail: VoltageRail = RAIL): LogicLevel {
 const mid = (rail.vdd + rail.gnd) / 2
 if (volts <= rail.gnd + (mid - rail.gnd) * 0.3) return { volts, bit: 0, state: 'strong-0' }
 if (volts < mid - (mid - rail.gnd) * 0.12) return { volts, bit: 0, state: 'weak-0' }
  if (volts <= mid + (rail.vdd - mid) * 0.12) return { volts, bit: null, state: 'undefined' }
 if (volts < rail.vdd - (rail.vdd - mid) * 0.3) return { volts, bit: 1, state: 'weak-1' }
 return { volts, bit: 1, state: 'strong-1' }
}

/** 演示用的电压扫描：从 0 扫到电源轨，看模拟量在哪里被切成 0 和 1 */
export const VOLTAGE_SWEEP: readonly number[] = Array.from({ length: 61 }, (_, i) => (RAIL.vdd * i) / 60)
