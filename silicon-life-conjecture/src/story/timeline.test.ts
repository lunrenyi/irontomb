import { describe, expect, it } from 'vitest'
import { SCENES, TOTAL_FRAMES, TOTAL_SECONDS, sceneAt } from './timeline'
import { CUE_GAP, auditScene, beatTable, keyFrames, keySize, textFits } from './cues'
import { SCORE } from './score'
import {
  CAPTION,
  COMPUTER_KEY_BOTTOM,
  COMPUTER_KEY_Y,
  COMPUTER_PHASE,
  COMPUTER_STAGE,
  LLM_KEY_BOTTOM,
  LLM_KEY_Y,
  LLM_STAGE,
  STAGE,
  TYPE,
  captionBandHeight,
  readingFrames,
  wrapLines,
} from './layout'

describe('时间轴', () => {
  it('六幕都在，而且顺序不变', () => {
    expect(SCENES.map((s) => s.id)).toEqual(['bits', 'life', 'neural', 'computer', 'mind', 'silicon'])
  })

  it('每一幕都从标题拍开始', () => {
    for (const scene of SCENES) {
      expect(SCORE[scene.id][0].chapter, scene.id).toBe(true)
    }
  })

  it('全片在四分四十五秒到五分三十秒之间', () => {
    // 上限从 315 秒放宽到 330 秒：第五幕现在要讲分词、向量、注意力、逐 Token 生成、
    // 训练与推理这五件事，单幕从 48 秒涨到 63 秒。其余五幕一字未动。
    expect(TOTAL_SECONDS).toBeGreaterThan(285)
    expect(TOTAL_SECONDS).toBeLessThan(330)
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

  it('第四幕：关键文字、阶段条、主视觉三块互不重叠', () => {
    // 这一幕几乎每拍都是「关键文字 + 主视觉」，版面必须先划出三条互不相交的带子。
    // 以前关键文字默认落在 y=170，正好压在阶段条和机器上缘上，逢有字的一拍就撞车。
    expect(COMPUTER_KEY_BOTTOM).toBeLessThan(COMPUTER_PHASE.top)
    expect(COMPUTER_PHASE.labelY).toBeLessThan(COMPUTER_STAGE.top)
    // 主视觉底边不能压进这一幕自己的字幕带（按这一幕最长的那条字幕算）
    const tallest = SCORE.computer.reduce(
      (max, spec) =>
        (spec.cues ?? []).reduce(
          (m, c) => Math.max(m, wrapLines(c.text, c.note ? CAPTION.noteSize : CAPTION.size).length),
          max
        ),
      1
    )
    expect(COMPUTER_STAGE.top + COMPUTER_STAGE.height).toBeLessThanOrEqual(
      STAGE.y + STAGE.h - captionBandHeight(tallest)
    )
    // 每一拍带字的都必须落在关键文字带里；只有最后一拍的收束问句例外 ——
    // 那一拍画面上没有任何图形，用默认的居中位置才对
    const last = SCORE.computer.length - 1
    SCORE.computer.forEach((spec, i) => {
      const key = spec.key
      if (!key) return
      if (i === last) {
        expect(key.tone, key.text).toBe('question')
        expect(key.y).toBeUndefined()
        return
      }
      expect(key.y, key.text).toBe(COMPUTER_KEY_Y)
    })
  })

  it('第五幕：字幕一律一行，主视觉不会被字幕带压住', () => {
    // 这一幕的主视觉区高度是按「字幕最多一行」倒推的（LLM_STAGE.bottom = 896）。
    // 只要某一拍不小心写成两行字幕，主视觉就会伸进字幕带里 —— 这里把它钉住。
    for (const spec of SCORE.mind) {
      for (const cue of spec.cues ?? []) {
        const size = cue.note ? CAPTION.noteSize : CAPTION.size
        expect(wrapLines(cue.text, size).length, cue.text).toBe(1)
      }
    }
    expect(LLM_STAGE.top + LLM_STAGE.height).toBeLessThanOrEqual(
      STAGE.y + STAGE.h - captionBandHeight(1)
    )
  })

  it('第五幕：关键文字都落在同一条带子上，收束问句除外', () => {
    expect(LLM_KEY_BOTTOM).toBeLessThan(LLM_STAGE.top)
    const last = SCORE.mind.length - 1
    SCORE.mind.forEach((spec, i) => {
      const key = spec.key
      if (!key) return
      if (i === last) {
        expect(key.tone, key.text).toBe('question')
        return
      }
      expect(key.y, key.text).toBe(LLM_KEY_Y)
    })
  })
})
