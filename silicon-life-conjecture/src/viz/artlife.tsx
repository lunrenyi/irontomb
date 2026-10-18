import type { Generation } from '../lib/evolve'
import { AMBER, BLUE, DEEP, FAINT, INK, MONO, MUTED, SIGNAL, VIOLET, alpha } from './palette'

export interface LifeTrait {
  id: string
  label: string
  /** 假想的人工系统在这一项上做到多少；措辞必须留有余地 */
  level: number
  note: string
}

export const TRAITS: readonly LifeTrait[] = [
  { id: 'sense', label: '感知外部环境', level: 1, note: '今天的系统已经在做。' },
  { id: 'energy', label: '用能量维持运作', level: 1, note: '今天的系统已经在做，只是能量来自外部电网。' },
  { id: 'repair', label: '检测自身故障', level: 0.6, note: '今天有部分能力，但要自己动手修还差得远。' },
  { id: 'adapt', label: '根据环境调整状态', level: 0.7, note: '今天能做到有限程度。' },
  { id: 'maintain', label: '自我维持', level: 0.25, note: '需要有人维护硬件、供电与更新。' },
  { id: 'replicate', label: '复制自身', level: 0.05, note: '复制数据很容易，复制整个系统是另一回事。' },
  { id: 'inherit', label: '复制时发生可遗传的变化', level: 0.02, note: '这是科学思想实验里提出的条件。' },
  { id: 'select', label: '通过环境选择逐步演化', level: 0.02, note: '这是科学思想实验里提出的条件。' },
]

/** 一圈能力环：越亮越接近「今天已经做到的」 */
export function TraitRing({ cx, cy, radius, traits }: { cx: number; cy: number; radius: number; traits: readonly LifeTrait[] }) {
  return (
    <g role='img' aria-label='假想人工系统的一项项能力'>
      <circle cx={cx} cy={cy} r={radius} fill={alpha(DEEP, 0.7)} stroke={alpha(SIGNAL, 0.2)} strokeWidth={1.4} />
      {traits.map((trait, i) => {
        const a = -Math.PI / 2 + (i / traits.length) * Math.PI * 2
        const px = cx + Math.cos(a) * radius
        const py = cy + Math.sin(a) * radius
        const color = trait.level > 0.6 ? SIGNAL : trait.level > 0.15 ? BLUE : AMBER
        return (
          <g key={trait.id}>
            <line x1={cx + Math.cos(a) * radius * 0.28} y1={cy + Math.sin(a) * radius * 0.28} x2={px} y2={py} stroke={alpha(color, 0.18 + 0.5 * trait.level)} strokeWidth={2 + 5 * trait.level} />
            <circle cx={px} cy={py} r={7 + 9 * trait.level} fill={alpha(color, 0.25 + 0.5 * trait.level)} />
          </g>
        )
      })}
    </g>
  )
}

/** 进化过程：个体是真的跑出来的，不是画出来的 */
export function EvolutionPanel({ x, y, width, gen, generations, reveal = 0.3 }: { x: number; y: number; width: number; gen: number; generations: readonly Generation[]; reveal?: number }) {
  const current = generations[Math.min(Math.max(gen, 0), generations.length - 1)]
  const cols = 6
  const rows = Math.ceil(current.population.length / cols)
  const shown = Math.floor(current.population.length * reveal)
  const footY = y + 36 + rows * 16
  return (
    <g role='img' aria-label='一个真的在跑的进化过程'>
      <text x={x} y={y - 14} fill={MUTED} fontSize={23}>
        环境现在偏好这一串：
      </text>
      {current.target.map((g, i) => (
        <text key={i} x={x + i * 22} y={y + 12} fill={g ? AMBER : FAINT} fontSize={25} fontFamily={MONO}>
          {g}
        </text>
      ))}
      {current.population.slice(0, shown).map((ind, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        return (
          <g key={i}>
            <rect x={x + col * (width * 0.13)} y={y + 36 + row * 16} width={width * 0.1} height={12} rx={3} fill={alpha(ind.fitness > 0.85 ? SIGNAL : BLUE, 0.2 + ind.fitness * 0.7)} />
          </g>
        )
      })}
      <text x={x} y={footY + 26} fill={INK} fontSize={25}>
        第 {current.generation} 代 · 最好 {(current.best * 100).toFixed(0)}% · 平均 {(current.mean * 100).toFixed(0)}%
      </text>
      <rect x={x} y={footY + 40} width={width * 0.6} height={10} rx={5} fill={alpha(DEEP, 0.9)} stroke={alpha(SIGNAL, 0.3)} strokeWidth={1} />
      <rect x={x} y={footY + 40} width={width * 0.6 * current.mean} height={10} rx={5} fill={alpha(SIGNAL, 0.7)} />
      <text x={x + width * 0.6 + 16} y={footY + 50} fill={MUTED} fontSize={22}>
        种群多样度 {(current.diversity * 100).toFixed(0)}%
      </text>
    </g>
  )
}

/** 正 n 边形的顶点（用来画分子骨架） */
function ring(radius: number, n: number): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2
    return { x: Math.cos(a) * radius, y: Math.sin(a) * radius }
  })
}

/** 第六幕开场：硅作为化学骨架，和硅作为半导体硬件，是两回事 */
function ChemMark({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <g transform={'translate(' + cx + ' ' + cy + ')'}>
      <polygon points={ring(88, 6).map((p) => p.x + ',' + p.y).join(' ')} fill='none' stroke={alpha(color, 0.65)} strokeWidth={2.4} />
      {ring(88, 6).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={12} fill={alpha(color, 0.85)} />
      ))}
      {ring(88, 3).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={6} fill={alpha(color, 0.45)} />
      ))}
    </g>
  )
}

function ChipMark({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <g transform={'translate(' + cx + ' ' + cy + ')'}>
      {Array.from({ length: 16 }, (_, i) => (
        <rect
          key={i}
          x={(i % 4) * 42}
          y={Math.floor(i / 4) * 42}
          width={34}
          height={34}
          rx={5}
          fill={alpha(color, 0.16)}
          stroke={alpha(color, 0.6)}
          strokeWidth={1.8}
        />
      ))}
    </g>
  )
}

/**
 * 第六幕开场的关键对照。
 * 字号按 1920x1080 成片给足：标题 54、要点 34、脚注 34，不再是脚注大小。
 */
export function TwoSilicons({ x, y, gap = 420, scale = 1 }: { x: number; y: number; gap?: number; scale?: number }) {
  const w = gap - 40
  const box = (
    bx: number,
    title: string,
    sub: string,
    color: string,
    lines: string[],
    foot: string,
    footColor: string,
    mark: 'chem' | 'chip',
  ) => (
    <g transform={'translate(' + bx + ' ' + y + ') scale(' + scale + ')'}>
      <rect x={-30} y={-40} width={w} height={560} rx={22} fill={alpha(color, 0.07)} stroke={alpha(color, 0.4)} strokeWidth={1.8} />
      <text x={0} y={46} fill={color} fontSize={54} letterSpacing='0.04em'>
        {title}
      </text>
      <text x={0} y={98} fill={MUTED} fontSize={32}>
        {sub}
      </text>
      {mark === 'chem' ? <ChemMark cx={w / 2 - 20} cy={200} color={color} /> : <ChipMark cx={w / 2 - 84} cy={132} color={color} />}
      {lines.map((line, i) => (
        <text key={line} x={0} y={320 + i * 52} fill={INK} fontSize={34}>
          · {line}
        </text>
      ))}
      <line x1={0} y1={456} x2={w - 60} y2={456} stroke={alpha(MUTED, 0.2)} strokeWidth={1.2} />
      <text x={0} y={498} fill={footColor} fontSize={34}>
        {foot}
      </text>
    </g>
  )
  return (
    <g role='img' aria-label='硅基化学生命与硅芯片上的人工系统是两种不同的东西'>
      {box(x, '硅基化学生命', '假想中的另一种化学生命', BLUE, ['以硅参与构成重要的化学骨架', '有膜、有代谢、能自我维持', '能繁殖并发生可遗传变化'], '目前没有任何实验发现它', AMBER, 'chem')}
      {box(x + gap, '硅芯片上的人工系统', '今天真实存在的技术', VIOLET, ['硅是半导体，用来制造晶体管', '跑的是软件与神经网络模型', '用硅并不等于用硅基化学'], '它不是生物学意义上的硅基生命', SIGNAL, 'chip')}
    </g>
  )
}
