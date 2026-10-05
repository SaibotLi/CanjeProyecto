type PublicEnvironment = {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

// Lazy: the Carta calls this before createClient; missing config becomes a UI error.
// Never include supplied values in errors; even public config can be misconfigured.
export function readSupabaseEnvironment(environment: PublicEnvironment = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
}) {
  const url = environment.VITE_SUPABASE_URL?.trim()
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!url || !publishableKey) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en apps/web/.env.local.')
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('VITE_SUPABASE_URL debe ser una URL válida.')
  }

  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
  if (
    (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) ||
    parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/'
  ) {
    throw new Error('VITE_SUPABASE_URL debe ser un origen HTTPS (HTTP solo para loopback local).')
  }

  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY debe ser una publishable key, nunca un secreto o JWT legacy.')
  }

  return { url: parsed.origin, publishableKey } as const
}
