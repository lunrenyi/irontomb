import type { Machine, Phase, Signal } from '../lib/vm'
import { REGISTERS as REG_NAMES } from '../lib/vm'
import {
  ALU,
  ALU_BLOCKS,
  BUS_TAP,
  BUS_X0,
  BUS_X1,
  BUS_Y,
  CONTROL,
  CPU,
  INPUT,
  IRU,
  MEMORY,
  MEMORY_ROWS,
  OUTPUT,
  REGISTER_SLOTS,
  REGISTERS,
  ROUTES,
  STORAGE,
  VIEW_H,
  VIEW_W,
  alongRoute,
  type Box,
} from './cpulayout'
import { AMBER, CIRCUIT, DEEP, FAINT, INK, MONO, MUTED, SIGNAL, VIOLET, alpha } from './palette'

export interface CpuMachineFigureProps {
  machine: Machine
  /** 当前微阶段内部 0-1 的进度，用来让信号点跑起来 */
  progress: number
}

/** 哪一个微阶段点亮哪条路线 */
export function routeForPhase(phase: Phase, instr: { op: string } | null): string | null {
  if (phase === 'fetch') return 'pc-to-mem'
  if (phase === 'decode') return 'internal-ctrl'
  if (phase === 'execute') {
    const op = instr?.op ?? ''
    if (op === 'LOADM' || op === 'LOADMR' || op === 'STORE' || op === 'STORER') return 'mem-to-cpu'
    if (op === 'OUT') return 'cpu-to-output'
    if (op === 'LOADI') return 'internal-regs'
    return 'internal-alu'
  }
  if (phase === 'write') {
    const op = instr?.op ?? ''
    if (op === 'STORE' || op === 'STORER') return 'mem-to-output'
    return 'internal-regs'
  }
  if (phase === 'output') return 'cpu-to-output'
  return null
}

/** 回流路线：让「读进来」这件事看得见来龙去脉 */
export function returnRouteForPhase(phase: Phase, instr: { op: string } | null): string | null {
  if (phase === 'fetch') return 'mem-to-cpu'
  if (phase === 'execute' && (instr?.op === 'STORE' || instr?.op === 'STORER')) return 'cpu-to-output'
  return null
}

/** 一个部件的外框与标题 */
export function Panel({ box, title, note, highlight = false, children }: { box: Box; title: string; note?: string; highlight?: boolean; children?: React.ReactNode }) {
  return (
    <g>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx={14}
        fill={alpha(DEEP, 0.82)}
        stroke={highlight ? AMBER : alpha(CIRCUIT, 0.28)}
        strokeWidth={highlight ? 2.4 : 1.4}
      />
      {highlight ? <rect x={box.x - 4} y={box.y - 4} width={box.w + 8} height={box.h + 8} rx={18} fill='none' stroke={AMBER} strokeOpacity={0.3} strokeWidth={1.4} /> : null}
      <text x={box.x + 16} y={box.y + 30} fill={highlight ? AMBER : INK} fontSize={26}>
        {title}
      </text>
      {note ? (
        <text x={box.x + box.w - 14} y={box.y + 30} fill={FAINT} fontSize={21} textAnchor='end'>
          {note}
        </text>
      ) : null}
      {children}
    </g>
  )
}

/** 贯穿画面下方的数据总线 */
export function Bus({ on }: { on: boolean }) {
  return (
    <g>
      <line x1={BUS_X0} y1={BUS_Y} x2={BUS_X1} y2={BUS_Y} stroke={on ? AMBER : alpha(CIRCUIT, 0.45)} strokeWidth={4} strokeLinecap='round' />
      <text x={BUS_X0} y={BUS_Y + 32} fill={on ? AMBER : FAINT} fontSize={23}>
        数据总线：一次只有一条通路在传数据
      </text>
      {[BUS_TAP.memory, BUS_TAP.cpu, BUS_TAP.storage].map((x) => (
        <circle key={x} cx={x} cy={BUS_Y} r={5} fill={on ? AMBER : CIRCUIT} opacity={0.8} />
      ))}
    </g>
  )
}

/** 一条正在传输数据的通路 */
export function RouteLine({ id, opacity = 1, dashed = false }: { id: string; opacity?: number; dashed?: boolean }) {
  const route = ROUTES[id]
  if (!route) return null
  const d = route.points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ' ' + p[1]).join(' ')
  return <path d={d} fill='none' stroke={AMBER} strokeWidth={3} strokeOpacity={opacity} strokeDasharray={dashed ? '10 8' : undefined} strokeLinecap='round' />
}

/** 正在跑的那颗数据令牌 */
export function Token({ x, y, angle, color = AMBER, small = false }: { x: number; y: number; angle: number; color?: string; small?: boolean }) {
  const r = small ? 7 : 11
  return (
    <g transform={'translate(' + x + ' ' + y + ') rotate(' + ((angle * 180) / Math.PI) + ')'}>
      <circle r={r * 3} fill={color} opacity={0.16} />
      <circle r={r} fill={color} />
      <path d={'M ' + r + ' 0 L ' + (r + 12) + ' 0'} stroke={color} strokeWidth={2.4} opacity={0.6} />
    </g>
  )
}

/** 输出设备上真的显示这段程序算出来的东西，而不是随便画个结果 */
export function OutputReadout({ machine }: { machine: Machine }) {
  const kind = machine.program.outputAs
  const out = machine.output
  const last = out.length > 0 ? out[out.length - 1] : 0
  return (
    <g>
      {kind === 'text' ? (
        <text x={OUTPUT.x + 18} y={OUTPUT.y + 70} fill={SIGNAL} fontSize={42} fontFamily={MONO} letterSpacing='0.12em'>
          {out.map((c) => (c >= 32 && c < 127 ? String.fromCharCode(c) : '·')).join('')}
        </text>
      ) : null}
      {kind === 'bits' ? (
        <g>
          {Array.from({ length: 8 }, (_, i) => {
            const value = (last >> (7 - i)) & 1
            return (
              <g key={i}>
                <rect x={OUTPUT.x + 18 + i * 44} y={OUTPUT.y + 38} width={36} height={36} rx={6} fill={value ? SIGNAL : alpha(CIRCUIT, 0.12)} stroke={value ? SIGNAL : alpha(CIRCUIT, 0.35)} strokeWidth={1.4} />
                <text x={OUTPUT.x + 36 + i * 44} y={OUTPUT.y + 68} fill={value ? DEEP : MUTED} fontSize={26} fontFamily={MONO} textAnchor='middle'>
                  {value}
                </text>
              </g>
            )
          })}
          <text x={OUTPUT.x + 18} y={OUTPUT.y + 102} fill={MUTED} fontSize={22}>
            {out.length > 0 ? '二值化结果（十进制 ' + last + '）' : '还没有输出'}
          </text>
        </g>
      ) : null}
      {kind === 'class' ? (
        <g>
          {['类别 0', '类别 1', '类别 2'].map((label, i) => {
            const picked = out.length > 0 && last === i
            return (
              <g key={label}>
                <rect x={OUTPUT.x + 18 + i * 116} y={OUTPUT.y + 36} width={104} height={38} rx={8} fill={picked ? alpha(AMBER, 0.24) : alpha(CIRCUIT, 0.08)} stroke={picked ? AMBER : alpha(CIRCUIT, 0.3)} strokeWidth={1.4} />
                <text x={OUTPUT.x + 70 + i * 116} y={OUTPUT.y + 65} fill={picked ? AMBER : MUTED} fontSize={24} textAnchor='middle'>
                  {label}
                </text>
              </g>
            )
          })}
          <text x={OUTPUT.x + 18} y={OUTPUT.y + 102} fill={MUTED} fontSize={22}>
            取分数最高的类别 —— 与 argmax 一致
          </text>
        </g>
      ) : null}
      {kind === 'number' || kind === undefined ? (
        <text x={OUTPUT.x + 18} y={OUTPUT.y + 72} fill={SIGNAL} fontSize={48} fontFamily={MONO}>
          {out.length > 0 ? String(last) : '—'}
        </text>
      ) : null}
    </g>
  )
}

/**
 * 计算机组成原理的整张图。
 * 图上每一个读数都来自 Machine：PC、指令寄存器、寄存器组、ALU、内存、输出。
 * 跑动的那颗光是数据令牌，沿着真实的数据通路移动，不是随机流光。
 */
export function CpuMachineFigure({ machine, progress }: CpuMachineFigureProps) {
  const phase = machine.lastPhase
  const route = routeForPhase(phase, machine.ir)
  const back = returnRouteForPhase(phase, machine.ir)
  const token = route ? alongRoute(ROUTES[route].points, progress) : null
  const backToken = back ? alongRoute(ROUTES[back].points, 1 - progress) : null
  const on = (s: Signal) => machine.control[s] === true
  const windowRows = new Set(machine.program.windows.flatMap((w) => Array.from({ length: w.length }, (_, i) => w.start + i)))

  return (
    <svg width='100%' height='100%' viewBox={'0 0 ' + VIEW_W + ' ' + VIEW_H} className='block' role='img' aria-label='计算机组成原理示意图：CPU、主存、存储设备与输入输出，数据在总线上流动'>
      <defs>
        <linearGradient id='cpu-shell' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor='#101c38' stopOpacity='0.92' />
          <stop offset='100%' stopColor='#070c18' stopOpacity='0.94' />
        </linearGradient>
      </defs>

      <Bus on={on('PCout') || on('ALUout') || on('MemWrite') || on('OutWrite')} />

      <Panel box={MEMORY} title='主存（内存）' note='指令与数据都住在这里' highlight={on('MemRead') || on('MemWrite')}>
        {Array.from({ length: MEMORY_ROWS }, (_, i) => {
          const y = MEMORY.y + 46 + i * 26
          const isCode = i < machine.program.code.length
          const isMar = machine.mar === i && machine.control.MemRead === true
          const inWindow = windowRows.has(i)
          return (
            <g key={i}>
              <rect x={MEMORY.x + 14} y={y} width={MEMORY.w - 28} height={22} rx={4} fill={isMar ? alpha(AMBER, 0.22) : isCode ? alpha(CIRCUIT, 0.1) : 'transparent'} stroke={isMar ? AMBER : alpha(CIRCUIT, 0.16)} strokeWidth={1} />
              <text x={MEMORY.x + 24} y={y + 17} fill={isMar ? AMBER : FAINT} fontSize={20} fontFamily={MONO}>
                {String(i).padStart(3, '0')}
              </text>
              <text x={MEMORY.x + MEMORY.w - 24} y={y + 17} fill={isMar ? AMBER : inWindow ? INK : MUTED} fontSize={20} fontFamily={MONO} textAnchor='end'>
                {isMar ? '正在读取' : inWindow ? String(machine.memory[i]) : isCode ? '第 ' + i + ' 条指令' : '0'}
              </text>
            </g>
          )
        })}
      </Panel>

      <rect x={CPU.x} y={CPU.y} width={CPU.w} height={CPU.h} rx={20} fill='url(#cpu-shell)' stroke={alpha(CIRCUIT, 0.4)} strokeWidth={2} />
      <text x={CPU.x + 22} y={CPU.y + 34} fill={INK} fontSize={28} letterSpacing='0.14em'>
        CPU 中央处理器
      </text>

      <Panel box={CONTROL} title='控制器' note='译码并发出控制信号' highlight={on('ControlDecode')}>
        <text x={CONTROL.x + 16} y={CONTROL.y + CONTROL.h - 18} fill={on('ControlDecode') ? AMBER : MUTED} fontSize={22} fontFamily={MONO}>
          正在执行：{machine.ir ? machine.ir.op : '—'}
        </text>
      </Panel>

      <Panel box={ALU} title='运算器 ALU' note='加、减、乘、除、比较' highlight={on('ALUexec')}>
        {ALU_BLOCKS.map((b) => (
          <rect key={b.label} x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill={on('ALUexec') && b.label === '加 / 减' ? alpha(AMBER, 0.18) : alpha(DEEP, 0.7)} stroke={alpha(CIRCUIT, 0.35)} strokeWidth={1.2} />
        ))}
        {ALU_BLOCKS.map((b, i) => (
          <text key={'t' + b.label} x={b.x + b.w / 2} y={b.y + b.h / 2 + 9} fill={on('ALUexec') && i === 0 ? AMBER : MUTED} fontSize={24} textAnchor='middle'>
            {b.label}
          </text>
        ))}
        <text x={ALU.x + ALU.w / 2} y={ALU.y + ALU.h - 12} fill={machine.alu.busy ? AMBER : FAINT} fontSize={22} fontFamily={MONO} textAnchor='middle'>
          {machine.alu.busy ? machine.alu.a + ' > ' + machine.alu.b + ' = ' + machine.alu.result : 'A=— B=— R=—'}
        </text>
      </Panel>

      <Panel box={REGISTERS} title='寄存器组' note='CPU 手边最快的存储' highlight={on('RegWrite')}>
        {REGISTER_SLOTS.map((slot, i) => {
          const name = REG_NAMES[i]
          const touched = machine.ir?.rd === name || machine.ir?.rs === name || machine.ir?.rs2 === name
          return (
            <g key={name}>
              <rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} rx={6} fill={touched && on('RegWrite') ? alpha(AMBER, 0.24) : alpha(DEEP, 0.75)} stroke={touched ? AMBER : alpha(CIRCUIT, 0.3)} strokeWidth={1.2} />
              <text x={slot.x + 10} y={slot.y + 24} fill={touched ? AMBER : MUTED} fontSize={20} fontFamily={MONO}>
                {name}
              </text>
              <text x={slot.x + slot.w - 10} y={slot.y + 24} fill={touched ? AMBER : INK} fontSize={20} fontFamily={MONO} textAnchor='end'>
                {machine.regs[name]}
              </text>
            </g>
          )
        })}
        <text x={REGISTERS.x + 18} y={REGISTERS.y + REGISTERS.h - 12} fill={on('PCinc') ? AMBER : FAINT} fontSize={22} fontFamily={MONO}>
          PC 程序计数器 = {machine.pc}
        </text>
      </Panel>

      <Panel box={IRU} title='指令寄存器与总线接口' note='IR / MAR / MDR' highlight={on('IRin') || on('MemRead')}>
        {[
          { label: 'IR 指令', value: machine.ir ? machine.ir.text : '—', lit: on('IRin') },
          { label: 'MAR 地址', value: String(machine.mar), lit: on('MARin') },
          { label: 'MDR 数据', value: String(machine.mdr), lit: on('MDRin') },
        ].map((row, i) => {
          const y = IRU.y + 52 + i * 36
          return (
            <g key={row.label}>
              <rect x={IRU.x + 16} y={y} width={IRU.w - 32} height={30} rx={5} fill={row.lit ? alpha(AMBER, 0.18) : alpha(DEEP, 0.8)} stroke={row.lit ? AMBER : alpha(CIRCUIT, 0.25)} strokeWidth={1.1} />
              <text x={IRU.x + 26} y={y + 22} fill={row.lit ? AMBER : MUTED} fontSize={21} fontFamily={MONO}>
                {row.label}
              </text>
              <text x={IRU.x + IRU.w - 26} y={y + 22} fill={row.lit ? AMBER : INK} fontSize={21} fontFamily={MONO} textAnchor='end'>
                {row.value}
              </text>
            </g>
          )
        })}
      </Panel>

      <Panel box={STORAGE} title='存储设备' note='断电也不丢，但比内存慢得多'>
        <text x={STORAGE.x + 18} y={STORAGE.y + STORAGE.h - 54} fill={MUTED} fontSize={22}>
          硬盘、固态盘、光盘……
        </text>
        <text x={STORAGE.x + 18} y={STORAGE.y + STORAGE.h - 28} fill={FAINT} fontSize={22}>
          程序启动时从这里读进内存
        </text>
      </Panel>

      <Panel box={INPUT} title='输入设备' note='键盘、传感器、麦克风' />
      <Panel box={OUTPUT} title='输出设备' note='屏幕、扬声器、执行器' highlight={on('OutWrite')}>
        <OutputReadout machine={machine} />
      </Panel>

      {route ? <RouteLine id={route} opacity={0.85} /> : null}
      {back ? <RouteLine id={back} opacity={0.35} dashed /> : null}
      {token ? <Token x={token.x} y={token.y} angle={token.angle} color={AMBER} /> : null}
      {backToken ? <Token x={backToken.x} y={backToken.y} angle={backToken.angle} color={VIOLET} small /> : null}
    </svg>
  )
}
