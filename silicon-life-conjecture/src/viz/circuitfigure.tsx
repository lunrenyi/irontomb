import { GATE_TRUTH, RAIL, VOLTAGE_SWEEP, bitsOf, readLevel, rippleAdd4, type Bit } from '../lib/circuit'
import { AMBER, CIRCUIT, DEEP, FAINT, INK, MONO, MUTED, VIOLET, alpha } from './palette'

/* ------------------------------------------------------------- MOS 晶体管 */

/**
 * 一个 n 沟道 MOSFET 的符号。
 * 栅极加高电平，源漏之间才导通 —— 数字电路里最基本的一个「开关」，
 * 但请注意它控制的其实是连续的电流，不是「1 变成 0」。
 */
export function TransistorFigure({ x, y, on, scale = 1, label }: { x: number; y: number; on: boolean; scale?: number; label?: string }) {
  const s = scale
  return (
    <g transform={'translate(' + x + ' ' + y + ') scale(' + s + ')'}>
      <line x1={-26} y1={-16} x2={-26} y2={16} stroke={CIRCUIT} strokeOpacity={0.7} strokeWidth={2.4} />
      <line x1={-26} y1={0} x2={-9} y2={0} stroke={on ? AMBER : CIRCUIT} strokeWidth={2.4} />
      <line x1={-6} y1={-17} x2={-6} y2={17} stroke={CIRCUIT} strokeOpacity={0.7} strokeWidth={2.4} />
      <circle cx={-7.6} cy={0} r={2.2} fill={on ? AMBER : CIRCUIT} />
      <line x1={-1} y1={-17} x2={-1} y2={-3} stroke={CIRCUIT} strokeOpacity={0.7} strokeWidth={2.4} />
      <line x1={-1} y1={3} x2={-1} y2={17} stroke={CIRCUIT} strokeOpacity={0.7} strokeWidth={2.4} />
      <line x1={-1} y1={-10} x2={11} y2={-10} stroke={CIRCUIT} strokeOpacity={0.7} strokeWidth={2.4} />
      <line x1={-1} y1={10} x2={11} y2={10} stroke={CIRCUIT} strokeOpacity={0.7} strokeWidth={2.4} />
      <line x1={11} y1={-10} x2={11} y2={-20} stroke={CIRCUIT} strokeOpacity={0.7} strokeWidth={2.4} />
      <line x1={11} y1={10} x2={11} y2={20} stroke={CIRCUIT} strokeOpacity={0.7} strokeWidth={2.4} />
      {on ? <circle cx={5} cy={0} r={15} fill={AMBER} opacity={0.16} /> : null}
      <line x1={11} y1={-20} x2={11} y2={-20} stroke={AMBER} strokeWidth={6} strokeOpacity={on ? 0.9 : 0} />
      <line x1={11} y1={20} x2={11} y2={20} stroke={AMBER} strokeWidth={6} strokeOpacity={on ? 0.9 : 0} />
      {label ? (
        <text x={0} y={38} fill={on ? AMBER : MUTED} fontSize={22} fontFamily={MONO} textAnchor='middle'>
          {label}
        </text>
      ) : null}
    </g>
  )
}

/* -------------------------------------------------------------- 逻辑门 */

export type GateKind = 'NOT' | 'AND' | 'OR' | 'XOR'

const GATE_W = 92
const GATE_H = 60

function gatePath(kind: GateKind, w: number, h: number): string {
  if (kind === 'NOT') return 'M 0 ' + -h / 2 + ' L ' + (w - 14) + ' ' + -h / 2 + ' A ' + h / 2 + ' ' + h / 2 + ' 0 0 1 ' + (w - 14) + ' ' + h / 2 + ' L 0 ' + h / 2 + ' Z'
  if (kind === 'AND') return 'M 0 ' + -h / 2 + ' L ' + (w - 22) + ' ' + -h / 2 + ' A ' + h / 2 + ' ' + h / 2 + ' 0 0 1 ' + (w - 22) + ' ' + h / 2 + ' L 0 ' + h / 2 + ' Z'
  if (kind === 'OR' || kind === 'XOR') return 'M 0 ' + -h / 2 + ' Q ' + (w * 0.55) + ' ' + -h / 2 + ' ' + (w - 22) + ' 0 Q ' + (w * 0.55) + ' ' + h / 2 + ' 0 ' + h / 2 + ' Q ' + (w * 0.55) + ' ' + -h / 2 + ' 0 ' + -h / 2 + ' Z'
  return ''
}

/** 一个逻辑门。a、b 是真实输入，out 是按真值表算出来的真实输出。 */
export function GateFigure({
  x,
  y,
  kind,
  a = 0,
  b = 0,
  active = false,
  scale = 1,
  caption,
}: {
  x: number
  y: number
  kind: GateKind
  a?: Bit
  b?: Bit
  active?: boolean
  scale?: number
  caption?: string
}) {
  const row = GATE_TRUTH.find((r) => r.a === a && r.b === b) ?? GATE_TRUTH[0]
  const out: Bit = kind === 'NOT' ? row.notA : kind === 'AND' ? row.and : kind === 'OR' ? row.or : row.xor
  const wire = (on: boolean) => (on ? AMBER : CIRCUIT)
  return (
    <g transform={'translate(' + x + ' ' + y + ') scale(' + scale + ')'}>
      <line x1={-40} y1={kind === 'NOT' ? 0 : -14} x2={0} y2={kind === 'NOT' ? 0 : -14} stroke={wire(a === 1)} strokeWidth={2.6} />
      {kind === 'NOT' ? null : <line x1={-40} y1={14} x2={0} y2={14} stroke={wire(b === 1)} strokeWidth={2.6} />}
      <line x1={-46} y1={kind === 'NOT' ? 0 : -14} x2={-40} y2={kind === 'NOT' ? 0 : -14} stroke={wire(a === 1)} strokeWidth={2.6} />
      {kind === 'NOT' ? null : <line x1={-46} y1={14} x2={-40} y2={14} stroke={wire(b === 1)} strokeWidth={2.6} />}
      <path d={gatePath(kind, GATE_W, GATE_H)} fill={active ? alpha(CIRCUIT, 0.2) : alpha(DEEP, 0.85)} stroke={active ? AMBER : CIRCUIT} strokeWidth={2.2} />
      {kind === 'NOT' ? <circle cx={GATE_W - 12} cy={0} r={5} fill='none' stroke={active ? AMBER : CIRCUIT} strokeWidth={2.2} /> : null}
      {kind === 'XOR' ? <path d={'M 8 ' + -GATE_H / 2 + ' Q 2 0 8 ' + GATE_H / 2} fill='none' stroke={active ? AMBER : CIRCUIT} strokeWidth={2.2} /> : null}
      <line x1={GATE_W + 6} y1={0} x2={GATE_W + 42} y2={0} stroke={wire(out === 1)} strokeWidth={2.6} />
      <text x={GATE_W / 2} y={-GATE_H / 2 - 12} fill={active ? AMBER : MUTED} fontSize={21} fontFamily={MONO} textAnchor='middle'>
        {kind}
      </text>
      <text x={GATE_W + 36} y={-8} fill={out === 1 ? AMBER : FAINT} fontSize={22} fontFamily={MONO} textAnchor='end'>
        {a}{kind === 'NOT' ? '' : b}
      </text>
      <circle cx={GATE_W + 42} cy={0} r={5.5} fill={out === 1 ? AMBER : DEEP} stroke={out === 1 ? AMBER : CIRCUIT} strokeWidth={1.6} />
      <text x={GATE_W + 30} y={26} fill={MUTED} fontSize={19} fontFamily={MONO} textAnchor='end'>
        = {out}
      </text>
      {caption ? (
        <text x={0} y={GATE_H / 2 + 30} fill={MUTED} fontSize={22} textAnchor='start'>
          {caption}
        </text>
      ) : null}
      <rect x={-46} y={-GATE_H / 2 - 4} width={GATE_W + 92} height={GATE_H + 8} fill='transparent' />
      <title>
        {kind} 门：输入 {a}{kind === 'NOT' ? '' : b}，输出 {out}
      </title>
    </g>
  )
}

/* ------------------------------------------------------- 真值表与电压轨 */

/** 真值表：画面上那张表就是从 GATE_TRUTH 直接画的 */
export function TruthTableFigure({ x, y, highlightRow = -1 }: { x: number; y: number; highlightRow?: number }) {
  const cols = ['a', 'b', 'NOT a', 'a AND b', 'a OR b', 'a XOR b']
  const colW = 104
  const rowH = 38
  return (
    <g transform={'translate(' + x + ' ' + y + ')'}>
      {cols.map((c, i) => (
        <text key={c} x={i * colW} y={0} fill={MUTED} fontSize={25} fontFamily={MONO}>
          {c}
        </text>
      ))}
      {GATE_TRUTH.map((row, r) => (
        <g key={r} transform={'translate(0 ' + (r + 1) * rowH + ')'}>
          {r === highlightRow ? <rect x={-14} y={-22} width={cols.length * colW + 8} height={rowH - 4} rx={8} fill={alpha(AMBER, 0.12)} /> : null}
          {[row.a, row.b, row.notA, row.and, row.or, row.xor].map((v, i) => (
            <text key={i} x={i * colW} y={0} fill={i >= 2 ? (v ? AMBER : FAINT) : INK} fontSize={27} fontFamily={MONO}>
              {v}
            </text>
          ))}
        </g>
      ))}
    </g>
  )
}

/**
 * 电压轨：从 0 扫到电源轨，中间那段「未定义」。
 * 这张图是全场最重要的一次澄清：0 和 1 是对连续电压的一种数字化约定。
 */
export function VoltageRailFigure({
  x,
  y,
  width,
  height,
  probe = -1,
}: {
  x: number
  y: number
  width: number
  height: number
  /** 探针电压（伏特），负数表示还没有探针 */
  probe?: number
}) {
  const bandY = y + height * 0.22
  const bandH = height * 0.4
  const mid = RAIL.vdd / 2
  const px = (v: number) => x + (v / RAIL.vdd) * width
  const strong0 = VOLTAGE_SWEEP.filter((v) => readLevel(v).state === 'strong-0').length
  const strong1 = VOLTAGE_SWEEP.filter((v) => readLevel(v).state === 'strong-1').length
  const zeroW = (strong0 / VOLTAGE_SWEEP.length) * width
  const oneW = (strong1 / VOLTAGE_SWEEP.length) * width
  return (
    <g>
      <text x={x} y={bandY - 16} fill={MUTED} fontSize={26} fontFamily={MONO}>
        连续电压（物理量）
      </text>
      <rect x={x} y={bandY} width={zeroW} height={bandH} rx={6} fill={alpha(BLUE_GATE, 0.3)} />
      <rect x={x + zeroW} y={bandY} width={width - zeroW - oneW} height={bandH} fill={alpha(AMBER, 0.16)} />
      <rect x={x + width - oneW} y={bandY} width={oneW} height={bandH} rx={6} fill={alpha(AMBER, 0.3)} />
      <text x={x + zeroW / 2} y={bandY + bandH / 2 + 8} fill={INK} fontSize={30} fontFamily={MONO} textAnchor='middle'>
        0
      </text>
      <text x={x + width - oneW / 2} y={bandY + bandH / 2 + 8} fill={INK} fontSize={30} fontFamily={MONO} textAnchor='middle'>
        1
      </text>
      <text x={x + width / 2} y={bandY + bandH / 2 + 8} fill={AMBER} fontSize={23} fontFamily={MONO} textAnchor='middle'>
        未定义区
      </text>
      <line x1={x} y1={bandY + bandH} x2={x} y2={bandY + bandH + 16} stroke={CIRCUIT} strokeWidth={1.6} />
      <text x={x} y={bandY + bandH + 38} fill={MUTED} fontSize={23} fontFamily={MONO}>
        0 V
      </text>
      <line x1={x + width / 2} y1={bandY + bandH} x2={x + width / 2} y2={bandY + bandH + 16} stroke={AMBER} strokeWidth={1.6} />
      <text x={x + width / 2} y={bandY + bandH + 38} fill={AMBER} fontSize={23} fontFamily={MONO} textAnchor='middle'>
        {mid.toFixed(1)} V（判定门限）
      </text>
      <line x1={x + width} y1={bandY + bandH} x2={x + width} y2={bandY + bandH + 16} stroke={AMBER} strokeWidth={1.6} />
      <text x={x + width} y={bandY + bandH + 38} fill={MUTED} fontSize={23} fontFamily={MONO} textAnchor='end'>
        {RAIL.vdd} V（电源）
      </text>
      {probe >= 0 ? (
        <g>
          <line x1={px(probe)} y1={bandY - 22} x2={px(probe)} y2={bandY + bandH + 6} stroke={VIOLET} strokeWidth={2.4} />
          <circle cx={px(probe)} cy={bandY - 22} r={6} fill={VIOLET} />
          <text x={px(probe)} y={bandY - 34} fill={VIOLET} fontSize={25} fontFamily={MONO} textAnchor='middle'>
            {probe.toFixed(2)} V → {readLevel(probe).bit}
          </text>
        </g>
      ) : null}
    </g>
  )
}

const BLUE_GATE = '#6aa8ff'

/* -------------------------------------------- 四位行波进位加法器（网络层） */

/**
 * 四位行波进位加法器。
 * 每一级都是真的全加器，进位链一级一级传上去 ——
 * 单个全加器只能加两个比特，四位加法需要四级串起来，谁也不能独自完成。
 */
export function RippleAdderFigure({
  x,
  y,
  a,
  b,
  /** 进位传到第几级（0-4），用来点亮已经算出来的那几级 */
  progress = 4,
  scale = 1,
}: {
  x: number
  y: number
  a: number
  b: number
  progress?: number
  scale?: number
}) {
  const result = rippleAdd4(a, b)
  const ab = bitsOf(a)
  const bb = bitsOf(b)
  const cellW = 168 * scale
  const cellH = 128 * scale
  return (
    <g transform={'translate(' + x + ' ' + y + ') scale(' + scale + ')'}>
      <line x1={-46} y1={0} x2={-16} y2={0} stroke={CIRCUIT} strokeWidth={2.4} opacity={0.7} />
      <text x={-52} y={6} fill={MUTED} fontSize={22} fontFamily={MONO}>
        进位
      </text>
      {result.stages.map((stage, i) => {
        const done = i < progress
        const cx = i * cellW + 76 * scale
        return (
          <g key={i}>
            <rect
              x={i * cellW + 8 * scale}
              y={-cellH / 2}
              width={cellW - 16 * scale}
              height={cellH}
              rx={14}
              fill={done ? alpha(AMBER, 0.08) : alpha(DEEP, 0.8)}
              stroke={done ? alpha(AMBER, 0.5) : alpha(CIRCUIT, 0.3)}
              strokeWidth={1.8}
            />
            <text x={cx} y={-cellH / 2 + 26 * scale} fill={done ? AMBER : MUTED} fontSize={16 * scale} fontFamily={MONO} textAnchor='middle'>
              第 {i} 位 全加器
            </text>
            <text x={cx - 46 * scale} y={-14 * scale} fill={ab[i] ? AMBER : FAINT} fontSize={22 * scale} fontFamily={MONO} textAnchor='middle'>
              {ab[i]}
            </text>
            <text x={cx - 46 * scale} y={30 * scale} fill={bb[i] ? AMBER : FAINT} fontSize={22 * scale} fontFamily={MONO} textAnchor='middle'>
              {bb[i]}
            </text>
            <text x={cx - 58 * scale} y={-8 * scale} fill={MUTED} fontSize={14 * scale} textAnchor='end'>
              a
            </text>
            <text x={cx - 58 * scale} y={36 * scale} fill={MUTED} fontSize={14 * scale} textAnchor='end'>
              b
            </text>
            <text x={cx + 46 * scale} y={10 * scale} fill={done && stage.sum ? AMBER : FAINT} fontSize={22 * scale} fontFamily={MONO} textAnchor='middle'>
              {done ? stage.sum : '?'}
            </text>
            <text x={cx + 62 * scale} y={16 * scale} fill={MUTED} fontSize={14 * scale}>
              和
            </text>
            {i < result.stages.length - 1 || result.cout ? (
              <g>
                <line
                  x1={cx}
                  y1={-cellH / 2 + cellH * 0.24}
                  x2={cx}
                  y2={cellH / 2}
                  stroke={done && stage.cout ? AMBER : alpha(CIRCUIT, 0.35)}
                  strokeWidth={2.2}
                />
                <text x={cx + 10 * scale} y={cellH / 2 - 8 * scale} fill={done && stage.cout ? AMBER : FAINT} fontSize={15 * scale} fontFamily={MONO}>
                  进位 {done ? stage.cout : '?'}
                </text>
              </g>
            ) : null}
          </g>
        )
      })}
      <text x={result.stages.length * cellW - 40 * scale} y={-cellH / 2 - 14 * scale} fill={AMBER} fontSize={20 * scale} fontFamily={MONO} textAnchor='end'>
        {a} + {b} = {result.sum}
        {result.cout ? '（最高位进位 ' + result.cout + '）' : ''}
      </text>
    </g>
  )
}

/** 一大片相互连接的门：第三幕「从单个单元放大到网络」那一拍用 */
export function GateNetworkFigure({ width, height, seed = 3, columns = 9, rows = 5 }: { width: number; height: number; seed?: number; columns?: number; rows?: number }) {
  const nodes: Array<{ x: number; y: number; on: boolean }> = []
  let s = seed
  const rand = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
  const gw = width / columns
  const gh = height / rows
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < columns; c += 1) {
      nodes.push({ x: gw * (c + 0.5), y: gh * (r + 0.5), on: rand() > 0.45 })
    }
  }
  const links: Array<[number, number]> = []
  nodes.forEach((_node, i) => {
    // 必须按下标判断是否越界：斜向邻居比正下方多跨一行，光看 x / y 会漏掉最后一列
    if (i + columns < nodes.length) links.push([i, i + columns])
    if (rand() > 0.62 && i + columns + 1 < nodes.length) links.push([i, i + columns + 1])
  })
  return (
    <g>
      {links.map(([from, to], i) => (
        <line
          key={i}
          x1={nodes[from].x}
          y1={nodes[from].y}
          x2={nodes[to].x}
          y2={nodes[to].y}
          stroke={nodes[from].on && nodes[to].on ? AMBER : alpha(CIRCUIT, 0.25)}
          strokeWidth={nodes[from].on && nodes[to].on ? 1.6 : 1}
          opacity={nodes[from].on && nodes[to].on ? 0.5 : 0.6}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <rect
            x={n.x - 15}
            y={n.y - 12}
            width={30}
            height={24}
            rx={4}
            fill={n.on ? alpha(AMBER, 0.16) : alpha(DEEP, 0.9)}
            stroke={n.on ? AMBER : alpha(CIRCUIT, 0.4)}
            strokeWidth={1.4}
          />
          <circle cx={n.x - 19} cy={n.y} r={2.6} fill={n.on ? AMBER : alpha(CIRCUIT, 0.5)} />
          <circle cx={n.x + 19} cy={n.y} r={2.6} fill={n.on ? AMBER : alpha(CIRCUIT, 0.5)} />
        </g>
      ))}
    </g>
  )
}
