import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/** 尊重系统「减少动态效果」设置 */
export function useReducedMotionPreference(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(QUERY)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    mql.addEventListener('change', onChange)
    setReduced(mql.matches)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return reduced
}
