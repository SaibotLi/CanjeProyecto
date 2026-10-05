// LOCAL only. Actual SDK/application actions/store with GoTrue/PostgREST/Storage.
// No browser automation or visual claim. Privileged SQL only fixture/setup/revocation/cleanup.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import { createClient } from '@supabase/supabase-js'
import { localRuntime, localSql } from '../../../supabase/scripts/local-runtime.mjs'
import { confirmationLink, cleanupFixtureMail } from '../../../supabase/scripts/auth-mail-runtime.mjs'
import { png, storageFixtures } from '../../../supabase/scripts/storage-test-runtime.mjs'
import { totp } from '../../../supabase/scripts/auth-test-runtime.mjs'
import { signUp, verifyTotp, readProfile, updateDisplayName } from '../src/features/auth/authData.ts'
import { createAuthStore } from '../src/features/auth/sessionStore.ts'
import { createAuthorityStore, businessGate, platformGate } from '../src/features/authority/authorityStore.ts'
import { readAuthority } from '../src/features/authority/authorityData.ts'
import { readPlatformBusinesses } from '../src/features/authority/platformData.ts'
import { readAdminCatalog, saveCategory, saveItem } from '../src/features/admin/adminData.ts'
import { createAdminActions } from '../src/features/admin/adminActions.ts'
import { readPublicMenu } from '../src/features/menu/publicMenu.ts'

async function eventually(check) { for (let i = 0; i < 300; i++) { if (check()) return; await delay(10) } throw new Error('Application state did not settle; details hidden') }
test('Task 2F LOCAL business authority, catalog and upload application contracts', async t => {
  const runtime = localRuntime(), fingerprint = readFileSync(new URL('../../../supabase/scripts/seed-fingerprint.sql', import.meta.url), 'utf8')
  assert.equal(localSql(fingerprint), '5bc80b32792095fb6cf02694de9626a1', 'Preserve non-fixture edits; no reset')
  assert.equal(localSql('select (select count(*) from auth.users)+(select count(*) from storage.objects);'), '0', 'Exclusive fixtures only; preserve human accounts/objects')
  const business = localSql("select id from public.businesses where slug='valhalla-space';"), other = randomUUID()
  const accounts = [], categoryIds = new Set(), itemIds = new Set(), paths = new Set(), fixtures = storageFixtures()
  let revokePatch, revokeUpload, uploadCount = 0
  const ownMembership = (id, tenant = business, grant = true) => localSql(grant
    ? `insert into public.business_memberships(user_id,business_id,role) values('${id}','${tenant}','admin') on conflict do nothing;`
    : `delete from public.business_memberships where user_id='${id}' and business_id='${tenant}';`)
  const account = async () => {
    const email = `task2f-${randomUUID()}@example.test`, password = `${randomUUID()}!Aa9`
    const client = createClient(runtime.url, runtime.publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: async (url, options) => {
      const path = new URL(url).pathname
      if (options?.method === 'POST' && path.startsWith('/storage/v1/object/menu-images/')) {
        paths.add(decodeURIComponent(path.slice('/storage/v1/object/menu-images/'.length))); uploadCount++
        if (revokeUpload) { const id = revokeUpload; revokeUpload = null; ownMembership(id, business, false) }
      }
      if (options?.method === 'PATCH' && path === '/rest/v1/menu_items' && revokePatch) {
        const id = revokePatch; revokePatch = null; ownMembership(id, business, false)
      }
      return fetch(url, options)
    } } })
    const result = { email, password, client }; accounts.push(result)
    const signup = await signUp(client, email, password, 'http://127.0.0.1:5173')
    assert.ok(!signup.error, 'Real signup'); assert.equal(signup.data.session, null)
    const link = await confirmationLink(email, 'signup')
    assert.ok(!(await client.auth.verifyOtp({ token_hash: link.searchParams.get('token'), type: 'signup' })).error)
    result.id = (await client.auth.getUser()).data.user.id
    // 2H: confirmation is not a substitute for the actual password-login journey.
    assert.ok(!(await client.auth.signOut({ scope: 'local' })).error)
    assert.ok(!(await client.auth.signInWithPassword({ email, password })).error)
    result.auth = createAuthStore(client); result.auth.connect()
    await eventually(() => !result.auth.getSnapshot().initializing && result.auth.getSnapshot().profile?.id === result.id)
    result.authority = createAuthorityStore(result.auth); result.authority.connect()
    await eventually(() => result.authority.getSnapshot().status === 'ready')
    result.actions = createAdminActions(result.auth, result.authority)
    return result
  }
  const categoryDraft = name => ({ name, slug: `task2f-${randomUUID()}`, displayOrder: '2', isActive: true })
  const itemDraft = categoryId => ({ categoryId, name: 'Task 2F bebida ficticia', description: 'DEV fixture', price: '6500,50', imageAlt: 'Imagen ficticia de prueba', imagePresentation: 'photo', isAvailable: true, isFeatured: false, isActive: true, displayOrder: '3' })
  const createCategory = async (actor, tenant = business) => { const draft = categoryDraft('Task 2F categoría ficticia'); const row = await actor.actions.saveCategory(tenant, draft); categoryIds.add(row.id); return { row, draft } }
  const token = actor => actor.auth.getSnapshot().session.access_token
  const file = () => new File([png], 'fixture.png', { type: 'image/png' })
  let adminA, adminB, both, customer, platform, categoryA, categoryB, item, draft
  try {
    localSql(`insert into public.businesses(id,slug,name,timezone) values('${other}','task2f-${other}','Task 2F tenant B','America/Argentina/Buenos_Aires'); insert into public.loyalty_settings(business_id) values('${other}');`)
    adminA = await account(); adminB = await account(); both = await account(); customer = await account(); platform = await account()
    ownMembership(adminA.id); ownMembership(adminB.id, other); ownMembership(both.id); ownMembership(both.id, other)
    for (const actor of accounts) await actor.authority.reload()
    await t.test('customer forbidden; Admin A/B/Both membership resolution; tenant UUID from DB', async () => {
      assert.equal(businessGate(customer.authority.getSnapshot()), 'forbidden')
      assert.equal(businessGate(adminA.authority.getSnapshot()), 'allowed')
      assert.equal(businessGate(adminB.authority.getSnapshot()), 'forbidden')
      assert.equal(businessGate(both.authority.getSnapshot()), 'allowed')
      assert.equal(both.authority.getSnapshot().data.adminBusinesses.length, 2)
      assert.equal(adminA.authority.getSnapshot().data.tenant.id, business)
      await assert.rejects(() => customer.actions.saveCategory(business, categoryDraft('Denied')))
    })
    await t.test('2H customer login/profile → known-ID API attack → identical anon Carta; DB profile boundary', async () => {
      const anon = createClient(runtime.url, runtime.publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
      try {
        assert.deepEqual(await readPublicMenu(customer.client), await readPublicMenu(anon))
        await updateDisplayName(customer.client, customer.id, 'x'.repeat(80))
        assert.equal((await readProfile(customer.client, customer.id)).displayName.length, 80)
        await assert.rejects(() => updateDisplayName(customer.client, customer.id, 'x'.repeat(81)))
        const bypass = await customer.client.from('profiles').update({ display_name: 'x'.repeat(81) }).eq('id', customer.id).select('id').single()
        assert.equal(bypass.error?.code, '23514')
        assert.equal((await readProfile(customer.client, customer.id)).displayName.length, 80)
        const published = await readPublicMenu(anon), knownId = published.data.items[0].id
        const attempted = await customer.client.from('menu_items').update({ name: '2H denied attack' }).eq('id', knownId).select('id')
        assert.ok(attempted.error || attempted.data?.length === 0)
        assert.deepEqual(await readPublicMenu(anon), published, 'Persisted public state unchanged, not HTTP-only assertion')
        await assert.rejects(() => readProfile(customer.client, adminA.id))
        assert.equal(platformGate(customer.authority.getSnapshot(), customer.auth.getSnapshot().assurance), 'forbidden')
      } finally { await anon.auth.dispose() }
    })
    await t.test('real category INSERT/UPDATE, drafts listed by admin and hidden publicly', async () => {
      categoryA = await createCategory(adminA); categoryB = await createCategory(adminB, other)
      const updated = await adminA.actions.saveCategory(business, { ...categoryA.draft, name: 'Task 2F editada', displayOrder: '8', isActive: false }, categoryA.row.id)
      assert.equal(updated.isActive, false); assert.equal(updated.displayOrder, 8)
      assert.ok((await readAdminCatalog(adminA.client, business)).categories.some(c => c.id === updated.id))
      assert.ok(!(await readPublicMenu(adminA.client)).data.categories.some(c => c.id === updated.id))
      await adminA.actions.saveCategory(business, categoryA.draft, categoryA.row.id)
    })
    await t.test('real item INSERT/UPDATE preserves cents/flags/category, public publication stays explicit', async () => {
      draft = itemDraft(categoryA.row.id)
      item = await adminA.actions.saveItem(business, draft); itemIds.add(item.id)
      assert.equal(item.price, 6500.5)
      item = await adminA.actions.saveItem(business, { ...draft, price: '6500.50', isAvailable: false, isFeatured: true }, { id: item.id })
      assert.equal(item.isAvailable, false); assert.equal(item.isFeatured, true)
      assert.ok((await readPublicMenu(adminA.client)).data.items.some(i => i.id === item.id && !i.isAvailable))
      item = await adminA.actions.saveItem(business, { ...draft, isActive: false }, { id: item.id })
      assert.ok(!(await readPublicMenu(adminA.client)).data.items.some(i => i.id === item.id))
      assert.ok((await readAdminCatalog(adminA.client, business)).items.some(i => i.id === item.id))
      item = await adminA.actions.saveItem(business, draft, { id: item.id })
    })
    await t.test('2H valid same-tenant category change is visible to anon, hidden draft never leaks', async () => {
      const second = await createCategory(adminA)
      item = await adminA.actions.saveItem(business, { ...draft, categoryId: second.row.id, description: '2H descripción publicada' }, { id: item.id })
      const anon = createClient(runtime.url, runtime.publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
      try {
        const visible = (await readPublicMenu(anon)).data.items.find(i => i.id === item.id)
        assert.equal(visible.categoryId, second.row.id); assert.equal(visible.description, '2H descripción publicada')
        await adminA.actions.saveCategory(business, { ...second.draft, isActive: false }, second.row.id)
        assert.ok(!(await readPublicMenu(anon)).data.items.some(i => i.id === item.id))
        assert.ok((await readAdminCatalog(adminA.client, business)).items.some(i => i.id === item.id))
      } finally { await anon.auth.dispose() }
      item = await adminA.actions.saveItem(business, draft, { id: item.id })
    })
    await t.test('Admin Both tenants independent; other tenant writes and cross-category FK denied', async () => {
      const b = await createCategory(both, other); assert.equal(b.row.businessId, other)
      await assert.rejects(() => adminA.actions.saveCategory(other, categoryDraft('Denied')))
      await assert.rejects(() => saveCategory(adminA.client, other, categoryDraft('RLS denied')))
      const catalog = await readAdminCatalog(both.client, other)
      await assert.rejects(() => saveItem(both.client, business, itemDraft(categoryB.row.id), catalog.categories, null, item.id))
      assert.equal((await readAdminCatalog(adminA.client, business)).items.find(i => i.id === item.id).categoryId, categoryA.row.id)
    })
    await t.test('2H Business Admin AAL2 stays tenant-only; MFA never grants Platform or global reads', async () => {
      const factor = await adminA.client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Task 2H Business fixture' })
      assert.ok(!factor.error)
      await verifyTotp(adminA.client, factor.data.id, totp(factor.data.totp.secret))
      await adminA.auth.reload()
      await eventually(() => adminA.auth.getSnapshot().assurance?.currentLevel === 'aal2')
      await adminA.authority.reload()
      assert.equal(businessGate(adminA.authority.getSnapshot()), 'allowed')
      assert.equal(platformGate(adminA.authority.getSnapshot(), adminA.auth.getSnapshot().assurance), 'forbidden')
      assert.equal((await adminA.client.rpc('is_current_user_platform_admin')).data, false)
      assert.deepEqual((await adminA.client.from('profiles').select('id')).data, [{ id: adminA.id }])
      await assert.rejects(() => readProfile(adminA.client, adminB.id))
      await assert.rejects(() => adminA.actions.saveCategory(other, categoryDraft('AAL2 denied')))
      await assert.rejects(() => readPlatformBusinesses(adminA.auth))
      await adminA.actions.saveCategory(business, categoryA.draft, categoryA.row.id)
    })
    await t.test('inactive business own READ continues; writes/upload blocked; Both still writes B', async () => {
      const sameToken = token(adminA)
      localSql(`update public.businesses set is_active=false where id='${business}';`)
      await adminA.authority.reload(); assert.equal(adminA.authority.getSnapshot().data.tenant.isActive, false)
      assert.ok((await readAdminCatalog(adminA.client, business)).items.length)
      await assert.rejects(() => adminA.actions.saveCategory(business, categoryA.draft, categoryA.row.id))
      await assert.rejects(() => saveCategory(adminA.client, business, categoryA.draft, categoryA.row.id))
      await assert.rejects(() => saveItem(adminA.client, business, draft, [categoryA.row], null, item.id))
      const uploadsBefore = uploadCount
      await assert.rejects(() => adminA.actions.saveItem(business, draft, { id: item.id, file: file() }))
      assert.equal(uploadCount, uploadsBefore)
      await createCategory(both, other); assert.equal(token(adminA), sameToken)
      localSql(`update public.businesses set is_active=true where id='${business}';`); await adminA.authority.reload()
    })
    await t.test('membership revoked/re-added with SAME JWT removes/restores application guard; zero-row write fails', async () => {
      const sameToken = token(adminA)
      ownMembership(adminA.id, business, false); await adminA.authority.reload()
      assert.equal(businessGate(adminA.authority.getSnapshot()), 'forbidden')
      await assert.rejects(() => adminA.actions.saveCategory(business, categoryA.draft, categoryA.row.id))
      await assert.rejects(() => saveCategory(adminA.client, business, categoryA.draft, categoryA.row.id))
      ownMembership(adminA.id); await adminA.authority.reload()
      assert.equal(businessGate(adminA.authority.getSnapshot()), 'allowed'); assert.equal(token(adminA), sameToken)
    })
    await t.test('real File upload → item PATCH → Carta URL/bytes; replacement retains old orphan', async () => {
      item = await adminA.actions.saveItem(business, draft, { id: item.id, file: file() })
      const oldPath = item.imagePath
      assert.match(oldPath, new RegExp(`^${business}/[0-9a-f-]{36}\\.png$`))
      const publicItem = (await readPublicMenu(customer.client)).data.items.find(i => i.id === item.id)
      assert.ok(publicItem.imageUrl.includes(oldPath))
      const bytes = await fetch(publicItem.imageUrl); assert.equal(bytes.status, 200); assert.deepEqual(Buffer.from(await bytes.arrayBuffer()), png)
      item = await adminA.actions.saveItem(business, draft, { id: item.id, existingPath: oldPath, file: file() })
      assert.notEqual(item.imagePath, oldPath)
      assert.equal((await fetch(`${runtime.url}/storage/v1/object/public/menu-images/${oldPath}`)).status, 200)
      assert.equal((await adminA.client.storage.from('menu-images').list(business)).data.length, 2)
    })
    await t.test('revocation AFTER upload before PATCH yields actual RLS error + retained receipt; retry same JWT no second upload', async () => {
      const before = uploadCount, sameToken = token(adminA); let receipt
      revokePatch = adminA.id
      await assert.rejects(() => adminA.actions.saveItem(business, draft, { id: item.id, existingPath: item.imagePath, file: file() }), error => { receipt = error.asset; return error.kind === 'image-save' && !!receipt })
      assert.equal(uploadCount, before + 1); assert.equal(businessGate(adminA.authority.getSnapshot()), 'forbidden')
      assert.equal((await fetch(`${runtime.url}/storage/v1/object/public/menu-images/${receipt.path}`)).status, 200)
      ownMembership(adminA.id); await adminA.authority.reload()
      item = await adminA.actions.saveItem(business, draft, { id: item.id, uploadedAsset: receipt, existingPath: item.imagePath })
      assert.equal(item.imagePath, receipt.path); assert.equal(uploadCount, before + 1); assert.equal(token(adminA), sameToken)
    })
    await t.test('revocation before actual Storage request rejects upload and leaves product untouched', async () => {
      const originalPath = item.imagePath; revokeUpload = adminA.id
      await assert.rejects(() => adminA.actions.saveItem(business, draft, { id: item.id, existingPath: originalPath, file: file() }), error => error.kind === 'upload')
      ownMembership(adminA.id); await adminA.authority.reload()
      assert.equal((await readAdminCatalog(adminA.client, business)).items.find(i => i.id === item.id).imagePath, originalPath)
    })
    await t.test('Platform self RPC, MFA guard and minimal read-only global view; same-JWT revoke/restore', async () => {
      localSql(`insert into private.platform_admins(user_id) values('${platform.id}');`)
      await platform.authority.reload()
      assert.equal(platform.authority.getSnapshot().data.platform.isAdmin,true)
      assert.equal(platformGate(platform.authority.getSnapshot(),platform.auth.getSnapshot().assurance),'mfa')
      assert.equal(platformGate(customer.authority.getSnapshot(),{currentLevel:'aal2',nextLevel:'aal2'}),'forbidden')
      await assert.rejects(() => readPlatformBusinesses(platform.auth))
      assert.equal((await platform.client.from('profiles').select('id')).data.length, 1)
      for (const actor of [platform, customer]) {
        const factor = await actor.client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Task 2F fixture' })
        assert.ok(!factor.error); await verifyTotp(actor.client, factor.data.id, totp(factor.data.totp.secret))
        await actor.auth.reload()
        await eventually(() => actor.auth.getSnapshot().assurance?.currentLevel === 'aal2')
        await actor.authority.reload()
      }
      assert.equal((await customer.client.from('profiles').select('id')).data.length, 1)
      assert.equal(businessGate(customer.authority.getSnapshot()), 'forbidden')
      assert.ok((await platform.client.from('profiles').select('id')).data.length > 1)
      const authority = await readAuthority(platform.client, platform.id)
      assert.equal(authority.adminBusinesses.length, 0); assert.equal(authority.platform.isAdmin, true)
      assert.equal(platformGate(platform.authority.getSnapshot(),platform.auth.getSnapshot().assurance),'allowed')
      assert.equal(platformGate(customer.authority.getSnapshot(),customer.auth.getSnapshot().assurance),'forbidden')
      assert.equal((await readPlatformBusinesses(platform.auth)).length,2)
      ownMembership(platform.id); await platform.authority.reload(); assert.equal(businessGate(platform.authority.getSnapshot()), 'allowed')
      const sameToken = token(platform)
      localSql(`delete from private.platform_admins where user_id='${platform.id}';`)
      assert.equal((await platform.client.from('profiles').select('id')).data.length, 1)
      await platform.authority.reload(); assert.equal(businessGate(platform.authority.getSnapshot()), 'allowed'); assert.equal(token(platform), sameToken)
      assert.equal(platformGate(platform.authority.getSnapshot(),platform.auth.getSnapshot().assurance),'forbidden')
      await assert.rejects(() => readPlatformBusinesses(platform.auth))
      localSql(`insert into private.platform_admins(user_id) values('${platform.id}');`)
      await platform.authority.reload()
      assert.equal(platformGate(platform.authority.getSnapshot(),platform.auth.getSnapshot().assurance),'allowed')
      assert.equal((await readPlatformBusinesses(platform.auth)).length,2); assert.equal(token(platform),sameToken)
    })
    await t.test('official logout → B login clears A authority before resolving B, no admin Valhalla for B', async () => {
      await adminA.auth.signOut(); assert.equal(adminA.authority.getSnapshot().data, null)
      assert.ok(!(await adminA.client.auth.signInWithPassword({ email: adminB.email, password: adminB.password })).error)
      await eventually(() => adminA.auth.getSnapshot().profile?.id === adminB.id)
      await adminA.authority.reload()
      assert.equal(adminA.authority.getSnapshot().data.userId, adminB.id); assert.equal(businessGate(adminA.authority.getSnapshot()), 'forbidden')
      assert.equal(adminA.authority.getSnapshot().data.adminBusinesses[0].id, other)
    })
  } finally {
    for (const actor of accounts) { actor.authority?.disconnect(); actor.auth?.disconnect(); await actor.client.auth.dispose() }
    localSql(`update public.businesses set is_active=true where id='${business}';`)
    for (const id of itemIds) localSql(`delete from public.menu_items where id='${id}' and business_id in ('${business}','${other}');`)
    for (const id of categoryIds) localSql(`delete from public.menu_categories where id='${id}' and business_id in ('${business}','${other}');`)
    await fixtures.removeObjects('menu-images', [...paths])
    for (const actor of accounts) { assert.match(actor.email, /^task2f-[0-9a-f-]{36}@example\.test$/); localSql(`delete from auth.users where email='${actor.email}';`) }
    localSql(`delete from public.loyalty_settings where business_id='${other}'; delete from public.businesses where id='${other}' and slug='task2f-${other}';`)
    await cleanupFixtureMail()
    assert.equal(localSql(fingerprint), '5bc80b32792095fb6cf02694de9626a1')
    assert.equal(localSql('select (select count(*) from auth.users)+(select count(*) from storage.objects);'), '0')
  }
})
