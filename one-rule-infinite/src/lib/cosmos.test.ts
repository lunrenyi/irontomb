import { describe, expect, it } from 'vitest'
import { buildCosmosWeb, cosmosStats } from './cosmos'

const web = buildCosmosWeb()

describe('宇宙网（程序生成示意）', () => {
  it('同样的种子给出完全一样的结构', () => {
    const a = buildCosmosWeb()
    const b = buildCosmosWeb()
    expect(a.filaments.length).toBe(b.filaments.length)
    expect(a.filaments[0].points[3]).toEqual(b.filaments[0].points[3])
    expect(a.knots[2].members[1]).toEqual(b.knots[2].members[1])
  })

  it('换种子会得到不同的宇宙', () => {
    const a = buildCosmosWeb({ seed: 1 })
    const b = buildCosmosWeb({ seed: 2 })
    expect(a.knots[0].x).not.toBeCloseTo(b.knots[0].x, 3)
  })

  it('丝线真的把团块连起来（端点与团块重合）', () => {
    for (const f of web.filaments) {
      const first = f.points[0]
      const last = f.points[f.points.length - 1]
      expect(Math.hypot(first.x - web.knots[f.a].x, first.y - web.knots[f.a].y)).toBeLessThan(1)
      expect(Math.hypot(last.x - web.knots[f.b].x, last.y - web.knots[f.b].y)).toBeLessThan(1)
    }
  })

  it('中间密、两头疏：丝线中段的点比端点粗', () => {
    for (const f of web.filaments) {
      const mid = f.points[Math.floor(f.points.length / 2)].r
      expect(mid).toBeGreaterThan(f.points[0].r)
      expect(mid).toBeGreaterThan(f.points[f.points.length - 1].r)
    }
  })

  it('不是均匀铺满的：留得出大片空洞', () => {
    const stats = cosmosStats(web)
    expect(stats.voidShare).toBeGreaterThan(0.05)
    expect(stats.voidShare).toBeLessThan(0.9)
  })

  it('规模足够画出一张网', () => {
    const stats = cosmosStats(web)
    expect(stats.knots).toBeGreaterThanOrEqual(12)
    expect(stats.filaments).toBeGreaterThanOrEqual(12)
    expect(stats.points).toBeGreaterThan(500)
  })
})
