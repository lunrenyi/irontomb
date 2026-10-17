import { Caption, FormulaStack, IMAG, INK, MUTED, VECTOR } from '../FilmChrome'
import { DashArc, Layer } from '../../viz/parts'
import { clamp01, easeOut, pulse, range } from '../../lib/easing'
import { TEX } from '../../lib/tex'
import { STAGE_H, STAGE_W } from '../timeline'

const CX = 960
const LINE_Y = 620
const SPAN = 330
/** 数字本身的长度：始终不变，抵消靠的是位置而不是长度 */
const BAR = 150

/**
 * 场景 5 · 抵消
 * 圆被「压扁」成一条数轴：这是真正的几何形变，不是切镜头。
 */
export function CancellationScene({ frame }: { frame: number }) {
  const t = frame

  const flatten = easeOut(range(t, 0, 74))
  const ry = 300 * (1 - flatten)
  const lineIn = easeOut(range(t, 40, 96))
  const circleFade = 1 - range(t, 46, 96)

  const minusIn = range(t, 104, 152)
  const plusIn = range(t, 126, 174)
  const segmentIn = range(t, 176, 228)

  const converge = easeOut(range(t, 246, 348))
  const meet = range(t, 348, 384)
  const glow = pulse(t, 340, 420)
  const labelFade = 1 - clamp01((converge - 0.35) / 0.4)

  const minusX = CX - SPAN + converge * SPAN
  const plusX = CX + SPAN - converge * SPAN
  const barScale = segmentIn

  return (
    <Layer>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id='cancel-glow' cx='50%' cy='50%' r='50%'>
            <stop offset='0%' stopColor='#eafff8' stopOpacity='0.5' />
            <stop offset='100%' stopColor='#eafff8' stopOpacity='0' />
          </radialGradient>
        </defs>

        {/* 被压扁的单位圆：仍然看得出它曾经是圆 */}
        <ellipse
          cx={CX}
          cy={LINE_Y}
          rx={520}
          ry={ry}
          fill='none'
          stroke='#8ea4bf'
          strokeOpacity={0.32 * circleFade}
          strokeWidth='1.6'
        />
        <DashArc
          d={'M ' + (CX - 520) + ' ' + LINE_Y + ' A 520 300 0 0 0 ' + (CX + 520) + ' ' + LINE_Y}
          length={circleFade}
          stroke='#4fe3c1'
          strokeOpacity={0.3 * circleFade}
          strokeWidth='1.4'
        />

        {/* 数轴 */}
        <line
          x1={CX - 660}
          y1={LINE_Y}
          x2={CX - 660 + 1320 * lineIn}
          y2={LINE_Y}
          stroke={VECTOR}
          strokeOpacity='0.4'
          strokeWidth='1.6'
        />
        {lineIn > 0.9 ? (
          <g stroke='#8ea4bf' strokeOpacity='0.35' strokeWidth='1.2'>
            <line x1={CX} y1={LINE_Y - 13} x2={CX} y2={LINE_Y + 13} />
            <line x1={CX - SPAN} y1={LINE_Y - 11} x2={CX - SPAN} y2={LINE_Y + 11} />
            <line x1={CX + SPAN} y1={LINE_Y - 11} x2={CX + SPAN} y2={LINE_Y + 11} />
          </g>
        ) : null}

        {/* 两个数字：等长、方向相反，相向滑向原点 */}
        <g opacity={minusIn * labelFade}>
          <line
            x1={minusX - BAR * barScale}
            y1={LINE_Y}
            x2={minusX}
            y2={LINE_Y}
            stroke={VECTOR}
            strokeWidth='10'
            strokeLinecap='round'
          />
          <circle cx={minusX - BAR * barScale} cy={LINE_Y} r='6' fill={VECTOR} />
        </g>
        <g opacity={plusIn * labelFade}>
          <line
            x1={plusX}
            y1={LINE_Y}
            x2={plusX + BAR * barScale}
            y2={LINE_Y}
            stroke={IMAG}
            strokeWidth='10'
            strokeLinecap='round'
          />
          <circle cx={plusX + BAR * barScale} cy={LINE_Y} r='6' fill={IMAG} />
        </g>

        {/* 数字标签固定在各自的刻度上 */}
        <g opacity={minusIn * labelFade}>
          <text x={CX - SPAN} y={LINE_Y - 52} textAnchor='middle' fill={VECTOR} fontSize='52' fontFamily="'Songti SC', serif">
            -1
          </text>
        </g>
        <g opacity={plusIn * labelFade}>
          <text x={CX + SPAN} y={LINE_Y - 52} textAnchor='middle' fill={IMAG} fontSize='52' fontFamily="'Songti SC', serif">
            +1
          </text>
        </g>
        {lineIn > 0.9 ? (
          <text
            x={CX}
            y={LINE_Y + 56}
            textAnchor='middle'
            fill='#8ea4bf'
            fillOpacity={0.75 * (1 - meet)}
            fontSize='32'
            fontFamily="'Inter', sans-serif"
          >
            0
          </text>
        ) : null}

        {/* 相遇时的柔和汇聚 */}
        <circle cx={CX} cy={LINE_Y} r={200} fill='url(#cancel-glow)' opacity={glow * 0.9} />
        <circle cx={CX} cy={LINE_Y} r={30 + meet * 70} fill='none' stroke='#eafff8' strokeOpacity={meet * 0.35} strokeWidth='1.4' />
        <circle cx={CX} cy={LINE_Y} r={10 + meet * 8} fill='#eafff8' fillOpacity={meet * 0.5} />
      </svg>

      {/* 原点上的 0 */}
      <div
        style={{
          position: 'absolute',
          left: CX,
          top: LINE_Y - 116 - (1 - meet) * 30,
          transform: 'translate(-50%, -50%)',
          fontSize: 92,
          color: '#eafff8',
          fontFamily: "'Songti SC', serif",
          opacity: meet,
          textShadow: '0 0 40px rgba(234,255,248,0.4)',
        }}
      >
        0
      </div>

      <FormulaStack
        frame={t}
        y={132}
        size={74}
        align='center'
        lines={[
          { id: 'a', from: 240, tex: TEX.plusOne, color: INK, until: 448 },
          { id: 'b', from: 306, tex: TEX.minusOnePlusOne, color: MUTED, until: 448 },
          { id: 'c', from: 372, tex: '= 0', color: '#eafff8', size: 104, until: 386 },
          { id: 'final', from: 478, tex: TEX.eulerIdentity, color: '#eafff8', size: 96 },
        ]}
      />

      <Caption frame={t} from={18} to={92} size={36}>
        把镜头压平，圆变成一条数轴。
      </Caption>
      <Caption frame={t} from={120} to={182} size={36}>
        -1 与 +1：离原点一样远，方向相反。
      </Caption>
      <Caption frame={t} from={252} to={308} size={36}>
        让它们相向移动。
      </Caption>
      <Caption frame={t} from={390} to={444} size={36}>
        在原点，它们正好抵消。
      </Caption>
    </Layer>
  )
}
