import { Fragment } from 'react'
import { usePublicMenu } from '../features/menu/usePublicMenu'
import type { MenuCategory } from '../features/menu/types'
import { MenuSection } from '../features/menu/components/MenuSection'
import { CategoryNavigation } from '../features/menu/components/CategoryNavigation'
import { PointsOnboarding } from '../features/menu/components/PointsOnboarding'
import { MenuLoadState } from '../features/menu/components/MenuLoadState'
import { useActiveCategory } from '../features/menu/useActiveCategory'
import '../features/menu/menu.css'

const noCategories: MenuCategory[] = []

export function MenuPage() {
  const { state, retry } = usePublicMenu()
  const menu = state.status === 'success' || state.status === 'empty' ? state.data : undefined
  const categories = menu?.categories ?? noCategories
  const { activeSlug, navRef, selectCategory } = useActiveCategory(categories)
  return <div className="digital-menu">
    <h1 className="menu-accessible-title">Carta de bebidas de Valhalla</h1>
    <MenuLoadState status={state.status} onRetry={retry} />
    {state.status === 'success' && <CategoryNavigation categories={categories} activeSlug={activeSlug} onSelect={selectCategory} navRef={navRef} />}
    {categories.map((category, index) => <Fragment key={category.id}>
      {menu && <MenuSection category={category} items={menu.items.filter(item => item.categoryId === category.id)} currencyPerPoint={menu.previewCurrencyPerPoint} pointsEnabled={menu.pointsEnabled} />}
      {index === 0 && menu?.pointsEnabled && <PointsOnboarding currencyPerPoint={menu.previewCurrencyPerPoint} />}
    </Fragment>)}
    {state.status === 'success' && <p className="menu-endnote">Precios en ARS · Puntos estimados por producto, no un saldo.<br />La suma de estimaciones puede diferir de los puntos de un consumo total.</p>}
  </div>
}
