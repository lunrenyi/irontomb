import { describe, expect, it } from 'vitest'
import {
  FPS,
  SCENES,
  SCENE_OVERLAP,
  TOTAL_FRAMES,
  TOTAL_SECONDS,
  cameraAtFrame,
  frameForPhrase,
  sceneAt,
  sceneForPhrase,
} from './timeline'
import { auditScene, beatTable } from './cues'
import { SCORE } from './score'
import { PHRASES } from '../content/qianzi'
import { keySize, textFits } from './cues'

describe('影片时间轴', () => {
  it('七幕，顺序是叙事顺序', () => {
    expect(SCENES.map((s) => s.id)).toEqual([
      'decode',
      'cosmos',
      'nature',
      'civilization',
      'human',
      'daily',
      'whole',
    ])
  })

  it('每一幕都有拍表，而且拍表是连着的', () => {
    for (const scene of SCENES) {
      expect(scene.beats.length).toBeGreaterThan(0)
      scene.beats.forEach((b, i) => {
        expect(b.start).toBe(i === 0 ? 0 : scene.beats[i - 1].end)
        expect(b.dur).toBeGreaterThan(0)
      })
      expect(scene.duration).toBe(scene.beats[scene.beats.length - 1].end)
    }
  })

  it('幕与幕之间只重叠固定的那些帧（用于交叉溶解与镜头飞行）', () => {
    for (let i = 1; i < SCENES.length; i += 1) {
      const prev = SCENES[i - 1]
      const cur = SCENES[i]
      const gap = cur.start - (prev.start + prev.duration)
      expect(gap).toBe(-SCENE_OVERLAP)
    }
  })

  it('总长合理：两分钟到五分钟之间', () => {
    expect(TOTAL_FRAMES).toBeGreaterThan(120 * FPS)
    expect(TOTAL_SECONDS).toBeLessThan(300)
  })

  it('每一拍都排得下：字幕不撞车、不溢出', () => {
    for (const id of Object.keys(SCORE) as Array<keyof typeof SCORE>) {
      const problems = auditScene(SCORE[id])
      expect(problems, id + ' -> ' + problems.join('; ')).toEqual([])
    }
  })

  it('关键文字不会大到吃掉半个画面', () => {
    for (const id of Object.keys(SCORE) as Array<keyof typeof SCORE>) {
      for (const spec of SCORE[id]) {
        if (!spec.key) continue
        expect(textFits(spec.key), id + ' / ' + spec.key.text).toBe(true)
        expect(keySize(spec.key.tone)).toBeGreaterThan(0)
      }
    }
  })

  it('每一拍至少有一句话说清楚这一拍', () => {
    for (const id of Object.keys(SCORE) as Array<keyof typeof SCORE>) {
      const table = beatTable(SCORE[id])
      for (const b of table) {
        const hasCue = b.cues.length > 0
        const hasKey = Boolean(b.key)
        expect(hasCue || hasKey, id + ' 第 ' + b.index + ' 拍既没有字幕也没有关键文字').toBe(true)
      }
    }
  })
})

describe('镜头', () => {
  it('每一帧的镜头都是有限的（不会算出 NaN）', () => {
    for (let f = 0; f < TOTAL_FRAMES; f += 7) {
      const c = cameraAtFrame(f)
      expect(Number.isFinite(c.x)).toBe(true)
      expect(Number.isFinite(c.y)).toBe(true)
      expect(Number.isFinite(c.scale)).toBe(true)
      expect(c.scale).toBeGreaterThan(0.01)
      expect(c.scale).toBeLessThan(6)
    }
  })

  it('镜头在幕与幕之间是连续的（不会瞬移）', () => {
    let prev = cameraAtFrame(0)
    for (let f = 1; f < TOTAL_FRAMES; f += 1) {
      const c = cameraAtFrame(f)
      const jump = Math.hypot(c.x - prev.x, c.y - prev.y)
      expect(jump, '第 ' + f + ' 帧镜头跳了 ' + jump.toFixed(1)).toBeLessThan(60)
      prev = c
    }
  })

  it('每一幕的主镜头都落在自己那块区域上', () => {
    for (const scene of SCENES) {
      const c = cameraAtFrame(scene.start + 10)
      const win = sceneAt(scene.start + 10)
      expect(win.scene.id).toBe(scene.id)
      expect(c.scale).toBeGreaterThan(0.2)
    }
  })
})

describe('页面与影片的对接', () => {
  it('点原文能落到影片里讲它的那一幕', () => {
    for (const p of PHRASES) {
      const scene = sceneForPhrase(p.i)
      expect(SCENES.some((s) => s.id === scene)).toBe(true)
      const f = frameForPhrase(p.i)
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThan(TOTAL_FRAMES)
    }
  })

  it('影片里引用的原文下标都是真的', () => {
    for (const scene of SCENES) {
      for (const beat of scene.beats) {
        for (const i of beat.phrases) {
          expect(PHRASES[i], scene.id + ' 引用了不存在的句子 ' + i).toBeDefined()
        }
      }
    }
  })

  it('每一幕讲的句子都属于它自己（序章与全景可以跨模块引用）', () => {
    for (const scene of SCENES) {
      if (scene.id === 'decode' || scene.id === 'whole') continue
      const own = scene.beats.flatMap((b) => b.phrases)
      expect(own.length, scene.id + ' 没有引用任何句子').toBeGreaterThan(0)
      for (const i of own) {
        expect(PHRASES[i].module, scene.id + ' 引用了别的模块的句子：' + PHRASES[i].text).toBe(scene.id)
      }
    }
  })
})
