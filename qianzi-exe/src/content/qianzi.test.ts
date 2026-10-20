import { describe, expect, it } from 'vitest'
import {
  ALL_CHARS,
  COLLISIONS,
  DUPLICATED_CHARS,
  FULL_TEXT,
  FULL_TEXT_TRADITIONAL,
  PHRASES,
  TOTAL_CHARS,
  TOTAL_PHRASES,
  TRADITIONAL_DUPLICATES,
  TRADITIONAL_UNIQUE_COUNT,
  phrasesOfModule,
  relatedPhrases,
} from './qianzi'
import { MODULES } from './modules'

describe('《千字文》文本', () => {
  it('是 250 句四言，共 1000 字', () => {
    expect(TOTAL_PHRASES).toBe(250)
    expect(TOTAL_CHARS).toBe(1000)
    expect(ALL_CHARS).toHaveLength(1000)
  })

  it('每一句都是四个字', () => {
    for (const p of PHRASES) {
      expect([...p.text], p.text).toHaveLength(4)
    }
  })

  it('首尾与通行本一致', () => {
    expect(PHRASES[0].text).toBe('天地玄黄')
    expect(PHRASES[1].text).toBe('宇宙洪荒')
    expect(PHRASES[TOTAL_PHRASES - 2].text).toBe('谓语助者')
    expect(PHRASES[TOTAL_PHRASES - 1].text).toBe('焉哉乎也')
  })

  it('全文没有空格与标点', () => {
    expect(FULL_TEXT).toBe(PHRASES.map((p) => p.text).join(''))
    expect(/[^\u4e00-\u9fff]/.test(FULL_TEXT)).toBe(false)
  })
})

describe('「一千字不重」这件事', () => {
  it('繁体原文确实一字不重', () => {
    expect(TRADITIONAL_DUPLICATES).toEqual([])
    expect(TRADITIONAL_UNIQUE_COUNT).toBe(1000)
    expect([...FULL_TEXT_TRADITIONAL]).toHaveLength(1000)
  })

  it('简体下只有碰撞表里列出的那几个字会重复', () => {
    // 每一处碰撞：同一个简体字，原文是两个不同的字
    const expected = COLLISIONS.map((c) => c.simplified).sort()
    const actual = DUPLICATED_CHARS.slice().sort()
    expect(actual).toEqual(expected)
  })

  it('每一处碰撞都能在繁体对照里找到不同原字', () => {
    for (const c of COLLISIONS) {
      const trads = c.at.map((a) => a.traditional)
      expect(new Set(trads).size).toBe(trads.length)
    }
  })
})

describe('模块分配', () => {
  it('每句都归入一个已知的模块', () => {
    const ids = new Set(MODULES.map((m) => m.id))
    for (const p of PHRASES) expect(ids.has(p.module)).toBe(true)
  })

  it('五组模块加起来正好是 250 句，没有遗漏也没有重复', () => {
    const sum = MODULES.reduce((n, m) => n + phrasesOfModule(m.id).length, 0)
    expect(sum).toBe(TOTAL_PHRASES)
  })

  it('每个模块都有内容', () => {
    for (const m of MODULES) expect(phrasesOfModule(m.id).length).toBeGreaterThan(0)
  })

  it('每句都有释义与至少一个语义标签', () => {
    for (const p of PHRASES) {
      expect(p.gloss.length).toBeGreaterThan(3)
      expect(p.tags.length).toBeGreaterThan(0)
    }
  })
})

describe('知识网络', () => {
  it('相关句能按共享标签找出来', () => {
    const related = relatedPhrases(0, 5)
    expect(related.length).toBeGreaterThan(0)
    for (const r of related) expect(r.i).not.toBe(0)
  })
})
