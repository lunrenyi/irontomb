/**
 * 模块实验台。
 *
 * 关键设计：**实验室里放的就是影片里那一幕**。
 * 同一份场景组件、同一份拍表、同一个纯函数渲染 ——
 * 所以页面上看到的和导出的 MP4 里看到的完全一致。
 *
 * 实验台能做三件事：
 *   1. 播放 / 暂停 / 拖动这一幕的拍表（逐拍看画面）
 *   2. 点原文句子 —— 看释义、看它连着哪些句子
 *   3. 跳到影片里讲这一句的那一帧
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LENS_COLOR, LENS_LABEL, PHRASES, phrasesOfModule, relatedPhrases } from '../content/qianzi'
import { moduleById, type ModuleId } from '../content/modules'
import { beatsOf, frameForPhrase, type SceneId } from '../story/timeline'
import { beatIndexAt } from '../story/cues'
import { DecodeScene } from '../story/scenes/Decode'
import { CosmosScene } from '../story/scenes/Cosmos'
import { NatureScene } from '../story/scenes/Nature'
import { CivilizationScene } from '../story/scenes/Civilization'
import { HumanScene } from '../story/scenes/Human'
import { DailyScene } from '../story/scenes/Daily'
import { WholeScene } from '../story/scenes/Whole'
import { MODULE_HUE, alpha, CYAN, PAPER } from '../viz/palette'
import { NODES, REGIONS } from '../viz/world'
import { selectPhrase, useSelection } from '../state/selection'
import { seekFilm } from '../story/playerBus'
import { cx } from './ui'

const RENDERERS: Record<
  string,
  (props: {
    frame: number
    beat: number
    slot: string
    progress: number
    sceneProgress: number
    beatDuration: number
  }) => JSX.Element
> = {
  decode: DecodeScene,
  cosmos: CosmosScene,
  nature: NatureScene,
  civilization: CivilizationScene,
  human: HumanScene,
  daily: DailyScene,
  whole: WholeScene,
}

export function SceneLab({ module, sceneId }: { module: ModuleId; sceneId: SceneId }) {
  const def = moduleById(module)
  const hue = MODULE_HUE[module]
  const phrases = useMemo(() => phrasesOfModule(module), [module])
  const beats = useMemo(() => beatsOf(sceneId), [sceneId])
  const selection = useSelection()

  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(true)
  const frameRef = useRef(0)
  const raf = useRef(0)

  const total = beats.length ? beats[beats.length - 1].end : 1
  const loop = (beats.length ? beats[beats.length - 1].end : 1) + 40

  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const next = frameRef.current + dt * 30
      frameRef.current = next >= loop ? 0 : next
      setFrame(frameRef.current)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, loop])

  const seek = useCallback(
    (f: number) => {
      const c = Math.max(0, Math.min(loop, f))
      frameRef.current = c
      setFrame(c)
    },
    [loop],
  )

  const beatIndex = beatIndexAt(beats, frame)
  const beat = beats[beatIndex]
  const Renderer = RENDERERS[sceneId]
  const region = REGIONS[sceneId === 'whole' ? 'whole' : module]
  const nodes = useMemo(() => NODES.filter((n) => n.phrase.module === module), [module])
  const selected = selection.index != null ? PHRASES[selection.index] : null
  const related = selected ? relatedPhrases(selected.i, 10) : []

  const jumpToFilm = (index: number) => {
    seekFilm(frameForPhrase(index))
    document.getElementById('film')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]'>
      {/* 画面 */}
      <div>
        <div className='relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-void shadow-[0_30px_90px_-50px_rgba(95,227,208,0.5)]'>
          <svg viewBox='0 0 1920 1080' className='block h-full w-full' preserveAspectRatio='xMidYMid slice'>
            <defs>
              <radialGradient id={'lab-bg-' + sceneId} cx='0.7' cy='0.1' r='0.95'>
                <stop offset='0%' stopColor='#12305e' stopOpacity={0.5} />
                <stop offset='100%' stopColor='#03060e' stopOpacity={0} />
              </radialGradient>
            </defs>
            <rect width='1920' height='1080' fill='#03060e' />
            <rect width='1920' height='1080' fill={'url(#lab-bg-' + sceneId + ')'} />
            {Renderer ? (
              <Renderer
                frame={frame}
                beat={beatIndex}
                slot={beat ? beat.slot : ''}
                progress={beat ? Math.min(1, Math.max(0, (frame - beat.start) / Math.max(1, beat.dur))) : 0}
                sceneProgress={0}
                beatDuration={beat ? beat.dur : 1}
              />
            ) : null}

            {/*
              原文就写在画面上。
              这些小点用的是影片里那套世界坐标 —— 也就是说，
              实验室里点到的位置，和影片里那个句子所在的位置是同一个。
            */}
            <g>
              {nodes.map((n) => {
                const on = selection.index === n.i
                const hue = MODULE_HUE[n.phrase.module]
                return (
                  <g
                    key={n.i}
                    transform={'translate(' + (n.x - region.x).toFixed(1) + ' ' + (n.y - region.y).toFixed(1) + ')'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => selectPhrase(on ? null : n.i)}
                  >
                    <circle r={16} fill="transparent" />
                    <circle r={on ? 7 : 4} fill={on ? PAPER : hue} opacity={on ? 1 : 0.75} />
                    {on ? <circle r={16} fill="none" stroke={CYAN} strokeWidth={1.4} opacity={0.8} /> : null}
                    {on ? (
                      <text x={14} y={5} fontSize={22} fill={PAPER} fontFamily="'PingFang SC',sans-serif">
                        {n.phrase.text}
                      </text>
                    ) : null}
                  </g>
                )
              })}
            </g>
          </svg>

          {/* 选中句子的浮层标注 */}
          {selected ? (
            <div className='pointer-events-none absolute left-4 top-4 max-w-[min(78%,420px)] rounded-xl border border-white/15 bg-void/85 px-4 py-3 backdrop-blur-sm'>
              <div className='flex items-baseline gap-3'>
                <span className='font-display text-[22px] tracking-[0.1em] text-paper'>{selected.text}</span>
                <span
                  className='rounded-full border px-2 py-0.5 text-[10px] tracking-[0.14em]'
                  style={{ borderColor: alpha(LENS_COLOR[selected.lens], 0.5), color: LENS_COLOR[selected.lens] }}
                >
                  {LENS_LABEL[selected.lens]}
                </span>
              </div>
              <p className='mt-1.5 text-[13px] leading-relaxed text-paper/90'>{selected.gloss}</p>
              {selected.modern ? (
                <p className='mt-1.5 border-l border-white/15 pl-2.5 text-[12px] leading-relaxed text-muted'>{selected.modern}</p>
              ) : null}
            </div>
          ) : null}

          <div className='pointer-events-none absolute bottom-3 right-4 font-mono text-[10px] tracking-[0.2em] text-faint'>
            {def.index} · {def.name} · 第 {String(Math.floor(frame)).padStart(4, '0')} 帧
          </div>
        </div>

        {/* 拍表控制 */}
        <div className='mt-4 flex flex-wrap items-center gap-3'>
          <button
            type='button'
            onClick={() => setPlaying((p) => !p)}
            className='flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-paper transition-colors hover:border-cyan/60 hover:text-cyan'
            aria-label={playing ? '暂停' : '播放'}
          >
            {playing ? (
              <span className='flex gap-[3px]' aria-hidden='true'>
                <span className='h-3.5 w-[3px] rounded-full bg-current' />
                <span className='h-3.5 w-[3px] rounded-full bg-current' />
              </span>
            ) : (
              <span className='ml-0.5 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-current' aria-hidden='true' />
            )}
          </button>
          <button
            type='button'
            onClick={() => {
              seek(0)
              setPlaying(true)
            }}
            className='rounded-full border border-white/15 px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-paper'
          >
            重播
          </button>
          <div className='flex min-w-[220px] flex-1 items-center gap-1.5'>
            {beats.map((b, i) => (
              <button
                key={i}
                type='button'
                onClick={() => seek(b.start + 2)}
                title={'第 ' + (i + 1) + ' 拍'}
                className={cx(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  i === beatIndex ? 'bg-cyan' : 'bg-white/12 hover:bg-white/30',
                )}
              />
            ))}
          </div>
          <span className='font-mono text-[11px] tabular-nums text-faint'>
            {Math.floor(frame / 30)}s / {Math.floor(total / 30)}s
          </span>
        </div>

        {beat && beat.cues.length ? (
          <p className='mt-3 border-l-2 pl-3 text-[13px] leading-relaxed text-muted' style={{ borderColor: alpha(hue, 0.55) }}>
            {beat.cues.map((c) => c.text).join('　')}
          </p>
        ) : null}
      </div>

      {/* 原文与关联 */}
      <div className='min-w-0'>
        <div className='flex items-baseline justify-between'>
          <h3 className='font-mono text-[11px] uppercase tracking-[0.24em] text-faint'>原文 · {phrases.length} 句</h3>
          <span className='font-mono text-[10px] text-faint'>{def.name}</span>
        </div>

        <div className='mt-3 flex max-h-[280px] flex-wrap gap-1.5 overflow-y-auto pr-1'>
          {phrases.map((p) => {
            const on = selection.index === p.i
            return (
              <button
                key={p.i}
                type='button'
                onClick={() => selectPhrase(on ? null : p.i)}
                onDoubleClick={() => jumpToFilm(p.i)}
                title={p.gloss}
                className={cx(
                  'rounded-md border px-2 py-1 text-[13px] tracking-[0.06em] transition-colors',
                  on
                    ? 'border-cyan/70 bg-cyan/15 text-cyan'
                    : 'border-white/10 text-paper/80 hover:border-white/35 hover:text-paper',
                )}
              >
                {p.text}
              </button>
            )
          })}
        </div>

        <p className='mt-2 text-[11px] leading-relaxed text-faint'>
          点一句看释义；双击跳到影片里讲它的那一帧。
        </p>

        {selected ? (
          <div className='mt-5 rounded-xl border border-white/12 bg-white/[0.02] p-4'>
            <div className='flex items-baseline gap-3'>
              <span className='font-display text-[26px] tracking-[0.1em] text-paper'>{selected.text}</span>
              <span
                className='rounded-full border px-2 py-0.5 text-[10px] tracking-[0.14em]'
                style={{ borderColor: alpha(LENS_COLOR[selected.lens], 0.5), color: LENS_COLOR[selected.lens] }}
              >
                {LENS_LABEL[selected.lens]}
              </span>
            </div>
            <p className='mt-2 text-[14px] leading-relaxed text-paper'>{selected.gloss}</p>
            {selected.modern ? (
              <div className='mt-3 border-l border-cyan/40 pl-3'>
                <div className='font-mono text-[10px] tracking-[0.2em] text-cyan/80'>现代解读</div>
                <p className='mt-1 text-[12.5px] leading-relaxed text-muted'>{selected.modern}</p>
              </div>
            ) : null}
            <div className='mt-3 flex flex-wrap gap-1.5'>
              {selected.tags.map((tag) => (
                <span key={tag} className='rounded-full border border-white/12 px-2 py-0.5 text-[11px] text-muted'>
                  {tag}
                </span>
              ))}
            </div>
            <button
              type='button'
              onClick={() => jumpToFilm(selected.i)}
              className='mt-4 w-full rounded-lg border border-cyan/40 bg-cyan/10 px-4 py-2 text-[13px] text-cyan transition-colors hover:border-cyan hover:bg-cyan/20'
            >
              在影片里看这一句 ↓
            </button>
          </div>
        ) : null}

        {related.length ? (
          <div className='mt-5'>
            <div className='font-mono text-[10px] uppercase tracking-[0.2em] text-faint'>连着它的句子</div>
            <ul className='mt-2 space-y-1'>
              {related.map((r) => (
                <li key={r.i}>
                  <button
                    type='button'
                    onClick={() => selectPhrase(r.i)}
                    className='flex w-full items-baseline gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]'
                  >
                    <span className='font-display text-[15px] tracking-[0.08em] text-paper/90'>{r.text}</span>
                    <span className='truncate text-[12px] text-muted'>{r.gloss}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className='mt-2 text-[11px] leading-relaxed text-faint'>
              这些关联按本站标注的语义标签生成，不是《千字文》原有的结构。
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
