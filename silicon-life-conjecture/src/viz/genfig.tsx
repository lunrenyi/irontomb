import { LOSS_FIRST, LOSS_LAST, TRAIN_LOSS, type Candidate } from '../lib/llm'
import { AMBER, BLUE, FAINT, INK, MONO, MUTED, NAVY, SANS, SIGNAL, alpha } from './palette'

/* ================================================== 候选概率分布 */

export interface ProbBarsProps {
  x: number
  y: number
  width: number
  candidates: readonly Candidate[]
  /** 概率条长出来多少，0..1 */
  reveal: number
  /** 被选中的那个 */
  picked: string | null
  /** 选中高亮的强度，0..1 */
  pickReveal: number
  barH?: number
  gap?: number
}

/**
 * 下一个 Token 的候选概率。
 *
 * 条的长度就是那个概率本身 —— 三条加起来正好铺满一条轨道，
 * 「所有候选的概率加起来是 1」这件事看一眼就明白，不用写一句话解释。
 */
export function ProbBars({ x, y, width, candidates, reveal, picked, pickReveal, barH = 30, gap = 62 }: ProbBarsProps) {
  const trackW = width - 300
  return (
    <g role='img' aria-label='下一个 Token 的候选概率分布'>
      {candidates.map((c, i) => {
        const on = c.text === picked
        const by = y + i * gap
        const grow = Math.max(0, Math.min(1, reveal * candidates.length - i))
        const color = on ? AMBER : c.p > 0.2 ? SIGNAL : MUTED
        return (
          <g key={c.text} opacity={grow}>
            <text x={x} y={by + barH - 6} fill={on ? AMBER : INK} fontSize={30} fontFamily={SANS}>
              {c.text}
            </text>
            <rect x={x + 132} y={by} width={trackW} height={barH} rx={7} fill={alpha(NAVY, 0.55)} />
            <rect x={x + 132} y={by} width={Math.max(2, trackW * c.p * grow)} height={barH} rx={7} fill={alpha(color, on ? 0.92 : 0.55)} />
            <text x={x + 152 + trackW} y={by + barH - 6} fill={on ? AMBER : MUTED} fontSize={26} fontFamily={MONO} textAnchor='end'>
              {c.p.toFixed(2)}
            </text>
            {on && pickReveal > 0.02 ? (
              <rect
                x={x + 132}
                y={by - 20}
                width={112}
                height={26 + barH}
                rx={9}
                fill='none'
                stroke={alpha(AMBER, 0.8)}
                strokeWidth={2}
                opacity={pickReveal}
              />
            ) : null}
          </g>
        )
      })}
    </g>
  )
}

/* ================================================ 自回归：一句一句长出来 */

const TOK_W = 92
const TOK_H = 62

export interface GenerationStageProps {
  x: number
  y: number
  width: number
  /** 这一拍之前已经确定的 token */
  context: readonly string[]
  /** 这一拍刚选中的 token */
  picked: string | null
  candidates: readonly Candidate[]
  total: number
  step: number
  reveal: number
  pickReveal: number
  barsX: number
  barsY: number
}

/**
 * 逐 Token 生成的主画面 —— 这一章的高潮。
 *
 * 上面是已经成形的句子：它不是一次性展开的，而是每一步长出一个片段。
 * 下面把这一轮的机制拆开摆着：左边是已经确定的上下文，
 * 右边是候选 Token 与它们的概率，被选中的那一个会亮起来。
 */
export function GenerationStage(props: GenerationStageProps) {
  const { x, y, width, context, picked, candidates, total, step, reveal, pickReveal, barsX, barsY } = props
  const sentence = context.join('')
  const perRow = Math.max(1, Math.floor((width * 0.52) / (TOK_W + 12)))

  return (
    <g role='img' aria-label={'正在逐步生成，已经确定 ' + context.length + ' 个片段'}>
      <text x={x} y={y} fill={INK} fontSize={54} fontFamily={SANS} letterSpacing='0.06em'>
        {sentence}
        <tspan fill={AMBER}>{picked ?? ''}</tspan>
        <tspan fill={alpha(SIGNAL, 0.3 + 0.55 * pickReveal)}>{'▍'}</tspan>
      </text>
      <text x={x + width} y={y - 74} fill={FAINT} fontSize={26} textAnchor='end' fontFamily={MONO}>
        {'第 ' + step + ' 步 / 共 ' + total + ' 步'}
      </text>

      <text x={x} y={y + 150} fill={MUTED} fontSize={26} fontFamily={SANS}>
        已经确定的上下文
      </text>
      {context.map((t, i) => {
        const col = i % perRow
        const row = Math.floor(i / perRow)
        return (
          <g key={i}>
            <rect
              x={x + col * (TOK_W + 12)}
              y={y + 180 + row * (TOK_H + 14)}
              width={TOK_W}
              height={TOK_H}
              rx={11}
              fill={alpha(SIGNAL, 0.13)}
              stroke={alpha(SIGNAL, 0.5)}
              strokeWidth={1.3}
            />
            <text
              x={x + col * (TOK_W + 12) + TOK_W / 2}
              y={y + 180 + row * (TOK_H + 14) + 41}
              fill={INK}
              fontSize={28}
              textAnchor='middle'
              fontFamily={SANS}
            >
              {t}
            </text>
          </g>
        )
      })}

      <text x={barsX} y={barsY - 38} fill={MUTED} fontSize={26} fontFamily={SANS}>
        下一个 Token 的候选概率
      </text>
      <ProbBars x={barsX} y={barsY} width={700} candidates={candidates} reveal={reveal} picked={picked} pickReveal={pickReveal} barH={36} gap={74} />
      <text x={barsX} y={barsY + 2 * 74 + 78} fill={alpha(AMBER, 0.75)} fontSize={22} fontFamily={SANS}>
        演示用的候选概率 · 示意数据，不是真实模型的输出
      </text>
    </g>
  )
}

/* ============================================== 训练：损失真的降下来了 */

export interface LossCurveProps {
  x: number
  y: number
  width: number
  height: number
  /** 曲线画到第几步，0..1 */
  reveal: number
}

/**
 * 训练损失曲线 —— 这一条是真的。
 *
 * 曲线上每个点都是页面里那个小网络在当时那组权重下的交叉熵损失值，
 * 由一次真实的梯度下降产生（见 lib/tinymodel.ts）。
 */
export function LossCurve({ x, y, width, height, reveal }: LossCurveProps) {
  const top = Math.max(LOSS_FIRST, 1)
  const cut = Math.max(2, Math.floor(TRAIN_LOSS.length * reveal))
  const px = (i: number) => x + (i / (TRAIN_LOSS.length - 1)) * width
  const py = (v: number) => y + height - (v / top) * height
  const points = TRAIN_LOSS.slice(0, cut)
    .map((v, i) => px(i).toFixed(1) + ',' + py(v).toFixed(1))
    .join(' ')
  const last = TRAIN_LOSS[cut - 1]

  return (
    <g role='img' aria-label={'训练损失从 ' + LOSS_FIRST.toFixed(2) + ' 降到 ' + LOSS_LAST.toFixed(2)}>
      <rect x={x} y={y} width={width} height={height} rx={12} fill={alpha(NAVY, 0.32)} stroke={alpha(BLUE, 0.22)} strokeWidth={1.2} />
      <line x1={x} y1={py(LOSS_FIRST)} x2={x + width} y2={py(LOSS_FIRST)} stroke={alpha(MUTED, 0.28)} strokeWidth={1} strokeDasharray='5 6' />
      <polyline points={points} fill='none' stroke={AMBER} strokeWidth={2.6} strokeLinejoin='round' strokeLinecap='round' />
      {cut > 0 ? <circle cx={px(cut - 1)} cy={py(last)} r={7} fill={AMBER} /> : null}
      <text x={x + 14} y={py(LOSS_FIRST) - 14} fill={MUTED} fontSize={22} fontFamily={MONO}>
        {'起始 ' + LOSS_FIRST.toFixed(2)}
      </text>
      <text x={x + width - 14} y={y + 30} fill={AMBER} fontSize={24} textAnchor='end' fontFamily={MONO}>
        {'现在 ' + last.toFixed(3)}
      </text>
      <text x={x} y={y + height + 32} fill={FAINT} fontSize={22} fontFamily={SANS}>
        {'训练步数 → ' + cut + ' / ' + TRAIN_LOSS.length}
      </text>
      <text x={x + width} y={y + height + 32} fill={alpha(SIGNAL, 0.8)} fontSize={22} textAnchor='end' fontFamily={SANS}>
        这条曲线是真的：一次真实的梯度下降
      </text>
    </g>
  )
}

/* ============================================ 参数：一片被反复微调的权重 */

export interface ParamGridProps {
  x: number
  y: number
  width: number
  height: number
  cols: number
  rows: number
  /** 微调进行到多少轮，0..1 */
  reveal: number
  /** 锁住不动（推理阶段） */
  locked?: boolean
}

/**
 * 参数网格。
 *
 * 训练阶段：每一轮循环里整片参数被轻微改动，颜色跟着抖动一次。
 * 推理阶段：网格不再变化，只剩下一次高亮 —— 参数已经定好了。
 */
export function ParamGrid({ x, y, width, height, cols, rows, reveal, locked = false }: ParamGridProps) {
  const cw = width / cols
  const ch = height / rows
  const lit = Math.floor(reveal * cols * rows)
  return (
    <g role='img' aria-label={locked ? '已经固定的模型参数' : '正在被调整的模型参数'}>
      <rect x={x} y={y} width={width} height={height} rx={12} fill={alpha(NAVY, 0.3)} stroke={alpha(locked ? SIGNAL : AMBER, 0.3)} strokeWidth={1.2} />
      {Array.from({ length: cols * rows }, (_, i) => {
        const cx = i % cols
        const cy = Math.floor(i / cols)
        const on = i < lit
        const jitter = locked ? 0 : ((i * 37) % 11) / 40
        return (
          <rect
            key={i}
            x={x + 6 + cx * cw}
            y={y + 6 + cy * ch}
            width={cw - 8}
            height={ch - 8}
            rx={4}
            fill={alpha(locked ? SIGNAL : AMBER, on ? 0.2 + jitter : 0.05)}
            stroke={alpha(locked ? SIGNAL : AMBER, on ? 0.5 : 0.1)}
            strokeWidth={0.8}
          />
        )
      })}
      <text x={x + width / 2} y={y + height + 30} fill={locked ? SIGNAL : AMBER} fontSize={23} textAnchor='middle' fontFamily={SANS}>
        {locked ? '参数不再改变' : '每一轮都在改一点点'}
      </text>
    </g>
  )
}

/* ================================== 训练循环：预测 → 比较 → 调整 → 再来一轮 */

export interface TrainLoopProps {
  x: number
  y: number
  width: number
  /** 循环走到第几步，0..1 */
  reveal: number
}

const STAGES = ['大量文本样本', '预测下一个', '和真实答案比', '按误差调参数']

/**
 * 训练循环。
 *
 * 四个阶段围成一个圈，最后一格有一条回到第一格的回流线 ——
 * 训练就是这样转成千上万轮，参数每轮被改一点点。
 */
export function TrainLoop({ x, y, width, reveal }: TrainLoopProps) {
  const n = STAGES.length
  const slot = width / n
  const active = Math.floor(reveal * n) % n
  const r = 58
  const cy = y + 70
  const step = (reveal * n * 6) % 1
  return (
    <g role='img' aria-label='训练循环：样本、预测、比较、调参数'>
      {STAGES.map((label, i) => {
        const cx = x + slot * i + slot / 2
        const on = i === active
        return (
          <g key={label}>
            {i < n - 1 ? (
              <line
                x1={cx + r + 14}
                y1={cy}
                x2={cx + slot - r - 14}
                y2={cy}
                stroke={alpha(SIGNAL, 0.35)}
                strokeWidth={1.8}
                strokeDasharray={i < active ? 'none' : '6 7'}
              />
            ) : null}
            <circle cx={cx} cy={cy} r={r} fill={alpha(on ? AMBER : NAVY, on ? 0.18 : 0.5)} stroke={alpha(on ? AMBER : SIGNAL, on ? 0.9 : 0.35)} strokeWidth={on ? 2.4 : 1.3} />
            <text x={cx} y={cy + 8} fill={on ? AMBER : MUTED} fontSize={25} textAnchor='middle' fontFamily={SANS}>
              {String(i + 1)}
            </text>
            <text x={cx} y={cy + r + 38} fill={on ? INK : MUTED} fontSize={25} textAnchor='middle' fontFamily={SANS}>
              {label}
            </text>
          </g>
        )
      })}
      <path
        d={'M ' + (x + slot * (n - 1) + slot / 2) + ' ' + (cy + r) + ' C ' + (x + width) + ' ' + (cy + 178) + ' ' + x + ' ' + (cy + 178) + ' ' + (x + slot / 2) + ' ' + (cy + r)}
        fill='none'
        stroke={alpha(AMBER, 0.5)}
        strokeWidth={2}
        strokeDasharray='9 8'
        strokeDashoffset={-step * 34}
      />
      <text x={x + width / 2} y={cy + 222} fill={FAINT} fontSize={23} textAnchor='middle' fontFamily={SANS}>
        重复成千上万轮 · 参数每轮被改一点点
      </text>
    </g>
  )
}
