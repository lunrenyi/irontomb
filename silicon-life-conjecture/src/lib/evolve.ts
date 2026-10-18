/**
 * 一个真的在跑的进化模拟。
 *
 * 第六幕要讨论「自我维持 + 复制 + 可遗传变异 + 环境选择」这套说法，
 * 与其放一段示意动画，不如在这里真的跑一遍带选择、交叉、变异的遗传算法：
 * 每一代的个体、平均适应度与多样性都是算出来的。
 *
 * 环境会中途改变一次，好让观众看到「适应」必须跟着环境走。
 */

import { mulberry32 } from './rng'

export const GENOME_LENGTH = 16

export interface Individual {
  genes: number[]
  fitness: number
}

export interface Generation {
  generation: number
  /** 这一代环境偏好的目标串 */
  target: number[]
  best: number
  mean: number
  /** 基因互不相同的比例，粗略反映多样性有没有塌掉 */
  diversity: number
  population: Individual[]
}

export interface EvolveConfig {
  size: number
  generations: number
  mutationRate: number
  elite: number
  seed: number
  /** 第几代开始环境改变 */
  shiftAt: number
}

export const DEFAULT_EVOLVE: EvolveConfig = {
  size: 36,
  generations: 40,
  mutationRate: 0.08,
  elite: 4,
  seed: 20260214,
  shiftAt: 22,
}

/** 环境：给每个基因位一个偏好。两次偏好不同，这就是「环境变了」。 */
function targetAt(generation: number, shiftAt: number, rand: () => number): number[] {
  const rand2 = mulberry32(generation < shiftAt ? 4242 : 9797)
  void rand
  return Array.from({ length: GENOME_LENGTH }, () => (rand2() < 0.5 ? 0 : 1))
}

const fitnessOf = (genes: readonly number[], target: readonly number[]): number => {
  let hits = 0
  for (let i = 0; i < genes.length; i += 1) if (genes[i] === target[i]) hits += 1
  return hits / genes.length
}

export function evolvePopulation(config: EvolveConfig = DEFAULT_EVOLVE): Generation[] {
  const rand = mulberry32(config.seed)
  let target = targetAt(0, config.shiftAt, rand)
  let population: Individual[] = Array.from({ length: config.size }, () => {
    const genes = Array.from({ length: GENOME_LENGTH }, () => (rand() < 0.5 ? 0 : 1))
    return { genes, fitness: fitnessOf(genes, target) }
  })

  const out: Generation[] = []
  for (let g = 0; g <= config.generations; g += 1) {
    if (g === config.shiftAt) target = targetAt(g, config.shiftAt, rand)
    for (const item of population) item.fitness = fitnessOf(item.genes, target)
    const sorted = [...population].sort((a, b) => b.fitness - a.fitness)
    const distinct = new Set(sorted.map((s) => s.genes.join(''))).size
    out.push({
      generation: g,
      target: target.slice(),
      best: sorted[0].fitness,
      mean: sorted.reduce((sum, s) => sum + s.fitness, 0) / sorted.length,
      diversity: distinct / sorted.length,
      population: sorted.map((s) => ({ genes: s.genes.slice(), fitness: s.fitness })),
    })
    if (g === config.generations) break

    const next: Individual[] = sorted.slice(0, config.elite).map((s) => ({ genes: s.genes.slice(), fitness: s.fitness }))
    while (next.length < config.size) {
      const pickOne = (): number[] => {
        // 轮盘赌选择：适应度越高越容易被抽到
        let r = rand()
        for (const item of sorted) {
          r -= item.fitness / sorted.length + 0.0005
          if (r <= 0) return item.genes.slice()
        }
        return sorted[0].genes.slice()
      }
      const a = pickOne()
      const b = pickOne()
      const child = a.map((gene, i) => (rand() < 0.5 ? gene : b[i]))
      for (let i = 0; i < child.length; i += 1) {
        if (rand() < config.mutationRate) child[i] = rand() < 0.5 ? 0 : 1
      }
      next.push({ genes: child, fitness: fitnessOf(child, target) })
    }
    population = next
  }
  return out
}
