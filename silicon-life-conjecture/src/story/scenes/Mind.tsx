import type { ReactNode } from 'react'
import { ChapterTitle, SceneKeys, STAGE_SVG, StageLabel } from '../FilmChrome'
import { AttentionBoard, Caption, TokenRibbon, TransformerStack, VectorFigure } from '../../viz/llmfig'
import { GenerationStage, LossCurve, ParamGrid, ProbBars, TrainLoop } from '../../viz/genfig'
import { CONTEXT_A, CONTEXT_B, DETAILED_STEPS, STEPS, ANSWER, QUESTION, attentionFor, tokenize } from '../../lib/llm'
import { clamp01, easeIn, easeOut, range } from '../../lib/easing'
import { AMBER, BLUE, FAINT, INK, MONO, MUTED, NAVY, SANS, SIGNAL, VIOLET, alpha } from '../../viz/palette'
import { LLM_STAGE } from '../layout'
import { STAGE_H, STAGE_W, beatsOf } from '../timeline'
import { frac } from '../cues'
import { SCORE } from '../score'

const B = beatsOf('mind')
const SPEC = SCORE.mind

const TOKENS = tokenize('今天的天气很好')
const CTX_A = tokenize(CONTEXT_A).map((t) => t.text)
const CTX_B = tokenize(CONTEXT_B).map((t) => t.text)
const ATT_A = attentionFor(CTX_A)
const ATT_B = attentionFor(CTX_B)
const ANSWER_TOKENS = STEPS.map((s) => s.picked)

const X = 150
const W = 1620

/**
 * 第五幕：AI 看起来像在思考，它究竟是怎样生成一句话的？
 *
 * 先把大语言模型的工作过程讲完 —— 文字怎么变成数字、模型怎么结合上下文、
 * 下一个 Token 怎么被一个一个选出来、训练和推理有什么不同 ——
 * 最后才回到意识与灵魂，作为收束的思考。
 *
 * 这一幕没有接入真实模型：分词、向量、注意力、候选概率都是确定性教学数据，
 * 画面上会明确标注。只有训练那条损失曲线是真的（见 lib/tinymodel.ts）。
 */
export function MindScene({ frame }: { frame: number }) {
  return (
    <>
      <ChapterTitle frame={frame} beats={B} title='大模型怎样说话' sub='HOW A MODEL WRITES A SENTENCE' />
      <SceneKeys frame={frame} beats={B} specs={SPEC} />
      {live(frame, 1) ? <AskStage frame={frame} /> : null}
      {live(frame, 2) ? <TokenStage frame={frame} /> : null}
      {live(frame, 3) ? <VectorStage frame={frame} /> : null}
      {live(frame, 4) ? <AttentionStage frame={frame} /> : null}
      {live(frame, 5) ? <StackStage frame={frame} /> : null}
      {live(frame, 6) ? <PredictStage frame={frame} /> : null}
      {live(frame, 7) ? <GenerateStage frame={frame} /> : null}
      {live(frame, 8) ? <TrainStage frame={frame} /> : null}
      {live(frame, 9) ? <ThinkingStage frame={frame} /> : null}
      {live(frame, 10) ? <ClosingStage frame={frame} /> : null}
    </>
  )
}

/**
 * 第 k 拍那一幕的存活区间与不透明度。
 *
 * 幕与幕之间用的是「沉到黑里再浮起来」，这一幕内部的每一拍也照做：
 * 上一拍在 [T-FADE, T] 淡到 0，下一拍从 T 开始才淡入，交界处那一帧全黑。
 *
 * 早先这里用的是交叉溶解：两拍的内容在交界处同时在场，于是
 * 训练那一拍的「大量文本样本」和思考那一拍的「第 2 层」直接压在一起。
 * 这一幕每一拍都有密排的文字，交叉溶解必然撞车 —— 只能压黑。
 *
 * 另一个坑记在这儿：淡入条件曾写成 frac(frame, B, 上一拍, …)，下标差了一拍，
 * 结果好几幕整拍都是 opacity 0，画面上只剩标题和字幕。
 */
const FADE = 7
const endOf = (k: number) => B[k + 1]?.start ?? Number.MAX_SAFE_INTEGER
const live = (frame: number, k: number) => frame >= B[k].start && frame < endOf(k)

/** 这一幕此刻的不透明度 */
const presence = (frame: number, k: number) =>
  easeOut(range(frame, B[k].start, B[k].start + FADE)) * (1 - easeIn(range(frame, endOf(k) - FADE, endOf(k))))

const svg = (o: number, children: ReactNode) => (
  <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={o}>
    {children}
  </svg>
)

/** 第 1-2 拍：先看见一句回答，再看见它其实是算出来的 */
function AskStage({ frame }: { frame: number }) {
  const typed = Math.floor(easeOut(frac(frame, B, 1, 0.04, 0.44)) * ANSWER.length)
  const zoom = easeIn(frac(frame, B, 1, 0.4, 0.8))
  const cellW = (W - 20) / ANSWER_TOKENS.length
  return svg(
    presence(frame, 1),
    <>
      <text x={X} y={LLM_STAGE.top + 16} fill={MUTED} fontSize={28} fontFamily={SANS}>
        用户提问
      </text>
      <rect x={X - 18} y={LLM_STAGE.top + 38} width={W + 36} height={92} rx={18} fill={alpha(SIGNAL, 0.08)} stroke={alpha(SIGNAL, 0.42)} strokeWidth={1.5} />
      <text x={X + 12} y={LLM_STAGE.top + 100} fill={INK} fontSize={46} fontFamily={SANS}>
        {QUESTION}
      </text>
      <text x={X} y={LLM_STAGE.top + 212} fill={MUTED} fontSize={28} fontFamily={SANS}>
        模型生成的回答
      </text>
      <text x={X} y={LLM_STAGE.top + 292} fill={INK} fontSize={52} fontFamily={SANS} letterSpacing='0.05em'>
        {ANSWER.slice(0, typed)}
        {typed < ANSWER.length ? <tspan fill={alpha(SIGNAL, 0.8)}>▍</tspan> : null}
      </text>
      <g opacity={zoom}>
        {ANSWER_TOKENS.map((t, i) => {
          const cx = X + cellW * i + cellW / 2
          const v = 0.41 + ((i * 7) % 5) * 0.05
          return (
            <g key={i}>
              <rect x={cx - cellW / 2 + 5} y={LLM_STAGE.top + 356} width={cellW - 10} height={54} rx={11} fill={alpha(SIGNAL, 0.1)} stroke={alpha(SIGNAL, 0.4)} strokeWidth={1.2} />
              <text x={cx} y={LLM_STAGE.top + 393} fill={INK} fontSize={26} textAnchor='middle' fontFamily={SANS}>
                {t}
              </text>
              <line x1={cx} y1={LLM_STAGE.top + 410} x2={cx} y2={LLM_STAGE.top + 466} stroke={alpha(BLUE, 0.35)} strokeWidth={1.4} strokeDasharray='4 6' />
              <text x={cx} y={LLM_STAGE.top + 498} fill={alpha(BLUE, 0.9)} fontSize={26} textAnchor='middle' fontFamily={MONO}>
                {(v * 2 - 1).toFixed(2)}
              </text>
            </g>
          )
        })}
        <text x={X} y={LLM_STAGE.top + 566} fill={FAINT} fontSize={24} fontFamily={SANS}>
          文字只是表面 —— 底下全是这样的一串数字
        </text>
      </g>
    </>,
  )
}

/** 第 3 拍：文字被切成片段 */
function TokenStage({ frame }: { frame: number }) {
  const reveal = Math.ceil(easeOut(frac(frame, B, 2, 0.04, 0.78)) * TOKENS.length)
  return svg(
    presence(frame, 2),
    <>
      <TokenRibbon x={X + 70} y={LLM_STAGE.top + 130} width={W - 140} tokens={TOKENS} reveal={reveal} />
      <Caption x={X} y={LLM_STAGE.top + 380}>
        真实模型用 BPE 之类的办法，词表有几万条，切法不一定这样
      </Caption>
    </>,
  )
}

/** 第 4 拍：片段变成一组数 */
function VectorStage({ frame }: { frame: number }) {
  const active = Math.min(TOKENS.length - 1, Math.floor(frac(frame, B, 3, 0.04, 0.8) * TOKENS.length))
  const reveal = easeOut(frac(frame, B, 3, 0.12, 0.55))
  return svg(
    presence(frame, 3),
    <>
      <VectorFigure x={X} y={LLM_STAGE.top + 96} width={W - 30} tokens={TOKENS} active={active} reveal={reveal} />
    </>,
  )
}

/** 第 5 拍：同一个「苹果」，落在两种上下文里，看的是不同的词 */
function AttentionStage({ frame }: { frame: number }) {
  const t = frac(frame, B, 4, 0.06, 0.92)
  const switchAt = 0.46
  const onB = t > switchAt
  const local = onB ? (t - switchAt) / (1 - switchAt) : t / switchAt
  const tokens = onB ? CTX_B : CTX_A
  const matrix = onB ? ATT_B : ATT_A
  const row = tokens.indexOf('苹果')
  const boardSize = 470
  const bx = X + 560
  const reveal = easeOut(local)
  const ranked = tokens.map((t2, j) => ({ text: t2, w: matrix[row][j] })).sort((a, b) => b.w - a.w)

  return svg(
    presence(frame, 4),
    <>
      <text x={X} y={LLM_STAGE.top + 16} fill={INK} fontSize={38} fontFamily={SANS}>
        {onB ? CONTEXT_B : CONTEXT_A}
      </text>
      <StageLabel
        frame={frame}
        from={B[4].start + 6}
        to={B[5].start}
        x={X + W}
        y={LLM_STAGE.top + 12}
        anchor='end'
        inSvg
        color={onB ? AMBER : SIGNAL}
      >
        {onB ? '苹果 看向 芯片' : '苹果 看向 篮子'}
      </StageLabel>
      <AttentionBoard x={bx} y={LLM_STAGE.top + 66} size={boardSize} tokens={tokens} matrix={matrix} row={reveal > 0.5 ? row : -1} reveal={reveal} />
      <text x={X} y={LLM_STAGE.top + 120} fill={MUTED} fontSize={26} fontFamily={SANS}>
        同一个词
      </text>
      <text x={X} y={LLM_STAGE.top + 188} fill={AMBER} fontSize={58} fontFamily={SANS}>
        苹果
      </text>
      <text x={X} y={LLM_STAGE.top + 258} fill={FAINT} fontSize={24} fontFamily={SANS}>
        这句话里的词
      </text>
      {tokens.map((t2, i) => (
        <g key={i} opacity={reveal}>
          <rect
            x={X}
            y={LLM_STAGE.top + 288 + i * 56}
            width={t2 === '苹果' ? 160 : 142}
            height={46}
            rx={11}
            fill={alpha(t2 === '苹果' ? AMBER : SIGNAL, 0.14)}
            stroke={alpha(t2 === '苹果' ? AMBER : SIGNAL, 0.55)}
            strokeWidth={1.3}
          />
          <text x={X + 71} y={LLM_STAGE.top + 319 + i * 56} fill={t2 === '苹果' ? AMBER : INK} fontSize={27} textAnchor='middle' fontFamily={SANS}>
            {t2}
          </text>
        </g>
      ))}
      <text x={X + 1150} y={LLM_STAGE.top + 120} fill={MUTED} fontSize={26} fontFamily={SANS}>
        它最在意的是
      </text>
      {ranked.slice(0, 3).map((r, i) => (
        <g key={r.text} opacity={reveal}>
          <text x={X + 1150} y={LLM_STAGE.top + 200 + i * 88} fill={i === 0 ? AMBER : MUTED} fontSize={32} fontFamily={SANS}>
            {r.text}
          </text>
          <rect x={X + 1280} y={LLM_STAGE.top + 176 + i * 88} width={300} height={16} rx={8} fill={alpha(NAVY, 0.5)} />
          <rect x={X + 1280} y={LLM_STAGE.top + 176 + i * 88} width={Math.max(3, 300 * r.w * reveal)} height={16} rx={8} fill={alpha(AMBER, 0.82)} />
          <text x={X + 1610} y={LLM_STAGE.top + 192 + i * 88} fill={FAINT} fontSize={24} fontFamily={MONO}>
            {r.w.toFixed(2)}
          </text>
        </g>
      ))}
      <Caption x={bx + 80} y={LLM_STAGE.top + 66 + boardSize + 74}>
        格子越亮表示权重越大 · 权重由 softmax 算出，相关关系是教学用的示意数据
      </Caption>
    </>,
  )
}

/** 第 6 拍：同样的结构，一层一层往上叠 */
function StackStage({ frame }: { frame: number }) {
  const t = easeOut(frac(frame, B, 5, 0.06, 0.88))
  const layers = 4
  const boxH = 74
  const stackY = LLM_STAGE.top + 96
  return svg(
    presence(frame, 5),
    <>
      <TransformerStack x={X + 130} y={stackY} width={W - 260} height={layers * (boxH + 12)} layers={layers} active={Math.min(layers - 1, Math.floor(t * layers))} reveal={t} />
      <g opacity={clamp01(t * 1.4 - 0.5)}>
        <text x={X} y={LLM_STAGE.top + 16} fill={MUTED} fontSize={28} fontFamily={SANS}>
          每层都对表示做两件事：让词互相看看，再逐个词过一遍
        </text>
        <text x={X} y={stackY + layers * (boxH + 12) + 64} fill={FAINT} fontSize={24} fontFamily={SANS}>
          表示每过一层就被改写一次 —— 传到最上面时，已经不是原来那个词了
        </text>
      </g>
    </>,
  )
}

/** 第 7 拍：给出下一个 Token 的候选概率 */
function PredictStage({ frame }: { frame: number }) {
  const step = STEPS[4]
  const t = frac(frame, B, 6, 0.08, 0.9)
  return svg(
    presence(frame, 6),
    <>
      <text x={X} y={LLM_STAGE.top + 16} fill={MUTED} fontSize={28} fontFamily={SANS}>
        当前的上下文
      </text>
      {step.context.map((tok, i) => (
        <g key={i}>
          <rect x={X + i * 96} y={LLM_STAGE.top + 44} width={86} height={56} rx={12} fill={alpha(SIGNAL, 0.13)} stroke={alpha(SIGNAL, 0.5)} strokeWidth={1.3} />
          <text x={X + 43 + i * 96} y={LLM_STAGE.top + 82} fill={INK} fontSize={30} textAnchor='middle' fontFamily={SANS}>
            {tok}
          </text>
        </g>
      ))}
      <ProbBars x={X + 180} y={LLM_STAGE.top + 190} width={W - 360} candidates={step.candidates} reveal={easeOut(t)} picked='蓝光' pickReveal={easeOut(t * 1.3 - 0.5)} barH={38} gap={82} />
      <Caption x={X} y={LLM_STAGE.top + 470} tone='amber'>
        这里的概率是教学用的示意数据，不是任何真实模型的输出
      </Caption>
    </>,
  )
}

/** 第 8 拍：自回归生成 —— 这一章的高潮 */
function GenerateStage({ frame }: { frame: number }) {
  const t = frac(frame, B, 7, 0.04, 0.94)
  const DETAIL_END = 0.66

  // 前几步慢慢走，把机制看清楚；剩下的快速流完，让句子完整
  const tail = t >= DETAIL_END
  const idx = tail
    ? STEPS.length - 1
    : Math.min(DETAILED_STEPS - 1, Math.floor((t / DETAIL_END) * DETAILED_STEPS))
  const local = tail ? 1 : (t / DETAIL_END) * DETAILED_STEPS - idx
  const count = tail
    ? DETAILED_STEPS + Math.round(((t - DETAIL_END) / (1 - DETAIL_END)) * (STEPS.length - DETAILED_STEPS))
    : idx + (local > 0.72 ? 1 : 0)

  const step = STEPS[tail ? Math.min(STEPS.length - 1, Math.max(0, count - 1)) : idx]
  const context = ANSWER_TOKENS.slice(0, count)
  const picked = local > 0.42 ? step.picked : null
  const pickReveal = tail ? 1 : easeOut((local - 0.42) / 0.2)
  return svg(
    presence(frame, 7),
    <>
      <GenerationStage
        x={X}
        y={LLM_STAGE.top + 40}
        width={W}
        context={context}
        picked={picked}
        candidates={step.candidates}
        total={STEPS.length}
        step={tail ? count : idx + 1}
        reveal={1}
        pickReveal={tail ? 0 : pickReveal}
        barsX={X + 850}
        barsY={LLM_STAGE.top + 360}
      />
      {tail ? (
        <text x={X} y={LLM_STAGE.top + 84} fill={alpha(SIGNAL, 0.7)} fontSize={26} fontFamily={SANS}>
          {'剩下的片段继续按同样的方式补齐 →'}
        </text>
      ) : null}
    </>,
  )
}

/** 第 9 拍：训练改参数，推理用参数 */
function TrainStage({ frame }: { frame: number }) {
  const t = frac(frame, B, 8, 0.05, 0.92)
  /**
   * 训练和推理是同一幕里前后两段，中间也走「沉到黑里再浮起来」。
   * 早先两段各自用自己的局部进度算不透明度，结果大部分时间两段同时在场 ——
   * 「大量文本样本」直接压在「空气分子会把蓝光…」上面。这里改成一条总时间线，
   * 前段在 t=0.58 前淡完，后段从 t=0.58 才开始亮，交界处没有同时出现的窗口。
   */
  const trainOut = 1 - easeIn(clamp01((t - 0.50) / 0.08))
  const inferIn = easeOut(clamp01((t - 0.58) / 0.1))
  const local = clamp01(t / 0.5)

  return svg(
    presence(frame, 8),
    <>
      <g opacity={trainOut}>
        <text x={X} y={LLM_STAGE.top + 16} fill={AMBER} fontSize={34} fontFamily={SANS}>
          训练 · 调整模型参数
        </text>
        <TrainLoop x={X} y={LLM_STAGE.top + 40} width={W} reveal={easeOut(local * 0.5) * 3} />
        <LossCurve x={X} y={LLM_STAGE.top + 400} width={880} height={180} reveal={easeOut(clamp01(local * 1.5 - 0.3))} />
        <ParamGrid x={X + 980} y={LLM_STAGE.top + 400} width={W - 980} height={180} cols={16} rows={7} reveal={easeOut(clamp01(local * 1.4 - 0.2))} />
      </g>
      <g opacity={inferIn}>
        <text x={X} y={LLM_STAGE.top + 16} fill={SIGNAL} fontSize={34} fontFamily={SANS}>
          推理 · 使用已经训练好的模型
        </text>
        <ParamGrid x={X} y={LLM_STAGE.top + 90} width={520} height={200} cols={16} rows={7} reveal={1} locked />
        <text x={X + 600} y={LLM_STAGE.top + 150} fill={INK} fontSize={40} fontFamily={SANS}>
          {'「' + QUESTION + '」'}
        </text>
        <text x={X + 600} y={LLM_STAGE.top + 222} fill={INK} fontSize={40} fontFamily={SANS}>
          {ANSWER}
        </text>
        <text x={X + 600} y={LLM_STAGE.top + 288} fill={FAINT} fontSize={24} fontFamily={SANS}>
          参数不再改变 · 一个片段一个片段地补出来
        </text>
        <Caption x={X} y={LLM_STAGE.top + 430}>
          预训练只是基础，之后还有指令微调等后训练，用来调整模型的行为
        </Caption>
        <Caption x={X} y={LLM_STAGE.top + 488}>
          模型不会一边对话一边重新学一遍，也不会自己去网上搜索原文
        </Caption>
      </g>
    </>,
  )
}

/** 第 10 拍：镜头拉远，结构淡出，只剩那句话 */
function ThinkingStage({ frame }: { frame: number }) {
  const t = frac(frame, B, 9, 0.06, 0.9)
  /**
   * 先把网络结构看一遍，再让它整个退场、只剩那句话。
   * 两段刻意错开：结构在 t=0.45 前就淡完，回答 t=0.45 之后才亮 ——
   * 一开始是两样同时画在同一个位置，层的标签会压在回答上。
   */
  const structure = 1 - easeOut(clamp01((t - 0.24) / 0.21))
  const answer = easeOut(clamp01((t - 0.46) / 0.3))
  const note = easeOut(clamp01((t - 0.62) / 0.3))
  return svg(
    presence(frame, 9),
    <>
      <g opacity={structure}>
        <TransformerStack x={X + 260} y={LLM_STAGE.top + 40} width={1100} height={300} layers={3} active={-1} reveal={structure} />
      </g>
      <text x={STAGE_W / 2} y={LLM_STAGE.top + 230} fill={INK} fontSize={52} textAnchor='middle' fontFamily={SANS} letterSpacing='0.05em' opacity={answer}>
        {ANSWER}
      </text>
      <text x={STAGE_W / 2} y={LLM_STAGE.top + 330} fill={alpha(AMBER, note)} fontSize={34} textAnchor='middle' fontFamily={SANS}>
        看上去像在思考 —— 它只是在算下一个 Token
      </text>
    </>,
  )
}

const TERMS = [
  { term: '智能', color: SIGNAL, desc: '完成任务、学习规律、解决问题的能力' },
  { term: '意识', color: AMBER, desc: '尤其是主观体验：体验某件事对它而言是什么感觉' },
  { term: '灵魂', color: VIOLET, desc: '不同哲学与宗教传统含义不同，不能换算成某个计算指标' },
]

/** 第 11 拍：把智能、意识、灵魂分开，然后留下一个开放问题 */
function ClosingStage({ frame }: { frame: number }) {
  const t = easeOut(frac(frame, B, 10, 0.04, 0.4))
  const fade = 1 - easeOut(frac(frame, B, 10, 0.62, 0.96)) * 0.4
  const step = frac(frame, B, 10, 0.08, 0.55)
  return svg(
    presence(frame, 10) * t * fade,
    <>
      {TERMS.map((row, i) => {
        const on = easeOut(clamp01((step - i * 0.13) * 4))
        const ty = LLM_STAGE.top + 50 + i * 92
        return (
          <g key={row.term} opacity={on}>
            <text x={X} y={ty} fill={row.color} fontSize={46} fontFamily={SANS}>
              {row.term}
            </text>
            <text x={X + 210} y={ty - 4} fill={INK} fontSize={33} fontFamily={SANS}>
              {row.desc}
            </text>
            <line x1={X} y1={ty + 28} x2={X + W} y2={ty + 28} stroke={alpha(MUTED, 0.18)} strokeWidth={1} />
          </g>
        )
      })}
      <Caption x={X} y={LLM_STAGE.top + 360}>
        流畅的语言、能解释自己的做法，都还不能证明存在主观体验
      </Caption>
      <Caption x={X} y={LLM_STAGE.top + 412}>
        反过来：由芯片构成，也不能证明非生物系统将来绝不可能有意识
      </Caption>
    </>,
  )
}
