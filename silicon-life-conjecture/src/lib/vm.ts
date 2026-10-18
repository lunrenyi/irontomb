/**
 * 一台真的能跑指令的微型计算机模型。
 *
 * 第四幕画面上看到的每一次信号流过总线，背后都是这里的一次 microStep()。
 * 画面不是随机流光：PC、MAR、IR、寄存器、内存、ALU 的每一次变化，
 * 都是这台机器的状态真的变了。同一段程序在网页里跑和导出到视频里跑，结果必须一致。
 */

export type Reg = 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9'

export const REGISTERS: readonly Reg[] = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9']

export type Op =
  | 'LOADI'
  | 'LOADM'
  | 'LOADMR'
  | 'STORE'
  | 'STORER'
  | 'MOV'
  | 'ADD'
  | 'ADDI'
  | 'SUB'
  | 'SUBI'
  | 'MUL'
  | 'MULI'
  | 'CMP'
  | 'JZ'
  | 'JNZ'
  | 'JL'
  | 'JGE'
  | 'JMP'
  | 'OUT'
  | 'HALT'

/** 走线上会亮起来的控制信号，名字与教科书里的数据通路控制信号一致 */
export type Signal =
  | 'PCout'
  | 'MARin'
  | 'MemRead'
  | 'MDRin'
  | 'MDRout'
  | 'IRin'
  | 'IRout'
  | 'ControlDecode'
  | 'ALUA'
  | 'ALUB'
  | 'ALUexec'
  | 'ALUout'
  | 'RegWrite'
  | 'MemWrite'
  | 'OutWrite'
  | 'PCinc'

export const SIGNAL_LABELS: Record<Signal, string> = {
  PCout: 'PC 输出',
  MARin: 'MAR 接收',
  MemRead: '读内存',
  MDRin: 'MDR 接收',
  MDRout: 'MDR 输出',
  IRin: 'IR 接收',
  IRout: 'IR 输出',
  ControlDecode: '控制单元译码',
  ALUA: 'A 总线进 ALU',
  ALUB: 'B 总线进 ALU',
  ALUexec: 'ALU 计算',
  ALUout: 'ALU 结果上总线',
  RegWrite: '写寄存器',
  MemWrite: '写内存',
  OutWrite: '写输出设备',
  PCinc: 'PC 自增',
}

export const ALL_SIGNALS: readonly Signal[] = Object.keys(SIGNAL_LABELS) as Signal[]

export interface Instr {
  op: Op
  rd?: Reg
  rs?: Reg
  rs2?: Reg
  imm?: number
  addr?: number
  target?: number
  targetLabel?: string
  /** 反汇编文本：画面上的指令列表用的就是它 */
  text: string
  /** 源码行号（从 0 开始，注释与空行不占位） */
  line: number
}

export interface Program {
  id: string
  name: string
  caption: string
  kind: string
  source: string
  data: Record<number, number>
  code: Instr[]
  /** 内存里值得在画面上显示的地址段 */
  windows: Array<{ start: number; length: number; label: string }>
  outputAs?: 'number' | 'text' | 'bits' | 'class'
}

/* --------------------------------------------------------------- 汇编器 */

const REG_SET = new Set<string>(REGISTERS)

type Operand = { kind: 'reg'; reg: Reg } | { kind: 'imm'; value: number } | { kind: 'label'; name: string }

function parseOperand(raw: string): Operand {
  const token = raw.replace(/,/g, '').trim()
  if (REG_SET.has(token)) return { kind: 'reg', reg: token as Reg }
  if (token.startsWith('#')) return { kind: 'imm', value: Number(token.slice(1)) }
  if (/^-?\d+$/.test(token)) return { kind: 'imm', value: Number(token) }
  return { kind: 'label', name: token }
}

export class AsmError extends Error {}

interface Emitted {
  op: Op
  args: string[]
  line: number
}

/**
 * 两遍汇编：先把 label 记成「下一条指令的下标」，再回填跳转目标。
 * 于是画面上的汇编代码和机器真正执行的是同一份东西。
 */
export function assemble(source: string): Instr[] {
  const lines = source.split('\n')
  const labelAt = new Map<string, number>()
  const emitted: Emitted[] = []

  lines.forEach((raw, index) => {
    const code = raw.replace(/;.*$/, '').trim()
    if (!code) return
    if (code.endsWith(':')) {
      const name = code.slice(0, -1).trim()
      if (!name) throw new AsmError('第 ' + (index + 1) + ' 行：空的标号')
      labelAt.set(name, emitted.length)
      return
    }
    const parts = code.split(/\s+/)
    emitted.push({ op: parts[0].toUpperCase() as Op, args: parts.slice(1), line: index })
  })

  return emitted.map((item) => buildInstr(item, labelAt))
}

function need(args: string[], i: number, line: number): string {
  const value = args[i]
  if (value === undefined) throw new AsmError('第 ' + (line + 1) + ' 行：操作数不够')
  return value
}

function reg(args: string[], i: number, line: number): Reg {
  const parsed = parseOperand(need(args, i, line))
  if (parsed.kind !== 'reg') throw new AsmError('第 ' + (line + 1) + ' 行：这里需要一个寄存器')
  return parsed.reg
}

function imm(args: string[], i: number, line: number): number {
  const parsed = parseOperand(need(args, i, line))
  if (parsed.kind !== 'imm') throw new AsmError('第 ' + (line + 1) + ' 行：这里需要一个数字')
  return parsed.value
}

function targetOf(args: string[], i: number, line: number, labelAt: Map<string, number>) {
  const parsed = parseOperand(need(args, i, line))
  if (parsed.kind !== 'label') throw new AsmError('第 ' + (line + 1) + ' 行：跳转需要一个标号')
  const at = labelAt.get(parsed.name)
  if (at === undefined) throw new AsmError('第 ' + (line + 1) + ' 行：找不到标号 ' + parsed.name)
  return { target: at, targetLabel: parsed.name }
}

function buildInstr(item: Emitted, labelAt: Map<string, number>): Instr {
  const { op, args, line } = item
  const base: Instr = { op, text: '', line }
  switch (op) {
    case 'LOADI': {
      const rd = reg(args, 0, line)
      const value = imm(args, 1, line)
      return { ...base, rd, imm: value, text: 'LOADI ' + rd + ', #' + value }
    }
    case 'LOADM': {
      const rd = reg(args, 0, line)
      const a = imm(args, 1, line)
      return { ...base, rd, addr: a, text: 'LOADM ' + rd + ', ' + a }
    }
    case 'LOADMR': {
      const rd = reg(args, 0, line)
      const rs = reg(args, 1, line)
      return { ...base, rd, rs, text: 'LOADMR ' + rd + ', ' + rs }
    }
    case 'STORE': {
      const rs = reg(args, 0, line)
      const a = imm(args, 1, line)
      return { ...base, rs, addr: a, text: 'STORE ' + rs + ', ' + a }
    }
    case 'STORER': {
      const rs = reg(args, 0, line)
      const rs2 = reg(args, 1, line)
      return { ...base, rs, rs2, text: 'STORER ' + rs + ', ' + rs2 }
    }
    case 'MOV': {
      const rd = reg(args, 0, line)
      const rs = reg(args, 1, line)
      return { ...base, rd, rs, text: 'MOV ' + rd + ', ' + rs }
    }
    case 'ADD':
    case 'SUB':
    case 'MUL': {
      const rd = reg(args, 0, line)
      const rs = reg(args, 1, line)
      return { ...base, rd, rs, text: op + ' ' + rd + ', ' + rs }
    }
    case 'ADDI':
    case 'SUBI':
    case 'MULI': {
      const rd = reg(args, 0, line)
      const value = imm(args, 1, line)
      return { ...base, rd, imm: value, text: op + ' ' + rd + ', #' + value }
    }
    case 'CMP': {
      const rs = reg(args, 0, line)
      const second = parseOperand(need(args, 1, line))
      if (second.kind === 'reg') return { ...base, rs, rs2: second.reg, text: 'CMP ' + rs + ', ' + second.reg }
      if (second.kind === 'imm') return { ...base, rs, imm: second.value, text: 'CMP ' + rs + ', #' + second.value }
      throw new AsmError('第 ' + (line + 1) + ' 行：CMP 的第二个操作数必须是寄存器或数字')
    }
    case 'JZ':
    case 'JNZ':
    case 'JL':
    case 'JGE':
    case 'JMP': {
      const jump = targetOf(args, 0, line, labelAt)
      return { ...base, ...jump, text: op + ' ' + jump.targetLabel }
    }
    case 'OUT': {
      const rs = reg(args, 0, line)
      return { ...base, rs, text: 'OUT ' + rs }
    }
    case 'HALT':
      return { ...base, text: 'HALT' }
    default:
      throw new AsmError('第 ' + (line + 1) + ' 行：不认识的指令 ' + op)
  }
}

/* ------------------------------------------------------------- 机器状态 */

export type Phase = 'fetch' | 'decode' | 'execute' | 'write' | 'output'

export const PHASE_ORDER: readonly Phase[] = ['fetch', 'decode', 'execute', 'write', 'output']

export const PHASE_INFO: Record<Phase, { index: number; name: string; ask: string }> = {
  fetch: { index: 0, name: '取指令', ask: 'CPU 到内存里把这条指令读出来，放进指令寄存器' },
  decode: { index: 1, name: '译码', ask: '控制单元读懂这条指令，决定哪几根控制线要拉高' },
  execute: { index: 2, name: '执行', ask: '运算器按操作码做计算，或者把数据送上总线' },
  write: { index: 3, name: '写回', ask: '结果写进寄存器或内存，程序计数器指到下一条' },
  output: { index: 4, name: '输出', ask: '需要的话把结果交给输出设备，指令到此结束' },
}

export interface Machine {
  program: Program
  memory: number[]
  pc: number
  regs: Record<Reg, number>
  flags: { zero: boolean; negative: boolean }
  /** 指令寄存器：当前正在执行的指令 */
  ir: Instr | null
  /** 内存地址寄存器 / 内存数据寄存器 */
  mar: number
  mdr: number
  phase: Phase
  /** 已完成的指令数 */
  instructionCount: number
  /** 已执行的微阶段数 */
  microCount: number
  alu: { a: number; b: number; op: Op | null; result: number; busy: boolean }
  output: number[]
  halted: boolean
  /** 本个微阶段点亮了哪些控制线 */
  control: Partial<Record<Signal, boolean>>
  /** 刚刚完成的是哪个微阶段（画面上的阶段指示读它） */
  lastPhase: Phase
  /** 本个微阶段实际发生了什么，写下来给画面上的说明用 */
  note: string
}

const MEMORY_SIZE = 256

export function createMachine(program: Program): Machine {
  const memory = new Array<number>(MEMORY_SIZE).fill(0)
  for (const [address, value] of Object.entries(program.data)) memory[Number(address)] = value
  const regs = {} as Record<Reg, number>
  for (const r of REGISTERS) regs[r] = 0
  return {
    program,
    memory,
    pc: 0,
    regs,
    flags: { zero: false, negative: false },
    ir: null,
    mar: 0,
    mdr: 0,
    phase: 'fetch',
    instructionCount: 0,
    microCount: 0,
    alu: { a: 0, b: 0, op: null, result: 0, busy: false },
    output: [],
    halted: false,
    control: {},
    lastPhase: 'fetch',
    note: '内存里已经放好了程序与数据，等 CPU 来取。',
  }
}

const read = (m: Machine, r: Reg | undefined): number => (r === undefined ? 0 : m.regs[r])
const readMem = (m: Machine, address: number): number => {
  const a = Math.trunc(address)
  return a < 0 || a >= m.memory.length ? 0 : m.memory[a]
}

function writeMem(m: Machine, address: number, value: number): void {
  const a = Math.trunc(address)
  if (a < 0 || a >= m.memory.length) return
  m.memory[a] = value
}

function clone(m: Machine): Machine {
  return {
    ...m,
    memory: m.memory.slice(),
    regs: { ...m.regs },
    flags: { ...m.flags },
    alu: { ...m.alu },
    output: m.output.slice(),
    control: { ...m.control },
  }
}

/** 比较并写标志位：CMP 的作用就在这里 */
function setFlags(m: Machine, a: number, b: number): void {
  const diff = a - b
  m.flags.zero = diff === 0
  m.flags.negative = diff < 0
}

/** 运算器真正做的事：加、减、乘。就这三种，所以把它画成一个方块就够了。 */
function aluCompute(op: Op, a: number, b: number): number {
  if (op === 'ADD' || op === 'ADDI') return a + b
  if (op === 'SUB' || op === 'SUBI') return a - b
  if (op === 'MUL' || op === 'MULI') return a * b
  return b
}

function isJump(instr: Instr): boolean {
  return instr.op === 'JZ' || instr.op === 'JNZ' || instr.op === 'JL' || instr.op === 'JGE' || instr.op === 'JMP'
}

function isArithmetic(op: Op): boolean {
  return op === 'ADD' || op === 'ADDI' || op === 'SUB' || op === 'SUBI' || op === 'MUL' || op === 'MULI'
}

/** 一个微阶段里拉高哪些控制线：画面上亮起来的就是这里返回的集合。 */
export function controlFor(phase: Phase, instr: Instr | null): Partial<Record<Signal, boolean>> {
  const out: Partial<Record<Signal, boolean>> = {}
  if (!instr) return out
  switch (phase) {
    case 'fetch':
      out.PCout = true
      out.MARin = true
      out.MemRead = true
      out.MDRin = true
      out.IRin = true
      break
    case 'decode':
      out.IRout = true
      out.ControlDecode = true
      break
    case 'execute':
      if (instr.op === 'LOADM' || instr.op === 'LOADMR') out.MemRead = true
      out.ALUA = true
      out.ALUB = true
      out.ALUexec = true
      break
    case 'write':
      if (instr.op === 'STORE' || instr.op === 'STORER') out.MemWrite = true
      else out.ALUout = true
      if (isArithmetic(instr.op) || instr.op === 'LOADI' || instr.op === 'LOADM' || instr.op === 'LOADMR' || instr.op === 'MOV') {
        out.RegWrite = true
      }
      out.PCinc = true
      break
    case 'output':
      if (instr.op === 'OUT') {
        out.MDRout = true
        out.OutWrite = true
      }
      break
  }
  return out
}

/** execute 阶段：把两个操作数送进运算器，结果暂存在 alu.result，等 write 阶段写回 */
function executePhase(m: Machine, instr: Instr): void {
  const a = read(m, instr.rd ?? instr.rs)
  const b =
    instr.op === 'LOADM'
      ? readMem(m, instr.addr ?? 0)
      : instr.op === 'LOADMR'
        ? readMem(m, read(m, instr.rs))
        : (instr.imm ?? read(m, instr.rs2 ?? instr.rs))
  m.alu.a = a
  m.alu.b = b
  m.alu.op = instr.op
  switch (instr.op) {
    case 'LOADI':
      m.alu.result = instr.imm ?? 0
      m.note = '把常数 ' + (instr.imm ?? 0) + ' 装进 ' + instr.rd
      break
    case 'LOADM':
      m.alu.result = readMem(m, instr.addr ?? 0)
      m.note = '按地址 ' + (instr.addr ?? 0) + ' 从内存取出 ' + m.alu.result + '，准备写进 ' + instr.rd
      break
    case 'LOADMR':
      m.alu.result = b
      m.note = '用 ' + instr.rs + ' 里的地址间接取数，得到 ' + b + '，准备写进 ' + instr.rd
      break
    case 'MOV':
      m.alu.result = b
      m.note = instr.rs + ' = ' + b + '，搬到 ' + instr.rd
      break
    case 'ADD':
    case 'ADDI':
    case 'SUB':
    case 'SUBI':
    case 'MUL':
    case 'MULI':
      m.alu.result = aluCompute(instr.op, a, b)
      m.note = a + ' ' + symbolOf(instr.op) + ' ' + b + ' = ' + m.alu.result
      break
    case 'CMP':
      setFlags(m, a, b)
      m.alu.result = a
      m.note = '比较 ' + a + ' 与 ' + b + '：' + (a === b ? '相等' : a < b ? '更小' : '更大') + '（只改标志位，不写回数据）'
      break
    case 'STORE':
      m.alu.result = a
      m.note = '准备把 ' + a + ' 写进内存地址 ' + (instr.addr ?? 0)
      break
    case 'STORER':
      m.alu.result = a
      m.note = '准备把 ' + a + ' 写进 ' + instr.rs2 + ' 指向的内存地址 ' + read(m, instr.rs2)
      break
    case 'OUT':
      m.alu.result = a
      m.note = '准备把 ' + a + ' 送到输出设备'
      break
    default:
      m.alu.result = a
      m.note = '控制单元会决定下一步跳到哪里。'
  }
}

function symbolOf(op: Op): string {
  if (op === 'ADD' || op === 'ADDI') return '+'
  if (op === 'SUB' || op === 'SUBI') return '-'
  return 'x'
}

/** write 阶段：真正把结果落到寄存器或内存里，并且可能改写 PC */
function writePhase(m: Machine, instr: Instr): void {
  const result = m.alu.result
  switch (instr.op) {
    case 'STORE':
      writeMem(m, instr.addr ?? 0, result)
      m.pc = m.pc + 1
      m.note = '内存[' + (instr.addr ?? 0) + '] <- ' + result + '（写回内存）'
      break
    case 'STORER':
      writeMem(m, read(m, instr.rs2), result)
      m.pc = m.pc + 1
      m.note = '内存[' + read(m, instr.rs2) + '] <- ' + result + '（按地址间接写回）'
      break
    case 'CMP':
      m.pc = m.pc + 1
      m.note = '标志位：zero = ' + m.flags.zero + '，negative = ' + m.flags.negative
      break
    case 'HALT':
      m.halted = true
      m.note = 'HALT：机器停下来。'
      break
    default: {
      const taken = jumpTaken(instr, m.flags)
      if (taken !== null) {
        m.pc = taken
        m.note = '跳转成立，程序计数器 <- ' + taken + '（' + instr.targetLabel + '）'
        return
      }
      if (isJump(instr)) {
        m.pc = m.pc + 1
        m.note = '条件不成立，不跳转，程序计数器指向下一条。'
        return
      }
      if (instr.rd) m.regs[instr.rd] = result
      m.pc = m.pc + 1
      m.note = (instr.rd ? instr.rd + ' <- ' + result + '；' : '') + '程序计数器 <- ' + m.pc
    }
  }
}

function jumpTaken(instr: Instr, flags: { zero: boolean; negative: boolean }): number | null {
  if (instr.target === undefined) return null
  switch (instr.op) {
    case 'JMP':
      return instr.target
    case 'JZ':
      return flags.zero ? instr.target : null
    case 'JNZ':
      return flags.zero ? null : instr.target
    case 'JL':
      return flags.negative ? instr.target : null
    case 'JGE':
      return flags.negative ? null : instr.target
    default:
      return null
  }
}

/** output 阶段：把结果交给输出设备，或者什么都不做 */
function outputPhase(m: Machine, instr: Instr): void {
  if (instr.op === 'OUT') {
    const value = m.regs[instr.rs ?? 'R0']
    m.output.push(value)
    m.note = '输出设备收到 ' + value + '。'
  } else if (instr.op === 'HALT') {
    m.note = '程序结束。输出设备上的内容就是这段程序的全部结果。'
  } else {
    m.note = '这条指令不产生输出，继续下一条。'
  }
}

/**
 * 推进一个微阶段。
 * 每条指令固定走取指 -> 译码 -> 执行 -> 写回 -> 输出五步，
 * 与第四幕在画面上标出的五步一一对应。返回新状态，绝不原地修改。
 */
export function microStep(m: Machine): Machine {
  if (m.halted) return m
  const next = clone(m)
  const instr = m.ir
  const executedPhase = m.phase
  const executedInstr = executedPhase === 'fetch' ? (m.program.code[m.pc] ?? null) : instr

  if (executedPhase === 'fetch') {
    const at = m.program.code[m.pc]
    if (!at) {
      next.halted = true
      next.note = '程序计数器越过程序末尾，机器停下来。'
      next.control = {}
      return next
    }
    next.mar = m.pc
    next.mdr = m.pc
    next.ir = at
    next.phase = 'decode'
    next.note = '从内存第 ' + m.pc + ' 条取出 ' + at.text
  } else if (executedPhase === 'decode') {
    next.phase = 'execute'
    next.note = '控制单元译码 ' + (instr ? instr.op : '') + '，确定数据通路上要打开哪几条通路。'
  } else if (executedPhase === 'execute') {
    if (instr) executePhase(next, instr)
    next.phase = 'write'
  } else if (executedPhase === 'write') {
    if (instr) writePhase(next, instr)
    next.phase = 'output'
  } else {
    if (instr) outputPhase(next, instr)
    next.instructionCount += 1
    next.ir = null
    next.phase = 'fetch'
  }

  next.microCount += 1
  next.lastPhase = executedPhase
  next.control = next.halted ? {} : controlFor(executedPhase, executedInstr)
  next.alu.busy = next.control.ALUexec === true
  return next
}

/**
 * 一直跑到这一条指令结束为止（也就是下一次取指之前）。
 * 判据是「回到 fetch 阶段」，而不是数微阶段个数 —— 后者会顺带把下一条指令也跑掉一半。
 */
export function stepInstruction(m: Machine, maxMicro = 8): Machine {
  let current = m
  for (let i = 0; i < maxMicro; i += 1) {
    if (current.halted) return current
    if (current.phase === 'fetch' && current.microCount > m.microCount) return current
    current = microStep(current)
  }
  return current
}

/** 跑到程序结束为止（带硬上限，避免程序写错时把页面卡死） */
export function runToEnd(m: Machine, maxMicro = 20000): Machine {
  let current = m
  let guard = 0
  while (!current.halted && guard < maxMicro) {
    current = microStep(current)
    guard += 1
  }
  return current
}

/* ----------------------------------------------------------------- 程序 */

function makeProgram(spec: Omit<Program, 'code'>): Program {
  return { ...spec, code: assemble(spec.source) }
}

const SUM_SOURCE = [
  '; 加法：整部短片的主角。程序就是内存里的一串数字。',
  '      LOADI R0, #12        ; R0 <- 12',
  '      LOADI R1, #30        ; R1 <- 30',
  '      ADD  R0, R1          ; R0 <- R0 + R1   硬件在这里做了一次加法',
  '      STORE R0, 32         ; 内存[32] <- R0   写回内存',
  '      OUT  R0              ; 结果送到输出设备',
  '      HALT',
].join('\n')

const LOOP_SOURCE = [
  '; 计算器：一段带循环的真程序，求 1 + 2 + ... + 10。',
  '; 循环靠比较与跳转实现：跑完一轮就问一次「加够了吗」。',
  '      LOADI R0, #0         ; 累加器 = 0',
  '      LOADI R1, #1         ; 当前加数 = 1',
  '      LOADI R3, #11        ; 上界（1..10）',
  'loop:',
  '      ADD  R0, R1          ; 累加',
  '      ADDI R1, #1          ; 加数 + 1',
  '      CMP  R1, R3          ; 只改标志位，不动数据',
  '      JL   loop            ; 还小就跳回去继续',
  '      OUT  R0              ; 否则输出',
  '      HALT',
].join('\n')

const IMAGE_SOURCE = [
  '; 图像处理：把 4 个像素的亮度二值化（>=128 记 1，否则记 0）。',
  '; 用的仍然是同一台机器、同样的取指译码执行写回。',
  '      LOADI R0, #40        ; 地址指针，从内存 40 号像素开始',
  '      LOADI R1, #4         ; 还剩几个像素',
  '      LOADI R2, #128       ; 阈值',
  '      LOADI R3, #1         ; 亮 = 1',
  '      LOADI R4, #0         ; 暗 = 0',
  '      LOADI R6, #0         ; 结果位串',
  'loop:',
  '      LOADMR R5, R0        ; x <- 内存[地址]',
  '      CMP   R5, R2',
  '      JL    dark           ; 亮度不够 -> 记 0',
  '      MOV   R7, R3         ; 否则记 1',
  '      JMP   put',
  'dark:',
  '      MOV   R7, R4',
  'put:',
  '      STORER R7, R0        ; 把像素本身改写成 0 / 1',
  '      MULI  R6, #2         ; 结果左移一位',
  '      ADD   R6, R7         ; 拼上新的这一位',
  '      ADDI  R0, #1',
  '      ADDI  R1, #-1',
  '      CMP   R1, #0',
  '      JZ    done',
  '      JMP   loop',
  'done:',
  '      OUT   R6',
  '      HALT',
].join('\n')

const TEXT_SOURCE = [
  '; 文字生成：字符本身就是整数，用同一个加法器算出来。',
  '; 字母 A 是 65，所以 A + n 就得到第 n 个字母。',
  '      LOADI R0, #19',
  '      ADDI  R0, #64        ; 19 + 64 = 83 = S',
  '      OUT   R0',
  '      LOADI R0, #9',
  '      ADDI  R0, #64        ; 9 + 64 = 73 = I',
  '      OUT   R0',
  '      LOADI R0, #12',
  '      ADDI  R0, #64        ; 12 + 64 = 76 = L',
  '      OUT   R0',
  '      LOADI R0, #9',
  '      ADDI  R0, #64        ; I',
  '      OUT   R0',
  '      LOADI R0, #3',
  '      ADDI  R0, #64        ; C',
  '      OUT   R0',
  '      LOADI R0, #15',
  '      ADDI  R0, #64        ; O',
  '      OUT   R0',
  '      LOADI R0, #14',
  '      ADDI  R0, #64        ; N',
  '      OUT   R0',
  '      HALT',
].join('\n')

const INFERENCE_SOURCE = [
  '; 人工智能推理：一个真的三分类打分（特征点积 + 偏置，取最高分）。',
  '; 权重放大了 100 倍以保持整数运算；真实推理用浮点数，原理相同。',
  ';   输入特征 x 在内存 [40,41,42]',
  ';   权重 W 在内存 [50..58]（3 类 x 3 特征，行优先）',
  ';   偏置 b 在内存 [60,61,62]',
  '      LOADI R0, #0         ; c  当前算第几类',
  '      LOADI R7, #-9999     ; best 目前最高分',
  '      LOADI R8, #0         ; bestClass',
  'outer:',
  '      LOADI R6, #3',
  '      MUL  R6, R0          ; 3c',
  '      ADDI R6, #50         ; base = 50 + 3c，本类权重首地址',
  '      LOADI R2, #0         ; acc = 0',
  '      LOADI R1, #0         ; f = 0',
  'inner:',
  '      LOADI R3, #40',
  '      ADD  R3, R1',
  '      LOADMR R4, R3        ; x  <- 内存[40+f]',
  '      LOADI R3, #0',
  '      ADD  R3, R6',
  '      ADD  R3, R1',
  '      LOADMR R5, R3        ; w  <- 内存[base+f]',
  '      MUL  R4, R5',
  '      ADD  R2, R4          ; acc += x * w',
  '      ADDI R1, #1',
  '      LOADI R3, #3',
  '      CMP  R1, R3',
  '      JL   inner',
  '      LOADI R3, #60',
  '      ADD  R3, R0',
  '      LOADMR R5, R3        ; 取出这一类的偏置',
  '      ADD  R2, R5          ; 分数 = 点积 + 偏置',
  '      CMP  R2, R7',
  '      JL   nextc           ; 分数不够高就不更新',
  '      MOV  R7, R2          ; best = 分数',
  '      MOV  R8, R0          ; bestClass = c',
  'nextc:',
  '      ADDI R0, #1',
  '      LOADI R3, #3',
  '      CMP  R0, R3',
  '      JL   outer',
  '      OUT  R8              ; 输出得分最高的类别编号',
  '      HALT',
].join('\n')

export const PROGRAMS: Program[] = [
  makeProgram({
    id: 'sum',
    name: '两数相加',
    kind: '计算',
    caption: '程序在内存里，CPU 把它一条条取出来执行，最后把 42 交给输出设备。',
    source: SUM_SOURCE,
    data: { 32: 0 },
    windows: [{ start: 32, length: 1, label: '结果' }],
    outputAs: 'number',
  }),
  makeProgram({
    id: 'loop',
    name: '计算器 · 循环求和',
    kind: '计算',
    caption: '同一台机器，只因为程序多了一个循环，就把 1 到 10 加了起来。',
    source: LOOP_SOURCE,
    data: { 0: 0, 1: 0, 10: 0 },
    windows: [{ start: 0, length: 2, label: '累加与计数' }],
    outputAs: 'number',
  }),
  makeProgram({
    id: 'image',
    name: '图像 · 亮度二值化',
    kind: '图像处理',
    caption: '四个像素被逐个读取、比较、改写，最后输出一串位：1010。',
    source: IMAGE_SOURCE,
    data: { 40: 200, 41: 90, 42: 150, 43: 60 },
    windows: [{ start: 40, length: 4, label: '像素亮度' }],
    outputAs: 'bits',
  }),
  makeProgram({
    id: 'text',
    name: '文字 · 编码计算',
    kind: '文字生成',
    caption: '字母不过是整数。同一个加法器反复工作，就写出了 SILICON。',
    source: TEXT_SOURCE,
    data: {},
    windows: [],
    outputAs: 'text',
  }),
  makeProgram({
    id: 'inference',
    name: '推理 · 三分类打分',
    kind: '模型推理',
    caption: '嵌套循环、双数相乘求和、比较取最大 —— 这就是推理在硬件上真实发生的样子。',
    source: INFERENCE_SOURCE,
    data: {
      40: 1,
      41: 2,
      42: 3,
      50: 50,
      51: -20,
      52: 80,
      53: 10,
      54: 90,
      55: -40,
      56: -60,
      57: 30,
      58: 70,
      60: 0,
      61: 10,
      62: -20,
    },
    windows: [
      { start: 40, length: 3, label: '输入特征' },
      { start: 50, length: 9, label: '权重' },
      { start: 60, length: 3, label: '偏置' },
    ],
    outputAs: 'class',
  }),
]

export const programById = (id: string): Program => PROGRAMS.find((p) => p.id === id) ?? PROGRAMS[0]

/** 独立于虚拟机算一遍三分类分数，用来交叉验证机器算出来的结果 */
export function inferenceScores(program: Program): number[] {
  const x = [program.data[40] ?? 0, program.data[41] ?? 0, program.data[42] ?? 0]
  const scores: number[] = []
  for (let c = 0; c < 3; c += 1) {
    let sum = 0
    for (let f = 0; f < 3; f += 1) sum += x[f] * (program.data[50 + c * 3 + f] ?? 0)
    scores.push(sum + (program.data[60 + c] ?? 0))
  }
  return scores
}

/** softmax 只用在这里：把整数分数换算成概率，给画面上一层模型输出的读数 */
export function softmax(scores: readonly number[]): number[] {
  const scaled = scores.map((s) => s / 100)
  const max = Math.max(...scaled)
  const exps = scaled.map((s) => Math.exp(s - max))
  const total = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / total)
}

export const argmax = (values: readonly number[]): number => values.reduce((best, v, i) => (v > values[best] ? i : best), 0)
