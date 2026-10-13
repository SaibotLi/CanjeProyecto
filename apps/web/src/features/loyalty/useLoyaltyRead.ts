import { useCallback, useEffect, useRef, useState } from 'react'

// Same-owner read cache; never authority. Consumers are keyed by user/tenant.
export function useLoyaltyRead<T>(load: () => Promise<T>, revision = 0) {
  const [state, setState] = useState<{ source: typeof load; data: T | null; busy: boolean; error: boolean }>({ source: load, data: null, busy: true, error: false })
  const generation = useRef(0)
  const invalidate = useCallback(() => { generation.current++ }, [])
  const refresh = useCallback(async () => {
    const current = ++generation.current
    setState(previous => ({ source: load, data: previous.source === load ? previous.data : null, busy: true, error: false }))
    try {
      const data = await load()
      if (current === generation.current) setState({ source: load, data, busy: false, error: false })
    } catch { if (current === generation.current) setState(previous => ({ source: load, data: previous.source === load ? previous.data : null, busy: false, error: true })) }
  }, [load])
  useEffect(() => {
    const focus = () => { if (document.visibilityState === 'visible') void refresh() }
    const timer = setTimeout(() => { void refresh() }, 0)
    window.addEventListener('focus', focus); document.addEventListener('visibilitychange', focus)
    return () => { clearTimeout(timer); invalidate(); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus) }
  }, [refresh, revision, invalidate])
  return { data: state.source === load ? state.data : null, busy: state.source !== load || state.busy, error: state.source === load && state.error, refresh }
}
