import { useEffect, useState } from 'react'
import { motion, useScroll, useSpring } from 'motion/react'
import { CHAPTERS } from '../content'
import { cx } from './ui'

/** 顶部导航：章节跳转、当前章节高亮、阅读进度 */
export function Nav() {
  const [active, setActive] = useState(CHAPTERS[0].id)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 })

  useEffect(() => {
    const sections = CHAPTERS.map((chapter) => document.getElementById(chapter.id)).filter(
      (node): node is HTMLElement => Boolean(node),
    )
    if (!sections.length || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.2, 0.6, 1] },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  const linkClass = (id: string) =>
    cx(
      'block whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] transition-colors',
      active === id ? 'bg-signal/12 text-signal' : 'text-muted hover:text-paper',
    )

  return (
    <header className='fixed inset-x-0 top-0 z-50 border-b border-signal/10 bg-ink-950/80 backdrop-blur-md'>
      <motion.div className='h-px w-full origin-left bg-signal/60' style={{ scaleX: progress }} />
      <nav aria-label='章节导航' className='mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-3 sm:px-6'>
        <a href='#film' className='shrink-0 font-display text-[15px] tracking-[0.16em] text-paper transition-colors hover:text-signal'>
          硅基生命的猜想
        </a>
        <span aria-hidden='true' className='hidden h-3 w-px bg-signal/20 sm:block' />
        <ul className='flex flex-1 items-center gap-1 overflow-x-auto'>
          {CHAPTERS.slice(1).map((chapter) => (
            <li key={chapter.id}>
              <a href={'#' + chapter.id} aria-current={active === chapter.id ? 'true' : undefined} className={linkClass(chapter.id)}>
                {chapter.nav}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
