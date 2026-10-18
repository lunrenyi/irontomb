import { ChapterTitle, ProgressDots, SceneKeys, STAGE_SVG } from '../FilmChrome'
import { LifeGridFigure } from '../../viz/lifegrid'
import { createGrid, evolve, gridWithPreset, liveCells, liveCount, presetById, twoGliderCollision, type LifeGrid } from '../../lib/life'
import { easeOut } from '../../lib/easing'
import { AMBER, DEEP, INK, MONO, MUTED, SIGNAL, alpha } from '../../viz/palette'
import { STAGE_H, STAGE_W, beatsOf } from '../timeline'
import { frac } from '../cues'
import { SCORE } from '../score'

const B = beatsOf('life')
const SPEC = SCORE.life

// 每一段都用固定的初始状态，演化全部预计算 —— 影片与网页完全一致
const BIG = createGrid(60, 60)

/** 取以活格包围盒为中心的 n x n 窗口：让小图案在影片里占满棋盘 */
function windowed(grid: LifeGrid, n: number): LifeGrid {
  const cells = liveCells(grid)
  if (cells.length === 0) return createGrid(n, n)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const c of cells) {
    if (c.x < minX) minX = c.x
    if (c.x > maxX) maxX = c.x
    if (c.y < minY) minY = c.y
    if (c.y > maxY) maxY = c.y
  }
  const x0 = Math.max(0, Math.min(grid.width - n, Math.round((minX + maxX) / 2) - (n >> 1)))
  const y0 = Math.max(0, Math.min(grid.height - n, Math.round((minY + maxY) / 2) - (n >> 1)))
  const out = createGrid(n, n)
  for (const c of cells) {
    const nx = c.x - x0
    const ny = c.y - y0
    if (nx >= 0 && ny >= 0 && nx < n && ny < n) out.cells[ny * n + nx] = 1
  }
  return out
}

const GLIDER = evolve(gridWithPreset(BIG, presetById('glider')!), 6).map((g) => windowed(g, 14))
const PULSAR = evolve(gridWithPreset(BIG, presetById('pulsar')!), 4).map((g) => windowed(g, 20))
const BLOCK = [windowed(gridWithPreset(BIG, presetById('block')!), 8)]
const GUN = evolve(gridWithPreset(BIG, presetById('gosper-gun')!), 90).map((g) => windowed(g, 30))
const RPENT = evolve(gridWithPreset(BIG, presetById('r-pentomino')!), 60).map((g) => windowed(g, 22))
const CLASH = [windowed(twoGliderCollision(createGrid(30, 20), 9), 24)]

/** 主棋盘：860px，靠右；左边留给规则图与计数 */
const BOARD = { size: 860, cx: 1290, cy: 540 }

/**
 * 第二幕：康威生命游戏。
 *
 * 规则用一张表讲；四种图案用棋盘自己讲；结论用两条对照讲。
 * 全幕没有一句解说，格子的生灭、移动与周期就是全部的说明。
 */
export function LifeScene({ frame }: { frame: number }) {
  const rulesIn = easeOut(frac(frame, B, 0, 0, 0.5))
  const demoIn = easeOut(frac(frame, B, 1, 0.05, 0.5))
  const boardIn = easeOut(frac(frame, B, 2, 0, 0.3))
  const showDemo = frame >= B[0].start && frame < B[2].start
  const showBoard = frame >= B[2].start
  return (
    <>
      <ChapterTitle frame={frame} beats={B} title='康威生命游戏' sub='CONWAY’S GAME OF LIFE' />
      <SceneKeys frame={frame} beats={B} specs={SPEC} />
      {showDemo ? <DemoStage frame={frame} rules={rulesIn} demo={demoIn} /> : null}
      {showBoard ? <BoardStage frame={frame} opacity={boardIn} /> : null}
    </>
  )
}

/** 第 0-1 拍：规则表 + 一个真的会算的小演示 */
function DemoStage({ frame, rules, demo }: { frame: number; rules: number; demo: number }) {
  const out = easeOut(frac(frame, B, 2, 0, 0.6))
  const cx = 1290
  const cy = 470
  const u = 62
  /** 演示用的一小片：中心格周围 8 格里有 4 个活的 */
  const neighbours = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1],
  ]
  const alive = new Set(['-1-1', '00', '11', '0-1'])
  const count = 4
  const ticks = Math.round(demo * count)
  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={1 - out}>
      {/* 规则表 */}
      <g opacity={rules}>
        <text x={140} y={430} fill={MUTED} fontSize={30} letterSpacing='0.16em'>邻居数</text>
        <text x={140} y={486} fill={SIGNAL} fontSize={40}>0 · 1 → 死亡</text>
        <text x={140} y={540} fill={SIGNAL} fontSize={40}>4+ → 死亡</text>
        <text x={140} y={610} fill={AMBER} fontSize={40}>2 · 3 → 存活</text>
        <text x={140} y={664} fill={AMBER} fontSize={40}>恰好 3 → 复活</text>
        <line x1={140} y1={700} x2={640} y2={700} stroke={alpha(MUTED, 0.18)} strokeWidth={1.2} />
      </g>
      {/* 演示：一格周围的 8 个邻居被逐个点亮，数到 4 就死 */}
      <g opacity={demo}>
        {neighbours.map(([dx, dy], i) => {
          const on = i < ticks
          const live = alive.has(dx + '-' + dy)
          return (
            <g key={i}>
              <rect
                x={cx + dx * u - u / 2}
                y={cy + dy * u - u / 2}
                width={u - 10}
                height={u - 10}
                rx={8}
                fill={live ? alpha(SIGNAL, on ? 0.9 : 0.16) : alpha(MUTED, on ? 0.14 : 0.05)}
                stroke={on ? (live ? SIGNAL : MUTED) : alpha(MUTED, 0.25)}
                strokeWidth={1.6}
              />
              {on ? (
                <text
                  x={cx + dx * u}
                  y={cy + dy * u + 9}
                  fill={live ? DEEP : INK}
                  fontSize={30}
                  fontFamily={MONO}
                  textAnchor='middle'
                >
                  {live ? '●' : '○'}
                </text>
              ) : null}
            </g>
          )
        })}
        <rect x={cx - u / 2} y={cy - u / 2} width={u - 10} height={u - 10} rx={8} fill={alpha(AMBER, 0.18)} stroke={AMBER} strokeWidth={2.4} />
        <text x={cx} y={cy + 9} fill={AMBER} fontSize={30} fontFamily={MONO} textAnchor='middle'>●</text>
        <text x={cx + u * 1.9} y={cy + 12} fill={ticks >= count ? AMBER : MUTED} fontSize={72} fontFamily={MONO}>
          {ticks}
        </text>
        <path d={'M ' + (cx + u * 1.35) + ' ' + (cy - 30) + ' L ' + (cx + u * 1.62) + ' ' + (cy - 6)} stroke={ticks >= count ? AMBER : alpha(MUTED, 0.3)} strokeWidth={2} fill='none' />
        <text x={cx + u * 1.62} y={cy + 44} fill={ticks >= count ? AMBER : MUTED} fontSize={34} fontFamily={MONO} textAnchor='middle'>
          {ticks >= count ? '死亡' : '存活'}
        </text>
      </g>
    </svg>
  )
}

/** 第 2-10 拍：整块棋盘，一次只展示一种图案，格子的变化本身就是说明 */
function BoardStage({ frame, opacity }: { frame: number; opacity: number }) {
  const closing = frame >= B[8].start
  const s = closing ? 1 - easeOut(frac(frame, B, 8, 0, 0.5)) * 0.18 : 1

  let current = BLOCK[0]
  let previous = BLOCK[0]
  let progress = 1
  let gen = ''
  let tag = ''
  let dots = 0

  const glide = frac(frame, B, 2, 0.1, 0.94) * (GLIDER.length - 1)
  const pulse = frac(frame, B, 3, 0.1, 0.94) * (PULSAR.length - 1)
  const gun = frac(frame, B, 5, 0.08, 0.95) * (GUN.length - 1)
  const rpent = frac(frame, B, 6, 0.08, 0.95) * (RPENT.length - 1)

  if (frame < B[3].start) {
    const g = Math.floor(glide)
    current = GLIDER[g]
    previous = GLIDER[Math.max(0, g - 1)]
    progress = 1 - (glide - g)
    gen = '第 ' + g + ' 代'
    dots = g
    tag = '每 4 代挪一格'
  } else if (frame < B[4].start) {
    const g = Math.min(PULSAR.length - 1, Math.floor(pulse))
    current = PULSAR[g]
    previous = PULSAR[Math.max(0, g - 1)]
    progress = 1 - (pulse - Math.floor(pulse))
    gen = '第 ' + g + ' 代'
    dots = g
    tag = '周期 3'
  } else if (frame < B[5].start) {
    current = BLOCK[0]
    previous = BLOCK[0]
    gen = '静物'
    dots = 0
    tag = '永远不变'
  } else if (frame < B[6].start) {
    const g = Math.floor(gun)
    current = GUN[g]
    previous = GUN[Math.max(0, g - 1)]
    progress = 1 - (gun - g)
    gen = '第 ' + g + ' 代'
    dots = g % 30
    tag = '每 30 代吐出一艘滑翔机'
  } else if (frame < B[7].start) {
    const g = Math.floor(rpent)
    current = RPENT[g]
    previous = RPENT[Math.max(0, g - 1)]
    progress = 1 - (rpent - g)
    gen = '第 ' + g + ' 代'
    dots = Math.round((g / 1103) * 60)
    tag = '5 格起步'
  } else if (frame < B[8].start) {
    current = CLASH[0]
    previous = current
    gen = '两组运动'
    dots = 2
    tag = '一组停下，另一组继续'
  } else {
    const g = Math.floor(frac(frame, B, 8, 0.05, 0.95) * (GLIDER.length - 1))
    current = GLIDER[g]
    previous = GLIDER[Math.max(0, g - 1)]
    gen = '第 ' + g + ' 代'
    dots = g
    tag = ''
  }

  const history: LifeGrid[] = frame < B[3].start ? GLIDER : frame < B[4].start ? PULSAR : frame < B[5].start ? BLOCK : frame < B[6].start ? GUN : frame < B[7].start ? RPENT : frame < B[8].start ? CLASH : GLIDER
  const idxNow = Math.min(history.length - 1, Math.max(0, Math.round(dots)))
  const pop = history.map((g) => liveCount(g))
  const peak = Math.max(4, ...pop)
  const gx = 150
  const gy = 950
  const gw = 600
  const gh = 280
  const half = BOARD.size / 2
  const cx = BOARD.cx - BOARD.size / 2
  const cy = BOARD.cy - BOARD.size / 2
  const fade = closing ? 1 - easeOut(frac(frame, B, 8, 0.2, 0.7)) * 0.5 : 1
  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={opacity * fade}>
      <g transform={'translate(' + BOARD.cx + ' ' + BOARD.cy + ') scale(' + s + ') translate(' + -half + ' ' + -half + ')'}>
        <rect x={-18} y={-18} width={BOARD.size + 36} height={BOARD.size + 36} rx={18} fill={alpha(SIGNAL, 0.035)} stroke={alpha(SIGNAL, 0.22)} strokeWidth={1.4} />
        <svg width={BOARD.size} height={BOARD.size} viewBox={'0 0 ' + current.width + ' ' + current.height}>
          <LifeGridFigure grid={current} previous={previous} progress={progress} />
        </svg>
      </g>
      {/* 计数器：用点阵表示「第几代」，不用文字 */}
      <text x={cx} y={cy - 46} fill={MUTED} fontSize={30} fontFamily={MONO}>
        {gen}
      </text>
      <ProgressDots x={cx + 150} y={cy - 46} total={closing ? 6 : 60} index={Math.min(dots, closing ? 6 : 60)} color={SIGNAL} gap={22} />
      {tag ? (
        <text x={cx + 400} y={cy - 46} fill={AMBER} fontSize={30}>
          {tag}
        </text>
      ) : null}
      {/* 左栏：这一段里存活格数怎么变的 —— 振荡、增长、收敛都在这条曲线上 */}
      <g>
        <text x={gx} y={gy - gh - 34} fill={MUTED} fontSize={30}>存活格数</text>
        <line x1={gx} y1={gy} x2={gx + gw} y2={gy} stroke={alpha(MUTED, 0.28)} strokeWidth={1.4} />
        <line x1={gx} y1={gy - gh} x2={gx + gw} y2={gy - gh} stroke={alpha(MUTED, 0.14)} strokeWidth={1} />
        <polyline
          points={pop.map((v, i) => gx + (gw * i) / Math.max(1, pop.length - 1) + ',' + (gy - (gh * v) / peak)).join(' ')}
          fill='none'
          stroke={SIGNAL}
          strokeWidth={2.6}
          opacity={0.85}
        />
        {pop.length > 1 ? (
          <circle cx={gx + (gw * idxNow) / (pop.length - 1)} cy={gy - (gh * pop[idxNow]) / peak} r={9} fill={AMBER} />
        ) : null}
      </g>
      {/* 存活格数：一个数字就够了 */}
      <text x={cx + BOARD.size - 10} y={cy - 46} fill={MUTED} fontSize={30} fontFamily={MONO} textAnchor='end'>
        {liveCount(current)}
      </text>
    </svg>
  )
}
