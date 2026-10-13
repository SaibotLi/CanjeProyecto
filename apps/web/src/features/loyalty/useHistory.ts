import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppClient } from '../auth/authData'
import { readLoyalty, type Receipt } from './loyaltyData'
import { useLoyaltyRead } from './useLoyaltyRead'

export function useHistory(client: AppClient, businessId: string, self: boolean, revision: number, scope = self ? 'customer' : 'operator') {
  // UI scope only, never an RPC authority argument. Changing Admin→Staff
  // drops a wider cached response even if the next authorized read fails.
  const load = useCallback(async () => ({ ...await readLoyalty(client, businessId, self), scope }), [client, businessId, self, scope])
  const result = useLoyaltyRead(load, revision)
  const [extra, setExtra] = useState<{ first: unknown; rows: Receipt[]; end: boolean }>({ first: null, rows: [], end: false })
  const generation = useRef(0)
  const invalidate = useCallback(() => { generation.current++ }, [])
  useEffect(() => { invalidate(); return invalidate }, [result.data, invalidate])
  const appended = extra.first === result.data ? extra.rows : []
  const entries = [...(result.data?.history ?? []), ...appended]
  const more = async () => {
    const cursor = entries.at(-1), first = result.data, current = generation.current
    if (!cursor || !first) return
    const page = await readLoyalty(client, businessId, self, cursor)
    if (generation.current !== current) return
    setExtra(previous => ({ first, rows: [...(previous.first === first ? previous.rows : []), ...page.history.filter(r => !entries.some(old => old.id === r.id))], end: page.history.length < 30 }))
  }
  return { ...result, entries, more: result.data && entries.length >= 30 && !(extra.first === result.data && extra.end) ? more : undefined }
}
