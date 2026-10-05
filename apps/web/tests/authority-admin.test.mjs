import test from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { mapAuthority, isBusinessAdmin, readAuthority } from '../src/features/authority/authorityData.ts'
import { createAuthorityStore, businessGate, platformGate } from '../src/features/authority/authorityStore.ts'
import { AuthorityContext } from '../src/features/authority/authorityContext.ts'
import { BusinessAdminRequired } from '../src/features/authority/BusinessAdminRequired.tsx'
import { PlatformRequired } from '../src/features/authority/PlatformRequired.tsx'
import { readPlatformBusinesses } from '../src/features/authority/platformData.ts'
import { AuthContext } from '../src/features/auth/authContext.ts'
import { initialAuthState } from '../src/features/auth/sessionStore.ts'
import { CategoryForm, ItemForm } from '../src/features/admin/AdminForms.tsx'
import { parsePrice, priceInput, categoryPayload, itemPayload, imageExtension, assetPath, saveCategory, saveItem, uploadMenuImage } from '../src/features/admin/adminData.ts'
import { createAdminActions } from '../src/features/admin/adminActions.ts'

const businessId = 'a11a0000-0000-4000-8000-000000000001', assetId = 'c33c0000-0000-4000-8000-000000000003'
const member = (userId = 'A', slug = 'valhalla-space', active = true) => ({ user_id: userId, business_id: businessId, role: 'admin', businesses: { id: businessId, slug, name: 'Valhalla', is_active: active } })
const category = { id: assetId, businessId, name: 'Test', slug: 'test', displayOrder: 0, isActive: true }
const categoryRow = { id: assetId, business_id: businessId, name: 'Test', slug: 'test', display_order: 0, is_active: true }
const categoryDraft = { name: ' Test ', slug: 'test', displayOrder: '0', isActive: true }
const draft = { categoryId: assetId, name: ' Test ', description: '', price: '6500,50', imageAlt: '', imagePresentation: 'photo', isAvailable: true, isFeatured: false, isActive: true, displayOrder: '0' }
function authHarness(client = {}) {
  let snapshot = { ...initialAuthState, initializing: false, epoch: 1, revision: 1, session: { user: { id: 'A' } } }
  const listeners = new Set()
  return { getClient: () => client, getSnapshot: () => snapshot, subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    change(id) { snapshot = { ...snapshot, session: id ? { user: { id } } : null, epoch: snapshot.epoch + 1, revision: snapshot.revision + 1 }; for (const listener of listeners) listener() } }
}
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const json = data => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
const sdk = fetch => createClient('http://127.0.0.1:54321', 'public-unit-fixture', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch } })
test('authority maps only current self memberships; inactive tenant still owned; Platform boolean separate', () => {
  const authority = mapAuthority([member('A', 'valhalla-space', false)], 'A')
  assert.ok(isBusinessAdmin(authority, businessId)); assert.equal(authority.tenant.isActive, false)
  assert.equal(authority.platform.isAdmin, false)
  assert.equal(mapAuthority([member('A', 'other')], 'A').tenant, null)
  assert.throws(() => mapAuthority([member('B')], 'A'))
  assert.throws(() => mapAuthority([{ ...member(), role: 'customer' }], 'A'))
})
test('real SDK authority query explicitly self-filters and uses FK, not private REST or UUID constant', async () => {
  let seen, rpc
  const client = sdk(async (url, options) => {
    if (String(url).includes('/rpc/')) { rpc = { url: new URL(url), body: options.body }; return json(false) }
    seen = new URL(url); return json([member()])
  })
  assert.equal((await readAuthority(client, 'A')).tenant.id, businessId)
  assert.equal(seen.searchParams.get('user_id'), 'eq.A')
  assert.ok(seen.searchParams.get('select').includes('business_memberships_business_fkey'))
  assert.equal(seen.pathname, '/rest/v1/business_memberships')
  assert.equal(rpc.url.pathname, '/rest/v1/rpc/is_current_user_platform_admin')
  assert.equal(rpc.body, '{}')
  await client.auth.dispose()
})
test('authority store drops late A result after B, logout clears synchronously and errors fail closed', async () => {
  const auth = authHarness(), reads = []
  const store = createAuthorityStore(auth, (_client, id) => { const d = deferred(); reads.push({ id, ...d }); return d.promise })
  store.connect(); await delay(5)
  auth.change('B'); assert.equal(store.getSnapshot().data, null); await delay(5)
  for (const r of reads.filter(r => r.id === 'B')) r.resolve(mapAuthority([member('B')], 'B'))
  await delay(5)
  for (const r of reads.filter(r => r.id === 'A')) r.resolve(mapAuthority([member()], 'A'))
  await delay(5); assert.equal(store.getSnapshot().data.userId, 'B')
  auth.change(null); assert.equal(store.getSnapshot().data, null); store.disconnect()
  const broken = createAuthorityStore(authHarness(), async () => { throw new Error('sensitive SQL') })
  await broken.reload(); assert.equal(businessGate(broken.getSnapshot()), 'error'); assert.equal(broken.getSnapshot().data, null)
})
test('StrictMode disconnect/reconnect resumes authority read and same-session revocation is refetched', async () => {
  const auth = authHarness(); let allowed = true
  const store = createAuthorityStore(auth, async () => mapAuthority(allowed ? [member()] : [], 'A'))
  store.connect(); store.disconnect(); store.connect(); await delay(10)
  assert.equal(businessGate(store.getSnapshot()), 'allowed')
  auth.change('A') // TOKEN_REFRESHED/SIGNED_IN same owner must preserve drafts, pause writes.
  assert.equal(store.getSnapshot().data.userId, 'A'); assert.equal(store.getSnapshot().checking, true)
  await delay(10); assert.equal(store.getSnapshot().checking, false)
  allowed = false; await store.reload(); assert.equal(businessGate(store.getSnapshot()), 'forbidden')
  allowed = true; await store.reload(); assert.equal(businessGate(store.getSnapshot()), 'allowed'); store.disconnect()
})
test('ARS price preserves comma/dot cents and bounds; grouping/exponent/negative/rounding are not silently accepted', () => {
  assert.equal(parsePrice('6500.50'), 6500.5); assert.equal(parsePrice('6500,50'), 6500.5)
  assert.equal(priceInput(6500.5), '6500,50'); assert.equal(parsePrice('0,01'), 0.01)
  assert.equal(parsePrice('999999999999.99'), 999999999999.99)
  for (const value of ['6.500,50', '6.500', '-1', '1e3', 'NaN', '1000000000000', '1.001', '$6500', '']) assert.throws(() => parsePrice(value))
})
test('payloads whitelist editable fields, category ownership, slug/order limits; no IDs/timestamps/business UPDATE', () => {
  assert.deepEqual(Object.keys(categoryPayload({ ...categoryDraft, id: 'forged', business_id: 'forged' })), ['name', 'slug', 'display_order', 'is_active'])
  const payload = itemPayload({ ...draft, business_id: 'forged' }, null, [category])
  assert.equal(payload.price_amount, 6500.5); assert.ok(!('business_id' in payload)); assert.ok(!('id' in payload))
  assert.throws(() => itemPayload({ ...draft, categoryId: 'other' }, null, [category]))
  assert.throws(() => categoryPayload({ ...categoryDraft, slug: 'Bad--Slug' }))
  assert.throws(() => categoryPayload({ ...categoryDraft, displayOrder: '2147483648' }))
})
test('image type/size/path contract: inclusive 5 MiB, new UUID, no original name/metadata/overwrite', async () => {
  assert.equal(imageExtension({ name: 'Foto.JPEG', type: 'image/jpeg', size: 5242880 }), 'jpeg')
  for (const file of [{ name: 'x.svg', type: 'image/svg+xml', size: 1 }, { name: 'x.png', type: 'image/jpeg', size: 1 }, { name: 'x.png', type: 'image/png', size: 5242881 }]) assert.throws(() => imageExtension(file))
  assert.equal(assetPath(businessId, 'png', assetId), `${businessId}/${assetId}.png`)
  let request
  const client = sdk(async (url, options) => { request = { url, options }; return json({ Key: `menu-images/${new URL(url).pathname.split('/menu-images/')[1]}`, Id: assetId }) })
  const file = new File([new Uint8Array([1])], 'private-original-name.png', { type: 'image/png' })
  const asset = await uploadMenuImage(client, businessId, 'A', file)
  assert.ok(asset.path.startsWith(`${businessId}/`)); assert.ok(!asset.path.includes('original'))
  assert.equal(new Headers(request.options.headers).get('x-upsert'), 'false')
  assert.ok(!request.options.body.has('metadata'))
  await client.auth.dispose()
})
test('zero-row category/item writes are rejected, never reported successful', async () => {
  const client = sdk(async () => json([]))
  await assert.rejects(() => saveCategory(client, businessId, categoryDraft, assetId))
  await assert.rejects(() => saveItem(client, businessId, draft, [category], null, assetId))
  await client.auth.dispose()
})
test('partial upload + DB failure preserves receipt and retry makes no second upload or DELETE', async () => {
  let uploads = 0, patchFails = true, deletes = 0
  const client = sdk(async (url, options) => {
    if (options.method === 'DELETE') deletes++
    if (String(url).includes('/storage/')) { uploads++; return json({ Key: 'menu-images/' + new URL(url).pathname.split('/menu-images/')[1], Id: assetId }) }
    if (options.method === 'PATCH') return patchFails ? json([]) : json({ ...itemPayload(draft, null, [category]), id: assetId, business_id: businessId })
    return json(String(url).includes('menu_categories') ? [categoryRow] : [])
  })
  const auth = authHarness(client), authority = { reload: async () => mapAuthority([member()], 'A') }
  const actions = createAdminActions(auth, authority), file = new File([new Uint8Array([1])], 'x.png', { type: 'image/png' })
  let receipt
  await assert.rejects(() => actions.saveItem(businessId, draft, { id: assetId, file }), error => { receipt = error.asset; return error.kind === 'image-save' && !!receipt })
  assert.equal(uploads, 1); patchFails = false
  await actions.saveItem(businessId, draft, { id: assetId, file, uploadedAsset: receipt })
  assert.equal(uploads, 1); assert.equal(deletes, 0)
  await client.auth.dispose()
})
test('revoked/inactive authority prevents starting a write or upload', async () => {
  const auth = authHarness({}), authority = { reload: async () => mapAuthority([], 'A') }
  await assert.rejects(() => createAdminActions(auth, authority).saveCategory(businessId, categoryDraft))
  authority.reload = async () => mapAuthority([member('A', 'valhalla-space', false)], 'A')
  await assert.rejects(() => createAdminActions(auth, authority).saveItem(businessId, draft))
})
function markup(element, state, assurance = null) {
  return renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(AuthContext.Provider,
    { value: { ...initialAuthState, initializing: false, assurance, session: { user: { id: 'A' } }, store: {} } },
    React.createElement(AuthorityContext.Provider, { value: { ...state, store: {} } }, element))))
}
test('guard + forms SSR: forbidden hides tools, labels/inputMode/disabled/no tenant editor', () => {
  const guarded = React.createElement(BusinessAdminRequired, null, React.createElement('span', null, 'admin-only'))
  assert.ok(!markup(guarded, { status: 'ready', data: mapAuthority([], 'A') }).includes('admin-only'))
  assert.ok(markup(guarded, { status: 'ready', data: mapAuthority([member()], 'A') }).includes('admin-only'))
  const form = markup(React.createElement(ItemForm, { categories: [category], disabled: true }), { data: mapAuthority([member()], 'A') })
  assert.ok(form.includes('fieldset disabled')); assert.ok(form.includes('inputMode="decimal"')); assert.ok(form.includes('for="item-image"'))
  assert.ok(!form.includes('id="business_id"')); assert.ok(!form.includes('Eliminar'))
  assert.ok(markup(React.createElement(CategoryForm, { disabled: true }), { data: mapAuthority([member()], 'A') }).includes('category-slug'))
})
test('Platform guard false ignores AAL2; true AAL1 requires MFA; true AAL2 read-only; errors/checking fail closed', () => {
  const state = { status: 'ready', checking: false, data: mapAuthority([], 'A', 'valhalla-space', false) }
  const aal1 = { currentLevel: 'aal1', nextLevel: 'aal1' }, aal2 = { currentLevel: 'aal2', nextLevel: 'aal2' }
  assert.equal(platformGate(state,aal2),'forbidden')
  state.data = mapAuthority([], 'A', 'valhalla-space', true)
  assert.equal(platformGate(state,aal1),'mfa'); assert.equal(platformGate(state,aal2),'allowed')
  assert.equal(platformGate(state,null),'error'); assert.equal(platformGate({ ...state, checking:true },aal2),'loading')
  assert.equal(platformGate({ ...state, status:'error' },aal2),'error')
  const element = React.createElement(PlatformRequired,null,React.createElement('span',null,'platform-only'))
  const mfa = markup(element,state,aal1)
  assert.ok(mfa.includes('Se requiere verificación en dos pasos')); assert.ok(mfa.includes('/auth/mfa?continue=platform'))
  assert.ok(!mfa.includes('platform-only')); assert.ok(markup(element,state,aal2).includes('platform-only'))
})
test('Platform data discards a global read when capability revoked or identity changed mid-request', async () => {
  let capabilityReads = 0, businessReads = 0, switchAccount
  const client = sdk(async url => {
    if (String(url).includes('/rpc/')) return json(++capabilityReads === 1)
    businessReads++; switchAccount?.(); return json([{ id:businessId, slug:'hidden', name:'Sensitive global fixture', is_active:false }])
  })
  client.auth.mfa.getAuthenticatorAssuranceLevel = async () => ({ data:{ currentLevel:'aal2', nextLevel:'aal2' },error:null })
  const auth = authHarness(client)
  await assert.rejects(() => readPlatformBusinesses(auth), /comprobar tu acceso/)
  assert.equal(businessReads,1); assert.equal(capabilityReads,2)
  capabilityReads = 0; switchAccount = () => auth.change('B')
  await assert.rejects(() => readPlatformBusinesses(auth), /comprobar tu acceso/)
  capabilityReads = 0; businessReads = 0
  client.auth.mfa.getAuthenticatorAssuranceLevel = async () => ({ data:{currentLevel:'aal1'},error:null })
  await assert.rejects(() => readPlatformBusinesses(auth)); assert.equal(businessReads,0)
  await client.auth.dispose()
})
test('Platform authority refetch removes and restores capability, hides content during same-user refresh', async () => {
  const auth = authHarness(); let allowed = true
  const store = createAuthorityStore(auth, async () => mapAuthority([], 'A', 'valhalla-space',allowed))
  await store.reload(); const aal2 = { currentLevel:'aal2',nextLevel:'aal2' }
  assert.equal(platformGate(store.getSnapshot(),aal2),'allowed')
  allowed = false; const pending = store.reload()
  assert.equal(platformGate(store.getSnapshot(),aal2),'loading'); await pending
  assert.equal(platformGate(store.getSnapshot(),aal2),'forbidden')
  allowed = true; await store.reload(); assert.equal(platformGate(store.getSnapshot(),aal2),'allowed')
  store.disconnect()
})
