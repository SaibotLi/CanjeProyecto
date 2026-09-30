import { useCallback, useEffect, useRef, useState } from 'react'
import type { MenuCategory } from './types'

export function useActiveCategory(categories: MenuCategory[]) {
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug ?? '')
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const threshold = (navRef.current?.getBoundingClientRect().height ?? 72) + 24
      let active = categories[0]?.slug ?? ''
      for (const category of categories) {
        if ((document.getElementById(category.slug)?.getBoundingClientRect().top ?? Infinity) <= threshold) active = category.slug
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) active = categories.at(-1)?.slug ?? active
      setActiveSlug(active)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [categories])
  const selectCategory = useCallback((slug: string) => {
    const section = document.getElementById(slug)
    if (!section) return
    const offset = (navRef.current?.getBoundingClientRect().height ?? 72) + 16
    window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - offset, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    setActiveSlug(slug)
  }, [])
  return { activeSlug, navRef, selectCategory }
}
