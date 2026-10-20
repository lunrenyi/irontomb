import { DIM, embeddingOf, project2D, type Token } from '../lib/llm'
import { AMBER, BLUE, DEEP, FAINT, INK, MONO, MUTED, NAVY, SANS, SIGNAL, VIOLET, alpha } from './palette'

/* ======================================================== 分词：切成片段 */

export interface TokenRibbonProps {
  x: number
  y: number
  /** 这一拍的宽度，按整句话的 token 数量均分 */
  width: number
  tokens: readonly Token[]
  /** 已经切出几个；-1 表示还没开始切 */
  reveal: number
  /** 原始文字是否还留在上面 */
  keepRaw?: boolean
  size?: number
}

/**
 * 一句话被切成一串片段。
 *
 * 上面一行是原文，下面是切出来的片段 —— 两行之间画着切分刻度，
 * 这样「原文 → 片段」的对应关系一眼就看得出来，不需要用一句话去解释。
 */
export function TokenRibbon({ x, y, width, tokens, reveal, keepRaw = true, size = 40 }: TokenRibbonProps) {
  const shown = Math.max(0, Math.min(tokens.length, reveal))
  const slot = width / Math.max(1, tokens.length)
  const boxW = Math.min(slot - 14, size * 3.4)
  return (
    <g role='img' aria-label={'把一句话切成 ' + tokens.length + ' 个片段'}>
      {keepRaw && shown > 0 ? (
        <text x={x + width / 2} y={y - 96} fill={INK} fontSize={size} textAnchor='middle' fontFamily={SANS} letterSpacing='0.06em'>
          {tokens.map((t) => t.text).join('')}
        </text>
      ) : null}
      {tokens.map((t, i) => {
        const on = i < shown
        const cx = x + slot * i + slot / 2
        const color = t.unknown ? MUTED : SIGNAL
        return (
          <g key={i} opacity={on ? 1 : 0}>
            {keepRaw ? (
              <line x1={cx} y1={y - 72} x2={cx} y2={y - 10} stroke={alpha(color, 0.5)} strokeWidth={1.6} strokeDasharray='4 5' />
            ) : null}
            <rect
              x={cx - boxW / 2}
              y={y}
              width={boxW}
              height={62}
              rx={12}
              fill={alpha(color, t.unknown ? 0.06 : 0.14)}
              stroke={alpha(color, 0.75)}
              strokeWidth={1.6}
            />
            <text x={cx} y={y + 41} fill={INK} fontSize={34} textAnchor='middle' fontFamily={SANS}>
              {t.text}
            </text>
            <text x={cx} y={y + 92} fill={t.unknown ? FAINT : MUTED} fontSize={24} textAnchor='middle' fontFamily={MONO}>
              {t.unknown ? '未知' : String(t.id)}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/* ================================================ 向量：片段变成一串数 */

export interface VectorFigureProps {
  x: number
  y: number
  width: number
  tokens: readonly Token[]
  /** 正在展开哪一个 token 的向量 */
  active: number
  /** 数值条画出来多少（0..1） */
  reveal: number
}

/**
 * 一个 token 变成一组数。
 *
 * 上面那一行片段里，当前这一个被点亮；下面画的是它真实的 8 个数。
 * 右边那团点是这些数投到平面上的样子 —— 所以明确标注「二维投影」。
 */
export function VectorFigure({ x, y, width, tokens, active, reveal }: VectorFigureProps) {
  const token = tokens[active]
  const vec = embeddingOf(token.text)
  const slot = width / tokens.length
  const colW = 78
  const barsLeft = x
  const axisY = y + 230
  const projCx = x + width - 168
  const projCy = axisY
  const maxAbs = Math.max(...vec.map(Math.abs))

  return (
    <g role='img' aria-label={'片段「' + token.text + '」被换成 ' + DIM + ' 个数字'}>
      {tokens.map((t, i) => {
        const on = i === active
        const cx = x + slot * i + slot / 2
        return (
          <g key={i} opacity={on ? 1 : 0.34}>
            <rect x={cx - slot / 2 + 8} y={y - 10} width={slot - 16} height={54} rx={11} fill={alpha(on ? SIGNAL : MUTED, 0.1)} stroke={alpha(on ? SIGNAL : MUTED, on ? 0.8 : 0.28)} strokeWidth={1.5} />
            <text x={cx} y={y + 26} fill={on ? INK : MUTED} fontSize={32} textAnchor='middle' fontFamily={SANS}>
              {t.text}
            </text>
          </g>
        )
      })}

      {/* 整块跟着 reveal 一起长出来：数字和条一起出现，
          不然条还只有 1px 高的时候，那一排数字会孤零零地浮在半空 */}
      <g opacity={reveal}>
        <line x1={barsLeft} y1={axisY} x2={barsLeft + DIM * colW} y2={axisY} stroke={alpha(BLUE, 0.3)} strokeWidth={1.2} />
        {vec.map((v, i) => {
          const h = (Math.abs(v) / maxAbs) * 118 * reveal
          const up = v >= 0
          return (
            <g key={i}>
              <rect
                x={barsLeft + i * colW + 16}
                y={up ? axisY - h : axisY}
                width={30}
                height={Math.max(1, h)}
                rx={5}
                fill={alpha(up ? SIGNAL : VIOLET, 0.62)}
              />
              <text x={barsLeft + i * colW + 31} y={up ? axisY - h - 12 : axisY + h + 26} fill={MUTED} fontSize={21} textAnchor='middle' fontFamily={MONO}>
                {v.toFixed(2)}
              </text>
            </g>
          )
        })}
      </g>
      <text x={barsLeft} y={axisY + 176} fill={FAINT} fontSize={23} fontFamily={SANS}>
        这里画的是 {DIM} 维 · 真实模型的向量有几百到几千维
      </text>

      <g>
        <circle cx={projCx} cy={projCy} r={112} fill={alpha(NAVY, 0.35)} stroke={alpha(BLUE, 0.28)} strokeWidth={1.2} />
        <line x1={projCx - 112} y1={projCy} x2={projCx + 112} y2={projCy} stroke={alpha(BLUE, 0.18)} strokeWidth={1} />
        <line x1={projCx} y1={projCy - 112} x2={projCx} y2={projCy + 112} stroke={alpha(BLUE, 0.18)} strokeWidth={1} />
        {tokens.map((t, i) => {
          const p = project2D(embeddingOf(t.text))
          const on = i === active
          return (
            <circle
              key={i}
              cx={projCx + p.x * 96}
              cy={projCy + p.y * 96}
              r={on ? 10 : 5}
              fill={alpha(on ? AMBER : BLUE, on ? 0.95 : 0.34)}
              opacity={on ? 1 : 0.7}
            />
          )
        })}
        <text x={projCx} y={projCy + 152} fill={FAINT} fontSize={22} textAnchor='middle' fontFamily={SANS}>
          二维投影 · 只为看得见
        </text>
      </g>
    </g>
  )
}

/* ============================================ 注意力：同一个词看不同的词 */

export interface AttentionBoardProps {
  x: number
  y: number
  size: number
  tokens: readonly string[]
  matrix: readonly (readonly number[])[]
  /** 正在展开哪一行的注意力；-1 表示整体一起亮 */
  row: number
  /** 0..1，逐格填出来 */
  reveal: number
}

/**
 * 注意力矩阵。
 *
 * 行是「正在看别的词的查询」，列是「被看的词」。格子越亮，权重越大。
 * 上面画弧线：被点亮的那一行，它的连线从下方那个词射向它真正在看的词。
 *
 * 数值是真的 softmax 算出来的（见 llm.ts），但「哪些词相关」那张关联表是人工写死的，
 * 所以这是原理示意，不是真实模型的内部权重。
 */
export function AttentionBoard({ x, y, size, tokens, matrix, row, reveal }: AttentionBoardProps) {
  const cell = size / tokens.length
  const label = 80
  const filled = tokens.length * reveal
  const cxOf = (i: number) => x + label + cell * i + cell / 2
  const cyOf = (i: number) => y + label + cell * i + cell / 2

  return (
    <g role='img' aria-label={'一句 ' + tokens.length + ' 个词的注意力矩阵'}>
      {tokens.map((t, j) => (
        <text key={'c' + j} x={cxOf(j)} y={y + label - 16} fill={row === -1 || row === j ? INK : MUTED} fontSize={26} textAnchor='middle' fontFamily={SANS}>
          {t}
        </text>
      ))}
      {tokens.map((t, i) => (
        <text key={'r' + i} x={x + label - 18} y={cyOf(i) + 9} fill={row === i ? AMBER : MUTED} fontSize={26} textAnchor='end' fontFamily={SANS}>
          {t}
        </text>
      ))}
      {tokens.map((_, i) =>
        tokens.map((__, j) => {
          const order = i * tokens.length + j
          const on = order < filled
          const w = matrix[i][j]
          const hot = row === -1 || row === i
          return (
            <rect
              key={i + '-' + j}
              x={x + label + cell * j + 2}
              y={y + label + cell * i + 2}
              width={cell - 4}
              height={cell - 4}
              rx={5}
              fill={alpha(row === i && j === i ? AMBER : hot ? BLUE : FAINT, on ? 0.1 + Math.sqrt(w) * 0.9 : 0.04)}
              stroke={alpha(row === i ? AMBER : BLUE, on ? (w > 0.3 ? 0.75 : 0.14) : 0.05)}
              strokeWidth={1.1}
            />
          )
        }),
      )}
      {row >= 0 && reveal > 0.55
        ? tokens.map((_, j) => {
            const w = matrix[row][j]
            if (w < 0.2 || j === row) return null
            const x1 = cxOf(row)
            const y1 = cyOf(row) + cell / 2
            const x2 = cxOf(j)
            const y2 = cyOf(j) - cell / 2
            const mx = (x1 + x2) / 2
            const my = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.16 - 30
            return (
              <g key={'arc' + j}>
                <path d={'M ' + x1 + ' ' + y1 + ' Q ' + mx + ' ' + my + ' ' + x2 + ' ' + y2} fill='none' stroke={alpha(AMBER, 0.25 + w * 0.6)} strokeWidth={1 + w * 4} />
                <circle cx={x2} cy={y2} r={4 + w * 7} fill={alpha(AMBER, 0.85)} />
              </g>
            )
          })
        : null}
    </g>
  )
}

/* ========================================== Transformer：同一结构重复很多次 */

export interface StackProps {
  x: number
  y: number
  width: number
  height: number
  /** 画出来几层，中间用省略号表示「还有更多」 */
  layers: number
  /** 正在处理第几层（从 0 开始）；-1 表示整体 */
  active: number
  reveal: number
}

/**
 * Transformer 的层叠结构。
 *
 * 每一层内部都只有两件事：注意力（让每个词互相看看）和前馈网络（逐个词过一遍）。
 * 大模型做的事，就是把这个结构重复几十上百次。
 */
export function TransformerStack({ x, y, width, height, layers, active, reveal }: StackProps) {
  const gap = 12
  const boxH = Math.min(84, (height - gap * (layers - 1)) / layers)
  const inner = boxH - 18
  return (
    <g role='img' aria-label='由多层相同结构堆叠而成的 Transformer'>
      {Array.from({ length: layers }, (_, i) => {
        const by = y + i * (boxH + gap)
        const on = active < 0 || active === i
        const grow = Math.min(1, Math.max(0, reveal * layers - i))
        return (
          <g key={i} opacity={grow * (on ? 1 : 0.4)}>
            <rect x={x} y={by} width={width} height={boxH} rx={14} fill={alpha(on ? SIGNAL : BLUE, 0.07)} stroke={alpha(on ? SIGNAL : BLUE, on ? 0.6 : 0.25)} strokeWidth={1.5} />
            <text x={x - 22} y={by + boxH / 2 + 9} fill={on ? AMBER : FAINT} fontSize={25} textAnchor='end' fontFamily={MONO}>
              {'第 ' + (i + 1) + ' 层'}
            </text>
            <rect x={x + 16} y={by + 9} width={width * 0.46} height={inner} rx={9} fill={alpha(AMBER, 0.13)} stroke={alpha(AMBER, 0.42)} strokeWidth={1.2} />
            <text x={x + 16 + (width * 0.46) / 2} y={by + 9 + inner / 2 + 8} fill={INK} fontSize={25} textAnchor='middle' fontFamily={SANS}>
              注意力
            </text>
            <rect x={x + width * 0.5} y={by + 9} width={width * 0.46 - 16} height={inner} rx={9} fill={alpha(BLUE, 0.13)} stroke={alpha(BLUE, 0.42)} strokeWidth={1.2} />
            <text x={x + width * 0.5 + (width * 0.46 - 16) / 2} y={by + 9 + inner / 2 + 8} fill={INK} fontSize={25} textAnchor='middle' fontFamily={SANS}>
              前馈网络
            </text>
          </g>
        )
      })}
      {y - 26 > 0 ? (
        <text x={x + width} y={y - 12} fill={FAINT} fontSize={22} textAnchor='end' fontFamily={SANS}>
          ↑ 同样的结构，重复几十到上百次
        </text>
      ) : null}
    </g>
  )
}

/** 统一的小标签：告诉观众这一块画的是什么、是不是示意数据 */
export function Caption({ x, y, children, tone = 'muted' }: { x: number; y: number; children: string; tone?: 'muted' | 'amber' | 'signal' }) {
  const color = tone === 'amber' ? AMBER : tone === 'signal' ? SIGNAL : MUTED
  return (
    <text x={x} y={y} fill={alpha(color, 0.85)} fontSize={23} fontFamily={SANS} letterSpacing='0.04em'>
      {children}
    </text>
  )
}

export const LLM_DEEP = DEEP
