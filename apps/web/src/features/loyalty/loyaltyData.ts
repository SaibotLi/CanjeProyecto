import type { AppClient } from '../auth/authData'
import type { AuthStore } from '../auth/sessionStore'
import type { AuthorityStore } from '../authority/authorityStore'

export class LoyaltyError extends Error {
  constructor(message: string, readonly definite = false) { super(message) }
}
export function decimal(value: string): string {
  if (!/^[0-9]{1,12}([.,][0-9]{1,2})?$/.test(value)) throw new LoyaltyError('Ingresá un importe con hasta dos decimales, sin separadores de miles.', true)
  const [whole, fraction = ''] = value.replace(',', '.').split('.')
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
  if (cents <= 0n || cents > 99999999999999n) throw new LoyaltyError('El importe debe ser mayor a cero y estar dentro del límite permitido.', true)
  return `${BigInt(whole)}.${fraction.padEnd(2, '0')}`
}
export const centsOf = (value: string) => BigInt(decimal(value).replace('.', ''))
export const estimate = (amount: string, divisor: string) => (centsOf(amount) / centsOf(divisor)).toString()
export const formatPoints = (value: string) => new Intl.NumberFormat('es-AR').format(BigInt(value))
export function formatPaid(value: string) {
  const [whole, fraction = '00'] = value.split('.')
  return `$ ${formatPoints(whole)},${fraction.padEnd(2, '0')}`
}
export function customerCode(value: string) {
  const code = value.trim().toUpperCase()
  if (!/^([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}|[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{2})$/.test(code)) throw new LoyaltyError('Ingresá el código completo del cliente.', true)
  return code.replaceAll('-', '')
}
export const readableCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`
export type Customer = { customer_code: string; display_name: string | null }
export type Receipt = {
  id: string; business_id: string; customer_code: string; entry_type: 'credit' | 'reversal'; currency_code: 'ARS'
  paid_amount: string; currency_per_point: string; points_delta: string; request_id: string
  reference: string | null; reverses_id: string | null; reason: string | null; created_at: string
}
export type History = { business_id: string; history: Receipt[]; balance?: string }
export type Intent = { userId: string; businessId: string; requestId: string } & (
  { kind: 'credit'; code: string; amount: string; reference: string | null }
  | { kind: 'reversal'; originalId: string; reason: string })
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new LoyaltyError('No pudimos verificar la respuesta. Recuperá el mismo intento.')
  return value as Record<string, unknown>
}
export function receipt(value: unknown): Receipt {
  const row = record(value)
  if (typeof row.id !== 'string' || typeof row.business_id !== 'string' || typeof row.request_id !== 'string'
    || typeof row.customer_code !== 'string' || !['credit', 'reversal'].includes(String(row.entry_type))
    || row.currency_code !== 'ARS' || typeof row.created_at !== 'string' || !Number.isFinite(Date.parse(row.created_at))
    || typeof row.paid_amount !== 'string' || typeof row.currency_per_point !== 'string'
    || typeof row.points_delta !== 'string' || !/^-?[0-9]+$/.test(row.points_delta)
    || ![row.reference, row.reverses_id, row.reason].every(v => v === null || typeof v === 'string')) throw new LoyaltyError('No pudimos verificar el resultado. Recuperá el mismo intento.')
  try { customerCode(row.customer_code); decimal(row.paid_amount); decimal(row.currency_per_point) }
  catch { throw new LoyaltyError('No pudimos verificar el resultado. Recuperá el mismo intento.') }
  return row as Receipt
}
function history(value: unknown, businessId: string, self: boolean): History {
  const row = record(value)
  if (row.business_id !== businessId || !Array.isArray(row.history)
    || (self && (typeof row.balance !== 'string' || !/^-?[0-9]+$/.test(row.balance)))) throw new LoyaltyError('No pudimos verificar tus movimientos.')
  const entries = row.history.map(receipt)
  if (entries.some(r => r.business_id !== businessId)) throw new LoyaltyError('No pudimos verificar tus movimientos.')
  return { business_id: businessId, history: entries, ...(self ? { balance: row.balance as string } : {}) }
}
function check(error: { code?: string } | null, status: number) {
  if (!error) return
  const messages: Record<string, string> = {
    PT400: 'Revisá los datos de la operación.', PT401: 'Ingresá de nuevo para recuperar el intento.',
    PT403: 'No se autorizó la operación. Revisá tu sesión, membresía y el estado del negocio.',
    PT404: 'El cliente o crédito ya no está disponible.', PT409: 'Este intento tiene un conflicto. Revisá el historial antes de continuar.',
  }
  throw new LoyaltyError(messages[error.code ?? ''] ?? 'No pudimos confirmar el resultado. Conservamos el intento para recuperarlo.',
    status >= 400 && status < 500 && ['PT400', 'PT401', 'PT403', 'PT404', 'PT409', '42501', 'PGRST301', 'PGRST302', 'PGRST303'].includes(error.code ?? ''))
}
export async function readLoyalty(client: AppClient, businessId: string, self: boolean, before?: Receipt): Promise<History> {
  const { data, error, status } = await client.rpc(self ? 'get_my_loyalty' : 'get_loyalty_history', {
    business_id: businessId, page_size: 30, ...(before ? { before_time: before.created_at, before_id: before.id } : {}),
  }).abortSignal(AbortSignal.timeout(15000))
  check(error, status); return history(data, businessId, self)
}
export async function readOwnCode(client: AppClient, userId: string): Promise<string> {
  const { data, error } = await client.from('profiles').select('customer_code').eq('id', userId).abortSignal(AbortSignal.timeout(15000)).single()
  if (error || !data) throw new LoyaltyError('No pudimos cargar tu código. Volvé a intentar.')
  return customerCode(data.customer_code)
}
export async function readRule(client: AppClient, businessId: string) {
  const { data, error } = await client.from('loyalty_settings').select('currency_per_point,points_enabled').eq('business_id', businessId).abortSignal(AbortSignal.timeout(15000)).single()
  if (error || !data) throw new LoyaltyError('No pudimos cargar la regla de puntos. Actualizá antes de acreditar.')
  return { divisor: decimal(String(data.currency_per_point)), enabled: data.points_enabled }
}
export function createLoyaltyActions(auth: AuthStore, authority: AuthorityStore) {
  const context = async (userId: string, businessId: string, admin = false) => {
    const initial = auth.getSnapshot(), session = initial.session
    if (!session || session.user.id !== userId || initial.signingOut || initial.logoutError) throw new LoyaltyError('Ingresá con la cuenta que inició este intento.', true)
    const permission = await authority.reload(), current = auth.getSnapshot()
    if (current.session?.user.id !== userId || current.epoch !== initial.epoch || current.signingOut) throw new LoyaltyError('La sesión cambió. Conservamos tus datos para reintentar.', true)
    const business = permission?.operatorBusinesses.find(b => b.id === businessId)
    if (!permission) throw new LoyaltyError('No pudimos comprobar tus permisos. Conservamos el intento.')
    if (!business || (admin && business.role !== 'admin')) throw new LoyaltyError('Ya no tenés permiso para esta operación.', true)
    // Token stays in SDK memory and binds this request to the checked identity.
    // A later account switch must not send its JWT for another owner's intent.
    return { client: auth.getClient(), token: session.access_token }
  }
  return {
    lookup: async (userId: string, businessId: string, code: string): Promise<Customer> => {
      const ctx = await context(userId, businessId)
      const { data, error, status } = await ctx.client.rpc('lookup_loyalty_customer', { business_id: businessId, customer_code: customerCode(code) })
        .setHeader('Authorization', `Bearer ${ctx.token}`).abortSignal(AbortSignal.timeout(15000))
      check(error, status); const row = record(data)
      if (row.customer_code !== customerCode(code) || !(row.display_name === null || typeof row.display_name === 'string')) throw new LoyaltyError('No pudimos identificar al cliente.')
      return row as Customer
    },
    send: async (intent: Intent): Promise<Receipt> => {
      const ctx = await context(intent.userId, intent.businessId, intent.kind === 'reversal')
      const query = intent.kind === 'credit'
        ? ctx.client.rpc('credit_points', { business_id: intent.businessId, customer_code: intent.code, paid_amount: intent.amount, request_id: intent.requestId, ...(intent.reference ? { reference: intent.reference } : {}) })
        : ctx.client.rpc('reverse_credit', { business_id: intent.businessId, original_id: intent.originalId, reason: intent.reason, request_id: intent.requestId })
      const { data, error, status } = await query.setHeader('Authorization', `Bearer ${ctx.token}`).abortSignal(AbortSignal.timeout(20000))
      check(error, status); const result = receipt(data)
      if (result.request_id !== intent.requestId || result.business_id !== intent.businessId
        || result.entry_type !== intent.kind || (intent.kind === 'credit' && (result.customer_code !== intent.code || centsOf(result.paid_amount) !== centsOf(intent.amount)))
        || (intent.kind === 'reversal' && result.reverses_id !== intent.originalId)) throw new LoyaltyError('No pudimos verificar el resultado. Recuperá el mismo intento.')
      return result
    },
  }
}
