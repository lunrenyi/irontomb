/**
 * 第二幕的全局时间轴。
 *
 * 四个场景共享同一张图与同一条 0-1 的进度线：
 * 每个场景只负责把「本地帧」映射到进度线的一段，
 * 于是场景之间天然连续，不需要任何对齐代码。
 */

import { cameraAt, cameraTransform, lerpCamera, type Camera, type CameraKey } from '../viz/camera'
import type { KnowledgeGraph } from '../lib/knowledge'
import { STAGE_H, STAGE_W } from './timeline'
import { easeInOut } from '../lib/easing'

export const VIEWPORT = { width: STAGE_W, height: STAGE_H }

/** 各场景负责的进度区间 */
export const STAGE_PROGRESS = {
  domains: [0, 0.24] as [number, number],
  fields: [0.2, 0.64] as [number, number],
  network: [0.6, 0.86] as [number, number],
  phone: [0.82, 1] as [number, number],
}

interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * 把一个固定的世界包围盒装进画面高度的 fracH，并让它落在画面高度的 centerFrac 处。
 *
 * 为什么不用 fitBounds：fitBounds 会把盒子铺满整块画面。
 * 知识网络天生又宽又扁（每一层横着排十几个节点），一旦铺满，
 * 缩放就被高度卡死，标签小到看不清，底部也没有地方放字幕。
 *
 * 改成「占多高、落在哪」之后构图就固定了：
 * 内容统一占住画面上方，下面留出一条字幕带，两者永远不会打架。
 *
 * 取景只依赖固定包围盒，与当前帧无关，所以镜头绝对不会抖。
 */
function frameVertical(box: Box, fracH: number, centerFrac: number, pad = 1.06, maxScale = 6): Camera {
  const w = Math.max(1e-3, box.maxX - box.minX)
  const h = Math.max(1e-3, box.maxY - box.minY)
  const scale = Math.min(VIEWPORT.width / (w * pad), (VIEWPORT.height * fracH) / h, maxScale)
  const cx = (box.minX + box.maxX) / 2
  const cy = (box.minY + box.maxY) / 2
  const camY = cy + (VIEWPORT.height / 2 - VIEWPORT.height * centerFrac) / scale
  return { x: cx, y: camY, scale: Math.max(0.02, scale) }
}

function boundsOfLayers(graph: KnowledgeGraph, upTo: number): Box {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of graph.nodes) {
    if (n.layer > upTo) continue
    minX = Math.min(minX, n.x - 60)
    minY = Math.min(minY, n.y - 60)
    maxX = Math.max(maxX, n.x + 60)
    maxY = Math.max(maxY, n.y + 60)
  }
  return { minX, minY, maxX, maxY }
}

export interface KnowledgeFramings {
  root: Camera
  domains: Camera
  fields: Camera
  network: Camera
  /** 收拢到「智能手机」那一格的近景 */
  focus: Camera
  /** 整张网络 */
  whole: Camera
}

export function knowledgeFramings(graph: KnowledgeGraph): KnowledgeFramings {
  const phone = graph.byId.phone
  // 机身以手机节点为中心（见 Phone.tsx 的 PHONE_GLYPH_SCALE）。
  // 取景框必须把机身整个包进去，否则镜头一推近手机就被画面上沿切掉。
  const phoneBox: Box = { minX: -330, minY: phone.y - 310, maxX: 330, maxY: phone.y + 310 }
  return {
    root: frameVertical(boundsOfLayers(graph, 0), 0.34, 0.4, 1.2, 5.5),
    domains: frameVertical(boundsOfLayers(graph, 1), 0.48, 0.4, 1.08, 2.4),
    fields: frameVertical(boundsOfLayers(graph, 2), 0.56, 0.37, 1.12, 1.6),
    network: frameVertical(boundsOfLayers(graph, 3), 0.66, 0.37, 1.08, 1.35),
    focus: frameVertical(phoneBox, 0.6, 0.4, 1.06, 2),
    whole: frameVertical(graph.bounds, 0.77, 0.375, 1.06, 1.15),
  }
}

/**
 * 节点与标签的屏幕尺寸跟着镜头缩放：
 * 拉到全景时保持清爽，推近时自动变大，所以任何取景下都看得清。
 *
 * 上限不能太小：一旦截顶，节点的屏幕尺寸就被钉死在 4.6 * 上限 像素，
 * 再怎么推近也不会变大 —— 第二幕开场那个「孤零零的起点」会小到看不见。
 */
export function nodeScaleFor(camera: Camera, whole: Camera): number {
  const k = camera.scale / Math.max(0.02, whole.scale)
  return Math.min(6, Math.max(0.85, k))
}

/** 把若干关键帧包装成一段显式的镜头运动（起止点与缓动都写死，不追踪任何逐帧变化） */
export function segmentCamera(keys: CameraKey[], frame: number): Camera {
  return cameraAt(keys, frame, easeInOut)
}

export { cameraTransform, lerpCamera }
