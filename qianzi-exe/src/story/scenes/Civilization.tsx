/**
 * 第三幕：文字与制度。
 *
 *   writing  字的演变（甲骨 → 金文 → 小篆 → 隶书）+ 典籍
 *   capital  东西二京：洛阳与长安的城郭、宫室与门
 *   history  时间轴：虚线是传说，实线是信史
 *   law      礼乐与刑名：钟组、律令与等级
 */
import { AMBER, CYAN, GREEN, PAPER, VIOLET, alpha } from '../../viz/palette'
import { Grid, Line, Readout, Ring, Tag } from '../../viz/parts'
import { range } from '../../lib/easing'
import type { SceneProps } from './shared'


/** 历史轴上的节点：legend = 传说，record = 信史 */
const HISTORY: Array<{ name: string; x: number; legend: boolean; note: string }> = [
  { name: '龙师火帝', x: 80, legend: true, note: '上古图腾首领' },
  { name: '陶唐有虞', x: 200, legend: true, note: '尧舜' },
  { name: '周发殷汤', x: 360, legend: false, note: '商汤、周武王' },
  { name: '奄宅曲阜', x: 520, legend: false, note: '周公营曲阜' },
  { name: '桓公匡合', x: 660, legend: false, note: '齐桓公首霸' },
  { name: '践土会盟', x: 790, legend: false, note: '晋侯会盟诸侯' },
  { name: '起翦颇牧', x: 930, legend: false, note: '战国四名将' },
  { name: '百郡秦并', x: 1120, legend: false, note: '前 221 年' },
  { name: '汉惠武丁', x: 1300, legend: false, note: '汉与商' },
  { name: '蔡邕鸿都', x: 1480, legend: false, note: '后汉' },
]

export function CivilizationScene({ frame, beat }: SceneProps) {
  const writing = beat === 1
  const capital = beat === 2
  const history = beat === 3
  const law = beat === 4

  return (
    <g>
      <Grid x={60} y={150} w={1800} h={800} step={60} opacity={0.05} />

      {/* 文字 */}
      {writing ? (
        <g>
          <Tag x={150} y={200} text="字形演变" color={VIOLET} size={26} />
          {[
            { ch: '文', era: '甲骨文', t: 0 },
            { ch: '字', era: '金文', t: 1 },
            { ch: '書', era: '小篆', t: 2 },
            { ch: '书', era: '隶书', t: 3 },
          ].map((s, i) => {
            const on = range(frame, 10 + i * 22, 34 + i * 22)
            const x = 220 + i * 200
            return (
              <g key={s.era} opacity={on}>
                <Ring cx={x} cy={380} r={72} color={VIOLET} opacity={0.28} width={1} />
                <text
                  x={x}
                  y={382}
                  textAnchor="middle"
                  fontSize={78}
                  fill={PAPER}
                  fontFamily={i === 1 ? "'Songti SC','Noto Serif CJK SC',serif" : "'PingFang SC',sans-serif"}
                >
                  {s.ch}
                </text>
                <Tag x={x} y={490} text={s.era} color={VIOLET} size={20} anchor="middle" />
                {i < 3 ? (
                  <Line x1={x + 78} y1={380} x2={x + 122} y2={380} color={VIOLET} width={1} opacity={0.4} dash="4 6" />
                ) : null}
              </g>
            )
          })}
          <Tag x={150} y={200 + 560} text="杜稿钟隶，漆书壁经" color={PAPER} size={34} />
          <Tag x={150} y={200 + 604} text="杜度草书 · 钟繇隶书 · 漆写的书 · 墙上的经文" color={VIOLET} size={22} opacity={0.75} />
          <Readout x={1180} y={620} label="EARLIEST MATURE SCRIPT" value="商代甲骨文" color={AMBER} size={26} />
          <Readout x={1180} y={760} label="NOT A RECORD" value="始制文字 = 传说" color={AMBER} size={24} />
        </g>
      ) : null}

      {/* 都邑 */}
      {capital ? (
        <g>
          {[
            { name: '洛阳', x: 520, sub: '背邙面洛', w: 320 },
            { name: '长安', x: 1340, sub: '浮渭据泾', w: 320 },
          ].map((city, ci) => {
            const on = range(frame, 10 + ci * 20, 40 + ci * 20)
            const y = 520
            return (
              <g key={city.name} opacity={on}>
                {/* 城墙 */}
                <rect x={city.x - city.w / 2} y={y} width={city.w} height={140} fill="none" stroke={VIOLET} strokeWidth={1.6} opacity={0.75} />
                {/* 城门 */}
                <rect x={city.x - 26} y={y + 96} width={52} height={44} fill="none" stroke={AMBER} strokeWidth={1.6} opacity={0.9} />
                {/* 宫室 */}
                <rect x={city.x - 92} y={y - 96} width={184} height={96} fill={alpha('#241a44', 0.7)} stroke={VIOLET} strokeWidth={1.2} opacity={0.9} />
                <rect x={city.x - 52} y={y - 140} width={104} height={44} fill="none" stroke={VIOLET} strokeWidth={1} opacity={0.6} />
                <Tag x={city.x} y={y + 184} text={city.name} color={PAPER} size={30} anchor="middle" />
                <Tag x={city.x} y={y + 216} text={city.sub} color={AMBER} size={20} anchor="middle" opacity={0.8} />
                {/* 宫室两侧的殿 */}
                <rect x={city.x - 168} y={y - 40} width={64} height={40} fill="none" stroke={VIOLET} strokeWidth={0.9} opacity={0.5} />
                <rect x={city.x + 104} y={y - 40} width={64} height={40} fill="none" stroke={VIOLET} strokeWidth={0.9} opacity={0.5} />
              </g>
            )
          })}
          {/* 槐树：路侠槐卿 */}
          <g opacity={range(frame, 50, 80)}>
            {Array.from({ length: 8 }, (_, i) => {
              const x = 800 + i * 40
              return (
                <g key={i}>
                  <Line x1={x} y1={700} x2={x} y2={660} stroke={GREEN} width={1.4} opacity={0.6} />
                  <circle cx={x} cy={652} r={11} fill={alpha(GREEN, 0.25)} stroke={GREEN} strokeWidth={0.7} />
                </g>
              )
            })}
            <Tag x={800} y={730} text="路侠槐卿 · 冠盖往来" color={GREEN} size={22} />
          </g>
          <Tag x={150} y={230} text="宫殿盘郁，楼观飞惊" color={PAPER} size={30} />
          <Tag x={150} y={272} text="右通广内，左达承明；丙舍傍启，甲帐对楹" color={VIOLET} size={22} opacity={0.8} />
        </g>
      ) : null}

      {/* 历史 */}
      {history ? (
        <g>
          <Tag x={150} y={210} text="虚线 = 传说 · 实线 = 信史" color={AMBER} size={24} />
          <Line x1={120} y1={520} x2={1800} y2={520} color={PAPER} width={1.4} opacity={0.4} />
          {HISTORY.map((h, i) => {
            const on = range(frame, 8 + i * 12, 26 + i * 12)
            const color = h.legend ? VIOLET : CYAN
            return (
              <g key={h.name} opacity={on}>
                <Line
                  x1={h.x}
                  y1={520}
                  x2={h.x}
                  y2={520 - 46}
                  color={color}
                  width={1.4}
                  dash={h.legend ? '5 6' : undefined}
                />
                <circle cx={h.x} cy={520} r={5} fill={color} opacity={0.95} />
                <text
                  x={h.x}
                  y={520 - 60}
                  textAnchor="middle"
                  fontSize={20}
                  fill={h.legend ? VIOLET : PAPER}
                  fontFamily="'PingFang SC',sans-serif"
                >
                  {h.name}
                </text>
                <text
                  x={h.x}
                  y={520 - 88}
                  textAnchor="middle"
                  fontSize={15}
                  fill={color}
                  opacity={0.75}
                  fontFamily="'PingFang SC',sans-serif"
                >
                  {h.note}
                </text>
              </g>
            )
          })}
          <Tag x={150} y={640} text="周发殷汤" color={PAPER} size={30} />
          <Tag x={150} y={682} text="磻溪伊尹，佐时阿衡" color={CYAN} size={22} opacity={0.85} />
          <Tag x={150} y={722} text="桓公匡合，济弱扶倾" color={CYAN} size={22} opacity={0.85} />
          <Tag x={150} y={762} text="假途灭虢，践土会盟" color={CYAN} size={22} opacity={0.85} />
          <Tag x={150} y={802} text="九州禹迹，百郡秦并" color={CYAN} size={22} opacity={0.85} />
          <Readout x={1300} y={700} label="QIN UNIFICATION" value="前 221" color={AMBER} size={28} unit="年" />
          <Readout x={1300} y={830} label="COMMANDERIES" value="36" color={AMBER} size={28} unit="郡" />
        </g>
      ) : null}

      {/* 礼乐与律令 */}
      {law ? (
        <g>
          {/* 钟：礼乐 */}
          <g opacity={range(frame, 0, 40)}>
            {[0, 1, 2].map((i) => {
              const x = 330 + i * 150
              const h = 110 + i * 22
              return (
                <g key={i}>
                  <path
                    d={'M ' + (x - 42) + ' ' + 520 + ' L ' + (x - 30) + ' ' + (520 - h) + ' L ' + (x + 30) + ' ' + (520 - h) + ' L ' + (x + 42) + ' ' + 520 + ' Z'}
                    fill="none"
                    stroke={AMBER}
                    strokeWidth={1.4}
                    opacity={0.85}
                  />
                  <Line x1={x - 36} y1={520 - h * 0.62} x2={x + 36} y2={520 - h * 0.62} color={AMBER} width={0.9} opacity={0.55} />
                  <Line x1={x - 39} y1={520 - h * 0.36} x2={x + 39} y2={520 - h * 0.36} color={AMBER} width={0.9} opacity={0.55} />
                </g>
              )
            })}
            <Tag x={330} y={570} text="乐殊贵贱" color={AMBER} size={28} />
            <Tag x={330} y={608} text="礼别尊卑" color={AMBER} size={28} opacity={0.8} />
          </g>
          {/* 律：简牍与法 */}
          <g opacity={range(frame, 35, 75)}>
            {Array.from({ length: 9 }, (_, i) => {
              const x = 950 + i * 26
              const h = 190 + (i % 3) * 22
              return (
                <g key={i}>
                  <rect x={x} y={520 - h} width={20} height={h} rx={2} fill={alpha('#1a2a52', 0.7)} stroke={CYAN} strokeWidth={0.8} opacity={0.8} />
                  {Array.from({ length: 5 }, (_, k) => (
                    <Line key={k} x1={x + 4} y1={520 - h + 18 + k * 26} x2={x + 16} y2={520 - h + 18 + k * 26} color={CYAN} width={0.6} opacity={0.4} />
                  ))}
                </g>
              )
            })}
            <Tag x={950} y={570} text="笺牒简要，顾答审详" color={CYAN} size={26} />
            <Tag x={950} y={608} text="何遵约法，韩弊烦刑" color={CYAN} size={26} opacity={0.8} />
          </g>
          {/* 祭祀 */}
          <g opacity={range(frame, 70, 105)}>
            <Ring cx={1600} cy={430} r={92} fill="none" stroke={GREEN} strokeWidth={1.4} opacity={0.8} />
            <Ring cx={1600} cy={430} r={60} fill="none" stroke={GREEN} strokeWidth={0.9} opacity={0.5} />
            <Tag x={1600} y={438} text="烝尝" color={GREEN} size={34} anchor="middle" />
            <Tag x={1600} y={556} text="冬祭曰烝 · 秋祭曰尝" color={GREEN} size={18} anchor="middle" opacity={0.8} />
          </g>
          <Readout x={130} y={760} label="RITUAL" value="祭祀烝尝" color={GREEN} size={26} />
        </g>
      ) : null}
    </g>
  )
}
