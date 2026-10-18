import { describe, expect, it } from 'vitest'
import {
  PHASE_ORDER,
  PROGRAMS,
  AsmError,
  argmax,
  assemble,
  controlFor,
  createMachine,
  inferenceScores,
  microStep,
  programById,
  runToEnd,
  softmax,
  stepInstruction,
} from './vm'

describe('汇编器', () => {
  it('两遍汇编能正确回填标号', () => {
    const code = assemble('start:\n  LOADI R0, #1\n  JMP start\n')
    expect(code).toHaveLength(2)
    expect(code[1].op).toBe('JMP')
    expect(code[1].target).toBe(0)
    expect(code[1].targetLabel).toBe('start')
  })

  it('逗号会被正确忽略', () => {
    const code = assemble('LOADI R0, #7')
    expect(code[0].text).toBe('LOADI R0, #7')
    expect(code[0].imm).toBe(7)
  })

  it('找不到标号会报错，而不是默默跳到错误的地方', () => {
    expect(() => assemble('  JMP nowhere\n')).toThrow(AsmError)
  })

  it('不认识的操作码会报错', () => {
    expect(() => assemble('  FLY R0, #1\n')).toThrow(AsmError)
  })
})

describe('每条指令真的走满五个微阶段', () => {
  it('取指、译码、执行、写回、输出，一个都不能少', () => {
    const program = programById('sum')
    let m = createMachine(program)
    const seen: string[] = []
    while (!m.halted && seen.length < 40) {
      m = microStep(m)
      if (seen[seen.length - 1] !== m.lastPhase) seen.push(m.lastPhase)
    }
    expect(seen.slice(0, 5)).toEqual([...PHASE_ORDER])
  })

  it('取指阶段会点亮 PC 与内存之间的控制线', () => {
    let m = createMachine(programById('sum'))
    m = microStep(m)
    expect(m.lastPhase).toBe('fetch')
    expect(controlFor('fetch', m.ir)).toMatchObject({ PCout: true, MARin: true, MemRead: true, IRin: true })
    expect(m.ir?.text).toContain('LOADI')
  })

  it('每个微阶段都会返回新状态，不修改旧状态', () => {
    const before = createMachine(programById('sum'))
    const snapshot = JSON.stringify({ pc: before.pc, regs: before.regs, mem: before.memory.slice(0, 40) })
    microStep(before)
    expect(JSON.stringify({ pc: before.pc, regs: before.regs, mem: before.memory.slice(0, 40) })).toBe(snapshot)
  })

  it('单步指令会停在下一次取指之前', () => {
    let m = createMachine(programById('sum'))
    m = stepInstruction(m)
    expect(m.phase).toBe('fetch')
    expect(m.instructionCount).toBe(1)
  })
})

describe('每段程序都真的跑出正确结果', () => {
  it('两数相加：12 + 30 = 42，并且真的写回了内存', () => {
    const program = programById('sum')
    const m = runToEnd(createMachine(program))
    expect(m.halted).toBe(true)
    expect(m.output).toEqual([42])
    expect(m.memory[32]).toBe(42)
    expect(m.regs.R0).toBe(42)
  })

  it('循环程序：1 到 10 求和得 55', () => {
    const m = runToEnd(createMachine(programById('loop')))
    expect(m.output).toEqual([55])
    expect(m.instructionCount).toBeGreaterThan(20)
  })

  it('图像程序：四个像素二值化成 1010（十进制 10），并原地改写了内存', () => {
    const program = programById('image')
    const m = runToEnd(createMachine(program))
    expect(m.output).toEqual([10])
    expect([m.memory[40], m.memory[41], m.memory[42], m.memory[43]]).toEqual([1, 0, 1, 0])
  })

  it('文字程序：真的算出了 SILICON 的 ASCII 码', () => {
    const m = runToEnd(createMachine(programById('text')))
    expect(m.output.map((c) => String.fromCharCode(c)).join('')).toBe('SILICON')
  })

  it('推理程序：输出的类别等于三份分数的最大值那一类', () => {
    const program = programById('inference')
    const m = runToEnd(createMachine(program))
    const scores = inferenceScores(program)
    expect(scores).toEqual([250, 80, 190])
    expect(m.output).toEqual([argmax(scores)])
    expect(m.output).toEqual([0])
  })

  it('softmax 是一组概率', () => {
    const p = softmax([250, 80, 190])
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
    expect(p.every((x) => x > 0)).toBe(true)
    expect(argmax(p)).toBe(0)
  })
})

describe('同一套硬件跑不同程序', () => {
  it('五段程序都用同一批指令（ISA），只是指令与数据不同', () => {
    const ops = new Set(PROGRAMS.flatMap((p) => p.code.map((c) => c.op)))
    // 如果每一段程序都自带新指令，就说明「同一硬件」这件事是假的
    expect(ops.size).toBeLessThanOrEqual(PROGRAMS.length * 3)
    expect(PROGRAMS.length).toBeGreaterThanOrEqual(5)
    // 所有程序都能停下来（没有死循环）
    for (const p of PROGRAMS) {
      const m = runToEnd(createMachine(p))
      expect(m.halted, p.id).toBe(true)
    }
  })

  it('程序装入时内存里的数据与源码里写的一致', () => {
    const program = programById('image')
    const m = createMachine(program)
    expect(m.memory[40]).toBe(200)
    expect(m.memory[43]).toBe(60)
  })
})
