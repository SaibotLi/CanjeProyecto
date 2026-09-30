import { Fragment, useMemo } from 'react'
import { mockMenu } from '../features/menu/data'
import { MenuSection } from '../features/menu/components/MenuSection'
import { CategoryNavigation } from '../features/menu/components/CategoryNavigation'
import { PointsOnboarding } from '../features/menu/components/PointsOnboarding'
import { useActiveCategory } from '../features/menu/useActiveCategory'
import '../features/menu/menu.css'

export function MenuPage() {
  const categories = useMemo(() => [...mockMenu.categories].sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id)), [])
  const items = useMemo(() => [...mockMenu.items].sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id)), [])
  const { activeSlug, navRef, selectCategory } = useActiveCategory(categories)
  return <div className="digital-menu">
    <header className="menu-heading"><h1>Carta Digital</h1><p>Tu próximo brindis. <span aria-hidden="true">/</span> Solo bebidas.</p></header>
    <CategoryNavigation categories={categories} activeSlug={activeSlug} onSelect={selectCategory} navRef={navRef} />
    {categories.map((category, index) => <Fragment key={category.id}>
      <MenuSection category={category} items={items.filter(item => item.categoryId === category.id)} currencyPerPoint={mockMenu.previewCurrencyPerPoint} number={index + 1} />
      {index === 0 && <PointsOnboarding currencyPerPoint={mockMenu.previewCurrencyPerPoint} />}
    </Fragment>)}
    <p className="menu-endnote">Carta de muestra · Productos, precios y disponibilidad ilustrativos.<br />Consultá la disponibilidad real con el equipo de Valhalla.</p>
  </div>
}
