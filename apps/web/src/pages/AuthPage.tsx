import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/authContext'
import { authMessage, requestRecovery, signUp } from '../features/auth/authData'
import { needsMfa } from '../features/auth/sessionStore'
import { AuthStatus } from '../features/auth/components/AuthStatus'

type Mode = 'login' | 'register' | 'forgot'
export function AuthPage({ mode }: { mode: Mode }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [error, setError] = useState('')
  const busy = useRef(false)
  const title = mode === 'login' ? 'Volvé a Valhalla' : mode === 'register' ? 'Tu lugar en Valhalla' : 'Recuperá tu cuenta'
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current || auth.logoutError || auth.signingOut) return
    if (mode === 'register' && password !== confirmation) { setError('Las contraseñas no coinciden.'); return }
    busy.current = true; setStatus('submitting'); setError('')
    try {
      const client = auth.store.getClient()
      if (mode === 'register') {
        const result = await signUp(client, email, password)
        if (result.error) throw result.error
        setPassword(''); setConfirmation(''); setStatus('success')
        if (result.data.session) navigate('/profile', { replace: true })
      } else if (mode === 'forgot') {
        const result = await requestRecovery(client, email)
        if (result.error) throw result.error
        setStatus('success')
      } else {
        const result = await client.auth.signInWithPassword({ email: email.trim(), password })
        if (result.error) throw result.error
        setPassword('')
        const level = await client.auth.mfa.getAuthenticatorAssuranceLevel()
        navigate(!level.error && needsMfa(level.data) ? '/auth/mfa' : '/profile', { replace: true })
        setStatus('success')
      }
    } catch (failure) {
      setError(authMessage(failure)); setStatus('idle')
    } finally { busy.current = false }
  }
  if (auth.initializing) return <AuthStatus message="Preparando tu sesión…" />
  return <section className="auth-panel" aria-labelledby="auth-title">
    <span className="eyebrow">VALHALLA · TU CUENTA</span><h1 id="auth-title">{title}</h1>
    <p className="muted">{mode === 'login' ? 'Ingresá para ver tu perfil. La carta siempre está abierta.' : mode === 'register' ? 'Creá tu cuenta y confirmá tu email para comenzar.' : 'Te enviaremos un enlace para elegir una nueva contraseña.'}</p>
    {auth.logoutError && <><AuthStatus error message="Tu perfil se ocultó, pero no pudimos terminar de cerrar la sesión. No está confirmado el cierre; reintentá antes de cambiar de cuenta." /><button className="button-secondary" type="button" onClick={() => { void auth.store.signOut().catch(() => {}) }}>Reintentar cierre de sesión</button></>}
    {auth.unavailable ? <AuthStatus error message="La conexión de cuentas no está disponible. Recargá e intentá de nuevo." />
      : auth.session && mode !== 'forgot' ? <><AuthStatus message="Ya tenés una sesión iniciada." /><Link className="button-primary" to="/profile">Ir a mi perfil</Link></>
      : status === 'success' ? <><AuthStatus message={mode === 'register' ? 'Si corresponde, recibirás un correo para confirmar tu cuenta. Revisá tu bandeja antes de ingresar.' : 'Si esa cuenta existe, recibirás un enlace. Revisá tu bandeja y el correo no deseado.'} /><Link className="text-link" to="/login">Volver al ingreso</Link></>
      : <form className="auth-form" onSubmit={submit} aria-busy={status === 'submitting'}>
        <label htmlFor={`email-${mode}`}>Email</label><input id={`email-${mode}`} type="email" name="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={e => setEmail(e.target.value)} maxLength={254} />
        {mode !== 'forgot' && <><label htmlFor={`password-${mode}`}>Contraseña</label><input id={`password-${mode}`} type="password" name="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 8 : undefined} value={password} onChange={e => setPassword(e.target.value)} />{mode === 'register' && <><small className="muted">Al menos 8 caracteres. Podés usar tu gestor de contraseñas.</small><label htmlFor="password-confirmation">Repetí la contraseña</label><input id="password-confirmation" type="password" name="password-confirmation" autoComplete="new-password" required minLength={8} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></>}</>}
        {error && <AuthStatus error message={error} />}
        <button className="button-primary" type="submit" disabled={status === 'submitting' || auth.logoutError || auth.signingOut}>{status === 'submitting' ? 'Un momento…' : mode === 'login' ? 'Ingresar' : mode === 'register' ? 'Crear cuenta' : 'Enviar enlace'}</button>
      </form>}
    <div className="auth-links">{mode === 'login' ? <><Link to="/auth/forgot-password">Olvidé mi contraseña</Link><Link to="/register">Crear una cuenta</Link></> : <Link to="/login">Ya tengo cuenta · Ingresar</Link>}<Link to="/">Seguir viendo la carta</Link></div>
    <p className="context-note">Prueba local: los correos llegan a Mailpit. Puntos y recompensas todavía son demostrativos.</p>
  </section>
}
