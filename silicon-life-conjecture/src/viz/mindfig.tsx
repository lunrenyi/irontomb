import { AMBER, DEEP, FAINT, INK, MONO, MUTED, SIGNAL, VIOLET, alpha } from './palette'

export type MindLayer = 'task' | 'self' | 'experience'

export interface RingProps {
  cx: number
  cy: number
  r: number
  /** 这一层是否已经展开 */
  open: number
  color: string
  label: string
  sub: string
}

/**
 * 第五幕的同心结构：越往里越不可观测。
 *
 * 最外圈是任何人都能看到的行为，中间一圈是系统对自己的记录与判断，
 * 最里面那圈始终不点亮 —— 因为主观体验目前没有任何外部证据可以支持。
 */
export function MindRings({ cx, cy, task, self, experience }: { cx: number; cy: number; task: number; self: number; experience: number }) {
  const rings: RingProps[] = [
    { cx, cy, r: 300, open: task, color: SIGNAL, label: '第一层 · 任务能力', sub: '看得见的行为' },
    { cx, cy, r: 205, open: self, color: VIOLET, label: '第二层 · 自我表征', sub: '系统对自己的记录' },
    { cx, cy, r: 112, open: experience, color: AMBER, label: '第三层 · 主观体验', sub: '目前无法从外部观测' },
  ]
  return (
    <g role='img' aria-label='从可观察的行为，到自我表征，再到无法直接观察的主观体验'>
      {rings.map((ring) => (
        <g key={ring.label}>
          <circle cx={cx} cy={cy} r={ring.r} fill='none' stroke={alpha(ring.color, 0.16 + 0.5 * ring.open)} strokeWidth={2.4} strokeDasharray={ring.open > 0.9 ? undefined : '12 10'} />
          <circle cx={cx} cy={cy} r={ring.r} fill={alpha(ring.color, 0.04 * ring.open)} />
          <text x={cx} y={cy - ring.r - 16} fill={ring.open > 0.5 ? ring.color : FAINT} fontSize={30} textAnchor='middle'>
            {ring.label}
          </text>
          <text x={cx} y={cy - ring.r + 6} fill={MUTED} fontSize={23} textAnchor='middle'>
            {ring.sub}
          </text>
        </g>
      ))}
      <circle cx={cx} cy={cy} r={58} fill={alpha(DEEP, 0.9)} stroke={alpha(AMBER, 0.2 + 0.6 * experience)} strokeWidth={2} />
      <text x={cx} y={cy + 8} fill={experience > 0.5 ? AMBER : FAINT} fontSize={46} textAnchor='middle'>
        ?
      </text>
    </g>
  )
}

export interface EvidenceCard {
  id: string
  /** 观察到的行为 */
  behavior: string
  /** 这条证据支持「智能」到什么程度 */
  intelligence: number
  /** 这条证据支持「主观体验」到什么程度 */
  experience: number
  /** 为什么不是 0，也不是 1 */
  reasoning: string
  /** 影片用：观察到的行为，短词 */
  short: string
  /** 影片用：这条证据支持到什么程度，短语 */
  verdict: string
}

export const EVIDENCE: readonly EvidenceCard[] = [
  {
    id: 'solves',
    behavior: '系统能解出没见过的题，并在新题上保持水平。',
    intelligence: 0.85,
    experience: 0.05,
    reasoning: '这是「解决信息处理任务」的直接证据，所以对智能支持很强；但解题本身完全不涉及它内部有没有体验。',
    short: '解出没见过的题',
    verdict: '强支持智能 · 不支持体验',
  },
  {
    id: 'self-model',
    behavior: '系统能报告自己的内部状态，并据此调整接下来的行为。',
    intelligence: 0.6,
    experience: 0.2,
    reasoning: '能处理关于自身的信息，是自我表征的迹象。但「能描述」与「有体验」之间仍隔着无法从外部跨过的一步。',
    short: '报告自己的内部状态',
    verdict: '支持自我表征 · 不支持体验',
  },
  {
    id: 'pain-word',
    behavior: '系统会说出「疼痛」，会描述疼痛的感觉。',
    intelligence: 0.35,
    experience: 0.1,
    reasoning: '语言能力足以让它说出疼痛这个词，而这个词也可能只是从资料里学到的。描述疼痛不等于感受疼痛。',
    short: '会说「疼痛」这个词',
    verdict: '弱支持智能 · 不支持体验',
  },
  {
    id: 'pain-body',
    behavior: '系统有身体、伤害感受器，会自动缩回并躲避伤害。',
    intelligence: 0.45,
    experience: 0.55,
    reasoning: '真实的伤害感受回路是体验的强证据 —— 但大脑里的模拟同样能产生这些反应，所以仍不足以断定。',
    short: '有伤害感受器',
    verdict: '中支持智能 · 中支持体验',
  },
  {
    id: 'reports-self',
    behavior: '系统在被问到时，坚称自己「有」感觉。',
    intelligence: 0.05,
    experience: 0.02,
    reasoning: '系统的自我报告只是它输出的一句话，恰恰是它最容易被训练出来的内容，因此几乎不构成独立证据。',
    short: '坚称自己有感觉',
    verdict: '几乎不构成证据',
  },
]

/** 证据强度条：不是对错判断，而是「支持到什么程度」 */
export function EvidenceBars({ x, y, card, width = 460 }: { x: number; y: number; card: EvidenceCard; width?: number }) {
  const rows = [
    { label: '支持「智能」', value: card.intelligence, color: SIGNAL },
    { label: '支持「有主观体验」', value: card.experience, color: AMBER },
  ]
  return (
    <g>
      {rows.map((row, i) => (
        <g key={row.label} transform={'translate(' + x + ' ' + (y + i * 46) + ')'}>
          <text x={0} y={-10} fill={MUTED} fontSize={23}>
            {row.label}
          </text>
          <rect x={0} y={0} width={width} height={16} rx={8} fill={alpha(DEEP, 0.8)} stroke={alpha(row.color, 0.3)} strokeWidth={1.2} />
          <rect x={0} y={0} width={Math.max(4, row.value * width)} height={16} rx={8} fill={alpha(row.color, 0.7)} />
          <text x={width + 14} y={14} fill={row.color} fontSize={24} fontFamily={MONO}>
            {(row.value * 100).toFixed(0)}%
          </text>
        </g>
      ))}
    </g>
  )
}

/** 术语对照表：智能 / 自我表征 / 意识 / 灵魂，四者不是同义词 */
export const CONCEPTS: ReadonlyArray<{ term: string; definition: string; short: string; color: string }> = [
  { term: '智能', definition: '完成任务、学习与解决问题的能力。可以在外部做测试。', short: '完成任务 · 学习 · 解决问题', color: SIGNAL },
  { term: '自我表征', definition: '系统以某种方式处理关于自身状态的信息。可以在外部做测试。', short: '处理关于自身的信息', color: VIOLET },
  { term: '意识（主观体验）', definition: '对系统而言，体验某件事是什么感觉。目前没有公认的外部判据。', short: '体验是什么感觉', color: AMBER },
  { term: '灵魂', definition: '在不同哲学与宗教传统里含义不同的概念，不能直接换算成某个计算指标。', short: '无法换算成指标', color: INK },
]
