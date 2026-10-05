import { useCallback, useEffect, useState } from 'react'
import { readPublicMenu } from './publicMenu'
import type { MenuState } from './menuState'
import { useAuth } from '../auth/authContext'

export function usePublicMenu() {
  const { revision: authRevision, initializing } = useAuth()
  const [state, setState] = useState<MenuState>({ status: 'loading' })
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setRevision(value => value + 1)
  }, [])
  useEffect(() => {
    if (initializing) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const { getSupabaseClient } = await import('../../lib/supabase')
        if (controller.signal.aborted) return
        const result = await readPublicMenu(getSupabaseClient(), AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]))
        if (controller.signal.aborted) return
        setState(result.kind === 'not-found' ? { status: 'not-found' } : {
          status: result.data.items.length ? 'success' : 'empty', data: result.data,
        })
      } catch {
        if (!controller.signal.aborted) setState({ status: 'error' })
      }
    }
    void load()
    return () => controller.abort()
  }, [revision, authRevision, initializing])
  return { state, retry }
}
