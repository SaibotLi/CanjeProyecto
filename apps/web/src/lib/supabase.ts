import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../supabase/types/database.types'
import { readSupabaseEnvironment } from './env'

let browserClient: SupabaseClient<Database> | undefined

export const browserAuthOptions = {
  flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, debug: false,
} as const

/** The only browser client; SDK owns persistence, refresh and URL tokens. */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!browserClient) {
    const { url, publishableKey } = readSupabaseEnvironment()
    browserClient = createClient<Database>(url, publishableKey, {
      auth: browserAuthOptions,
    })
  }
  return browserClient
}
