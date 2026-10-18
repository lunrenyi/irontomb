import { Backdrop } from './components/Backdrop'
import { Nav } from './components/Nav'
import { FilmPlayer } from './components/FilmPlayer'
import { GrowthLab } from './components/GrowthLab'
import { NatureSwitch } from './components/NatureSwitch'
import { DepthLab } from './components/DepthLab'
import { Section } from './components/ui'
import { HERO_QUESTION, SITE_SUBTITLE } from './content'
import { seekFilm } from './story/playerBus'
import { SCENES } from './story/timeline'

const RECAP = SCENES.find((scene) => scene.id === 'depth')
const LESSON = SCENES.find((scene) => scene.id === 'lesson')

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

        {/* 实验室 */}
        <Section id='lab' className='mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6'>
          <p className='text-xs uppercase tracking-[0.3em] text-shoot'>互动实验室</p>
          <h2 className='mt-2 font-display text-[clamp(1.4rem,3.4vw,2.1rem)] text-paper'>用一条规则，自己长一遍</h2>
          <p className='mt-4 max-w-[54ch] text-[15px] leading-relaxed text-muted'>
            每次点「生长一代」，程序都会把当前的字符串按 <span className='font-mono text-leaf'>F → F[+F]F[-F]</span>{' '}
            再展开一次，然后用海龟把新的 F 画成枝条。分叉角与层数会真正改变结果。
          </p>
          <div className='mt-10'>
            <GrowthLab />
          </div>
          {LESSON ? (
            <div className='mt-10'>
              <JumpButton frame={LESSON.start} />
            </div>
          ) : null}
        </Section>

        {/* 三种分支 */}
        <Section id='nature' className='mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6'>
          <p className='text-xs uppercase tracking-[0.3em] text-leaf'>观察</p>
          <h2 className='mt-2 font-display text-[clamp(1.4rem,3.4vw,2.1rem)] text-paper'>像，但不一样</h2>
          <div className='mt-10'>
            <NatureSwitch />
          </div>
        </Section>

        {/* 自相似 */}
        <Section id='depth' className='mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6'>
          <p className='text-xs uppercase tracking-[0.3em] text-bud'>从简单到复杂</p>
          <h2 className='mt-2 font-display text-[clamp(1.4rem,3.4vw,2.1rem)] text-paper'>整体里，有一个缩小版的自己</h2>
          <div className='mt-10'>
            <DepthLab />
          </div>
          {RECAP ? (
            <div className='mt-10'>
              <JumpButton frame={RECAP.start} />
            </div>
          ) : null}
        </Section>

        {/* 收束 */}
        <Section id='closing' className='mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6'>
          <div className='border-t border-moss/12 pt-14 text-center'>
            <p className='font-display text-[clamp(1.8rem,6vw,3.2rem)] leading-tight text-paper breathe'>一条规则，长出无限</p>
            <p className='mx-auto mt-6 max-w-[46ch] text-[15px] leading-relaxed text-muted'>
              分叉不是魔法：一根枝条长到末端，就照着同一条规则再长一遍。
              重复得足够多次，简单就会长成看起来很复杂的样子。
            </p>
            <div className='mt-8 flex flex-wrap items-center justify-center gap-3'>
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
          <p className='max-w-[76ch]'>
            页面上的每一根枝条、每一片叶子都由程序生成，没有使用任何实景照片或预制素材。
            三种自然分支形态相似，但生成机制不同；影片与页面共用同一套帧驱动图形，因此导出的 MP4 与浏览器里看到的完全一致。
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
