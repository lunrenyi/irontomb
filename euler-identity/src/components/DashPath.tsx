import type { ComponentProps } from 'react'
import { motion, useMotionTemplate, useTransform, type MotionValue } from 'motion/react'

interface DashArcProps extends Omit<ComponentProps<typeof motion.path>, 'style'> {
  style?: ComponentProps<typeof motion.path>['style']
  /** 已画出比例 0–1（会换算成 dasharray，配合 pathLength=1 使用） */
  length: MotionValue<number>
  /** 虚线缺口，默认 1（大于 0 即可） */
  spacing?: number
  /** 沿路径移动的位置 0–1 */
  offset?: MotionValue<number>
}

/**
 * 「画到一半的圆弧 / 沿路径跑的光点」。
 * SVG 的 pathLength 属性把路径长度归一化成 1，
 * 于是虚线长度可以直接用 0–1 的比例表达，不必自己算弧长。
 */
export function DashArc({ length, spacing = 1, offset, style, ...rest }: DashArcProps) {
  const dashArray = useMotionTemplate`${length} ${spacing}`
  const dashOffset = useTransform(offset ?? length, (value) => -value)

  return (
    <motion.path
      {...rest}
      pathLength={1}
      style={{ ...style, strokeDasharray: dashArray, strokeDashoffset: dashOffset }}
    />
  )
}

export default DashArc
