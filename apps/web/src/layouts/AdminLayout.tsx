import {Link,NavLink,Outlet} from 'react-router-dom'
import {useEffect} from 'react'
import {useAuthority} from '../features/authority/authorityContext'
import {useBusiness} from '../features/business/businessContext'
import {BusinessBrand} from '../features/business/BusinessBrand'
import {businessPath} from '../features/business/businessRoutes'
export function AdminLayout(){
  const authority=useAuthority(),{business}=useBusiness(),path=(section='')=>businessPath(business.slug,section)
  useEffect(()=>{document.title=`${business.name} · Administración`},[business.name])
  return <div className="admin-shell"><a className="skip-link" href="#main-content">Saltar al contenido</a>
    <header className="site-header"><div className="header-inner"><BusinessBrand/><Link className="text-link" to={path()}>Ver mi carta</Link></div></header>
    <main id="main-content" className="main-container"><nav className="admin-tabs" aria-label="Administración de Carta"><NavLink to={path('admin')} end>Panel</NavLink><NavLink to={path('admin/categories')}>Categorías</NavLink><NavLink to={path('admin/products')}>Productos</NavLink><NavLink to={path('admin/settings')}>Mi comercio</NavLink><NavLink to={path('admin/share')}>Compartir</NavLink><Link to="/profile">Mis comercios</Link></nav>
      {!business.isActive&&<p className="admin-readonly" role="status">Negocio inactivo · Sólo lectura. Contactá a la plataforma para reactivarlo.</p>}
      {authority.checking&&<p role="status" className="muted">Actualizando permisos…</p>}
      <Outlet/>
    </main><footer className="site-footer">{business.loyaltyEnabled&&<Link to={path('operar')}>Acreditar consumos e historial</Link>}<span>{business.loyaltyEnabled?'Carta + Fidelización':'Carta Digital'}</span></footer>
  </div>
}
