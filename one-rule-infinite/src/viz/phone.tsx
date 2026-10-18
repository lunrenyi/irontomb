/**
 * 第二幕的视觉高潮：一台由知识网络「组装出来」的智能手机。
 *
 * 它不是一张图片淡入，而是：
 *   1. 机身轮廓被连线一笔一笔描出来；
 *   2. 屏幕亮起；
 *   3. 芯片、电池、无线通信、屏幕传感器、软件系统五个模块
 *      依次在机身里点亮 —— 每一个都对应网络里真实的一个节点；
 *   4. 摄像模组最后合上。
 */

export const PHONE_W = 300
export const PHONE_H = 600

/**
 * 机身在网络里的缩放。
 *
 * 机身画在手机节点的正中央，而不是吊在节点上方，
 * 于是它的高度完全落在整张网络的包围盒之内 —— 镜头拉到全景时也不会被画面上沿切掉。
 */
export const PHONE_GLYPH_SCALE = 0.8

/** 五个模块在机身里的位置（世界坐标，相对机身中心） */
const SLOTS: { id: string; label: string; x: number; y: number }[] = [
  { id: 'chip', label: '芯片', x: 0, y: -168 },
  { id: 'radio', label: '通信', x: -68, y: -62 },
  { id: 'os', label: '系统', x: 68, y: -62 },
  { id: 'battery', label: '电池', x: -68, y: 96 },
  { id: 'display', label: '显示', x: 68, y: 96 },
]

export function phoneBodyPath(w: number = PHONE_W, h: number = PHONE_H): string {
  const rx = 40
  const hw = w / 2
  const hh = h / 2
  return (
    'M ' + (-hw + rx) + ' ' + -hh +
    ' L ' + (hw - rx) + ' ' + -hh +
    ' Q ' + hw + ' ' + -hh + ' ' + hw + ' ' + (-hh + rx) +
    ' L ' + hw + ' ' + (hh - rx) +
    ' Q ' + hw + ' ' + hh + ' ' + (hw - rx) + ' ' + hh +
    ' L ' + (-hw + rx) + ' ' + hh +
    ' Q ' + -hw + ' ' + hh + ' ' + -hw + ' ' + (hh - rx) +
    ' L ' + -hw + ' ' + (-hh + rx) +
    ' Q ' + -hw + ' ' + -hh + ' ' + (-hw + rx) + ' ' + -hh + ' Z'
  )
}

export function phoneScreenPath(w: number = PHONE_W, h: number = PHONE_H): string {
  const rx = 28
  const i = 11
  const l = -w / 2 + i
  const r = w / 2 - i
  const t = -h / 2 + i
  const b = h / 2 - i
  return (
    'M ' + (l + rx) + ' ' + t +
    ' L ' + (r - rx) + ' ' + t +
    ' Q ' + r + ' ' + t + ' ' + r + ' ' + (t + rx) +
    ' L ' + r + ' ' + (b - rx) +
    ' Q ' + r + ' ' + b + ' ' + (r - rx) + ' ' + b +
    ' L ' + (l + rx) + ' ' + b +
    ' Q ' + l + ' ' + b + ' ' + l + ' ' + (b - rx) +
    ' L ' + l + ' ' + (t + rx) +
    ' Q ' + l + ' ' + t + ' ' + (l + rx) + ' ' + t + ' Z'
  )
}

export interface PhoneGlyphProps {
  /** 0-1：整体组装进度（机身 -> 屏幕 -> 五个模块 -> 摄像模组） */
  assemble: number
  /** 五个模块各自点亮的进度 */
  parts: Record<string, number>
  /** 一个世界单位对应多少像素，用来把描边宽度固定成像素 */
  cameraScale?: number
  opacity?: number
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export function PhoneGlyph({ assemble, parts, cameraScale = 1, opacity = 1 }: PhoneGlyphProps) {
  if (assemble <= 0.001) return null
  const u = 1 / Math.max(0.02, cameraScale)
  const body = clamp01(assemble / 0.26)
  const screen = clamp01((assemble - 0.18) / 0.24)
  const camera = clamp01((assemble - 0.72) / 0.2)
  const rise = clamp01((assemble - 0.3) / 0.5)

  return (
    <g opacity={opacity}>
      {/* 机身轮廓：由汇聚过来的连线一笔一笔描出 */}
      <path
        d={phoneBodyPath()}
        fill={'#0b1a16'}
        fillOpacity={0.55 * body}
        stroke={'#9fe8c4'}
        strokeWidth={2.4 * u}
        strokeOpacity={0.85 * body}
        strokeLinejoin='round'
        pathLength={1}
        strokeDasharray={body + ' 1'}
      />

      {/* 屏幕 */}
      {screen > 0.01 ? (
        <g opacity={screen}>
          <path d={phoneScreenPath()} fill={'#071310'} stroke={'#2f6a57'} strokeWidth={1.1 * u} />
          <rect x={-18} y={-PHONE_H / 2 + 20} width={36} height={7} rx={3.5} fill={'#2f6a57'} opacity={0.6} />
        </g>
      ) : null}

      {/* 五个模块：一个一个亮起来，每一个都对应网络里的一个节点 */}
      {SLOTS.map((slot) => {
        const t = clamp01(parts[slot.id] ?? 0)
        if (t <= 0.01) return null
        const dy = (1 - t) * 18 * (1 - rise)
        return (
          <g key={slot.id} transform={'translate(' + slot.x + ' ' + (slot.y + dy) + ')'} opacity={t}>
            <rect x={-40} y={-21} width={80} height={42} rx={12} fill={'#0f2a22'} stroke={'#7df0c0'} strokeWidth={1.4 * u} strokeOpacity={0.85} />
            <rect x={-40} y={-21} width={80} height={42} rx={12} fill={'#7df0c0'} opacity={0.07} />
            <circle cx={-25} cy={0} r={4.5 * u} fill={'#ffd479'} />
            <text x={7} y={5} textAnchor='middle' fill={'#cfe9dd'} fontSize={17 * u}>
              {slot.label}
            </text>
          </g>
        )
      })}

      {/* 摄像模组最后合上 */}
      {camera > 0.01 ? (
        <g opacity={camera} transform={'translate(-128 -268)'}>
          <rect x={-8} y={-17} width={96} height={34} rx={17} fill={'#0f2a22'} stroke={'#3f7f6c'} strokeWidth={1.2 * u} />
          <circle cx={12} cy={0} r={9} fill={'#0a1f19'} stroke={'#7df0c0'} strokeWidth={1.4 * u} />
          <circle cx={40} cy={0} r={9} fill={'#0a1f19'} stroke={'#7df0c0'} strokeWidth={1.4 * u} />
          <circle cx={66} cy={0} r={5} fill={'#ffd479'} opacity={0.75} />
        </g>
      ) : null}
    </g>
  )
}
