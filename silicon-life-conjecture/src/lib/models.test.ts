import { describe, expect, it } from 'vitest'
import { AND, GATE_TRUTH, NOT, OR, XOR, bitsOf, fromBits, readLevel, rippleAdd4, RAIL, type Bit } from './circuit'
import { DEFAULT_LIF, runFeedforward, runLif, stepLif } from './neuron'
import { CARBON, SILICON } from './atoms'
import { evolvePopulation, DEFAULT_EVOLVE } from './evolve'
import { BOS, MODEL, VOCAB, argmaxIndex, forward, generate, initWeights, lossOf, train } from './tinymodel'
import { bitsToText, imageToBits, proceduralImage, quantize, sampleWave, thresholdBits } from './signal'
import { mulberry32 } from './rng'
import { clamp01, easeIn, easeInOut, easeOut, range, wobble } from './easing'

describe('逻辑门与真值表', () => {
  it('四种门的真值表完全正确', () => {
    expect(NOT(0 as Bit)).toBe(1)
    expect(NOT(1 as Bit)).toBe(0)
    expect(AND(1 as Bit, 1 as Bit)).toBe(1)
    expect(AND(1 as Bit, 0 as Bit)).toBe(0)
    expect(OR(0 as Bit, 1 as Bit)).toBe(1)
    expect(XOR(1 as Bit, 1 as Bit)).toBe(0)
    expect(GATE_TRUTH).toHaveLength(4)
  })

  it('四位行波进位加法器等于真正的加法', () => {
    for (let a = 0; a < 16; a += 1) {
      for (let b = 0; b < 16; b += 1) {
        const r = rippleAdd4(a, b)
        expect(r.sum, a + ' + ' + b).toBe((a + b) % 16)
        expect(r.cout, a + ' + ' + b).toBe(a + b >= 16 ? 1 : 0)
      }
    }
  })

  it('进位确实是一级一级传上去的', () => {
    // 1111 + 0001：最低位产生进位，然后一级一级往上传播，最终溢出
    const r = rippleAdd4(15, 1)
    expect(r.stages[0].cout).toBe(1)
    expect(r.stages[1].cout).toBe(1)
    expect(r.stages[2].cout).toBe(1)
    expect(r.cout).toBe(1)
    expect(r.sum).toBe(0)
    // 而 1001 + 0110 每一位都不产生进位
    expect(rippleAdd4(9, 6).stages.every((s) => s.cout === 0)).toBe(true)
  })

  it('位与数互转可逆', () => {
    expect(fromBits(bitsOf(13))).toBe(13)
    expect(bitsOf(13)).toEqual([1, 0, 1, 1])
  })
})

describe('0 与 1 是对连续电压的约定', () => {
  it('中间存在一段「未定义」区，而不是只有两个取值', () => {
    expect(readLevel(0).state).toBe('strong-0')
    expect(readLevel(RAIL.vdd).state).toBe('strong-1')
    expect(readLevel(RAIL.vdd / 2).state).toBe('undefined')
    expect(readLevel(RAIL.vdd / 2).bit).toBeNull()
  })

  it('越靠近两端越稳定', () => {
    expect(readLevel(0.05).bit).toBe(0)
    expect(readLevel(RAIL.vdd - 0.05).bit).toBe(1)
  })
})

describe('神经元模型', () => {
  it('静息时电位回到静息值附近，不发放', () => {
    const r = runLif(() => 0, 60, 0.25)
    expect(r.spikeTimes).toHaveLength(0)
    expect(Math.abs(r.trace[r.trace.length - 1].v - DEFAULT_LIF.vRest)).toBeLessThan(1)
  })

  it('输入足够强时会发放，并且发放后进入不应期', () => {
    const r = runLif(() => 1, 60, 0.25)
    expect(r.spikeTimes.length).toBeGreaterThan(2)
    const spacing = r.spikeTimes[1] - r.spikeTimes[0]
    // 不应期至少要吃掉几毫秒，所以两次发放不可能紧挨着
    expect(spacing).toBeGreaterThanOrEqual(DEFAULT_LIF.tRefractory)
  })

  it('电位永远不会超过阈值而不发放（发放时立刻重置）', () => {
    const r = runLif(() => 1, 40, 0.1)
    for (const s of r.trace) {
      if (!s.spiked) expect(s.v).toBeLessThanOrEqual(DEFAULT_LIF.vThreshold)
    }
  })

  it('单步函数不会给出负的电位（超极化被限制）', () => {
    let v = DEFAULT_LIF.vRest
    for (let i = 0; i < 40; i += 1) v = stepLif(v, 0, 0, DEFAULT_LIF, 0.25).v
    expect(v).toBeGreaterThan(DEFAULT_LIF.vRest - 6)
  })

  it('信号可以沿着突触一路传下去', () => {
    const layers = [[{ id: 'a', x: 0, y: 0 }], [{ id: 'b', x: 1, y: 0 }], [{ id: 'c', x: 2, y: 0 }]]
    const net = runFeedforward(layers, [{ from: 'a', to: 'b', weight: 2 }, { from: 'b', to: 'c', weight: 2 }], 120, 0.5)
    expect(net.spikeTimes.a.length).toBeGreaterThan(0)
    // 下游发放的时刻一定晚于上游：信号要有传播时间
    expect(net.spikeTimes.b[0]).toBeGreaterThan(net.spikeTimes.a[0])
    expect(net.spikeTimes.c[0]).toBeGreaterThan(net.spikeTimes.b[0])
  })
})

describe('碳与硅的数据是真实值', () => {
  it('原子序数、电子排布、成键数目', () => {
    expect(CARBON.atomicNumber).toBe(6)
    expect(SILICON.atomicNumber).toBe(14)
    expect(CARBON.shells).toEqual([2, 4])
    expect(SILICON.shells).toEqual([2, 8, 4])
    expect(CARBON.valence).toBe(4)
    expect(SILICON.valence).toBe(4)
  })

  it('硅的键更长也更弱', () => {
    expect(SILICON.homonuclearBondPm).toBeGreaterThan(CARBON.homonuclearBondPm)
    expect(SILICON.homonuclearBondKJ).toBeLessThan(CARBON.homonuclearBondKJ)
  })
})

describe('进化模拟真的在收敛', () => {
  const run = evolvePopulation(DEFAULT_EVOLVE)

  it('每一代的统计量都在合理范围内', () => {
    for (const g of run) {
      expect(g.mean).toBeGreaterThanOrEqual(0)
      expect(g.mean).toBeLessThanOrEqual(1)
      expect(g.best).toBeGreaterThanOrEqual(g.mean - 1e-9)
      expect(g.population).toHaveLength(DEFAULT_EVOLVE.size)
    }
  })

  it('适应度总体上升：末尾明显高于开头', () => {
    expect(run[run.length - 1].mean).toBeGreaterThan(run[0].mean + 0.2)
  })

  it('环境改变那一刻适应度掉下去，之后重新爬回来', () => {
    const before = run[DEFAULT_EVOLVE.shiftAt - 1].mean
    const after = run[DEFAULT_EVOLVE.shiftAt].mean
    const recovered = run[run.length - 1].mean
    expect(after).toBeLessThan(before - 0.1)
    expect(recovered).toBeGreaterThan(after + 0.1)
  })

  it('同样的种子给出同样的进化过程', () => {
    const again = evolvePopulation(DEFAULT_EVOLVE)
    expect(again[10].population.map((p) => p.genes.join(''))).toEqual(run[10].population.map((p) => p.genes.join('')))
  })
})

describe('那个小语言模型是真的训出来的', () => {
  it('训练确实降低了交叉熵损失', () => {
    expect(lossOf(MODEL)).toBeLessThan(lossOf(initWeights(20260118)))
    expect(lossOf(MODEL)).toBeLessThan(0.2)
  })

  it('训练是确定性的', () => {
    expect(lossOf(train(20260118, 60))).toBeCloseTo(lossOf(train(20260118, 60)), 10)
  })

  it('softmax 输出一组概率', () => {
    const { probs } = forward(MODEL, BOS)
    expect(probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
    expect(probs.every((p) => p >= 0)).toBe(true)
  })

  it('贪心解码生成出语料里的那个循环', () => {
    expect(generate(BOS, 8).text).toBe('硅基生命可能存在')
  })

  it('按概率取样也是确定性的', () => {
    expect(generate(BOS, 6, 3, 1.4, false).text).toBe(generate(BOS, 6, 3, 1.4, false).text)
  })

  it('隐藏层真的有激活值', () => {
    const { hidden } = forward(MODEL, 1)
    expect(hidden).toHaveLength(12)
    expect(hidden.every((h) => Math.abs(h) <= 1)).toBe(true)
    expect(hidden.some((h) => Math.abs(h) > 0.01)).toBe(true)
  })

  it('argmax 找的是最大值的下标', () => {
    expect(argmaxIndex([0.1, 0.7, 0.2])).toBe(1)
    expect(VOCAB.length).toBe(9)
  })
})

describe('采样与量化', () => {
  it('采样数就是采样点数', () => {
    const s = sampleWave(1, 32, 'sine')
    expect(s).toHaveLength(32)
    expect(s[0].t).toBe(0)
  })

  it('量化把连续值落到有限档位上', () => {
    const s = sampleWave(1, 16, 'sine')
    const q = quantize(s, 4)
    expect(q.every((v) => v >= 0 && v <= 3)).toBe(true)
    expect(new Set(q).size).toBeLessThanOrEqual(4)
    expect(() => quantize(s, 1)).toThrow()
  })

  it('门限决定每个采样变成 0 还是 1', () => {
    const s = sampleWave(1, 32, 'sine')
    expect(thresholdBits(s, 0)).toHaveLength(32)
    const at0 = thresholdBits(s, 0)
    const high = thresholdBits(s, 0.8)
    expect(at0).toContain(1)
    expect(at0).toContain(0)
    // 门限抬高，判成 1 的只会变少不会变多
    expect(high.filter((b) => b === 1).length).toBeLessThanOrEqual(at0.filter((b) => b === 1).length)
  })

  it('比特按 8 位一组能翻回字符', () => {
    const bits = [...'SILICON'].flatMap((c) => {
      const v = c.charCodeAt(0)
      return Array.from({ length: 8 }, (_, i) => (v >> (7 - i)) & 1)
    })
    expect(bitsToText(bits)).toBe('SILICON')
  })

  it('程序生成的图像可以变成像素比特', () => {
    const img = proceduralImage(16)
    expect(img).toHaveLength(16)
    const px = imageToBits(img, 0.5)
    expect(px).toHaveLength(256)
    expect(px.every((p) => p.bit === 0 || p.bit === 1)).toBe(true)
    expect(px.some((p) => p.bit === 1)).toBe(true)
  })
})

describe('基础工具', () => {
  it('确定性随机数可复现', () => {
    const a = Array.from({ length: 5 }, mulberry32(42))
    const b = Array.from({ length: 5 }, mulberry32(42))
    expect(a).toEqual(b)
  })

  it('缓动函数边界正确', () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(2)).toBe(1)
    expect(range(10, 0, 20)).toBeCloseTo(0.5)
    expect(easeOut(0)).toBe(0)
    expect(easeOut(1)).toBe(1)
    expect(easeIn(0)).toBe(0)
    expect(easeInOut(0)).toBe(0)
    expect(easeInOut(1)).toBe(1)
    expect(Math.abs(wobble(25, 100))).toBeLessThanOrEqual(1)
  })
})
