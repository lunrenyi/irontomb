/** 页面背景：网格 + 缓慢漂移的少量光点。只负责空间感，不参与阅读。 */
export function Backdrop() {
  const motes = [
    { left: '12%', top: '18%', delay: '0s', size: 3 },
    { left: '38%', top: '62%', delay: '-6s', size: 2 },
    { left: '64%', top: '26%', delay: '-12s', size: 2.5 },
    { left: '82%', top: '74%', delay: '-3s', size: 3 },
    { left: '26%', top: '86%', delay: '-9s', size: 2 },
    { left: '90%', top: '36%', delay: '-15s', size: 2 },
  ]
  return (
    <>
      <div className='bg-field' aria-hidden='true' />
      <div className='bg-grid' aria-hidden='true' />
      <div aria-hidden='true'>
        {motes.map((mote, i) => (
          <span
            key={i}
            className='fixed z-0 rounded-full bg-shoot/40'
            style={{
              left: mote.left,
              top: mote.top,
              width: mote.size,
              height: mote.size,
              animation: 'mote-drift 30s ease-in-out infinite',
              animationDelay: mote.delay,
            }}
          />
        ))}
      </div>
      <style>{'@keyframes mote-drift { 0%,100% { transform: translate3d(0,0,0); opacity: 0.12 } 50% { transform: translate3d(16px,-26px,0); opacity: 0.4 } }'}</style>
    </>
  )
}
