/**
 * 第四幕：修身与人事。
 *
 *   body      身体与德目
 *   echo      空谷传声 / 虚堂习听：回声与自省
 *   relations 孝悌、夫妇、交友：人之间的连线
 *   retreat   进退：两疏见机，解组谁逼
 */
import { AMBER, CYAN, GREEN, PAPER, VIOLET, alpha } from '../../viz/palette'
import { Grid, Leader, Line, Poly, Readout, Ripples, Ring, Tag } from '../../viz/parts'
import { range } from '../../lib/easing'
import type { SceneProps } from './shared'


/** 一个由几何件拼出来的人：头、躯干、四肢。 */
function Figure({
  x,
  y,
  h,
  color,
  opacity = 1,
  pose = 0,
}: {
  x: number
  y: number
  h: number
  color: string
  opacity?: number
  /** 0 站姿 1 拱手 2 行走 3 跪拜 */
  pose?: number
}) {
  const headR = h * 0.1
  const bodyTop = y - h + headR * 2.2
  const hipY = y - h * 0.42
  const shoulderY = bodyTop + h * 0.18
  const armSpread = pose === 1 ? 0.12 : pose === 2 ? 0.2 : 0.16
  const legSwing = pose === 2 ? 0.12 : 0
  return (
    <g opacity={opacity}>
      <circle cx={x} cy={bodyTop} r={headR} fill="none" stroke={color} strokeWidth={1.8} />
      {/* 躯干：一个小小的梯形，小尺寸下也看得出是个人 */}
      <Poly
        points={[
          [x - h * 0.07, bodyTop + headR * 1.15],
          [x + h * 0.07, bodyTop + headR * 1.15],
          [x + h * 0.05, hipY],
          [x - h * 0.05, hipY],
        ]}
        color={color}
        opacity={0.4}
        width={1.2}
        fill={alpha(color, 0.12)}
      />
      <Line x1={x - h * armSpread} y1={shoulderY} x2={x + h * armSpread} y2={shoulderY} color={color} width={1.4} />
      {pose === 1 ? (
        <>
          <Line x1={x - h * armSpread} y1={shoulderY} x2={x - h * 0.04} y2={shoulderY + h * 0.2} color={color} width={1.3} />
          <Line x1={x + h * armSpread} y1={shoulderY} x2={x + h * 0.04} y2={shoulderY + h * 0.2} color={color} width={1.3} />
        </>
      ) : (
        <>
          <Line x1={x - h * armSpread} y1={shoulderY} x2={x - h * (armSpread + 0.06)} y2={hipY} color={color} width={1.3} />
          <Line x1={x + h * armSpread} y1={shoulderY} x2={x + h * (armSpread + 0.06)} y2={hipY} color={color} width={1.3} />
        </>
      )}
      <Line x1={x} y1={hipY} x2={x - h * legSwing} y2={y} color={color} width={1.4} />
      <Line x1={x} y1={hipY} x2={x + h * legSwing} y2={y} color={color} width={1.4} />
    </g>
  )
}

export function HumanScene({ frame, beat }: SceneProps) {
  const body = beat === 1
  const echo = beat === 2
  const relations = beat === 3
  const retreat = beat === 4
  const t = frame / 30

  return (
    <g>
      <Grid x={60} y={150} w={1800} h={780} step={60} opacity={0.05} />

      {/* 身体与德目 */}
      {body ? (
        <g>
          <Tag x={150} y={210} text="盖此身发，四大五常" color={AMBER} size={32} />
          <g opacity={range(frame, 0, 30)}>
            <Figure x={520} y={700} h={340} color={AMBER} />
            {/* 四大：四肢视听言动 */}
            {[
              { lx: 520, ly: 480, t: '四肢' },
              { lx: 520, ly: 400, t: '视听言动' },
            ].map((l) => (
              <g key={l.t}>
                <Leader x1={l.lx} y1={l.ly + 14} x2={l.lx + 200} y2={l.ly} color={AMBER} />
                <Tag x={l.lx + 210} y={l.ly + 6} text={l.t} color={AMBER} size={22} />
              </g>
            ))}
          </g>
          {/* 五常 */}
          <g opacity={range(frame, 25, 60)}>
            {['仁', '义', '礼', '智', '信'].map((c, i) => {
              const x = 900 + (i % 3) * 130
              const y = 380 + Math.floor(i / 3) * 130
              const on = range(frame, 25 + i * 8, 45 + i * 8)
              return (
                <g key={c} opacity={on}>
                  <Ring cx={x} cy={y} r={44} color={VIOLET} opacity={0.55} width={1.2} />
                  <text x={x} y={y + 15} textAnchor="middle" fontSize={44} fill={PAPER} fontFamily="'PingFang SC',sans-serif">
                    {c}
                  </text>
                </g>
              )
            })}
            <Tag x={900} y={640} text="五常" color={VIOLET} size={26} />
          </g>
          {/* 恭惟鞠养 */}
          <g opacity={range(frame, 55, 90)}>
            <Figure x={1420} y={700} h={280} color={GREEN} pose={1} />
            <Figure x={1560} y={700} h={340} color={AMBER} />
            <Leader x1={1490} y1={560} x2={1430} y2={470} color={GREEN} />
            <Tag x={1420} y={456} text="夙兴温凊" color={GREEN} size={22} anchor="end" />
            <Tag x={1420} y={420} text="冬温被，夏扇凉" color={GREEN} size={18} anchor="end" opacity={0.75} />
          </g>
          <Readout x={150} y={900} label="性质" value="伦理观念" color={AMBER} size={26} />
        </g>
      ) : null}

      {/* 回声 */}
      {echo ? (
        <g>
          {/* 空谷 */}
          <g opacity={range(frame, 0, 30)}>
            <Poly
              points={[
                [260, 760],
                [420, 470],
                [560, 640],
                [700, 430],
                [860, 660],
                [1000, 500],
                [1160, 740],
              ]}
              color={CYAN}
              opacity={0.45}
              width={1.4}
              fill={alpha('#0a1a30', 0.6)}
            />
            <Figure x={700} y={660} h={200} color={PAPER} />
            <Ripples cx={700} cy={560} count={5} radius={20} step={40} phase={t * 0.5} color={CYAN} opacity={0.6} />
            <Tag x={700} y={300} text="空谷传声" color={CYAN} size={34} anchor="middle" />
            <Tag x={700} y={340} text="比喻有德者的话，即使无人听也会传开" color={PAPER} size={20} anchor="middle" opacity={0.7} />
          </g>
          {/* 虚堂 */}
          <g opacity={range(frame, 35, 70)}>
            <rect x={1240} y={360} width={460} height={340} fill="none" stroke={VIOLET} strokeWidth={1.2} opacity={0.7} />
            <Line x1={1240} y1={700} x2={1700} y2={700} color={VIOLET} width={1} opacity={0.5} />
            <Line x1={1240} y1={360} x2={1700} y2={360} color={VIOLET} width={1} opacity={0.5} />
            <Figure x={1470} y={700} h={220} color={PAPER} />
            {Array.from({ length: 4 }, (_, i) => (
              <Ring
                key={i}
                cx={1470}
                cy={520}
                r={26 + i * 26}
                color={VIOLET}
                opacity={0.4 * Math.max(0, 1 - ((t * 0.6 + i * 0.25) % 1))}
                width={1.3}
              />
            ))}
            <Tag x={1470} y={300} text="虚堂习听" color={VIOLET} size={34} anchor="middle" />
            <Tag x={1470} y={340} text="空堂之中反复听自己的话" color={PAPER} size={20} anchor="middle" opacity={0.7} />
          </g>
          <Tag x={150} y={880} text="先慎独，而后能服人。" color={PAPER} size={26} opacity={0.85} />
        </g>
      ) : null}

      {/* 人际关系 */}
      {relations ? (
        <g>
          <Tag x={150} y={210} text="交友投分，切磨箴规" color={AMBER} size={32} />
          {/* 家族 */}
          <g opacity={range(frame, 0, 35)}>
            <Figure x={420} y={560} h={300} color={AMBER} />
            <Tag x={420} y={600} text="父" color={AMBER} size={26} anchor="middle" />
            <Figure x={300} y={760} h={230} color={GREEN} />
            <Tag x={300} y={800} text="子" color={GREEN} size={24} anchor="middle" />
            <Figure x={540} y={760} h={230} color={GREEN} />
            <Tag x={540} y={800} text="女" color={GREEN} size={24} anchor="middle" />
            <Line x1={420} y1={560} x2={300} y2={760} color={AMBER} width={1.3} opacity={0.7} />
            <Line x1={420} y1={560} x2={540} y2={760} color={AMBER} width={1.3} opacity={0.7} />
            <Tag x={420} y={880} text="资父事君 · 孝当竭力" color={AMBER} size={22} anchor="middle" />
          </g>
          {/* 夫妇 */}
          <g opacity={range(frame, 30, 65)}>
            <Figure x={900} y={560} h={300} color={CYAN} />
            <Figure x={1010} y={560} h={270} color={VIOLET} />
            <Line x1={900} y1={560} x2={1010} y2={560} color={VIOLET} width={1.4} opacity={0.75} />
            <Tag x={955} y={620} text="夫唱妇随" color={VIOLET} size={22} anchor="middle" />
            <Tag x={955} y={880} text="上和下睦 · 诸姑伯叔" color={VIOLET} size={22} anchor="middle" />
          </g>
          {/* 朋友 */}
          <g opacity={range(frame, 60, 95)}>
            {[
              { x: 1330, n: '友' },
              { x: 1490, n: '友' },
              { x: 1630, n: '友' },
            ].map((f, i) => (
              <g key={i}>
                <Figure x={f.x} y={560 + (i % 2) * 30} h={280} color={GREEN} />
                <Tag x={f.x} y={620 + (i % 2) * 30} text={f.n} color={GREEN} size={24} anchor="middle" />
              </g>
            ))}
            <Line x1={1330} y1={560} x2={1490} y2={590} color={GREEN} width={1.2} opacity={0.6} />
            <Line x1={1490} y1={590} x2={1630} y2={560} color={GREEN} width={1.2} opacity={0.6} />
            <Line x1={1330} y1={560} x2={1630} y2={560} color={GREEN} width={0.8} opacity={0.35} dash="4 6" />
            <Tag x={1490} y={880} text="孔怀兄弟，同气连枝" color={GREEN} size={22} anchor="middle" />
          </g>
          <Readout x={150} y={300} label="关系" value="人伦" color={AMBER} size={24} />
        </g>
      ) : null}

      {/* 进退 */}
      {retreat ? (
        <g>
          <Tag x={150} y={210} text="两疏见机，解组谁逼" color={CYAN} size={32} />
          {/* 官署 */}
          <g opacity={range(frame, 0, 35)}>
            <rect x={180} y={330} width={380} height={300} fill="none" stroke={VIOLET} strokeWidth={1.2} opacity={0.65} />
            <Tag x={370} y={400} text="朝" color={VIOLET} size={44} anchor="middle" opacity={0.8} />
            <Figure x={370} y={630} h={230} color={VIOLET} />
          </g>
          {/* 走向山林 */}
          <g opacity={range(frame, 30, 70)}>
            <Poly
              points={[
                [760, 760],
                [900, 540],
                [1050, 700],
                [1200, 500],
                [1360, 720],
                [1500, 560],
                [1700, 760],
              ]}
              color={GREEN}
              opacity={0.4}
              width={1.3}
              fill={alpha('#0c2418', 0.6)}
            />
            <Figure x={820} y={700} h={200} color={GREEN} pose={2} />
            <Tag x={820} y={740} text="二疏" color={GREEN} size={22} anchor="middle" />
            {/* 印绶：解组 */}
            <g opacity={range(frame, 55, 85)}>
              <rect x={620} y={470} width={30} height={44} rx={4} fill="none" stroke={AMBER} strokeWidth={1.3} opacity={0.9} />
              <Line x1={620} y1={470} x2={650} y2={470} color={AMBER} width={1.3} opacity={0.9} />
              <Tag x={596} y={546} text="解组" color={AMBER} size={22} anchor="end" />
            </g>
            {/* 茅舍 */}
            <g opacity={range(frame, 70, 100)}>
              <Poly points={[[1500, 640], [1580, 560], [1660, 640]]} color={AMBER} opacity={0.85} width={1.5} fill={alpha('#2a2010', 0.8)} />
              <Line x1={1510} y1={640} x2={1510} y2={720} color={AMBER} width={1.3} opacity={0.7} />
              <Line x1={1650} y1={640} x2={1650} y2={720} color={AMBER} width={1.3} opacity={0.7} />
              <Tag x={1580} y={760} text="索居闲处，沉默寂寥" color={AMBER} size={20} anchor="middle" opacity={0.85} />
            </g>
          </g>
          <Tag x={180} y={760} text="西汉疏广、疏昌父子，世称「二疏」" color={PAPER} size={22} opacity={0.8} />
          <Tag x={180} y={800} text="乞骸骨归乡里 —— 主动去官，不必人迫" color={PAPER} size={20} opacity={0.6} />
        </g>
      ) : null}
    </g>
  )
}
