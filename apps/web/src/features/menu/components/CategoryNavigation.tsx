import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { MenuCategory } from '../types'

export function CategoryNavigation({ categories, activeSlug, onSelect, navRef }: { categories: MenuCategory[]; activeSlug: string; onSelect: (slug: string) => void; navRef: RefObject<HTMLElement | null> }) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const container = listRef.current
    const selected = container?.querySelector<HTMLElement>('[aria-current="location"]')
    if (!container || !selected) return
    // Desplazar solo el carril horizontal; no mover la página al cambiar la categoría.
    const left = selected.offsetLeft
    const right = left + selected.offsetWidth
    if (left < container.scrollLeft || right > container.scrollLeft + container.clientWidth) {
      container.scrollTo({ left: left - (container.clientWidth - selected.offsetWidth) / 2, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
  }, [activeSlug])
  return <nav className="menu-category-nav" aria-label="Categorías de bebidas" ref={navRef}><div className="menu-category-track" ref={listRef}>
    {categories.map(category => <a key={category.id} href={`#${category.slug}`} className={activeSlug === category.slug ? 'menu-category-link active' : 'menu-category-link'} aria-current={activeSlug === category.slug ? 'location' : undefined} onClick={event => { event.preventDefault(); onSelect(category.slug) }}>{category.name}</a>)}
  </div></nav>
}
