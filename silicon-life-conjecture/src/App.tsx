import { Backdrop } from './components/Backdrop'
import { Nav } from './components/Nav'
import { FilmPlayer } from './components/FilmPlayer'
import { LifeLab } from './components/LifeLab'
import { CpuLab } from './components/CpuLab'
import { MindLab } from './components/MindLab'
import { EvolutionLab } from './components/EvolutionLab'
import { SampleLab } from './components/SampleLab'
import { NeuralLab } from './components/NeuralLab'
import { Note, Section } from './components/ui'
import { ACTS, CLOSING, HERO_QUESTION, SITE_SUBTITLE, SITE_TITLE } from './content'
import { seekFilm } from './story/playerBus'
import { FPS, TOTAL_SECONDS, sceneById } from './story/timeline'

function timecode(frame: number) {
  const total = Math.round(frame / FPS)
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0')
}

function JumpButton({ sceneId, children }: { sceneId: string; children: string }) {
  const scene = sceneById(sceneId as never)
  if (!scene) return null
  return (
    <button
      type='button'
      onClick={() => {
        seekFilm(scene.start)
        document.getElementById('film')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }}
      className='inline-flex items-center gap-2 rounded-full border border-signal/25 px-4 py-2 text-[13px] text-muted transition-colors hover:border-signal/60 hover:text-signal'
    >
      <span aria-hidden='true'>↑</span> {children}
    </button>
  )
}

/** 每一幕的固定结构：一个视觉入口 + 一个问题 + 一句结论 + 一个可选实验 */
function ActHead({ index }: { index: number }) {
  const act = ACTS[index]
  if (!act) return null
  const scene = sceneById(act.id as never)
  return (
    <div className='border-t border-signal/10 pt-9'>
      <div className='flex flex-wrap items-baseline gap-x-5 gap-y-1'>
        <h2 className='font-display text-[clamp(1.4rem,3.4vw,2.1rem)] text-paper'>{act.name}</h2>
        {scene ? (
          <p className='font-mono text-[12px] tabular-nums tracking-[0.18em] text-signal'>
            {timecode(scene.start)} — {timecode(scene.start + scene.duration)}
          </p>
        ) : null}
      </div>
      <p className='mt-3 max-w-[58ch] text-[15px] leading-relaxed text-paper'>{act.question}</p>
      <p className='mt-2 max-w-[62ch] text-[14px] leading-relaxed text-muted'>{act.answer}</p>
    </div>
  )
}

export default function App() {
  return (
    <div className='relative min-h-screen'>
      <Backdrop />
      <Nav />

      <main className='relative z-10'>
        <Section id='film' className='mx-auto w-full max-w-[1240px] px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24'>
          <div className='flex flex-wrap items-end justify-between gap-x-8 gap-y-3'>
            <h1 className='font-display text-[clamp(1.6rem,4.4vw,2.8rem)] leading-tight text-paper'>
              {SITE_TITLE}
              <span className='ml-3 align-middle font-mono text-[clamp(0.7rem,1.4vw,0.9rem)] tracking-[0.26em] text-muted'>
                SILICON LIFE
              </span>
            </h1>
            <p className='max-w-[38ch] text-sm leading-relaxed text-muted'>{HERO_QUESTION}</p>
          </div>

          <div className='mt-5'>
            <FilmPlayer />
          </div>

          <div className='mt-6 flex flex-wrap items-center gap-x-6 gap-y-3'>
            <a href='#life' className='inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-ink-950 transition-transform duration-200 hover:scale-[1.03] active:scale-95'>
              跳过引子，直接去动生命游戏 ↓
            </a>
            <span className='text-[13px] leading-relaxed text-muted'>
              全片 {TOTAL_SECONDS.toFixed(1)} 秒，无配音；每一帧都是程序画出来的。
            </span>
          </div>
        </Section>

        {/* 第一幕 */}
        <Section id='bits' className='mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6'>
          <ActHead index={0} />
          <div className='mt-8'>
            <SampleLab />
          </div>
          <div className='mt-6 flex flex-wrap gap-3'>
            <JumpButton sceneId='bits'>回影片看第一幕</JumpButton>
          </div>
          <div className='mt-6'>
            <Note title='科学说明：0 和 1 到底是什么'>
              {ACTS[0].caveat} 0 与 1 是把连续的物理量（电压、亮度、位移）按某个约定映射到两个符号上的结果。
              换一个约定（例如用三进制或更多档位），同样是连续世界，信息一样可以被表示。
            </Note>
          </div>
        </Section>

        {/* 第二幕 */}
        <Section id='life' className='mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6'>
          <ActHead index={1} />
          <div className='mt-8'>
            <LifeLab />
          </div>
          <div className='mt-6 flex flex-wrap gap-3'>
            <JumpButton sceneId='life'>回影片看第二幕</JumpButton>
          </div>
          <div className='mt-6'>
            <Note title='科学说明：这个游戏里没有生物学'>
              {ACTS[1].caveat}
            </Note>
          </div>
        </Section>

        {/* 第三幕 */}
        <Section id='neural' className='mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6'>
          <ActHead index={2} />
          <div className='mt-8'>
            <NeuralLab />
          </div>
          <div className='mt-6 flex flex-wrap gap-3'>
            <JumpButton sceneId='neural'>回影片看第三幕</JumpButton>
          </div>
          <div className='mt-6'>
            <Note title='科学说明：相似不等于相同'>{ACTS[2].caveat}</Note>
          </div>
        </Section>

        {/* 第四幕 */}
        <Section id='computer' className='mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6'>
          <ActHead index={3} />
          <div className='mt-8'>
            <CpuLab />
          </div>
          <div className='mt-6 flex flex-wrap gap-3'>
            <JumpButton sceneId='computer'>回影片看第四幕</JumpButton>
          </div>
          <div className='mt-6'>
            <Note title='科学说明：硬件、程序、算法、训练、运行'>{ACTS[3].caveat}</Note>
          </div>
        </Section>

        {/* 第五幕 */}
        <Section id='mind' className='mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6'>
          <ActHead index={4} />
          <div className='mt-8'>
            <MindLab />
          </div>
          <div className='mt-6 flex flex-wrap gap-3'>
            <JumpButton sceneId='mind'>回影片看第五幕</JumpButton>
          </div>
          <div className='mt-6'>
            <Note title='科学说明：为什么这一层不给答案'>{ACTS[4].caveat}</Note>
          </div>
        </Section>

        {/* 第六幕 */}
        <Section id='silicon' className='mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6'>
          <ActHead index={5} />
          <div className='mt-8'>
            <EvolutionLab />
          </div>
          <div className='mt-6 flex flex-wrap gap-3'>
            <JumpButton sceneId='silicon'>回影片看第六幕</JumpButton>
          </div>
          <div className='mt-6'>
            <Note title='科学说明：关于「生命」的工作定义'>{ACTS[5].caveat}</Note>
          </div>
        </Section>

        {/* 收束 */}
        <Section id='closing' className='mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6'>
          <div className='border-t border-signal/12 pt-14 text-center'>
            <p className='font-display text-[clamp(1.8rem,6vw,3.2rem)] leading-tight text-paper breathe'>{SITE_TITLE}</p>
            <p className='mx-auto mt-4 max-w-[46ch] text-[15px] leading-relaxed text-muted'>{SITE_SUBTITLE}</p>
            <div className='mx-auto mt-10 max-w-[58ch] space-y-4 text-left'>
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
              <a href='#life' className='inline-flex items-center gap-2 rounded-full border border-signal/25 px-5 py-2.5 text-sm text-muted transition-colors hover:text-paper'>
                回到生命游戏
              </a>
            </div>
          </div>
        </Section>
      </main>

      <footer className='relative z-10 border-t border-signal/10 py-10'>
        <div className='mx-auto w-full max-w-[1240px] px-4 text-xs leading-relaxed text-faint sm:px-6'>
          <p className='max-w-[86ch]'>
            本页所有画面 —— 采样点、像素、比特流、神经网络电位、晶体管与逻辑门、CPU 数据通路、模型概率分布、原子与分子结构、进化种群 ——
            全部由程序实时生成，没有任何实景照片或预制视频。生命游戏的每一格由 B3/S23 规则同步计算；
            CPU 演示里的每一步都是一段真实的汇编指令与真实的寄存器、内存、ALU 变化；
            那个语言模型是真的前向传播与反向传播训练出来的（词表 9 个词、隐藏层 12 个神经元）。
            <b className='text-muted'>影片与页面共用同一套帧驱动图形，因此导出的 MP4 与浏览器里看到的完全一致。</b>
          </p>
          <p className='mt-3'>本站遵循系统的「减少动态效果」设置。</p>
          <p className='mt-3'><a href='#film' className='transition-colors hover:text-paper'>回到影片 ↑</a></p>
        </div>
      </footer>
    </div>
  )
}
