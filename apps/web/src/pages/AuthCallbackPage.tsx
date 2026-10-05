import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/authContext'
import { AuthStatus } from '../features/auth/components/AuthStatus'

export function AuthCallbackPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const accepted = !auth.initializing && auth.callbackAccepted && !!auth.session && !auth.linkError
  useEffect(() => {
    if (accepted) { navigate('/profile', { replace: true }); auth.store.finishCallback() }
  }, [accepted, auth.store, navigate])
  if (auth.initializing) return <AuthStatus message="Confirmando tu cuenta…" />
  if (accepted) return <AuthStatus message="Cuenta confirmada. Abriendo tu perfil…" />
  return <section className="auth-panel"><h1>Revisá el enlace</h1><AuthStatus error message="El enlace no es válido, venció o ya fue utilizado. Si ya confirmaste tu cuenta, podés ingresar." /><div className="auth-links"><Link to="/login">Ingresar</Link><Link to="/register">Crear cuenta</Link><Link to="/">Volver a la carta</Link></div></section>
}
