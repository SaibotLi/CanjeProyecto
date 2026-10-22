import { Fragment } from 'react'
import { usePublicMenu } from '../features/menu/usePublicMenu'
import type { MenuCategory } from '../features/menu/types'
import { MenuSection } from '../features/menu/components/MenuSection'
import { CategoryNavigation } from '../features/menu/components/CategoryNavigation'
import { PointsOnboarding } from '../features/menu/components/PointsOnboarding'
import { MenuLoadState } from '../features/menu/components/MenuLoadState'
import { useActiveCategory } from '../features/menu/useActiveCategory'
import '../features/menu/menu.css'
import {useBusiness} from '../features/business/businessContext'
import {businessPath} from '../features/business/businessRoutes'

const noCategories: MenuCategory[] = []

export function MenuPage() {
  const {business}=useBusiness()
  const { state, retry } = usePublicMenu(business.slug)
  const menu = state.status === 'success' || state.status === 'empty' ? state.data : undefined
  const pointsEnabled=business.loyaltyEnabled&&menu?.pointsEnabled===true
  const categories = menu?.categories ?? noCategories
  const { activeSlug, navRef, selectCategory } = useActiveCategory(categories)
  return <div className="digital-menu">
    <h1 className="menu-accessible-title">Carta de {business.name}</h1>
    {business.presentation.description&&<p className="business-description">{business.presentation.description}</p>}
    <MenuLoadState status={state.status} onRetry={retry} />
    {state.status === 'success' && <CategoryNavigation categories={categories} activeSlug={activeSlug} onSelect={selectCategory} navRef={navRef} />}
    {categories.map((category, index) => <Fragment key={category.id}>
      {menu && <MenuSection category={category} items={menu.items.filter(item => item.categoryId === category.id)} currencyPerPoint={menu.previewCurrencyPerPoint} pointsEnabled={pointsEnabled} />}
      {index === 0 && menu&&pointsEnabled && <PointsOnboarding currencyPerPoint={menu.previewCurrencyPerPoint} businessName={business.name} pointsPath={businessPath(business.slug,'points')} />}
    </Fragment>)}
    {state.status === 'success' && <p className="menu-endnote">Precios en {business.currency}{pointsEnabled&&<> · Puntos estimados por producto, no un saldo.<br />La suma de estimaciones puede diferir de los puntos de un consumo total.</>}</p>}
  </div>
}
