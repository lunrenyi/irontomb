export interface Chapter {
  id: string
  nav: string
  kicker: string
  title: string
}

/**
 * 三幕：
 *   引子   —— 一棵程序长出来的树，用来引出「分叉」这件事；
 *   主体   —— 知识如何积累、依赖、复用与汇合（真正的内容与高潮）；
 *   展望   —— 宇宙网，以及我们用知识去认识它。
 */
export const CHAPTERS: Chapter[] = [
  { id: 'film', nav: '影片', kicker: '一部短片', title: '从枝条到星海' },
  { id: 'growth', nav: '引子 · 枝条', kicker: '第一幕', title: '复杂，从一个简单的起点开始' },
  { id: 'knowledge', nav: '知识网络', kicker: '第二幕', title: '不只是分叉，更是连接' },
  { id: 'cosmos', nav: '群星', kicker: '第三幕', title: '我们用知识连接已知' },
]

export const ACTS = [
  {
    id: 'growth',
    name: '第一幕 · 枝条',
    share: '约 11%',
    note: '一个生长点，如何长出一棵局部的树。',
  },
  {
    id: 'knowledge',
    name: '第二幕 · 知识',
    share: '约 65%',
    note: '积累、依赖、复用与汇合，最后汇聚成一个成果。',
  },
  {
    id: 'cosmos',
    name: '第三幕 · 星海',
    share: '约 26%',
    note: '把视野拉到宇宙尺度，再回到我们如何认识它。',
  },
]

export const SITE_TITLE = '从枝条到星海'
export const SITE_SUBTITLE = '知识如何从分叉走向连接，最终让我们看见更大的世界。'
export const HERO_QUESTION = '一个简单的起点，如何通过分化、积累与连接，形成复杂而庞大的世界？'

export const CLOSING = [
  '一棵树只能说明：复杂可以从一个简单的起点长出来。',
  '但知识的长大不靠分叉就够了 —— 它更依赖不同方向之间的连接、复用与汇合，以至于一项成果往往站在许多个前置之上，而它自己又会成为新的起点。',
  '宇宙的大尺度结构也有自己的网络，但那是引力与物质演化塑造的，不是分叉规则。',
  '我们用知识连接已知，再用已知探索未知。',
]
