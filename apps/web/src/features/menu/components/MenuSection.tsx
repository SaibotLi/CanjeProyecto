import type { MenuCategory, MenuItem } from '../types'
import { MenuItemCard } from './MenuItemCard'

export function MenuSection({ category, items, currencyPerPoint, number }: { category: MenuCategory; items: MenuItem[]; currencyPerPoint: number; number: number }) {
  return <section className="drink-section" id={category.slug} aria-labelledby={`${category.slug}-title`} data-menu-section>
    <div className="drink-section-heading"><span className="section-number" aria-hidden="true">{String(number).padStart(2, '0')}</span><h2 id={`${category.slug}-title`}>{category.name}</h2><span className="section-count">{items.length} bebidas</span></div>
    <div className="drink-grid">{items.map(item => <MenuItemCard key={item.id} item={item} currencyPerPoint={currencyPerPoint} />)}</div>
  </section>
}
