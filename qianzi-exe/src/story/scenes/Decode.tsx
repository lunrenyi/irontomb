/**
 * 序章：解码。
 *
 * 五拍：
 *   boot   终端启动
 *   scan   一千个大号汉字被逐个扫描、点亮
 *   glyphs 简体与繁体的七处碰撞
 *   tags   字符连成知识网络
 *   title  标题
 */
import { ALL_CHARS, COLLISIONS, PHRASES, TOTAL_CHARS, TOTAL_PHRASES } from '../../content/qianzi'
import { MODULE_HUE } from '../../viz/palette'
import { alpha, AMBER, CYAN, GREEN, MONO_HAN, PAPER, VIOLET } from '../../viz/palette'
import { GRID_COLS, GRID_FONT, GRID_POSITIONS, GRID_ROWS } from '../../viz/world'
import { Grid, Line, Readout, Ring, Tag } from '../../viz/parts'
import { easeInOut, lerp, range } from '../../lib/easing'
import type { SceneProps } from './shared'

const VOID_FILL = '#03060e'

/**
 * 字阵的镜头：贴着字 -> 拉远到整面墙。
 *
 * 只吃两个数：扫描进度与扫描线所在的行。
 * 镜头永远不追踪「正在变化的图形」，所以同一帧永远是同一张画面。
 */
function gridCamera(scanT: number, scanY: number): string {
  const p = easeInOut(Math.min(1, Math.max(0, scanT)))
  const k = lerp(1.95, 1, p)
  const focusY = lerp(scanY, 540, p)
  return 'translate(960 540) scale(' + k.toFixed(4) + ') translate(-960 ' + (-focusY).toFixed(2) + ')'
}

/** 每个字属于哪一句、哪一句属于哪个模块 —— 解析之后按模块上色 */
const charModule: string[] = (() => {
  const map: string[] = []
  for (const p of PHRASES) for (let k = 0; k < 4; k += 1) map.push(p.module)
  return map
})()

export function DecodeScene({ frame, beat, beatDuration }: SceneProps) {
  const scan = beat === 1
  const glyphs = beat === 2
  const tags = beat === 3
  const title = beat === 4

  /* --- 终端启动：扫描一开始，它就该退场，把画面让给那一千个字 --- */
  const lines = ['档案已找到', '正在解析字符', '正在构建世界模型']
  const termFade = 1 - range(frame, 52, 88)
  const lineAlpha = lines.map((_, i) => range(frame, 8 + i * 16, 8 + i * 16 + 10) * termFade)

  /* --- 扫描：按原书的阅读顺序，一行一行往下扫 --- */
  const scanT = range(frame, 0, Math.max(60, beatDuration))
  const litCount = Math.floor(scanT * TOTAL_CHARS)
  const scanRow = Math.min(GRID_ROWS - 1, Math.floor(litCount / GRID_COLS))
  const scanY = GRID_POSITIONS[scanRow * GRID_COLS][1]
  const scanX = GRID_POSITIONS[Math.min(ALL_CHARS.length - 1, litCount)][0]

  return (
    <g>
      {/* 底网格 */}
      <Grid x={80} y={120} w={1760} h={840} step={80} opacity={0.07} />

      {/* 终端 */}
      <g>
        <rect x={100} y={646} width={900} height={208} rx={10} fill={VOID_FILL} opacity={0.82} />
        {lines.map((text, i) => (
          <g key={text} opacity={lineAlpha[i]}>
            <text
              x={140}
              y={700 + i * 46}
              fontSize={30}
              fill={i === 0 ? CYAN : i === 1 ? GREEN : VIOLET}
              fontFamily={MONO_HAN}
              style={{ letterSpacing: '0.22em' }}
            >
              &gt; {text}
            </text>
            {lineAlpha[i] < 1 ? (
              <rect x={140} y={680 + i * 46} width={560} height={34} fill={VOID_FILL} opacity={1 - lineAlpha[i]} />
            ) : null}
          </g>
        ))}
        {lineAlpha[2] > 0.4 ? (
          <text
            x={140}
            y={700 + 3 * 46}
            fontSize={23}
            fill={PAPER}
            opacity={(lineAlpha[2] - 0.4) * 1.6 * 0.9}
            fontFamily={MONO_HAN}
            style={{ letterSpacing: '0.14em' }}
          >
            {TOTAL_PHRASES} 句 / {TOTAL_CHARS} 字 / 繁体原文零重复
          </text>
        ) : null}
      </g>

      {/* 字阵 */}
      <g opacity={scan ? 1 : glyphs ? 0.1 : tags ? 0.08 : 0.2}>
        <g transform={gridCamera(scanT, scanY)}>
          {ALL_CHARS.map((ch, i) => {
            const [x, y] = GRID_POSITIONS[i]
            const isLit = scan ? i < litCount : true
            const hue = MODULE_HUE[charModule[i] as keyof typeof MODULE_HUE] ?? CYAN
            if (scan && i > litCount + 60) return null
            const fade = isLit ? 1 : 0.08
            return (
              <text
                key={i}
                x={x}
                y={y}
                fontSize={GRID_FONT}
                fill={scan ? (isLit ? hue : alpha('#4b6a99', 0.3)) : alpha('#cfe0ff', 0.62)}
                opacity={fade}
                fontFamily="'PingFang SC','Hiragino Sans GB',sans-serif"
              >
                {ch}
              </text>
            )
          })}
          {scan ? (
            <>
              <rect
                x={GRID_POSITIONS[0][0] - 22}
                y={scanY - 32}
                width={GRID_COLS * 36}
                height={64}
                fill={CYAN}
                opacity={0.08}
              />
              <rect x={scanX - 1.4} y={scanY - 32} width={2.8} height={64} fill={CYAN} opacity={0.9} />
              <Tag
                x={scanX}
                y={scanY - 46}
                text={String(litCount).padStart(4, '0')}
                color={CYAN}
                size={26}
                anchor="middle"
              />
            </>
          ) : null}
        </g>
      </g>

      {/* 繁简碰撞 */}
      {glyphs ? (
        <g opacity={range(frame, 0, 30)}>
          <rect x={100} y={352} width={1720} height={452} rx={14} fill={VOID_FILL} opacity={0.94} />
          <Tag x={150} y={416} text="繁体与简体的撞字" color={AMBER} size={24} />
          <Tag
            x={150}
            y={458}
            text="原文用繁体时一千字不重；简体把七处合并成了同一个字。"
            color={PAPER}
            size={23}
            mono={false}
            opacity={0.8}
          />
          {COLLISIONS.map((c, i) => {
            const x = 170 + i * 232
            const y = 610
            const on = range(frame, 20 + i * 9, 34 + i * 9)
            return (
              <g key={c.simplified} opacity={on}>
                <Line x1={x - 16} y1={y - 44} x2={x + 186} y2={y - 44} color={AMBER} width={0.7} opacity={0.3} />
                <text x={x} y={y} fontSize={44} fill={PAPER} fontFamily="'PingFang SC',sans-serif">
                  {c.simplified}
                </text>
                <text x={x + 84} y={y - 44} fontSize={38} fill={AMBER} fontFamily="'Songti SC',serif">
                  {c.at[0].traditional}
                </text>
                <text x={x + 84} y={y + 6} fontSize={38} fill={AMBER} fontFamily="'Songti SC',serif">
                  {c.at[1].traditional}
                </text>
                <Tag x={x} y={y + 38} text={c.at[0].phrase} color={PAPER} size={17} opacity={0.72} />
                <Tag x={x + 84} y={y + 38} text={c.at[1].phrase} color={PAPER} size={17} opacity={0.72} />
              </g>
            )
          })}
        </g>
      ) : null}

      {/* 语义标签 */}
      {tags ? (
        <g opacity={range(frame, 0, 30)}>
          <rect x={100} y={352} width={1720} height={452} rx={14} fill={VOID_FILL} opacity={0.94} />
          <Tag x={150} y={416} text="语义标注" color={GREEN} size={24} />
          <Tag
            x={150}
            y={458}
            text="给每一句标注语义标签，再按标签把句子连起来 —— 这张网络是本站生成的。"
            color={PAPER}
            size={23}
            mono={false}
            opacity={0.8}
          />
          {PHRASES.filter((_, i) => i % 7 === 0).map((p, k) => {
            const col = k % 10
            const row = Math.floor(k / 10)
            const x = 250 + col * 158
            const y = 566 + row * 64
            const on = range(frame, 20 + k * 3, 40 + k * 3)
            return (
              <g key={p.i} opacity={on}>
                <Ring cx={x} cy={y - 10} r={9} color={GREEN} opacity={0.7} width={1.2} />
                <text x={x + 18} y={y - 2} fontSize={24} fill={PAPER} fontFamily="'PingFang SC',sans-serif" opacity={0.9}>
                  {p.text}
                </text>
                <Tag x={x + 18} y={y + 20} text={p.tags[0]} color={GREEN} size={14} opacity={0.7} />
              </g>
            )
          })}
        </g>
      ) : null}

      {/* 标题 */}
      {title ? (
        <g opacity={range(frame, 0, 26)}>
          <text
            x={960}
            y={500}
            textAnchor="middle"
            fontSize={92}
            fill={PAPER}
            fontFamily="'PingFang SC','Hiragino Sans GB',sans-serif"
            style={{ letterSpacing: '0.14em' }}
          >
            千字文：世界的源代码
          </text>
          <Tag
            x={960}
            y={560}
            text="千字文程序 · 解码一个古代世界模型"
            color={CYAN}
            size={26}
            anchor="middle"
          />
          <g opacity={range(frame, 20, 46)}>
            <Readout x={720} y={780} label="句数" value={TOTAL_PHRASES} color={CYAN} />
            <Readout x={900} y={780} label="字数" value={TOTAL_CHARS} color={GREEN} />
            <Readout x={1090} y={780} label="繁体不重复" value={1000} color={AMBER} />
          </g>
        </g>
      ) : null}
    </g>
  )
}
