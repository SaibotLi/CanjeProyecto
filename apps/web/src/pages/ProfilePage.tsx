import { Link } from 'react-router-dom'
import { useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../features/auth/authContext'
import { authMessage, displayNameMaxLength, updateDisplayName } from '../features/auth/authData'
import { needsMfa } from '../features/auth/sessionStore'
import { AuthStatus } from '../features/auth/components/AuthStatus'
import { useAuthority } from '../features/authority/authorityContext'

export function ProfilePage() {
  const auth = useAuth()
  const authority = useAuthority()
  if (!auth.session) return null
  return <section className="auth-panel"><span className="eyebrow">TU ESPACIO EN VALHALLA</span><h1>Mi perfil</h1>
    <p className="auth-email">{auth.session.user.email}</p>
    {auth.profileStatus === 'loading' && <AuthStatus message="Cargando tu perfil…" />}
    {auth.profileStatus === 'error' && <><AuthStatus error message="No pudimos cargar tu perfil." /><button type="button" className="button-secondary" onClick={() => { void auth.store.reload() }}>Reintentar</button></>}
    {auth.profile && auth.profile.id === auth.session.user.id && <ProfileForm key={auth.profile.id} displayName={auth.profile.displayName ?? ''} />}
    <div className="auth-security"><h2>Seguridad de tu cuenta</h2><p className="muted">{needsMfa(auth.assurance) ? 'Verificá tu segundo factor para completar esta sesión.' : auth.assurance?.currentLevel === 'aal2' ? 'Segundo factor verificado en esta sesión.' : 'Podés activar un segundo factor con una app de autenticación.'}</p><Link className="text-link" to="/auth/mfa">{needsMfa(auth.assurance) ? 'Verificar segundo factor' : 'Configurar segundo factor'}</Link></div>
    <LogoutButton />
    {authority.status === 'ready' && authority.data?.tenant && <Link className="button-secondary" to="/admin">Administrar Carta de Valhalla</Link>}
    {authority.status === 'ready' && !authority.checking && authority.data?.platform.isAdmin && <Link className="button-secondary" to="/platform">Platform · Vista de negocios</Link>}
    <p className="context-note">Tu perfil es real. Los puntos y premios todavía son ejemplos: no representan tu saldo.</p>
  </section>
}
function ProfileForm({ displayName }: { displayName: string }) {
  const { store, session } = useAuth()
  const [name, setName] = useState(displayName)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const submitting = useRef(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || submitting.current) return
    submitting.current = true; setBusy(true); setMessage('')
    try {
      await updateDisplayName(store.getClient(), session.user.id, name)
      if (store.getSnapshot().session?.user.id !== session.user.id) return
      setError(false); setMessage('Nombre guardado.'); await store.reload()
    } catch { setError(true); setMessage('No pudimos guardar tu nombre. Intentá de nuevo.') }
    finally { submitting.current = false; setBusy(false) }
  }
  return <form className="auth-form" onSubmit={submit} aria-busy={busy}><label htmlFor="display-name">Cómo te llamamos</label><input id="display-name" name="display-name" autoComplete="nickname" maxLength={displayNameMaxLength} value={name} onChange={e => setName(e.target.value)} /><small className="muted">Opcional. Hasta {displayNameMaxLength} caracteres; podés dejarlo vacío.</small>{message && <AuthStatus error={error} message={message} />}<button className="button-primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar nombre'}</button></form>
}
function LogoutButton() {
  const { store } = useAuth()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function logout() {
    if (busy) return
    setBusy(true)
    try { await store.signOut() } catch (failure) { setError(authMessage(failure)); setBusy(false) }
  }
  return <div className="auth-logout">{error && <AuthStatus error message={error} />}<button className="button-secondary" type="button" disabled={busy} onClick={() => { void logout() }}>{busy ? 'Cerrando…' : 'Cerrar sesión en este navegador'}</button></div>
}
