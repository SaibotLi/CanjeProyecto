import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../../supabase/types/database.types'

export type AppClient = SupabaseClient<Database>
// Match the existing profiles_display_name_valid CHECK; no schema change.
export const displayNameMaxLength = 80
export type Profile = { id: string; displayName: string | null; createdAt: string; updatedAt: string }
type ProfileRow = Database['public']['Tables']['profiles']['Row']
export function mapProfile(row: ProfileRow, userId: string): Profile {
  if (row.id !== userId) throw new Error('Perfil no disponible.')
  return { id: row.id, displayName: row.display_name, createdAt: row.created_at, updatedAt: row.updated_at }
}
export async function readProfile(client: AppClient, userId: string): Promise<Profile> {
  // Explicit self filter also when a future platform session has wider READ RLS.
  const { data, error } = await client.from('profiles').select('id,display_name,created_at,updated_at').eq('id', userId).single()
  if (error || !data) throw new Error('No pudimos cargar tu perfil.')
  return mapProfile(data, userId)
}
export async function updateDisplayName(client: AppClient, userId: string, value: string): Promise<Profile> {
  const displayName = value.trim()
  if (displayName.length > displayNameMaxLength) throw new Error(`Usá hasta ${displayNameMaxLength} caracteres para tu nombre.`)
  const { data, error } = await client.from('profiles').update({ display_name: displayName || null })
    .eq('id', userId).select('id,display_name,created_at,updated_at').single()
  if (error || !data) throw new Error('No pudimos guardar tu nombre.')
  return mapProfile(data, userId)
}
export function authMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
  if (code === 'invalid_credentials') return 'El email o la contraseña no son correctos.'
  if (code === 'email_not_confirmed') return 'Confirmá tu email antes de ingresar. Revisá el correo de confirmación.'
  if (code === 'otp_expired') return 'El enlace es inválido, venció o ya fue utilizado. Solicitá uno nuevo.'
  if (code === 'mfa_verification_failed') return 'El código no es válido. Probá con el código actual de tu app.'
  if (code === 'insufficient_aal' || code === 'mfa_aal2_required') return 'Verificá tu segundo factor antes de continuar.'
  if (code === 'same_password') return 'Elegí una contraseña diferente de la anterior.'
  if (code === 'weak_password') return 'Elegí una contraseña más segura, de al menos 8 caracteres.'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return 'Esperá un momento antes de volver a intentarlo.'
  return 'No pudimos completar la solicitud. Revisá tu conexión e intentá de nuevo.'
}
export function authRedirect(path: '/auth/callback' | '/auth/recovery', origin = window.location.origin): string {
  return new URL(path, origin).href
}
export function signUp(client: AppClient, email: string, password: string, origin?: string) {
  // No user_metadata. Identity and profile are separate; DB creates the minimal row.
  return client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: authRedirect('/auth/callback', origin) } })
}
export function requestRecovery(client: AppClient, email: string, origin?: string) {
  return client.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirect('/auth/recovery', origin) })
}
export async function verifyTotp(client: AppClient, factorId: string, code: string) {
  if (!/^\d{6}$/.test(code)) throw new Error('Ingresá los 6 números del código.')
  const challenge = await client.auth.mfa.challenge({ factorId })
  if (challenge.error) throw challenge.error
  const verified = await client.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code })
  if (verified.error) throw verified.error
}
export function totpQrSource(sdkQr: string): string {
  const prefix = 'data:image/svg+xml;utf-8,'
  if (!sdkQr.startsWith(prefix)) throw new Error('QR de autenticación no disponible.')
  // Pinned SDK prefixes raw SVG; encode it so # colors don't become URL fragments.
  return `${prefix}${encodeURIComponent(sdkQr.slice(prefix.length))}`
}
