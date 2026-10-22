// Navigation intent only. Route guards and PostgreSQL still decide access.
import {businessDestination,businessPath} from '../business/businessRoutes'
const destinations = new Set(['/', '/profile', '/points', '/operar', '/admin', '/admin/categories', '/admin/products', '/platform'])

export function safeAuthDestination(value: unknown): string | null {
  return typeof value === 'string' && destinations.has(value) ? value : businessDestination(value)
}

export function normalLoginDestination(displayName: string | null | undefined, requested?: unknown): string {
  return safeAuthDestination(requested) ?? (displayName?.trim() ? '/' : '/profile')
}

export function mfaLoginDestination(destination: string): string {
  const target = safeAuthDestination(destination) ?? '/profile'
  return target === '/platform' ? '/auth/mfa?continue=platform' : `/auth/mfa?returnTo=${encodeURIComponent(target)}`
}

export function confirmationDestination(requested: unknown): string {
  const target=businessDestination(requested)
  return target?businessPath(target.split('/')[1],'profile'):'/profile'
}
export function authPathAfterCleanup(pathname:string,search=''):string{
  if(pathname!=='/auth/mfa')return pathname
  const params=new URLSearchParams(search)
  if(params.get('continue')==='platform')return '/auth/mfa?continue=platform'
  const target=safeAuthDestination(params.get('returnTo'))
  return target?`/auth/mfa?returnTo=${encodeURIComponent(target)}`:pathname
}
// Optional non-secret navigation hint only; never identity, permissions or tokens.
export function rememberSignupDestination(requested:unknown){
  try{const target=businessDestination(requested);if(target)window.sessionStorage.setItem('canje.signup-destination',target);else window.sessionStorage.removeItem('canje.signup-destination')}catch{/* Confirmation remains valid without a same-browser hint. */}
}
export function takeSignupDestination():string{
  try{const target=window.sessionStorage.getItem('canje.signup-destination');window.sessionStorage.removeItem('canje.signup-destination');return confirmationDestination(target)}catch{return '/profile'}
}
