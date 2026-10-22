import type { AppClient } from '../auth/authData'
import type { Database } from '../../../../../supabase/types/database.types'
import { isBusinessSlug } from './businessRoutes'

export type Presentation = Database['public']['Tables']['business_presentation']['Row']
export type Business = { id: string; slug: string; name: string; isActive: boolean; currency: string; timezone: string; loyaltyEnabled: boolean; presentation: Presentation }
const columns = 'id,slug,name,is_active,currency_code,timezone,business_entitlements(business_id,loyalty_enabled),business_presentation(*)' as const
export async function readBusiness(client: AppClient, slug: string, signal: AbortSignal): Promise<Business | null> {
  if (!isBusinessSlug(slug)) return null
  const { data, error } = await client.from('businesses').select(columns).eq('slug',slug).abortSignal(signal).maybeSingle()
  if (error) throw new Error('No pudimos cargar el comercio.')
  if (!data) return null
  if (data.slug !== slug || data.business_entitlements?.business_id !== data.id || data.business_presentation?.business_id !== data.id) throw new Error('Configuración del comercio incompleta.')
  return { id:data.id,slug:data.slug,name:data.name,isActive:data.is_active,currency:data.currency_code,timezone:data.timezone,
    loyaltyEnabled:data.business_entitlements.loyalty_enabled,presentation:data.business_presentation }
}
