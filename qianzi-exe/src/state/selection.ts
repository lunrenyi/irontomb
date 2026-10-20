/**
 * 选中的句子：全站共享的一小块状态。
 *
 * 用 useSyncExternalStore 而不是 Context —— 只有几个组件需要它，
 * 没必要让整棵树重渲染。
 *
 * **状态必须是不变的**：每次改动都造一个新的对象。
 * 因为 useSyncExternalStore 用 Object.is 比较快照，
 * 如果永远返回同一个对象引用，React 会认为「没变」，于是根本不重渲染 ——
 * 表现就是「点了没反应」。
 */

import { useSyncExternalStore } from 'react'
import type { ModuleId } from '../content/modules'

export interface Selection {
  /** 当前选中的原文句子下标 */
  index: number | null
  /** 悬停中的句子下标 */
  hover: number | null
  /** 悬停中的场景元素（各场景自己定义） */
  hoverKey: string | null
}

const initial: Selection = { index: null, hover: null, hoverKey: null }

let state: Selection = initial
const listeners = new Set<() => void>()

function set(patch: Partial<Selection>) {
  const next = { ...state, ...patch }
  // 内容没变就不通知，省掉一次无谓的渲染
  if (next.index === state.index && next.hover === state.hover && next.hoverKey === state.hoverKey) return
  state = next
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => state

export const selectPhrase = (index: number | null) => set({ index })
export const hoverPhrase = (index: number | null) => set({ hover: index })
export const hoverKey = (key: string | null) => set({ hoverKey: key })

export const clearSelection = () => {
  if (state.index === null && state.hover === null && state.hoverKey === null) return
  state = initial
  listeners.forEach((l) => l())
}

export function useSelection(): Selection {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** 供影片以外的组件使用：模块 id */
export type { ModuleId }
