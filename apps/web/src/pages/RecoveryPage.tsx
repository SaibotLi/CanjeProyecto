import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/authContext'
import { authMessage } from '../features/auth/authData'
import { AuthStatus } from '../features/auth/components/AuthStatus'
import { needsMfa } from '../features/auth/sessionStore'

export function RecoveryPage() {
  const auth = useAuth()
  if (auth.initializing) return <AuthStatus message="Verificando el enlace de recuperación…" />
  if (!auth.session || !auth.recovery || auth.linkError) return <section className="auth-panel"><h1>Necesitás un enlace nuevo</h1><AuthStatus error message="Abrí el enlace del correo para cambiar tu contraseña. Puede haber vencido o ya haber sido usado." /><Link className="text-link" to="/auth/forgot-password">Solicitar otro enlace</Link></section>
  return <RecoveryForm key={auth.session.user.id} />
}
function RecoveryForm() {
  const { store, assurance, session } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    if (password !== confirmation) { setError('Las contraseñas no coinciden.'); return }
    submitting.current = true; setBusy(true); setError('')
    const userId = session?.user.id
    try {
      const result = await store.getClient().auth.updateUser({ password })
      if (result.error) throw result.error
      if (store.getSnapshot().session?.user.id !== userId) return
      setPassword(''); setConfirmation(''); setComplete(true)
      // Keep the success view here; invalidate recovery when leaving it.
    } catch (failure) { setError(authMessage(failure)) }
    finally { submitting.current = false; setBusy(false) }
  }
  return <section className="auth-panel"><span className="eyebrow">RECUPERACIÓN DE CUENTA</span><h1>Una nueva contraseña</h1>
    {complete ? <><AuthStatus message="Contraseña actualizada. Tu sesión está iniciada en este navegador." /><Link className="button-primary" to="/profile" onClick={store.finishRecovery}>Ir a mi perfil</Link></>
      : <>{needsMfa(assurance) && <p className="auth-status">Tu cuenta tiene segundo factor. <Link className="text-link" to="/auth/mfa">Verificar código antes de cambiar la contraseña</Link></p>}<form className="auth-form" onSubmit={submit} aria-busy={busy}>
        <label htmlFor="new-password">Nueva contraseña</label><input id="new-password" type="password" name="new-password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} />
        <label htmlFor="repeat-new-password">Repetí la nueva contraseña</label><input id="repeat-new-password" type="password" name="repeat-new-password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={e => setConfirmation(e.target.value)} />
        {error && <AuthStatus error message={error} />}<button className="button-primary" type="submit" disabled={busy || !assurance || needsMfa(assurance)}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
      </form></>}
  </section>
}
