import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { readProfile, type AppClient, type Profile } from './authData'

export type Assurance = { currentLevel: string | null; nextLevel: string | null }
export type AuthState = {
  initializing: boolean; unavailable: boolean; session: Session | null
  profile: Profile | null; profileStatus: 'idle' | 'loading' | 'ready' | 'error'
  assurance: Assurance | null; recovery: boolean; linkError: boolean; callbackAccepted: boolean
  revision: number; epoch: number; signingOut: boolean; logoutError: boolean
}
export const initialAuthState: AuthState = {
  initializing: true, unavailable: false, session: null, profile: null, profileStatus: 'idle',
  assurance: null, recovery: false, linkError: false, callbackAccepted: false, revision: 0, epoch: 0, signingOut: false, logoutError: false,
}
export function sessionTransition(state: AuthState, event: AuthChangeEvent, session: Session | null): AuthState {
  if ((state.signingOut || state.logoutError) && event !== 'SIGNED_OUT') return state
  const changed = state.session?.user.id !== session?.user.id
  return {
    ...state, session, epoch: state.epoch + 1, revision: state.revision + 1,
    profile: changed || !session ? null : state.profile,
    profileStatus: !session ? 'idle' : changed ? 'loading' : state.profileStatus,
    // Never retain an old AAL after the SDK replaces/refreshes its session.
    assurance: null,
    recovery: !!session && (event === 'PASSWORD_RECOVERY' || (!changed && state.recovery && event !== 'SIGNED_IN')),
    signingOut: event === 'SIGNED_OUT' ? false : state.signingOut,
    logoutError: event === 'SIGNED_OUT' ? false : state.logoutError,
  }
}
export function authGate(state: AuthState): 'loading' | 'unavailable' | 'login' | 'allowed' {
  return state.initializing || state.signingOut ? 'loading' : state.unavailable ? 'unavailable' : state.session ? 'allowed' : 'login'
}
export function needsMfa(assurance: Assurance | null): boolean {
  return assurance?.currentLevel === 'aal1' && assurance.nextLevel === 'aal2'
}

/** One session owner. SDK callbacks are synchronous; async work is deferred.
 * Epoch + request generation prevent A's responses from being committed to B.
 * No roles, manual token decoding, auth cache, or metadata authority here.
 */
export function createAuthStore(client: AppClient | null) {
  let state = { ...initialAuthState }
  // Presence only, never read/extract token values. Successful SDK handling
  // clears the fragment; malformed/direct callbacks must not reuse a prior login.
  const callbackIntent = typeof window !== 'undefined' && window.location.pathname === '/auth/callback' && !!window.location.hash
  let callbackChecked = false
  const listeners = new Set<() => void>()
  let subscription: { unsubscribe: () => void } | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let bootTimer: ReturnType<typeof setTimeout> | undefined
  let request = 0
  let connection = 0
  const emit = (next: AuthState) => { state = next; for (const listener of listeners) listener() }
  const reload = async () => {
    const userId = state.session?.user.id
    if (!client || !userId || state.signingOut) return
    const epoch = state.epoch
    const generation = ++request
    emit({ ...state, profileStatus: 'loading' })
    const current = () => generation === request && epoch === state.epoch && userId === state.session?.user.id && !state.signingOut
    const [profile, assurance] = await Promise.allSettled([readProfile(client, userId), client.auth.mfa.getAuthenticatorAssuranceLevel()])
    if (!current()) return
    emit({ ...state,
      profile: profile.status === 'fulfilled' ? profile.value : null,
      profileStatus: profile.status === 'fulfilled' ? 'ready' : 'error',
      assurance: assurance.status === 'fulfilled' && !assurance.value.error ? assurance.value.data : null,
    })
  }
  const onEvent = (event: AuthChangeEvent, session: Session | null) => {
    emit(sessionTransition(state, event, session))
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { void reload() }, 0)
  }
  const connect = () => {
    if (subscription) return
    const cycle = ++connection
    if (!client) { emit({ ...state, initializing: false, unavailable: true }); return }
    subscription = client.auth.onAuthStateChange(onEvent).data.subscription
    // INITIAL_SESSION is the sole snapshot source, not a competing getSession().
    // Initialize errors + delayed recovery event settle before exposing forms.
    void client.auth.initialize().then(result => {
      bootTimer = setTimeout(() => {
        if (cycle !== connection) return
        const authPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/')
        // Evaluate once BEFORE our URL cleanup, including on StrictMode reconnect.
        const callbackAccepted = callbackChecked ? state.callbackAccepted : (callbackIntent && !result.error && !!state.session && !window.location.hash)
        callbackChecked = true
        if (authPath) window.history.replaceState(window.history.state, '', window.location.pathname)
        emit({ ...state, initializing: false, linkError: !!result.error, callbackAccepted })
        void reload()
      }, 0)
    }).catch(() => { if (cycle === connection) emit({ ...state, initializing: false, unavailable: true }) })
  }
  const disconnect = () => {
    connection++; request++
    subscription?.unsubscribe(); subscription = undefined
    if (timer) clearTimeout(timer)
    if (bootTimer) clearTimeout(bootTimer)
  }
  const signOut = async () => {
    // Hide all private data BEFORE network; don't claim success if logout fails.
    request++
    emit({ ...state, session: null, profile: null, profileStatus: 'idle', assurance: null, recovery: false,
      signingOut: true, logoutError: false, epoch: state.epoch + 1, revision: state.revision + 1 })
    if (!client) throw new Error('Auth no disponible.')
    try {
      const result = await client.auth.signOut({ scope: 'local' })
      if (result.error) throw result.error
      emit({ ...state, signingOut: false, logoutError: false })
    } catch (failure) {
      emit({ ...state, signingOut: false, logoutError: true })
      throw failure
    }
  }
  return {
    connect, disconnect, reload, signOut, getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    getClient: () => { if (!client) throw new Error('Auth no disponible.'); return client },
    finishRecovery: () => emit({ ...state, recovery: false }),
    finishCallback: () => emit({ ...state, callbackAccepted: false }),
  }
}
export type AuthStore = ReturnType<typeof createAuthStore>
