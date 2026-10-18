import { Backdrop } from './components/Backdrop'
import { Nav } from './components/Nav'
import { FilmPlayer } from './components/FilmPlayer'
import { GrowthLab } from './components/GrowthLab'
import { NatureSwitch } from './components/NatureSwitch'
import { DepthLab } from './components/DepthLab'
import { TechNetwork } from './components/TechNetwork'
import { CosmosView } from './components/CosmosView'
import { Section } from './components/ui'
import { CLOSING, HERO_QUESTION, PHASES, SITE_SUBTITLE } from './content'
import { seekFilm } from './story/playerBus'
import { SCENES } from './story/timeline'

const RECAP = SCENES.find((scene) => scene.id === 'depth')
const LESSON = SCENES.find((scene) => scene.id === 'lesson')
const TECH = SCENES.find((scene) => scene.id === 'tech')
const COSMOS = SCENES.find((scene) => scene.id === 'cosmos')

function JumpButton({ frame }: { frame: number }) {
  return (
    <button
      type='button'
      onClick={() => {
        seekFilm(frame)
        document.getElementById('film')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }}
      className='inline-flex items-center gap-2 rounded-full border border-moss/25 px-4 py-2 text-[13px] text-muted transition-colors hover:border-shoot/60 hover:text-shoot'
    >
      <span aria-hidden='true'>↑</span> 回影片看这段
    </button>
  )
}

/** 三个阶段的分界：告诉读者接下来是哪一个系统，以及它的成因是什么 */
function PhaseBand({ index }: { index: number }) {
  const phase = PHASES[index]
  if (!phase) return null
  return (
    <div className='mx-auto mb-10 flex w-full max-w-[1240px] flex-col gap-3 border-t border-moss/10 pt-10 sm:flex-row sm:items-end sm:gap-8'>
      <p className='shrink-0 font-mono text-[11px] uppercase tracking-[0.3em] text-shoot'>
        {'阶段 ' + ['一', '二', '三'][index]}
      </p>
      <div>
        <h2 className='font-display text-[clamp(1.4rem,3.4vw,2.1rem)] text-paper'>{phase.name}</h2>
        <p className='mt-1 text-[13px] text-muted'>{phase.note}</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div className='relative min-h-screen'>
      <Backdrop />
      <Nav />

      <main className='relative z-10'>
        {/* 影片即首页 */}
        <Section id='film' className='mx-auto w-full max-w-[1240px] px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24'>
          <div className='flex flex-wrap items-end justify-between gap-x-8 gap-y-3'>
            <h1 className='font-display text-[clamp(1.6rem,4.4vw,2.8rem)] leading-tight text-paper'>
              一条规则，长出无限
              <span className='ml-3 align-middle font-mono text-[clamp(0.7rem,1.4vw,0.9rem)] tracking-[0.26em] text-muted'>
                GROWTH FILM
              </span>
            </h1>
            <p className='max-w-[36ch] text-sm leading-relaxed text-muted'>{HERO_QUESTION}</p>
          </div>

          <div className='mt-5'>
            <FilmPlayer />
          </div>

          <div className='mt-6 flex flex-wrap items-center gap-x-6 gap-y-3'>
            <a
              href='#lab'
              className='inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-ink-950 transition-transform duration-200 hover:scale-[1.03] active:scale-95'
            >
              跳过影片，自己种一棵 ↓
            </a>
            <span className='text-[13px] leading-relaxed text-muted'>
              {SITE_SUBTITLE} 也可以用 npm run export:mp4 导出成 MP4。
            </span>
          </div>
        </Section>

        {/* 阶段一：自然 */}
        <Section id='lab' className='mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6'>
          <PhaseBand index={0} />
          <div className='mt-10'>
            <GrowthLab />
          </div>
          {LESSON ? (
            <div className='mt-10'>
              <JumpButton frame={LESSON.start} />
            </div>
          ) : null}
        </Section>

        <Section id='nature' className='mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6'>
          <p className='text-xs uppercase tracking-[0.3em] text-leaf'>观察</p>
          <h3 className='mt-2 font-display text-[clamp(1.2rem,2.8vw,1.6rem)] text-paper'>像，但不一样</h3>
          <div className='mt-8'>
            <NatureSwitch />
          </div>
        </Section>

        <Section id='depth' className='mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6'>
          <p className='text-xs uppercase tracking-[0.3em] text-bud'>从简单到复杂</p>
          <h3 className='mt-2 font-display text-[clamp(1.2rem,2.8vw,1.6rem)] text-paper'>整体里，有一个缩小版的自己</h3>
          <div className='mt-8'>
            <DepthLab />
          </div>
          {RECAP ? (
            <div className='mt-10'>
              <JumpButton frame={RECAP.start} />
            </div>
          ) : null}
        </Section>

        {/* 阶段二：知识 */}
        <Section id='tech' className='mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6'>
          <PhaseBand index={1} />
          <div className='mt-10'>
            <TechNetwork />
          </div>
          {TECH ? (
            <div className='mt-10'>
              <JumpButton frame={TECH.start} />
            </div>
          ) : null}
        </Section>

        {/* 阶段三：宇宙 */}
        <Section id='cosmos' className='mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6'>
          <PhaseBand index={2} />
          <div className='mt-10'>
            <CosmosView />
          </div>
          {COSMOS ? (
            <div className='mt-10'>
              <JumpButton frame={COSMOS.start} />
            </div>
          ) : null}
        </Section>

        {/* 收束 */}
        <Section id='closing' className='mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6'>
          <div className='border-t border-moss/12 pt-14 text-center'>
            <p className='font-display text-[clamp(1.8rem,6vw,3.2rem)] leading-tight text-paper breathe'>一条规则，长出无限</p>
            <div className='mx-auto mt-8 max-w-[52ch] space-y-4'>
              {CLOSING.map((line, i) => (
                <p key={i} className='text-[15px] leading-relaxed text-muted'>{line}</p>
              ))}
            </div>
            <div className='mt-10 flex flex-wrap items-center justify-center gap-3'>
              <button
                type='button'
                onClick={() => {
                  seekFilm(0)
                  document.getElementById('film')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className='inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-ink-950 transition-transform duration-200 hover:scale-[1.03] active:scale-95'
              >
                重新观看影片 ↑
              </button>
              <a href='#lab' className='inline-flex items-center gap-2 rounded-full border border-moss/25 px-5 py-2.5 text-sm text-muted transition-colors hover:border-paper/50 hover:text-paper'>
                回到实验室
              </a>
            </div>
          </div>
        </Section>
      </main>

      <footer className='relative z-10 border-t border-moss/10 py-10'>
        <div className='mx-auto w-full max-w-[1240px] px-4 text-xs leading-relaxed text-faint sm:px-6'>
          <p className='max-w-[78ch]'>
            页面上的每一根枝条、每一片叶子、每一条技术连线与每一段宇宙丝线都由程序生成，没有使用任何实景照片或预制素材。
            技术网络是一组虚构的示意例子，用来讲清依赖关系；宇宙网是受真实宇宙网启发的程序化可视化，不是观测数据。
            三者的成因并不相同，相似的外形不等于相同的机制。影片与页面共用同一套帧驱动图形，因此导出的 MP4 与浏览器里看到的完全一致。
          </p>
          <p className='mt-3'>本站遵循系统的「减少动态效果」设置。</p>
          <p className='mt-3'>
            <a href='#film' className='transition-colors hover:text-paper'>
              回到影片 ↑
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
