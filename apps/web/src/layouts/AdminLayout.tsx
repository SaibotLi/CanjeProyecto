import { Link, Outlet } from 'react-router-dom'
import { PreviewNotice } from '../components/PreviewNotice'
import valhallaLogo from '../assets/brand/valhalla/valhalla-logo-web.webp'

export function AdminLayout() {
  return <div className="admin-shell">
    <a className="skip-link" href="#main-content">Saltar al contenido</a>
    <header className="site-header"><div className="header-inner"><Link to="/" className="brand-lockup"><img src={valhallaLogo} alt="" className="brand-logo" /><span className="brand-copy"><strong>VALHALLA</strong><small>SPACE · ADMIN</small></span></Link><Link className="text-link" to="/">Volver a la carta</Link></div></header>
    <main id="main-content" className="main-container"><PreviewNotice /><Outlet /></main>
    <footer className="site-footer">Panel de demostración · Sin sesión ni operaciones habilitadas</footer>
  </div>
}
