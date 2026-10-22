import {useState} from 'react'
import {Link} from 'react-router-dom'
import {useBusinessOptional} from './businessContext'
import {businessPath} from './businessRoutes'
import {platformBrand,legacyBusinessSlug} from '../../config/platform'
import legacyLogo from '../../assets/brand/valhalla/valhalla-logo-header.webp'
import {useAuth} from '../auth/authContext'
import {publicMenuImageUrl} from '../menu/publicMenu'
export function BusinessBrand(){
  const context=useBusinessOptional(),auth=useAuth(),[failed,setFailed]=useState('')
  const business=context?.business
  const logo=business?.presentation.logo_path?publicMenuImageUrl(auth.store.getClient(),business.presentation.logo_path):business?.slug===legacyBusinessSlug?legacyLogo:null
  return <Link to={business?businessPath(business.slug):'/'} className="brand-lockup" aria-label={business?`${business.name}, carta`:platformBrand.name}>
    {logo&&logo!==failed?<img src={logo} className="brand-logo" alt="" width="44" height="44" onError={()=>setFailed(logo)}/>:<span className="brand-initial" aria-hidden="true">{(business?.name??platformBrand.name).slice(0,1)}</span>}
    <span className="brand-copy"><strong>{business?.name??platformBrand.name}</strong><small>{business?.presentation.tagline||(business?'Carta digital':platformBrand.tagline)}</small></span>
  </Link>
}
