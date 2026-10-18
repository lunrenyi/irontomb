import { useMemo } from 'react'
import { PlantFigure } from '../../viz/plant'
import { cameraTransform, generationFramings, growthCamera } from '../../viz/camera'
import { planGrowth } from '../../lib/growth'
import { DEFAULT_PARAMS, expand, grow, LESSON_GRAMMAR } from '../../lib/lsystem'
import { easeOut, range } from '../../lib/easing'
import { useGrowthLayers } from '../../hooks/useGrowthLayers'
import { Caption, INK, MUTED, RevealText, SHOOT, Statement } from '../FilmChrome'
import { STAGE_H, STAGE_W } from '../timeline'

const VIEWPORT = { width: STAGE_W, height: STAGE_H }
const MAX_GEN = 4
const RULE = 'F → F[+F]F[-F]'

const SYMBOLS = [
  { ch: 'F', text: '向前延伸一段' },
  { ch: '+', text: '向右转' },
  { ch: '-', text: '向左转' },
  { ch: '[', text: '记住这里' },
  { ch: ']', text: '回到刚才的地方' },
]

/**
 * 场景 4 · 规则
 * 先把规则写出来，再让观众看它怎么作用在一根枝条上：
 * 每一代都是「把上一代每一个 F 换成右边那一串」。
 */
export function LessonScene({ frame }: { frame: number }) {
  const plant = useMemo(
    () => grow(LESSON_GRAMMAR, { ...DEFAULT_PARAMS, originX: 0, originY: 0, length: 86, width: 9, angle: 25, jitter: 0.06, bend: 3 }, MAX_GEN),
    [],
  )
  const plan = useMemo(() => planGrowth(plant.segments, MAX_GEN, { perSegment: 0.7, breath: 0.08 }), [plant])
  const framings = useMemo(() => generationFramings(plan, VIEWPORT, { padding: 1.3, maxScale: 2.3 }), [plan])

  // 三代演示：每代一段，各留一点停顿
  const acts = [120, 220, 320]
  const actLength = 100
  const times = acts.map((start, i) => {
    const local = easeOut(range(frame, start, start + actLength))
    return (i + local) / MAX_GEN
  })
  const time = Math.max(times[0], times[1], times[2])

  const layers = useGrowthLayers(plan, time)
  const camera = growthCamera(plan, framings, time)

  const ruleIn = range(frame, 16, 100)
  const symbolIndex = Math.min(SYMBOLS.length - 1, Math.floor(range(frame, 130, 380) * SYMBOLS.length))
  const symbolOpacity = range(frame, 128, 150) * (1 - range(frame, 400, 430))
  const generations = Math.max(1, Math.round(time * MAX_GEN))
  const genOpacity = range(frame, 120, 150)
  const count = layers.done.length + layers.growing.length

  const strings = [0, 1, 2, 3].map((g) => expand(LESSON_GRAMMAR, g))

  return (
    <>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <g transform={cameraTransform(camera, VIEWPORT)}>
          <PlantFigure
            done={layers.done}
            growing={layers.growing}
            maxDepth={plant.levels}
            freshDepth={layers.generation}
            leaves={false}
            widthScale={0.9}
          />
        </g>
      </svg>

      {/* 规则本身 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 118, textAlign: 'center', opacity: ruleIn }}>
        <RevealText frame={frame} from={18} text={RULE} size={72} color={INK} y={0} step={2} highlight={[0, 2, 4, 6, 7, 9, 10]} mono />
      </div>

      {/* 逐个解释符号 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 236, display: 'flex', justifyContent: 'center', gap: 46, opacity: symbolOpacity }}>
        {SYMBOLS.map((s, i) => {
          const on = i === symbolIndex
          return (
            <div key={s.ch} style={{ textAlign: 'center', opacity: on ? 1 : 0.32 }}>
              <div style={{ fontSize: 54, fontFamily: "'SFMono-Regular', Menlo, monospace", color: on ? SHOOT : INK }}>{s.ch}</div>
              <div style={{ marginTop: 8, fontSize: 24, color: MUTED, letterSpacing: '0.08em' }}>{s.text}</div>
            </div>
          )
        })}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, top: 760, textAlign: 'center', opacity: genOpacity, fontSize: 30, color: MUTED, letterSpacing: '0.12em' }}>
        {'第 ' + generations + ' 代 · 共 ' + count + ' 根枝条'}
      </div>

      <Statement frame={frame} from={430} to={500} y={300} size={52}>
        这种写法叫 L-系统：一句话，反复念下去。
      </Statement>
      <Caption frame={frame} from={440} to={530} size={36}>
        每一次替换都严格照做，不许发挥，也不许偷懒。
        <br />
        这是一套能生成植物样子的简化规则，并不是所有真实植物都这样生长。
      </Caption>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, textAlign: 'center', opacity: ruleIn * 0.5, fontSize: 22, color: '#5c7168', fontFamily: "'SFMono-Regular', Menlo, monospace" }}>
        {strings[Math.min(3, generations)].slice(0, 46)}
      </div>
    </>
  )
}
