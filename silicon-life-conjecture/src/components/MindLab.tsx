import { useState } from 'react'
import { CONCEPTS, EVIDENCE, EvidenceBars, type EvidenceCard } from '../viz/mindfig'
import { Chip } from './ui'

function labelOf(value: number): string {
  if (value < 0.1) return '几乎不支持'
  if (value < 0.3) return '弱支持'
  if (value < 0.6) return '一定支持'
  return '强支持'
}

/**
 * 判断实验。
 *
 * 观众挑一条「观察到的行为」，看到它对「智能」与「有主观体验」两个结论分别支持到什么程度。
 * 这里刻意不给对错判定：证据与结论之间隔着推理，推理本身是可以被质疑的。
 */
export function MindLab() {
  const [picked, setPicked] = useState<EvidenceCard | null>(null)
  const [checked, setChecked] = useState<string[]>([])

  const toggle = (id: string) => {
    setChecked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
    setPicked(EVIDENCE.find((e) => e.id === id) ?? null)
  }

  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-10'>
      <div className='glass-panel rounded-2xl p-5 sm:p-7'>
        <h3 className='text-[15px] font-semibold text-paper'>这些证据，哪些真的能支持结论？</h3>
        <p className='mt-2 text-[13px] leading-relaxed text-muted'>
          勾选任意一条看看。这里没有标准答案，只有「这条证据究竟支持到哪一步结论」的差别。
        </p>
        <ul className='mt-5 space-y-2.5'>
          {EVIDENCE.map((card) => (
            <li key={card.id}>
              <label className='flex cursor-pointer items-start gap-3 rounded-xl border border-signal/15 bg-ink-950/40 px-4 py-3 transition-colors hover:border-signal/35'>
                <input
                  type='checkbox'
                  checked={checked.includes(card.id)}
                  onChange={() => toggle(card.id)}
                  className='mt-1 h-4 w-4 shrink-0 accent-signal'
                />
                <span className='text-[13px] leading-relaxed text-paper/90'>{card.behavior}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <aside className='flex flex-col gap-5'>
        <div className='glass-panel rounded-2xl p-5'>
          <div className='text-xs uppercase tracking-[0.22em] text-muted'>四个概念不是同义词</div>
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

        {picked ? (
          <div className='glass-panel rounded-2xl p-5'>
            <div className='text-xs uppercase tracking-[0.22em] text-muted'>这条证据支持到什么程度</div>
            <svg viewBox='0 0 520 110' className='mt-3 w-full' role='img' aria-label='支持强度'>
              <EvidenceBars x={0} y={28} card={picked} width={440} />
            </svg>
            <p className='mt-4 text-[13px] leading-relaxed text-paper/90'>{picked.reasoning}</p>
            <div className='mt-4 flex flex-wrap gap-2'>
              <Chip tone='signal'>智能：{labelOf(picked.intelligence)}</Chip>
              <Chip tone='amber'>体验：{labelOf(picked.experience)}</Chip>
            </div>
          </div>
        ) : (
          <div className='glass-panel rounded-2xl p-5 text-[13px] leading-relaxed text-muted'>
            先在左边勾一条行为。没有「答对」这一说 —— 科学上真正有用的，是说清每条证据究竟支持了哪一步结论。
          </div>
        )}
      </aside>
    </div>
  )
}
