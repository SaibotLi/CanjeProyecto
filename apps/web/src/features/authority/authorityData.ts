import type { AppClient } from '../auth/authData'
import { legacyBusinessSlug } from '../../config/platform'

// Kept only for compatibility with existing adapter consumers/tests.
export const operatingBusinessSlug = legacyBusinessSlug
export type AdminBusiness = { id: string; slug: string; name: string; isActive: boolean }
export type OperatorBusiness = AdminBusiness & { role: 'admin' | 'staff' }
export type Authority = {
  userId: string
  adminBusinesses: AdminBusiness[]
  tenant: AdminBusiness | null
  operatorBusinesses: OperatorBusiness[]
  operatorTenant: OperatorBusiness | null
  // DB membership only. Auth SDK assurance is deliberately separate.
  platform: { isAdmin: boolean }
}
type Membership = {
  user_id: string; business_id: string; role: string
  businesses: { id: string; slug: string; name: string; is_active: boolean } | null
}
export function mapAuthority(rows: Membership[], userId: string, slug = operatingBusinessSlug, platformAdmin = false): Authority {
  const businesses = rows.map(row => {
    if (row.user_id !== userId || !['admin', 'staff'].includes(row.role) || !row.businesses || row.businesses.id !== row.business_id) {
      throw new Error('No pudimos comprobar tus permisos.')
    }
    const b = row.businesses
    return { id: b.id, slug: b.slug, name: b.name, isActive: b.is_active, role: row.role as OperatorBusiness['role'] }
  })
  // Staff is recognized, but never enters existing Admin guards/actions/catalog.
  const adminBusinesses = businesses.filter(b => b.role === 'admin')
  return { userId, adminBusinesses, tenant: adminBusinesses.find(b => b.slug === slug) ?? null,
    operatorBusinesses: businesses, operatorTenant: businesses.find(b => b.slug === slug) ?? null,
    platform: { isAdmin: platformAdmin } }
}
export const isBusinessAdmin = (authority: Authority | null, businessId: string) =>
  !!authority?.adminBusinesses.some(b => b.id === businessId)
export const isBusinessOperator = (authority: Authority | null, businessId: string) =>
  !!authority?.operatorBusinesses.some(b => b.id === businessId)

export async function readCurrentPlatformCapability(client: AppClient, signal = AbortSignal.timeout(15000)): Promise<boolean> {
  const { data, error } = await client.rpc('is_current_user_platform_admin').abortSignal(signal)
  if (error || typeof data !== 'boolean') throw new Error('No pudimos comprobar tu acceso Platform.')
  return data
}

export async function readAuthority(client: AppClient, userId: string, signal = AbortSignal.timeout(15000)): Promise<Authority> {
  const rows: Membership[] = []
  const platformAdmin = await readCurrentPlatformCapability(client, signal)
  // Explicit own-user filter, also for Platform AAL2 sessions with wider RLS.
  // Stable pagination avoids silently truncating memberships at the REST limit.
  for (let start = 0; ; start += 500) {
    const { data, error } = await client.from('business_memberships')
      .select('user_id,business_id,role,businesses!business_memberships_business_fkey(id,slug,name,is_active)')
      .eq('user_id', userId).order('business_id').range(start, start + 499).abortSignal(signal)
    if (error || !data) throw new Error('No pudimos comprobar tus permisos.')
    rows.push(...data)
    if (data.length < 500) return mapAuthority(rows, userId, '', platformAdmin)
  }
}

export function scopeAuthority(authority: Authority, businessId: string): Authority {
  return { ...authority, tenant: authority.adminBusinesses.find(b=>b.id===businessId)??null,
    operatorTenant: authority.operatorBusinesses.find(b=>b.id===businessId)??null }
}
