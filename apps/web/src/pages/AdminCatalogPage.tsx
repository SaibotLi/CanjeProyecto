import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthority } from '../features/authority/authorityContext'
import { AuthStatus } from '../features/auth/components/AuthStatus'
import { useAdminCatalog } from '../features/admin/useAdminCatalog'
import { CategoryForm, ItemForm, AdminImage } from '../features/admin/AdminForms'
import { formatMenuPrice } from '../features/menu/presentation'

export function AdminCatalogPage({ section }: { section: 'categories' | 'items' }) {
  const authority = useAuthority(), catalog = useAdminCatalog()
  const [selected, setSelected] = useState<string | null>(null), [notice, setNotice] = useState('')
  const editor = useRef<HTMLDivElement>(null)
  useEffect(() => { if (selected) { editor.current?.focus(); editor.current?.scrollIntoView({ block: 'start' }) } }, [selected])
  const business = authority.data?.tenant
  const disabled = !business?.isActive || authority.checking
  const open = (id: string) => { setSelected(id); setNotice('') }
  const refresh = async () => { await authority.store.reload(); catalog.reload() }
  const saved = () => { setNotice('Guardado confirmado.'); setSelected(null); catalog.reload() }
  const categories = catalog.data?.categories ?? [], items = catalog.data?.items ?? []
  const category = categories.find(c => c.id === selected), item = items.find(i => i.id === selected)
  const selectedExists = selected === 'new' || (section === 'categories' ? !!category : !!item)
  return <section className="admin-workspace"><div className="admin-heading"><div><span className="eyebrow">CARTA · {business?.name}</span><h1>{section === 'categories' ? 'Categorías' : 'Productos'}</h1></div><button className="button-secondary" type="button" disabled={authority.checking} onClick={() => { void refresh() }}>Actualizar datos y permisos</button></div>
    {notice && <AuthStatus message={notice} />}
    {catalog.status === 'loading' && <AuthStatus message="Cargando catálogo…" />}
    {catalog.status === 'error' && <><AuthStatus error message="No pudimos cargar el catálogo. No se habilitó edición." /><button className="button-secondary" onClick={() => { void refresh() }}>Reintentar</button></>}
    {catalog.status === 'ready' && <>
      {selected && !selectedExists && <AuthStatus error message="El registro ya no está disponible. Elegí otro; no se convirtió la edición en una creación." />}
      {selected && selectedExists && <div className="admin-editor" ref={editor} tabIndex={-1} aria-label="Edición de catálogo">{section === 'categories'
        ? <CategoryForm key={selected} category={category} disabled={disabled} onSaved={saved} onCancel={() => setSelected(null)} />
        : <ItemForm key={selected} item={item} categories={categories} disabled={disabled} onSaved={saved} onCancel={() => setSelected(null)} />}</div>}
      <div className="admin-actions"><button className="button-primary" type="button" disabled={disabled || (section === 'items' && !categories.length)} onClick={() => open('new')}>{section === 'categories' ? 'Nueva categoría' : 'Nuevo producto'}</button>{section === 'items' && !categories.length && <p>Creá una <Link className="text-link" to="/admin/categories">categoría</Link> primero.</p>}</div>
      <ul className="admin-catalog-list">{section === 'categories' ? categories.map(c => <li key={c.id}><div><h2>{c.name}</h2><p className="muted">{c.slug} · orden {c.displayOrder} · {c.isActive ? 'Activa' : 'Inactiva'}</p></div><button className="button-secondary" type="button" onClick={() => open(c.id)} aria-label={`Editar categoría ${c.name}`}>{business?.isActive ? 'Editar' : 'Ver detalles'}</button></li>) : items.map(i => <li key={i.id}>{i.imageUrl && <AdminImage key={i.imageUrl} url={i.imageUrl} alt={i.imageAlt || i.name} />}<div><h2>{i.name}</h2><p>{formatMenuPrice(i.price)}</p><p className="muted">{categories.find(c => c.id === i.categoryId)?.name} · orden {i.displayOrder}</p><p className="admin-flags">{i.isActive ? 'Activo' : 'Inactivo'} · {i.isAvailable ? 'Disponible' : 'AGOTADO'}{i.isFeatured && ' · Destacado'}{!i.imagePath && ' · Sin imagen'}</p></div><button className="button-secondary" type="button" onClick={() => open(i.id)} aria-label={`Editar producto ${i.name}`}>{business?.isActive ? 'Editar' : 'Ver detalles'}</button></li>)}</ul>
      {!(section === 'categories' ? categories.length : items.length) && <p className="muted">Todavía no hay {section === 'categories' ? 'categorías' : 'productos'}.</p>}
    </>}
  </section>
}
