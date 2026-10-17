import { BackgroundField } from './components/BackgroundField'
import { StoryNav } from './components/StoryNav'
import { FilmPlayer } from './components/FilmPlayer'
import { RotationLab } from './components/RotationLab'
import { ConstantsStrip } from './components/ConstantsStrip'
import { QuizSection } from './components/QuizSection'
import { GrowthScene } from './components/GrowthScene'
import { Formula } from './components/Math'
import { NextCue, Section } from './components/ui'
import { EULER_FORMULA_TEX, EULER_IDENTITY_TEX, HERO_QUESTION } from './content'
import { seekFilm } from './story/playerBus'
import { FPS, SCENES, TOTAL_SECONDS } from './story/timeline'
import { useAutoRotationEngine } from './state/rotationStore'
import { useState } from 'react'

const HALF_TURN = SCENES.find((scene) => scene.id === 'halfturn')
const CANCEL = SCENES.find((scene) => scene.id === 'cancel')

/** 旁注：展开时才挂载增长场景，免得它在折叠状态下空跑动画 */
function GrowthNote() {
  const [open, setOpen] = useState(false)
  return (
    <details
      className='group mt-12 border-t border-muted/12 pt-6'
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className='flex cursor-pointer list-none items-center gap-3 text-sm text-muted transition-colors hover:text-paper'>
        <span className='font-mono text-[10px] text-faint'>附注</span>
        <span>e 是怎么来的？一条不断翻倍的增长曲线</span>
        <span className='text-faint transition-transform group-open:rotate-90' aria-hidden='true'>
          ›
        </span>
      </summary>
      <div className='mt-8'>
        <p className='mb-6 max-w-[54ch] text-[15px] leading-relaxed text-muted'>
          e 是自然指数里最重要的常数：任何「每过一小段时间就按比例多一点点」的过程，最后都会遇到它。
          注意这只是对 e 的直觉认识——影片里欧拉公式的 e 出现在指数位置，转动时长度并不会变大。
        </p>
        {open ? <GrowthScene /> : null}
      </div>
    </details>
  )
}

export default function App() {
  // 自动旋转引擎全局只挂一个 rAF 循环
  useAutoRotationEngine(0.9)

  return (
    <div className='relative min-h-screen'>
      <BackgroundField />
      <StoryNav />

      <main className='relative z-10'>
        {/* 影片即首页：文字只留一句提问 */}
        <Section id='film' className='mx-auto w-full max-w-[1240px] px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24'>
          <div className='flex flex-wrap items-end justify-between gap-x-8 gap-y-3'>
            <h1 className='font-display text-[clamp(1.6rem,4.6vw,2.9rem)] leading-tight text-paper'>
              欧拉恒等式
              <span className='ml-3 align-middle font-mono text-[clamp(0.72rem,1.5vw,0.95rem)] tracking-[0.28em] text-muted'>
                EULER FILM
              </span>
            </h1>
            <p className='max-w-[34ch] text-sm leading-relaxed text-muted'>{HERO_QUESTION}</p>
          </div>

          <div className='mt-5'>
            <FilmPlayer />
          </div>

          <div className='mt-6 flex flex-wrap items-center gap-x-6 gap-y-3'>
            <a
              href='#lab'
              className='inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-ink-950 transition-transform duration-200 hover:scale-[1.03] active:scale-95'
            >
              跳过影片，直接转圆 ↓
            </a>
            <span className='text-[13px] leading-relaxed text-muted'>
              影片约 {Math.round(TOTAL_SECONDS)} 秒 · 无配音 · 也可以用 npm run export:mp4 导出成 MP4
            </span>
          </div>
        </Section>

        {/* 互动实验室：影片里的圆，现在交给你 */}
        <Section id='lab' className='mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6'>
          <div className='flex flex-wrap items-end justify-between gap-x-8 gap-y-4'>
            <div>
              <p className='text-xs uppercase tracking-[0.3em] text-vector'>互动实验室</p>
              <h2 className='mt-2 font-display text-[clamp(1.4rem,3.4vw,2.1rem)] text-paper'>现在轮到你转动这个圆</h2>
            </div>
            <p className='max-w-[38ch] text-[15px] leading-relaxed text-muted'>
              拖动圆周上的点：横坐标是 cos θ，纵坐标是 sin θ。两者不是两套信息，而是同一个角度的两种读法。
            </p>
          </div>

          <div className='mt-10'>
            <RotationLab />
          </div>

          <div className='mt-10 flex flex-wrap items-center gap-x-6 gap-y-3'>
            {HALF_TURN ? (
              <button
                type='button'
                onClick={() => {
                  seekFilm(HALF_TURN.start)
                  document.getElementById('film')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className='inline-flex items-center gap-2 rounded-full border border-muted/25 px-4 py-2 text-[13px] text-muted transition-colors hover:border-vector/60 hover:text-vector'
              >
                <span aria-hidden='true'>↑</span> 回影片 {Math.round(HALF_TURN.start / FPS)} 秒，看点自己转过半圈
              </button>
            ) : null}
            <NextCue target='constants' label='继续：五个常数重新登场' />
          </div>
        </Section>

        {/* 五个常数 */}
        <Section id='constants' className='mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6'>
          <p className='text-xs uppercase tracking-[0.3em] text-node'>回顾</p>
          <h2 className='mt-2 font-display text-[clamp(1.4rem,3.4vw,2.1rem)] text-paper'>五个角色，一张合影</h2>
          <div className='mt-8'>
            <ConstantsStrip />
          </div>

          {/* 旁注：e 的增长直觉，收在可展开的区域里，不打断主线 */}
          <GrowthNote />

          <div className='mt-12'>
            <NextCue target='quiz' label='继续：轮到你来猜' />
          </div>
        </Section>

        {/* 挑战 + 收束 */}
        <Section id='quiz' className='mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-6'>
          <p className='text-xs uppercase tracking-[0.3em] text-imag'>互动挑战</p>
          <h2 className='mt-2 font-display text-[clamp(1.4rem,3.4vw,2.1rem)] text-paper'>三个问题，猜猜看</h2>
          <div className='mt-8'>
            <QuizSection />
          </div>

          <div className='mt-20 border-t border-muted/12 pt-14 text-center'>
            <Formula
              tex={EULER_IDENTITY_TEX}
              display
              className='text-[clamp(2rem,9vw,4.2rem)] text-result breathe'
              label='欧拉恒等式：e 的 i 次方 π 加 1 等于 0'
            />
            <p className='mx-auto mt-6 max-w-[42ch] text-[15px] leading-relaxed text-muted'>
              e 提供指数式的增长，i 提供第二个方向，π 指定半圈，1 是要与 -1 相加的正数，0 是抵消之后剩下的东西。
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
              <a
                href='#lab'
                className='inline-flex items-center gap-2 rounded-full border border-muted/25 px-5 py-2.5 text-sm text-muted transition-colors hover:border-paper/50 hover:text-paper'
              >
                回到实验室
              </a>
              {CANCEL ? (
                <button
                  type='button'
                  onClick={() => {
                    seekFilm(CANCEL.start)
                    document.getElementById('film')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className='inline-flex items-center gap-2 rounded-full border border-muted/25 px-5 py-2.5 text-sm text-muted transition-colors hover:border-paper/50 hover:text-paper'
                >
                  只看抵消那一场
                </button>
              ) : null}
            </div>
          </div>
        </Section>
      </main>

      <footer className='relative z-10 border-t border-muted/10 py-10'>
        <div className='mx-auto w-full max-w-[1240px] px-4 text-xs leading-relaxed text-faint sm:px-6'>
          <p className='max-w-[74ch]'>
            术语说明：一般形式 <Formula tex={EULER_FORMULA_TEX} label='欧拉公式' className='text-muted' />
            称为欧拉公式；把 θ 取为 π 得到的 <Formula tex={EULER_IDENTITY_TEX} label='欧拉恒等式' className='text-muted' />
            称为欧拉恒等式。本站把「乘以 i 等于旋转」当作直观模型，它只对乘以 i 成立，不是严格证明。
          </p>
          <p className='mt-3'>
            影片与页面共用同一套图形与时间轴（src/story），因此导出的 MP4 与你在浏览器里看到的完全一致。本站遵循系统的「减少动态效果」设置。
          </p>
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
