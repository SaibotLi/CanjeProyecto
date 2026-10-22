import { Link } from 'react-router-dom'
import { useAuthority } from '../features/authority/authorityContext'
import { useAdminCatalog } from '../features/admin/useAdminCatalog'
import { AuthStatus } from '../features/auth/components/AuthStatus'
import {useBusiness} from '../features/business/businessContext'
import {businessPath} from '../features/business/businessRoutes'

export function AdminPage() {
  const authority = useAuthority(), catalog = useAdminCatalog()
  const {business}=useBusiness(),path=(section='')=>businessPath(business.slug,section)
  return <section className="admin-workspace"><span className="eyebrow">{authority.data?.tenant?.name} · OPERACIÓN</span><h1>Administrar Carta</h1>
    <p className="muted">Categorías, productos y disponibilidad. Los cambios confirmados se reflejan en tu carta.</p>
    {catalog.status === 'loading' && <AuthStatus message="Cargando catálogo…" />}
    {catalog.refreshError && <><AuthStatus error message="No pudimos actualizar el resumen. Se muestra la última carga confirmada." /><button className="button-secondary" onClick={catalog.reload}>Reintentar</button></>}
    {catalog.status === 'error' && <AuthStatus error message="No pudimos cargar el resumen del catálogo." />}
    <div className="admin-grid"><article className="admin-card"><h2>Categorías</h2><p className="muted">{catalog.data ? `${catalog.data.categories.length} ${catalog.data.categories.length===1?'categoría, incluida inactiva':'categorías, incluidas inactivas'}.` : 'Organizá las secciones y su orden.'}</p><Link className="button-secondary" to={path('admin/categories')}>Ver categorías</Link></article><article className="admin-card"><h2>Productos</h2><p className="muted">{catalog.data ? `${catalog.data.items.length} ${catalog.data.items.length===1?'producto, incluido inactivo':'productos, incluidos inactivos'}.` : 'Precios, imágenes y estado de cada producto.'}</p><Link className="button-primary" to={path('admin/products')}>Ver productos</Link></article></div>
    <section className="admin-card business-summary"><h2>Tu carta, lista para compartir</h2><ol><li><Link className="text-link" to={path('admin/settings')}>Completá tu identidad y contacto</Link>.</li><li><Link className="text-link" to={path('admin/categories')}>Organizá categorías</Link> y <Link className="text-link" to={path('admin/products')}>cargá tus productos</Link>.</li><li><Link className="text-link" to={path('admin/share')}>Copiá el enlace o descargá tu QR</Link>.</li></ol><p className="muted">Servicio: {business.loyaltyEnabled?'Carta + Fidelización':'Carta Digital'}. La plataforma gestiona la contratación.</p></section>
    <Link className="text-link" to={path()}>Ver Carta pública</Link>
  </section>
}
