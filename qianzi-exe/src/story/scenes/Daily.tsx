/**
 * 第五幕：衣食器用。
 *
 *   farm    治本于农：田垄、作物、耒耜
 *   table   具膳餐饭：案、鼎、箸、酒觞
 *   objects 纨扇、银烛、象床、琴、钓竿
 *   home    妾御绩纺、沐浴、驴骡
 */
import { AMBER, CYAN, GREEN, PAPER, VIOLET, alpha } from '../../viz/palette'
import { Grid, Line, Poly, Readout, Tag } from '../../viz/parts'
import { range } from '../../lib/easing'
import type { SceneProps } from './shared'

const GROUND = 740

export function DailyScene({ frame, beat }: SceneProps) {
  const farm = beat === 1
  const table = beat === 2
  const objects = beat === 3
  const home = beat === 4

  return (
    <g>
      <Grid x={60} y={150} w={1800} h={780} step={60} opacity={0.05} />
      <Line x1={100} y1={GROUND} x2={1820} y2={GROUND} color={CYAN} width={0.8} opacity={0.25} />

      {/* 农 */}
      {farm ? (
        <g>
          <Tag x={150} y={210} text="治本于农，务兹稼穑" color={GREEN} size={32} />
          {/* 田垄 */}
          <g opacity={range(frame, 0, 30)}>
            {Array.from({ length: 7 }, (_, i) => {
              const x = 200 + i * 120
              return (
                <g key={i}>
                  <Line x1={x} y1={GROUND} x2={x + 60} y2={GROUND - 26} color={GREEN} width={1.1} opacity={0.35} />
                  <Line x1={x + 60} y1={GROUND} x2={x} y2={GROUND - 26} color={GREEN} width={1.1} opacity={0.35} />
                </g>
              )
            })}
          </g>
          {/* 黍稷：谷粒 */}
          <g opacity={range(frame, 25, 60)}>
            {Array.from({ length: 90 }, (_, i) => {
              const x = 210 + (i * 83) % 800
              const y = GROUND - 8 - ((i * 47) % 90)
              const s = 0.6 + (i % 5) * 0.16
              const on = range(frame, 25 + (i % 30), 45 + (i % 30))
              return <ellipse key={i} cx={x} cy={y} rx={3.4 * s} ry={6 * s} fill={AMBER} opacity={on * 0.8} />
            })}
            <Tag x={230} y={GROUND + 40} text="我艺黍稷" color={AMBER} size={26} />
          </g>
          {/* 耒耜 */}
          <g opacity={range(frame, 55, 90)}>
            <Line x1={1150} y1={GROUND} x2={1210} y2={GROUND - 150} color={PAPER} width={3} opacity={0.85} />
            <Poly points={[[1200, GROUND - 150], [1250, GROUND - 128], [1236, GROUND - 118], [1188, GROUND - 140]]} color={PAPER} opacity={0.85} width={1.4} fill={alpha('#22304e', 0.9)} />
            <Line x1={1210} y1={GROUND - 150} x2={1290} y2={GROUND - 128} color={PAPER} width={2.4} opacity={0.8} />
            <Tag x={1300} y={GROUND - 150} text="俶载南亩" color={GREEN} size={24} />
          </g>
          {/* 贡赋 */}
          <g opacity={range(frame, 80, 110)}>
            <rect x={1480} y={GROUND - 110} width={140} height={110} fill="none" stroke={GREEN} strokeWidth={1.3} opacity={0.8} />
            {Array.from({ length: 4 }, (_, i) => (
              <Line key={i} x1={1480} y1={GROUND - 88 + i * 26} x2={1620} y2={GROUND - 88 + i * 26} color={GREEN} width={0.7} opacity={0.4} />
            ))}
            <Tag x={1550} y={GROUND - 130} text="税熟贡新" color={GREEN} size={24} anchor="middle" />
          </g>
            <Readout x={150} y={900} label="农本" value="以农为本" color={GREEN} size={26} />
        </g>
      ) : null}

      {/* 饮食 */}
      {table ? (
        <g>
          <Tag x={150} y={210} text="具膳餐饭，适口充肠" color={AMBER} size={32} />
          {/* 案与鼎 */}
          <g opacity={range(frame, 0, 30)}>
            <Line x1={420} y1={GROUND} x2={420} y2={GROUND - 60} color={PAPER} width={2.4} opacity={0.8} />
            <Line x1={700} y1={GROUND} x2={700} y2={GROUND - 60} color={PAPER} width={2.4} opacity={0.8} />
            <rect x={380} y={GROUND - 72} width={360} height={14} rx={3} fill={alpha('#22304e', 0.9)} stroke={PAPER} strokeWidth={1.4} opacity={0.9} />
            {/* 鼎 */}
            <path
              d={'M 500 ' + (GROUND - 76) + ' q 0 66 34 66 q 34 0 34 -66 Z'}
              fill={alpha('#2a2010', 0.9)}
              stroke={AMBER}
              strokeWidth={1.6}
              opacity={0.95}
            />
            <Line x1={500} y1={GROUND - 76} x2={568} y2={GROUND - 76} color={AMBER} width={1.4} opacity={0.8} />
            <Line x1={500} y1={GROUND - 40} x2={568} y2={GROUND - 40} color={AMBER} width={0.9} opacity={0.5} />
            {/* 蒸气 */}
            {Array.from({ length: 3 }, (_, i) => (
              <path
                key={i}
                d={'M ' + (516 + i * 18) + ' ' + (GROUND - 86) + ' q -12 -24 0 -44 q 10 -18 2 -32'}
                fill="none"
                stroke={AMBER}
                strokeWidth={1.1}
                opacity={0.35}
              />
            ))}
            <Tag x={534} y={GROUND + 40} text="饱饫烹宰" color={AMBER} size={24} anchor="middle" />
          </g>
          {/* 觞 */}
          <g opacity={range(frame, 25, 55)}>
            <path d="M 880 560 l 30 0 l -9 46 q -6 22 -21 22 q -15 0 -21 -22 Z" fill={alpha('#1a2a52', 0.85)} stroke={CYAN} strokeWidth={1.5} opacity={0.95} />
            <Line x1={880} y1={560} x2={910} y2={560} color={CYAN} strokeWidth={1.5} opacity={0.9} />
            <Tag x={895} y={680} text="接杯举觞" color={CYAN} size={24} anchor="middle" />
          </g>
          {/* 弦歌 */}
          <g opacity={range(frame, 50, 85)}>
            {Array.from({ length: 5 }, (_, i) => (
              <Line key={i} x1={1120} y1={600 + i * 13} x2={1400} y2={600 + i * 13} color={VIOLET} width={0.8} opacity={0.55} />
            ))}
            <path d="M 1120 600 q 130 40 280 0 l 0 70 q -140 40 -280 0 Z" fill={alpha('#231840', 0.85)} stroke={VIOLET} strokeWidth={1.4} opacity={0.9} />
            <Tag x={1260} y={700} text="弦歌酒宴" color={VIOLET} size={24} anchor="middle" />
          </g>
          {/* 饥厌糟糠 */}
          <g opacity={range(frame, 80, 110)}>
            <path d="M 1560 640 l 90 0 l -14 60 q -6 26 -31 26 q -25 0 -31 -26 Z" fill={alpha('#1a2416', 0.9)} stroke={GREEN} strokeWidth={1.4} opacity={0.9} />
            <Tag x={1605} y={760} text="饥厌糟糠" color={GREEN} size={24} anchor="middle" />
          </g>
        </g>
      ) : null}

      {/* 器物 */}
      {objects ? (
        <g>
          <Tag x={150} y={210} text="文房器用 · 嵇琴阮啸，钧巧任钓" color={VIOLET} size={28} />
          {/* 纨扇 */}
          <g opacity={range(frame, 0, 28)}>
            <circle cx={330} cy={420} r={86} fill={alpha('#eef4ff', 0.1)} stroke={PAPER} strokeWidth={1.6} opacity={0.9} />
            {Array.from({ length: 8 }, (_, i) => (
              <Line key={i} x1={330} y1={420} x2={330 + Math.cos((i / 8) * Math.PI * 2) * 86} y2={420 + Math.sin((i / 8) * Math.PI * 2) * 86} color={PAPER} width={0.6} opacity={0.3} />
            ))}
            <Line x1={330} y1={506} x2={330} y2={620} color={PAPER} width={2.4} opacity={0.85} />
            <Tag x={330} y={660} text="纨扇" color={PAPER} size={24} anchor="middle" />
          </g>
          {/* 银烛 */}
          <g opacity={range(frame, 22, 52)}>
            <rect x={560} y={600} width={26} height={100} rx={3} fill={alpha('#2a2a3a', 0.9)} stroke={AMBER} strokeWidth={1.2} opacity={0.9} />
            <path d="M 573 598 q 10 -34 0 -54 q -10 20 0 54 Z" fill={AMBER} opacity={0.9} />
            <circle cx={573} cy={570} r={16} fill={AMBER} opacity={0.18} />
            <Tag x={573} y={740} text="银烛炜煌" color={AMBER} size={24} anchor="middle" />
          </g>
          {/* 象床 */}
          <g opacity={range(frame, 45, 75)}>
            <rect x={760} y={560} width={300} height={70} rx={8} fill={alpha('#231840', 0.9)} stroke={VIOLET} strokeWidth={1.4} opacity={0.9} />
            <Line x1={790} y1={630} x2={790} y2={700} color={VIOLET} width={2} opacity={0.7} />
            <Line x1={1030} y1={630} x2={1030} y2={700} color={VIOLET} width={2} opacity={0.7} />
            <rect x={790} y={520} width={110} height={40} rx={16} fill={alpha('#2a2a4a', 0.9)} stroke={PAPER} strokeWidth={1.2} opacity={0.8} />
            <Tag x={910} y={740} text="蓝笋象床" color={VIOLET} size={24} anchor="middle" />
          </g>
          {/* 嵇琴阮啸 */}
          <g opacity={range(frame, 68, 98)}>
            <path d="M 1200 620 q 90 34 180 0 l 0 52 q -90 32 -180 0 Z" fill={alpha('#231840', 0.85)} stroke={VIOLET} strokeWidth={1.3} opacity={0.9} />
            {Array.from({ length: 4 }, (_, i) => (
              <Line key={i} x1={1200} y1={630 + i * 10} x2={1380} y2={630 + i * 10} color={VIOLET} width={0.7} opacity={0.5} />
            ))}
            <Line x1={1420} y1={560} x2={1480} y2={640} color={CYAN} width={2} opacity={0.8} />
            <path d="M 1420 560 q 22 -26 44 -12 q -20 18 -44 12 Z" fill={alpha(CYAN, 0.6)} stroke={CYAN} strokeWidth={0.9} />
            <Tag x={1340} y={740} text="嵇琴阮啸" color={CYAN} size={24} anchor="middle" />
          </g>
          {/* 钓 */}
          <g opacity={range(frame, 92, 120)}>
            <Line x1={1600} y1={520} x2={1740} y2={700} color={GREEN} width={1.8} opacity={0.9} />
            <path d="M 1740 700 q 20 30 0 44" fill="none" stroke={GREEN} strokeWidth={0.9} opacity={0.8} />
            <Tag x={1660} y={470} text="钧巧任钓" color={GREEN} size={24} anchor="middle" />
          </g>
        </g>
      ) : null}

      {/* 居家 */}
      {home ? (
        <g>
          <Tag x={150} y={210} text="亲戚故旧，老少异粮" color={CYAN} size={32} />
          {/* 绩纺 */}
          <g opacity={range(frame, 0, 30)}>
            <rect x={240} y={420} width={220} height={150} fill="none" stroke={CYAN} strokeWidth={1.3} opacity={0.85} />
            {Array.from({ length: 11 }, (_, i) => (
              <Line key={i} x1={250 + i * 20} y1={420} x2={250 + i * 20} y2={570} color={CYAN} width={0.6} opacity={0.35} />
            ))}
            <Line x1={240} y1={495} x2={460} y2={495} color={CYAN} width={1} opacity={0.55} />
            <Tag x={350} y={620} text="妾御绩纺" color={CYAN} size={24} anchor="middle" />
          </g>
          {/* 沐浴 */}
          <g opacity={range(frame, 28, 60)}>
            <path d="M 700 640 q 90 0 90 -50 q 0 -34 -45 -34 q -45 0 -45 34 q 0 50 90 50 Z" fill={alpha('#0a2a3c', 0.85)} stroke={CYAN} strokeWidth={1.4} opacity={0.9} />
            {Array.from({ length: 3 }, (_, i) => (
              <path key={i} d={'M ' + (690 + i * 16) + ' 548 q -10 -20 0 -34'} fill="none" stroke={CYAN} strokeWidth={1} opacity={0.4} />
            ))}
            <Tag x={745} y={700} text="骸垢想浴" color={CYAN} size={24} anchor="middle" />
          </g>
          {/* 驴骡 */}
          <g opacity={range(frame, 55, 90)}>
            <rect x={1050} y={560} width={190} height={78} rx={22} fill="none" stroke={AMBER} strokeWidth={1.6} opacity={0.9} />
            <path d="M 1240 578 q 44 -8 54 22 q -30 6 -54 -22 Z" fill={alpha('#2a2010', 0.9)} stroke={AMBER} strokeWidth={1.4} opacity={0.9} />
            <Line x1={1080} y1={638} x2={1080} y2={700} color={AMBER} strokeWidth={1.6} opacity={0.8} />
            <Line x1={1130} y1={638} x2={1130} y2={700} color={AMBER} strokeWidth={1.6} opacity={0.8} />
            <Line x1={1190} y1={638} x2={1190} y2={700} color={AMBER} strokeWidth={1.6} opacity={0.8} />
            <Line x1={1230} y1={638} x2={1230} y2={700} color={AMBER} strokeWidth={1.6} opacity={0.8} />
            <Tag x={1145} y={740} text="驴骡犊特" color={AMBER} size={24} anchor="middle" />
          </g>
          {/* 亲戚故旧 */}
          <g opacity={range(frame, 82, 115)}>
            {[
              { x: 1450, s: 1 },
              { x: 1600, s: 0.72 },
              { x: 1730, s: 0.86 },
            ].map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={560} r={26 * p.s} fill="none" stroke={VIOLET} strokeWidth={1.4} opacity={0.85} />
                <Line x1={p.x} y1={586} x2={p.x} y2={640} color={VIOLET} strokeWidth={1.4} opacity={0.8} />
                <Line x1={p.x} y1={640} x2={p.x - 20 * p.s} y2={690} color={VIOLET} strokeWidth={1.3} opacity={0.8} />
                <Line x1={p.x} y1={640} x2={p.x + 20 * p.s} y2={690} color={VIOLET} strokeWidth={1.3} opacity={0.8} />
              </g>
            ))}
            <Tag x={1590} y={740} text="亲戚故旧" color={VIOLET} size={24} anchor="middle" />
          </g>
          <Readout x={150} y={880} label="农食器" value="衣 · 食 · 器" color={AMBER} size={26} />
        </g>
      ) : null}
    </g>
  )
}
