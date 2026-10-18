import { describe, expect, it } from 'vitest'
import { generationFramings, growthCamera, lerpCamera, type Camera } from '../viz/camera'
import { budAt, growingGenerationAt, grownSegments, growingSegments, planGrowth } from '../lib/growth'
import { DEFAULT_PARAMS, grow, PLANT_GRAMMAR } from '../lib/lsystem'

const VIEWPORT = { width: 1920, height: 1080 }
const GENERATIONS = 5
const plant = grow(PLANT_GRAMMAR, { ...DEFAULT_PARAMS, originX: 0, originY: 0 }, GENERATIONS)
const plan = planGrowth(plant.segments, GENERATIONS, { perSegment: 0.62, breath: 0.1 })
const framings = generationFramings(plan, VIEWPORT, { padding: 1.2, maxScale: 3.1 })

/** 逐帧走一遍影片里那一段生长，收集每一帧的镜头 */
function sampleCameras(steps = 2400) {
  const out: { t: number; camera: Camera; gen: number }[] = []
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    out.push({ t, camera: growthCamera(plan, framings, t), gen: growingGenerationAt(plan, t) })
  }
  return out
}

function stepBetween(a: Camera, b: Camera) {
  return Math.max(
    Math.abs(a.x - b.x),
    Math.abs(a.y - b.y),
    Math.abs(Math.log(a.scale) - Math.log(b.scale)),
  )
}

describe('镜头稳定性（抖动的根因所在）', () => {
  const samples = sampleCameras()

  it('取景只由参数决定：同一个时刻永远得到同一个镜头', () => {
    for (let i = 0; i < samples.length; i += 37) {
      const t = samples[i].t
      expect(growthCamera(plan, framings, t)).toEqual(growthCamera(plan, framings, t))
    }
  })

  it('生长过程中镜头只会平稳地拉远，绝不缩放抖动', () => {
    for (let i = 1; i < samples.length; i += 1) {
      // 缩放是单调不增的：这一条就足以排除「呼吸」式抖动
      expect(samples[i].camera.scale).toBeLessThanOrEqual(samples[i - 1].camera.scale + 1e-12)
    }
  })

  it('逐帧位移很小：没有远距离的瞬移', () => {
    let worst = 0
    for (let i = 1; i < samples.length; i += 1) {
      worst = Math.max(worst, stepBetween(samples[i - 1].camera, samples[i].camera))
    }
    // 生长整段装进 2400 步，镜头每步只能走不到 1.5 个世界单位（约屏幕上 5 像素）。
    expect(worst).toBeLessThan(1.5)
  })

  it('旧的「追进生长的梢头」才是抖动的真正来源', () => {
    // 不跟拔梢头就会在不同枝条之间跳：下面就是旧算法的跳跃量级
    let tipJumps = 0
    let prev: { x: number; y: number } | null = null
    for (let i = 0; i <= 2400; i += 1) {
      const bud = budAt(plan, i / 2400)
      if (!bud) continue
      if (prev && Math.hypot(bud.x - prev.x, bud.y - prev.y) > 20) tipJumps += 1
      prev = { x: bud.x, y: bud.y }
    }
    // 证明追拔枝头确实会大幅跳跃，而现在的镜头不会
    expect(tipJumps).toBeGreaterThan(0)
  })

  it('每一代的取景都装得下那一代的全部枝条', () => {
    for (let g = 0; g <= GENERATIONS; g += 1) {
      const camera = framings[g]
      for (const drawn of grownSegments(plan, g)) {
        const sx = VIEWPORT.width / 2 + (drawn.x - camera.x) * camera.scale
        const sy = VIEWPORT.height / 2 + (drawn.y - camera.y) * camera.scale
        expect(sx).toBeGreaterThan(-40)
        expect(sx).toBeLessThan(VIEWPORT.width + 40)
        expect(sy).toBeGreaterThan(-40)
        expect(sy).toBeLessThan(VIEWPORT.height + 40)
      }
    }
  })

  it('第一帧就已经是有效的取景，不会先跳一下再归位', () => {
    const first = samples[0].camera
    const second = samples[1].camera
    expect(Number.isFinite(first.x)).toBe(true)
    expect(Number.isFinite(first.scale)).toBe(true)
    expect(stepBetween(first, second)).toBeLessThan(0.2)
  })
})

describe('生长分层（已完成枝条不再每帧重算）', () => {
  it('growingGenerationAt 单调不减，且与 plan 一致', () => {
    let last = -1
    for (let i = 0; i <= 400; i += 1) {
      const g = growingGenerationAt(plan, i / 400)
      expect(g).toBeGreaterThanOrEqual(last)
      expect(g).toBeLessThanOrEqual(GENERATIONS)
      last = g
    }
  })

  it('长完的那一代：枝条几何与时间完全无关', () => {
    const early = grownSegments(plan, 2)
    const late = grownSegments(plan, 2)
    expect(early).toEqual(late)
    for (const drawn of early) {
      expect(drawn.t).toBe(1)
      expect(drawn.x).toBe(drawn.segment.x2)
      expect(drawn.y).toBe(drawn.segment.y2)
    }
  })

  it('长完的那一代：新枝条只会追加，旧枝条不会被移动', () => {
    const two = grownSegments(plan, 2)
    const three = grownSegments(plan, 3)
    expect(three.length).toBeGreaterThan(two.length)
    for (const drawn of two) {
      const found = three.find((d) => d.segment.id === drawn.segment.id)
      expect(found).toBeTruthy()
      expect(found?.x).toBe(drawn.x)
      expect(found?.y).toBe(drawn.y)
    }
  })

  it('正在长的只有当前这一代', () => {
    for (let i = 0; i <= 200; i += 1) {
      const t = i / 200
      const gen = growingGenerationAt(plan, t)
      for (const drawn of growingSegments(plan, t, gen)) expect(drawn.segment.birthGen).toBe(gen)
      for (const drawn of grownSegments(plan, gen - 1)) expect(drawn.segment.birthGen).toBeLessThan(gen)
    }
  })

  it('芽点始终在正在长的那一代上', () => {
    for (let i = 20; i <= 900; i += 7) {
      const t = i / 1000
      const bud = budAt(plan, t)
      if (!bud) continue
      expect(bud.segment.birthGen).toBe(growingGenerationAt(plan, t))
      expect(bud.t).toBeGreaterThan(0)
      expect(bud.t).toBeLessThanOrEqual(1)
    }
  })
})

describe('镜头插值', () => {
  it('缩放按对数走，中间值是几何平均', () => {
    const mid = lerpCamera({ x: 0, y: 0, scale: 9 }, { x: 100, y: 0, scale: 1 }, 0.5)
    expect(mid.scale).toBeCloseTo(3)
  })

  it('t 被夹在 0-1 之间，绝不会画出界', () => {
    const a = { x: 0, y: 0, scale: 4 }
    const b = { x: 100, y: -50, scale: 1 }
    expect(lerpCamera(a, b, -3)).toEqual(a)
    expect(lerpCamera(a, b, 7)).toEqual(b)
  })
})
