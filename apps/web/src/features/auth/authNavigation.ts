// Navigation intent only. Route guards and PostgreSQL still decide access.
const destinations = new Set(['/', '/profile', '/points', '/operar', '/admin', '/admin/categories', '/admin/products', '/platform'])

export function safeAuthDestination(value: unknown): string | null {
  return typeof value === 'string' && destinations.has(value) ? value : null
}

export function normalLoginDestination(displayName: string | null | undefined, requested?: unknown): string {
  return safeAuthDestination(requested) ?? (displayName?.trim() ? '/' : '/profile')
}

export function mfaLoginDestination(destination: string): string {
  const target = safeAuthDestination(destination) ?? '/profile'
  return target === '/platform' ? '/auth/mfa?continue=platform' : `/auth/mfa?returnTo=${encodeURIComponent(target)}`
}
