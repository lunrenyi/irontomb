import { ChapterTitle, SceneKeys } from '../FilmChrome'
import { AtomFigure, MoleculeFigure } from '../../viz/chemfig'
import { EvolutionPanel, TRAITS, TraitRing, TwoSilicons } from '../../viz/artlife'
import { CARBON, CARBON_DIOXIDE, METHANE, SILANE, SILICON, SILICON_DIOXIDE } from '../../lib/atoms'
import { DEFAULT_EVOLVE, evolvePopulation } from '../../lib/evolve'
import { easeIn, easeOut } from '../../lib/easing'
import { AMBER, BLUE, FAINT, INK, MUTED, SIGNAL, VIOLET, alpha } from '../../viz/palette'
import { STAGE_H, STAGE_W, beatsOf } from '../timeline'
import { frac } from '../cues'
import { SCORE } from '../score'

/** 整幅画面尺寸的 svg 必须绝对定位：否则同一幕里两层图形会上下堆叠，把后一层顶出画面 */
const STAGE_SVG = { position: 'absolute', inset: 0 } as const

const B = beatsOf('silicon')
const SPEC = SCORE.silicon

// 进化过程是真的跑出来的：固定种子，所以每一次渲染都一样
const EVOLUTION = evolvePopulation(DEFAULT_EVOLVE)
const SOFT = '#e8ecf7'

/**
 * 第六幕：硅基生命的猜想。
 * 反复强调两个不同的东西：硅作为化学骨架，和硅作为半导体硬件。
 */
export function SiliconScene({ frame }: { frame: number }) {
  const spin = frac(frame, B, 2, 0, 1) * Math.PI * 4
  const gen = Math.floor(frac(frame, B, 6, 0.06, 0.95) * (EVOLUTION.length - 1))
  const merge = easeIn(frac(frame, B, 8, 0, 0.85))
  const bond = frame >= B[3].start + 10 && frame < B[3].start + 46 ? 0 : frame >= B[3].end - 40 ? 2 : -1

  const showTwo = frame < B[2].start
  const showAtoms = frame >= B[2].start && frame < B[3].start
  const showMolecules = frame >= B[3].start && frame < B[4].start
  const showOxide = frame >= B[4].start && frame < B[5].start
  const showTraits = frame >= B[5].start && frame < B[6].start
  const showEvo = frame >= B[6].start && frame < B[7].start
  const showQuestions = frame >= B[7].start && frame < B[8].start

  return (
    <>
      <ChapterTitle frame={frame} beats={B} title='硅基生命的猜想' sub='SILICON LIFE · A CONJECTURE' />
      {showTwo ? <TwoSiliconsPanel frame={frame} /> : null}
      {showAtoms ? <AtomsPanel frame={frame} spin={spin} /> : null}
      {showMolecules ? <MoleculePanel frame={frame} bond={bond} /> : null}
      {showOxide ? <OxidePanel frame={frame} /> : null}
      {showTraits ? <TraitsPanel frame={frame} /> : null}
      {showEvo ? <EvolutionScene gen={gen} frame={frame} /> : null}
      {showQuestions ? <QuestionsPanel frame={frame} /> : null}
      {frame >= B[8].start ? <Finale merge={merge} /> : null}
      <SceneKeys frame={frame} beats={B} specs={SPEC} />
    </>
  )
}

/** 第 0-1 拍：先把两个「硅」分开摆 —— 这一版字号给到 54 / 34 */
function TwoSiliconsPanel({ frame }: { frame: number }) {
  const inT = easeOut(frac(frame, B, 0, 0, 0.25))
  const dim = 1 - easeOut(frac(frame, B, 1, 0.3, 1)) * 0.55
  return (
    <svg width={STAGE_W} height={STAGE_H} className='block' style={STAGE_SVG} opacity={inT * dim}>
      <TwoSilicons x={230} y={170} gap={720} />
    </svg>
  )
}

/** 第 2 拍：碳与硅的原子结构 —— 相似性的真实来源 */
function AtomsPanel({ frame, spin }: { frame: number; spin: number }) {
  return (
    <svg width={STAGE_W} height={STAGE_H} className='block' style={STAGE_SVG} opacity={easeOut(frac(frame, B, 2, 0, 0.2))}>
      <g transform='translate(430 440)'>
        <AtomFigure x={0} y={0} scale={1.15} data={CARBON} spin={spin * 0.5} />
      </g>
      <g transform='translate(1130 440)'>
        <AtomFigure x={0} y={0} scale={1.15} data={SILICON} spin={-spin * 0.4} />
      </g>
      <path d='M 660 440 L 900 440' stroke={alpha(MUTED, 0.3)} strokeWidth={1.6} strokeDasharray='8 8' />
      <text x={780} y={406} fill={FAINT} fontSize={32} textAnchor='middle'>
        同属第 14 族
      </text>
      <text x={780} y={510} fill={FAINT} fontSize={32} textAnchor='middle'>
        都有 4 个价电子
      </text>
      <text x={960} y={780} fill={MUTED} fontSize={32} textAnchor='middle'>
        这是相似性的真实来源，但相似到此为止
      </text>
    </svg>
  )
}

/** 第 3 拍：甲烷与硅烷，形状一模一样 */
function MoleculePanel({ frame, bond }: { frame: number; bond: number }) {
  return (
    <svg width={STAGE_W} height={STAGE_H} className='block' style={STAGE_SVG} opacity={easeOut(frac(frame, B, 3, 0, 0.2))}>
      <text x={STAGE_W / 2} y={130} fill={BLUE} fontSize={40} textAnchor='middle'>
        相似：两个都是正四面体
      </text>
      <g transform='translate(470 460)'>
        <MoleculeFigure x={0} y={0} scale={86} data={METHANE} highlightBond={bond} />
        <text x={0} y={250} fill={MUTED} fontSize={34} textAnchor='middle'>
          {METHANE.name + ' ' + METHANE.formula}
        </text>
        <text x={0} y={296} fill={FAINT} fontSize={28} textAnchor='middle'>
          碳居中 · 四个氢在四角
        </text>
      </g>
      <g transform='translate(1180 460)'>
        <MoleculeFigure x={0} y={0} scale={86} data={SILANE} highlightBond={bond} />
        <text x={0} y={250} fill={MUTED} fontSize={34} textAnchor='middle'>
          {SILANE.name + ' ' + SILANE.formula}
        </text>
        <text x={0} y={296} fill={FAINT} fontSize={28} textAnchor='middle'>
          几何形状一模一样
        </text>
      </g>
    </svg>
  )
}

/** 第 4 拍：最要命的一处差别 —— 二氧化碳是分子，二氧化硅是一张网 */
function OxidePanel({ frame }: { frame: number }) {
  return (
    <svg width={STAGE_W} height={STAGE_H} className='block' style={STAGE_SVG} opacity={easeOut(frac(frame, B, 4, 0, 0.2))}>
      <g transform='translate(470 470)'>
        <MoleculeFigure x={0} y={0} scale={152} data={CARBON_DIOXIDE} />
        <text x={0} y={236} fill={MUTED} fontSize={34} textAnchor='middle'>
          {CARBON_DIOXIDE.name + ' · 一个独立分子'}
        </text>
      </g>
      <g transform='translate(1400 470)'>
        <MoleculeFigure x={0} y={0} scale={80} data={SILICON_DIOXIDE} />
        <text x={-60} y={236} fill={MUTED} fontSize={34} textAnchor='middle'>
          {SILICON_DIOXIDE.name + ' · 三维网络'}
        </text>
      </g>
      <text x={STAGE_W / 2} y={150} fill={AMBER} fontSize={44} textAnchor='middle'>
        同样的元素，氧化之后完全不同
      </text>
    </svg>
  )
}

/** 第 5 拍：假想的一个人工系统，逐项能力 */
function TraitsPanel({ frame }: { frame: number }) {
  const inT = easeOut(frac(frame, B, 5, 0, 0.3))
  return (
    <svg width={STAGE_W} height={STAGE_H} className='block' style={STAGE_SVG} opacity={inT}>
      <TraitRing cx={540} cy={470} radius={250} traits={TRAITS} />
      <text x={540} y={790} fill={MUTED} fontSize={30} textAnchor='middle'>
        假想的一个人工系统，逐项能力
      </text>
      {TRAITS.map((t, i) => (
        <text key={t.id} x={950} y={252 + i * 66} fill={t.level > 0.6 ? SIGNAL : t.level > 0.15 ? BLUE : AMBER} fontSize={30}>
          {t.level > 0.6 ? '今天可以' : t.level > 0.15 ? '还差一些' : '只是假想条件'} · {t.label}
        </text>
      ))}
    </svg>
  )
}

/** 第 6 拍：进化是真的在跑 */
function EvolutionScene({ gen, frame }: { gen: number; frame: number }) {
  return (
    <svg width={STAGE_W} height={STAGE_H} className='block' style={STAGE_SVG} opacity={easeOut(frac(frame, B, 6, 0, 0.25))}>
      <EvolutionPanel x={240} y={280} width={920} gen={gen} generations={EVOLUTION} reveal={0.3} />
      <text x={1280} y={316} fill={MUTED} fontSize={36}>
        这一段是真的在跑
      </text>
      {['每个个体是一串基因', '能繁殖、能变异', '环境决定谁更有优势', '中途环境变一次：适应度掉下去，再慢慢爬回来'].map((line, i) => (
        <text key={line} x={1280} y={390 + i * 62} fill={SOFT} fontSize={30}>
          · {line}
        </text>
      ))}
      <text x={1280} y={390 + 4 * 62 + 26} fill={AMBER} fontSize={30}>
        维持 · 复制 · 变异 · 选择
      </text>
    </svg>
  )
}

/** 第 7 拍：三个问题，一条一条出现 */
function QuestionsPanel({ frame }: { frame: number }) {
  const questions = [
    '1. 机器能够学习，我们是否该称它具有智能？',
    '2. 机器能够维持自身并复制，是否该称它具有生命？',
    '3. 机器能证明自己拥有主观体验，我们又该如何认识它？',
  ]
  return (
    <svg width={STAGE_W} height={STAGE_H} className='block' style={STAGE_SVG}>
      {questions.map((q, i) => (
        <text key={q} x={STAGE_W / 2} y={250 + i * 152} fill={INK} fontSize={44} textAnchor='middle' opacity={easeOut(frac(frame, B, 7, 0.05 + i * 0.16, 0.28 + i * 0.16))}>
          {q}
        </text>
      ))}
      <text x={STAGE_W / 2} y={768} fill={FAINT} fontSize={30} textAnchor='middle' opacity={easeOut(frac(frame, B, 7, 0.6, 0.85))}>
        科学没有替我们回答，我们也不替科学回答
      </text>
    </svg>
  )
}

/** 第 8 拍：人工系统的光点与宇宙背景合在一起，只留最后一句 */
function Finale({ merge }: { merge: number }) {
  return (
    <svg width={STAGE_W} height={STAGE_H} className='block' style={STAGE_SVG}>
      <g transform={'translate(' + STAGE_W / 2 + ' 430)'}>
        {Array.from({ length: 110 }, (_, i) => {
          const a = (i / 110) * Math.PI * 2
          const r = 110 + (i % 11) * 46
          return (
            <circle
              key={i}
              cx={Math.cos(a) * r * (1 + merge * 0.5)}
              cy={Math.sin(a) * r * 0.62 * (1 + merge * 0.5)}
              r={1.8 + (i % 3)}
              fill={i % 3 === 0 ? SIGNAL : i % 3 === 1 ? VIOLET : INK}
              opacity={(1 - merge) * 0.85}
            />
          )
        })}
        <circle r={150} fill='none' stroke={alpha(SIGNAL, 0.25)} strokeWidth={1.4} />
        <circle r={250} fill='none' stroke={alpha(SIGNAL, 0.16)} strokeWidth={1.2} />
        <circle r={360} fill='none' stroke={alpha(SIGNAL, 0.1)} strokeWidth={1} />
      </g>
    </svg>
  )
}
