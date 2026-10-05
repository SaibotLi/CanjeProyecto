// Run only on the exclusive, freshly reset LOCAL stack; never hosted.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { localRuntime, localSql } from '../scripts/local-runtime.mjs'
import { confirmationLink, cleanupFixtureMail } from '../scripts/auth-mail-runtime.mjs'

const runtime = localRuntime()
const headers = { apikey: runtime.publishableKey, 'Content-Type': 'application/json' }
const request = (path, options = {}) => fetch(`${runtime.url}${path}`, {
  ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(10000),
})
const emptyIdentities = () => assert.equal(localSql('select (select count(*) from auth.users)+(select count(*) from public.profiles)+(select count(*) from private.platform_admins);'), '0', 'Refusing to run signup tests over existing identities')
const seedState = () => localSql(`select jsonb_build_object(
  'businesses',(select jsonb_agg(to_jsonb(t)-'created_at'-'updated_at' order by id) from public.businesses t),
  'settings',(select jsonb_agg(to_jsonb(t)-'created_at'-'updated_at' order by business_id) from public.loyalty_settings t),
  'categories',(select jsonb_agg(to_jsonb(t)-'created_at'-'updated_at' order by id) from public.menu_categories t),
  'items',(select jsonb_agg(to_jsonb(t)-'created_at'-'updated_at' order by id) from public.menu_items t));`)

test('LOCAL foundation smoke tests', { concurrency: false }, async t => {
  emptyIdentities()
  await t.test('private stays inaccessible through GET and POST Data API', async () => {
    assert.equal(localSql("select count(*) from pg_namespace where nspname='private';"), '1')
    const get = await request('/rest/v1/platform_admins?select=user_id', { headers: { 'Accept-Profile': 'private' } })
    assert.equal(get.status, 406)
    const post = await request('/rest/v1/platform_admins', { method: 'POST', headers: { 'Content-Profile': 'private' }, body: '{}' })
    assert.equal(post.status, 406)
    const publicRead = await request('/rest/v1/businesses?select=id')
    assert.equal(publicRead.status, 200, '2C grants published catalog reads')
    assert.deepEqual(await publicRead.json(), [{ id: 'a11a0000-0000-4000-8000-000000000001' }])
  })
  await t.test('seed rerun preserves deterministic state and timestamps', () => {
    const before = seedState()
    const timestamps = localSql('select string_agg(updated_at::text,\',\' order by id) from public.menu_items;')
    localSql(readFileSync(new URL('../seed.sql', import.meta.url), 'utf8'))
    assert.equal(seedState(), before)
    assert.equal(localSql('select string_agg(updated_at::text,\',\' order by id) from public.menu_items;'), timestamps)
    const state = JSON.parse(before)
    assert.equal(state.businesses.length, 1)
    assert.equal(state.categories.length, 4)
    assert.equal(state.items.length, 5)
  })
  await t.test('DB UPDATE manages timestamps across separate transactions', () => {
    const id = '1de00000-0000-4000-8000-000000000001'
    const before = JSON.parse(localSql(`select json_build_object('created',created_at,'updated',updated_at) from public.menu_items where id='${id}';`))
    localSql(`update public.menu_items set name=name, updated_at='1900-01-01' where id='${id}';`)
    const after = JSON.parse(localSql(`select json_build_object('created',created_at,'updated',updated_at) from public.menu_items where id='${id}';`))
    assert.equal(after.created, before.created)
    assert.ok(Date.parse(after.updated) > Date.parse(before.updated))
  })
  await t.test('genuine Auth signup creates only minimal profile; metadata grants nothing', async () => {
    emptyIdentities()
    const email = `task2b-${randomUUID()}@example.test`
    const password = `${randomUUID()}!Aa9` // synthetic, ephemeral, not logged/stored in source
    let userId
    try {
      const response = await request('/auth/v1/signup', { method: 'POST', body: JSON.stringify({
        email, password, data: { role: 'admin', display_name: 'Untrusted', business_id: 'a11a0000-0000-4000-8000-000000000001' },
      }) })
      assert.equal(response.status, 200, 'Local signup succeeds')
      const body = await response.json()
      userId = body.user?.id ?? body.id
      assert.match(userId ?? '', /^[0-9a-f-]{36}$/)
      assert.equal(localSql(`select count(*) from public.profiles where id='${userId}' and display_name is null;`), '1')
      assert.equal(localSql('select (select count(*) from public.business_memberships)+(select count(*) from private.platform_admins);'), '0')
      await confirmationLink(email, 'signup') // real email capture, no auto-confirm shortcut
    } finally {
      // Generated address is validated before static SQL interpolation; only our user.
      assert.match(email, /^task2b-[0-9a-f-]{36}@example\.test$/)
      localSql(`delete from auth.users where email='${email}';`)
      await cleanupFixtureMail()
      emptyIdentities()
    }
  })
  await t.test('intentional profile failure rejects genuine signup atomically', async () => {
    emptyIdentities()
    const email = `task2b-${randomUUID()}@example.test`
    try {
      // Exclusive local test fault. NOT a migration/policy; always removed below.
      localSql('alter table public.profiles add constraint task_2b_smoke_reject_profile check (false) not valid;')
      const response = await request('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password: `${randomUUID()}!Aa9` }) })
      assert.equal(response.status, 500, 'Profile failure is surfaced by Auth')
      assert.equal(localSql(`select count(*) from auth.users where email='${email}';`), '0')
      emptyIdentities()
    } finally {
      localSql('alter table public.profiles drop constraint if exists task_2b_smoke_reject_profile;')
      assert.match(email, /^task2b-[0-9a-f-]{36}@example\.test$/)
      localSql(`delete from auth.users where email='${email}';`)
    }
    assert.equal(localSql("select count(*) from pg_constraint where conname='task_2b_smoke_reject_profile';"), '0')
  })
})
