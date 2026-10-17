import { Caption, Readout } from '../FilmChrome'
import { Layer } from '../../viz/parts'
import { Formula } from '../../components/Math'
import { UnitCircleFigure } from '../../viz/UnitCircleFigure'
import { easeInOut, easeOut, range } from '../../lib/easing'
import { formatNumber, HALF_PI, TAU } from '../../lib/math'
import { complexTex, formatComponent } from '../../lib/format'
import { TEX } from '../../lib/tex'
import { INK, MUTED, VECTOR } from '../FilmChrome'
import { STAGE_H, STAGE_W } from '../timeline'

const CX = 960
const CY = 500
const R = 330
const IMAG = '#b9a6ff'

/**
 * 场景 3 · 单位圆与欧拉公式
 * 圆 → 向量 → 旋转 → 投影 → 公式，全部由同一个角度驱动。
 */
export function UnitCircleScene({ frame }: { frame: number }) {
  const t = frame

  const circleDraw = easeOut(range(t, 0, 62))

  // 三段旋转：到 π/2 → 到 π → 绕满一圈
  const spin1 = easeInOut(range(t, 120, 250))
  const spin2 = easeInOut(range(t, 250, 330))
  const spin3 = easeInOut(range(t, 330, 430))
  const theta = HALF_PI * spin1 + HALF_PI * spin2 + TAU * spin3

  const projectionsOn = range(t, 150, 185)
  const x = Math.cos(theta)
  const y = Math.sin(theta)

  // 公式段：cos θ 与 i sin θ 轮流被点亮，几何同步高亮
  const f0 = 430
  const highlightCos = range(t, f0 + 30, f0 + 80) * (1 - range(t, f0 + 86, f0 + 130))
  const highlightSin = range(t, f0 + 92, f0 + 140) * (1 - range(t, f0 + 150, f0 + 190))

  return (
    <Layer>
      <div style={{ position: 'absolute', left: 0, top: 0, width: STAGE_W, height: STAGE_H, opacity: circleDraw }}>
        <UnitCircleFigure
          viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H}
          cx={CX}
          cy={CY}
          r={R}
          theta={theta}
          showSweep={t > 120}
          showProjections={projectionsOn > 0.01}
          traceFrom={0}
          traceTo={Math.min(theta, TAU * 0.999)}
          sweepColor='#f2b134'
          showOriginLabel={false}
        />
      </div>

      {/* 实时读数：跟着几何走，而不是写进正文 */}
      <Readout x={CX + R * x} y={CY + 62} size={34} color={VECTOR} opacity={projectionsOn}>
        x = {formatComponent(x)}
      </Readout>
      <Readout x={CX - 74} y={CY - R * y - 46} size={34} color={IMAG} opacity={projectionsOn} anchor='end'>
        y = {formatComponent(y)}
      </Readout>
      <Readout x={CX} y={CY - R - 78} size={32} color='#f2b134' opacity={t > 120 && spin3 < 0.98 ? 1 : 0}>
        θ = {formatNumber(theta, 2)} rad
      </Readout>
      <div
        style={{
          position: 'absolute',
          // 固定在左下角的空场，避免跟着点跑、压到向量或投影线上
          left: CX - R - 268,
          top: CY + R - 26,
          opacity: range(t, 132, 160) * (1 - range(t, 420, 452)),
        }}
      >
        <Formula tex={TEX.modulusOne} label='e 的 i 次方 θ 的模长等于 1' style={{ fontSize: 34, color: '#eafff8' }} />
      </div>

      <Caption frame={t} from={24} to={104} size={38}>
        单位圆：所有方向，长度都等于 1。
      </Caption>
      <Caption frame={t} from={126} to={186} size={38}>
        水平方向的投影，就是 cos θ。
      </Caption>
      <Caption frame={t} from={196} to={252} size={38}>
        竖直方向的投影，就是 sin θ。
      </Caption>
      <Caption frame={t} from={344} to={404} size={38}>
        绕满一整圈，e 的 i 次方 θ 的长度始终是 1。
      </Caption>

      {/* 公式：随着对应几何被点亮而逐段亮起 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 858,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'baseline',
          gap: 18,
          opacity: range(t, f0, f0 + 20),
        }}
      >
        <Formula tex={TEX.eIPowTheta} label='e 的 i 次方 θ' style={{ fontSize: 86, color: INK }} />
        <Formula tex='=' label='等于' style={{ fontSize: 74, color: MUTED, opacity: 0.6 }} />
        <Formula
          tex={TEX.cosTheta}
          label='cos θ'
          style={{ fontSize: 86, color: highlightCos > 0.5 ? VECTOR : INK, opacity: 0.6 + highlightCos * 0.4 }}
        />
        <Formula tex='+' label='加' style={{ fontSize: 74, color: MUTED, opacity: 0.6 }} />
        <Formula
          tex={TEX.iSinTheta}
          label='i sin θ'
          style={{ fontSize: 86, color: highlightSin > 0.5 ? IMAG : INK, opacity: 0.6 + highlightSin * 0.4 }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 968,
          textAlign: 'center',
          fontSize: 32,
          color: MUTED,
          opacity: range(t, f0 + 150, f0 + 190),
          fontFamily: "'SFMono-Regular', Menlo, monospace",
        }}
      >
        {complexTex(Math.cos(theta), Math.sin(theta), 3)}
      </div>
    </Layer>
  )
}
