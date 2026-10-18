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
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.2, 0.6, 1] },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  const currentIndex = CHAPTERS.findIndex((chapter) => chapter.id === active)

  return (
    <header className='fixed inset-x-0 top-0 z-50'>
      <div className='relative border-b border-moss/12 bg-ink-950/72 backdrop-blur-md'>
        <nav aria-label='章节导航' className='mx-auto flex max-w-[1240px] items-center gap-4 px-4 py-3 sm:px-6'>
          <a href='#film' className='group flex shrink-0 items-center gap-2.5'>
            <span className='relative flex h-7 w-7 items-center justify-center'>
              <span className='absolute inset-0 rounded-full border border-leaf/45' />
              <span className='h-1.5 w-1.5 rounded-full bg-shoot shadow-[0_0_10px_rgba(125,240,192,0.9)]' />
            </span>
            <span className='hidden text-[13px] font-medium tracking-[0.18em] text-paper/90 sm:block'>一条规则，长出无限</span>
          </a>

          <div className='-mx-1 flex flex-1 items-center gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            {CHAPTERS.map((chapter, index) => {
              const isActive = chapter.id === active
              return (
                <a
                  key={chapter.id}
                  href={'#' + chapter.id}
                  aria-current={isActive ? 'true' : undefined}
                  className={cx(
                    'relative shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-colors duration-200 sm:text-[13px]',
                    isActive ? 'text-paper' : 'text-muted hover:text-paper/80',
                  )}
                >
                  {isActive ? (
                    <motion.span
                      layoutId='nav-pill'
                      className='absolute inset-0 rounded-full border border-shoot/30 bg-shoot/10'
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                  <span className='relative'>
                    <span className='mr-1.5 font-mono text-[10px] text-faint'>{String(index + 1).padStart(2, '0')}</span>
                    {chapter.nav}
                  </span>
                </a>
              )
            })}
          </div>

          <span className='shrink-0 font-mono text-[11px] text-faint'>
            {String(currentIndex + 1).padStart(2, '0')} / {String(CHAPTERS.length).padStart(2, '0')}
          </span>
        </nav>
        <motion.div className='h-px origin-left bg-gradient-to-r from-leaf via-shoot to-bud' style={{ scaleX: progress }} aria-hidden='true' />
      </div>
    </header>
  )
}

export default Nav
