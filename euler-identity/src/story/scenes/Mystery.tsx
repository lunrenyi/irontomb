import { Caption, Glyph, INK, MUTED, NODE, VECTOR } from '../FilmChrome'
import { AmbientRings, DashArc, Layer } from '../../viz/parts'
import { easeOut, pulse, range } from '../../lib/easing'
import { fullCirclePath } from '../../lib/math'
import { STAGE_H, STAGE_W } from '../timeline'

const CX = 960
const CY = 470
const R = 300

/** 五个字形在公式里的落位（以各自中心点定位） */
const SLOT = {
  e: { x: 671, y: CY + 52 },
  i: { x: 751, y: CY - 88 },
  pi: { x: 813, y: CY - 88 },
  plus: { x: 911, y: CY + 40 },
  one: { x: 1016, y: CY + 52 },
  eq: { x: 1136, y: CY + 40 },
  zero: { x: 1251, y: CY + 52 },
}

/**
 * 场景 1 · 五个常数的谜题
 * 起：光点进入 → 承：几何被「画」出 → 转：五个符号各自进场 → 合：组成公式
 */
export function MysteryScene({ frame }: { frame: number }) {
  const t = frame

  // 背景几何：随光点绘制，高潮时点亮，再安静下来
  const drawIn = easeOut(range(t, 18, 78))
  const flash = pulse(t, 150, 200)
  const geometryOpacity = 0.1 + drawIn * 0.34 + flash * 0.5
  const settle = 1 - range(t, 200, 240) * 0.62

  const sparkT = range(t, 0, 70)
  const sparkX = 120 + easeOut(sparkT) * (CX - 120)
  const sparkY = 720 - easeOut(sparkT) * (720 - CY)
  const sparkFade = 1 - range(t, 62, 96)

  return (
    <Layer>
      <svg width={STAGE_W} height={STAGE_H} viewBox={'0 0 ' + STAGE_W + ' ' + STAGE_H} style={{ position: 'absolute', inset: 0 }}>
        <g opacity={geometryOpacity * settle}>
          <DashArc d={fullCirclePath(CX, CY, R)} length={drawIn} stroke='#4fe3c1' strokeOpacity={0.55} strokeWidth='1.4' />
          <DashArc
            d={fullCirclePath(CX, CY, R * 0.62)}
            length={Math.min(1, drawIn * 1.15)}
            offset={0.08}
            stroke='#8ea4bf'
            strokeOpacity={0.4}
            strokeWidth='1.2'
          />
          <DashArc
            d={'M ' + (CX - R) + ' ' + CY + ' A ' + R + ' ' + R + ' 0 0 1 ' + (CX + R) + ' ' + CY}
            length={drawIn}
            stroke='#f2b134'
            strokeOpacity={0.35 + flash * 0.45}
            strokeWidth='1.6'
          />
          <line x1={CX - R * 1.25} y1={CY} x2={CX + R * 1.25} y2={CY} stroke='#8ea4bf' strokeOpacity={0.2} strokeWidth='1' />
        </g>

        <AmbientRings cx={CX} cy={CY} r={R * 1.5} opacity={0.06 * settle} />

        {/* 进入画面的光点 */}
        <g opacity={sparkFade}>
          <circle cx={sparkX} cy={sparkY} r={54} fill='#4fe3c1' fillOpacity='0.07' />
          <circle cx={sparkX} cy={sparkY} r={13} fill='#e8fff8' />
          <circle cx={sparkX} cy={sparkY} r={26} fill='#4fe3c1' fillOpacity='0.25' />
        </g>

        {/* 0 的圆环：先画环，字形后成形 */}
        <DashArc
          d={fullCirclePath(SLOT.zero.x, SLOT.zero.y, 118)}
          length={range(t, 122, 176)}
          stroke={INK}
          strokeOpacity={0.55 * (1 - range(t, 184, 220))}
          strokeWidth='1.6'
        />

        {/* i 的垂直光束 */}
        <line
          x1={SLOT.i.x + 14}
          y1={SLOT.i.y + 54}
          x2={SLOT.i.x + 14}
          y2={SLOT.i.y + 54 - 150 * range(t, 62, 104)}
          stroke='#b9a6ff'
          strokeOpacity={0.75 * (1 - range(t, 96, 132))}
          strokeWidth='2'
        />

        {/* 1 的尾迹 */}
        <line
          x1={SLOT.one.x + 430 * (1 - range(t, 106, 152))}
          y1={SLOT.one.y + 30}
          x2={SLOT.one.x}
          y2={SLOT.one.y + 30}
          stroke={VECTOR}
          strokeOpacity={0.35 * (1 - range(t, 130, 172))}
          strokeWidth='2'
        />
      </svg>

      {/* 五个符号 + 连字符 */}
      <Glyph frame={t} entrance={{ path: 'curve', from: 44, to: 92 }} x={SLOT.e.x} y={SLOT.e.y} size={196} color={INK}>
        e
      </Glyph>
      <Glyph frame={t} entrance={{ path: 'beam', from: 74, to: 108 }} x={SLOT.i.x} y={SLOT.i.y} size={86} color='#b9a6ff'>
        i
      </Glyph>
      <Glyph frame={t} entrance={{ path: 'arc', from: 92, to: 140 }} x={SLOT.pi.x} y={SLOT.pi.y} size={86} color={NODE}>
        π
      </Glyph>
      <Glyph frame={t} entrance={{ path: 'slide', from: 112, to: 158 }} x={SLOT.one.x} y={SLOT.one.y} size={196} color={VECTOR}>
        1
      </Glyph>
      <Glyph frame={t} entrance={{ path: 'ring', from: 150, to: 190 }} x={SLOT.zero.x} y={SLOT.zero.y} size={196} color={INK}>
        0
      </Glyph>
      <Glyph frame={t} entrance={{ path: 'rise', from: 148, to: 186 }} x={SLOT.plus.x} y={SLOT.plus.y} size={146} color={MUTED}>
        +
      </Glyph>
      <Glyph frame={t} entrance={{ path: 'rise', from: 158, to: 196 }} x={SLOT.eq.x} y={SLOT.eq.y} size={146} color={MUTED}>
        =
      </Glyph>

      <Caption frame={t} from={168} to={240} size={42}>
        为什么这五个符号，会出现在同一个等式里？
      </Caption>
    </Layer>
  )
}
