import test from 'node:test'
import assert from 'node:assert/strict'
import { createAdminCatalogStore } from '../src/features/admin/adminCatalogStore.ts'
import { createAuthorityStore, businessGate, platformGate } from '../src/features/authority/authorityStore.ts'
import { mapAuthority } from '../src/features/authority/authorityData.ts'
import { createAdminActions } from '../src/features/admin/adminActions.ts'
import { initialAuthState } from '../src/features/auth/sessionStore.ts'

const catalog = { categories: [{ id: 'category', businessId: 'business', name: 'Existing' }], items: [{ id: 'item' }] }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const owned = () => mapAuthority([{ user_id: 'A', business_id: 'business', role: 'admin', businesses: { id: 'business', slug: 'valhalla-space', name: 'Existing', is_active: true } }], 'A', 'valhalla-space', true)

test('successful catalog remains ready after several minutes: the request deadline cannot expire the editor', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const store = createAdminCatalogStore(async () => catalog)
  await store.load({}, 'A:business', 'business')
  const before = store.getSnapshot()
  t.mock.timers.tick(180000)
  assert.equal(store.getSnapshot(), before)
  assert.equal(before.status, 'ready')
  assert.equal(before.data, catalog)
  assert.equal(before.refreshError, false)
})

test('same-owner refresh retains ready data throughout a token/focus revision and ignores a superseded response', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const reads = [], store = createAdminCatalogStore(() => { const d = deferred(); reads.push(d); return d.promise })
  const first = store.load({}, 'A:business', 'business'); reads[0].resolve(catalog); await first
  const tokenRefresh = store.load({}, 'A:business', 'business')
  assert.equal(store.getSnapshot().status, 'ready')
  assert.equal(store.getSnapshot().data, catalog)
  assert.equal(store.getSnapshot().refreshing, true)
  const focusRefresh = store.load({}, 'A:business', 'business')
  reads[1].resolve({ categories: [], items: [] }); await tokenRefresh
  assert.equal(store.getSnapshot().data, catalog)
  const fresh = { ...catalog, items: [{ id: 'item', name: 'Fresh' }] }
  reads[2].resolve(fresh); await focusRefresh
  assert.equal(store.getSnapshot().data, fresh)
  t.mock.timers.tick(180000)
  assert.equal(store.getSnapshot().data, fresh)
  assert.equal(store.getSnapshot().status, 'ready')
})

test('background timeout/network failure preserves the draft-bearing data, exposes recovery and does not invent a successful read', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let mode = 'success'
  const store = createAdminCatalogStore((_client, _business, signal) => {
    if (mode === 'success') return Promise.resolve(catalog)
    if (mode === 'network') return Promise.reject(new TypeError('Network unavailable'))
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }))
  })
  await store.load({}, 'A:business', 'business')
  mode = 'timeout'; const pending = store.load({}, 'A:business', 'business')
  t.mock.timers.tick(15000); await pending
  assert.equal(store.getSnapshot().status, 'ready')
  assert.equal(store.getSnapshot().data, catalog)
  assert.equal(store.getSnapshot().refreshError, true)
  mode = 'network'; await store.load({}, 'A:business', 'business')
  assert.equal(store.getSnapshot().data, catalog)
  assert.equal(store.getSnapshot().refreshError, true)
  mode = 'success'; await store.load({}, 'A:business', 'business')
  assert.equal(store.getSnapshot().refreshError, false)
})

test('initial failure stays closed; owner switch clears cached data and late/cancelled reads never cross identities', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const failed = createAdminCatalogStore(async () => { throw new Error('Network') })
  await failed.load({}, 'A:business', 'business')
  assert.equal(failed.getSnapshot().status, 'error'); assert.equal(failed.getSnapshot().data, undefined)
  const reads = [], store = createAdminCatalogStore(() => { const d = deferred(); reads.push(d); return d.promise })
  const a = store.load({}, 'A:business', 'business')
  const b = store.load({}, 'B:other', 'other')
  assert.equal(store.getSnapshot().data, undefined)
  reads[0].resolve(catalog); await a
  assert.equal(store.getSnapshot().owner, 'B:other'); assert.equal(store.getSnapshot().data, undefined)
  store.cancel(); t.mock.timers.tick(180000)
  reads[1].resolve(catalog); await b
  assert.equal(store.getSnapshot().status, 'loading')
})

test('failed permission refresh retains same-owner display data but denies gates/writes; real membership revocation clears the tenant', async () => {
  const auth = { getClient: () => ({}), getSnapshot: () => ({ ...initialAuthState, initializing: false, epoch: 1, revision: 1, session: { user: { id: 'A' } } }), subscribe: () => () => {} }
  let mode = 'success'
  const authority = createAuthorityStore(auth, async () => {
    if (mode === 'network') throw new TypeError('Network')
    return mode === 'revoked' ? mapAuthority([], 'A') : owned()
  })
  await authority.reload(); mode = 'network'; await authority.reload()
  assert.equal(authority.getSnapshot().data.tenant.id, 'business')
  assert.equal(businessGate(authority.getSnapshot()), 'error')
  assert.equal(platformGate(authority.getSnapshot(), { currentLevel: 'aal2' }), 'error')
  await assert.rejects(() => createAdminActions(auth, authority).saveCategory('business', { name: 'Existing', slug: 'existing', displayOrder: '0', isActive: true }), /No pudimos comprobar tus permisos/)
  mode = 'revoked'; await authority.reload()
  assert.equal(authority.getSnapshot().data.tenant, null)
  assert.equal(businessGate(authority.getSnapshot()), 'forbidden')
  mode = 'success'; await authority.reload()
  assert.equal(businessGate(authority.getSnapshot()), 'allowed')
  authority.disconnect()
})
