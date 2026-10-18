import { describe, expect, it } from 'vitest'
import { buildTechGraph, checkTechGraph, topoOrder, EXTRA_SPECS, TECH_GENERATIONS, DEFAULT_TECH_PARAMS } from './techgraph'
import { grow, PLANT_GRAMMAR } from './lsystem'

const graph = buildTechGraph()

describe('知识依赖网络', () => {
  it('是一张合法的有向无环图：没有环、前置都存在', () => {
    const check = checkTechGraph(graph)
    expect(check.problems).toEqual([])
    expect(check.ok).toBe(true)
    expect(topoOrder(graph).length).toBe(graph.nodes.length)
  })

  it('不是树：确实存在需要多个前置的汇合节点', () => {
    const merges = graph.nodes.filter((n) => n.prereqs.length >= 2)
    expect(merges.length).toBeGreaterThan(0)
    for (const node of merges) {
      expect(node.prereqs.length).toBeGreaterThanOrEqual(2)
      const levels = node.prereqs.map((p) => graph.byId[p].level)
      expect(Math.max(...levels)).toBeLessThan(node.level)
    }
  })

  it('有横跨枝条的连接，而不是一根干到底的枝条', () => {
    const cross = graph.edges.filter((e) => e.kind === 'merge')
    expect(cross.length).toBeGreaterThanOrEqual(3)
    // 汇合边的两端必须来自不同的根分支
    for (const edge of cross) {
      expect(edge.from).not.toBe(edge.to)
      expect(graph.byId[edge.from].origin === 'branch' || graph.byId[edge.to].origin === 'grown').toBe(true)
    }
  })

  it('一个发现可以打开多个方向（出度大于 1）', () => {
    const fan = graph.nodes.filter((n) => n.unlocks.length >= 2)
    expect(fan.length).toBeGreaterThan(0)
  })

  it('前置关系双向一致', () => {
    for (const node of graph.nodes) {
      for (const p of node.prereqs) expect(graph.byId[p].unlocks).toContain(node.id)
      for (const u of node.unlocks) expect(graph.byId[u].prereqs).toContain(node.id)
    }
  })

  it('节点位置直接坐在上一阶段那棵树的枝条上（转场是连续的）', () => {
    const plant = grow(PLANT_GRAMMAR, DEFAULT_TECH_PARAMS, TECH_GENERATIONS)
    const branchNodes = graph.nodes.filter((n) => n.origin === 'branch')
    expect(branchNodes.length).toBe(plant.segments.length + 1)
    const seg0 = plant.segments[0]
    const node0 = graph.nodes.find((n) => n.id === 'node-' + seg0.id)
    expect(node0?.x).toBeCloseTo(seg0.x2, 6)
    expect(node0?.y).toBeCloseTo(seg0.y2, 6)
    const root = graph.nodes[0]
    expect(root.x).toBe(0)
    expect(root.y).toBe(0)
  })

  it('后来长出来的节点只挂在已经存在的节点上，并且逐层抬高', () => {
    const grown = graph.nodes.filter((n) => n.origin === 'grown')
    expect(grown.length).toBe(EXTRA_SPECS.length)
    for (const node of grown) {
      for (const p of node.prereqs) {
        expect(graph.byId[p]).toBeTruthy()
        expect(graph.byId[p].level).toBeLessThan(node.level)
      }
    }
    expect(Math.max(...grown.map((n) => n.level))).toBeGreaterThan(Math.max(...graph.nodes.filter((n) => n.origin === 'branch').map((n) => n.level)))
  })

  it('同一组参数永远给出同一张图', () => {
    const a = buildTechGraph()
    const b = buildTechGraph()
    expect(a.nodes.map((n) => [n.id, n.x, n.y, n.level])).toEqual(b.nodes.map((n) => [n.id, n.x, n.y, n.level]))
  })

  it('节点不会互相叠在一起', () => {
    for (let i = 0; i < graph.nodes.length; i += 1) {
      for (let j = i + 1; j < graph.nodes.length; j += 1) {
        const d = Math.hypot(graph.nodes[i].x - graph.nodes[j].x, graph.nodes[i].y - graph.nodes[j].y)
        expect(d).toBeGreaterThan(18)
      }
    }
  })
})
