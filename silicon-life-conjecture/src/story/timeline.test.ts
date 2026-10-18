import { describe, expect, it } from 'vitest'
import { SCENES, TOTAL_FRAMES, TOTAL_SECONDS, sceneAt } from './timeline'
import { CUE_GAP, auditScene, beatTable, keyFrames, keySize, textFits } from './cues'
import { SCORE } from './score'
import { CAPTION, STAGE, TYPE, captionBandHeight, readingFrames, wrapLines } from './layout'

describe('时间轴', () => {
  it('六幕都在，而且顺序不变', () => {
    expect(SCENES.map((s) => s.id)).toEqual(['bits', 'life', 'neural', 'computer', 'mind', 'silicon'])
  })

  it('每一幕都从标题拍开始', () => {
    for (const scene of SCENES) {
      expect(SCORE[scene.id][0].chapter, scene.id).toBe(true)
    }
  })

  it('全片在四分四十五秒到五分十五秒之间', () => {
    expect(TOTAL_SECONDS).toBeGreaterThan(285)
    expect(TOTAL_SECONDS).toBeLessThan(315)
    expect(TOTAL_FRAMES).toBe(Math.round(TOTAL_FRAMES))
  })

  it('幕与幕交叠形成溶解，但没有空洞', () => {
    for (let i = 1; i < SCENES.length; i += 1) {
      const prev = SCENES[i - 1]
      const cur = SCENES[i]
      expect(cur.start, cur.id).toBeLessThan(prev.start + prev.duration)
      expect(cur.start, cur.id).toBeGreaterThan(prev.start)
    }
    expect(sceneAt(0).scene.id).toBe('bits')
    expect(sceneAt(TOTAL_FRAMES - 1).scene.id).toBe('silicon')
  })
})

describe('字幕：每一条都读得完、也放得下', () => {
  const allCues = SCENES.flatMap((scene) =>
    SCORE[scene.id].flatMap((spec, i) => (spec.cues ?? []).map((c) => ({ scene: scene.id, beat: i, cue: c }))),
  )

  it('每一幕都有字幕，不是只有画面', () => {
    for (const scene of SCENES) {
      const n = SCORE[scene.id].reduce((sum, s) => sum + (s.cues?.length ?? 0), 0)
      expect(n, scene.id).toBeGreaterThan(3)
    }
  })

  it('字幕不会太长 —— 太长就说明该拆成两句', () => {
    for (const { scene, beat, cue } of allCues) {
      expect([...cue.text].length, scene + ' b' + beat).toBeLessThanOrEqual(40)
    }
  })

  it('每条字幕都排得进字幕带，不会被裁掉', () => {
    for (const { scene, beat, cue } of allCues) {
      const size = cue.note ? CAPTION.noteSize : CAPTION.size
      const lines = wrapLines(cue.text, size, CAPTION.maxWidth)
      expect(lines.length, scene + ' b' + beat).toBeLessThanOrEqual(2)
      for (const line of lines) expect(line.length).toBeGreaterThan(0)
      expect(captionBandHeight(lines.length, size)).toBeLessThan(STAGE.h * 0.32)
    }
  })

  it('字幕左右有明确的安全边距', () => {
    for (const { cue } of allCues) {
      const size = cue.note ? CAPTION.noteSize : CAPTION.size
      for (const line of wrapLines(cue.text, size, CAPTION.maxWidth)) {
        expect(line.length * size).toBeLessThanOrEqual(CAPTION.maxWidth + size)
      }
    }
  })

  it('每一拍都留够了把字幕读完的时间', () => {
    for (const scene of SCENES) {
      const table = beatTable(SCORE[scene.id])
      SCORE[scene.id].forEach((spec, i) => {
        if (!spec.cues) return
        const last = table[i].cues[table[i].cues.length - 1]
        expect(last.to, scene.id + ' b' + i).toBeLessThanOrEqual(table[i].end)
        expect(table[i].dur, scene.id + ' b' + i).toBeGreaterThanOrEqual(readingFrames(spec.cues[0].text, CAPTION.size) - 1)
      })
    }
  })

  it('两条字幕不会撞在一起', () => {
    for (const scene of SCENES) {
      const problems = auditScene(SCORE[scene.id])
      expect(problems.join(' / '), scene.id).toBe('')
    }
  })

  it('字幕与字幕之间留出了间隔', () => {
    for (const scene of SCENES) {
      const table = beatTable(SCORE[scene.id])
      for (const beat of table) {
        for (let i = 1; i < beat.cues.length; i += 1) {
          expect(beat.cues[i].from - beat.cues[i - 1].to).toBeGreaterThanOrEqual(CUE_GAP)
        }
      }
    }
  })

  it('关键公式与核心问题也排得下', () => {
    for (const scene of SCENES) {
      SCORE[scene.id].forEach((spec, i) => {
        if (!spec.key) return
        expect(textFits(spec.key), scene.id + ' b' + i).toBe(true)
        const beat = beatTable(SCORE[scene.id])[i]
        expect(beat.dur, scene.id + ' b' + i).toBeGreaterThanOrEqual(keyFrames(spec.key))
      })
    }
  })

  it('字号层级落在成片可读的范围里', () => {
    expect(TYPE.chapter).toBeGreaterThanOrEqual(64)
    expect(TYPE.chapter).toBeLessThanOrEqual(88)
    expect(TYPE.key).toBeGreaterThanOrEqual(52)
    expect(TYPE.statement).toBeGreaterThanOrEqual(44)
    expect(TYPE.body).toBeGreaterThanOrEqual(36)
    expect(TYPE.label).toBeGreaterThanOrEqual(30)
    expect(TYPE.labelSmall).toBeGreaterThanOrEqual(28)
    expect(keySize('question')).toBe(TYPE.statement)
  })

  it('主视觉区与底部字幕区不重叠', () => {
    // 字幕带最多占画面下方三分之一，主视觉仍然有地方放
    expect(captionBandHeight(2)).toBeLessThan(STAGE.h * 0.32)
  })
})
