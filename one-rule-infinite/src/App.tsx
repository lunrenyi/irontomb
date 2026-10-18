import { Backdrop } from './components/Backdrop'
import { Nav } from './components/Nav'
import { FilmPlayer } from './components/FilmPlayer'
import { GrowthLab } from './components/GrowthLab'
import { KnowledgeNet } from './components/KnowledgeNet'
import { CosmosView } from './components/CosmosView'
import { Section } from './components/ui'
import { ACTS, CLOSING, HERO_QUESTION, SITE_SUBTITLE, SITE_TITLE } from './content'
import { seekFilm } from './story/playerBus'
import { FPS, SCENES, TOTAL_SECONDS } from './story/timeline'

const GROWTH = SCENES.find((scene) => scene.id === 'growth')
const NETWORK_TURN = SCENES.find((scene) => scene.id === 'network')
const PHONE = SCENES.find((scene) => scene.id === 'phone')
const COSMOS = SCENES.find((scene) => scene.id === 'cosmos')

function JumpButton({ frame, children }: { frame: number; children: string }) {
  return (
    <button
      type='button'
      onClick={() => {
        seekFilm(frame)
        document.getElementById('film')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }}
      className='inline-flex items-center gap-2 rounded-full border border-moss/25 px-4 py-2 text-[13px] text-muted transition-colors hover:border-shoot/60 hover:text-shoot'
    >
      <span aria-hidden='true'>↑</span> {children}
    </button>
  )
}

/** 把帧号写成影片里的时间码 */
function timecode(frame: number) {
  const total = Math.round(frame / FPS)
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0')
}

/** 幕次条：这一幕叫什么、在影片的哪一段、负责讲什么 */
function ActBand({ index, from, to }: { index: number; from?: number; to?: number }) {
  const act = ACTS[index]
  if (!act) return null
  return (
    <div className='flex flex-wrap items-baseline gap-x-5 gap-y-1 border-t border-moss/10 pt-9'>
      <h2 className='font-display text-[clamp(1.4rem,3.4vw,2.1rem)] text-paper'>{act.name}</h2>
      {from !== undefined && to !== undefined ? (
        <p className='font-mono text-[12px] tabular-nums tracking-[0.18em] text-shoot'>
          {timecode(from)} — {timecode(to)}
        </p>
      ) : null}
      <p className='w-full text-[13px] text-muted sm:pl-[calc(clamp(1.4rem,3.4vw,2.1rem)+1.25rem)]'>
        {act.note}
      </p>
    </div>
  )
}

const ACT_RANGE: { from?: number; to?: number }[] = (() => {
  const act1 = SCENES.filter((x) => x.id === 'growth')
  const act2 = SCENES.filter((x) => ['domains', 'fields', 'network', 'phone'].indexOf(x.id) >= 0)
  const act3 = SCENES.filter((x) => x.id === 'cosmos')
  const span = (list: typeof SCENES) =>
    list.length ? { from: list[0].start, to: list[list.length - 1].start + list[list.length - 1].duration } : {}
  return [span(act1), span(act2), span(act3)]
})()

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
              {SITE_TITLE}
              <span className='ml-3 align-middle font-mono text-[clamp(0.7rem,1.4vw,0.9rem)] tracking-[0.26em] text-muted'>
                FROM BRANCHES TO STARS
              </span>
            </h1>
            <p className='max-w-[36ch] text-sm leading-relaxed text-muted'>{HERO_QUESTION}</p>
          </div>

          <div className='mt-5'>
            <FilmPlayer />
          </div>

          <div className='mt-6 flex flex-wrap items-center gap-x-6 gap-y-3'>
            <a
              href='#knowledge'
              className='inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-ink-950 transition-transform duration-200 hover:scale-[1.03] active:scale-95'
            >
              跳过引子，直接看知识网络 ↓
            </a>
            <span className='text-[13px] leading-relaxed text-muted'>
              全片 {TOTAL_SECONDS.toFixed(1)} 秒，无配音；每一帧都是程序画出来的。
            </span>
          </div>
        </Section>

        {/* 第一幕 */}
        <Section id='growth' className='mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6'>
          <ActBand index={0} {...ACT_RANGE[0]} />
          <p className='mt-7 max-w-[54ch] text-[15px] leading-relaxed text-muted'>
            一棵树能说明的只有一件事：复杂可以从一个简单的起点长出来。
            <span className='mt-2 block text-paper/85'>但知识并不是这样长大的。往下看第二幕。</span>
          </p>

          {/* 这一幕的内容就是这个生长实验室：与其留一整段只有文字的空白，
              不如让引子本身有一个可以动手的画面。 */}
          <div className='mt-8 flex items-center gap-4'>
            <span className='text-[11px] uppercase tracking-[0.22em] text-muted'>生长实验室</span>
            <span className='h-px flex-1 bg-moss/12' />
          </div>
          <div className='mt-5'>
            <GrowthLab />
          </div>
          <div className='mt-8 flex flex-wrap items-center gap-3'>
            {GROWTH ? <JumpButton frame={GROWTH.start}>回影片看引子</JumpButton> : null}
          </div>
        </Section>

        {/* 第二幕 —— 全片主体 */}
        <Section id='knowledge' className='mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6'>
          <ActBand index={1} {...ACT_RANGE[1]} />
          <p className='mt-8 max-w-[58ch] text-[15px] leading-relaxed text-muted'>
            一开始，五个方向只是往外分叉。但很快就有连线横穿过去：
            一块芯片要同时用到材料、光刻、薄膜与算法；一项基础技术会被反复复用。
            <span className='mt-2 block text-paper/85'>从那以后，它就不再是一棵树，而是一张有向无环图。</span>
          </p>
          <div className='mt-8'>
            <KnowledgeNet
              footer={
                <>
                  {NETWORK_TURN ? <JumpButton frame={NETWORK_TURN.start}>回影片看转折</JumpButton> : null}
                  {PHONE ? <JumpButton frame={PHONE.start}>回影片看汇聚</JumpButton> : null}
                </>
              }
            />
          </div>
        </Section>

        {/* 第三幕 */}
        <Section id='cosmos' className='mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6'>
          <ActBand index={2} {...ACT_RANGE[2]} />
          <p className='mt-8 max-w-[58ch] text-[15px] leading-relaxed text-muted'>
            更大的尺度上，宇宙也有自己的网：星系结成团块，团块连成丝，中间留下巨大的空洞。
            <span className='mt-2 block text-[#8fa4d8]'>但它的成因不是分叉规则，而是引力下的物质演化 —— 长得像，不等于来路相同。</span>
          </p>
          <div className='mt-8'>
            <CosmosView footer={COSMOS ? <JumpButton frame={COSMOS.start}>回影片看结尾</JumpButton> : null} />
          </div>
        </Section>

        {/* 收束 */}
        <Section id='closing' className='mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6'>
          <div className='border-t border-moss/12 pt-14 text-center'>
            <p className='font-display text-[clamp(1.8rem,6vw,3.2rem)] leading-tight text-paper breathe'>{SITE_TITLE}</p>
            <p className='mx-auto mt-4 max-w-[46ch] text-[15px] leading-relaxed text-muted'>{SITE_SUBTITLE}</p>
            <div className='mx-auto mt-10 max-w-[54ch] space-y-4 text-left'>
              {CLOSING.map((line, i) => {
                const last = i === CLOSING.length - 1
                return (
                  <p key={i} className={last ? 'font-display text-[clamp(1.05rem,2vw,1.35rem)] leading-relaxed text-paper' : 'text-[15px] leading-relaxed text-muted'}>
                    {line}
                  </p>
                )
              })}
            </div>
            <div className='mt-12 flex flex-wrap items-center justify-center gap-3'>
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
              <a href='#knowledge' className='inline-flex items-center gap-2 rounded-full border border-moss/25 px-5 py-2.5 text-sm text-muted transition-colors hover:border-paper/50 hover:text-paper'>
                回到知识网络
              </a>
            </div>
          </div>
        </Section>
      </main>

      <footer className='relative z-10 border-t border-moss/10 py-10'>
        <div className='mx-auto w-full max-w-[1240px] px-4 text-xs leading-relaxed text-faint sm:px-6'>
          <p className='max-w-[80ch]'>
            页面上的每一根枝条、每一片叶子、每一条知识连线与每一段宇宙丝线都由程序生成，
            没有使用任何实景照片或预制素材。
            知识网络是一组<b className='text-muted'>虚构的示意例子</b>，用来讲清依赖、复用与汇合，
            不代表真实技术史或因果顺序；宇宙网是受真实宇宙网启发的<b className='text-muted'>程序化可视化</b>，不是观测数据。
            三者的形成机制并不相同：树靠分叉，知识靠连接与积累，宇宙网靠引力与长期演化。
            影片与页面共用同一套帧驱动图形，因此导出的 MP4 与浏览器里看到的完全一致。
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
