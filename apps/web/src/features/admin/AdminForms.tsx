import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/authContext'
import { useAuthority } from '../authority/authorityContext'
import { AuthStatus } from '../auth/components/AuthStatus'
import { createAdminActions } from './adminActions'
import { adminMessage, AdminError, imageExtension, priceInput, type AdminCategory, type AdminItem,
  type CategoryDraft, type ItemDraft, type UploadedAsset } from './adminData'

type FormProps = { disabled: boolean; onSaved: () => void; onCancel: () => void }
export function CategoryForm({ category, disabled, onSaved, onCancel }: FormProps & { category?: AdminCategory }) {
  const auth = useAuth(), authority = useAuthority()
  const [draft, setDraft] = useState<CategoryDraft>({ name: category?.name ?? '', slug: category?.slug ?? '',
    displayOrder: String(category?.displayOrder ?? 0), isActive: category?.isActive ?? true })
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const submitting = useRef(false), mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const field = <K extends keyof CategoryDraft>(key: K, value: CategoryDraft[K]) => setDraft(old => ({ ...old, [key]: value }))
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const business = authority.data?.tenant
    if (disabled || !business || submitting.current) return
    submitting.current = true; setBusy(true); setMessage('')
    try {
      await createAdminActions(auth.store, authority.store).saveCategory(business.id, draft, category?.id)
      if (mounted.current) onSaved()
    } catch (error) { if (mounted.current) setMessage(adminMessage(error)) }
    finally { submitting.current = false; if (mounted.current) setBusy(false) }
  }
  return <form className="admin-form" onSubmit={submit} aria-busy={busy}>
    <h2>{category ? 'Editar categoría' : 'Nueva categoría'}</h2>
    <fieldset disabled={disabled || busy}><legend className="sr-only">Datos de la categoría</legend>
      <label htmlFor="category-name">Nombre</label><input id="category-name" maxLength={80} required value={draft.name} onChange={e => field('name', e.target.value)} />
      <label htmlFor="category-slug">Slug</label><input id="category-slug" maxLength={80} required autoCapitalize="none" spellCheck={false} aria-describedby="slug-help" value={draft.slug} onChange={e => field('slug', e.target.value)} /><small id="slug-help" className="muted">Minúsculas, números y guiones simples. Ejemplo: cervezas.</small>
      <label htmlFor="category-order">Orden</label><input id="category-order" inputMode="numeric" required value={draft.displayOrder} onChange={e => field('displayOrder', e.target.value)} />
      <label className="admin-check"><input type="checkbox" checked={draft.isActive} onChange={e => field('isActive', e.target.checked)} />Categoría activa</label>
      <small className="muted">Una categoría inactiva oculta todos sus productos de la Carta.</small>
    </fieldset>
    {message && <AuthStatus error message={message} />}
    <div className="admin-actions"><button className="button-primary" disabled={disabled || busy} type="submit">{busy ? 'Guardando…' : 'Guardar categoría'}</button><button className="button-secondary" disabled={busy} type="button" onClick={onCancel}>Cerrar edición</button></div>
  </form>
}

export function ItemForm({ item, categories, disabled, onSaved, onCancel }: FormProps & { item?: AdminItem; categories: AdminCategory[] }) {
  const auth = useAuth(), authority = useAuthority()
  const [draft, setDraft] = useState<ItemDraft>({ categoryId: item?.categoryId ?? categories[0]?.id ?? '', name: item?.name ?? '',
    description: item?.description ?? '', price: item ? priceInput(item.price) : '', imageAlt: item?.imageAlt ?? '',
    imagePresentation: item?.imagePresentation ?? 'photo', isActive: item?.isActive ?? true, isAvailable: item?.isAvailable ?? true,
    isFeatured: item?.isFeatured ?? false, displayOrder: String(item?.displayOrder ?? 0) })
  const [file, setFile] = useState<File | null>(null), [asset, setAsset] = useState<UploadedAsset | null>(null)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const submitting = useRef(false), mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const field = <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) => setDraft(old => ({ ...old, [key]: value }))
  function choose(selected: File | undefined) {
    setMessage(''); setAsset(null); setFile(null)
    if (!selected) return
    try { imageExtension(selected); setFile(selected) } catch (error) { setMessage(adminMessage(error)) }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const business = authority.data?.tenant
    if (disabled || !business || submitting.current) return
    submitting.current = true; setBusy(true); setMessage('')
    try {
      await createAdminActions(auth.store, authority.store).saveItem(business.id, draft, {
        id: item?.id, existingPath: item?.imagePath, file, uploadedAsset: asset,
      })
      if (mounted.current) onSaved()
    } catch (error) {
      if (mounted.current) { if (error instanceof AdminError && error.asset) setAsset(error.asset); setMessage(adminMessage(error)) }
    } finally { submitting.current = false; if (mounted.current) setBusy(false) }
  }
  return <form className="admin-form" onSubmit={submit} aria-busy={busy}>
    <h2>{item ? 'Editar producto' : 'Nuevo producto'}</h2>
    <fieldset disabled={disabled || busy}><legend className="sr-only">Datos del producto</legend>
      <label htmlFor="item-category">Categoría</label><select id="item-category" required value={draft.categoryId} onChange={e => field('categoryId', e.target.value)}>{!categories.length && <option value="">Creá una categoría primero</option>}{categories.map(c => <option key={c.id} value={c.id}>{c.name}{!c.isActive && ' · inactiva'}</option>)}</select>
      <label htmlFor="item-name">Nombre</label><input id="item-name" required maxLength={120} value={draft.name} onChange={e => field('name', e.target.value)} />
      <label htmlFor="item-description">Descripción</label><textarea id="item-description" rows={3} maxLength={2000} value={draft.description} onChange={e => field('description', e.target.value)} />
      <label htmlFor="item-price">Precio en ARS</label><input id="item-price" type="text" inputMode="decimal" required aria-describedby="price-help" value={draft.price} onChange={e => field('price', e.target.value)} /><small id="price-help" className="muted">Sin separador de miles. Ejemplo: 6500,50 (también admite 6500.50).</small>
      <label htmlFor="item-order">Orden</label><input id="item-order" required inputMode="numeric" value={draft.displayOrder} onChange={e => field('displayOrder', e.target.value)} />
      <div className="admin-flags"><label className="admin-check"><input type="checkbox" checked={draft.isActive} onChange={e => field('isActive', e.target.checked)} />Activo en Carta</label><label className="admin-check"><input type="checkbox" checked={draft.isAvailable} onChange={e => field('isAvailable', e.target.checked)} />Disponible</label><label className="admin-check"><input type="checkbox" checked={draft.isFeatured} onChange={e => field('isFeatured', e.target.checked)} />Destacado</label></div>
      <small className="muted">Sin disponibilidad se muestra AGOTADO; inactivo se oculta. La categoría también debe estar activa.</small>
      <label htmlFor="item-image">Nueva imagen</label><input id="item-image" type="file" accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif" aria-describedby="image-help" onChange={e => choose(e.target.files?.[0])} /><small id="image-help" className="muted">Hasta 5 MiB. Se sube sólo al guardar. Cada reemplazo usa un nuevo archivo; el anterior no se borra. Archivo y metadata de ruta conocida son públicos: no subas información privada.</small>
      {file && <LocalImagePreview file={file} />}
      {!file && item?.imageUrl && <AdminImage key={item.imageUrl} url={item.imageUrl} alt={item.imageAlt || item.name} />}
      {!file && !item?.imageUrl && <p className="muted">Sin imagen: la Carta usará el fallback existente.</p>}
      {asset && <p role="status">Imagen subida pendiente de asociar. Reintentar reutiliza esta subida; cerrar deja un orphan aceptado.</p>}
      <label htmlFor="item-image-alt">Texto alternativo</label><input id="item-image-alt" maxLength={240} value={draft.imageAlt} onChange={e => field('imageAlt', e.target.value)} />
      <label htmlFor="item-presentation">Presentación de imagen</label><select id="item-presentation" value={draft.imagePresentation} onChange={e => field('imagePresentation', e.target.value as 'photo' | 'cutout')}><option value="photo">Foto (recorte cover)</option><option value="cutout">Recorte sin fondo (contain)</option></select>
    </fieldset>
    {message && <AuthStatus error message={message} />}
    <div className="admin-actions"><button className="button-primary" disabled={disabled || busy || !categories.length} type="submit">{busy ? 'Subiendo / guardando…' : 'Guardar producto'}</button><button className="button-secondary" disabled={busy} type="button" onClick={onCancel}>Cerrar edición</button></div>
  </form>
}
function LocalImagePreview({ file }: { file: File }) {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    // Deferred state, cleanup always revokes the ephemeral preview URL.
    let active = true
    void Promise.resolve().then(() => { if (active) setPreview({ file, url }) })
    return () => { active = false; URL.revokeObjectURL(url) }
  }, [file])
  return preview?.file === file ? <img className="admin-image-preview" src={preview.url} alt="Vista previa local de la imagen seleccionada" /> : <p role="status">Preparando vista previa…</p>
}
export function AdminImage({ url, alt }: { url: string; alt: string }) {
  const [broken, setBroken] = useState(false)
  return broken ? <span className="admin-image-fallback">Imagen no disponible</span> : <img className="admin-image-preview" src={url} alt={alt} loading="lazy" onError={() => setBroken(true)} />
}
