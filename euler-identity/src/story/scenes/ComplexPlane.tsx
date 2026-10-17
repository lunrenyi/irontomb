import { Caption, FormulaStack, IMAG, INK, NODE, VECTOR } from '../FilmChrome'
import { AmbientRings, DashArc, Layer } from '../../viz/parts'
import { easeInOut, easeOut, range } from '../../lib/easing'
import { fullCirclePath, HALF_PI } from '../../lib/math'
import { TEX } from '../../lib/tex'
import { STAGE_H, STAGE_W } from '../timeline'

const CX = 960
const CY = 660
const R = 250
const AXIS_X = 560
const AXIS_UP = 430

/**
 * 场景 2 · 从数轴到复平面
 * 先让观众看见「转」这件事，再用一句话命名它。
 */
export function ComplexPlaneScene({ frame }: { frame: number }) {
  const t = frame

  const axisIn = easeOut(range(t, 4, 58))
  const planeIn = easeInOut(range(t, 104, 168))
  const turn1 = easeInOut(range(t, 176, 250))
  const turn2 = easeInOut(range(t, 250, 324))
  const theta = HALF_PI * turn1 + HALF_PI * turn2

  const unfold = 0.24 + 0.76 * range(t, 104, 178)
  const gridOpacity = 0.55 * planeIn
  const circleGhost = range(t, 300, 374)

  const px = CX + R * Math.cos(theta)
  const py = CY - R * Math.sin(theta)
  const labelOpacity = 1 - range(t, 250, 300)

  return (
    <Layer>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: STAGE_W,
          height: STAGE_H,
          transformOrigin: CX + 'px ' + CY + 'px',
          transform: 'scaleX(' + unfold + ')',
          opacity: 0.4 + 0.6 * planeIn,
        }}
      >
        <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
          <g opacity={gridOpacity}>
            {[0.5, 1, 1.5, 2].map((k) => (
              <line key={'gx' + k} x1={CX - k * R} y1={CY - AXIS_UP} x2={CX - k * R} y2={CY + 130} stroke='#8ea4bf' strokeOpacity='0.08' strokeWidth='1' />
            ))}
            {[0.5, 1, 1.5].map((k) => (
              <line key={'gy' + k} x1={CX - AXIS_X} y1={CY - k * R} x2={CX + AXIS_X} y2={CY - k * R} stroke='#8ea4bf' strokeOpacity='0.08' strokeWidth='1' />
            ))}
          </g>

          {/* 水平数轴 */}
          <line
            x1={CX - AXIS_X}
            y1={CY}
            x2={CX - AXIS_X + AXIS_X * 2 * axisIn}
            y2={CY}
            stroke={VECTOR}
            strokeOpacity='0.5'
            strokeWidth='1.6'
          />
          {axisIn > 0.9 ? (
            <g fill='#8ea4bf' fontSize='30' fontFamily="'Inter', sans-serif">
              <text x={CX} y={CY + 52} textAnchor='middle'>0</text>
              <text x={CX + R} y={CY + 52} textAnchor='middle' fill={VECTOR}>1</text>
              <text x={CX - R} y={CY + 52} textAnchor='middle'>-1</text>
              <text x={CX - AXIS_X + 10} y={CY - 28} fillOpacity='0.5'>实轴</text>
            </g>
          ) : null}

          {/* 垂直轴：从原点长出来 */}
          <line x1={CX} y1={CY} x2={CX} y2={CY - AXIS_UP * planeIn} stroke={IMAG} strokeOpacity='0.5' strokeWidth='1.6' />
          {planeIn > 0.55 ? (
            <g fill={IMAG} fontSize='32' fontFamily="'Songti SC', serif">
              <text x={CX - 24} y={CY - R} textAnchor='end' opacity={planeIn}>i</text>
              <text x={CX - 24} y={CY + R} textAnchor='end' opacity={planeIn * 0.8}>-i</text>
            </g>
          ) : null}
          {/* 轴名标在轴身中段：公式组已经占住了画面上方 */}
          {planeIn > 0.8 ? (
            <text
              x={CX + 26}
              y={CY - AXIS_UP + 130}
              fill='#8ea4bf'
              fillOpacity={(planeIn - 0.8) * 2.5}
              fontSize='24'
              fontFamily="'Inter', sans-serif"
            >
              虚轴
            </text>
          ) : null}

          {/* 单位圆的影子：为下一场铺路 */}
          <DashArc d={fullCirclePath(CX, CY, R)} length={circleGhost} stroke='#8ea4bf' strokeOpacity={0.4 * circleGhost} strokeWidth='1.6' />

          {theta > 0.01 ? (
            <DashArc
              d={fullCirclePath(CX, CY, R * 0.3)}
              length={Math.min(theta / (Math.PI * 2), 1)}
              stroke={NODE}
              strokeOpacity='0.9'
              strokeWidth='2.6'
            />
          ) : null}

          <line x1={CX} y1={CY} x2={px} y2={py} stroke={VECTOR} strokeWidth='4' strokeLinecap='round' />
          <circle cx={px} cy={py} r='24' fill={VECTOR} fillOpacity='0.14' />
          <circle cx={px} cy={py} r='11' fill={VECTOR} />

          {/* 数字标签：跟随点走，相向移动完成后淡出 */}
          <g opacity={labelOpacity}>
            <text x={px} y={py - 40} textAnchor='middle' fill={VECTOR} fontSize='40' fontFamily="'Songti SC', serif">
              1
            </text>
          </g>
        </svg>
      </div>

      <FormulaStack
        frame={t}
        // 公式靠左、复平面靠右：给轴名和几何各留一块干净的地方
        x={300}
        y={312}
        size={72}
        align='left'
        lines={[
          { id: 'chain', from: 236, tex: TEX.chainOneINegOne, color: INK },
          { id: 'i2', from: 300, tex: TEX.iSquared, color: IMAG, size: 92 },
        ]}
      />

      <Caption frame={t} from={20} to={96} size={38}>
        先只有一条数轴：数字只能向左，或者向右。
      </Caption>
      <Caption frame={t} from={110} to={186} size={38}>
        i 让数字世界多出了第二个方向。
      </Caption>
      <Caption frame={t} from={196} to={250} size={38}>
        从 1 出发，乘以 i。
      </Caption>
      <Caption frame={t} from={268} to={326} size={38}>
        再乘一次 i，就转到了 -1。
      </Caption>
      <Caption frame={t} from={330} to={420} size={38}>
        连转两次，正好走到相反方向。
      </Caption>

      <AmbientRings cx={CX} cy={CY} r={R * 2.1} opacity={0.05 * planeIn} />
    </Layer>
  )
}
