import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { createClient } from '@supabase/supabase-js'
import { localRuntime, localSql } from '../../../supabase/scripts/local-runtime.mjs'
import { confirmationLink, followAuthLink, cleanupFixtureMail } from '../../../supabase/scripts/auth-mail-runtime.mjs'
import { memoryStorage, sdkWindow } from './auth-browser-fixture.mjs'
import { browserAuthOptions } from '../src/lib/supabase.ts'
import { createAuthStore } from '../src/features/auth/sessionStore.ts'

test('Implicit LOCAL proof: confirmation/recovery same and clean storage contexts', async t => {
  const runtime = localRuntime()
  assert.equal(localSql('select count(*) from auth.users;'), '0', 'Exclusive fixture stack required')
  const emails = []
  const clients = []
  const stores = []
  let adapter
  const create = (storage, key = `proof-${randomUUID()}`) => {
    const client = createClient(runtime.url, runtime.publishableKey, { auth: { ...browserAuthOptions, storage, storageKey: key } })
    clients.push(client)
    return client
  }
  try {
    for (const clean of [false, true]) await t.test(clean ? 'clean context, no originating storage' : 'originating context', async () => {
      const email = `task2e-${randomUUID()}@example.test`
      emails.push(email)
      const storage = memoryStorage()
      const key = `proof-${randomUUID()}`
      const starter = create(storage, key)
      const signup = await starter.auth.signUp({ email, password: `${randomUUID()}!Aa9`, options: { emailRedirectTo: 'http://127.0.0.1:5173/auth/callback' } })
      assert.ok(!signup.error, 'Signup accepted without diagnostics')
      assert.equal(signup.data.session, null)
      const link = await confirmationLink(email, 'signup')
      const redirect = await followAuthLink(link)
      assert.equal(redirect.pathname, '/auth/callback')
      adapter = sdkWindow(redirect.href)
      const confirmed = create(clean ? memoryStorage() : storage, key)
      const confirmedStore = createAuthStore(confirmed); stores.push(confirmedStore); confirmedStore.connect()
      const init = await confirmed.auth.initialize()
      assert.ok(!init.error, 'SDK handled confirmation redirect')
      assert.equal((await confirmed.auth.getUser()).data.user.id, signup.data.user.id)
      assert.equal(adapter.location.hash, '', 'SDK cleaned URL fragment')
      await delay(30)
      assert.ok(confirmedStore.getSnapshot().callbackAccepted, 'App accepts only successful SDK callback')
      confirmedStore.disconnect()
      adapter.close(); adapter = null
      const recover = await starter.auth.resetPasswordForEmail(email, { redirectTo: 'http://127.0.0.1:5173/auth/recovery' })
      assert.ok(!recover.error, 'Recovery requested')
      const recoveryRedirect = await followAuthLink(await confirmationLink(email, 'recovery'))
      assert.equal(recoveryRedirect.pathname, '/auth/recovery')
      adapter = sdkWindow(recoveryRedirect.href)
      const recovering = create(clean ? memoryStorage() : storage, key)
      const events = []
      const { data: { subscription } } = recovering.auth.onAuthStateChange(event => events.push(event))
      const initialized = await recovering.auth.initialize()
      await delay(20)
      assert.ok(!initialized.error, 'SDK handled recovery redirect')
      assert.ok(events.includes('PASSWORD_RECOVERY'), 'Official recovery event emitted')
      assert.equal((await recovering.auth.getUser()).data.user.id, signup.data.user.id)
      assert.equal(adapter.location.hash, '')
      subscription.unsubscribe()
      adapter.close(); adapter = null
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
    assert.equal(localSql('select count(*) from auth.users;'), '0')
  }
})
