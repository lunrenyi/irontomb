export interface Chapter {
  id: string
  nav: string
  kicker: string
  title: string
}

/**
 * 三个阶段，一条主线：
 *   自然怎么长 -> 知识怎么连 -> 宇宙怎么成结构
 * 每一段都有自己的机制，但可以放在一起比较。
 */
export const CHAPTERS: Chapter[] = [
  { id: 'film', nav: '影片', kicker: '一部短片', title: '从一颗种子到一张网络' },
  { id: 'lab', nav: '生长实验室', kicker: '第一阶段 · 自然', title: '用一条规则自己长一遍' },
  { id: 'nature', nav: '三种分支', kicker: '第一阶段 · 自然', title: '像，但不一样' },
  { id: 'depth', nav: '自相似', kicker: '第一阶段 · 自然', title: '整体里有一个缩小版的自己' },
  { id: 'tech', nav: '知识网络', kicker: '第二阶段 · 知识', title: '不只是分叉，还会连接' },
  { id: 'cosmos', nav: '宇宙网', kicker: '第三阶段 · 宇宙', title: '更大的结构，更不同的成因' },
]

export const PHASES = [
  { id: 'nature', name: '自然如何生长', note: '分叉、递归、简单规则长出复杂形状。' },
  { id: 'tech', name: '知识与技术如何演进', note: '依赖、连接、汇合：一张图，不是一棵树。' },
  { id: 'cosmos', name: '宇宙如何形成宏观结构', note: '引力、演化、丝状结构与空洞。' },
]

export const HERO_QUESTION = '一个简单的起点，怎么长成一个远比它复杂的系统？'

export const SITE_TITLE = '一条规则，长出无限'
export const SITE_SUBTITLE = '从一根枝条开始，看简单的规则如何创造复杂的世界。'

export const CLOSING = [
  '一根枝条长到末端，就照着同一条规则再长一遍 —— 重复得足够多次，简单就会长成看起来很复杂的样子。',
  '但复杂不等于同一种成因：树靠分叉，知识靠连接与依赖，宇宙的大尺度结构靠引力与长期演化。',
  '把它们放在一起看的价值，是学会比较结构、关系与演化，而不是给它们编一个共同的公式。',
]
