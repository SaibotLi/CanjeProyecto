export function AuthStatus({ message, error = false }: { message: string; error?: boolean }) {
  return <p className={`auth-status${error ? ' auth-error' : ''}`} role={error ? 'alert' : 'status'}>{message}</p>
}
