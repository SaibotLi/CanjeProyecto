import { useState } from 'react'
import { formatPaid, formatPoints, readableCode, type Receipt } from './loyaltyData'
import {useBusinessOptional} from '../business/businessContext'

export function LoyaltyHistory({ entries, operator = false, admin = false, disabled = false, reverse, more }: {
  entries: Receipt[]; operator?: boolean; admin?: boolean; disabled?: boolean
  reverse?: (id: string) => void; more?: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false), [error, setError] = useState(false)
  const context=useBusinessOptional()
  const reversed = new Set(entries.map(r => r.reverses_id).filter(Boolean))
  const next = async () => { if (loading || !more) return; setLoading(true); setError(false); try { await more() } catch { setError(true) } finally { setLoading(false) } }
  return <section className="loyalty-history" aria-label={operator ? 'Historial operativo' : 'Mis movimientos'}>
    {!entries.length && <p className="loyalty-empty">Todavía no hay movimientos. Cada consumo confirmado aparecerá acá.</p>}
    <ul>{entries.map(row => <li key={row.id} className="loyalty-movement"><div><h3>{row.entry_type === 'credit' ? 'Consumo acreditado' : 'Reversa completa'}</h3>
      <p>{formatPaid(row.paid_amount)} · <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short',timeZone:context?.business.timezone })}</time></p>
      {operator && <p>Código {readableCode(row.customer_code)}</p>}{row.reference && <p>Referencia: {row.reference}</p>}{row.reason && <p>Motivo: {row.reason}</p>}
      {admin && row.entry_type === 'credit' && !reversed.has(row.id) && <button className="button-secondary" type="button" disabled={disabled} onClick={() => reverse?.(row.id)} aria-label={`Revertir consumo ${readableCode(row.customer_code)} de ${formatPaid(row.paid_amount)}`}>Revertir consumo</button>}
    </div><strong className={row.entry_type === 'credit' ? 'positive' : ''}>{row.entry_type === 'credit' ? '+' : ''}{formatPoints(row.points_delta)} <small>pts</small></strong></li>)}</ul>
    {more && <button type="button" className="button-secondary" disabled={loading} onClick={() => { void next() }}>{loading ? 'Cargando…' : 'Ver movimientos anteriores'}</button>}
    {error && <p role="alert">No pudimos cargar más movimientos. Volvé a intentar.</p>}
  </section>
}
