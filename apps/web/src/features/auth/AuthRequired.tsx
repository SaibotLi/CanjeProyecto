import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './authContext'
import { authGate } from './sessionStore'
import { AuthStatus } from './components/AuthStatus'

export function AuthRequired({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const gate = authGate(auth)
  if (gate === 'loading') return <AuthStatus message="Preparando tu sesión…" />
  if (gate === 'unavailable') return <AuthStatus error message="No pudimos conectar tu cuenta. Recargá e intentá de nuevo." />
  if (gate === 'login') return <Navigate to="/login" replace />
  // Authenticated only. No business/platform authority inferred here.
  return <>{children}</>
}
