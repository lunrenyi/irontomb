import { useCallback, useEffect, useRef, useState } from 'react'
import { CpuMachineFigure } from '../viz/cpumachine'
import { PROGRAMS, createMachine, microStep, runToEnd, stepInstruction, type Machine, type Program } from '../lib/vm'
import { Chip, Ghost } from './ui'

/** 自动播放的间隔（毫秒），每一步就是一个真实的微阶段 */
const STEP_MS = 700

/**
 * 计算机组成原理实验室。
 *
 * 「执行下一步」推进的是 vm.ts 里的一次 microStep，
 * 所以图上每一次 PC 前进、寄存器变化、内存写入都是真的。
 * 换程序只是换内存里的指令与数据，硬件一个字都没改。
 */
export function CpuLab() {
  const [program, setProgram] = useState<Program>(PROGRAMS[0])
  const [machine, setMachine] = useState<Machine>(() => createMachine(PROGRAMS[0]))
  const [playing, setPlaying] = useState(false)
  const machineRef = useRef(machine)
  machineRef.current = machine

  const pick = useCallback((next: Program) => {
    setProgram(next)
    setPlaying(false)
    setMachine(createMachine(next))
  }, [])

  const next = useCallback(() => {
    setPlaying(false)
    setMachine((m) => microStep(m))
  }, [])

  const whole = useCallback(() => {
    setPlaying(false)
    setMachine((m) => stepInstruction(m))
  }, [])

  const finish = useCallback(() => {
    setPlaying(false)
    setMachine((m) => runToEnd(m))
  }, [])

  const restart = useCallback(() => {
    setPlaying(false)
    setMachine(createMachine(program))
  }, [program])

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => {
      const current = machineRef.current
      if (current.halted) {
        setPlaying(false)
        return
      }
      setMachine((m) => microStep(m))
    }, STEP_MS)
    return () => clearInterval(timer)
  }, [playing])

  const done = machine.halted
  const total = machine.program.code.length * 5

  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10'>
      <div>
        <div className='glass-panel overflow-hidden rounded-2xl p-2'>
          <div className='aspect-[1720/800] w-full'>
            <CpuMachineFigure machine={machine} progress={0.5} />
          </div>
        </div>
        <p className='mt-3 rounded-xl border border-signal/15 bg-ink-900/50 px-4 py-3 text-[13px] leading-relaxed text-muted'>
          <span className='text-signal'>当前：</span>
          {machine.halted ? '程序已经结束（HALT）。' : machine.note}
        </p>
      </div>

      <aside className='flex flex-col gap-5'>
        <div className='glass-panel rounded-2xl p-5'>
          <div className='text-xs uppercase tracking-[0.22em] text-muted'>选一段程序</div>
          <div className='mt-3 flex flex-wrap gap-2'>
            {PROGRAMS.map((p) => (
              <Chip key={p.id} active={p.id === program.id} onClick={() => pick(p)}>
                {p.name}
              </Chip>
            ))}
          </div>
          <p className='mt-3 text-[13px] leading-relaxed text-paper/90'>{program.caption}</p>
        </div>

        <div className='glass-panel flex flex-col gap-4 rounded-2xl p-5'>
          <div className='flex flex-wrap items-center gap-2'>
            <button
              type='button'
              onClick={() => {
                if (done) restart()
                setPlaying((p) => !p)
              }}
              className='inline-flex items-center gap-2 rounded-full bg-signal px-4 py-1.5 text-[13px] font-semibold text-ink-950 transition-transform duration-200 hover:scale-[1.03] active:scale-95'
            >
              <span aria-hidden='true'>{playing ? '❚❚' : '▶'}</span>
              {playing ? '暂停' : done ? '重新播放' : '连续执行'}
            </button>
            <Ghost onClick={next}>执行下一步</Ghost>
            <Ghost onClick={whole}>执行一整条</Ghost>
            <Ghost onClick={finish}>跑到结束</Ghost>
            <Ghost onClick={restart}>复位</Ghost>
          </div>
          <p className='font-mono text-xs tabular-nums text-faint'>
            已执行 {machine.instructionCount} / {total} 条指令 · {machine.microCount} 个微阶段 · 内存共 {machine.program.code.length} 条指令
          </p>
          {machine.program.id === 'inference' ? (
            <p className='border-t border-signal/10 pt-3 text-[12px] leading-relaxed text-faint'>
              权重放大了 100 倍以保持整数运算；真实推理用浮点数，原理相同。
            </p>
          ) : null}
        </div>

        <div className='glass-panel rounded-2xl p-5'>
          <div className='text-xs uppercase tracking-[0.22em] text-muted'>内存里的程序</div>
          <pre className='mt-3 max-h-64 overflow-auto whitespace-pre text-[11px] leading-relaxed text-muted'>{program.source}</pre>
        </div>
      </aside>
    </div>
  )
}
