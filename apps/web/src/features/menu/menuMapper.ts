import type { PublicMenuItemRow, PublicMenuRow } from './publicMenuQuery'
import type { MenuData, MenuItem } from './types'

type ImageUrlResolver = (path: string) => string
const byDisplayOrder = (a: { displayOrder: number; id: string }, b: { displayOrder: number; id: string }) =>
  a.displayOrder - b.displayOrder || a.id.localeCompare(b.id)

export function mapMenuItem(row: PublicMenuItemRow, publicImageUrl: ImageUrlResolver): MenuItem {
  if (!Number.isFinite(row.price_amount) || row.price_amount < 0) throw new Error('Invalid menu price')
  if (!['photo', 'cutout'].includes(row.image_presentation)) throw new Error('Invalid image presentation')
  return {
    id: row.id, businessId: row.business_id, categoryId: row.category_id,
    name: row.name, description: row.description ?? undefined, price: row.price_amount,
    imageUrl: row.image_path === null ? undefined : publicImageUrl(row.image_path),
    imageAlt: row.image_alt ?? undefined,
    imagePresentation: row.image_presentation === 'cutout' ? 'cutout' : undefined,
    isAvailable: row.is_available, isFeatured: row.is_featured, displayOrder: row.display_order,
  }
}

/** Explicit mapping, not a DB row cast. Empty categories are intentionally hidden. */
export function mapPublicMenu(row: PublicMenuRow, publicImageUrl: ImageUrlResolver): MenuData {
  const settings = row.loyalty_settings
  if (!row.is_active || !settings || !Number.isFinite(settings.currency_per_point) || settings.currency_per_point <= 0) {
    throw new Error('Invalid published menu settings')
  }
  const categories: MenuData['categories'] = []
  const items: MenuItem[] = []
  for (const category of row.menu_categories) {
    if (!category.is_active) continue
    const published = category.menu_items.filter(item => item.is_active)
    if (!published.length) continue
    if (published.some(item => item.business_id !== row.id || item.category_id !== category.id)) {
      throw new Error('Invalid menu tenant relation')
    }
    categories.push({ id: category.id, name: category.name, slug: category.slug, displayOrder: category.display_order })
    items.push(...published.map(item => mapMenuItem(item, publicImageUrl)))
  }
  return {
    categories: categories.sort(byDisplayOrder), items: items.sort(byDisplayOrder),
    previewCurrencyPerPoint: settings.currency_per_point, pointsEnabled: settings.points_enabled,
  }
}
