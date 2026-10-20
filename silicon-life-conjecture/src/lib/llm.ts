/**
 * 第五幕的教学模型：大语言模型是怎么生成一句话的。
 *
 * ── 诚实的声明（画面上也会标出来）──────────────────────────────
 * 这一章没有接入任何真实的大模型 API。
 * 分词、向量、注意力权重、候选概率，全部是预先定义的确定性教学数据：
 * 每一个数字都能追溯到本文件里的某一张表，因此网页与 MP4 每次渲染完全一致。
 *
 * 唯一的例外是训练那条损失曲线 —— 它是真的：
 * 页面里那个小网络真的跑了一次梯度下降，曲线上的每个点都是算出来的损失值。
 *
 * 所以：这些画面是原理示意图，不是某个真实模型的内部权重可视化。
 */

import { mulberry32 } from './rng'
import { LOSS_CURVE } from './tinymodel'

/* ================================================================== 分词 */

/**
 * 一张很小的词表。真实 tokenizer 的词表有几万到十几万个词条，
 * 这里的目的是让「文本被切成一串编号」这件事看得见。
 */
export const TOKENIZER_VOCAB: readonly string[] = [
  '为什么', '天空', '蓝色', '空气', '分子', '散射', '更多', '看起来',
  '苹果', '芯片', '篮子', '天气', '很好', '今天', '发布', '放进',
  '所以', '蓝光', '的', '会', '把', '得', '了', '是', '新', '我', '里', '更',
  '，', '。', '？',
]

export interface Token {
  /** 切出来的片段 */
  text: string
  /** 在词表里的下标；不在词表里就是 -1 */
  id: number
  /** 词表里没有、只能退回单字的那种片段 */
  unknown: boolean
}

/**
 * 最长匹配切分：能从左边凑出多长的已知词，就切多长的。
 * 这是一个真的贪心分词算法（真实模型用的是 BPE 之类的办法，词表大得多）。
 * 凑不出已知词时退回单字 —— 和真实 tokenizer 的未知词回退是同一个思路。
 */
export function tokenize(text: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < text.length) {
    let matched = ''
    for (let len = Math.min(4, text.length - i); len >= 1; len -= 1) {
      const slice = text.slice(i, i + len)
      if (TOKENIZER_VOCAB.includes(slice)) {
        matched = slice
        break
      }
    }
    if (matched) {
      out.push({ text: matched, id: TOKENIZER_VOCAB.indexOf(matched), unknown: false })
      i += matched.length
    } else {
      out.push({ text: text[i], id: -1, unknown: true })
      i += 1
    }
  }
  return out
}

/* ================================================================ 向量 */

/** 画在屏幕上的向量维度。真实模型是几百到几千维，这里只画 8 个数才读得清。 */
export const DIM = 8

function seedOf(text: string): number {
  let h = 2166136261
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619)
  return h >>> 0
}

export function embeddingOf(text: string): number[] {
  const rand = mulberry32(seedOf(text))
  return Array.from({ length: DIM }, () => rand() * 2 - 1)
}

/**
 * 把 8 维向量投到 2 维，只为了能画成一个点。
 * 这是为了好看做的投影，不是模型真实的向量空间 —— 画面上必须这么标注。
 */
export function project2D(v: readonly number[]): { x: number; y: number } {
  let x = 0
  let y = 0
  v.forEach((value, i) => {
    x += value * Math.cos((i * Math.PI * 2) / v.length)
    y += value * Math.sin((i * Math.PI * 2) / v.length)
  })
  return { x, y }
}

/* ============================================================== 注意力 */

/**
 * 一句话里，哪些词彼此相关。
 *
 * 这是人工写死的关联表 —— 它是这一章里「示意」的部分。
 * 但下一行的权重不是写死的：每一行都要跑一遍真的 softmax 才得到画面上的数。
 */
export const RELATED: Readonly<Record<string, readonly string[]>> = {
  苹果: ['篮子', '芯片', '发布'],
  篮子: ['苹果', '放进'],
  放进: ['篮子'],
  芯片: ['苹果', '发布', '新'],
  发布: ['苹果', '芯片'],
  新: ['芯片'],
  我: [],
  把: ['放进'],
  里: ['篮子'],
}

/** 关联 / 自身 / 无关 三档打分。分数是手定的，softmax 是真算的。 */
const SCORE_RELATED = 1
const SCORE_SELF = 0.8
const SCORE_OTHER = 0.06

function softmax(values: readonly number[]): number[] {
  const max = Math.max(...values)
  const exps = values.map((v) => Math.exp((v - max) * 2.2))
  const total = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / total)
}

/**
 * 一句话的注意力矩阵：rows[i][j] = 第 i 个词看第 j 个词的权重。
 * 每一行都是一次真的 softmax，所以每一行加起来正好是 1。
 */
export function attentionFor(tokens: readonly string[]): number[][] {
  return tokens.map((query) => {
    const related = RELATED[query] ?? []
    return softmax(tokens.map((key) => (related.includes(key) ? SCORE_RELATED : key === query ? SCORE_SELF : SCORE_OTHER)))
  })
}

/** 两句对比用的例句 —— 同一个「苹果」，落在两种完全不同的上下文里。 */
export const CONTEXT_A = '我把苹果放进篮子里。'
export const CONTEXT_B = '苹果发布了新芯片。'

/* ======================================================== 逐 Token 生成 */

export interface Candidate {
  text: string
  p: number
}

export interface Step {
  /** 生成这一步之前，已经确定的上下文 */
  context: string[]
  /** 候选与概率 —— 教学示例数据，不是真实模型的输出 */
  candidates: readonly Candidate[]
  /** 按演示策略真正选中的那个 */
  picked: string
}

const P = (text: string, p: number): Candidate => ({ text, p })

/**
 * 「为什么天空是蓝色的？」这条提问对应的完整回答，
 * 以及每一步的候选分布 —— 每一步的三个概率加起来都正好是 1。
 *
 * 注意：这些概率是教学用的示意数据，不是任何真实模型的输出。
 */
const RAW: readonly (readonly Candidate[])[] = [
  [P('空气', 0.62), P('因为', 0.25), P('天空', 0.13)],
  [P('分子', 0.58), P('粒子', 0.27), P('尘埃', 0.15)],
  [P('会', 0.55), P('把', 0.3), P('对', 0.15)],
  [P('把', 0.49), P('将', 0.31), P('让', 0.2)],
  [P('蓝光', 0.66), P('红光', 0.22), P('紫光', 0.12)],
  [P('散射', 0.61), P('反射', 0.27), P('折射', 0.12)],
  [P('得', 0.52), P('到', 0.29), P('过', 0.19)],
  [P('更多', 0.58), P('更强', 0.25), P('明显', 0.17)],
  [P('，', 0.44), P('。', 0.31), P('、', 0.25)],
  [P('所以', 0.63), P('因此', 0.24), P('不过', 0.13)],
  [P('天空', 0.69), P('蓝色', 0.2), P('大气', 0.11)],
  [P('看起来', 0.57), P('显得', 0.26), P('看上去', 0.17)],
  [P('是', 0.52), P('为', 0.29), P('呈', 0.19)],
  [P('蓝色', 0.74), P('蓝', 0.16), P('深蓝', 0.1)],
  [P('的', 0.88), P('了', 0.07), P('呢', 0.05)],
]

/** 每一步的上下文就是前面所有被选中的词 —— 这正是「自回归」的意思。 */
export const STEPS: readonly Step[] = RAW.map((candidates, i) => ({
  context: RAW.slice(0, i).map((row) => row[0].text),
  candidates,
  picked: candidates[0].text,
}))

export const QUESTION = '为什么天空是蓝色的？'
export const ANSWER_TOKENS: readonly string[] = STEPS.map((s) => s.picked)
export const ANSWER = ANSWER_TOKENS.join('')

/**
 * 温度会改写概率分布：温度越高越平均，越低越集中在最可能的那个上。
 * 这是真的在算，不是一张预制的表 —— 网页上的滑块调的就是它。
 */
export function adjustForTemperature(candidates: readonly Candidate[], temperature: number): Candidate[] {
  const t = Math.max(0.05, temperature)
  const scaled = candidates.map((c) => Math.pow(c.p, 1 / t))
  const total = scaled.reduce((a, b) => a + b, 0)
  return scaled.map((v, i) => ({ text: candidates[i].text, p: v / total }))
}

/** 解码策略：真正决定这一步输出哪一个词。 */
export function decode(candidates: readonly Candidate[], temperature: number, greedy: boolean): string {
  const dist = adjustForTemperature(candidates, temperature)
  if (greedy) return dist[0].text
  // 按概率轮流吃：p 大的一方拿到更多份额，份额吃完就换下一个 —— 结果确定，不用随机数
  let rest = 0.5
  for (const c of dist) {
    rest -= c.p
    if (rest <= 0) return c.text
  }
  return dist[dist.length - 1].text
}

/** 用一条路径把整句跑出来（网页上的自动播放用这个）。 */
export function runAll(temperature = 1, greedy = true): string[] {
  return STEPS.map((step) => decode(step.candidates, temperature, greedy))
}

/** 影片里逐步细看的步数；剩下的在后面快速流完，让句子完整。 */
export const DETAILED_STEPS = 6

/* ================================================================ 训练 */

/**
 * 训练场景用的损失曲线 —— 这一条是**真的**。
 *
 * 它来自页面里那个小网络：嵌入 + 加权 + tanh + softmax，交叉熵损失，
 * 全批量梯度下降 600 步。曲线上每一个点都是当时那组权重算出来的损失值，
 * 不是画上去的曲线。详见 tinymodel.ts。
 */
export const TRAIN_LOSS: readonly number[] = LOSS_CURVE
export const TRAIN_STEPS = TRAIN_LOSS.length
export const LOSS_FIRST = TRAIN_LOSS[0]
export const LOSS_LAST = TRAIN_LOSS[TRAIN_LOSS.length - 1]

/** 训练与推理的对照 —— 两者是相关但不同的过程，画面上用这两种颜色分开。 */
export const PHASES = [
  {
    id: 'train',
    tag: '训练',
    title: '调整模型参数',
    detail: '大量文本样本进入，预测下一个 Token，与真实答案比较，再按误差把参数改一点点',
  },
  {
    id: 'infer',
    tag: '推理',
    title: '使用已训练的模型',
    detail: '参数不再改变。拿新的输入进去，一个 Token 一个 Token 生成输出',
  },
] as const
