import { customerCode, decimal, LoyaltyError, receipt, type Customer, type Intent, type Receipt } from './loyaltyData'

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>
type Draft = { code: string; amount: string; reference: string }
export type OperationState = {
  draft: Draft; customer: Customer | null; reversal: { originalId: string; reason: string } | null
  pending: Intent | null; last: Receipt | null; status: 'idle' | 'resolving' | 'sending' | 'uncertain' | 'rejected' | 'success'
  message: string; storageError: boolean
}
type Actions = { lookup: (userId: string, businessId: string, code: string) => Promise<Customer>; send: (intent: Intent) => Promise<Receipt> }
const blank = (): Draft => ({ code: '', amount: '', reference: '' })
export function operationKey(endpoint: string, userId: string, businessId: string) { return `valhalla-loyalty-v1:${endpoint}:${userId}:${businessId}` }
export function createOperationStore(storage: Storage, key: string, userId: string, businessId: string, actions: Actions, uuid = () => crypto.randomUUID()) {
  let state: OperationState = { draft: blank(), customer: null, reversal: null, pending: null, last: null, status: 'idle', message: '', storageError: false }
  const listeners = new Set<() => void>()
  let generation = 0, busy = false, loaded = false
  const emit = (next: OperationState) => { state = next; for (const listener of listeners) listener() }
  const persist = (next: OperationState) => {
    try {
      storage.setItem(key, JSON.stringify({ version: 1, userId, businessId, draft: next.draft, reversal: next.reversal, pending: next.pending, last: next.last, rejected: next.status === 'rejected' }))
      if (storage.getItem(key) === null) throw new Error('Unavailable storage')
      return true
    } catch { return false }
  }
  try {
    const raw = storage.getItem(key)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved.version !== 1 || saved.userId !== userId || saved.businessId !== businessId
        || !saved.draft || !['code', 'amount', 'reference'].every(k => typeof saved.draft[k] === 'string' && saved.draft[k].length <= 240)) throw new Error('Invalid saved draft')
      if (saved.pending) {
        const p = saved.pending
        if (p.userId !== userId || p.businessId !== businessId || !/^[0-9a-f-]{36}$/.test(p.requestId)
          || !['credit', 'reversal'].includes(p.kind)) throw new Error('Invalid intent')
        if (p.kind === 'credit') { customerCode(p.code); decimal(p.amount); if (!(p.reference === null || typeof p.reference === 'string')) throw new Error('Invalid reference') }
        else if (!/^[0-9a-f-]{36}$/.test(p.originalId) || typeof p.reason !== 'string' || p.reason.length < 1 || p.reason.length > 240) throw new Error('Invalid reversal')
      }
      if (saved.reversal && (typeof saved.reversal.originalId !== 'string' || !/^[0-9a-f-]{36}$/.test(saved.reversal.originalId)
        || typeof saved.reversal.reason !== 'string' || saved.reversal.reason.length > 240)) throw new Error('Invalid saved reversal')
      state = { ...state, draft: saved.draft, reversal: saved.reversal, pending: saved.pending, last: saved.last ? receipt(saved.last) : null,
        status: saved.pending ? saved.rejected ? 'rejected' : 'uncertain' : 'idle',
        message: saved.pending ? 'Hay un intento pendiente. Recuperá su resultado antes de iniciar otra operación.' : '' }
    }
    loaded = true
  } catch { state = { ...state, storageError: true, message: 'No pudimos recuperar el borrador guardado. Revisá el historial antes de continuar en este navegador.' } }
  const update = (next: OperationState) => {
    if (!loaded) { emit({ ...next, storageError: true, message: 'No pudimos recuperar el borrador anterior. No se sobrescribirá ni se iniciarán operaciones.' }); return false }
    const stored = persist(next)
    emit({ ...next, storageError: !stored, message: stored ? next.message : 'No pudimos guardar el intento en este navegador. No se enviarán operaciones hasta recuperar el almacenamiento.' })
    return stored
  }
  const send = async (intent: Intent, recovery: boolean) => {
    if (busy || state.storageError) return
    busy = true; generation++
    if (!update({ ...state, pending: intent, status: 'sending', message: 'Confirmando con Valhalla…' })) { busy = false; return }
    try {
      const result = await actions.send(intent)
      // Save the receipt and clear its pending id atomically in one storage write.
      // If that fails, retain the SAME intent rather than enable a new operation.
      const next: OperationState = { ...state, pending: null, last: result, customer: null, reversal: null,
        draft: intent.kind === 'credit' ? blank() : state.draft, status: 'success', message: intent.kind === 'credit' ? 'Acreditación confirmada.' : 'Reversa confirmada.' }
      if (persist(next)) emit(next)
      else emit({ ...state, status: 'uncertain', storageError: true, message: 'La respuesta llegó, pero no pudimos guardar su confirmación. Conservamos el mismo intento.' })
    } catch (error) {
      const rejected = !recovery && error instanceof LoyaltyError && error.definite
      update({ ...state, status: rejected ? 'rejected' : 'uncertain', message: error instanceof LoyaltyError ? error.message : 'La conexión se interrumpió. El servidor puede haber registrado la operación: recuperá el mismo intento.' })
    } finally { busy = false }
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    edit: (field: keyof Draft, value: string) => {
      if (busy || state.pending) return
      if (field === 'code') generation++
      update({ ...state, draft: { ...state.draft, [field]: value }, ...(field === 'code' ? { customer: null } : {}), status: field !== 'code' && state.status === 'resolving' ? 'resolving' : 'idle', message: '' })
    },
    lookup: async () => {
      if (busy || state.pending) return
      const current = ++generation
      try {
        const code = customerCode(state.draft.code)
        emit({ ...state, status: 'resolving', message: 'Buscando cliente…', customer: null })
        const customer = await actions.lookup(userId, businessId, code)
        if (current === generation) emit({ ...state, customer, status: 'idle', message: '' })
      } catch (error) { if (current === generation) emit({ ...state, status: 'idle', message: error instanceof LoyaltyError ? error.message : 'No pudimos identificar al cliente. Conservamos el formulario.' }) }
    },
    credit: async () => {
      if (busy || state.pending || !state.customer || state.storageError) return
      try {
        const amount = decimal(state.draft.amount), reference = state.draft.reference.trim() || null
        if (reference && reference.length > 120) throw new LoyaltyError('La referencia admite hasta 120 caracteres.', true)
        await send({ kind: 'credit', userId, businessId, code: state.customer.customer_code, amount, reference, requestId: uuid() }, false)
      } catch (error) { emit({ ...state, message: error instanceof Error ? error.message : 'Revisá los datos.' }) }
    },
    selectReversal: (originalId: string | null) => { if (!busy && !state.pending) update({ ...state, reversal: originalId ? { originalId, reason: '' } : null, message: '' }) },
    reason: (reason: string) => { if (!busy && !state.pending && state.reversal) update({ ...state, reversal: { ...state.reversal, reason } }) },
    reverse: async () => {
      if (busy || state.pending || !state.reversal || state.storageError) return
      const reason = state.reversal.reason.trim()
      if (!reason || reason.length > 240) { emit({ ...state, message: 'Ingresá un motivo de hasta 240 caracteres.' }); return }
      await send({ kind: 'reversal', userId, businessId, requestId: uuid(), originalId: state.reversal.originalId, reason }, false)
    },
    recover: async () => { if (state.pending) { const intent = state.pending; await send(intent, true) } },
    editRejected: () => { if (!busy && state.status === 'rejected') update({ ...state, pending: null, status: 'idle', message: '' }) },
    retryStorage: () => { if (!busy && loaded) update({ ...state, status: state.pending ? 'uncertain' : 'idle' }) },
  }
}
export type OperationStore = ReturnType<typeof createOperationStore>
