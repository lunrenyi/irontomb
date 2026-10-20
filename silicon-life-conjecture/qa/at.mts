import { SCENES } from '../src/story/timeline'
import { SCORE } from '../src/story/score'

const targets = process.argv.slice(2).map(Number)
const clock = (f: number) => {
  const s = f / 30
  return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0')
}

for (const t of targets) {
  const abs = Math.round(t * 30)
  const scene = SCENES.find((s) => abs >= s.start && abs < s.start + s.duration)
  if (!scene) {
    console.log(clock(abs) + '  (no scene)')
    continue
  }
  const local = abs - scene.start
  const idx = scene.beats.findIndex((b) => local >= b.start && local < b.end)
  const spec: (typeof SCORE)[keyof typeof SCORE][number] = SCORE[scene.id][idx]
  console.log(
    clock(abs) + '  f' + abs + '  ' + scene.id + ' local f' + local +
      '  beat b' + idx + ' [' + scene.beats[idx].seconds.toFixed(1) + 's]' +
      '  key=' + (spec?.key ? spec.key.text + ' @y=' + (spec.key.y ?? (spec.key.tone === 'question' ? 430 : spec.chapter ? 470 : 170)) : '-') +
      '  cue=' + (spec?.cues ? spec.cues.map((c) => c.text).join(' / ') : '-'),
  )
}
