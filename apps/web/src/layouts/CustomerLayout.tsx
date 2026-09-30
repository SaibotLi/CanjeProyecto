import { Link, Outlet, useLocation } from 'react-router-dom'
import { Navigation } from '../components/Navigation'
import { PreviewNotice } from '../components/PreviewNotice'
import valhallaLogo from '../assets/brand/valhalla/valhalla-logo-header.webp'

export function CustomerLayout() {
  const isMenu = useLocation().pathname === '/'
  return <div className={isMenu ? 'app-shell menu-app' : 'app-shell'}>
    <a className="skip-link" href="#main-content">Saltar al contenido</a>
    <header className="site-header"><div className="header-inner">
      <Link to="/" className="brand-lockup" aria-label="Valhalla Space, carta">
        <img src={valhallaLogo} alt="" className="brand-logo" width="44" height="44" decoding="async" />
        <span className="brand-copy"><strong>VALHALLA</strong><small>{isMenu ? 'Carta · Villaguay' : 'SPACE'}</small></span>
      </Link>
      {!isMenu && <><span className="location-label">VILLAGUAY · ENTRE RÍOS</span><span className="header-tag">Carta & comunidad</span></>}
    </div></header>
    <Navigation />
    <main id="main-content" className={isMenu ? 'main-container menu-main' : 'main-container'}><PreviewNotice /><Outlet /></main>
    <footer className="site-footer"><span>Valhalla Space · Identidad visual provisional</span><Link to="/admin">Vista admin de prueba</Link></footer>
  </div>
}
