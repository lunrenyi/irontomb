/**
 * 首页开场：像启动一个保存古代知识的数字档案。
 *
 * 时间线（秒）：
 *   0.0 - 2.6   终端：档案已找到 / 正在解析字符 / 正在构建世界模型
 *   1.2 - 5.6   一千个大号汉字被扫描、逐个点亮
 *   4.6 - 8.6   镜头拉远，字缩成节点，知识网络长出来
 *   7.4 - 9.6   标题与「启动解码」
 *
 * 画面里的每一笔都是程序算出来的：字的位置是常量，节点的位置也是常量。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ALL_CHARS, PHRASES, TOTAL_CHARS, TOTAL_PHRASES } from '../content/qianzi'
import { MODULES } from '../content/modules'
import { cameraTransform, lerpCamera } from '../lib/camera'
import { clamp01, easeIn, easeInOut, easeOut, lerp, range } from '../lib/easing'
import { GRID_COLS, GRID_FONT, GRID_POSITIONS, GRID_ROWS, REGIONS, worldCamera } from '../viz/world'
import { FilmBackdrop } from '../viz/backdrop'
import { KnowledgeNetwork } from '../viz/network'
import { CYAN, MODULE_HUE, PAPER, alpha } from '../viz/palette'
import { Tag } from '../viz/parts'

const VIEWPORT = { width: 1920, height: 1080 }

const TERMINAL = [
  { text: '档案已找到', at: 0.25 },
  { text: '正在解析字符', at: 0.95 },
  { text: '正在构建世界模型', at: 1.65 },
]

/** 字阵在解码区里的中心（world.ts 里 GRID_POSITIONS 用的同一套） */
const GRID_CX = REGIONS.decode.x + 960

/**
 * 相机路线 —— 与影片序章用的是同一套逻辑：
 *   1. 贴着字阵扫（字很大，一个字一个字被点亮）
 *   2. 拉远，整面「字的墙」一次露出来
 *   3. 再拉远到整张知识地图，五个模块的节点亮起来
 */

export function ArchiveBoot({ onStart }: { onStart: () => void }) {
  const [t, setT] = useState(0)
  const raf = useRef(0)
  const start = useRef(0)

  useEffect(() => {
    start.current = performance.now()
    const tick = (now: number) => {
      const elapsed = (now - start.current) / 1000
      setT(elapsed)
      if (elapsed < 20) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [])

  /** 解析进度：0 -> 1000 个字 */
  const parse = clamp01((t - 1.2) / 4.6)
  const parsed = Math.floor(parse * TOTAL_CHARS)
  /** 已经解析出多少句 */
  const parsedPhrases = Math.floor(parsed / 4)

  /** 扫描线所在的行 */
  const scanRow = Math.min(GRID_ROWS - 1, Math.floor(parsed / GRID_COLS))
  const scanY = GRID_POSITIONS[scanRow * GRID_COLS][1]

  /** 第一段镜头：贴着字 -> 拉远到整面墙 */
  const archiveCam = {
    x: GRID_CX,
    y: lerp(scanY, 540, easeInOut(parse)),
    scale: lerp(1.95, 1, easeInOut(parse)),
  }
  /** 第二段：拉远到整张知识地图 */
  const blend = easeInOut(range(t, 4.8, 9.2))
  const camera = blend <= 0 ? archiveCam : lerpCamera({ x: 960, y: 540, scale: 1 }, worldCamera(), blend)

  const pull = range(t, 4.8, 8.6)
  const netAlpha = range(t, 4.2, 8.2)
  const titleAlpha = easeOut(range(t, 7.4, 8.6))
  const titleOut = 1 - easeIn(range(t, 12.6, 13.8))

  /** 每个字属于哪一句、哪一句属于哪个模块 */
  const charModule = useMemo(() => {
    const map: string[] = []
    for (const p of PHRASES) for (let k = 0; k < 4; k += 1) map.push(p.module)
    return map
  }, [])

  const gridAlpha = 1 - pull * 0.95

  return (
    <div
      className='relative min-h-[640px] w-full overflow-hidden bg-void'
      style={{ height: '100svh' }}
    >
      <svg
        className='absolute inset-0 h-full w-full'
        viewBox='0 0 1920 1080'
        preserveAspectRatio='xMidYMid slice'
        aria-hidden='true'
      >
        <FilmBackdrop width={1920} height={1080} frame={Math.floor(t * 30)} />

        <svg
          width={1920}
          height={1080}
          viewBox='0 0 1920 1080'
          style={{ position: 'absolute', inset: 0, display: 'block' }}
        >
          <g transform={cameraTransform(camera, VIEWPORT)}>
            {/* 五个区域的外框 */}
            <g opacity={netAlpha}>
              {MODULES.map((m) => {
                const r = REGIONS[m.id]
                return (
                  <rect
                    key={m.id}
                    x={r.x + 24}
                    y={r.y + 16}
                    width={r.w - 48}
                    height={r.h - 32}
                    fill='none'
                    stroke={MODULE_HUE[m.id]}
                    strokeWidth={2}
                    strokeDasharray='16 12'
                    opacity={0.22}
                  />
                )
              })}
            </g>

            {/* 知识网络：随着解析一句一句长出来 */}
            <g opacity={netAlpha}>
              <KnowledgeNetwork
                focusX={camera.x}
                focusY={camera.y}
                zoom={camera.scale}
                frame={Math.floor(t * 30)}
                radius={4600}
                showLabels={false}
                revealCount={parsedPhrases}
              />
            </g>

            {/* 一千个字的方阵 */}
            <g opacity={gridAlpha}>
              {ALL_CHARS.map((ch, i) => {
                const [x, y] = GRID_POSITIONS[i]
                if (i > parsed + 24) return null
                const mod = charModule[i]
                const hue = MODULE_HUE[mod as keyof typeof MODULE_HUE] ?? CYAN
                const lit = easeOut(range(t, 1.2 + (i / TOTAL_CHARS) * 4.6, 1.2 + (i / TOTAL_CHARS) * 4.6 + 0.3))
                return (
                  <text
                    key={i}
                    x={x}
                    y={y}
                    fontSize={GRID_FONT}
                    textAnchor='middle'
                    fill={i < parsed ? hue : alpha('#4b6a99', 0.3)}
                    opacity={i < parsed ? 0.34 + lit * 0.64 : 0.3}
                    fontFamily="'PingFang SC','Hiragino Sans GB',sans-serif"
                  >
                    {ch}
                  </text>
                )
              })}
              {t > 1.2 && t < 6.6 ? (
                <g>
                  <rect x={GRID_POSITIONS[0][0] - 22} y={scanY - 32} width={GRID_COLS * 36} height={64} fill={CYAN} opacity={0.08} />
                  <rect
                    x={GRID_POSITIONS[Math.min(ALL_CHARS.length - 1, parsed)][0] - 1.4}
                    y={scanY - 32}
                    width={2.8}
                    height={64}
                    fill={CYAN}
                    opacity={0.9}
                  />
                </g>
              ) : null}
            </g>

            {/* 模块名牌 */}
            <g opacity={netAlpha}>
              {MODULES.map((m) => {
                const r = REGIONS[m.id]
                return (
                  <g key={m.id}>
                    <Tag x={r.x + 44} y={r.y + 54} text={m.index + '  ' + m.name} color={MODULE_HUE[m.id]} size={34} opacity={0.9} />
                    <Tag x={r.x + 44} y={r.y + 90} text={m.nameZh} color={PAPER} size={26} opacity={0.45} />
                  </g>
                )
              })}
            </g>
          </g>
        </svg>
      </svg>

      {/* 终端 */}
      <div className='pointer-events-none absolute left-0 right-0 top-0 z-10 h-[260px] bg-gradient-to-b from-void via-void/80 to-transparent' />
      <div className='pointer-events-none absolute left-6 top-6 z-10 sm:left-10 sm:top-10'>
        {TERMINAL.map((line) => {
          const a = easeOut(range(t, line.at, line.at + 0.4))
          if (a <= 0.01) return null
          return (
            <div
              key={line.text}
              className='font-mono text-[13px] tracking-[0.24em] text-cyan sm:text-[15px]'
              style={{ opacity: a }}
            >
              <span className='text-faint'>&gt; </span>
              {line.text}
            </div>
          )
        })}
        {t > 1.6 ? (
          <div className='mt-3 font-mono text-[11px] tracking-[0.2em] text-faint sm:text-[12px]'>
            {TOTAL_PHRASES} 句 · {TOTAL_CHARS} 字 · 已解析 {parsed}/{TOTAL_CHARS}
          </div>
        ) : null}
        {t > 1.2 ? (
          <div className='mt-2 h-[3px] w-[190px] overflow-hidden rounded-full bg-white/10 sm:w-[260px]'>
            <div className='h-full rounded-full bg-cyan transition-[width] duration-100' style={{ width: (parse * 100).toFixed(1) + '%' }} />
          </div>
        ) : null}
      </div>

      {/* 标题与入口 */}
      <div
        className='pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-6 pb-[12vh] text-center'
        style={{ opacity: titleAlpha * titleOut }}
      >
        <div
          className='pointer-events-none absolute inset-x-0 bottom-0 h-[420px] bg-gradient-to-t from-void via-void/85 to-transparent'
          style={{ marginBottom: -40 }}
        />
        <div
          className='relative font-display text-[clamp(2rem,7vw,4.4rem)] leading-tight tracking-[0.1em] text-paper'
          style={{ textShadow: '0 0 40px rgba(3,6,14,1), 0 0 90px rgba(3,6,14,1)' }}
        >
          千字文：世界的源代码
        </div>
        <div className='relative mt-3 font-mono text-[11px] tracking-[0.3em] text-cyan sm:text-[14px]'>
          千字文程序 · 解码一个古代世界模型
        </div>
        <button
          type='button'
          onClick={onStart}
          className='pointer-events-auto relative mt-9 inline-flex items-center gap-3 rounded-full border border-cyan/50 bg-cyan/10 px-7 py-3 text-sm tracking-[0.14em] text-cyan transition-all duration-200 hover:border-cyan hover:bg-cyan/20 focus-visible:border-cyan'
        >
          <span className='inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan' />
          启动解码
        </button>
      </div>

      {/* 底部一行极简提示 */}
      <div
        className='pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-6 font-mono text-[10px] tracking-[0.24em] text-faint'
        style={{ opacity: clamp01(titleAlpha * 1.4) * (1 - titleOut) }}
      >
        {TOTAL_CHARS} 字 · {TOTAL_PHRASES} 句 · {MODULES.length} 个模块 · 一张地图
      </div>
    </div>
  )
}
