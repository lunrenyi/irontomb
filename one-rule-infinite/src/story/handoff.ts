/**
 * 第一幕与第二幕交接时共用的镜头。
 *
 * 这里以前写死 { x: 0, y: -60, scale: 1.45 }，本意是「把树的根部压在画面下方，
 * 好让第二幕的起点节点接上来」。实际效果是：
 *   - 那棵树的世界包围盒是 x ∈ [-150, 165]、y ∈ [-367, 15]，中心在 (7.5, -176)；
 *   - 用 (0, -60) 当镜头中心，树就整体偏到一边，而且根部落到 y ≈ 1005，
 *     正好穿过底部那行字幕。
 *
 * 现在改成按**整棵树的包围盒**取景，树就真的居中在画面里。
 *
 * 两幕都调用同一个函数，所以第一幕的结束帧与第二幕的开始帧必然完全一致 ——
 * 交接处不会出现跳镜头。
 */

import { boundsForAll, fitBounds, type Camera } from '../viz/camera'
import { planGrowth, type GrowthPlan } from '../lib/growth'
import { DEFAULT_PARAMS, grow, plantGrammar } from '../lib/lsystem'
import { STAGE_H, STAGE_W } from './timeline'

const VIEWPORT = { width: STAGE_W, height: STAGE_H }

/** 第一幕那棵树的代数 */
export const INTRO_GENERATIONS = 3

/** 第一幕的生成参数：固定写死，任何一次渲染都长出同一棵树 */
export function introParams() {
  return { ...DEFAULT_PARAMS, angle: 27, length: 62, originX: 0, originY: 0 }
}

export function introGrammar() {
  return plantGrammar(3)
}

export function introPlant() {
  return grow(introGrammar(), introParams(), INTRO_GENERATIONS)
}

export function introPlan(): GrowthPlan {
  return planGrowth(introPlant().segments, INTRO_GENERATIONS, { perSegment: 0.56, breath: 0.16 })
}

/**
 * 收尾镜头：整棵树完整装进画面，并且**居中**。
 *
 * padding 1.8 让树只占画面中间大约六成高度，
 * 上面给标题留出位置，下面给字幕留出位置，两边都不会撞。
 */
export function handoffCamera(plan: GrowthPlan): Camera {
  return fitBounds(boundsForAll(plan), VIEWPORT, { padding: 1.8, maxScale: 2.4 })
}
