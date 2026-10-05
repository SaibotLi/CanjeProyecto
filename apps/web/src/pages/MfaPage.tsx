import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/authContext'
import { authMessage, verifyTotp, totpQrSource } from '../features/auth/authData'
import { AuthStatus } from '../features/auth/components/AuthStatus'
import { needsMfa } from '../features/auth/sessionStore'

type TotpFactor = { id: string; friendly_name?: string; status: 'verified' | 'unverified' }
type Enrollment = { id: string; qr: string; secret: string }
export function MfaPage() {
  const { session } = useAuth()
  return session ? <MfaPanel key={session.user.id} owner={session.user.id} /> : null
}
function MfaPanel({ owner }: { owner: string }) {
  const { store, assurance, recovery } = useAuth()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const continuePlatform = search.get('continue') === 'platform' && !recovery
  const [factors, setFactors] = useState<TotpFactor[]>([])
  const [loading, setLoading] = useState(true)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [selected, setSelected] = useState('')
  const [removing, setRemoving] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  const mounted = useRef(false)
  const current = useCallback(() => mounted.current && store.getSnapshot().session?.user.id === owner && !store.getSnapshot().signingOut, [store, owner])
  const load = useCallback(async () => {
    const result = await store.getClient().auth.mfa.listFactors()
    if (!current()) return
    if (result.error) throw result.error
    setFactors(result.data.all.filter(factor => factor.factor_type === 'totp'))
    setLoading(false)
  }, [store, current])
  useEffect(() => {
    mounted.current = true
    void Promise.resolve().then(load).catch(failure => { if (current()) { setError(authMessage(failure)); setLoading(false) } })
    return () => { mounted.current = false }
  }, [load, current])
  async function run(action: () => Promise<void>) {
    if (inFlight.current || !current()) return
    inFlight.current = true; setBusy(true); setError(''); setMessage('')
    try { await action() } catch (failure) { if (current()) setError(authMessage(failure)) }
    finally { inFlight.current = false; if (current()) setBusy(false) }
  }
  async function enroll() {
    const result = await store.getClient().auth.mfa.enroll({ factorType: 'totp', issuer: 'Valhalla Space', friendlyName: `Valhalla ${Date.now()}` })
    if (result.error) throw result.error
    if (!current()) return // never display A's enrollment after switching to B
    setEnrollment({ id: result.data.id, qr: totpQrSource(result.data.totp.qr_code), secret: result.data.totp.secret }); setCode('')
    await load()
  }
  async function remove(factorId: string, verified: boolean) {
    const result = await store.getClient().auth.mfa.unenroll({ factorId })
    if (result.error) throw result.error
    if (!current()) return
    setEnrollment(null); setCode(''); setRemoving(''); setSelected('')
    // Verified-factor removal doesn't itself immediately downgrade the JWT.
    if (verified) {
      const refreshed = await store.getClient().auth.refreshSession()
      if (refreshed.error) throw refreshed.error
    }
    if (!current()) return
    await load(); await store.reload()
    if (current()) setMessage('Factor retirado.')
  }
  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await run(async () => {
      const factorId = enrollment?.id || selected || factors.find(f => f.status === 'verified')?.id
      if (!factorId) return
      await verifyTotp(store.getClient(), factorId, code)
      if (!current()) return
      setEnrollment(null); setCode(''); await load(); await store.reload()
      if (current()) { setMessage('Segundo factor verificado en esta sesión.'); if (recovery) navigate('/auth/recovery', { replace: true }) }
    })
  }
  const verified = factors.filter(f => f.status === 'verified')
  return <section className="auth-panel"><span className="eyebrow">{continuePlatform ? 'SEGURIDAD · ACCESO PLATFORM' : 'SEGURIDAD · OPCIONAL'}</span><h1>Segundo factor</h1>
    <p className="muted">Usá una app de autenticación para generar códigos. Esto verifica tu sesión; no otorga permisos de administración.</p>
    <p className="outline-tag">{assurance ? `Sesión: ${assurance.currentLevel ?? 'sin nivel'} · siguiente: ${assurance.nextLevel ?? 'sin nivel'}` : 'Consultando nivel de sesión…'}</p>
    {loading && <AuthStatus message="Consultando tus factores…" />}{error && <AuthStatus error message={error} />}{message && <AuthStatus message={message} />}
    {enrollment && <div className="auth-enrollment"><h2>Conectá tu autenticador</h2><p className="muted">Escaneá este QR o ingresá la clave manualmente. No compartas ni captures estos datos.</p><img className="auth-mfa-qr" src={enrollment.qr} alt="QR privado para configurar tu autenticador" width="220" height="220" /><details><summary>Ver clave de configuración manual</summary><code className="auth-secret">{enrollment.secret}</code></details><button type="button" className="button-secondary" disabled={busy} onClick={() => { void run(() => remove(enrollment.id, false)) }}>Cancelar y retirar factor pendiente</button></div>}
    {(enrollment || (needsMfa(assurance) && verified.length > 0)) && <form className="auth-form" onSubmit={verify} aria-busy={busy}>
      {!enrollment && <><label htmlFor="mfa-factor">Autenticador</label><select id="mfa-factor" value={selected || verified[0]?.id} onChange={e => setSelected(e.target.value)}>{verified.map(factor => <option key={factor.id} value={factor.id}>{factor.friendly_name || 'Autenticador'}</option>)}</select></>}
      <label htmlFor="totp-code">Código de 6 números</label><input id="totp-code" name="totp-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
      <button className="button-primary" type="submit" disabled={busy}>{busy ? 'Verificando…' : enrollment ? 'Activar y verificar' : 'Verificar sesión'}</button>
    </form>}
    {!loading && !enrollment && <button type="button" className="button-primary" disabled={busy || !assurance || needsMfa(assurance)} onClick={() => { void run(enroll) }}>Agregar autenticador</button>}
    {!loading && <div className="auth-security"><h2>Tus autenticadores</h2>{!factors.length && <p className="muted">Todavía no tenés un segundo factor.</p>}<ul className="auth-factors">{factors.map(factor => <li key={factor.id}><div><strong>{factor.friendly_name || 'Autenticador'}</strong><span className="muted">{factor.status === 'verified' ? 'Verificado' : 'Pendiente de verificación'}</span></div>{removing === factor.id ? <div className="auth-actions"><p className="muted">¿Retirar este autenticador?</p><button className="button-secondary" type="button" disabled={busy} onClick={() => { void run(() => remove(factor.id, factor.status === 'verified')) }}>Confirmar retiro</button><button className="button-secondary" type="button" disabled={busy} onClick={() => setRemoving('')}>Conservar</button></div> : <button className="button-secondary" type="button" disabled={busy || (factor.status === 'verified' && assurance?.currentLevel !== 'aal2')} onClick={() => setRemoving(factor.id)}>Retirar</button>}</li>)}</ul>{needsMfa(assurance) && <p className="muted">Verificá un factor vigente antes de retirarlo. Si perdiste acceso, no existe recuperación administrativa en esta versión local.</p>}</div>}
    <div className="auth-links"><Link to={recovery ? '/auth/recovery' : '/profile'}>{recovery ? 'Volver a recuperación' : 'Volver a mi perfil'}</Link><Link to="/">Seguir viendo la carta</Link></div>
    {continuePlatform && assurance?.currentLevel === 'aal2' && <Link className="button-primary" to="/platform">Continuar a Platform</Link>}
    <p className="context-note">Si dejás una configuración sin terminar, su factor pendiente seguirá visible para retirarlo; la clave no se vuelve a mostrar. Recuperación privilegiada de MFA pendiente antes del piloto.</p>
  </section>
}
