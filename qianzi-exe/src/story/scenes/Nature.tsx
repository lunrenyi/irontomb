/**
 * 第二幕：山川草木。
 *
 *   weather  云腾致雨 / 露结为霜
 *   terrain  程序化山脉剖面 + 江河 + 关隘湖泊
 *   water    海咸河淡：盐度与淡水的粒子流
 *   plants   草木生长、落叶、大鹏高飞
 */
import { CYAN, GREEN, AMBER, PAPER, VIOLET, alpha } from '../../viz/palette'
import { Grid, Leader, Line, Poly, Readout, ridgePoints, Tag } from '../../viz/parts'
import { easeOut, range } from '../../lib/easing'
import { mulberry32 } from '../../lib/rng'
import type { SceneProps } from './shared'

const HORIZON = 660

export function NatureScene({ frame, beat }: SceneProps) {
  const t = frame / 30
  const weather = beat === 1
  const terrain = beat === 2
  const water = beat === 3
  const plants = beat === 4


  return (
    <g>
      <Grid x={60} y={150} w={1800} h={780} step={60} opacity={0.05} />

      {/* 地平线与地表 */}
      <g opacity={0.6}>
        <Line x1={120} y1={HORIZON} x2={1800} y2={HORIZON} color={CYAN} width={0.8} opacity={0.3} />
        <Tag x={1800} y={HORIZON - 12} text="地平面" color={CYAN} size={20} anchor="end" opacity={0.5} />
      </g>

      {/* 山脉：程序化剖面 */}
      <g opacity={terrain || plants ? 1 : 0.25}>
        {(() => {
          const far = ridgePoints(60, 1860, HORIZON - 40, 250, 4242, 160, 4, 2.6, false)
          const near = ridgePoints(60, 1860, HORIZON + 70, 430, 9111, 170, 5, 4.4, true)
          // 山要有面积：把折线闭合到基线，否则 fill 画不出东西
          const closed = (pts: Array<[number, number]>, base: number) =>
            pts.concat([
              [pts[pts.length - 1][0], base],
              [pts[0][0], base],
            ])
          return (
            <g>
              <Poly points={closed(far, HORIZON + 10)} color={VIOLET} opacity={0.32} width={1} fill={alpha('#16264a', 0.75)} />
              <Poly points={closed(near, HORIZON + 70)} color={GREEN} opacity={0.5} width={1.3} fill={alpha('#0c2a20', 0.8)} />
              {/* 山脊上的关隘与湖泊标注 */}
              {[
                { x: 430, name: '雁门关', kind: 'pass' },
                { x: 760, name: '巨野泽', kind: 'lake' },
                { x: 1120, name: '云亭', kind: 'peak' },
                { x: 1460, name: '碣石', kind: 'peak' },
                { x: 1680, name: '鸡鸣山', kind: 'pass' },
              ].map((m, i) => {
                const on = range(frame, 20 + i * 8, 40 + i * 8)
                // 引线要落到真正的山脊上，不能指到空气里
                let y = HORIZON - 100
                let best = 1e9
                for (const pt of near) {
                  const d = Math.abs(pt[0] - m.x)
                  if (d < best) {
                    best = d
                    y = pt[1]
                  }
                }
                return (
                  <g key={m.name} opacity={on}>
                    <Leader x1={m.x} y1={y + 6} x2={m.x + 30} y2={y - 78} color={AMBER} />
                    <Tag x={m.x + 38} y={y - 82} text={m.name} color={AMBER} size={19} />
                    {m.kind === 'lake' ? (
                      <ellipse cx={m.x} cy={HORIZON + 40} rx={78} ry={12} fill={alpha(CYAN, 0.3)} stroke={CYAN} strokeWidth={0.8} />
                    ) : null}
                  </g>
                )
              })}
              <Tag x={180} y={HORIZON - 300} text="旷远绵邈，岩岫杳冥" color={GREEN} size={26} opacity={0.8} />
              <Tag x={180} y={HORIZON - 262} text="岳宗泰岱 · 雁门紫塞 · 鸡田赤城" color={PAPER} size={20} opacity={0.6} />
            </g>
          )
        })()}
      </g>

      {/* 天气：云、雨、霜 */}
      {weather ? (
        <g>
          {/* 云：几团由噪声轮廓组成的积云 */}
          {[
            { x: 520, y: 300, s: 1 },
            { x: 1180, y: 250, s: 1.35 },
            { x: 1560, y: 380, s: 0.8 },
          ].map((c, ci) => {
            const drift = ((t * 14 + ci * 120) % 2100) - 150
            const rand2 = mulberry32(500 + ci * 31)
            const pts: Array<[number, number]> = []
            const N = 46
            for (let k = 0; k <= N; k += 1) {
              const a = (k / N) * Math.PI * 2
              const bump = 1 + 0.26 * Math.sin(a * 5 + ci) + 0.14 * Math.sin(a * 11 + rand2() * 0.1)
              pts.push([c.x + drift + Math.cos(a) * 150 * c.s * bump, c.y + Math.sin(a) * 52 * c.s * bump])
            }
            return (
              <g key={ci} opacity={0.5}>
                <Poly points={pts} color={CYAN} opacity={0.35} width={1.1} fill={alpha('#16264a', 0.55)} />
              </g>
            )
          })}
          {/* 雨 */}
          {Array.from({ length: 130 }, (_, i) => {
            const x = 160 + ((i * 137) % 1700) + ((t * 40) % 24)
            const y = 380 + (((i * 211) % 300) + t * 420) % 300
            const on = range(frame, 10, 40)
            return <Line key={i} x1={x} y1={y} x2={x - 4} y2={y + 18} color={CYAN} width={1} opacity={on * 0.5} />
          })}
          {/* 霜：地面上的结晶 */}
          {Array.from({ length: 46 }, (_, i) => {
            const x = 150 + (i * 173) % 1620
            const y = HORIZON + 60 + (i * 97) % 120
            const s = 3 + (i % 4) * 2
            const on = range(frame, 40, 80)
            const a = (i * 0.7) % 1
            const arms = 6
            return (
              <g key={i} opacity={on * 0.7}>
                {Array.from({ length: arms }, (_, k) => {
                  const ang = (k / arms) * Math.PI * 2 + a * 3
                  return (
                    <Line
                      key={k}
                      x1={x}
                      y1={y}
                      x2={x + Math.cos(ang) * s}
                      y2={y + Math.sin(ang) * s}
                      color={CYAN}
                      width={0.8}
                    />
                  )
                })}
              </g>
            )
          })}
          <Tag x={140} y={200} text="云腾致雨" color={CYAN} size={30} />
          <Tag x={140} y={236} text="露结为霜" color={CYAN} size={30} opacity={0.8} />
          <Readout x={1500} y={880} label="霜" value="直接结晶" color={CYAN} size={24} />
          <Readout x={1500} y={960} label="露" value="凝结成滴" color={CYAN} size={24} />
        </g>
      ) : null}

      {/* 水：海与河 */}
      {water ? (
        <g>
          {/* 海 */}
          <g opacity={range(frame, 0, 30)}>
            <path
              d={'M 120 ' + (HORIZON + 70) + ' Q 420 ' + (HORIZON + 40) + ' 720 ' + (HORIZON + 72) + ' L 720 ' + (HORIZON + 200) + ' L 120 ' + (HORIZON + 200) + ' Z'}
              fill={alpha('#0a2a3c', 0.8)}
              stroke={CYAN}
              strokeWidth={0.8}
              opacity={0.8}
            />
            {/* 盐分粒子 */}
            {Array.from({ length: 60 }, (_, i) => {
              const x = 150 + (i * 97) % 540
              const y = HORIZON + 80 + ((i * 53) % 110)
              const ph = (t * 0.5 + i * 0.1) % 1
              return <circle key={i} cx={x} cy={y} r={1.8} fill={AMBER} opacity={0.35 + 0.4 * (1 - ph)} />
            })}
            <Tag x={160} y={HORIZON + 108} text="海 · 咸" color={AMBER} size={26} />
            <Readout x={170} y={HORIZON + 140} label="盐度" value="溶解 + 蒸发" color={AMBER} size={22} />
          </g>
          {/* 河 */}
          <g opacity={range(frame, 20, 50)}>
            <path
              d={'M 1180 ' + (HORIZON - 190) + ' C 1220 ' + (HORIZON - 80) + ' 1120 ' + (HORIZON - 10) + ' 1210 ' + (HORIZON + 60) + ' S 1420 ' + (HORIZON + 150) + ' 1520 ' + (HORIZON + 230)}
              fill="none"
              stroke={CYAN}
              strokeWidth={3}
              opacity={0.5}
            />
            {Array.from({ length: 24 }, (_, i) => {
              const k = ((t * 0.22 + i / 24) % 1)
              // 沿贝塞尔近似取点
              const p0 = [1180, HORIZON - 190]
              const p1 = [1220, HORIZON - 80]
              const p2 = [1120, HORIZON - 10]
              const p3 = [1210, HORIZON + 60]
              const q0 = [1210, HORIZON + 60]
              const q1 = [1330, HORIZON + 120]
              const q2 = [1420, HORIZON + 150]
              const q3 = [1520, HORIZON + 230]
              const u = 1 - k
              let x: number
              let y: number
              if (k < 0.5) {
                const s = k * 2
                x = u * u * u * p0[0] + 3 * u * u * s * p1[0] + 3 * u * s * s * p2[0] + s * s * s * p3[0]
                y = u * u * u * p0[1] + 3 * u * u * s * p1[1] + 3 * u * s * s * p2[1] + s * s * s * p3[1]
              } else {
                const s = (k - 0.5) * 2
                const w = 1 - s
                x = w * w * w * q0[0] + 3 * w * w * s * q1[0] + 3 * w * s * s * q2[0] + s * s * s * q3[0]
                y = w * w * w * q0[1] + 3 * w * w * s * q1[1] + 3 * w * s * s * q2[1] + s * s * s * q3[1]
              }
              return <circle key={i} cx={x} cy={y} r={2.6} fill={PAPER} opacity={0.7} />
            })}
            <Tag x={1240} y={HORIZON - 210} text="河 · 淡" color={CYAN} size={26} />
          </g>
          {/* 鳞潜羽翔 */}
          <g opacity={range(frame, 45, 75)}>
            {Array.from({ length: 5 }, (_, i) => {
              const x = 300 + i * 60
              const y = HORIZON + 150 + Math.sin(t * 1.6 + i) * 16
              return (
                <g key={i}>
                  <path
                    d={'M ' + x + ' ' + y + ' q 22 -14 44 0 q -22 14 -44 0 Z'}
                    fill={alpha(GREEN, 0.6)}
                    stroke={GREEN}
                    strokeWidth={0.7}
                  />
                </g>
              )
            })}
            {Array.from({ length: 4 }, (_, i) => {
              const x = 1300 + i * 70
              const y = 420 + Math.sin(t * 2.2 + i) * 40
              return (
                <g key={i}>
                  <path
                    d={'M ' + x + ' ' + y + ' q 18 -20 6 -34 q 22 14 34 4 q -4 22 -20 30 Z'}
                    fill={alpha(CYAN, 0.55)}
                    stroke={CYAN}
                    strokeWidth={0.7}
                  />
                </g>
              )
            })}
            <Tag x={300} y={HORIZON + 220} text="鳞潜羽翔" color={GREEN} size={26} />
          </g>
        </g>
      ) : null}

      {/* 草木 */}
      {plants ? (
        <g>
          {/* 荷 */}
          <g opacity={range(frame, 0, 40)}>
            <Line x1={420} y1={HORIZON + 120} x2={420} y2={HORIZON + 30} color={GREEN} width={1.6} opacity={0.7} />
            <ellipse cx={398} cy={HORIZON + 46} rx={34} ry={11} fill={alpha(GREEN, 0.3)} stroke={GREEN} strokeWidth={0.9} />
            <ellipse cx={420} cy={HORIZON + 24} rx={14} ry={22} fill={alpha('#ff9d6b', 0.45)} stroke={AMBER} strokeWidth={0.9} />
            <Tag x={460} y={HORIZON + 40} text="渠荷的历" color={GREEN} size={24} />
          </g>
          {/* 园莽抽条 */}
          <g opacity={range(frame, 25, 65)}>
            {[
              { x: 700, h: 150, name: '枇杷' },
              { x: 800, h: 110, name: '梧桐' },
            ].map((tree, ti) => {
              const grow = easeOut(range(frame, 25 + ti * 20, 25 + ti * 20 + 40))
              const hh = tree.h * grow
              return (
                <g key={tree.name}>
                  <Line x1={tree.x} y1={HORIZON + 100} x2={tree.x} y2={HORIZON + 100 - hh} color={ti ? AMBER : GREEN} width={2.4} opacity={0.7} />
                  {Array.from({ length: 7 }, (_, k) => {
                    const a = -Math.PI / 2 + (k - 3) * 0.42
                    const l = (46 + (k % 3) * 14) * grow
                    return (
                      <Line
                        key={k}
                        x1={tree.x}
                        y1={HORIZON + 100 - hh}
                        x2={tree.x + Math.cos(a) * l}
                        y2={HORIZON + 100 - hh + Math.sin(a) * l}
                        color={ti ? AMBER : GREEN}
                        width={1.3}
                        opacity={0.6}
                      />
                    )
                  })}
                  <Tag x={tree.x + 20} y={HORIZON + 100 - hh - 30} text={tree.name} color={ti ? AMBER : GREEN} size={20} />
                </g>
              )
            })}
          </g>
          {/* 落叶飘摇 */}
          <g opacity={range(frame, 60, 95)}>
            {Array.from({ length: 22 }, (_, i) => {
              const x = 640 + (i * 83) % 640 + Math.sin(t * 1.2 + i) * 40
              const y = HORIZON - 120 + ((i * 47) % 220) + (t * 26) % 220
              const r = (t * 2 + i) % (Math.PI * 2)
              return (
                <ellipse
                  key={i}
                  cx={x}
                  cy={y}
                  rx={7}
                  ry={3}
                  fill={AMBER}
                  opacity={0.65}
                  transform={'rotate(' + ((r * 57.3) % 360).toFixed(0) + ' ' + x + ' ' + y + ')'}
                />
              )
            })}
            <Tag x={1500} y={HORIZON - 130} text="落叶飘摇" color={AMBER} size={24} />
          </g>
          {/* 游鹍独运 */}
          <g opacity={range(frame, 85, 120)}>
            {Array.from({ length: 3 }, (_, i) => {
              const k = ((t * 0.3 + i / 3) % 1)
              const x = 300 + k * 1400
              const y = 500 - k * 340 + Math.sin(k * 9 + i) * 26
              const s = 1 + k * 1.4
              return (
                <g key={i} transform={'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ' scale(' + s.toFixed(2) + ')'}>
                  <path d="M 0 0 q 26 -26 58 -8 q -22 30 -58 8 Z" fill={alpha(CYAN, 0.6)} stroke={CYAN} strokeWidth={1} />
                  <path d="M 0 0 q -24 -18 -50 -4 q 20 20 50 4 Z" fill={alpha(CYAN, 0.35)} stroke={CYAN} strokeWidth={0.8} />
                </g>
              )
            })}
            <Tag x={300} y={210} text="游鹍独运，凌摩绛霄" color={CYAN} size={28} />
          </g>
        </g>
      ) : null}
    </g>
  )
}
