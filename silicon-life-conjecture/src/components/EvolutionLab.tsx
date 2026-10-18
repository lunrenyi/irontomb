import { useState } from 'react'
import { EvolutionPanel, TRAITS, TraitRing } from '../viz/artlife'
import { AtomFigure, ElementTable, MoleculeFigure } from '../viz/chemfig'
import { CARBON, CARBON_DIOXIDE, METHANE, SILANE, SILICON, SILICON_DIOXIDE } from '../lib/atoms'
import { DEFAULT_EVOLVE, evolvePopulation } from '../lib/evolve'
import { Chip } from './ui'

const RUNS = evolvePopulation(DEFAULT_EVOLVE)

function EvolutionView({ gen, onGen }: { gen: number; onGen: (value: number) => void }) {
  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10'>
      <div className='glass-panel rounded-2xl p-5'>
        <div className='text-xs uppercase tracking-[0.22em] text-muted'>进化实验</div>
        <p className='mt-2 max-w-[48ch] text-[13px] leading-relaxed text-muted'>
          每个个体是一串基因；能繁殖、能变异；环境决定谁更有优势。
          第 {DEFAULT_EVOLVE.shiftAt} 代环境会换一次目标，适应度先掉下去，再慢慢爬回来。
        </p>
        <input
          id='lab-generation'
          type='range'
          className='lab-range mt-4 w-full'
          min={0}
          max={RUNS.length - 1}
          step={1}
          value={gen}
          onChange={(event) => onGen(Number(event.target.value))}
        />
        <svg viewBox='0 0 1000 560' className='mt-2 block h-auto w-full' role='img' aria-label='进化过程可视化'>
          <EvolutionPanel x={20} y={60} width={640} gen={gen} generations={RUNS} reveal={0.3} />
        </svg>
      </div>

      <aside className='glass-panel rounded-2xl p-5'>
        <svg viewBox='0 0 520 520' className='mx-auto block h-auto w-full max-w-[320px]' role='img' aria-label='假想人工系统的能力'>
          <TraitRing cx={260} cy={250} radius={200} traits={TRAITS} />
        </svg>
        <ul className='mt-4 space-y-2'>
          {TRAITS.map((t) => (
            <li key={t.id} className='text-[12px] leading-relaxed text-muted'>
              <span className={t.level > 0.6 ? 'text-signal' : t.level > 0.15 ? 'text-blue' : 'text-amber'}>
                {t.level > 0.6 ? '今天可以' : t.level > 0.15 ? '还差一些' : '只是假想条件'}
              </span>{' '}
              · {t.label}
            </li>
          ))}
        </ul>
        <p className='mt-4 border-t border-signal/10 pt-3 text-[12px] leading-relaxed text-faint'>
          后三项是科学思想实验里提出的条件，不是对现有系统的描述。
        </p>
      </aside>
    </div>
  )
}

function AtomCompare() {
  return (
    <div className='glass-panel overflow-x-auto rounded-2xl p-5'>
      <svg viewBox='0 0 900 640' className='block h-auto w-full min-w-[620px]' role='img' aria-label='碳与硅原子结构对照'>
        <g transform='translate(200 180) scale(0.62)'>
          <AtomFigure x={0} y={0} scale={1} data={CARBON} spin={0.4} />
        </g>
        <g transform='translate(620 180) scale(0.62)'>
          <AtomFigure x={0} y={0} scale={1} data={SILICON} spin={-0.3} />
        </g>
        <g transform='translate(20 470)'>
          <ElementTable x={0} y={0} width={860} />
        </g>
      </svg>
    </div>
  )
}

function MoleculeCompare() {
  return (
    <div className='glass-panel rounded-2xl p-5'>
      <svg viewBox='0 0 460 260' className='block h-auto w-full' role='img' aria-label='甲烷与硅烷都是正四面体'>
        <g transform='translate(110 130)'>
          <MoleculeFigure x={0} y={0} scale={40} data={METHANE} />
          <text x={0} y={110} textAnchor='middle' fill='#8d99b6' fontSize={18}>
            {METHANE.formula} 独立分子
          </text>
        </g>
        <g transform='translate(330 130)'>
          <MoleculeFigure x={0} y={0} scale={40} data={SILANE} />
          <text x={0} y={110} textAnchor='middle' fill='#8d99b6' fontSize={18}>
            {SILANE.formula} 同样是四面体
          </text>
        </g>
      </svg>
      <svg viewBox='0 0 460 280' className='mt-4 block h-auto w-full' role='img' aria-label='二氧化碳与二氧化硅结构完全不同'>
        <g transform='translate(120 120)'>
          <MoleculeFigure x={0} y={0} scale={62} data={CARBON_DIOXIDE} />
          <text x={0} y={140} textAnchor='middle' fill='#8d99b6' fontSize={18}>
            {CARBON_DIOXIDE.formula} 独立分子
          </text>
        </g>
        <g transform='translate(300 130) scale(0.62)'>
          <MoleculeFigure x={0} y={0} scale={62} data={SILICON_DIOXIDE} />
        </g>
        <text x={310} y={220} textAnchor='middle' fill='#ffc978' fontSize={18}>
          {SILICON_DIOXIDE.formula} 三维网络
        </text>
      </svg>
      <p className='mt-3 border-t border-signal/10 pt-3 text-[12px] leading-relaxed text-faint'>
        相似性是真实的：同族、同价电子数、同样的成键数目。
        但差别同样真实，而且不是靠「换个元素」就能抹平的。
      </p>
    </div>
  )
}

function ChemistryView() {
  return (
    <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-8'>
      <AtomCompare />
      <MoleculeCompare />
    </div>
  )
}

/**
 * 第六幕实验室。
 *
 * 「进化」页里跑的是真的遗传算法：固定种子，每一代都真的做选择、交叉、变异，
 * 第 shiftAt 代环境换一次目标，可以看到适应度掉下去再爬回来。
 */
export function EvolutionLab() {
  const [gen, setGen] = useState(0)
  const [view, setView] = useState<'evo' | 'chem'>('evo')

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap gap-2'>
        <Chip active={view === 'evo'} tone='signal' onClick={() => setView('evo')}>
          假想的人工系统与进化
        </Chip>
        <Chip active={view === 'chem'} tone='blue' onClick={() => setView('chem')}>
          碳与硅的化学对照
        </Chip>
      </div>
      {view === 'evo' ? <EvolutionView gen={gen} onGen={setGen} /> : <ChemistryView />}
    </div>
  )
}
