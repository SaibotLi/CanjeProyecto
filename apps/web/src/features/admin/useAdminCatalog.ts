import { useEffect, useState, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/authContext'
import { useAuthority } from '../authority/authorityContext'
import { createAdminCatalogStore, emptyAdminCatalog } from './adminCatalogStore'

export function useAdminCatalog() {
  const auth = useAuth(), authority = useAuthority()
  const userId = auth.session?.user.id, businessId = authority.data?.tenant?.id
  const owner = userId && businessId ? `${userId}:${businessId}` : null
  const [attempt, retry] = useState(0)
  const [store] = useState(createAdminCatalogStore)
  const result = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  useEffect(() => {
    if (!businessId || !owner || authority.checking || authority.status !== 'ready') return
    void store.load(auth.store.getClient(), owner, businessId)
    return store.cancel
    // Session revisions/focus revalidation refresh data without changing its owner
    // or unmounting the editor. Whole session/context object references are excluded.
  }, [store, auth.store, owner, businessId, auth.revision, authority.checking, authority.status, attempt])
  const visible = result.owner === owner ? result : emptyAdminCatalog
  return { ...visible, reload: () => retry(value => value + 1) }
}
