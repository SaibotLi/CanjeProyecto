import type { AuthStore } from '../auth/sessionStore'
import type { Assurance } from '../auth/sessionStore'
import { readAuthority, type Authority } from './authorityData'

export type AuthorityState = {
  status: 'idle' | 'loading' | 'ready' | 'error'; checking: boolean
  data: Authority | null; userId: string | null; revision: number
}
export function businessGate(state: AuthorityState): 'loading' | 'error' | 'forbidden' | 'allowed' {
  if (state.status === 'error') return 'error'
  if (state.status !== 'ready') return 'loading'
  return state.data?.tenant ? 'allowed' : 'forbidden'
}
export function platformGate(state: AuthorityState, assurance: Assurance | null): 'loading' | 'error' | 'forbidden' | 'mfa' | 'allowed' {
  if (state.status === 'error') return 'error'
  // Do not retain global content during a same-user revalidation.
  if (state.status !== 'ready' || state.checking) return 'loading'
  if (!state.data?.platform.isAdmin) return 'forbidden'
  if (!assurance) return 'error'
  if (assurance.currentLevel === 'aal1') return 'mfa'
  return assurance.currentLevel === 'aal2' ? 'allowed' : 'error'
}
export function createAuthorityStore(auth: AuthStore, reader = readAuthority) {
  let state: AuthorityState = { status: 'idle', checking: false, data: null, userId: null, revision: -1 }
  const listeners = new Set<() => void>()
  let unsubscribe: (() => void) | undefined
  let generation = 0
  let controller: AbortController | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const emit = (next: AuthorityState) => { state = next; for (const listener of listeners) listener() }
  const reload = async (): Promise<Authority | null> => {
    const snapshot = auth.getSnapshot(), userId = snapshot.session?.user.id ?? null
    controller?.abort(); controller = new AbortController()
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)])
    const request = ++generation
    if (!userId || snapshot.initializing || snapshot.signingOut) {
      emit({ status: 'idle', checking: false, data: null, userId, revision: snapshot.revision }); return null
    }
    // Keep an editor mounted during a same-account refetch, but disable writes.
    emit({ ...state, status: state.data?.userId === userId ? 'ready' : 'loading', checking: true,
      userId, revision: snapshot.revision })
    const current = () => request === generation && auth.getSnapshot().revision === snapshot.revision
      && auth.getSnapshot().session?.user.id === userId
    try {
      const data = await reader(auth.getClient(), userId, signal)
      if (!current()) return null
      emit({ status: 'ready', checking: false, data, userId, revision: snapshot.revision }); return data
    } catch {
      // Keep same-owner display data/drafts, never a positive authority decision.
      // Gates remain error and all writes require a successful fresh DB check.
      if (current()) emit({ status: 'error', checking: false,
        data: state.data?.userId === userId ? state.data : null, userId, revision: snapshot.revision })
      return null
    }
  }
  const onAuth = () => {
    const next = auth.getSnapshot()
    if (state.revision === next.revision && state.userId === (next.session?.user.id ?? null)
      && !(state.status === 'idle' && !next.initializing && next.session)) return
    generation++; controller?.abort()
    const sameIdentity = !!next.session && next.session.user.id === state.data?.userId
    // Refresh/focus can reannounce the same session. Preserve its draft/view,
    // disable writes, and recheck DB. Logout/account switch clears immediately.
    emit({ status: sameIdentity ? 'ready' : next.session ? 'loading' : 'idle', checking: sameIdentity,
      data: sameIdentity ? state.data : null, userId: next.session?.user.id ?? null, revision: next.revision })
    if (timer) clearTimeout(timer)
    // The Auth store can emit from an SDK callback. Never await SDK work inside it.
    timer = setTimeout(() => { void reload() }, 0)
  }
  return {
    reload, getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    connect: () => { if (!unsubscribe) {
      unsubscribe = auth.subscribe(onAuth); onAuth()
      // StrictMode reconnect must resume a read aborted by disconnect.
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { void reload() }, 0)
    } },
    disconnect: () => { unsubscribe?.(); unsubscribe = undefined; generation++; controller?.abort(); if (timer) clearTimeout(timer) },
  }
}
export type AuthorityStore = ReturnType<typeof createAuthorityStore>
