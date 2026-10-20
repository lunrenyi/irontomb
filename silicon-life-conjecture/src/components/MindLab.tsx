import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ANSWER_TOKENS,
  CONTEXT_A,
  CONTEXT_B,
  DIM,
  QUESTION,
  STEPS,
  adjustForTemperature,
  attentionFor,
  decode,
  embeddingOf,
  tokenize,
} from '../lib/llm'
import { CONCEPTS } from '../viz/mindfig'
import { Chip, Note, Slider } from './ui'

const PRESETS = ['今天的天气很好', CONTEXT_A, CONTEXT_B, '宇宙里的信息是怎么存的']

/**
 * 大模型实验室。
 *
 * 四件事，随便怎么点都不会算错：
 *   1. 一句话怎么被切成片段（真的跑一遍最长匹配分词）
 *   2. 选中的片段变成了哪几个数
 *   3. 这个片段在当前上下文里看哪些词（真的跑一遍 softmax）
 *   4. 下一个 Token 是怎么从概率分布里被选出来的（真的跑一遍解码）
 *
 * 「苹果」那两句可以来回切：同一个词，两种上下文，权重大不一样。
 * 这些都是确定性教学数据，不是真实模型的内部状态。
 */
export function MindLab() {
  const [text, setText] = useState(PRESETS[1])
  const [active, setActive] = useState(2)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [temperature, setTemperature] = useState(0.7)
  const [greedy, setGreedy] = useState(true)
  const timer = useRef<number | null>(null)

  const tokens = useMemo(() => tokenize(text), [text])
  const matrix = useMemo(() => attentionFor(tokens.map((t) => t.text)), [tokens])
  const picked = useMemo(() => STEPS.map((s) => decode(s.candidates, temperature, greedy)), [temperature, greedy])
  const current = STEPS[Math.min(step, STEPS.length - 1)]
  const dist = adjustForTemperature(current.candidates, temperature)
  const pickedHere = picked[step] ?? current.picked
  const context = picked.slice(0, step)

  useEffect(() => {
    setActive(0)
  }, [text])

  useEffect(() => {
    if (!playing) return
    timer.current = window.setInterval(() => {
      setStep((s) => {
        if (s + 1 >= STEPS.length) {
          setPlaying(false)
          return s
        }
        return s + 1
      })
    }, 1100)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [playing])

  const restart = () => {
    setPlaying(false)
    setStep(0)
  }
  const token = tokens[Math.min(active, Math.max(0, tokens.length - 1))]
  const vec = embeddingOf(token?.text ?? '')
  const row = matrix[Math.min(active, matrix.length - 1)] ?? []
  const ranked = tokens.map((t, j) => ({ t, w: row[j] ?? 0 })).sort((a, b) => b.w - a.w)
  const maxAbs = Math.max(0.001, ...vec.map(Math.abs))

  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-10'>
      <div className='flex flex-col gap-5'>
        <div className='glass-panel rounded-2xl p-5 sm:p-7'>
          <h3 className='text-[15px] font-semibold text-paper'>① 一句话怎么被切开</h3>
          <p className='mt-2 text-[13px] leading-relaxed text-muted'>
            点下面的例子，或者自己输一句。真实模型用的是 BPE 之类的办法，词表有几万条；这里只有三十来个词条，切法会很不一样。
          </p>
          <div className='mt-4 flex flex-wrap gap-2'>
            {PRESETS.map((p) => (
              <Chip key={p} tone={p === text ? 'signal' : 'paper'} active={p === text} onClick={() => setText(p)}>
                {p}
              </Chip>
            ))}
          </div>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='也可以自己写一句…'
            className='mt-3 w-full rounded-xl border border-signal/20 bg-ink-950/60 px-4 py-2.5 text-[14px] text-paper outline-none focus:border-signal/50'
          />
          <div className='mt-4 flex flex-wrap gap-2'>
            {tokens.map((t, i) => (
              <button
                key={i}
                type='button'
                onClick={() => setActive(i)}
                className={
                  'rounded-lg border px-3 py-2 text-[15px] transition-colors ' +
                  (i === active ? 'border-signal bg-signal/20 text-signal' : 'border-signal/20 text-paper/85 hover:border-signal/40')
                }
              >
                {t.text}
                <span className='ml-1.5 font-mono text-[10px] text-muted'>{t.unknown ? '未知' : t.id}</span>
              </button>
            ))}
          </div>
        </div>

        <div className='glass-panel rounded-2xl p-5 sm:p-7'>
          <h3 className='text-[15px] font-semibold text-paper'>② 这个片段变成了哪几个数</h3>
          <div className='mt-4 space-y-2'>
            {vec.map((v, i) => (
              <div key={i} className='flex items-center gap-3'>
                <span className='w-4 shrink-0 font-mono text-[11px] text-muted'>{i}</span>
                <div className='relative h-3 flex-1 overflow-hidden rounded bg-ink-950/70'>
                  <div className='absolute left-1/2 top-0 h-full w-px bg-paper/20' />
                  <div
                    className={'absolute top-0 h-full rounded ' + (v >= 0 ? 'bg-signal/70' : 'bg-violet/70')}
                    style={v >= 0 ? { left: '50%', width: (Math.abs(v) / maxAbs) * 50 + '%' } : { right: '50%', width: (Math.abs(v) / maxAbs) * 50 + '%' }}
                  />
                </div>
                <span className='w-14 shrink-0 text-right font-mono text-[12px] text-paper/90'>{v.toFixed(3)}</span>
              </div>
            ))}
          </div>
          <p className='mt-3 text-[12px] text-muted'>
            这里画的是 {DIM} 维，真实模型的向量有几百到几千维。这些数值是确定性生成的，不是真实模型的参数。
          </p>

          <h3 className='mt-7 text-[15px] font-semibold text-paper'>③ 它在上下文里看哪些词</h3>
          <p className='mt-2 text-[12px] text-muted'>
            把上面两个「苹果」的例子切来切去：同一个词，权重大不一样。
          </p>
          <div className='mt-3 space-y-2'>
            {ranked.slice(0, 5).map(({ t, w }) => (
              <div key={t.text} className='flex items-center gap-3'>
                <span className='w-16 shrink-0 text-[13px] text-paper/90'>{t.text}</span>
                <div className='h-2.5 flex-1 overflow-hidden rounded bg-ink-950/70'>
                  <div className='h-full rounded bg-amber/70' style={{ width: (w * 100).toFixed(1) + '%' }} />
                </div>
                <span className='w-12 shrink-0 text-right font-mono text-[12px] text-muted'>{w.toFixed(3)}</span>
              </div>
            ))}
          </div>
          <p className='mt-3 text-[12px] text-muted'>
            权重是对人工写死的关联表跑一遍 softmax 得来的 —— 原理示意，不是真实模型的内部权重。
          </p>
        </div>
      </div>

      <aside className='flex flex-col gap-5'>
        <div className='glass-panel rounded-2xl p-5'>
          <h3 className='text-[15px] font-semibold text-paper'>④ 下一个 Token 是怎么被选出来的</h3>
          <div className='mt-3 rounded-xl border border-signal/20 bg-ink-950/50 px-4 py-3'>
            <div className='text-[11px] uppercase tracking-[0.2em] text-muted'>提问</div>
            <div className='mt-1 text-[13px] text-paper/90'>{QUESTION}</div>
          </div>
          <div className='mt-3 rounded-xl border border-amber/25 bg-amber/5 px-4 py-3'>
            <div className='text-[11px] uppercase tracking-[0.2em] text-muted'>
              已生成 {step} / {STEPS.length} 个片段
            </div>
            <div className='mt-1 min-h-[3em] text-[15px] leading-relaxed text-paper'>
              {context.join('')}
              <span className='text-amber'>{pickedHere}</span>
            </div>
          </div>
          <div className='mt-4 space-y-2'>
            {dist.map((c) => {
              const on = c.text === pickedHere
              return (
                <div key={c.text} className='flex items-center gap-3'>
                  <span className={'w-16 shrink-0 text-[14px] ' + (on ? 'text-amber' : 'text-paper/85')}>{c.text}</span>
                  <div className='relative h-3 flex-1 overflow-hidden rounded bg-ink-950/70'>
                    <div className={'absolute left-0 top-0 h-full rounded ' + (on ? 'bg-amber/80' : 'bg-signal/45')} style={{ width: (c.p * 100).toFixed(1) + '%' }} />
                  </div>
                  <span className='w-12 shrink-0 text-right font-mono text-[12px] text-muted'>{c.p.toFixed(3)}</span>
                </div>
              )
            })}
          </div>
          <div className='mt-4 flex flex-wrap gap-2'>
            <Chip tone='signal' onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
              下一个 Token
            </Chip>
            <Chip tone='blue' active={playing} onClick={() => setPlaying((p) => !p)}>
              {playing ? '暂停' : '自动播放'}
            </Chip>
            <Chip tone='paper' onClick={restart}>
              重来
            </Chip>
          </div>
          <div className='mt-5'>
            <Slider id='llm-temp' label='温度' value={temperature} min={0.2} max={2} step={0.1} onChange={setTemperature} />
          </div>
          <div className='mt-3 flex flex-wrap gap-2'>
            <Chip tone='violet' active={greedy} onClick={() => setGreedy(true)}>
              总是选概率最高的
            </Chip>
            <Chip tone='violet' active={!greedy} onClick={() => setGreedy(false)}>
              按概率轮流取样
            </Chip>
          </div>
          <div className='mt-3 flex flex-wrap gap-1.5'>
            {ANSWER_TOKENS.slice(0, step + 1).map((t, i) => (
              <span
                key={i}
                className={'rounded px-1.5 py-0.5 text-[12px] ' + (i < step ? 'bg-signal/15 text-signal' : 'bg-amber/20 text-amber')}
              >
                {t}
              </span>
            ))}
          </div>
          <p className='mt-3 text-[12px] text-muted'>
            真实的解码策略还有更多花样。候选概率是教学用的示意数据，不是任何真实模型的输出。
          </p>
        </div>

        <div className='glass-panel rounded-2xl p-5'>
          <div className='text-xs uppercase tracking-[0.22em] text-muted'>智能、意识、灵魂不是同义词</div>
          <dl className='mt-4 space-y-4'>
            {CONCEPTS.map((c) => (
              <div key={c.term}>
                <dt className='text-[14px]' style={{ color: c.color }}>
                  {c.term}
                </dt>
                <dd className='mt-1 text-[12px] leading-relaxed text-muted'>{c.definition}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Note title='关于这一页数据的来龙去脉'>
          这一页没有调用任何大模型 API。分词、向量、注意力权重、候选概率都是预先定义好的确定性教学数据，
          所以你在这里看到的每一个数字，视频里也是同一个数，刷新一次不会变。
          只有训练那条损失曲线是真的：页面里那个小神经网络真的跑了一次梯度下降。
          另外，注意力权重并不能完整解释模型为什么给出某个回答；所谓「涌现能力」也还没有定论。
        </Note>
      </aside>
    </div>
  )
}
