import { EMBEDDINGS, HIDDEN, MODEL, VOCAB, forward, type GenerateStep } from '../lib/tinymodel'
import { AMBER, BLUE, FAINT, INK, MONO, MUTED, SIGNAL, VIOLET, alpha } from './palette'

export interface ModelFigureProps {
  x: number
  y: number
  width: number
  /** 当前展开到生成序列的第几步（-1 表示只看输入） */
  step: number
  steps: readonly GenerateStep[]
}

/**
 * 一个语言模型的前向传播画面。
 *
 * 每一层的数值都来自 forward()：输入词向量 -> 加权求和 -> tanh -> 再加权 -> softmax。
 * 概率条的长度、隐藏层小方块的亮度、生成的每一个字，全都读同一个模型。
 */
export function ModelFigure({ x, y, width, step, steps }: ModelFigureProps) {
  const current = step >= 0 ? steps[Math.min(step, steps.length - 1)] : null
  const tokenOf = current ? current.input : 0
  const probs = current ? current.probs : forward(MODEL, 0).probs
  const hidden = current ? current.hidden : new Array<number>(HIDDEN).fill(0)
  const shown = current ? current.output : -1

  const colW = width / 4
  const top = y + 56
  const tokenY = y + 20

  return (
    <g role='img' aria-label='一个小神经网络把输入词逐步变成下一个词的概率分布'>
      {/* 输入词 */}
      <rect x={x} y={tokenY} width={colW - 30} height={44} rx={10} fill={alpha(SIGNAL, 0.16)} stroke={SIGNAL} strokeWidth={1.6} />
      <text x={x + (colW - 30) / 2} y={tokenY + 30} fill={SIGNAL} fontSize={30} textAnchor='middle'>
        {VOCAB[tokenOf]}
      </text>
      <text x={x} y={tokenY - 14} fill={FAINT} fontSize={21}>
        输入的词
      </text>
      <Arrow x1={x + colW - 22} x2={x + colW + 8} y={tokenY + 22} />

      {/* 词向量：数字，不是神秘的东西 */}
      <g transform={'translate(' + (x + colW + 16) + ' ' + top + ')'}>
        {EMBEDDINGS[tokenOf].map((v, i) => {
          const h = Math.abs(v)
          return (
            <g key={i}>
              <rect x={0} y={i * 42} width={h * 96 + 8} height={30} rx={5} fill={v >= 0 ? alpha(SIGNAL, 0.5) : alpha(VIOLET, 0.5)} />
              <text x={h * 96 + 18} y={i * 42 + 21} fill={MUTED} fontSize={19} fontFamily={MONO}>
                {v.toFixed(2)}
              </text>
            </g>
          )
        })}
        <text x={0} y={-16} fill={FAINT} fontSize={21}>
          词向量（4 个数）
        </text>
      </g>
      <Arrow x1={x + colW * 2 + 30} x2={x + colW * 2 + 60} y={top + 80} />

      {/* 隐藏层：真实算出来的激活值 */}
      <g transform={'translate(' + (x + colW * 2 + 70) + ' ' + (top - 6) + ')'}>
        {hidden.map((h, i) => {
          const lit = Math.max(0, Math.min(1, (h + 1) / 2))
          return (
            <rect
              key={i}
              x={i * 20}
              y={0}
              width={14}
              height={176}
              rx={4}
              fill={alpha(lit > 0.5 ? SIGNAL : VIOLET, 0.18 + Math.abs(h) * 0.7)}
              stroke={alpha(SIGNAL, 0.3)}
              strokeWidth={0.8}
            />
          )
        })}
        <text x={0} y={-16} fill={FAINT} fontSize={21}>
          隐藏层（12 个神经元）
        </text>
        <text x={0} y={200} fill={FAINT} fontSize={20} fontFamily={MONO}>
          tanh(加权求和)
        </text>
      </g>
      <Arrow x1={x + colW * 3 + 70} x2={x + colW * 3 + 100} y={top + 80} />

      {/* 输出分布 */}
      <g transform={'translate(' + (x + colW * 3 + 110) + ' ' + (top - 6) + ')'}>
        {probs.map((p, i) => {
          const isShown = i === shown
          const color = isShown ? AMBER : p > 0.02 ? SIGNAL : FAINT
          return (
            <g key={i}>
              <rect x={0} y={i * 21} width={Math.max(2, p * 190)} height={14} rx={4} fill={alpha(color, isShown ? 0.9 : 0.42)} />
              <text x={-8} y={i * 21 + 12} fill={color} fontSize={20} textAnchor='end'>
                {VOCAB[i]}
              </text>
              <text x={Math.max(2, p * 190) + 8} y={i * 21 + 12} fill={MUTED} fontSize={18} fontFamily={MONO}>
                {(p * 100).toFixed(1)}%
              </text>
            </g>
          )
        })}
        <text x={0} y={-16} fill={FAINT} fontSize={21}>
          下一个词的概率（softmax）
        </text>
      </g>
    </g>
  )
}

function Arrow({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2 - 8} y2={y} stroke={alpha(BLUE, 0.6)} strokeWidth={2} />
      <path d={'M ' + (x2 - 8) + ' ' + (y - 5) + ' L ' + x2 + ' ' + y + ' L ' + (x2 - 8) + ' ' + (y + 5) + ' Z'} fill={alpha(BLUE, 0.6)} />
    </g>
  )
}

/** 生成出来的句子：每个字依次亮起 */
export function GeneratedLine({ x, y, text, size = 42 }: { x: number; y: number; text: string; size?: number }) {
  return (
    <text x={x} y={y} fill={INK} fontSize={size} letterSpacing='0.14em'>
      {text}
    </text>
  )
}
