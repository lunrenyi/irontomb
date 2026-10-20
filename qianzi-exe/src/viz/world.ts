/**
 * 世界坐标：六个模块住在同一张地图上。
 *
 * 这是「不要把网站做成一组互相独立的卡片」的技术前提 ——
 * 所有模块都画在**同一个世界坐标系**里，各占一块 1920 x 1080 的地方，
 * 镜头在它们之间连续飞行，而不是一页一页地切。
 *
 *   (0,-1680)  COSMOS ─── NATURE ─── CIVILIZATION
 *        │                                   │
 *   (0,0) DECODE ─── DAILY ──────────── HUMAN
 */

import { MODULES, type ModuleId } from '../content/modules'
import { PHRASES, type Phrase } from '../content/qianzi'
import { mulberry32 } from '../lib/rng'

export const REGION_W = 1920
export const REGION_H = 1080
/** 区域之间的空隙 */
export const GUTTER_X = 600
export const GUTTER_Y = 600
/** 相邻区域的中心间距 */
export const STRIDE_X = REGION_W + GUTTER_X
export const STRIDE_Y = REGION_H + GUTTER_Y

export type RegionId = 'decode' | 'whole' | ModuleId

export interface Region {
  id: RegionId
  /** 区域左上角在世界坐标里的位置 */
  x: number
  y: number
  w: number
  h: number
}

export const REGIONS: Record<RegionId, Region> = {
  whole: { id: 'whole', x: 0, y: -STRIDE_Y, w: STRIDE_X * 2 + REGION_W, h: STRIDE_Y + REGION_H },
  decode: { id: 'decode', x: 0, y: 0, w: REGION_W, h: REGION_H },
  cosmos: { id: 'cosmos', x: 0, y: -STRIDE_Y, w: REGION_W, h: REGION_H },
  nature: { id: 'nature', x: STRIDE_X, y: -STRIDE_Y, w: REGION_W, h: REGION_H },
  civilization: { id: 'civilization', x: STRIDE_X * 2, y: -STRIDE_Y, w: REGION_W, h: REGION_H },
  daily: { id: 'daily', x: STRIDE_X, y: 0, w: REGION_W, h: REGION_H },
  human: { id: 'human', x: STRIDE_X * 2, y: 0, w: REGION_W, h: REGION_H },
}

/** 整张地图的包围盒 */
export const WORLD_BOUNDS = {
  minX: 0,
  minY: -STRIDE_Y,
  maxX: STRIDE_X * 2 + REGION_W,
  maxY: REGION_H,
}

export const WORLD_W = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX
export const WORLD_H = WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY

/** 一个区域在画面正中时的镜头 */
export function regionCamera(id: RegionId) {
  const r = REGIONS[id]
  return { x: r.x + r.w / 2, y: r.y + r.h / 2, scale: 1 }
}

/** 整张地图装进画面的镜头 */
export function worldCamera(viewportW = 1920, viewportH = 1080, padding = 1.06) {
  const scale = Math.min(viewportW / (WORLD_W * padding), viewportH / (WORLD_H * padding))
  return {
    x: (WORLD_BOUNDS.minX + WORLD_BOUNDS.maxX) / 2,
    y: (WORLD_BOUNDS.minY + WORLD_BOUNDS.maxY) / 2,
    scale,
  }
}

/* ------------------------------------------------------- 知识网络的布局 */

export interface Node {
  i: number
  phrase: Phrase
  /** 世界坐标 */
  x: number
  y: number
  /** 区域内坐标（0..1） */
  u: number
  v: number
  /** 节点半径（世界单位） */
  r: number
}

/**
 * 250 个句子的位置。
 *
 * 布局规则：
 *   - 同一模块的句子聚成一个簇，簇的形状是**向日葵螺线**（黄金角排布）——
 *     这样 105 句的「HUMAN」也不会挤成一团，边缘自然稀疏；
 *   - 簇的半径随句子数增长，所以「CIVILIZATION」那一簇最大；
 *   - 全部由种子随机数决定，任何一次渲染结果完全一样。
 *
 * 节点坐标是**常量**：不随帧变化，所以网络不会呼吸。
 */
export const NODES: Node[] = (() => {
  const out: Node[] = []
  for (const m of MODULES) {
    const list = PHRASES.filter((p) => p.module === m.id)
    const region = REGIONS[m.id]
    const rand = mulberry32(0x5eed + m.id.length * 7919)
    const golden = Math.PI * (3 - Math.sqrt(5))
    // 簇的半径：句子越多铺得越开，但不超过区域的边界
    // 横向摊得更开一些（椭圆），因为区域本身是 16:9 的横条
    const base = 520
    const spread = Math.sqrt(list.length / 105) * base
    const rx = Math.min(region.w * 0.46, spread * 1.75)
    const ry = Math.min(region.h * 0.45, spread * 0.95)
    list.forEach((phrase, k) => {
      const t = list.length === 1 ? 0 : (k + 0.5) / list.length
      const r = Math.sqrt(t)
      const a = k * golden + rand() * 0.22
      const u = 0.5 + (Math.cos(a) * r * rx) / region.w
      const v = 0.5 + (Math.sin(a) * r * ry) / region.h
      out.push({
        i: phrase.i,
        phrase,
        x: region.x + u * region.w,
        y: region.y + v * region.h,
        u,
        v,
        r: 8 + (phrase.tags.length > 1 ? 3 : 0),
      })
    })
  }
  // 按原句序排回去，方便按下标找
  out.sort((a, b) => a.i - b.i)
  return out
})()

export const NODE_BY_INDEX: Node[] = NODES

/** 节点之间的距离（世界单位），用来判断一条边是不是「近邻」 */
export function nodeDistance(a: Node, b: Node): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}


/* ------------------------------------------------- 序章：一千个字的方阵 */

/**
 * 1000 个字在「解码区」里排成的方阵（40 列 x 25 行）。
 *
 * 这是首页开场和影片序章共用的那张表：
 * 字按原书顺序一个一个被点亮 —— 扫描 → 解析 → 标注 → 连成网络。
 * 位置是常量，所以同一帧永远是同一张表。
 */
export const GRID_COLS = 50
export const GRID_ROWS = 20
const GRID_CELL_X = 36
const GRID_CELL_Y = 38
/** 字的大小：略小于格子，看起来才是「一格一字」 */
export const GRID_FONT = 32

export const GRID_POSITIONS: Array<[number, number]> = (() => {
  const r = REGIONS.decode
  const w = GRID_COLS * GRID_CELL_X
  const ox = r.x + (r.w - w) / 2
  // 往下挪一点：上缘要给影片的关键文字那条带子让出位置
  const oy = r.y + 200
  const out: Array<[number, number]> = []
  for (let i = 0; i < GRID_COLS * GRID_ROWS; i += 1) {
    const col = i % GRID_COLS
    const row = Math.floor(i / GRID_COLS)
    out.push([ox + col * GRID_CELL_X + GRID_CELL_X / 2, oy + row * GRID_CELL_Y + GRID_CELL_Y / 2])
  }
  return out
})()

/** 网格单元的边长（给字号用） */
export const GRID_CELL_SIZE = GRID_CELL_X
export const GRID_CELL_H = GRID_CELL_Y
/** 字阵的中心 */
export const GRID_CENTER: [number, number] = [
  REGIONS.decode.x + REGIONS.decode.w / 2,
  REGIONS.decode.y + REGIONS.decode.h / 2,
]
