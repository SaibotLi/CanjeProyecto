import { useCallback, useState } from 'react'
import { PageHeading } from '../components/PageHeading'
import { AuthStatus } from '../features/auth/components/AuthStatus'
import { useAuth } from '../features/auth/authContext'
import { formatPoints, readLoyaltyBusiness, readOwnCode, readableCode } from '../features/loyalty/loyaltyData'
import { useLoyaltyRead } from '../features/loyalty/useLoyaltyRead'
import { useHistory } from '../features/loyalty/useHistory'
import { LoyaltyHistory } from '../features/loyalty/LoyaltyHistory'

export function PointsPage() {
  const auth = useAuth()
  return auth.session ? <OwnPoints key={auth.session.user.id} userId={auth.session.user.id} /> : null
}
function OwnPoints({ userId }: { userId: string }) {
  const auth = useAuth(), client = auth.store.getClient()
  const load = useCallback(async () => ({ business: await readLoyaltyBusiness(client), code: await readOwnCode(client, userId) }), [client, userId])
  const details = useLoyaltyRead(load, auth.revision), [copied, setCopied] = useState(false), [copyError, setCopyError] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(details.data!.code); setCopied(true); setCopyError(false) } catch { setCopyError(true) } }
  return <div className="loyalty-workspace"><PageHeading eyebrow="CADA VISITA CUENTA" title="Mis puntos" description="Tu saldo y tus consumos confirmados en Valhalla." />
    {details.busy && !details.data && <AuthStatus message="Cargando tu cuenta de puntos…" />}
    {details.error && <div role="alert">No pudimos actualizar tu código y negocio. <button type="button" className="button-secondary" onClick={() => { void details.refresh() }}>Reintentar</button></div>}
    {details.data && <><section className="customer-code-card"><span className="eyebrow">TU CÓDIGO PERSONAL</span><p className="customer-code">{readableCode(details.data.code)}</p><button type="button" className="button-secondary" onClick={() => { void copy() }}>{copied ? 'Código copiado' : 'Copiar código'}</button>{copyError && <p role="alert">No pudimos copiarlo. Podés seleccionar el código y copiarlo manualmente.</p>}<p className="muted">Mostralo al personal antes de acreditar tu consumo. Este código sólo identifica tu cuenta.</p></section>
      <PointBalance key={details.data.business.id} businessId={details.data.business.id} businessName={details.data.business.name} />
    </>}
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
