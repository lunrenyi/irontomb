import { CARBON, ELEMENT_COLOR, ELEMENT_COMPARISON, SILICON, type ElementData, type MoleculeData } from '../lib/atoms'
import { AMBER, DEEP, FAINT, INK, MONO, MUTED, alpha } from './palette'

/** 一个原子：原子核 + 电子层 + 电子。全部按真实壳层数画。 */
export function AtomFigure({ x, y, scale = 1, data, spin = 0 }: { x: number; y: number; scale?: number; data: ElementData; spin?: number }) {
  const maxShell = Math.max(...data.shells)
  const shellR = 42 + maxShell * 16
  return (
    <g transform={'translate(' + x + ' ' + y + ') scale(' + scale + ')'} role='img' aria-label={data.name + '原子示意图'}>
      {data.shells.map((count, i) => {
        const r = shellR - (data.shells.length - 1 - i) * 16
        return (
          <g key={i}>
            <ellipse cx={0} cy={0} rx={r} ry={r * 0.92} fill='none' stroke={alpha(data.color, 0.32)} strokeWidth={1.4} />
            {Array.from({ length: count }, (_, k) => {
              const a = spin + (k / count) * Math.PI * 2
              return <circle key={k} cx={Math.cos(a) * r} cy={Math.sin(a) * r * 0.92} r={3.6} fill={data.color} opacity={0.9} />
            })}
          </g>
        )
      })}
      <circle cx={0} cy={0} r={11 + data.atomicNumber * 0.55} fill={alpha(data.color, 0.24)} stroke={data.color} strokeWidth={1.6} />
      <text x={0} y={6} fill={INK} fontSize={24} fontFamily={MONO} textAnchor='middle'>
        {data.symbol}
      </text>
      <text x={0} y={shellR + 32} fill={data.color} fontSize={26} textAnchor='middle'>
        {data.name} · {data.atomicNumber} 号元素
      </text>
      <text x={0} y={shellR + 58} fill={MUTED} fontSize={21} fontFamily={MONO} textAnchor='middle'>
        电子排布 {data.shells.join(' · ')}
      </text>
    </g>
  )
}

/** 分子：四面体用 z 表现立体感，网络结构就画成连通的格子 */
export function MoleculeFigure({ x, y, scale, data, highlightBond = -1 }: { x: number; y: number; scale: number; data: MoleculeData; highlightBond?: number }) {
  const at = (i: number) => ({ x: x + data.atoms[i].x * scale, y: y + data.atoms[i].y * scale })
  return (
    <g role='img' aria-label={data.name + '（' + data.formula + '）的结构示意'}>
      {data.bonds.map(([a, b], i) => {
        const p1 = at(a)
        const p2 = at(b)
        const hot = i === highlightBond
        return (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={hot ? AMBER : alpha(MUTED, 0.75)}
            strokeWidth={hot ? 4 : 2.4}
            strokeOpacity={hot ? 1 : 0.8}
          />
        )
      })}
      {data.atoms.map((atom, i) => {
        const p = at(i)
        // 半径是固定的像素尺寸，不能跟着 scale 走：
        // scale 只负责把分子的坐标空间放大，原子大小另有其尺度
        const r = atom.element === 'H' ? 9 : 15
        const color = ELEMENT_COLOR[atom.element] ?? INK
        const z = atom.z ?? 0
        return (
          <g key={atom.element + i}>
            {z !== 0 ? <ellipse cx={p.x} cy={p.y} rx={r} ry={r * 0.9} fill={alpha(DEEP, 0.85)} stroke={color} strokeWidth={2} /> : null}
            <circle cx={p.x} cy={p.y} r={r} fill={alpha(color, 0.2 + Math.max(0, z) * 0.3)} stroke={color} strokeWidth={2} />
            <text x={p.x} y={p.y + r * 0.36} fill={INK} fontSize={r * 1.1} fontFamily={MONO} textAnchor='middle'>
              {atom.element}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/** 对照表：相似在哪、差在哪，一行一条 */
export function ElementTable({ x, y, width = 900 }: { x: number; y: number; width?: number }) {
  const rows = ELEMENT_COMPARISON
  const colW = width / 3
  return (
    <g role='img' aria-label='碳与硅的逐项对照'>
      {['项目', '碳', '硅'].map((h, i) => (
        <text key={h} x={x + i * colW} y={y} fill={MUTED} fontSize={25}>
          {h}
        </text>
      ))}
      {rows.map((row, r) => (
        <g key={row.label} transform={'translate(' + x + ' ' + (y + 38 + r * 62) + ')'}>
          <line x1={-16} y1={-24} x2={width} y2={-24} stroke={alpha(FAINT, 0.25)} strokeWidth={1} />
          <text x={0} y={0} fill={INK} fontSize={24}>
            {row.label}
          </text>
          <text x={colW} y={0} fill={CARBON.color} fontSize={24} fontFamily={MONO}>
            {row.carbon}
          </text>
          <text x={colW * 2} y={0} fill={SILICON.color} fontSize={24} fontFamily={MONO}>
            {row.silicon}
          </text>
          <text x={0} y={26} fill={FAINT} fontSize={20}>
            {row.meaning}
          </text>
        </g>
      ))}
    </g>
  )
}
