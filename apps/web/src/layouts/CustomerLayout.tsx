import {useEffect} from 'react'
import {Link,Outlet,useLocation} from 'react-router-dom'
import {Navigation} from '../components/Navigation'
import {useAuthority} from '../features/authority/authorityContext'
import {useBusinessOptional} from '../features/business/businessContext'
import {BusinessBrand} from '../features/business/BusinessBrand'
import {businessPath} from '../features/business/businessRoutes'
import {platformBrand} from '../config/platform'

export function CustomerLayout(){
  const authority=useAuthority(),context=useBusinessOptional(),business=context?.business
  const pathname=useLocation().pathname
  const isMenu=!!business&&pathname===businessPath(business.slug)
  const p=business?.presentation
  useEffect(()=>{document.title=business?`${business.name} · Carta`:platformBrand.name},[business?.name,business])
  return <div className={isMenu?'app-shell menu-app':'app-shell'}>
    <a className="skip-link" href="#main-content">Saltar al contenido</a>
    <header className="site-header"><div className="header-inner"><BusinessBrand/>{business&&<span className="location-label">{[p?.city,p?.region].filter(Boolean).join(' · ')}</span>}</div></header>
    <Navigation/>
    <main id="main-content" className={isMenu?'main-container menu-main':'main-container'}><Outlet/></main>
    <footer className="site-footer business-footer">
      {business?<><strong>{business.name}</strong>{p?.address&&<span>{p.address}</span>}{p?.contact_phone&&<a href={`tel:${p.contact_phone.replace(/[^+0-9]/g,'')}`}>{p.contact_phone}</a>}{p?.instagram_handle&&<a href={`https://www.instagram.com/${p.instagram_handle}/`} target="_blank" rel="noopener noreferrer">Instagram</a>}{p?.website_url&&<a href={p.website_url} target="_blank" rel="noopener noreferrer">Sitio web</a>}<Link to={businessPath(business.slug,'admin')}>{authority.data?.tenant?'Administración de Carta':'Administrar comercio'}</Link><Link to="/">Conocé {platformBrand.name}</Link></>:<><span>{platformBrand.name} · Cartas digitales</span><Link to="/profile">Mi cuenta</Link></>}
    </footer>
  </div>
}
