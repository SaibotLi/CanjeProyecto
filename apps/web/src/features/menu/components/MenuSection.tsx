import type { MenuCategory, MenuItem } from '../types'
import { MenuItemCard } from './MenuItemCard'

export function MenuSection({ category, items, currencyPerPoint, pointsEnabled }: { category: MenuCategory; items: MenuItem[]; currencyPerPoint: number; pointsEnabled?: boolean }) {
  return <section className="drink-section" id={category.slug} aria-labelledby={`${category.slug}-title`} data-menu-section>
    <div className="drink-section-heading"><h2 id={`${category.slug}-title`}>{category.name}</h2><span className="section-count">{items.length} bebidas</span></div>
    <div className="drink-grid">{items.map(item => <MenuItemCard key={item.id} item={item} currencyPerPoint={currencyPerPoint} pointsEnabled={pointsEnabled} />)}</div>
  </section>
}
