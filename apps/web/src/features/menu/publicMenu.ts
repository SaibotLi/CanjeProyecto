import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../../supabase/types/database.types'
import { publicMenuQuery } from './publicMenuQuery'
import { mapPublicMenu } from './menuMapper'
import type { MenuData } from './types'

export type PublicMenuResult = { kind: 'ready'; data: MenuData } | { kind: 'not-found' }

export function publicMenuImageUrl(client: SupabaseClient<Database>, path: string): string {
  // Pure URL derivation: no request, listing, metadata or signed URL.
  return client.storage.from('menu-images').getPublicUrl(path).data.publicUrl
}

export async function readPublicMenu(client: SupabaseClient<Database>, signal?: AbortSignal, slug?: string): Promise<PublicMenuResult> {
  try {
    const query = publicMenuQuery(client, slug)
    const { data, error } = await (signal ? query.abortSignal(signal) : query).maybeSingle()
    if (error) throw new Error('Public menu query failed')
    if (!data) return { kind: 'not-found' }
    return { kind: 'ready', data: mapPublicMenu(data, path => publicMenuImageUrl(client, path)) }
  } catch {
    // Do not expose backend diagnostics/configuration to the UI or fall back to mocks.
    throw new Error('No pudimos cargar la carta. Intentá nuevamente.')
  }
}
