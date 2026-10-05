import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { AuthStatus } from '../auth/components/AuthStatus'
import { useAuthority } from './authorityContext'
import { platformGate } from './authorityStore'

export function PlatformRequired({ children }: { children: ReactNode }) {
  const auth = useAuth(), authority = useAuthority(), location = useLocation()
  useEffect(() => { void authority.store.reload() }, [authority.store, location.pathname])
  const gate = platformGate(authority, auth.assurance)
  const retry = () => { void auth.store.reload(); void authority.store.reload() }
  if (gate === 'loading') return <section className="auth-panel"><AuthStatus message="Comprobando acceso Platform…" /></section>
  if (gate === 'error') return <section className="auth-panel"><AuthStatus error message="No pudimos comprobar el acceso y la seguridad de tu sesión." /><button className="button-secondary" onClick={retry}>Reintentar</button></section>
  if (gate === 'forbidden') return <section className="auth-panel"><h1>Sin acceso Platform</h1><p>Tu cuenta no tiene autorización Platform vigente.</p><button className="button-secondary" onClick={retry}>Volver a comprobar</button><Link className="text-link" to="/profile">Volver a mi cuenta</Link></section>
  if (gate === 'mfa') return <section className="auth-panel"><h1>Se requiere verificación en dos pasos</h1><p>Tu cuenta tiene acceso Platform, pero esta sesión aún necesita un segundo factor.</p><Link className="button-primary" to="/auth/mfa?continue=platform">Verificar segundo factor</Link><Link className="text-link" to="/profile">Volver a mi cuenta</Link></section>
  // UX only: current-row + AAL2 RLS still protects every global request.
  return <>{children}</>
}
