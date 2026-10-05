import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useAuth } from '../auth/authContext'
import { AuthorityContext } from './authorityContext'
import { createAuthorityStore } from './authorityStore'

export function AuthorityProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const [store] = useState(() => createAuthorityStore(auth.store))
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  useEffect(() => {
    store.connect()
    const refresh = () => { if (document.visibilityState === 'visible') void store.reload() }
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh)
    return () => { store.disconnect(); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [store])
  // Identity/revision check also prevents an old snapshot on a React boundary.
  const visible = state.userId === (auth.session?.user.id ?? null) && state.revision === auth.revision
    ? state : { ...state, status: 'loading' as const, checking: true, data: null }
  return <AuthorityContext.Provider value={{ ...visible, store }}>{children}</AuthorityContext.Provider>
}
