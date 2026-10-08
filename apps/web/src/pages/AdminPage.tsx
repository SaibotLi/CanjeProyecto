import { Link } from 'react-router-dom'
import { useAuthority } from '../features/authority/authorityContext'
import { useAdminCatalog } from '../features/admin/useAdminCatalog'
import { AuthStatus } from '../features/auth/components/AuthStatus'

export function AdminPage() {
  const authority = useAuthority(), catalog = useAdminCatalog()
  return <section className="admin-workspace"><span className="eyebrow">{authority.data?.tenant?.name} · OPERACIÓN</span><h1>Administrar Carta</h1>
    <p className="muted">Categorías, bebidas y disponibilidad. Los cambios confirmados se reflejan al volver a consultar la Carta.</p>
    {catalog.status === 'loading' && <AuthStatus message="Cargando catálogo…" />}
    {catalog.refreshError && <><AuthStatus error message="No pudimos actualizar el resumen. Se muestra la última carga confirmada." /><button className="button-secondary" onClick={catalog.reload}>Reintentar</button></>}
    {catalog.status === 'error' && <AuthStatus error message="No pudimos cargar el resumen del catálogo." />}
    <div className="admin-grid"><article className="admin-card"><h2>Categorías</h2><p className="muted">{catalog.data ? `${catalog.data.categories.length} categorías, incluidas inactivas.` : 'Organizá las secciones y su orden.'}</p><Link className="button-secondary" to="/admin/categories">Ver categorías</Link></article><article className="admin-card"><h2>Productos</h2><p className="muted">{catalog.data ? `${catalog.data.items.length} productos, incluidos inactivos.` : 'Precios, imágenes y estado de cada bebida.'}</p><Link className="button-primary" to="/admin/products">Ver productos</Link></article></div>
    <p className="context-note">Este panel administra sólo la Carta de Valhalla. Las herramientas de compras, puntos y canjes llegarán más adelante.</p>
    <Link className="text-link" to="/">Ver Carta pública</Link>
  </section>
}
