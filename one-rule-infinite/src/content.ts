export interface Chapter {
  id: string
  nav: string
  kicker: string
  title: string
}

export const CHAPTERS: Chapter[] = [
  { id: 'film', nav: '影片', kicker: '一部短片', title: '一颗种子长成一棵树' },
  { id: 'lab', nav: '实验室', kicker: '互动实验室', title: '用一条规则自己长' },
  { id: 'nature', nav: '三种分支', kicker: '观察', title: '像，但不一样' },
  { id: 'depth', nav: '自相似', kicker: '从简单到复杂', title: '整体里有一个缩小的自己' },
]

export const HERO_QUESTION = '为什么一根枝条，可以长成一整棵树？'

export const SITE_TITLE = '一条规则，长出无限'
export const SITE_SUBTITLE = '从一根枝条开始，看简单的规则如何创造复杂的世界。'
