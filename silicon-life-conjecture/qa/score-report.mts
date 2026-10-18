import { SCORE } from '../src/story/score'
import { beatTable } from '../src/story/cues'
import { SCENES, TOTAL_FRAMES, TOTAL_SECONDS } from '../src/story/timeline'

const tc = (sec: number) =>
  Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0')

for (const id of Object.keys(SCORE)) {
  const t = beatTable(SCORE[id])
  const dur = t[t.length - 1].end
  console.log(`=== ${id}  ${(dur / 30).toFixed(1)}s  (${dur}f)`)
  t.forEach((b, i) => {
    const cues = b.cues.map((c) => c.text).join(' | ')
    console.log(`  b${String(i).padStart(2)}  ${(b.start / 30).toFixed(1).padStart(5)}s  ${b.seconds.toFixed(1)}s  ${cues}`)
  })
}

console.log('')
for (const s of SCENES) {
  console.log(
    s.chapter + '  ' + s.title + '  ' +
      (s.duration / 30).toFixed(1) + 's  ' +
      tc(s.start / 30) + ' \u2013 ' + tc((s.start + s.duration) / 30),
  )
}
console.log('TOTAL ' + TOTAL_FRAMES + ' frames = ' + TOTAL_SECONDS.toFixed(1) + 's')
