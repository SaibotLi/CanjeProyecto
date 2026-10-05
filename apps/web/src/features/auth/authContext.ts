import { createContext, useContext } from 'react'
import type { AuthState, AuthStore } from './sessionStore'
export const AuthContext = createContext<(AuthState & { store: AuthStore }) | null>(null)
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider requerido.')
  return context
}
