import { Caption, Readout } from '../FilmChrome'
import { Layer } from '../../viz/parts'
import { FormulaStack } from '../FilmChrome'
import { UnitCircleFigure } from '../../viz/UnitCircleFigure'
import { easeInOut, easeOut, range } from '../../lib/easing'
import { PI } from '../../lib/math'
import { formatComponent } from '../../lib/format'
import { TEX } from '../../lib/tex'
import { INK, IMAG, VECTOR } from '../FilmChrome'
import { STAGE_H, STAGE_W } from '../timeline'

const CX = 1180
const R = 300

/**
 * 场景 4 · 半圈与推导
 * 圆在右上，公式在左侧：镜头让位给推导过程，一行一行给出结论。
 */
export function HalfTurnScene({ frame }: { frame: number }) {
  const t = frame

  // 开场：镜头把圆略微推远、上移，给下面的推导腾出空间
  const camera = easeOut(range(t, 0, 34))
  const cy = 500 - camera * 70
  const r = R - camera * 26

  // 0 → π/2 → π
  const spin1 = easeInOut(range(t, 30, 160))
  const spin2 = easeInOut(range(t, 190, 320))
  const theta = (PI / 2) * spin1 + (PI / 2) * spin2

  const x = Math.cos(theta)
  const y = Math.sin(theta)

  return (
    <Layer>
      <div style={{ position: 'absolute', left: 0, top: 0, width: STAGE_W, height: STAGE_H }}>
        <UnitCircleFigure
          viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H}
          cx={CX}
          cy={cy}
          r={r}
          theta={theta}
          showSweep
          showProjections
          traceFrom={0}
          traceTo={theta}
          sweepColor='#f2b134'
          showOriginLabel={false}
        />
      </div>

      {/* 坐标读数跟着点走 */}
      <Readout x={CX + r * x} y={cy + 58} size={32} color={VECTOR}>
        x = {formatComponent(x)}
      </Readout>
      <Readout x={CX - 74} y={cy - r * y - 44} size={32} color={IMAG} anchor='end'>
        y = {formatComponent(y)}
      </Readout>

      {/* 定格在 π 时的巨大坐标 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 760,
          textAlign: 'center',
          opacity: range(t, 330, 360) * (1 - range(t, 400, 440)),
        }}
      >
        <span style={{ fontSize: 82, color: '#eafff8', fontFamily: "'Songti SC', serif", letterSpacing: '0.04em' }}>
          (-1, 0)
        </span>
        <div style={{ marginTop: 10, fontSize: 30, color: '#f2b134', letterSpacing: '0.18em' }}>θ = π</div>
      </div>

      {/* 推导：一行一行往下加 */}
      <FormulaStack
        frame={t}
        x={180}
        y={250}
        size={62}
        align='left'
        lines={[
          { id: 'cos', from: 390, to: 720, tex: TEX.cosPi, color: VECTOR },
          { id: 'sin', from: 460, to: 720, tex: TEX.sinPi, color: IMAG },
          { id: 'sub', from: 530, to: 720, tex: TEX.atPi, color: INK },
          { id: 'val', from: 600, to: 720, tex: TEX.piTimesZero, color: INK },
          { id: 'res', from: 660, to: 720, tex: TEX.eIPowPiIsMinusOne, color: '#eafff8', size: 82 },
        ]}
      />

      <Caption frame={t} from={16} to={90} size={36}>
        现在把角度从 0 推向 π。
      </Caption>
      <Caption frame={t} from={150} to={196} size={36}>
        四分之一圈：横坐标归零，纵坐标到顶。
      </Caption>
      <Caption frame={t} from={300} to={348} size={36}>
        半圈。点停在了正方向的反面。
      </Caption>
    </Layer>
  )
}
