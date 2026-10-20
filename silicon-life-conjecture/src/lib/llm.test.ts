import { describe, expect, it } from 'vitest'
import {
  ANSWER,
  CONTEXT_A,
  CONTEXT_B,
  DETAILED_STEPS,
  LOSS_FIRST,
  LOSS_LAST,
  STEPS,
  TOKENIZER_VOCAB,
  TRAIN_STEPS,
  adjustForTemperature,
  attentionFor,
  decode,
  embeddingOf,
  runAll,
  tokenize,
} from './llm'

describe('分词', () => {
  it('用最长匹配切出教学例句', () => {
    expect(tokenize('今天的天气很好').map((t) => t.text)).toEqual(['今天', '的', '天气', '很好'])
    expect(tokenize('为什么天空是蓝色的？').map((t) => t.text)).toEqual(['为什么', '天空', '是', '蓝色', '的', '？'])
  })

  it('切分后拼回原文，一个字都不丢', () => {
    for (const s of [CONTEXT_A, CONTEXT_B, '为什么天空是蓝色的？', '量子纠缠与拓扑绝缘体']) {
      expect(tokenize(s).map((t) => t.text).join('')).toBe(s)
    }
  })

  it('词表里没有的片段会标成未知并退回单字', () => {
    const t = tokenize('量子')
    expect(t).toHaveLength(2)
    expect(t.every((x) => x.unknown && x.id === -1)).toBe(true)
  })

  it('切出来的每个片段要么在词表里，要么标记为未知', () => {
    for (const tok of tokenize('我把苹果放进篮子里。')) {
      expect(tok.unknown || TOKENIZER_VOCAB.includes(tok.text)).toBe(true)
    }
  })
})

describe('向量', () => {
  it('同一个词永远得到同一组数，不同的词不会撞在一起', () => {
    expect(embeddingOf('苹果')).toEqual(embeddingOf('苹果'))
    expect(embeddingOf('苹果')).not.toEqual(embeddingOf('篮子'))
    expect(embeddingOf('苹果')).toHaveLength(8)
  })
})

describe('注意力', () => {
  it('每一行加起来正好是 1，且全是非负数', () => {
    const a = attentionFor(tokenize(CONTEXT_A).map((t) => t.text))
    expect(a.length).toBe(7)
    for (const row of a) {
      expect(row.every((v) => v >= 0)).toBe(true)
      expect(row.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 6)
    }
  })

  it('同一个「苹果」，在两种上下文里看的是不同的词', () => {
    const a = tokenize(CONTEXT_A).map((t) => t.text)
    const b = tokenize(CONTEXT_B).map((t) => t.text)
    const rowA = attentionFor(a)[a.indexOf('苹果')]
    const rowB = attentionFor(b)[b.indexOf('苹果')]
    expect(rowA[a.indexOf('篮子')]).toBeGreaterThan(0.3)
    expect(rowB[b.indexOf('芯片')]).toBeGreaterThan(0.25)
    expect(a.indexOf('芯片')).toBe(-1)
  })
})

describe('逐步生成', () => {
  it('每一步的候选概率加起来是 1', () => {
    for (const s of STEPS) expect(s.candidates.reduce((a, c) => a + c.p, 0)).toBeCloseTo(1, 6)
  })

  it('每一步的上下文，正好是前面所有步骤选中的词', () => {
    STEPS.forEach((s, i) => {
      expect(s.context).toEqual(STEPS.slice(0, i).map((x) => x.picked))
    })
  })

  it('贪心解码跑完整句，能拼成一句通顺的中文', () => {
    expect(runAll(1, true).join('')).toBe(ANSWER)
    expect(ANSWER).toBe('空气分子会把蓝光散射得更多，所以天空看起来是蓝色的')
  })

  it('温度是真的在改写分布：越低越集中在第一个候选上', () => {
    const row = STEPS[0].candidates
    const cold = adjustForTemperature(row, 0.3)
    const hot = adjustForTemperature(row, 2)
    expect(cold[0].p).toBeGreaterThan(hot[0].p)
    expect(cold.reduce((a, c) => a + c.p, 0)).toBeCloseTo(1, 6)
    expect(hot.reduce((a, c) => a + c.p, 0)).toBeCloseTo(1, 6)
  })

  it('解码策略不同，选出来的词就可能不同', () => {
    const greedy = runAll(0.6, true)
    const sampled = runAll(2.4, false)
    expect(greedy.length).toBe(sampled.length)
    expect(sampled.join('')).not.toBe(greedy.join(''))
  })

  it('细看的步数没有超过总步数', () => {
    expect(DETAILED_STEPS).toBeLessThanOrEqual(STEPS.length)
  })
})

describe('训练', () => {
  it('损失曲线是真的降下来了', () => {
    expect(TRAIN_STEPS).toBeGreaterThan(100)
    expect(LOSS_LAST).toBeLessThan(LOSS_FIRST * 0.2)
    expect(LOSS_FIRST).toBeGreaterThan(1)
  })

  it('曲线上的点是有限的正数', () => {
    for (const v of [LOSS_FIRST, LOSS_LAST]) {
      expect(Number.isFinite(v)).toBe(true)
      expect(v).toBeGreaterThan(0)
    }
  })
})

describe('解码函数的边界', () => {
  it('永远返回候选里的某一个词', () => {
    const row = STEPS[3].candidates
    for (const t of [0.1, 1, 3]) {
      expect(row.some((c) => c.text === decode(row, t, true))).toBe(true)
      expect(row.some((c) => c.text === decode(row, t, false))).toBe(true)
    }
  })
})
