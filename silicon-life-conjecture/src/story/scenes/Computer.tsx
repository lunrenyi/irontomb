import { ChapterTitle, ProgressDots, SceneKeys, STAGE_SVG, StageLabel } from '../FilmChrome'
import { CpuMachineFigure } from '../../viz/cpumachine'
import { RippleAdderFigure } from '../../viz/circuitfigure'
import { PHASE_INFO, PHASE_ORDER, PROGRAMS, createMachine, microStep, programById, runToEnd, type Machine } from '../../lib/vm'
import { easeOut } from '../../lib/easing'
import { AMBER, BLUE, FAINT, INK, MONO, MUTED, SIGNAL, alpha } from '../../viz/palette'
import { STAGE_H, STAGE_W, beatsOf } from '../timeline'
import { frac } from '../cues'
import { SCORE } from '../score'

const B = beatsOf('computer')
const SPEC = SCORE.computer

/** 把一段程序真的跑若干个微阶段，返回每一微阶段之后的机器状态 */
function traceOf(programId: string, microSteps: number): Machine[] {
  let m = createMachine(programById(programId))
  const out: Machine[] = [m]
  for (let i = 0; i < microSteps && !m.halted; i += 1) {
    m = microStep(m)
    out.push(m)
  }
  return out
}

const SUM_TRACE = traceOf('sum', 30)
const FINISHED: Record<string, Machine> = Object.fromEntries(PROGRAMS.map((p) => [p.id, runToEnd(createMachine(p))]))

/** 第 8-12 拍：同一台硬件，换四段完全不同的程序 */
const PROGRAM_BEATS = [
  { beat: 8, id: 'loop', label: '循环求和' },
  { beat: 9, id: 'image', label: '二值化' },
  { beat: 10, id: 'text', label: '编码计算' },
  { beat: 11, id: 'inference', label: '三分类打分' },
]

function outputText(machine: Machine): string {
  if (machine.output.length === 0) return '（还没有输出）'
  if (machine.program.outputAs === 'text') {
    return machine.output.map((c) => (c >= 32 && c < 127 ? String.fromCharCode(c) : '.')).join('')
  }
  if (machine.program.outputAs === 'bits') {
    return machine.output.map((n) => n.toString(2).padStart(4, '0')).join(' ')
  }
  if (machine.program.outputAs === 'class') return '类别 ' + machine.output.join(', ')
  return machine.output.join(', ')
}

/** 第 1-5 拍分别落在哪个微阶段上：一拍一步 */
const STEP_BEATS = [1, 2, 3, 4, 5]

function driveTrace(frame: number): { index: number; progress: number } {
  if (frame < B[1].start) return { index: 0, progress: frac(frame, B, 0, 0.1, 0.9) * 0.04 }
  if (frame < B[6].start) {
    let k = 0
    while (k < STEP_BEATS.length - 1 && frame >= B[STEP_BEATS[k] + 1].start) k += 1
    const beat = STEP_BEATS[k]
    return { index: beat, progress: frac(frame, B, beat, 0.1, 0.9) }
  }
  if (frame < B[7].start) {
    // 剩下的指令一次跑完：这里是快进的蒙太奇，不是讲解
    const raw = frac(frame, B, 6, 0.08, 0.94) * 25
    return { index: 6 + Math.floor(raw), progress: 1 - (raw - Math.floor(raw)) }
  }
  return { index: SUM_TRACE.length - 1, progress: 1 }
}

/**
 * 第四幕：程序究竟是怎么被执行的。
 * 每一拍只做一件事，标题就是那一步的名字；机器上的每一次变化都来自 vm.ts 的一次 microStep。
 */
export function ComputerScene({ frame }: { frame: number }) {
  const drive = driveTrace(frame)
  const machine = SUM_TRACE[Math.min(drive.index, SUM_TRACE.length - 1)]
  const beat = PROGRAM_BEATS.find((p) => frame >= B[p.beat].start && frame < B[p.beat + 1].start)
  const showAdder = frame >= B[13].start && frame < B[14].start
  const showMachine = !beat && !showAdder && frame < B[14].start
  return (
    <>
      <ChapterTitle frame={frame} beats={B} title='计算机怎样执行程序' sub='HOW A COMPUTER RUNS CODE' />
      <SceneKeys frame={frame} beats={B} specs={SPEC} />
      {beat ? <ProgramStage frame={frame} spec={beat} machine={FINISHED[beat.id]} /> : null}
      {showMachine ? <MachineStage frame={frame} machine={machine} progress={drive.progress} /> : null}
      {showAdder ? <AdderStage frame={frame} /> : null}
    </>
  )
}

/** 第 0-7 拍：整台机器。步骤条贴在图的上缘，机器占满主视觉 */
function MachineStage({ frame, machine, progress }: { frame: number; machine: Machine; progress: number }) {
  const inT = easeOut(frac(frame, B, 0, 0.05, 0.4))
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, opacity: inT, pointerEvents: 'none' }}>
        {/* 五个阶段：只标出当前这一步 */}
        <svg width={STAGE_W} height={260} style={STAGE_SVG} className='block'>
          {PHASE_ORDER.map((p, i) => {
            const done = frame >= B[7].start
            const on = done ? false : p === machine.lastPhase
            const x = 190 + i * 320
            return (
              <g key={p}>
                <circle cx={x} cy={110} r={on || done ? 30 : 22} fill={done ? alpha(SIGNAL, 0.2) : on ? alpha(AMBER, 0.22) : alpha(MUTED, 0.08)} stroke={done ? SIGNAL : on ? AMBER : alpha(MUTED, 0.3)} strokeWidth={2} />
                <text x={x} y={120} fill={done ? SIGNAL : on ? AMBER : MUTED} fontSize={on || done ? 32 : 26} fontFamily={MONO} textAnchor='middle'>
                  {i + 1}
                </text>
                {i < PHASE_ORDER.length - 1 ? (
                  <line x1={x + 40} y1={110} x2={x + 280} y2={110} stroke={alpha(MUTED, 0.22)} strokeWidth={2} />
                ) : null}
                <text x={x} y={180} fill={on ? INK : MUTED} fontSize={30} textAnchor='middle'>
                  {PHASE_INFO[p].name}
                </text>
              </g>
            )
          })}
        </svg>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 210, height: 730, opacity: easeOut(frac(frame, B, 0, 0, 0.3)) }}>
          <CpuMachineFigure machine={machine} progress={progress} />
        </div>
      </div>
    </>
  )
}

/** 第 8-12 拍：换程序。只换内存里的内容，硬件一个字没改 */
function ProgramStage({
  frame,
  spec,
  machine,
}: {
  frame: number
  spec: (typeof PROGRAM_BEATS)[number]
  machine: Machine
}) {
  const cursor = Math.min(13, Math.floor(frac(frame, B, spec.beat, 0.05, 0.95) * 14))
  const inT = easeOut(frac(frame, B, spec.beat, 0, 0.2))
  const code = machine.program.code.slice(0, 14)
  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={inT}>
      <rect x={130} y={150} width={1660} height={800} rx={24} fill={alpha('#04060d', 0.94)} stroke={alpha(BLUE, 0.26)} strokeWidth={1.4} />
      <StageLabel frame={frame} from={B[7].start + 6} to={B[12].start} x={190} y={140} color={AMBER}>
        换一段程序
      </StageLabel>
      <text x={190} y={228} fill={MUTED} fontSize={38}>
        {spec.label}
      </text>
      {code.map((instr, i) => (
        <g key={i}>
          <rect x={190} y={272 + i * 46} width={820} height={42} rx={8} fill={alpha(SIGNAL, 0.05)} stroke={alpha(SIGNAL, i === cursor ? 0.5 : 0.1)} strokeWidth={1} />
          <text x={212} y={302 + i * 46} fill={i === cursor ? AMBER : MUTED} fontSize={28} fontFamily={MONO}>
            {String(i).padStart(2, '0') + '  ' + instr.text}
          </text>
        </g>
      ))}
      <text x={1090} y={272} fill={MUTED} fontSize={32}>
        内存
      </text>
      {machine.program.windows.map((w, wi) => (
        <g key={w.label}>
          <text x={1090} y={330 + wi * 190} fill={FAINT} fontSize={28}>
            {w.label}
          </text>
          {Array.from({ length: w.length }, (_, i) => (
            <g key={i}>
              <rect x={1090} y={352 + wi * 190 + i * 42} width={80} height={38} rx={7} fill={alpha(BLUE, 0.16)} stroke={alpha(BLUE, 0.36)} strokeWidth={1} />
              <text x={1130} y={380 + wi * 190 + i * 42} fill={INK} fontSize={26} fontFamily={MONO} textAnchor='middle'>
                {machine.memory[w.start + i]}
              </text>
            </g>
          ))}
        </g>
      ))}
      <StageLabel frame={frame} from={B[spec.beat].start + 10} to={B[spec.beat + 1].start} x={1480} y={340} color={SIGNAL}>
        输出
      </StageLabel>
      <text x={1480} y={430} fill={SIGNAL} fontSize={44} fontFamily={MONO}>
        {outputText(machine)}
      </text>
    </svg>
  )
}

/** 第 13 拍：进位一级一级传上去 */
function AdderStage({ frame }: { frame: number }) {
  const stage = Math.min(4, Math.floor(frac(frame, B, 13, 0.15, 0.9) * 5))
  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={easeOut(frac(frame, B, 13, 0, 0.2))}>
      <g transform={'translate(960 560)'}>
        <RippleAdderFigure x={0} y={0} a={9} b={6} progress={stage} scale={2.2} />
      </g>
      <ProgressDots x={640} y={200} total={4} index={stage} color={AMBER} gap={44} r={8} />
      <StageLabel frame={frame} from={B[13].start + 8} to={B[14].start} x={640} y={132} color={AMBER}>
        进位
      </StageLabel>
    </svg>
  )
}
