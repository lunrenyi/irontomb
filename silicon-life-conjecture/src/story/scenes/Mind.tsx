import { ChapterTitle, SceneKeys, STAGE_SVG, StageLabel } from '../FilmChrome'
import { ModelFigure } from '../../viz/modelfig'
import { CONCEPTS, EVIDENCE, EvidenceBars, MindRings } from '../../viz/mindfig'
import { BOS, VOCAB, generate } from '../../lib/tinymodel'
import { easeOut } from '../../lib/easing'
import { AMBER, FAINT, INK, MUTED, SIGNAL, alpha } from '../../viz/palette'
import { STAGE_H, STAGE_W, beatsOf } from '../timeline'
import { frac } from '../cues'
import { SCORE } from '../score'

const B = beatsOf('mind')
const SPEC = SCORE.mind

// 生成序列是模型真的算出来的（贪心解码，所以每次渲染完全一致）
const run = generate(BOS, 8)
const SOFT = '#e8ecf7'

const FIG = { x: 170, y: 300, w: 1580 }
const COL = FIG.w / 4

/**
 * 第五幕：能力、自我表征、主观体验。
 * 模型那几拍靠结构本身说话；四个概念的差别用一行对照摆出来；
 * 最后一拍只留一个需要自己想一想的问题。
 */
export function MindScene({ frame }: { frame: number }) {
  const step = Math.floor(frac(frame, B, 1, 0.05, 0.95) * run.steps.length) - 1
  const shown = Math.max(-1, Math.min(run.steps.length - 1, step))
  const generated = run.steps.slice(0, shown + 1).map((s) => VOCAB[s.output]).join('')
  const idx = Math.min(EVIDENCE.length - 1, Math.floor(frac(frame, B, 6, 0.08, 0.95) * EVIDENCE.length))
  return (
    <>
      <ChapterTitle frame={frame} beats={B} title='灵魂和 AI' sub='INTELLIGENCE IS NOT EXPERIENCE' />
      <SceneKeys frame={frame} beats={B} specs={SPEC} />
      {frame < B[5].start ? <ModelStage frame={frame} shown={shown} generated={generated} /> : null}
      {frame >= B[5].start && frame < B[6].start ? <RingsStage frame={frame} /> : null}
      {frame >= B[6].start && frame < B[7].start ? <EvidenceStage frame={frame} index={idx} /> : null}
      {frame >= B[7].start ? <ConceptsStage frame={frame} /> : null}
    </>
  )
}

/** 第 1-4 拍：输入 -> 词向量 -> 加权 -> 概率 -> 取样 */
function ModelStage({ frame, shown, generated }: { frame: number; shown: number; generated: string }) {
  const out = easeOut(frac(frame, B, 5, 0, 0.5))
  // 幕标题退场之后模型才进场：两者不抢同一个位置
  const enter = easeOut(frac(frame, B, 0, 0.6, 0.98))
  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={(1 - out) * enter}>
      <ModelFigure x={FIG.x} y={FIG.y} width={FIG.w} step={shown} steps={run.steps} />
      {['输入', '词向量', '加权', '概率'].map((label, i) => (
        <text key={label} x={FIG.x + COL * i + COL / 2} y={FIG.y + 400} fill={MUTED} fontSize={34} textAnchor='middle'>
          {label}
        </text>
      ))}
      {frame >= B[4].start ? (
        <text x={FIG.x + FIG.w / 2} y={FIG.y + 520} fill={INK} fontSize={62} letterSpacing='0.14em' textAnchor='middle'>
          {generated}
        </text>
      ) : null}
    </svg>
  )
}

/** 第 5 拍：三层同心圆，最里面那圈始终点不亮 */
function RingsStage({ frame }: { frame: number }) {
  const out = easeOut(frac(frame, B, 6, 0, 0.5))
  const task = easeOut(frac(frame, B, 5, 0, 0.3))
  const self = easeOut(frac(frame, B, 5, 0.35, 1))
  const experience = frac(frame, B, 5, 0.45, 0.98) * 0.14
  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={1 - out}>
      <MindRings cx={STAGE_W / 2} cy={560} task={task} self={self} experience={experience} />
    </svg>
  )
}

/** 第 6 拍：一条被观察到的行为，和它能支持到哪一步 */
function EvidenceStage({ frame, index }: { frame: number; index: number }) {
  const card = EVIDENCE[index]
  const out = easeOut(frac(frame, B, 7, 0, 0.5))
  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={1 - out}>
      <rect x={140} y={200} width={1640} height={700} rx={26} fill={alpha('#04060d', 0.92)} stroke={alpha(SIGNAL, 0.22)} strokeWidth={1.4} />
      <StageLabel frame={frame} from={B[6].start + 10} to={B[7].start} x={200} y={290} color={MUTED}>
        观察到的行为
      </StageLabel>
      <text x={200} y={380} fill={INK} fontSize={48}>
        {card.short}
      </text>
      <EvidenceBars x={200} y={500} card={card} width={600} />
      <text x={960} y={500} fill={MUTED} fontSize={30}>
        支持到什么程度
      </text>
      <text x={960} y={600} fill={AMBER} fontSize={44}>
        {card.verdict}
      </text>
    </svg>
  )
}

/** 第 7-8 拍：四个词并排，最后收成一句需要回答的问题 */
function ConceptsStage({ frame }: { frame: number }) {
  const t = easeOut(frac(frame, B, 7, 0, 0.35))
  const fade = 1 - easeOut(frac(frame, B, 8, 0.2, 0.75)) * 0.75
  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={t * fade}>
      {CONCEPTS.map((c, i) => (
        <g key={c.term} transform={'translate(220 ' + (230 + i * 150) + ')'}>
          <text x={0} y={0} fill={c.color} fontSize={50}>
            {c.term}
          </text>
          <text x={400} y={-6} fill={SOFT} fontSize={38}>
            {c.short}
          </text>
          <line x1={0} y1={46} x2={1480} y2={46} stroke={alpha(MUTED, 0.16)} strokeWidth={1} />
        </g>
      ))}
      <text x={220} y={790} fill={FAINT} fontSize={28}>
        从左到右：能做什么 → 能描述自己 → 体验到什么 → 无法测量的那一层
      </text>
    </svg>
  )
}
