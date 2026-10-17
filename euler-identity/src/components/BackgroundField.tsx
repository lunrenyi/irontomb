import { useMemo } from 'react'

/** 全站背景：网格、渐变与少量缓慢漂移的光点。全部 pointer-events-none，不抢阅读。 */
export function BackgroundField() {
  const motes = useMemo(
    () => [
      { left: '12%', top: '22%', animationDelay: '0s' },
      { left: '78%', top: '14%', animationDelay: '-6s' },
      { left: '62%', top: '68%', animationDelay: '-12s' },
      { left: '28%', top: '82%', animationDelay: '-18s' },
      { left: '88%', top: '52%', animationDelay: '-3s' },
    ],
    [],
  )

  return (
    <div aria-hidden='true'>
      <div className='bg-field' />
      <div className='bg-grid' />
      <div className='bg-motes'>
        {motes.map((mote, index) => (
          <span key={index} style={{ left: mote.left, top: mote.top, animationDelay: mote.animationDelay }} />
        ))}
      </div>
    </div>
  )
}

export default BackgroundField
