import { BackgroundField } from './components/BackgroundField'
import { StoryNav } from './components/StoryNav'
import { HeroScene } from './components/HeroScene'
import { GrowthScene } from './components/GrowthScene'
import { ComplexPlaneScene } from './components/ComplexPlaneScene'
import { RotationLab } from './components/RotationLab'
import { SpecialAngleScene } from './components/SpecialAngleScene'
import { CancellationScene } from './components/CancellationScene'
import { ConstantsScene } from './components/ConstantsScene'
import { QuizSection } from './components/QuizSection'
import { Formula } from './components/Math'
import { NextCue, Section, SectionHeading } from './components/ui'
import { EULER_FORMULA_TEX, EULER_IDENTITY_TEX } from './content'
import { useAutoRotationEngine } from './state/rotationStore'

export default function App() {
  // 自动旋转引擎全局只挂一个 rAF 循环
  useAutoRotationEngine(0.9)

  return (
    <div className='relative min-h-screen'>
      <BackgroundField />
      <StoryNav />

      <main className='relative z-10'>
        <HeroScene />

        <Section id='growth' className='mx-auto w-full max-w-[1240px] px-5 py-24 sm:px-6'>
          <SectionHeading
            kicker='第一站'
            title='认识 e：一个关于增长的数字'
            lead={
              <>
                在讲公式之前，先给 e 一张面孔。它不需要微积分，只需要一个直觉：
                <span className='text-paper'>按比例持续增长下去时，那个反复出现的常数。</span>
              </>
            }
          />
          <div className='mt-12'>
            <GrowthScene />
          </div>
          <div className='mt-12'>
            <NextCue target='imaginary' label='继续：数字世界还缺一个方向' />
          </div>
        </Section>

        <Section id='imaginary' className='mx-auto w-full max-w-[1240px] px-5 py-24 sm:px-6'>
          <SectionHeading
            kicker='第二站'
            title='认识 i：数字世界多出一个方向'
            lead={
              <>
                数轴上的数字只能向左或向右。i 的作用，是让数字有了第二个方向——
                <span className='text-paper'>把数轴立起来，就得到复平面。</span>
              </>
            }
          />
          <div className='mt-12'>
            <ComplexPlaneScene />
          </div>
          <div className='mt-10 grid gap-5 text-[15px] leading-relaxed text-muted sm:grid-cols-2'>
            <p className='glass-panel rounded-2xl p-5'>
              <span className='text-paper'>复数长什么样？</span>
              <br />
              写成 a + bi：a 是实方向的部分，b 是虚方向的部分。我们用
              <Formula tex='(a,\ b)' className='text-paper' label='坐标 a, b' />
              来标记平面上的位置——也就是一对坐标。
            </p>
            <p className='glass-panel rounded-2xl p-5'>
              <span className='text-paper'>乘法在做什么？</span>
              <br />
              乘以一个复数，相当于把向量旋转并缩放；只乘以 i 时，缩放恰好为 1，
              <span className='text-imag'>剩下的效果就是转 90°</span>。
            </p>
          </div>
          <div className='mt-12'>
            <NextCue target='rotation' label='继续：轮到你亲手转起来' />
          </div>
        </Section>

        <Section id='rotation' className='mx-auto w-full max-w-[1240px] px-5 py-24 sm:px-6'>
          <SectionHeading
            kicker='互动实验室'
            title='把角度握在手里'
            lead={
              <>
                这是整站的核心实验。拖动圆周上的点，看单位圆上的坐标
                <Formula tex='(\cos\theta,\ \sin\theta)' className='text-paper' label='cos θ, sin θ' />
                怎样跟着角度一起变化——它们不是两套信息，
                <span className='text-paper'>而是同一个角度的两种读法。</span>
              </>
            }
          />
          <div className='mt-12'>
            <RotationLab />
          </div>
          <div className='mt-10 rounded-2xl border border-muted/12 bg-ink-950/40 px-5 py-4 text-[15px] leading-relaxed text-muted'>
            <span className='text-vector'>欧拉公式：</span>
            <Formula tex={EULER_FORMULA_TEX} className='mx-1 text-paper' label='e 的 i 次方 θ 等于 cos θ 加 i sin θ' />
            <br className='sm:hidden' />
            <span className='text-muted'>它说的是：单位圆上的点走到角度 θ 时，它的实部是 cos θ，虚部是 sin θ。</span>
          </div>
          <div className='mt-12'>
            <NextCue target='special' label='继续：让角度停在 π' />
          </div>
        </Section>

        <Section id='special' className='mx-auto w-full max-w-[1240px] px-5 py-24 sm:px-6'>
          <SectionHeading
            kicker='第三站'
            title='π 是关键的那一半'
            lead={
              <>
                π 不只是一个数字：它同时是一个角度。
                <span className='text-paper'>在单位圆上转 π 弧度，正好是半圈。</span>
                接下来我们把点转到 π，再用公式把结果一步步算出来。
              </>
            }
          />
          <div className='mt-12'>
            <SpecialAngleScene />
          </div>
          <div className='mt-12'>
            <NextCue target='cancellation' label='继续：为什么最后是 0' />
          </div>
        </Section>

        <Section id='cancellation' className='mx-auto w-full max-w-[1240px] px-5 py-24 sm:px-6'>
          <SectionHeading
            kicker='第四站'
            title='为什么最后是 0'
            lead={
              <>
                我们已经得到
                <Formula tex='e^{i\\pi} = -1' className='mx-1 text-vector' label='e 的 i 次方 π 等于负 1' />
                。剩下的问题只有一个：为什么再加上 1，会得到 0？
              </>
            }
          />
          <div className='mt-12'>
            <CancellationScene />
          </div>
          <div className='mt-12'>
            <NextCue target='constants' label='继续：五个角色，一张合影' />
          </div>
        </Section>

        <Section id='constants' className='mx-auto w-full max-w-[1240px] px-5 py-24 sm:px-6'>
          <SectionHeading
            kicker='第五站'
            title='五个常数，重新站到一起'
            lead='点一点每个符号，回想它在整条故事里做过的事。'
            align='center'
          />
          <div className='mt-12'>
            <ConstantsScene />
          </div>
          <div className='mt-12 flex justify-center'>
            <NextCue target='quiz' label='继续：轮到你来猜' />
          </div>
        </Section>

        <Section id='quiz' className='mx-auto w-full max-w-[1240px] px-5 py-24 sm:px-6'>
          <SectionHeading
            kicker='互动挑战'
            title='轮到你来猜'
            lead='三个小问题，答错也没关系——每个选项都会告诉你为什么。'
            align='center'
          />
          <div className='mt-12'>
            <QuizSection />
          </div>

          <div className='mt-20 rounded-3xl border border-muted/12 bg-ink-900/50 px-6 py-10 text-center sm:px-10'>
            <p className='text-xs uppercase tracking-[0.3em] text-muted'>整段旅程的结论</p>
            <Formula               tex={EULER_IDENTITY_TEX}
              display
              className='mt-4 text-[clamp(1.8rem,7vw,3.4rem)] text-result breathe'
              label='欧拉恒等式：e 的 i 次方 π 加 1 等于 0'
            />
            <p className='mx-auto mt-6 max-w-[46ch] text-[15px] leading-relaxed text-muted'>
              e 提供指数式的增长，i 提供一个垂直方向，π 指定转半圈，
              1 是要与 -1 相加的正数，0 则是抵消之后剩下的东西。
              <span className='text-paper'>这就是为什么它们会出现在同一个式子里。</span>
            </p>
            <div className='mt-8 flex flex-wrap items-center justify-center gap-3'>
              <a
                href='#hero'
                className='inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-ink-950 transition-transform hover:scale-[1.03] active:scale-95'
              >
                重新体验 ↑
              </a>
              <a
                href='#rotation'
                className='inline-flex items-center gap-2 rounded-full border border-muted/25 px-5 py-2.5 text-sm text-muted transition-colors hover:border-paper/50 hover:text-paper'
              >
                回到互动实验室
              </a>
            </div>
          </div>
        </Section>
      </main>

      <footer className='relative z-10 border-t border-muted/10 py-10'>
        <div className='mx-auto w-full max-w-[1240px] px-5 text-xs leading-relaxed text-faint sm:px-6'>
          <p className='max-w-[70ch]'>
            术语说明：一般形式
            <Formula tex={EULER_FORMULA_TEX} label='欧拉公式' className='mx-1 text-muted' />
            称为欧拉公式；把 θ 取为 π 得到的
            <Formula tex={EULER_IDENTITY_TEX} label='欧拉恒等式' className='mx-1 text-muted' />
            称为欧拉恒等式。本页把「乘以 i 等于旋转」当作直观模型，它只对乘以 i 成立。
          </p>
          <p className='mt-3'>
            本站遵循系统的「减少动态效果」设置；开启后动画会停止在关键结论上，信息完整可读。
          </p>
          <p className='mt-3'>
            <a href='#hero' className='transition-colors hover:text-paper'>
              回到顶部 ↑
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
