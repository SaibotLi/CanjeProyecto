import { createContext, useContext } from 'react'
import type { AuthorityState, AuthorityStore } from './authorityStore'
export const AuthorityContext = createContext<(AuthorityState & { store: AuthorityStore }) | null>(null)
export function useAuthority() {
  const value = useContext(AuthorityContext)
  if (!value) throw new Error('AuthorityProvider requerido.')
  return value
}
