import { describe, expect, it } from 'vitest'
import { buildRiver, buildVeins, leafOutline, riverParams, segmentPath } from './nature'
import { planGrowth, segmentsAt } from './growth'
import { fitBounds, cameraTransform, project, cameraAt, lerpCamera } from '../viz/camera'
import { boundsCenter, boundsSize, growBounds, EMPTY_BOUNDS, quadAt, polar } from './geometry'

describe('叶脉', () => {
  const leaf = buildVeins({ length: 300, width: 150, secondOrder: 7 })

  it('中肋在最中间，左右脉络成对出现', () => {
    const rib = leaf.segments[0]
    expect(rib.x1).toBe(0)
    expect(rib.y2).toBe(-300)
    const left = leaf.segments.filter((s) => s.depth === 1 && s.x2 < 0)
    const right = leaf.segments.filter((s) => s.depth === 1 && s.x2 > 0)
    expect(left.length).toBe(7)
    expect(right.length).toBe(7)
  })

  it('脉络起点都落在中肋上（不是凭空长出来的）', () => {
    const rib = leaf.segments[0]
    for (const s of leaf.segments.filter((x) => x.depth === 1)) {
      expect(s.x1).toBe(0)
      expect(s.y1).toBeGreaterThanOrEqual(rib.y2)
      expect(s.y1).toBeLessThanOrEqual(rib.y1 + 1)
    }
  })

  it('脉络在叶片轮廓之内', () => {
    const w = 150 / 2
    for (const s of leaf.segments) {
      expect(Math.abs(s.x2)).toBeLessThanOrEqual(w + 40)
      expect(s.y2).toBeLessThanOrEqual(0.001)
      expect(s.y2).toBeGreaterThanOrEqual(-300)
    }
  })

  it('同一个种子给出同一片叶子', () => {
    const a = buildVeins({ seed: 42 })
    const b = buildVeins({ seed: 42 })
    expect(a.segments[3].x2).toBe(b.segments[3].x2)
  })

  it('叶轮廓是一条闭合的矢量路径', () => {
    const d = leafOutline(100, 50)
    expect(d.startsWith('M')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    expect(d.split('C').length).toBe(3)
  })
})

describe('河流', () => {
  const river = buildRiver(4)

  it('越往下游越宽（与树相反）', () => {
    const byDepth = new Map<number, number[]>()
    for (const s of river.segments) {
      const list = byDepth.get(s.depth) ?? []
      list.push(s.width)
      byDepth.set(s.depth, list)
    }
    const widths = [...byDepth.keys()]
      .sort((a, b) => a - b)
      .map((d) => {
        const list = byDepth.get(d) as number[]
        return list.reduce((a, b) => a + b, 0) / list.length
      })
    for (let i = 1; i < widths.length; i += 1) {
      expect(widths[i]).toBeGreaterThan(widths[i - 1])
    }
  })

  it('没有向光性：只往下游走，不会往天上拐', () => {
    expect(riverParams().gravitropism).toBe(0)
    for (const s of river.segments) {
      expect(s.y2).toBeGreaterThanOrEqual(s.y1)
    }
  })

  it('同样是确定性的', () => {
    expect(buildRiver(3).segments[9].x2).toBe(buildRiver(3).segments[9].x2)
  })

  it('能被生长调度正常播放', () => {
    const plan = planGrowth(river.segments, 4)
    const drawn = segmentsAt(plan, plan.genEnd[4])
    expect(drawn.length).toBe(river.segments.length)
  })
})

describe('几何工具', () => {
  it('极坐标与包围盒', () => {
    expect(polar(0, 0, 10, 0).x).toBeCloseTo(10)
    expect(polar(0, 0, 10, 90).y).toBeCloseTo(10)
    let b = EMPTY_BOUNDS
    b = growBounds(b, -5, 5)
    b = growBounds(b, 15, -5)
    expect(boundsSize(b)).toEqual({ width: 20, height: 10 })
    expect(boundsCenter(b)).toEqual({ x: 5, y: 0 })
  })

  it('二次贝塞尔两端精确，中点在路径上', () => {
    const mid = quadAt(0.5, 0, 0, 10, 0, 20, 0)
    expect(mid.x).toBeCloseTo(10)
    expect(mid.y).toBeCloseTo(0)
    expect(quadAt(0, 3, 4, 10, 0, 20, 0).x).toBe(3)
  })

  it('segmentPath 把一段画成可用的路径', () => {
    const d = segmentPath({
      id: 0, depth: 0, birthGen: 0,
      x1: 0, y1: 0, x2: 10, y2: 10, cx: 5, cy: 6, width: 2, angle: 45, hasChildren: false, parent: -1,
    })
    expect(d).toBe('M 0 0 Q 5 6 10 10')
  })
})

describe('镜头', () => {
  const viewport = { width: 1000, height: 700 }

  it('把当前结构装进画面，并且不小于 1 倍', () => {
    const bounds = growBounds(growBounds(EMPTY_BOUNDS, -200, -400), 200, 0)
    const camera = fitBounds(bounds, viewport, { padding: 1.1 })
    const onScreen = project(camera, viewport, bounds.minX, bounds.maxY)
    const other = project(camera, viewport, bounds.maxX, bounds.minY)
    expect(onScreen.x).toBeGreaterThan(0)
    expect(other.x).toBeLessThan(viewport.width)
    expect(camera.scale).toBeGreaterThan(0)
  })

  it('刚开始长时不会糊成一团（maxScale 生效）', () => {
    const tiny = growBounds(growBounds(EMPTY_BOUNDS, -1, -2), 1, 0)
    const camera = fitBounds(tiny, viewport, { maxScale: 2.5 })
    expect(camera.scale).toBeLessThanOrEqual(2.5)
  })

  it('镜头变换把焦点放到画面正中', () => {
    const camera = { x: 12, y: -7, scale: 2 }
    const center = project(camera, viewport, 12, -7)
    expect(center.x).toBeCloseTo(viewport.width / 2)
    expect(center.y).toBeCloseTo(viewport.height / 2)
    expect(cameraTransform(camera, viewport)).toContain('scale(2)')
  })

  it('关键帧镜头只读时间，不读状态：同一时刻给出同一个镜头', () => {
    const keys = [
      { at: 0, camera: { x: 0, y: 0, scale: 3 } },
      { at: 100, camera: { x: 40, y: -120, scale: 0.8 } },
    ]
    expect(cameraAt(keys, 50)).toEqual(cameraAt(keys, 50))
    expect(cameraAt(keys, 50).scale).toBeGreaterThan(cameraAt(keys, 99).scale)
    expect(cameraAt(keys, -20)).toEqual(keys[0].camera)
    expect(cameraAt(keys, 999)).toEqual(keys[1].camera)
  })

  it('镜头插值尺度按对数走，中间恰好是几何平均值', () => {
    const mid = lerpCamera({ x: 0, y: 0, scale: 4 }, { x: 100, y: 0, scale: 1 }, 0.5)
    expect(mid.scale).toBeCloseTo(2)
    expect(mid.x).toBeCloseTo(50)
  })
})
