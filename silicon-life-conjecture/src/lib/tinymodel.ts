/**
 * 一个真的在跑的小神经网络。
 *
 * 第五幕要说明「输入怎么变成向量、怎么一层层加权、最后怎么变成下一个词的概率」，
 * 所以这里不是播放一段文字动画，而是一个真的前向传播 + 真的反向传播训练出来的模型。
 * 它非常小：词表 9 个、隐藏层 12 个神经元，学的是一个循环句子。
 * 重要的是结构与真实大模型一样 —— 嵌入、加权、非线性、softmax、按概率采样。
 */

import { mulberry32 } from './rng'

export const VOCAB: readonly string[] = ['<bos>', '硅', '基', '生', '命', '可', '能', '存', '在']
export const BOS = 0
/** 语料是一个循环：模型要学会的是「下一个词是什么」这件事本身 */
export const CORPUS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8]

export const EMBED_DIM = 4
export const HIDDEN = 12

/** 词表里每个词的向量表示：固定不变，像一张查表 */
export const EMBEDDINGS: readonly number[][] = VOCAB.map((_, index) => {
  const rand = mulberry32(9176 + index * 613)
  return Array.from({ length: EMBED_DIM }, () => rand() * 2 - 1)
})

export interface ModelWeights {
  W1: number[][]
  b1: number[]
  W2: number[][]
  b2: number[]
}

export function initWeights(seed: number): ModelWeights {
  const rand = mulberry32(seed)
  const scale = 0.5
  return {
    W1: Array.from({ length: HIDDEN }, () => Array.from({ length: EMBED_DIM }, () => (rand() * 2 - 1) * scale)),
    b1: Array.from({ length: HIDDEN }, () => (rand() * 2 - 1) * 0.1),
    W2: Array.from({ length: VOCAB.length }, () => Array.from({ length: HIDDEN }, () => (rand() * 2 - 1) * scale)),
    b2: Array.from({ length: VOCAB.length }, () => 0),
  }
}

export interface Forward {
  hidden: number[]
  logits: number[]
  probs: number[]
}

/** 一次前向传播：嵌入 -> 加权求和 -> tanh -> 加权求和 -> softmax */
export function forward(weights: ModelWeights, tokenIndex: number): Forward {
  const x = EMBEDDINGS[tokenIndex]
  const hidden = weights.W1.map((row, i) => {
    let sum = weights.b1[i]
    for (let j = 0; j < EMBED_DIM; j += 1) sum += row[j] * x[j]
    return Math.tanh(sum)
  })
  const logits = weights.W2.map((row, i) => {
    let sum = weights.b2[i]
    for (let j = 0; j < HIDDEN; j += 1) sum += row[j] * hidden[j]
    return sum
  })
  const max = Math.max(...logits)
  const exps = logits.map((l) => Math.exp(l - max))
  const total = exps.reduce((a, b) => a + b, 0)
  return { hidden, logits, probs: exps.map((e) => e / total) }
}

/** 全批量梯度下降：损失用交叉熵。固定种子，所以训练结果永远一样。 */
export function train(seed: number, steps: number, learningRate = 0.35): ModelWeights {
  const w = initWeights(seed)
  const grads: ModelWeights = {
    W1: w.W1.map((row) => row.map(() => 0)),
    b1: w.b1.map(() => 0),
    W2: w.W2.map((row) => row.map(() => 0)),
    b2: w.b2.map(() => 0),
  }
  for (let step = 0; step < steps; step += 1) {
    for (const row of grads.W1) row.fill(0)
    for (const row of grads.W2) row.fill(0)
    grads.b1.fill(0)
    grads.b2.fill(0)
    for (let c = 0; c < CORPUS.length; c += 1) {
      const input = CORPUS[c]
      const target = CORPUS[(c + 1) % CORPUS.length]
      const x = EMBEDDINGS[input]
      const { hidden, probs } = forward(w, input)
      for (let k = 0; k < VOCAB.length; k += 1) {
        const d = probs[k] - (k === target ? 1 : 0)
        grads.b2[k] += d
        for (let j = 0; j < HIDDEN; j += 1) grads.W2[k][j] += d * hidden[j]
      }
      for (let i = 0; i < HIDDEN; i += 1) {
        let dh = 0
        for (let k = 0; k < VOCAB.length; k += 1) dh += (probs[k] - (k === target ? 1 : 0)) * w.W2[k][i]
        dh *= 1 - hidden[i] * hidden[i]
        grads.b1[i] += dh
        for (let j = 0; j < EMBED_DIM; j += 1) grads.W1[i][j] += dh * x[j]
      }
    }
    const n = CORPUS.length
    for (let i = 0; i < HIDDEN; i += 1) {
      w.b1[i] -= (learningRate * grads.b1[i]) / n
      for (let j = 0; j < EMBED_DIM; j += 1) w.W1[i][j] -= (learningRate * grads.W1[i][j]) / n
    }
    for (let k = 0; k < VOCAB.length; k += 1) {
      w.b2[k] -= (learningRate * grads.b2[k]) / n
      for (let j = 0; j < HIDDEN; j += 1) w.W2[k][j] -= (learningRate * grads.W2[k][j]) / n
    }
  }
  return w
}

export const lossOf = (w: ModelWeights): number => {
  let total = 0
  for (let c = 0; c < CORPUS.length; c += 1) {
    const { probs } = forward(w, CORPUS[c])
    total -= Math.log(Math.max(1e-9, probs[CORPUS[(c + 1) % CORPUS.length]]))
  }
  return total / CORPUS.length
}

/** 全站共用这一份权重：训练发生在模块加载时，固定种子，只跑几百步 */
export const MODEL = train(20260118, 600)

export const argmaxIndex = (values: readonly number[]): number => values.reduce((best, v, i) => (v > values[best] ? i : best), 0)

export interface GenerateStep {
  /** 上一个输入的词 */
  input: number
  /** 模型这一步算出的完整分布 */
  probs: number[]
  hidden: number[]
  /** 这一步真的输出的是哪个词 */
  output: number
}

/**
 * 逐词生成。
 * greedy = true 时总是取概率最大的词；否则按概率采样（仍然用固定种子，所以可复现）。
 */
export function generate(
  prompt: number,
 count: number,
 seed = 7,
 temperature = 1,
 greedy = true,
): { text: string; steps: GenerateStep[] } {
  const rand = mulberry32(seed)
  let current = prompt
  const steps: GenerateStep[] = []
  let text = ''
  for (let i = 0; i < count; i += 1) {
    const { probs, hidden } = forward(MODEL, current)
    const scaled = probs.map((p) => Math.pow(p, 1 / Math.max(0.05, temperature)))
    const total = scaled.reduce((a, b) => a + b, 0)
    const norm = scaled.map((p) => p / total)
    let output = argmaxIndex(norm)
    if (!greedy) {
      let r = rand()
      output = norm.length - 1
      for (let k = 0; k < norm.length; k += 1) {
        r -= norm[k]
        if (r <= 0) {
          output = k
          break
        }
      }
    }
    steps.push({ input: current, probs: norm, hidden, output })
 if (output !== BOS) text += VOCAB[output]
    current = output
  }
  return { text, steps }
}
