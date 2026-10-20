/**
 * 第一幕：天地时序。
 *
 * 四张图，全部按真实材料画：
 *   starmap  二十八宿星图（东方苍龙、北方玄武、西方白虎、南方朱雀）
 *   sunmoon  日月的轨道与盈亏
 *   seasons  二十四节气盘 + 置闰（回归年 365.2422 日 / 朔望月 29.5306 日）
 *   pipes    十二律管
 */
import { CYAN, AMBER, GREEN, PAPER, VIOLET } from '../../viz/palette'
import { Grid, Leader, Line, Poly, Readout, Ring, Tag } from '../../viz/parts'
import { range } from '../../lib/easing'
import { mulberry32 } from '../../lib/rng'
import type { SceneProps } from './shared'

/** 二十八宿：四象各七宿 */
const MANSIONS: Array<{ name: string; color: string; star: [number, number][] }> = [
  {
    name: '东方苍龙',
    color: '#6fe3d0',
    star: [
      [0.5, 0.06],
      [0.72, 0.14],
      [0.86, 0.28],
      [0.8, 0.46],
      [0.62, 0.55],
      [0.38, 0.48],
      [0.2, 0.3],
    ],
  },
  {
    name: '北方玄武',
    color: '#6aa8ff',
    star: [
      [0.12, 0.56],
      [0.2, 0.7],
      [0.34, 0.8],
      [0.52, 0.82],
      [0.68, 0.74],
      [0.8, 0.6],
      [0.86, 0.44],
    ],
  },
  {
    name: '西方白虎',
    color: '#ffc978',
    star: [
      [0.5, 0.94],
      [0.28, 0.86],
      [0.14, 0.72],
      [0.2, 0.54],
      [0.38, 0.45],
      [0.62, 0.45],
      [0.8, 0.54],
    ],
  },
  {
    name: '南方朱雀',
    color: '#b48cff',
    star: [
      [0.88, 0.16],
      [0.8, 0.32],
      [0.66, 0.42],
      [0.5, 0.38],
      [0.34, 0.42],
      [0.2, 0.54],
      [0.14, 0.7],
    ],
  },
]

const MANG_NAMES = ['角', '亢', '氐', '房', '心', '尾', '箕']

const TERMS = [
  '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒',
]

const LÜ = [
  '黄钟', '大吕', '太簇', '夹钟', '姑洗', '仲吕',
  '蕤宾', '林钟', '夷则', '南吕', '无射', '应钟',
]

const CX = 960
const CY = 560

export function CosmosScene({ frame, beat, progress }: SceneProps) {
  const t = frame / 30
  const open = beat === 0
  const starmap = beat === 1
  const sunmoon = beat === 2
  const seasons = beat === 3
  const pipes = beat === 4

  const spin = starmap ? (progress - 0.5) * 0.12 : 0
  const fade = (on: boolean) => (on ? 1 : 0)

  return (
    <g>
      <Grid x={60} y={150} w={1800} h={820} step={60} opacity={0.06} />

      {/* 天球与赤道 */}
      <g opacity={0.5 + 0.5 * fade(starmap)}>
        <Ring cx={CX} cy={CY} r={392} color={CYAN} opacity={0.16} width={0.8} />
        <Ring cx={CX} cy={CY} r={300} color={CYAN} opacity={0.12} width={0.8} />
        <ellipse cx={CX} cy={CY} rx={392} ry={118} fill="none" stroke={CYAN} strokeWidth={0.9} opacity={0.28} />
        <ellipse
          cx={CX}
          cy={CY}
          rx={392}
          ry={118}
          fill="none"
          stroke={VIOLET}
          strokeWidth={0.9}
          opacity={0.22}
          transform={'rotate(-24 ' + CX + ' ' + CY + ')'}
        />
        <Line x1={CX - 430} y1={CY} x2={CX + 430} y2={CY} color={CYAN} width={0.6} opacity={0.2} />
        <Tag x={CX + 400} y={CY - 8} text="CELESTIAL SPHERE" color={CYAN} size={16} opacity={0.5} anchor="end" />
      </g>

      {/* 二十八宿 */}
      <g opacity={fade(starmap)} transform={'rotate(' + (spin * 57.3).toFixed(2) + ' ' + CX + ' ' + CY + ')'}>
        {MANSIONS.map((m, mi) => {
          const rand = mulberry32(1000 + mi * 77)
          const pts = m.star.map((p) => [CX + (p[0] - 0.5) * 780, CY + (p[1] - 0.5) * 700] as [number, number])
          const on = range(frame, 0, 40) * 1
          return (
            <g key={m.name} opacity={on}>
              <Poly points={pts} color={m.color} opacity={0.5} width={1.3} />
              {pts.map((p, i) => {
                const r = 3 + rand() * 3.4
                return (
                  <g key={i}>
                    <circle cx={p[0]} cy={p[1]} r={r} fill={m.color} opacity={0.95} />
                    <circle cx={p[0]} cy={p[1]} r={r * 3} fill={m.color} opacity={0.1} />
                    <text
                      x={p[0]}
                      y={p[1] - 16}
                      textAnchor="middle"
                      fontSize={19}
                      fill={m.color}
                      opacity={0.85}
                      fontFamily="'PingFang SC',sans-serif"
                    >
                      {MANG_NAMES[i]}
                    </text>
                  </g>
                )
              })}
              <Tag
                x={pts[0][0] + (mi < 2 ? -70 : 30)}
                y={pts[0][1] - 44}
                text={m.name}
                color={m.color}
                size={20}
                anchor={mi < 2 ? 'end' : 'start'}
              />
            </g>
          )
        })}
      </g>

      {/* 日月 */}
      {sunmoon ? (
        <g>
          <Ring cx={CX} cy={CY} r={250} color={AMBER} opacity={0.22} width={0.9} />
          <Ring cx={CX} cy={CY} r={186} color={CYAN} opacity={0.22} width={0.9} />
          {/* 太阳 */}
          <circle
            cx={CX + Math.cos(t * 0.5) * 250}
            cy={CY + Math.sin(t * 0.5) * 250}
            r={17}
            fill={AMBER}
            opacity={0.95}
          />
          <circle cx={CX + Math.cos(t * 0.5) * 250} cy={CY + Math.sin(t * 0.5) * 250} r={40} fill={AMBER} opacity={0.11} />
          {/* 月亮：相位由角度决定 */}
          {Array.from({ length: 8 }, (_, k) => {
            const a = t * 0.5 + (k / 8) * Math.PI * 2
            const mx = CX + Math.cos(a) * 186
            const my = CY + Math.sin(a) * 186
            const phase = Math.cos(a - t * 0.5)
            // 相位：亮面用一个偏移的椭圆裁切表示
            const k1 = Math.abs(phase)
            return (
              <g key={k}>
                <circle cx={mx} cy={my} r={10} fill={CYAN} opacity={0.14 + k1 * 0.75} />
                {k1 < 0.995 ? (
                  <path
                    d={
                      'M ' +
                      mx +
                      ' ' +
                      (my - 10) +
                      ' A 10 10 0 0 1 ' +
                      mx +
                      ' ' +
                      (my + 10) +
                      ' A ' +
                      (10 * k1).toFixed(2) +
                      ' 10 0 0 ' +
                      (phase > 0 ? '1' : '0') +
                      ' ' +
                      mx +
                      ' ' +
                      (my - 10) +
                      ' Z'
                    }
                    fill={CYAN}
                    opacity={0.9}
                  />
                ) : null}
              </g>
            )
          })}
          <Tag x={CX + 262} y={CY - 14} text="SUN · 日" color={AMBER} size={20} />
          <Tag x={CX + 198} y={CY - 14} text="MOON · 月" color={CYAN} size={20} anchor="end" />
          <Readout x={170} y={820} label="PHASE" value="盈 → 昃 → 亏" color={CYAN} size={26} />
        </g>
      ) : null}

      {/* 二十四节气 */}
      {seasons ? (
        <g>
          <Ring cx={CX} cy={CY} r={330} color={GREEN} opacity={0.28} width={1} />
          <Ring cx={CX} cy={CY} r={296} color={GREEN} opacity={0.14} width={0.8} />
          {TERMS.map((name, i) => {
            const a = (i / 24) * Math.PI * 2 - Math.PI / 2
            const x = CX + Math.cos(a) * 330
            const y = CY + Math.sin(a) * 330
            const season = Math.floor(i / 6)
            const col = [GREEN, CYAN, AMBER, VIOLET][season]
            const on = range(frame, i * 4, i * 4 + 18)
            return (
              <g key={name} opacity={on}>
                <circle cx={x} cy={y} r={3.4} fill={col} opacity={0.9} />
                <text
                  x={x}
                  y={y - 12}
                  textAnchor="middle"
                  fontSize={17}
                  fill={col}
                  opacity={0.85}
                  fontFamily="'PingFang SC',sans-serif"
                >
                  {name}
                </text>
              </g>
            )
          })}
          {/* 回归年与朔望月的差 */}
          <g opacity={range(frame, 40, 80)}>
            <Ring cx={CX} cy={CY} r={214} color={AMBER} opacity={0.5} width={1.6} />
            <Ring cx={CX} cy={CY} r={188} color={AMBER} opacity={0.22} width={0.8} />
            <Tag x={CX} y={CY - 226} text="回归年 365.2422 日" color={AMBER} size={22} anchor="middle" />
            <Tag x={CX} y={CY - 202} text="朔望月 29.5306 日" color={AMBER} size={22} anchor="middle" opacity={0.8} />
            <Tag x={CX} y={CY + 12} text="19 年 = 7 闰" color={PAPER} size={30} anchor="middle" opacity={0.9} />
            <Tag x={CX} y={CY + 48} text="闰余成岁" color={PAPER} size={26} anchor="middle" opacity={0.7} />
          </g>
        </g>
      ) : null}

      {/* 十二律 */}
      {pipes ? (
        <g>
          <Ring cx={CX} cy={CY} r={268} color={VIOLET} opacity={0.3} width={1} />
          {LÜ.map((name, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2
            const x = CX + Math.cos(a) * 268
            const y = CY + Math.sin(a) * 268
            const h = 46 + (i % 3) * 13
            const on = range(frame, i * 5, i * 5 + 18)
            return (
              <g key={name} opacity={on}>
                <rect
                  x={x - 7}
                  y={y - h / 2}
                  width={14}
                  height={h}
                  rx={6}
                  fill="none"
                  stroke={VIOLET}
                  strokeWidth={1.4}
                  opacity={0.85}
                />
                <text
                  x={x}
                  y={y - h / 2 - 12}
                  textAnchor="middle"
                  fontSize={19}
                  fill={VIOLET}
                  opacity={0.9}
                  fontFamily="'PingFang SC',sans-serif"
                >
                  {name}
                </text>
                <text
                  x={x}
                  y={y + h / 2 + 22}
                  textAnchor="middle"
                  fontSize={15}
                  fill={PAPER}
                  opacity={0.55}
                  fontFamily="'SFMono-Regular',monospace"
                >
                  {['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'][i]}月
                </text>
              </g>
            )
          })}
          <Tag x={CX} y={CY - 20} text="律吕调阳" color={PAPER} size={42} anchor="middle" />
          <Tag x={CX} y={CY + 22} text="十二律管与节令相配" color={VIOLET} size={20} anchor="middle" />
        </g>
      ) : null}

      {/* 开场 */}
      {open ? (
        <g opacity={range(frame, 0, 24)}>
          <Leader x1={CX} y1={CY} x2={CX + 200} y2={CY - 200} color={CYAN} />
          <Tag x={CX + 210} y={CY - 206} text="辰宿列张" color={CYAN} size={28} />
        </g>
      ) : null}
    </g>
  )
}
