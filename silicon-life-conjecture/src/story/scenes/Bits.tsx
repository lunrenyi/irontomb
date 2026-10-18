import { ChapterTitle, ProgressDots, SceneKeys, STAGE_SVG, StageLabel } from '../FilmChrome'
import { BitRow, WaveFigure, makeWave } from '../../viz/digits'
import { VoltageRailFigure } from '../../viz/circuitfigure'
import { imageToBits, proceduralImage } from '../../lib/signal'
import { easeOut } from '../../lib/easing'
import { AMBER, BLUE, DEEP, FAINT, INK, MONO, MUTED, SERIF, SIGNAL, VIOLET, alpha } from '../../viz/palette'
import { STAGE_H, STAGE_W, beatsOf } from '../timeline'
import { frac } from '../cues'
import { SCORE } from '../score'

const B = beatsOf('bits')
const SPEC = SCORE.bits

const WAVE_N = 24
const wave = makeWave(WAVE_N, 'beat')
const image = proceduralImage(16)
const bits = imageToBits(image).map((p) => p.bit)

/** 波与采样区 */
const WAVE_BOX = { x: 150, y: 300, w: 1620, h: 280 }
/** 比特行 */
const ROW_Y = 700
/** 图像与比特流 */
const IMG = { x: 210, y: 190, size: 720 }
/** 电压轨 */
const RAIL = { x: 250, y: 300, w: 1420, h: 520 }

/**
 * 第一幕：宇宙中的 0 和 1。
 *
 * 这里没有旁白字幕。信息全部由画面讲：
 * 波 -> 采样 -> 量化 -> 门限 -> 0/1；图像 -> 像素 -> 明暗 -> 比特流 -> 数据流；
 * 连续电压 -> 门限 -> 未定义区。画面里只出现贴着对象的短标签和几个关键数字。
 */
export function BitsScene({ frame }: { frame: number }) {

  const showWave = frame < B[5].start
  const showImage = frame >= B[5].start && frame < B[9].start
  const showRail = frame >= B[9].start && frame < B[11].start
  const showAsk = frame >= B[11].start

  return (
    <>
      <ChapterTitle frame={frame} beats={B} title='宇宙中的 0 和 1' sub='INFORMATION' />

      {showWave ? <WaveStage frame={frame} /> : null}
      {showImage ? <ImageStage frame={frame} /> : null}
      {showRail ? <RailStage frame={frame} /> : null}
      {showAsk ? <AskStage frame={frame} /> : null}

      <SceneKeys frame={frame} beats={B} specs={SPEC} />
    </>
  )
}

/** 第 1-4 拍：一条连续的光波被采样、被量化、被门限切成一串 0 / 1 */
function WaveStage({ frame }: { frame: number }) {
  const waveIn = easeOut(frac(frame, B, 1, 0, 0.85))
  const waveOut = 1 - easeOut(frac(frame, B, 5, 0, 0.6))
  const scan = frac(frame, B, 1, 0.15, 0.95)
  const sampled = frac(frame, B, 2, 0.1, 0.9)
  const quantized = frac(frame, B, 3, 0.1, 0.9)
  const threshold = easeOut(frac(frame, B, 4, 0.12, 0.55))
  const bitsIn = frac(frame, B, 4, 0.45, 0.95)
  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={waveIn * Math.max(0.12, waveOut)}>
      <g transform={'translate(' + WAVE_BOX.x + ' ' + WAVE_BOX.y + ')'}>
        <WaveFigure width={WAVE_BOX.w} height={WAVE_BOX.h} progress={scan} revealed={Math.round(WAVE_N * sampled)} samples={wave.samples} bits={wave.bits} />
        {/* 量化档位：采样点被压到几个固定高度 */}
        <g opacity={quantized}>
          {[0.2, 0.4, 0.6, 0.8].map((t) => (
            <line key={t} x1={-20} y1={WAVE_BOX.h * t} x2={WAVE_BOX.w + 20} y2={WAVE_BOX.h * t} stroke={alpha(BLUE, 0.3)} strokeWidth={1.2} strokeDasharray='6 8' />
          ))}
        </g>
        {/* 门限：一条水平线，采样点按高低下落到 0 或 1 */}
        <g opacity={threshold}>
          <line x1={-20} y1={WAVE_BOX.h * 0.5} x2={WAVE_BOX.w + 20} y2={WAVE_BOX.h * 0.5} stroke={AMBER} strokeWidth={2.2} opacity={0.75} />
          <polygon points={'-16,' + WAVE_BOX.h * 0.5 + ' 16,' + WAVE_BOX.h * 0.5 + ' 0,' + (WAVE_BOX.h * 0.5 - 16)} fill={AMBER} />
        </g>
      </g>
      {/* 采样点落到位之后，一排 0 / 1 依次亮起 */}
      <g opacity={bitsIn}>
        <BitRow
          x={STAGE_W / 2 - ((WAVE_N - 1) * 46) / 2}
          y={ROW_Y}
          bits={wave.bits}
          revealed={Math.round(WAVE_N * bitsIn)}
          spacing={46}
        />
        <ProgressDots x={STAGE_W / 2 - (WAVE_N * 26) / 2} y={ROW_Y + 78} total={WAVE_N} index={Math.round(WAVE_N * bitsIn) - 1} color={AMBER} gap={26} />
      </g>
      {/* 贴对象的短标签：跟着图形走，不做解说 */}
      <StageLabel frame={frame} from={B[2].start + 8} to={B[3].start} x={WAVE_BOX.x + 30} y={WAVE_BOX.y - 46} color={BLUE}>
        采样
      </StageLabel>
      <StageLabel frame={frame} from={B[3].start + 8} to={B[4].start} x={WAVE_BOX.x + 30} y={WAVE_BOX.y - 46} color={BLUE}>
        量化：压到有限几档
      </StageLabel>
      <StageLabel frame={frame} from={B[4].start + 10} to={B[5].end} x={WAVE_BOX.x + WAVE_BOX.w} y={WAVE_BOX.y + WAVE_BOX.h * 0.5} anchor='end' color={AMBER} mono>
        门限
      </StageLabel>
      <StageLabel frame={frame} from={B[4].start + 30} to={B[5].end} x={WAVE_BOX.x} y={ROW_Y - 44} color={AMBER}>
        24 个采样点 → 24 个比特
      </StageLabel>
    </svg>
  )
}

/**
 * 第 5-8 拍：一张图 -> 像素网格 -> 明暗两态 -> 拉平成一串比特 -> 流入计算机。
 * 这一段一个解说句都没有，全靠几何变化把「编码」讲完。
 */
function ImageStage({ frame }: { frame: number }) {
  const CELLS = 16
  const imgIn = easeOut(frac(frame, B, 5, 0, 0.5))
  const pixIn = frac(frame, B, 6, 0.05, 0.85)
  const binIn = frac(frame, B, 7, 0.08, 0.9)
  const fly = frac(frame, B, 8, 0.1, 0.72)
  const intoChip = frac(frame, B, 8, 0.68, 1)

  const cell = IMG.size / CELLS
  const gap = 6
  const box = 48
  const streamCell = 30
  const sx = 946
  const sy = 430
  const chip = { x: sx + 40, y: 800, w: 460, h: 150 }
  const ease = (t: number) => 1 - Math.pow(1 - t, 3)

  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={imgIn}>
      <g opacity={1 - fly * 0.15}>
        {Array.from({ length: CELLS }, (_, r) =>
          Array.from({ length: CELLS }, (_, c) => {
            const value = image[r][c]
            const bit = value >= 0.5 ? 1 : 0
            const grey = Math.round(6 + value * 210)
            const sweep = (r * CELLS + c) / (CELLS * CELLS)
            const converted = clampf(sweep - binIn + 0.12)
            const fill = converted > 0.5 ? (bit ? alpha(AMBER, 0.86) : alpha(VIOLET, 0.22)) : 'rgb(' + grey + ',' + grey + ',' + grey + ')'
            return (
              <rect
                key={r + '-' + c}
                x={IMG.x + c * cell + gap / 2}
                y={IMG.y + r * cell + gap / 2}
                width={cell - gap}
                height={cell - gap}
                rx={3}
                fill={fill}
                stroke={alpha('#ffffff', 0.07 + 0.1 * pixIn)}
                strokeWidth={1}
              />
            )
          }),
        )}
      </g>
      {/* 比特流：每个像素格飞到右边排成一长串 */}
      <g opacity={fly > 0 ? 1 : 0}>
        {bits.map((bit, i) => {
          const r = Math.floor(i / CELLS)
          const c = i % CELLS
          const from = { x: IMG.x + c * cell + gap / 2, y: IMG.y + r * cell + gap / 2 }
          const to = { x: sx + (i % 32) * streamCell, y: sy + Math.floor(i / 32) * streamCell }
          const t = ease(clampf((fly - (i / (CELLS * CELLS)) * 0.22) / 0.78))
          const x = from.x + (to.x - from.x) * t
          const y = from.y + (to.y - from.y) * t
          const w = box + (streamCell - 6 - box) * t
          return (
            <rect
              key={'f' + i}
              x={x}
              y={y}
              width={w}
              height={w}
              rx={3}
              fill={bit ? alpha(AMBER, 0.88) : alpha(VIOLET, 0.26)}
            />
          )
        })}
      </g>
      {/* 数字读出来：比特到位之后才显示 0 / 1 */}
      <g opacity={Math.max(0, fly - 0.45) / 0.55}>
        {bits.map((bit, i) => (
          <text
            key={'t' + i}
            x={sx + (i % 32) * streamCell + streamCell / 2 - 3}
            y={sy + Math.floor(i / 32) * streamCell + streamCell / 2 + 7}
            fill={bit ? DEEP : MUTED}
            fontSize={19}
            fontFamily={MONO}
            textAnchor='middle'
          >
            {bit}
          </text>
        ))}
      </g>
      {/* 计算机：一串比特流进去 */}
      <g opacity={intoChip}>
        <rect x={chip.x} y={chip.y} width={chip.w} height={chip.h} rx={18} fill={alpha(BLUE, 0.08)} stroke={alpha(BLUE, 0.5)} strokeWidth={2} />
        {Array.from({ length: 7 }, (_, i) => (
          <rect key={i} x={chip.x + 34 + i * 58} y={chip.y + 30} width={40} height={40} rx={6} fill={alpha(SIGNAL, 0.22)} stroke={alpha(SIGNAL, 0.6)} strokeWidth={1.6} />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={'p' + i} x={chip.x + 44 + i * 58} y={chip.y + chip.h + 8} width={20} height={26} rx={4} fill={alpha(BLUE, 0.45)} />
        ))}
      </g>
      {/* 短标签：贴在正在变化的对象旁边 */}
      <StageLabel frame={frame} from={B[5].start + 10} to={B[6].start} x={IMG.x} y={IMG.y - 44} color={INK}>
        图像
      </StageLabel>
      <StageLabel frame={frame} from={B[6].start + 10} to={B[7].start} x={IMG.x} y={IMG.y - 44} color={INK}>
        像素 · 16 × 16
      </StageLabel>
      <StageLabel frame={frame} from={B[7].start + 10} to={B[8].start} x={IMG.x} y={IMG.y - 44} color={AMBER}>
        亮 / 不亮
      </StageLabel>
      <StageLabel frame={frame} from={B[8].start + 20} to={B[9].end} x={sx} y={sy - 40} color={AMBER}>
        256 个比特
      </StageLabel>
      <StageLabel frame={frame} from={B[8].start + 40} to={B[9].end} x={chip.x + chip.w / 2} y={chip.y + chip.h + 62} anchor='middle' color={BLUE}>
        数据流
      </StageLabel>
    </svg>
  )
}

const clampf = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)

/** 第 9-10 拍：电压不是一个点，而是一段范围 */
function RailStage({ frame }: { frame: number }) {
  const railIn = easeOut(frac(frame, B, 9, 0, 0.4))
  const probe = frac(frame, B, 10, 0.05, 0.95) * 5.2
  return (
    <svg width={STAGE_W} height={STAGE_H} style={STAGE_SVG} className='block' opacity={railIn}>
      <VoltageRailFigure x={RAIL.x} y={RAIL.y} width={RAIL.w} height={RAIL.h} probe={probe} />
      <StageLabel frame={frame} from={B[9].start + 12} to={B[10].start} x={RAIL.x} y={RAIL.y - 34} color={MUTED}>
        连续电压
      </StageLabel>
      <StageLabel frame={frame} from={B[10].start + 16} to={B[11].end} x={RAIL.x + RAIL.w * 0.5} y={RAIL.y + RAIL.h * 0.42} anchor='middle' color={AMBER}>
        未定义区
      </StageLabel>
    </svg>
  )
}

/** 第 11-12 拍：画面收成星空，只留下一个追问 */
function AskStage({ frame }: { frame: number }) {
  const askIn = easeOut(frac(frame, B, 11, 0.05, 0.4))
  const outIn = easeOut(frac(frame, B, 12, 0.02, 0.3))
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: askIn, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 320, textAlign: 'center', fontSize: 72, fontFamily: SERIF, color: INK, letterSpacing: '0.12em' }}>
        一条会起伏的曲线
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 424, textAlign: 'center', fontSize: 72, fontFamily: SERIF, color: INK, letterSpacing: '0.12em' }}>
        被切成了 0 和 1
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 600, textAlign: 'center', fontSize: 30, color: FAINT, letterSpacing: '0.24em', opacity: outIn }}>
        IT FROM BIT · WHEELER
      </div>
    </div>
  )
}
