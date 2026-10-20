import { useEffect, useState } from 'react'
import { cx } from './ui'

const LINKS = [
  { id: 'film', label: '影片' },
  { id: 'cosmos', label: '01 COSMOS' },
  { id: 'nature', label: '02 NATURE' },
  { id: 'civilization', label: '03 CIVILIZATION' },
  { id: 'human', label: '04 HUMAN' },
  { id: 'daily', label: '05 DAILY LIFE' },
  { id: 'whole', label: '06 WHOLE MODEL' },
  { id: 'text', label: '原文' },
]

export function Nav() {
  const [active, setActive] = useState('')
  const [solid, setSolid] = useState(false)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const ids = LINKS.map((l) => l.id)
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.2, 0.6] },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <header
      className={cx(
        'fixed inset-x-0 top-0 z-40 transition-colors duration-300',
        solid ? 'border-b border-white/10 bg-void/85 backdrop-blur-md' : 'bg-transparent',
      )}
    >
      <nav className='mx-auto flex max-w-[1360px] items-center gap-4 px-4 py-3 sm:px-6'>
        <a href='#top' className='flex shrink-0 items-center gap-2.5'>
          <span className='relative flex h-7 w-7 items-center justify-center rounded-md border border-cyan/50'>
            <span className='h-1.5 w-1.5 rounded-full bg-cyan' />
            <span className='absolute inset-0 rounded-md border border-cyan/20' />
          </span>
          <span className='font-mono text-[11px] tracking-[0.2em] text-paper'>QIANZI.EXE</span>
        </a>
        <ul className='ml-auto hidden items-center gap-1 lg:flex'>
          {LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={'#' + l.id}
                className={cx(
                  'rounded-full px-3 py-1.5 font-mono text-[11px] tracking-[0.12em] transition-colors',
                  active === l.id ? 'text-cyan' : 'text-muted hover:text-paper',
                )}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href='#film'
          className='ml-auto rounded-full border border-cyan/40 bg-cyan/10 px-4 py-1.5 font-mono text-[11px] tracking-[0.14em] text-cyan transition-colors hover:border-cyan hover:bg-cyan/20 lg:ml-0'
        >
          启动解码
        </a>
      </nav>
    </header>
  )
}
