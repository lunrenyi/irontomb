import { useCallback } from 'react'
import { PageBackdrop } from './viz/backdrop'
import { Nav } from './components/Nav'
import { FilmPlayer } from './components/FilmPlayer'
import { ArchiveBoot } from './components/ArchiveBoot'
import { SceneLab } from './components/SceneLab'
import { WholeModel } from './components/WholeModel'
import { PhraseIndex } from './components/PhraseIndex'
import { Note, Section, cx } from './components/ui'
import { MODULES } from './content/modules'
import { PHRASES, TOTAL_CHARS, TOTAL_PHRASES, COLLISIONS, VARIANTS, TRADITIONAL_UNIQUE_COUNT } from './content/qianzi'
import { seekFilm } from './story/playerBus'
import { TOTAL_SECONDS, sceneById, sceneForPhrase, frameForPhrase } from './story/timeline'
import { MODULE_HUE } from './viz/palette'
import { selectPhrase, useSelection } from './state/selection'

/** 每个模块的一节：标题 + 影片入口 + 实验台 + 读法限定 */
function ModuleSection({ id }: { id: (typeof MODULES)[number]['id'] }) {
  const def = MODULES.find((m) => m.id === id)!
  const hue = MODULE_HUE[id]
  const scene = sceneById(id)
  const count = PHRASES.filter((p) => p.module === id).length
  return (
    <Section id={id} className='mx-auto w-full max-w-[1360px] px-4 pb-20 sm:px-6'>
      <div className='border-t border-white/10 pt-9'>
        <div className='flex flex-wrap items-baseline gap-x-5 gap-y-1'>
          <span className='font-mono text-[12px] tracking-[0.24em]' style={{ color: hue }}>
            {def.index}
          </span>
          <h2 className='font-display text-[clamp(1.4rem,3.4vw,2.1rem)] tracking-[0.08em] text-paper'>{def.name}</h2>
          <span className='font-mono text-[12px] tracking-[0.18em] text-muted'>{def.nameZh}</span>
          <span className='font-mono text-[11px] text-faint'>{count} 句</span>
        </div>
        <p className='mt-3 max-w-[62ch] text-[15px] leading-relaxed text-paper/85'>{def.question}</p>
      </div>

      <div className='mt-8'>
        <SceneLab module={id} sceneId={id} />
      </div>

      <div className='mt-6 flex flex-wrap items-center gap-3'>
        <button
          type='button'
          onClick={() => {
            if (scene) seekFilm(scene.start)
            document.getElementById('film')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          className='inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] transition-colors'
          style={{ borderColor: hue + '55', color: hue }}
        >
          <span aria-hidden='true'>↑</span> 回影片看这一幕
        </button>
      </div>

      <div className='mt-6 max-w-[74ch]'>
        <Note title='这一模块该怎么读'>{def.caveat}</Note>
      </div>
    </Section>
  )
}

export default function App() {
  const selection = useSelection()

  const startDecode = useCallback(() => {
    document.getElementById('film')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // 给影片一点时间滚到位再开始播
    window.setTimeout(() => seekFilm(0), 420)
  }, [])

  const jumpToPhrase = useCallback((index: number) => {
    selectPhrase(index)
    seekFilm(frameForPhrase(index))
    const target = sceneForPhrase(index)
    if (target === 'decode' || target === 'whole') {
      document.getElementById('film')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return (
    <div className='relative min-h-screen'>
      <PageBackdrop />
      <Nav />

      <main className='relative z-10'>
        {/* 开场 */}
        <div id='top'>
          <ArchiveBoot onStart={startDecode} />
        </div>

        {/* 影片 */}
        <Section id='film' className='mx-auto w-full max-w-[1360px] px-4 pb-16 pt-16 sm:px-6 sm:pb-20'>
          <div className='flex flex-wrap items-end justify-between gap-x-8 gap-y-3'>
            <h1 className='font-display text-[clamp(1.4rem,4vw,2.4rem)] leading-tight tracking-[0.08em] text-paper'>
              千字文：世界的源代码
              <span className='ml-3 align-middle font-mono text-[clamp(0.65rem,1.3vw,0.85rem)] tracking-[0.26em] text-muted'>
                QIANZI.EXE
              </span>
            </h1>
            <p className='max-w-[40ch] text-sm leading-relaxed text-muted'>
              一部 {TOTAL_SECONDS.toFixed(0)} 秒的动态图形影片。
              六个模块住在同一张地图上，镜头在它们之间连续飞行。
            </p>
          </div>

          <div className='mt-5'>
            <FilmPlayer />
          </div>

          <div className='mt-6 flex flex-wrap items-center gap-x-6 gap-y-3'>
            <a
              href='#cosmos'
              className='inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-void transition-transform duration-200 hover:scale-[1.03] active:scale-95'
            >
              跳过引子，直接去天地时序 ↓
            </a>
            <span className='text-[13px] leading-relaxed text-muted'>
              影片与页面共用同一套帧驱动图形，因此导出的 MP4 与浏览器里看到的完全一致。
            </span>
          </div>
        </Section>

        {/* 五个模块 */}
        {MODULES.map((m) => (
          <ModuleSection key={m.id} id={m.id} />
        ))}

        {/* 完整全景 */}
        <Section id='whole' className='mx-auto w-full max-w-[1360px] px-4 pb-20 sm:px-6'>
          <div className='border-t border-white/10 pt-9'>
            <div className='flex flex-wrap items-baseline gap-x-5 gap-y-1'>
              <span className='font-mono text-[12px] tracking-[0.24em] text-cyan'>06</span>
              <h2 className='font-display text-[clamp(1.4rem,3.4vw,2.1rem)] tracking-[0.08em] text-paper'>THE WHOLE MODEL</h2>
              <span className='font-mono text-[12px] tracking-[0.18em] text-muted'>完整的知识全景</span>
            </div>
            <p className='mt-3 max-w-[62ch] text-[15px] leading-relaxed text-paper/85'>
              一千个字本来就是一个整体：把它拆开是为了看清结构，装回去才是它本来的样子。
            </p>
          </div>
          <div className='mt-8'>
            <WholeModel />
          </div>
          <div className='mt-6 max-w-[74ch]'>
            <Note title='这张图是什么'>
              「世界模型」是本站的说法，指一张把《千字文》的语句与它们之间的语义关系画出来的图。
              它不是古人的原图，古人没有留下这样一张图；它也不是对《千字文》的唯一解释。
              语义标签是本站的编辑标注，连接规则是「共享至少一个标签就连一条线」。
            </Note>
          </div>
        </Section>

        {/* 原文 */}
        <Section id='text' className='mx-auto w-full max-w-[1360px] px-4 pb-20 sm:px-6'>
          <div className='border-t border-white/10 pt-9'>
            <div className='flex flex-wrap items-baseline gap-x-5 gap-y-1'>
              <span className='font-mono text-[12px] tracking-[0.24em] text-cyan'>原文</span>
              <h2 className='font-display text-[clamp(1.4rem,3.4vw,2.1rem)] tracking-[0.08em] text-paper'>
                《千字文》全篇
              </h2>
              <span className='font-mono text-[12px] tracking-[0.18em] text-muted'>
                {TOTAL_PHRASES} 句 · {TOTAL_CHARS} 字
              </span>
            </div>
            <p className='mt-3 max-w-[62ch] text-[15px] leading-relaxed text-paper/85'>
              字句与顺序照通行本，一句不少。点任意一句看它的释义。
            </p>
          </div>

          <div className='mt-8'>
            <PhraseIndex />
          </div>

          {/* 数字考古 */}
          <div className='mt-14 grid gap-6 lg:grid-cols-2'>
            <div className='rounded-2xl border border-white/10 bg-white/[0.02] p-6'>
              <div className='font-mono text-[11px] uppercase tracking-[0.24em] text-amber'>数字考古 · 一字不重</div>
              <h3 className='mt-3 font-display text-[clamp(1.1rem,2.2vw,1.5rem)] text-paper'>
                繁体原文一千字不重，简体撞了七处
              </h3>
              <p className='mt-3 text-[14px] leading-relaxed text-muted'>
                《千字文》最常被引用的一句评价是「一千个字不重复」。这句话需要加一个前提才成立：
                <b className='text-paper'>原文用繁体字时，一千个字互不重复</b>；换成今天的简体字之后，
                有七处被合并成了同一个字。本站把这七处原字还原出来，并且用程序验过：
                繁体全文 {TRADITIONAL_UNIQUE_COUNT} 个字、零重复；换成简体则是 {TOTAL_CHARS} 字、
                {TOTAL_CHARS - COLLISIONS.length} 个不同的字。
              </p>
              <div className='mt-5 space-y-2'>
                {COLLISIONS.map((c) => (
                  <div key={c.simplified} className='flex flex-wrap items-baseline gap-3 border-t border-white/8 pt-2'>
                    <span className='font-display text-[20px] text-paper'>{c.simplified}</span>
                    <span className='font-display text-[20px] text-amber'>{c.at[0].traditional}</span>
                    <span className='font-display text-[20px] text-amber'>{c.at[1].traditional}</span>
                    <span className='text-[12.5px] text-muted'>
                      {c.at[0].phrase}（{c.at[0].meaning}）· {c.at[1].phrase}（{c.at[1].meaning}）
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className='rounded-2xl border border-white/10 bg-white/[0.02] p-6'>
              <div className='font-mono text-[11px] uppercase tracking-[0.24em] text-violet'>数字考古 · 避讳与异文</div>
              <h3 className='mt-3 font-display text-[clamp(1.1rem,2.2vw,1.5rem)] text-paper'>改朝换代，字也要改</h3>
              <p className='mt-3 text-[14px] leading-relaxed text-muted'>
                《千字文》是一篇「一千字不重」的排列，传抄时若撞了字就换一个。
                历代传本因此留下了一些<b className='text-paper'>可以查证</b>的差异，
                其中一部分直接来自避讳 —— 改朝换代，讳及当朝皇帝的名字。
              </p>
              <div className='mt-5 space-y-2'>
                {VARIANTS.map((v) => (
                  <div key={v.base} className='flex flex-wrap items-baseline gap-3 border-t border-white/8 pt-2'>
                    <span className='font-display text-[17px] text-paper'>{v.base}</span>
                    <span aria-hidden='true' className='text-faint'>→</span>
                    <span className={cx('font-display text-[17px]', v.taboo ? 'text-violet' : 'text-muted')}>{v.other}</span>
                    <span className='text-[12.5px] text-muted'>{v.why}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 收束 */}
        <Section id='closing' className='mx-auto w-full max-w-[1360px] px-4 py-20 sm:px-6'>
          <div className='border-t border-white/10 pt-14 text-center'>
            <p className='font-display text-[clamp(1.8rem,6vw,3.2rem)] leading-tight tracking-[0.1em] text-paper'>
              千字文：世界的源代码
            </p>
            <p className='mx-auto mt-4 max-w-[52ch] text-[15px] leading-relaxed text-muted'>
              谓语助者，焉哉乎也 —— 一千个字，最后四个字是四个语气词。
              这篇文章从天地写到器物，从修身写到归隐，最后用一句「这些是语气词」收尾。
            </p>
            <div className='mt-12 flex flex-wrap items-center justify-center gap-3'>
              <button
                type='button'
                onClick={() => {
                  seekFilm(0)
                  document.getElementById('film')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className='inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-void transition-transform duration-200 hover:scale-[1.03] active:scale-95'
              >
                重新观看影片 ↑
              </button>
              <a href='#text' className='inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm text-muted transition-colors hover:text-paper'>
                回到原文
              </a>
            </div>
          </div>
        </Section>
      </main>

      {/* 当前选中的句子：全站跟着它走 */}
      {selection.index != null ? (
        <div className='fixed inset-x-0 bottom-4 z-30 px-4'>
          <div className='mx-auto flex max-w-[760px] flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-cyan/30 bg-void/92 px-5 py-3 backdrop-blur-md'>
            <span className='font-display text-[22px] tracking-[0.1em] text-cyan'>
              {PHRASES[selection.index].text}
            </span>
            <span className='min-w-0 flex-1 truncate text-[13px] text-paper/85'>
              {PHRASES[selection.index].gloss}
            </span>
            <button
              type='button'
              onClick={() => jumpToPhrase(selection.index!)}
              className='rounded-full border border-cyan/50 bg-cyan/10 px-4 py-1.5 text-[12.5px] text-cyan transition-colors hover:border-cyan hover:bg-cyan/20'
            >
              在影片里看 ↓
            </button>
            <button
              type='button'
              onClick={() => selectPhrase(null)}
              aria-label='关闭'
              className='rounded-full border border-white/12 px-3 py-1.5 text-[12.5px] text-muted transition-colors hover:text-paper'
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      <footer className='relative z-10 border-t border-white/10 py-10'>
        <div className='mx-auto w-full max-w-[1360px] px-4 text-xs leading-relaxed text-faint sm:px-6'>
          <p className='max-w-[92ch]'>
            本页所有画面 —— 星场、轨道、二十八宿星图、节气盘、十二律管、山脉剖面、云雨、霜晶、
            城郭宫室、时间轴、人物、织机、琴、钓竿、一千字的方阵与整张知识网络 ——
            全部由程序实时生成，没有任何实景照片、预制视频或装饰性代码。
            影片与页面共用同一个纯函数 <span className='text-muted'>Film(frame)</span>，
            镜头只由固定取景与显式关键帧决定，绝不追踪正在变化的图形，
            所以导出的 MP4 与浏览器里看到的完全一致。
          </p>
          <p className='mt-3'>
            释义与语义标签是本站的编辑内容；古代宇宙观、历史叙述与伦理观念均按其本来性质标注，
            不当作已被现代科学证明的结论。
          </p>
          <p className='mt-3'>本站遵循系统的「减少动态效果」设置。</p>
          <p className='mt-3'>
            <a href='#film' className='transition-colors hover:text-paper'>回到影片 ↑</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
