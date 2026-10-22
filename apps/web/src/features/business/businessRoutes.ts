export const reservedSlugs = new Set(['admin','api','assets','auth','billing','contact','contacto','icons','login','negocios','onboarding','planes','platform','points','precios','pricing','privacidad','profile','register','rewards','settings','terms','www','operar'])
export function isBusinessSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 80 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) && !reservedSlugs.has(value)
}
export function businessPath(slug: string, section = ''): string {
  if (!isBusinessSlug(slug)) throw new Error('Comercio inválido.')
  return `/${slug}${section ? `/${section}` : ''}`
}
const sections = new Set(['','profile','points','operar','admin','admin/categories','admin/products','admin/settings','admin/share'])
export function businessDestination(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const [,slug,...rest] = value.split('/')
  return value.startsWith('/') && isBusinessSlug(slug) && sections.has(rest.join('/')) && !value.endsWith('/') ? value : null
}
export function publicBusinessUrl(slug:string,origin:string):string{
  const base=new URL(origin)
  if(base.username||base.password||!(base.protocol==='https:'||(base.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(base.hostname))))throw new Error('Origen inválido para compartir la carta.')
  return new URL(businessPath(slug),base.origin).href
}
