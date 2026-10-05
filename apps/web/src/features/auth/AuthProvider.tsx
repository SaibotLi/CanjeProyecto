import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { AuthContext } from './authContext'
import type { AuthStore } from './sessionStore'

export function AuthProvider({ store, children }: { store: AuthStore; children: ReactNode }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  useEffect(() => { store.connect(); return store.disconnect }, [store])
  return <AuthContext.Provider value={{ ...state, store }}>{children}</AuthContext.Provider>
}
