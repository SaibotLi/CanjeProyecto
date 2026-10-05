import type { Database } from '../../../../../supabase/types/database.types'
import type { AppClient } from '../auth/authData'
import { publicMenuImageUrl } from '../menu/publicMenu'

export type AdminCategory = { id: string; businessId: string; name: string; slug: string; displayOrder: number; isActive: boolean }
export type AdminItem = { id: string; businessId: string; categoryId: string; name: string; description: string;
  price: number; imagePath: string | null; imageUrl?: string; imageAlt: string; imagePresentation: 'photo' | 'cutout';
  isAvailable: boolean; isFeatured: boolean; isActive: boolean; displayOrder: number }
export type AdminCatalog = { categories: AdminCategory[]; items: AdminItem[] }
export type CategoryDraft = { name: string; slug: string; displayOrder: string; isActive: boolean }
export type ItemDraft = { categoryId: string; name: string; description: string; price: string;
  imageAlt: string; imagePresentation: 'photo' | 'cutout'; isAvailable: boolean; isFeatured: boolean; isActive: boolean; displayOrder: string }
export type UploadedAsset = { userId: string; businessId: string; path: string }
export class AdminError extends Error {
  constructor(message: string, public kind: 'validation' | 'authority' | 'save' | 'upload' | 'image-save' | 'session', public asset?: UploadedAsset) { super(message) }
}
export const adminMessage = (error: unknown) => error instanceof AdminError ? error.message : 'No pudimos completar la operación. Revisá la conexión y volvé a comprobar el catálogo.'
const categoryColumns = 'id,business_id,name,slug,display_order,is_active' as const
const itemColumns = 'id,business_id,category_id,name,description,price_amount,image_path,image_alt,image_presentation,is_available,is_featured,is_active,display_order' as const
type CategoryRow = Database['public']['Tables']['menu_categories']['Row']
type ItemRow = Database['public']['Tables']['menu_items']['Row']
export function mapCategory(row: Pick<CategoryRow, 'id' | 'business_id' | 'name' | 'slug' | 'display_order' | 'is_active'>, businessId: string): AdminCategory {
  if (row.business_id !== businessId) throw new AdminError('Categoría fuera del negocio actual.', 'authority')
  return { id: row.id, businessId, name: row.name, slug: row.slug, displayOrder: row.display_order, isActive: row.is_active }
}
export function mapItem(row: Omit<ItemRow, 'created_at' | 'updated_at'>, businessId: string, client: AppClient): AdminItem {
  if (row.business_id !== businessId || !['photo', 'cutout'].includes(row.image_presentation)) throw new AdminError('Producto no disponible.', 'authority')
  return { id: row.id, businessId, categoryId: row.category_id, name: row.name, description: row.description ?? '', price: row.price_amount,
    imagePath: row.image_path, imageUrl: row.image_path ? publicMenuImageUrl(client, row.image_path) : undefined,
    imageAlt: row.image_alt ?? '', imagePresentation: row.image_presentation as 'photo' | 'cutout', isAvailable: row.is_available,
    isFeatured: row.is_featured, isActive: row.is_active, displayOrder: row.display_order }
}
export async function readAdminCatalog(client: AppClient, businessId: string, signal = AbortSignal.timeout(15000)): Promise<AdminCatalog> {
  const categories: AdminCategory[] = [], items: AdminItem[] = []
  for (let start = 0; ; start += 500) {
    const { data, error } = await client.from('menu_categories').select(categoryColumns).eq('business_id', businessId)
      .order('display_order').order('id').range(start, start + 499).abortSignal(signal)
    if (error || !data) throw new AdminError('No pudimos cargar las categorías.', 'save')
    categories.push(...data.map(row => mapCategory(row, businessId)))
    if (data.length < 500) break
  }
  for (let start = 0; ; start += 500) {
    const { data, error } = await client.from('menu_items').select(itemColumns).eq('business_id', businessId)
      .order('display_order').order('id').range(start, start + 499).abortSignal(signal)
    if (error || !data) throw new AdminError('No pudimos cargar los productos.', 'save')
    items.push(...data.map(row => mapItem(row, businessId, client)))
    if (data.length < 500) break
  }
  return { categories, items }
}
export function parsePrice(value: string): number {
  const input = value.trim()
  // Deliberately no thousands separators/exponent/currency symbols. Never strip punctuation.
  if (!/^\d{1,12}(?:[.,]\d{1,2})?$/.test(input)) throw new AdminError('Precio: usá ARS sin separador de miles y hasta dos decimales (6500,50).', 'validation')
  const number = Number(input.replace(',', '.'))
  if (!Number.isFinite(number) || number < 0 || number > 999999999999.99) throw new AdminError('Precio fuera del rango permitido.', 'validation')
  return number
}
export const priceInput = (price: number) => price.toFixed(2).replace('.', ',')
function order(value: string): number {
  if (!/^\d{1,10}$/.test(value) || Number(value) > 2147483647) throw new AdminError('Orden: usá un entero entre 0 y 2147483647.', 'validation')
  return Number(value)
}
function text(value: string, max: number, label: string): string {
  const normalized = value.trim()
  if (!normalized || normalized.length > max) throw new AdminError(`${label}: completá entre 1 y ${max} caracteres.`, 'validation')
  return normalized
}
export function categoryPayload(draft: CategoryDraft) {
  const slug = draft.slug.trim()
  if (slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new AdminError('Slug: letras minúsculas, números y guiones simples, hasta 80 caracteres.', 'validation')
  return { name: text(draft.name, 80, 'Nombre'), slug, display_order: order(draft.displayOrder), is_active: draft.isActive }
}
export function itemPayload(draft: ItemDraft, imagePath: string | null, categories: AdminCategory[]) {
  if (!categories.some(c => c.id === draft.categoryId)) throw new AdminError('Elegí una categoría del negocio actual.', 'validation')
  if (draft.description.length > 2000 || draft.imageAlt.trim().length > 240 || !['photo', 'cutout'].includes(draft.imagePresentation)) {
    throw new AdminError('Revisá la descripción, el texto alternativo y la presentación.', 'validation')
  }
  return { category_id: draft.categoryId, name: text(draft.name, 120, 'Nombre'), description: draft.description.trim() || null,
    price_amount: parsePrice(draft.price), image_path: imagePath, image_alt: draft.imageAlt.trim() || null,
    image_presentation: draft.imagePresentation, is_available: draft.isAvailable, is_featured: draft.isFeatured,
    is_active: draft.isActive, display_order: order(draft.displayOrder) }
}
export async function saveCategory(client: AppClient, businessId: string, draft: CategoryDraft, id?: string) {
  const payload = categoryPayload(draft)
  const query = id ? client.from('menu_categories').update(payload).eq('business_id', businessId).eq('id', id)
    : client.from('menu_categories').insert({ business_id: businessId, ...payload })
  const { data, error } = await query.select(categoryColumns).single()
  // PATCH 200 + [] is NOT success. .single() requires one representation.
  if (error || !data) throw new AdminError('No se confirmó el guardado. Actualizá el catálogo y los permisos antes de repetir; no se anunció éxito.', 'save')
  return mapCategory(data, businessId)
}
export async function saveItem(client: AppClient, businessId: string, draft: ItemDraft, categories: AdminCategory[], imagePath: string | null, id?: string) {
  const payload = itemPayload(draft, imagePath, categories)
  const query = id ? client.from('menu_items').update(payload).eq('business_id', businessId).eq('id', id)
    : client.from('menu_items').insert({ business_id: businessId, ...payload })
  const { data, error } = await query.select(itemColumns).single()
  if (error || !data) throw new AdminError('No se confirmó el guardado. Actualizá el catálogo antes de repetir para evitar duplicados si la conexión falló.', 'save')
  return mapItem(data, businessId, client)
}
const mimeByExtension: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' }
export function imageExtension(file: Pick<File, 'name' | 'type' | 'size'>): string {
  const extension = file.name.split('.').at(-1)?.toLowerCase() ?? ''
  if (!mimeByExtension[extension] || mimeByExtension[extension] !== file.type || file.size <= 0 || file.size > 5 * 1024 * 1024) {
    throw new AdminError('Elegí una imagen JPG/JPEG, PNG, WebP o AVIF de hasta 5 MiB, con tipo y extensión coincidentes.', 'validation')
  }
  return extension
}
export function assetPath(businessId: string, extension: string, uuid = crypto.randomUUID()): string {
  const canonicalUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  if (!canonicalUuid.test(businessId) || !canonicalUuid.test(uuid) || !mimeByExtension[extension]) throw new AdminError('Ruta de imagen no disponible.', 'validation')
  return `${businessId}/${uuid}.${extension}`
}
export async function uploadMenuImage(client: AppClient, businessId: string, userId: string, file: File): Promise<UploadedAsset> {
  const path = assetPath(businessId, imageExtension(file))
  const { data, error } = await client.storage.from('menu-images').upload(path, file, { contentType: file.type, upsert: false, cacheControl: '3600' })
  // No custom metadata; object path never derives from the original filename.
  // No overwrite, move, copy or DELETE.
  if (error || data?.path !== path) throw new AdminError('No se confirmó la subida. El producto no se modificó; reintentá con un nuevo archivo/path.', 'upload')
  return { userId, businessId, path }
}
