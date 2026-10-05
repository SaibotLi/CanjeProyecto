import { useEffect, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { useAuthority } from '../authority/authorityContext'
import { readAdminCatalog, type AdminCatalog } from './adminData'

export function useAdminCatalog() {
  const auth = useAuth(), authority = useAuthority()
  const businessId = authority.data?.tenant?.id
  const [attempt, retry] = useState(0)
  const [result, setResult] = useState<{ key: string; status: 'ready' | 'error'; data?: AdminCatalog } | null>(null)
  const key = `${auth.session?.user.id}:${auth.revision}:${businessId}:${attempt}`
  useEffect(() => {
    if (!businessId || !auth.session) return
    const controller = new AbortController()
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)])
    void readAdminCatalog(auth.store.getClient(), businessId, signal).then(data => {
      if (!signal.aborted) setResult({ key, status: 'ready', data })
    }).catch(() => { if (!signal.aborted) setResult({ key, status: 'error' }) })
    // Timeout is an error, while cleanup abortion is silently discarded.
    const timedOut = () => { if (!controller.signal.aborted) setResult({ key, status: 'error' }) }
    signal.addEventListener('abort', timedOut)
    return () => { controller.abort(); signal.removeEventListener('abort', timedOut) }
  }, [auth.store, auth.session, businessId, key])
  const visible = result?.key === key ? result : null
  return { status: visible?.status ?? 'loading', data: visible?.data, reload: () => retry(value => value + 1) }
}
