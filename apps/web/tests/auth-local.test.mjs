// SDK + actual application data/store over GoTrue/PostgREST/Mailpit LOCAL.
// SDK window adapter models URL handling; it is not visual/browser evidence.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { localRuntime, localSql } from '../../../supabase/scripts/local-runtime.mjs'
import { confirmationLink, followAuthLink, cleanupFixtureMail } from '../../../supabase/scripts/auth-mail-runtime.mjs'
import { totp } from '../../../supabase/scripts/auth-test-runtime.mjs'
import { browserAuthOptions } from '../src/lib/supabase.ts'
import { createAuthStore, needsMfa } from '../src/features/auth/sessionStore.ts'
import { readProfile, updateDisplayName, signUp, requestRecovery, verifyTotp } from '../src/features/auth/authData.ts'
import { readPublicMenu } from '../src/features/menu/publicMenu.ts'
import { memoryStorage, sdkWindow } from './auth-browser-fixture.mjs'

const origin = 'http://127.0.0.1:5173'
const fingerprintSQL = readFileSync(new URL('../../../supabase/scripts/seed-fingerprint.sql', import.meta.url), 'utf8')
async function eventually(check) {
  for (let i = 0; i < 200; i++) { if (check()) return; await delay(10) }
  throw new Error('Expected application state did not settle; details hidden')
}
test('LOCAL Auth frontend lifecycle, profiles, links and MFA/RLS', async t => {
  const runtime = localRuntime()
  assert.equal(localSql('select count(*) from auth.users;'), '0', 'Exclusive LOCAL fixtures only')
  assert.equal(localSql(fingerprintSQL), '5bc80b32792095fb6cf02694de9626a1')
  const emails = [], clients = [], stores = []
  let adapter
  const make = (storage = memoryStorage(), storageKey = `task2e-${randomUUID()}`) => {
    const c = createClient(runtime.url, runtime.publishableKey, { auth: { ...browserAuthOptions, storage, storageKey } })
    clients.push(c); return c
  }
  const attach = client => { const store = createAuthStore(client); stores.push(store); store.connect(); return store }
  const account = async (confirm = true) => {
    const email = `task2e-${randomUUID()}@example.test`, password = `${randomUUID()}!Aa9`
    emails.push(email)
    const client = make()
    const r = await signUp(client, email, password, origin)
    assert.ok(!r.error, 'Signup accepted')
    assert.equal(r.data.session, null, 'No session before confirmation')
    assert.ok(r.data.user?.id)
    assert.equal(localSql(`select count(*) from public.profiles where id='${r.data.user.id}' and display_name is null;`), '1')
    const link = await confirmationLink(email, 'signup')
    if (confirm) {
      const response = await client.auth.verifyOtp({ token_hash: link.searchParams.get('token'), type: 'signup' })
      assert.ok(!response.error, 'Real GoTrue email verification')
    }
    return { client, email, password, id: r.data.user.id, link }
  }
  let a, b, store, app, storage, storageKey, menuBaseline
  try {
    await t.test('confirmation required; signup metadata empty; trigger creates minimal profile', async () => {
      a = await account(); b = await account()
      const unconfirmed = await account(false)
      const attempt = await unconfirmed.client.auth.signInWithPassword({ email: unconfirmed.email, password: unconfirmed.password })
      assert.equal(attempt.error?.code, 'email_not_confirmed')
      const metadata = localSql(`select raw_user_meta_data ?| array['role','business_id','platform_admin','display_name'] from auth.users where id='${a.id}';`)
      assert.equal(metadata, 'f')
      assert.equal(localSql('select (select count(*) from public.business_memberships)+(select count(*) from private.platform_admins);'), '0')
      const bad = await a.client.auth.signInWithPassword({ email: a.email, password: 'wrong-synthetic-password' })
      assert.equal(bad.error?.code, 'invalid_credentials')
    })
    await t.test('2H invalid email and short password rejected by real Auth without identities', async () => {
      const before = localSql('select count(*) from auth.users;')
      const client = make(), email = `task2e-${randomUUID()}@example.test`
      emails.push(email)
      assert.ok((await signUp(client, 'invalid-email', `${randomUUID()}!Aa9`, origin)).error)
      assert.ok((await signUp(client, email, 'x', origin)).error)
      assert.equal(localSql('select count(*) from auth.users;'), before)
    })
    await t.test('login + own profile update through current app store; public menu baseline', async () => {
      storage = memoryStorage(); storageKey = `task2e-${randomUUID()}`
      app = make(storage, storageKey); store = attach(app)
      await eventually(() => !store.getSnapshot().initializing)
      const login = await app.auth.signInWithPassword({ email: a.email, password: a.password })
      assert.ok(!login.error)
      await eventually(() => store.getSnapshot().profile?.id === a.id)
      await updateDisplayName(app, a.id, 'Customer A')
      await store.reload()
      assert.equal(store.getSnapshot().profile.displayName, 'Customer A')
      await assert.rejects(() => readProfile(app, b.id))
      menuBaseline = await readPublicMenu(app)
      assert.equal(menuBaseline.kind, 'ready')
    })
    await t.test('SDK persistence across client recreation/reload + refresh event', async () => {
      store.disconnect(); await app.auth.dispose()
      app = make(storage, storageKey); store = attach(app)
      await eventually(() => !store.getSnapshot().initializing && store.getSnapshot().profile?.id === a.id)
      assert.equal(store.getSnapshot().profile.displayName, 'Customer A')
      const previousRevision = store.getSnapshot().revision
      const r = await app.auth.refreshSession()
      assert.ok(!r.error, 'Real refresh token exchange')
      await eventually(() => store.getSnapshot().revision > previousRevision)
      assert.equal(store.getSnapshot().session.user.id, a.id)
      assert.deepEqual(await readPublicMenu(app), menuBaseline)
    })
    await t.test('logout → B login never commits A profile; Carta unchanged', async () => {
      await store.signOut()
      assert.equal(store.getSnapshot().session, null); assert.equal(store.getSnapshot().profile, null)
      assert.equal((await app.auth.getSession()).data.session, null)
      assert.deepEqual(await readPublicMenu(app), menuBaseline)
      const states = [], unsubscribe = store.subscribe(() => states.push(store.getSnapshot()))
      const r = await app.auth.signInWithPassword({ email: b.email, password: b.password })
      assert.ok(!r.error)
      await eventually(() => store.getSnapshot().profile?.id === b.id)
      assert.ok(states.every(s => !s.profile || s.profile.id === b.id))
      unsubscribe(); assert.deepEqual(await readPublicMenu(app), menuBaseline)
    })
    await t.test('recovery SDK event + app password change; old password rejected / new login accepted', async () => {
      const requested = await requestRecovery(a.client, a.email, origin)
      assert.ok(!requested.error)
      const link = await confirmationLink(a.email, 'recovery')
      const redirected = await followAuthLink(link)
      adapter = sdkWindow(redirected.href)
      const recovering = make(); const recoveryStore = attach(recovering)
      await eventually(() => !recoveryStore.getSnapshot().initializing && recoveryStore.getSnapshot().recovery)
      assert.equal(adapter.location.href, `${origin}/auth/recovery`, 'Final clean URL')
      const password = `${randomUUID()}!Bb8`
      const changed = await recovering.auth.updateUser({ password })
      assert.ok(!changed.error)
      assert.equal(recoveryStore.getSnapshot().session.user.id, a.id)
      const old = await make().auth.signInWithPassword({ email: a.email, password: a.password })
      assert.equal(old.error?.code, 'invalid_credentials')
      const fresh = await make().auth.signInWithPassword({ email: a.email, password })
      assert.ok(!fresh.error)
      recoveryStore.finishRecovery(); assert.equal(recoveryStore.getSnapshot().recovery, false)
      recoveryStore.disconnect(); adapter.close(); adapter = null
      const reused = await followAuthLink(link)
      assert.equal(reused.searchParams.get('error_code') || new URLSearchParams(reused.hash.slice(1)).get('error_code'), 'otp_expired')
    })
    await t.test('expired/used confirmation + malformed callback + direct recovery do not reuse prior login', async () => {
      const expired = await account(false)
      // Fixture-only expiry clock in the existing Auth user row; no schema/policy change.
      localSql(`update auth.users set confirmation_sent_at=now()-interval '2 days' where id='${expired.id}';`)
      const target = await followAuthLink(expired.link)
      assert.ok(target.hash.includes('otp_expired') || target.searchParams.get('error_code') === 'otp_expired')
      const used = await followAuthLink(a.link)
      assert.ok(used.hash.includes('otp_expired') || used.searchParams.get('error_code') === 'otp_expired')
      for (const path of ['/auth/callback#malformed', '/auth/recovery', '/auth/recovery#error=access_denied&error_code=otp_expired']) {
        adapter = sdkWindow(`${origin}${path}`)
        // Restore the previously logged-in B storage, not just an anonymous case.
        const c = make(storage, storageKey), s = attach(c)
        await eventually(() => !s.getSnapshot().initializing)
        assert.equal(s.getSnapshot().recovery, false)
        assert.equal(s.getSnapshot().callbackAccepted, false)
        assert.equal(s.getSnapshot().session?.user.id, b.id, 'Valid prior session cannot authorize recovery/callback')
        assert.equal(adapter.location.hash, '')
        s.disconnect(); adapter.close(); adapter = null
      }
    })
    await t.test('unverified enrollment cancellation; customer verified TOTP gives AAL2, never platform authority', async () => {
      const pending = await app.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Task 2E pending' })
      assert.ok(!pending.error)
      const list = await app.auth.mfa.listFactors()
      assert.ok(list.data.all.some(f => f.id === pending.data.id && f.status === 'unverified'))
      assert.ok(!(await app.auth.mfa.unenroll({ factorId: pending.data.id })).error)
      const enroll = await app.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Task 2E customer' })
      assert.ok(!enroll.error); assert.ok(enroll.data.totp.qr_code.startsWith('data:image/svg+xml'))
      const bad = ((Number(totp(enroll.data.totp.secret)) + 1) % 1000000).toString().padStart(6, '0')
      await assert.rejects(() => verifyTotp(app, enroll.data.id, bad))
      assert.equal((await app.auth.mfa.getAuthenticatorAssuranceLevel()).data.currentLevel, 'aal1')
      await verifyTotp(app, enroll.data.id, totp(enroll.data.totp.secret)); await store.reload()
      await eventually(() => store.getSnapshot().assurance?.currentLevel === 'aal2')
      const profiles = await app.from('profiles').select('id')
      assert.deepEqual(profiles.data, [{ id: b.id }], 'Customer AAL2 no global READ')
      assert.deepEqual(await readPublicMenu(app), menuBaseline)
      await store.signOut()
      const login = await app.auth.signInWithPassword({ email: b.email, password: b.password })
      assert.ok(!login.error); await store.reload()
      await eventually(() => needsMfa(store.getSnapshot().assurance))
      const insufficient = await app.auth.mfa.unenroll({ factorId: enroll.data.id })
      assert.ok(insufficient.error, 'Verified removal requires AAL2')
      await verifyTotp(app, enroll.data.id, totp(enroll.data.totp.secret))
      assert.ok(!(await app.auth.mfa.unenroll({ factorId: enroll.data.id })).error)
      assert.ok(!(await app.auth.refreshSession()).error)
      await store.reload(); await eventually(() => store.getSnapshot().assurance?.currentLevel === 'aal1')
      assert.equal((await app.auth.mfa.listFactors()).data.all.length, 0)
    })
    await t.test('platform same identity AAL1→AAL2 global READ→DB revocation with identical JWT', async () => {
      localSql(`insert into private.platform_admins(user_id) values('${b.id}');`)
      assert.equal((await app.auth.mfa.getAuthenticatorAssuranceLevel()).data.currentLevel, 'aal1')
      assert.equal((await app.from('profiles').select('id')).data.length, 1)
      const factor = await app.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Task 2E platform fixture' })
      assert.ok(!factor.error)
      await verifyTotp(app, factor.data.id, totp(factor.data.totp.secret)); await store.reload()
      await eventually(() => store.getSnapshot().assurance?.currentLevel === 'aal2')
      const token = store.getSnapshot().session.access_token
      assert.ok((await app.from('profiles').select('id')).data.length > 1)
      assert.equal((await readProfile(app, b.id)).id, b.id, 'App self filter under wider RLS')
      assert.deepEqual(await readPublicMenu(app), menuBaseline)
      localSql(`delete from private.platform_admins where user_id='${b.id}';`)
      assert.ok(store.getSnapshot().session.access_token === token, 'Same authentic JWT retained')
      assert.deepEqual((await app.from('profiles').select('id')).data, [{ id: b.id }])
      assert.deepEqual(await readPublicMenu(app), menuBaseline)
    })
    await t.test('invalidated server session refresh logs out and clears app profile', async () => {
      // Owned fixture server sessions only. The real refresh endpoint rejects them.
      localSql(`delete from auth.sessions where user_id='${b.id}';`)
      // SDK 2.117.2 preserves an unexpired access token on proactive refresh
      // failure. Exercise actual client expiry via test clock (no token edits).
      const clock = Date.now
      try {
        Date.now = () => clock() + 7200000
        const refresh = await app.auth.refreshSession()
        assert.ok(refresh.error)
        await eventually(() => store.getSnapshot().session === null)
      } finally { Date.now = clock }
      assert.equal(store.getSnapshot().profile, null)
      assert.deepEqual(await readPublicMenu(app), menuBaseline)
    })
  } finally {
    for (const store of stores) store.disconnect()
    for (const client of clients) await client.auth.dispose()
    adapter?.close()
    for (const email of emails) {
      assert.match(email, /^task2e-[0-9a-f-]{36}@example\.test$/)
      localSql(`delete from auth.users where email='${email}';`)
    }
    await cleanupFixtureMail()
    assert.equal(localSql('select (select count(*) from auth.users)+(select count(*) from public.profiles)+(select count(*) from private.platform_admins);'), '0')
    assert.equal(localSql(fingerprintSQL), '5bc80b32792095fb6cf02694de9626a1')
  }
})
