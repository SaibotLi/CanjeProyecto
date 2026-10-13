import { NavLink } from 'react-router-dom'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { useAuthority } from '../features/authority/authorityContext'

const links: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Carta', icon: 'menu' },
  { to: '/points', label: 'Puntos', icon: 'points' },
  { to: '/rewards', label: 'Premios', icon: 'gift' },
  { to: '/profile', label: 'Perfil', icon: 'user' },
]
export function Navigation() {
  const authority = useAuthority()
  const items = authority.status === 'ready' && !authority.checking && authority.data?.operatorTenant
    ? [...links.filter(link => link.to !== '/rewards'), { to: '/operar', label: 'Acreditar', icon: 'points' as const }] : links
  return <nav className="customer-nav" aria-label="Navegación principal">{items.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => isActive ? 'nav-item is-active' : 'nav-item'}><Icon name={link.icon} /><span>{link.label}</span></NavLink>)}</nav>
}
