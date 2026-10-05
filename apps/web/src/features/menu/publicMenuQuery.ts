import type { QueryData, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../../supabase/types/database.types'

export const PUBLIC_MENU_SLUG = 'valhalla-space'

/** One PostgREST statement/snapshot, including children via their tenant FKs.
 * Left embeddings retain an active business with an empty published menu.
 * Publication filters are mandatory even when the client holds an admin JWT.
 */
export function publicMenuQuery(client: SupabaseClient<Database>, slug = PUBLIC_MENU_SLUG) {
  return client.from('businesses').select(`
    id, is_active,
    loyalty_settings(currency_per_point, points_enabled),
    menu_categories!menu_categories_business_fkey(
      id, name, slug, display_order, is_active,
      menu_items!menu_items_business_category_fkey(
        id, business_id, category_id, name, description, price_amount,
        image_path, image_alt, image_presentation, is_active,
        is_available, is_featured, display_order
      )
    )
  `)
    .eq('slug', slug)
    .eq('is_active', true)
    .eq('menu_categories.is_active', true)
    .eq('menu_categories.menu_items.is_active', true)
    .order('display_order', { referencedTable: 'menu_categories' })
    .order('id', { referencedTable: 'menu_categories' })
    .order('display_order', { referencedTable: 'menu_categories.menu_items' })
    .order('id', { referencedTable: 'menu_categories.menu_items' })
}

export type PublicMenuRow = QueryData<ReturnType<typeof publicMenuQuery>>[number]
export type PublicMenuItemRow = PublicMenuRow['menu_categories'][number]['menu_items'][number]
