import { Caption, Glyph, INK, MUTED, NODE, VECTOR } from '../FilmChrome'
import { AmbientRings, DashArc, Layer } from '../../viz/parts'
import { easeOut, pulse, range } from '../../lib/easing'
import { fullCirclePath } from '../../lib/math'
import { STAGE_H, STAGE_W } from '../timeline'

const CX = 960
const CY = 430

const ITEMS = [
  { glyph: 'e', color: INK, note: 'e · 连续增长的常数' },
  { glyph: 'i', color: '#b9a6ff', note: 'i · 多出一个方向' },
  { glyph: 'π', color: NODE, note: 'π · 正好是半圈' },
  { glyph: '1', color: VECTOR, note: '1 · 要与 -1 相加的数' },
  { glyph: '0', color: '#eafff8', note: '0 · 抵消之后剩下的' },
]

const START_X = 380
const STEP = 290

/** 场景 6 · 收束：五个符号回到一起，故事闭合 */
export function RecapScene({ frame }: { frame: number }) {
  const t = frame

  // 背景：单位圆的余晖
  const ember = 1 - range(t, 300, 420) * 0.5
  const ringPulse = pulse(t, 150, 250)

  // 五个符号依次落位（每隔 40 帧），每个落位时给出一句短说明
  const gatherStart = 216
  const gather = easeOut(range(t, gatherStart, gatherStart + 96))
  const formulaOpacity = range(t, gatherStart + 40, gatherStart + 90)

  return (
    <Layer>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <DashArc
          d={fullCirclePath(CX, CY, 300)}
          length={range(t, 0, 70)}
          stroke='#4fe3c1'
          strokeOpacity={0.28 * ember + ringPulse * 0.2}
          strokeWidth='1.4'
        />
        <DashArc
          d={fullCirclePath(CX, CY, 210)}
          length={range(t, 12, 84)}
          offset={0.1}
          stroke='#8ea4bf'
          strokeOpacity={0.22 * ember}
          strokeWidth='1.2'
        />
        <AmbientRings cx={CX} cy={CY} r={420} opacity={0.05 * ember} />
      </svg>

      {ITEMS.map((item, index) => {
        const from = 10 + index * 40
        const to = from + 34
        // 收束阶段：五个符号向公式的落位飞行
        const restX = START_X + index * STEP
        const restY = CY + 76
        const finalX = [671, 751, 813, 1016, 1251][index]
        const finalY = index === 1 || index === 2 ? CY - 40 : CY + 52
        const x = restX + (finalX - restX) * gather
        const y = restY + (finalY - restY) * gather
        const size = index === 1 || index === 2 ? 78 : 132
        return (
          <div key={item.glyph} style={{ position: 'absolute', inset: 0 }}>
            <Glyph
              frame={t}
              entrance={{ path: index === 0 ? 'curve' : index === 1 ? 'beam' : index === 2 ? 'arc' : index === 3 ? 'slide' : 'ring', from, to }}
              x={x}
              y={y}
              size={size}
              color={item.color}
            >
              {item.glyph}
            </Glyph>
          </div>
        )
      })}

      {gather > 0.6 ? (
        <div
          style={{
            position: 'absolute',
            left: 911,
            top: CY + 40,
            fontSize: 116,
            color: MUTED,
            opacity: (gather - 0.6) / 0.4,
            transform: 'translate(-50%, -50%)',
            fontFamily: "'Songti SC', serif",
          }}
        >
          +
        </div>
      ) : null}
      {gather > 0.8 ? (
        <div
          style={{
            position: 'absolute',
            left: 1136,
            top: CY + 40,
            fontSize: 116,
            color: MUTED,
            opacity: (gather - 0.8) / 0.2,
            transform: 'translate(-50%, -50%)',
            fontFamily: "'Songti SC', serif",
          }}
        >
          =
        </div>
      ) : null}

      {/* 每个符号的短说明，一次只出现一句 */}
      {ITEMS.map((item, index) => (
        <Caption key={item.glyph} frame={t} from={14 + index * 40} to={44 + index * 40} size={34} y={CY + 230}>
          {item.note}
        </Caption>
      ))}

      <Caption frame={t} from={gatherStart + 96} to={420} size={38} y={CY + 250}>
        e 给出增长，i 给出方向，π 指定半圈，1 遇上 -1，剩下 0。
      </Caption>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 74,
          textAlign: 'center',
          opacity: formulaOpacity * ember,
          fontSize: 30,
          color: MUTED,
          letterSpacing: '0.22em',
        }}
      >
        EULER&apos;S IDENTITY
      </div>
    </Layer>
  )
}
