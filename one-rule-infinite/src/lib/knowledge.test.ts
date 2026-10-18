import { describe, expect, it } from 'vitest'
import { buildKnowledgeGraph, computeMaxLevel, PHONE_PARTS, APP_IDS, CROSS_EDGES } from './knowledge'

const graph = buildKnowledgeGraph()

describe('知识依赖网络', () => {
  it('是一张合法的有向无环图：没有环、前置都存在', () => {
    for (const node of graph.nodes) {
      for (const p of node.prereqs) expect(graph.byId[p]).toBeTruthy()
    }
    // 拓扑排序必须能排完，否则说明有环
    const indegree: Record<string, number> = {}
    const out: Record<string, string[]> = {}
    graph.nodes.forEach((n) => {
      indegree[n.id] = 0
      out[n.id] = []
    })
    graph.edges.forEach((e) => {
      indegree[e.to] += 1
      out[e.from].push(e.to)
    })
    const queue = graph.nodes.filter((n) => indegree[n.id] === 0).map((n) => n.id)
    let visited = 0
    while (queue.length > 0) {
      const id = queue.shift() as string
      visited += 1
      for (const next of out[id]) {
        indegree[next] -= 1
        if (indegree[next] === 0) queue.push(next)
      }
    }
    expect(visited).toBe(graph.nodes.length)
  })

  it('不是树：大量节点需要不止一个前置', () => {
    const merges = graph.nodes.filter((n) => n.prereqs.length >= 2)
    expect(merges.length).toBeGreaterThan(graph.nodes.length / 3)
    expect(graph.edges.filter((e) => e.kind === 'merge').length).toBeGreaterThan(0)
  })

  it('一个发现可以打开多个方向：起点与五个方向各有多条下游', () => {
    expect(graph.byId.root.prereqs.length).toBe(0)
    expect(graph.byId.root.unlocks.length).toBe(5)
    expect(graph.byId.chip.unlocks.length).toBeGreaterThanOrEqual(2)
  })

  it('智能手机汇聚全部五个模块，并且自己又开启新的应用', () => {
    const phone = graph.byId.phone
    for (const part of PHONE_PARTS) expect(phone.prereqs).toContain(part)
    expect(phone.prereqs.length).toBe(5)
    for (const app of APP_IDS) expect(phone.unlocks).toContain(app)
  })

  it('每个应用都是多项技术共同支撑的，而不是手机单独创造', () => {
    for (const app of APP_IDS) {
      expect(graph.byId[app].prereqs.length).toBeGreaterThanOrEqual(3)
      expect(graph.byId[app].prereqs).toContain('phone')
    }
  })

  it('跨方向的连线确实横跨了不同领域', () => {
    for (const [to, from] of CROSS_EDGES) {
      const a = graph.byId[from]
      const b = graph.byId[to]
      expect(a).toBeTruthy()
      expect(b).toBeTruthy()
      expect(b.prereqs).toContain(a.id)
    }
  })

  it('出场顺序里前置永远早于成果，边的出现晚于两端节点', () => {
    for (const edge of graph.edges) {
      expect(graph.byId[edge.from].appear).toBeLessThan(graph.byId[edge.to].appear + 1e-9)
      expect(edge.appear).toBeGreaterThanOrEqual(graph.byId[edge.to].appear)
    }
  })

  it('同组输入永远得到同一张图', () => {
    const a = buildKnowledgeGraph()
    const b = buildKnowledgeGraph()
    expect(a.nodes.map((n) => [n.id, n.x, n.y, n.appear])).toEqual(b.nodes.map((n) => [n.id, n.x, n.y, n.appear]))
  })

  it('版面是收拢再摊开的形状：起点与手机都在正中，方向分居两侧', () => {
    expect(graph.byId.root.x).toBe(0)
    expect(graph.byId.phone.x).toBe(0)
    const domains = graph.layers[1]
    expect(domains.length).toBe(5)
    expect(domains[0].x).toBeLessThan(0)
    expect(domains[domains.length - 1].x).toBeGreaterThan(0)
    expect(computeMaxLevel()).toBe(5)
  })

  it('节点不会互相叠在一起（标签要放得下）', () => {
    for (let i = 0; i < graph.nodes.length; i += 1) {
      for (let j = i + 1; j < graph.nodes.length; j += 1) {
        const a = graph.nodes[i]
        const b = graph.nodes[j]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        expect(d).toBeGreaterThan(60)
      }
    }
  })
})
