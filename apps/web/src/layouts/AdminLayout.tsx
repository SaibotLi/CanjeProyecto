import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuthority } from '../features/authority/authorityContext'
import valhallaLogo from '../assets/brand/valhalla/valhalla-logo-header.webp'

export function AdminLayout() {
  const authority = useAuthority(), business = authority.data?.tenant
  return <div className="admin-shell">
    <a className="skip-link" href="#main-content">Saltar al contenido</a>
    <header className="site-header"><div className="header-inner"><Link to="/" className="brand-lockup"><img src={valhallaLogo} alt="" className="brand-logo" /><span className="brand-copy"><strong>VALHALLA</strong><small>SPACE · ADMIN</small></span></Link><Link className="text-link" to="/">Volver a la carta</Link></div></header>
    <main id="main-content" className="main-container"><nav className="admin-tabs" aria-label="Administración de Carta"><NavLink to="/admin" end>Panel</NavLink><NavLink to="/admin/categories">Categorías</NavLink><NavLink to="/admin/products">Productos</NavLink><Link to="/profile">Mi cuenta</Link></nav>
      {!business?.isActive && <p className="admin-readonly" role="status">Negocio inactivo · Sólo lectura. La reactivación requiere un canal privilegiado; no se realiza desde este panel.</p>}
      {authority.checking && <p role="status" className="muted">Actualizando permisos…</p>}
      <Outlet /></main>
    <footer className="site-footer">Administración real LOCAL · Sin operaciones de puntos o canjes</footer>
  </div>
}
