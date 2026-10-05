import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/authContext'
import { AuthStatus } from '../features/auth/components/AuthStatus'
import { useAuthority } from '../features/authority/authorityContext'
import { readPlatformBusinesses, PlatformAccessLost } from '../features/authority/platformData'
import type { AdminBusiness } from '../features/authority/authorityData'

export function PlatformPage() {
  const auth = useAuth(), authority = useAuthority()
  const [result, setResult] = useState<{ status: 'loading' | 'ready' | 'error'; businesses: AdminBusiness[] }>({ status: 'loading', businesses: [] })
  useEffect(() => {
    const controller = new AbortController(), signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)])
    let mounted = true
    void readPlatformBusinesses(auth.store, signal).then(businesses => {
      if (mounted) setResult({ status: 'ready', businesses })
    }).catch(error => {
      if (!mounted) return
      setResult({ status: 'error', businesses: [] })
      if (error instanceof PlatformAccessLost) { void auth.store.reload(); void authority.store.reload() }
    })
    return () => { mounted = false; controller.abort() }
  }, [auth.store, authority.store])
  return <section className="admin-workspace">
    <div className="admin-heading"><div><span className="eyebrow">PLATFORM ADMIN · SÓLO LECTURA</span><h1>Negocios</h1><p className="muted">Vista global con segundo factor verificado. No permite editar negocios ni cuentas.</p></div><button className="button-secondary" onClick={() => { void authority.store.reload() }}>Actualizar datos y permisos</button></div>
    <Link className="text-link" to="/profile">Volver a mi cuenta</Link>
    {result.status === 'loading' && <AuthStatus message="Cargando negocios…" />}
    {result.status === 'error' && <AuthStatus error message="No pudimos cargar la vista. Actualizá datos y permisos para reintentar." />}
    {result.status === 'ready' && <ul className="admin-catalog-list" aria-label="Negocios accesibles globalmente">{result.businesses.map(b => <li key={b.id}><div><h2>{b.name}</h2><p className="muted">{b.slug}</p><span className="outline-tag">{b.isActive ? 'Activo' : 'Inactivo'}</span></div></li>)}</ul>}
    {result.status === 'ready' && !result.businesses.length && <p>No hay negocios para mostrar.</p>}
  </section>
}
