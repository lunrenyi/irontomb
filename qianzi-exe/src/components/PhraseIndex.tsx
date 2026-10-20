/**
 * 原文索引：二百五十句，按原书顺序，一句不少。
 *
 * 点一句 —— 看它的释义、看它属于哪个模块、看它连着哪些句子。
 */
import { useMemo, useState } from 'react'
import { LENS_LABEL, PHRASES, TOTAL_CHARS, TOTAL_PHRASES, phrasesOfModule } from '../content/qianzi'
import { MODULES } from '../content/modules'
import { MODULE_HUE, alpha } from '../viz/palette'
import { selectPhrase, useSelection } from '../state/selection'
import { cx } from './ui'

export function PhraseIndex() {
  const selection = useSelection()
  const [filter, setFilter] = useState<string>('all')
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    let out = PHRASES
    if (filter !== 'all') out = out.filter((p) => p.module === filter)
    if (q.trim()) {
      const needle = q.trim()
      out = out.filter(
        (p) => p.text.includes(needle) || p.gloss.includes(needle) || p.tags.some((t) => t.includes(needle)),
      )
    }
    return out
  }, [filter, q])

  return (
    <div>
      <div className='flex flex-wrap items-center gap-2'>
        <button
          type='button'
          onClick={() => setFilter('all')}
          className={cx(
            'rounded-full border px-3 py-1.5 text-[13px] transition-colors',
            filter === 'all' ? 'border-cyan/60 bg-cyan/10 text-cyan' : 'border-white/12 text-muted hover:text-paper',
          )}
        >
          全部 {TOTAL_PHRASES}
        </button>
        {MODULES.map((m) => (
          <button
            key={m.id}
            type='button'
            onClick={() => setFilter(m.id)}
            className={cx(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors',
              filter === m.id ? 'text-paper' : 'text-muted hover:text-paper',
            )}
            style={
              filter === m.id
                ? { borderColor: MODULE_HUE[m.id] + '99', background: MODULE_HUE[m.id] + '1f' }
                : { borderColor: 'rgba(255,255,255,0.1)' }
            }
          >
            <span className='h-2 w-2 rounded-full' style={{ background: MODULE_HUE[m.id] }} />
            {m.name}
            <span className='font-mono text-[10px] text-faint'>{phrasesOfModule(m.id).length}</span>
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='搜索原文或释义…'
          className='ml-auto w-full max-w-[240px] rounded-full border border-white/12 bg-white/[0.03] px-4 py-1.5 text-[13px] text-paper outline-none placeholder:text-faint focus:border-cyan/50 sm:w-[240px]'
        />
      </div>

      <div className='mt-5 max-h-[560px] overflow-y-auto pr-1'>
        <div className='grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 lg:grid-cols-4'>
          {list.map((p) => {
            const on = selection.index === p.i
            const hue = MODULE_HUE[p.module]
            return (
              <button
                key={p.i}
                type='button'
                onClick={() => selectPhrase(on ? null : p.i)}
                title={p.gloss}
                className={cx(
                  'flex items-baseline gap-2 rounded-md border-l-2 px-2 py-1.5 text-left transition-colors',
                  on ? 'bg-white/[0.06]' : 'hover:bg-white/[0.035]',
                )}
                style={{ borderLeftColor: on ? CYAN_BORDER : alpha(hue, 0.55) }}
              >
                <span className='w-6 shrink-0 font-mono text-[10px] tabular-nums text-faint'>
                  {String(p.i + 1).padStart(3, '0')}
                </span>
                <span className={cx('font-display text-[15px] tracking-[0.06em]', on ? 'text-cyan' : 'text-paper/85')}>
                  {p.text}
                </span>
                <span className='ml-auto shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-faint'>
                  {LENS_LABEL[p.lens].slice(0, 2)}
                </span>
              </button>
            )
          })}
        </div>
        {list.length === 0 ? <p className='py-10 text-center text-[13px] text-muted'>没有匹配的句子。</p> : null}
      </div>

      <p className='mt-4 text-[11.5px] leading-relaxed text-faint'>
        全篇 {TOTAL_PHRASES} 句、{TOTAL_CHARS} 字，顺序照通行本。右上角的缩写标出这句话的读法：
        古代宇宙观 / 历史叙述 / 自然观察 / 伦理观念 / 现代科学解释 / 制度与风物。
      </p>
    </div>
  )
}

const CYAN_BORDER = '#5fe3d0'
