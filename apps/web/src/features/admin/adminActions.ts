import type { AuthStore } from '../auth/sessionStore'
import type { AuthorityStore } from '../authority/authorityStore'
import { AdminError, categoryPayload, itemPayload, readAdminCatalog, saveCategory, saveItem, uploadMenuImage,
  type CategoryDraft, type ItemDraft, type UploadedAsset } from './adminData'

export function createAdminActions(auth: AuthStore, authority: AuthorityStore) {
  const context = async (businessId: string) => {
    const initial = auth.getSnapshot()
    const userId = initial.session?.user.id
    if (!userId || initial.signingOut || initial.logoutError) throw new AdminError('Ingresá de nuevo para continuar.', 'session')
    const current = () => auth.getSnapshot().session?.user.id === userId && auth.getSnapshot().epoch === initial.epoch
    const data = await authority.reload()
    if (!current()) throw new AdminError('La sesión cambió. No se inició otra operación.', 'session')
    const business = data?.adminBusinesses.find(b => b.id === businessId)
    if (!business) throw new AdminError('Ya no tenés acceso administrativo a este negocio.', 'authority')
    if (!business.isActive) throw new AdminError('El negocio está inactivo: sólo se permite lectura.', 'authority')
    return { client: auth.getClient(), userId, current }
  }
  return {
    saveCategory: async (businessId: string, draft: CategoryDraft, id?: string) => {
      categoryPayload(draft)
      const ctx = await context(businessId)
      try {
        const category = await saveCategory(ctx.client, businessId, draft, id)
        if (!ctx.current()) throw new AdminError('La sesión cambió durante el guardado. Revisá los datos antes de repetir.', 'session')
        return category
      }
      finally { await authority.reload() }
    },
    saveItem: async (businessId: string, draft: ItemDraft, options: {
      id?: string; existingPath?: string | null; file?: File | null; uploadedAsset?: UploadedAsset | null
    } = {}) => {
      const ctx = await context(businessId)
      let asset = options.uploadedAsset ?? null
      if (asset && (asset.userId !== ctx.userId || asset.businessId !== businessId || !asset.path.startsWith(`${businessId}/`))) {
        throw new AdminError('La imagen pendiente pertenece a otro contexto. Seleccioná un archivo nuevo.', 'session')
      }
      try {
        const catalog = await readAdminCatalog(ctx.client, businessId)
        // Validate every field before creating a public Storage object.
        itemPayload(draft, options.existingPath ?? null, catalog.categories)
        if (!ctx.current()) throw new AdminError('La sesión cambió. No se inició otra operación.', 'session')
        if (options.file && !asset) asset = await uploadMenuImage(ctx.client, businessId, ctx.userId, options.file)
        if (!ctx.current()) throw new AdminError('La sesión cambió antes de guardar el producto.', 'session')
        const item = await saveItem(ctx.client, businessId, draft, catalog.categories, asset?.path ?? options.existingPath ?? null, options.id)
        if (!ctx.current()) throw new AdminError('La sesión cambió durante el guardado. Revisá los datos antes de repetir.', 'session')
        return item
      } catch (error) {
        if (asset) throw new AdminError('La imagen se subió, pero no se confirmó el guardado del producto. Puede quedar orphan; no se borró. Revisá el catálogo y reintentá el guardado con esta imagen, sin otra subida.', 'image-save', asset)
        throw error
      } finally { await authority.reload() }
    },
  }
}
