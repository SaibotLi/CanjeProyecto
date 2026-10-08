import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthStatus } from '../auth/components/AuthStatus'
import { useAuthority } from './authorityContext'
import { businessGate } from './authorityStore'

export function BusinessAdminRequired({ children }: { children: ReactNode }) {
  const authority = useAuthority(), location = useLocation()
  useEffect(() => { void authority.store.reload() }, [authority.store, location.pathname])
  const gate = businessGate(authority)
  if (gate === 'loading') return <section className="auth-panel"><AuthStatus message="Comprobando acceso al negocio…" /></section>
  if (gate === 'error' && !authority.data?.tenant) return <section className="auth-panel"><AuthStatus error message="No pudimos comprobar tus permisos. No se habilitaron operaciones." /><button className="button-secondary" onClick={() => { void authority.store.reload() }}>Reintentar</button></section>
  if (gate === 'forbidden') return <section className="auth-panel"><h1>Sin acceso</h1><p>No tenés una membresía administrativa vigente en Valhalla.</p><button className="button-secondary" onClick={() => { void authority.store.reload() }}>Volver a comprobar</button><Link className="text-link" to="/">Volver a la carta</Link></section>
  // UX only. Every request remains authorized by current PostgreSQL RLS.
  return <>
    {gate === 'error' && <section className="auth-panel"><AuthStatus error message="No pudimos comprobar tus permisos. Conservamos el formulario, pero las operaciones están pausadas hasta verificar el acceso." /><button className="button-secondary" onClick={() => { void authority.store.reload() }}>Reintentar permisos</button></section>}
    {children}
  </>
}
