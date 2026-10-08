import { readAdminCatalog, type AdminCatalog } from './adminData'
import type { AppClient } from '../auth/authData'

export type AdminCatalogState = {
  owner: string | null; status: 'loading' | 'ready' | 'error'; data?: AdminCatalog
  refreshing: boolean; refreshError: boolean
}
export const emptyAdminCatalog: AdminCatalogState = {
  owner: null, status: 'loading', refreshing: false, refreshError: false,
}

/** Cached catalog data is not authority. Writes still recheck DB membership/RLS. */
export function createAdminCatalogStore(reader = readAdminCatalog, timeoutMs = 15000) {
  let state = emptyAdminCatalog
  const listeners = new Set<() => void>()
  let generation = 0
  let cancelRequest: (() => void) | undefined
  const emit = (next: AdminCatalogState) => { state = next; for (const listener of listeners) listener() }
  const cancel = () => {
    generation++; cancelRequest?.(); cancelRequest = undefined
    if (state.refreshing) emit({ ...state, refreshing: false })
  }
  const load = async (client: AppClient, owner: string, businessId: string) => {
    cancel()
    const request = generation, controller = new AbortController()
    const data = state.owner === owner ? state.data : undefined
    emit({ owner, status: data ? 'ready' : 'loading', data, refreshing: !!data, refreshError: false })
    const current = () => request === generation
    const failed = () => {
      if (current()) emit({ owner, status: data ? 'ready' : 'error', data, refreshing: false, refreshError: !!data })
    }
    // This deadline belongs only to the pending read, never to the mounted editor.
    const timer = setTimeout(() => { controller.abort(); failed() }, timeoutMs)
    const cleanup = () => { clearTimeout(timer); controller.abort() }
    cancelRequest = cleanup
    try {
      const catalog = await reader(client, businessId, controller.signal)
      if (current() && !controller.signal.aborted) {
        emit({ owner, status: 'ready', data: catalog, refreshing: false, refreshError: false })
      }
    } catch { if (!controller.signal.aborted) failed() }
    finally {
      clearTimeout(timer)
      if (current()) cancelRequest = undefined
    }
  }
  return {
    load, cancel, getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
  }
}
