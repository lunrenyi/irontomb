import { useEffect, useRef, useState } from 'react'

interface Options {
  threshold?: number
  once?: boolean
  rootMargin?: string
}

/** 元素进入视口时触发（影片播放器用它决定什么时候开始放） */
export function useInView<T extends HTMLElement>({ threshold = 0.35, once = true, rootMargin }: Options = {}) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true)
            if (once) observer.unobserve(entry.target)
          } else if (!once) {
            setInView(false)
          }
        })
      },
      { threshold, rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, once, rootMargin])

  return { ref, inView }
}
