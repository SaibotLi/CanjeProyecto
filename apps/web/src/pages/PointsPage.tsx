import { useCallback, useState } from 'react'
import { PageHeading } from '../components/PageHeading'
import { AuthStatus } from '../features/auth/components/AuthStatus'
import { useAuth } from '../features/auth/authContext'
import { formatPoints, readOwnCode, readableCode } from '../features/loyalty/loyaltyData'
import { useLoyaltyRead } from '../features/loyalty/useLoyaltyRead'
import { useHistory } from '../features/loyalty/useHistory'
import {useBusiness} from '../features/business/businessContext'
import { LoyaltyHistory } from '../features/loyalty/LoyaltyHistory'
import {Link} from 'react-router-dom'
import {AuthRequired} from '../features/auth/AuthRequired'
import {businessPath} from '../features/business/businessRoutes'

export function PointsPage() {
  const auth = useAuth()
  const {business}=useBusiness()
  if(!business.loyaltyEnabled)return auth.session?<ArchivedPoints key={`${auth.session.user.id}:${business.id}`}/>:<PointsUnavailable/>
  return <AuthRequired>{auth.session?<OwnPoints key={`${auth.session.user.id}:${business.id}`} userId={auth.session.user.id} />:null}</AuthRequired>
}
function PointsUnavailable(){const {business}=useBusiness();return <section className="auth-panel"><h1>Función no disponible</h1><p>Esta función no forma parte del servicio actual de este comercio.</p><Link className="button-primary" to={businessPath(business.slug)}>Volver a la carta</Link></section>}
function ArchivedPoints(){
  const auth=useAuth(),{business}=useBusiness(),result=useHistory(auth.store.getClient(),business.id,true,auth.revision)
  if(!result.data)return <section className="auth-panel"><AuthStatus error={result.error} message={result.error?'No pudimos consultar tu historial.':'Consultando tu actividad anterior…'}/>{result.error&&<button className="button-secondary" onClick={()=>{void result.refresh()}}>Reintentar</button>}</section>
  if(!result.entries.length)return <PointsUnavailable/>
  return <div className="loyalty-workspace"><PageHeading eyebrow={business.name} title="Tu historial anterior" description="El servicio está deshabilitado. Tus movimientos se conservan para consulta."/><p>Saldo histórico: {formatPoints(result.data.balance!)} puntos</p><LoyaltyHistory entries={result.entries} more={result.more}/><Link className="text-link" to={businessPath(business.slug)}>Volver a la carta</Link></div>
}
function OwnPoints({ userId }: { userId: string }) {
  const auth = useAuth(), client = auth.store.getClient()
  const {business}=useBusiness()
  const load = useCallback(async () => ({ code: business.loyaltyEnabled?await readOwnCode(client, userId):null }), [client, userId,business.loyaltyEnabled])
  const details = useLoyaltyRead(load, auth.revision), [copied, setCopied] = useState(false), [copyError, setCopyError] = useState(false)
  const copy = async () => { try { if(details.data?.code)await navigator.clipboard.writeText(details.data.code); setCopied(true); setCopyError(false) } catch { setCopyError(true) } }
  return <div className="loyalty-workspace"><PageHeading eyebrow={business.name} title="Mis puntos" description={business.loyaltyEnabled?'Tu saldo y tus consumos confirmados en este comercio.':'Fidelización no está disponible. Tu historial anterior se conserva para consulta.'} />
    {details.busy && !details.data && <AuthStatus message="Cargando tu cuenta de puntos…" />}
    {details.error && <div role="alert">No pudimos actualizar tu código y negocio. <button type="button" className="button-secondary" onClick={() => { void details.refresh() }}>Reintentar</button></div>}
    {business.loyaltyEnabled&&details.data?.code&&<section className="customer-code-card"><span className="eyebrow">TU CÓDIGO PERSONAL</span><p className="customer-code">{readableCode(details.data.code)}</p><button type="button" className="button-secondary" onClick={() => { void copy() }}>{copied ? 'Código copiado' : 'Copiar código'}</button>{copyError && <p role="alert">No pudimos copiarlo. Podés seleccionar el código y copiarlo manualmente.</p>}<p className="muted">Mostralo al personal antes de acreditar tu consumo. Este código sólo identifica tu cuenta.</p></section>}
    <PointBalance key={business.id} businessId={business.id} businessName={business.name}/>
  </div>
}
function PointBalance({ businessId, businessName }: { businessId: string; businessName: string }) {
  const auth = useAuth(), result = useHistory(auth.store.getClient(), businessId, true, auth.revision)
  return <><section className="balance-card"><div><p className="eyebrow">SALDO REAL · {businessName}</p><p className="balance-number">{result.data ? formatPoints(result.data.balance!) : '—'}<span>puntos</span></p></div><button type="button" className="button-secondary" disabled={result.busy} onClick={() => { void result.refresh() }}>{result.busy ? 'Actualizando…' : 'Actualizar saldo'}</button></section>
    {result.error && <AuthStatus error message="No pudimos actualizar el saldo. La última lectura sigue visible; reintentá al recuperar la conexión." />}
    <div className="section-heading"><h2>Mis movimientos</h2></div>
    {result.busy && !result.data ? <AuthStatus message="Cargando movimientos…" /> : result.data && <LoyaltyHistory entries={result.entries} more={result.more} />}
    <p className="context-note">El saldo incluye todo tu historial en este negocio, también los consumos de cero puntos y sus reversas.</p>
  </>
}
