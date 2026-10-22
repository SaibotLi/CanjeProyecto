import {NavLink} from 'react-router-dom'
import {Icon,type IconName} from './Icon'
import {useAuthority} from '../features/authority/authorityContext'
import {useBusinessOptional} from '../features/business/businessContext'
import {businessPath} from '../features/business/businessRoutes'

export function Navigation(){
  const authority=useAuthority(),context=useBusinessOptional(),business=context?.business
  const links:{to:string;label:string;icon:IconName}[]=business?[{to:businessPath(business.slug),label:'Carta',icon:'menu'}]:[{to:'/',label:'Inicio',icon:'menu'},{to:'/profile',label:'Mi cuenta',icon:'user'}]
  if(business?.loyaltyEnabled){
    links.push({to:businessPath(business.slug,'points'),label:'Puntos',icon:'points'},{to:businessPath(business.slug,'profile'),label:'Perfil',icon:'user'})
    if(authority.status==='ready'&&!authority.checking&&authority.data?.operatorTenant)links.push({to:businessPath(business.slug,'operar'),label:'Acreditar',icon:'points'})
  }
  if(business&&!business.loyaltyEnabled&&authority.data?.tenant)links.push({to:businessPath(business.slug,'admin'),label:'Administrar',icon:'user'})
  return <nav className="customer-nav" aria-label="Navegación principal">{links.map(link=><NavLink key={link.to} to={link.to} end className={({isActive})=>isActive?'nav-item is-active':'nav-item'}><Icon name={link.icon}/><span>{link.label}</span></NavLink>)}</nav>
}
