import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/authContext'
import { useAuthority } from '../features/authority/authorityContext'
import { AuthStatus } from '../features/auth/components/AuthStatus'
import { PageHeading } from '../components/PageHeading'
import { createLoyaltyActions, estimate, formatPaid, formatPoints, readableCode, readRule } from '../features/loyalty/loyaltyData'
import { createOperationStore, operationKey, type OperationStore } from '../features/loyalty/operationStore'
import { useLoyaltyRead } from '../features/loyalty/useLoyaltyRead'
import { useHistory } from '../features/loyalty/useHistory'
import { LoyaltyHistory } from '../features/loyalty/LoyaltyHistory'
import { readSupabaseEnvironment } from '../lib/env'
import {useBusiness} from '../features/business/businessContext'
import {businessPath} from '../features/business/businessRoutes'

const stores = new Map<string, OperationStore>()
const unavailableStorage = { getItem: () => { throw new Error('Storage unavailable') }, setItem: () => { throw new Error('Storage unavailable') } }
export function OperatorPage() {
  const auth = useAuth(), authority = useAuthority()
  const business = authority.data?.operatorTenant
  if (!auth.session) return null
  if (!business) return <section className="auth-panel"><h1>{authority.status === 'ready' ? 'Sin acceso operativo' : 'Comprobando acceso…'}</h1><p>{authority.status === 'ready' ? 'Necesitás una membresía vigente de Admin o Staff en este comercio.' : 'Revisamos tus permisos antes de habilitar operaciones.'}</p><button type="button" className="button-secondary" onClick={() => { void authority.store.reload() }}>Volver a comprobar</button><Link className="text-link" to="/profile">Mi cuenta</Link></section>
  return <OperatorWorkspace key={`${auth.session.user.id}:${business.id}`} userId={auth.session.user.id} businessId={business.id} />
}
function OperatorWorkspace({ userId, businessId }: { userId: string; businessId: string }) {
  const auth = useAuth(), authority = useAuthority(), client = auth.store.getClient()
  const context=useBusiness(),path=(section:string)=>businessPath(context.business.slug,section)
  const [store] = useState(() => {
    const key = operationKey(readSupabaseEnvironment().url, userId, businessId)
    let current = stores.get(key)
    if (!current) {
      let storage: Pick<Storage, 'getItem' | 'setItem'>
      try { storage = window.sessionStorage } catch { storage = unavailableStorage }
      current = createOperationStore(storage, key, userId, businessId, createLoyaltyActions(auth.store, authority.store)); stores.set(key, current)
    }
    return current
  })
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const business = authority.data?.operatorBusinesses.find(b => b.id === businessId)
  const allowed = authority.status === 'ready' && !authority.checking && !!business && !context.checking && !context.refreshError
  const admin = allowed && business?.role === 'admin'
  const loadRule = useCallback(() => readRule(client, businessId), [client, businessId])
  const rule = useLoyaltyRead(loadRule, auth.revision), history = useHistory(client, businessId, false, auth.revision, business?.role ?? 'unverified')
  const refreshHistory = history.refresh
  useEffect(() => { if (state.last) { void refreshHistory() } }, [state.last, refreshHistory])
  const busy = state.status === 'sending', locked = busy || !!state.pending
  const enabled = allowed && context.business.loyaltyEnabled && business?.isActive && !!rule.data?.enabled && !rule.error && !state.storageError
  let preview: string | null = null
  try { if (rule.data) preview = estimate(state.draft.amount, rule.data.divisor) } catch { /* incomplete input */ }
  const selected = history.entries.find(row => row.id === state.reversal?.originalId)
  return <div className="loyalty-workspace"><PageHeading eyebrow={`OPERACIONES · ${business?.name ?? context.business.name}`} title={context.business.loyaltyEnabled?'Acreditar consumo':'Historial operativo'} description={context.business.loyaltyEnabled?'Identificá al cliente y registrá el importe efectivamente pagado.':'Fidelización no está contratada. No se permiten nuevas operaciones; el historial y los recibos confirmados se conservan.'} />
    <nav className="operator-links" aria-label="Operaciones"><a href="#operational-history">Historial operativo</a>{admin && <Link to={path('admin')}>Administrar Carta</Link>}<Link to={path('profile')}>Mi cuenta</Link></nav>
    {!allowed && <div role="alert" className="loyalty-notice">No pudimos verificar permisos actuales. Conservamos el formulario; las operaciones están pausadas. <button type="button" className="button-secondary" onClick={() => { void authority.store.reload() }}>Revisar permisos</button></div>}
    {business && !business.isActive && <AuthStatus error message="Negocio inactivo: no se registran operaciones nuevas. Podés recuperar un intento anterior." />}
    {state.storageError && <div role="alert" className="loyalty-notice">{state.message}<button type="button" className="button-secondary" onClick={store.retryStorage}>Comprobar almacenamiento</button></div>}
    {state.pending && <section className="pending-operation" aria-label="Intento pendiente"><h2>{state.pending.kind === 'credit' ? 'Acreditación pendiente' : 'Reversa pendiente'}</h2>
      {state.pending.kind === 'credit' && <p>Código {readableCode(state.pending.code)} · {formatPaid(state.pending.amount)}</p>}
      <p>No inicies otro consumo para reemplazar éste. Recuperar consulta o completa la misma operación.</p>
      <button className="button-primary" type="button" disabled={busy || !allowed || state.storageError || (state.pending.kind === 'reversal' && !admin)} onClick={() => { void store.recover() }}>{busy ? 'Confirmando…' : 'Recuperar mismo intento'}</button>
      {state.status === 'rejected' && <button className="button-secondary" type="button" onClick={store.editRejected}>Corregir intento rechazado</button>}
    </section>}
    {state.message && !state.storageError && <AuthStatus error={['uncertain', 'rejected'].includes(state.status)} message={state.message} />}
    {state.last && <section className="operation-receipt" role="status"><h2>{state.last.entry_type === 'credit' ? 'Consumo confirmado' : 'Reversa confirmada'}</h2><p>{readableCode(state.last.customer_code)} · {formatPaid(state.last.paid_amount)}</p><strong>{state.last.entry_type === 'credit' ? '+' : ''}{formatPoints(state.last.points_delta)} puntos</strong><p className="muted">Resultado confirmado por {context.business.name}.</p></section>}
    {context.business.loyaltyEnabled&&<form className="auth-form credit-form" onSubmit={event => { event.preventDefault(); void store.credit() }} aria-busy={busy}>
      <label htmlFor="customer-code">1. Código del cliente</label><div className="code-entry"><input id="customer-code" name="customer-code" autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="ABCD-EFGH-JK" maxLength={12} value={state.draft.code} disabled={locked} onChange={e => store.edit('code', e.target.value)} /><button className="button-secondary" type="button" disabled={locked || !allowed || state.status === 'resolving'} onClick={() => { void store.lookup() }}>{state.status === 'resolving' ? 'Buscando…' : 'Buscar cliente'}</button></div>
      {state.customer && <section className="resolved-customer" aria-label="Cliente identificado"><strong>{state.customer.display_name || 'Cuenta sin nombre visible'}</strong><p>{readableCode(state.customer.customer_code)}</p><p className="muted">Confirmá con el cliente que éste es su código.</p></section>}
      <label htmlFor="paid-amount">2. Importe efectivamente pagado · ARS</label><input id="paid-amount" name="paid-amount" inputMode="decimal" autoComplete="off" placeholder="6500" maxLength={15} value={state.draft.amount} disabled={locked} onChange={e => store.edit('amount', e.target.value)} />
      <p className="muted">Sin separadores de miles. Admitimos coma o punto y hasta dos decimales.</p>
      {rule.error && <div role="alert">No pudimos actualizar la regla. <button type="button" className="button-secondary" onClick={() => { void rule.refresh() }}>Reintentar regla</button></div>}
      {rule.data && !rule.data.enabled && <AuthStatus error message="El programa de puntos está deshabilitado." />}
      <div className="points-estimate" aria-live="polite"><span>Puntos estimados</span><strong>{preview === null ? '—' : formatPoints(preview)}</strong><small>El comercio confirma el resultado final. No se acumulan sobrantes.</small></div>
      <details><summary>Referencia comercial opcional</summary><label htmlFor="commercial-reference">Referencia</label><input id="commercial-reference" maxLength={120} value={state.draft.reference} disabled={locked} onChange={e => store.edit('reference', e.target.value)} /></details>
      <button className="button-primary" type="submit" disabled={locked || !enabled || !state.customer || preview === null}>{busy ? 'Confirmando…' : 'Confirmar acreditación'}</button>
    </form>}
    {context.business.loyaltyEnabled&&state.reversal && <section className="reversal-confirmation" aria-label="Confirmar reversa"><h2>Revertir consumo completo</h2>{selected && <p>{readableCode(selected.customer_code)} · {formatPaid(selected.paid_amount)} · {formatPoints(selected.points_delta)} puntos</p>}<p>Se conservará el crédito original y se registrará un movimiento compensatorio completo.</p><label htmlFor="reversal-reason">Motivo obligatorio</label><textarea id="reversal-reason" maxLength={240} value={state.reversal.reason} disabled={locked} onChange={e => store.reason(e.target.value)} /><div className="operator-links"><button type="button" className="button-secondary" disabled={locked} onClick={() => store.selectReversal(null)}>Cancelar reversa</button><button type="button" className="button-primary" disabled={locked || !admin || !business?.isActive || !selected || !state.reversal.reason.trim()} onClick={() => { void store.reverse() }}>Confirmar reversa completa</button></div></section>}
    <section id="operational-history"><div className="section-heading"><h2>Historial operativo</h2><button type="button" className="button-secondary" disabled={history.busy} onClick={() => { void history.refresh() }}>Actualizar historial</button></div><p className="muted">{admin ? `Movimientos autorizados de ${context.business.name}.` : 'Tus acreditaciones y las reversas de esos consumos.'}</p>
      {allowed ? <>{history.error && <AuthStatus error message="No pudimos actualizar el historial. Reintentá; las operaciones pendientes se conservan." />}{history.busy && !history.data && <AuthStatus message="Cargando historial…" />}{history.data && <LoyaltyHistory entries={history.entries} operator admin={admin} disabled={locked || !business?.isActive || !context.business.loyaltyEnabled} reverse={store.selectReversal} more={history.more} />}</> : <AuthStatus message="Historial pausado hasta comprobar permisos actuales." />}
    </section>
  </div>
}
