import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface MathProps {
  tex: string
  display?: boolean
  className?: string
  /** 影片里需要精确控制字号与颜色 */
  style?: React.CSSProperties
  /** 给屏幕阅读器的替代描述 */
  label?: string
}

/** KaTeX 公式渲染：颜色继承 currentColor，用 aria-label 提供无障碍描述 */
export function Formula({ tex, display = false, className = '', style, label }: MathProps) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        output: 'html',
        strict: false,
      }),
    [tex, display],
  )

  return (
    <span
      role='math'
      aria-label={label ?? tex}
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default Formula
