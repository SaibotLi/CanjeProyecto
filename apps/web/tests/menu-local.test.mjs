// LOCAL ONLY. Real PostgREST/Auth/Storage with public key and real signed JWTs.
// Privileged SQL is restricted to reversible DEV fixture setup/cleanup.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createClient } from '@supabase/supabase-js'
import { localRuntime, localSql } from '../../../supabase/scripts/local-runtime.mjs'
import { signup, mfa } from '../../../supabase/scripts/auth-test-runtime.mjs'
import { png, storageRequest, storageFixtures, objectRoute } from '../../../supabase/scripts/storage-test-runtime.mjs'
import { readPublicMenu } from '../src/features/menu/publicMenu.ts'

test('real local public-menu integration, session independence and reversible mutations', async t => {
  const runtime = localRuntime()
  const checksumSQL = readFileSync(new URL('../../../supabase/scripts/seed-fingerprint.sql', import.meta.url), 'utf8')
  const before = localSql(checksumSQL)
  assert.equal(before, '5bc80b32792095fb6cf02694de9626a1', 'Refuse mutations unless pristine approved DEV seed')
  assert.equal(localSql('select count(*) from auth.users;'), '0', 'Exclusive local fixture run; preserve existing users')
  const snapshot = JSON.parse(localSql(`select json_build_object(
    'businesses',(select json_agg(t) from public.businesses t),
    'settings',(select json_agg(t) from public.loyalty_settings t),
    'categories',(select json_agg(t) from public.menu_categories t),
    'items',(select json_agg(t) from public.menu_items t));`))
  const quote = value => `'${String(value).replaceAll("'", "''")}'`
  const business = snapshot.businesses.find(b => b.slug === 'valhalla-space').id
  const beer = snapshot.items.find(i => i.name === 'Cerveza demo').id
  const beerCategory = snapshot.items.find(i => i.id === beer).category_id
  const emptyCategory = randomUUID(), otherBusiness = randomUUID(), otherCategory = randomUUID(), otherItem = randomUUID()
  const path = `${business}/${randomUUID()}.png`
  const ownedUsers = [], actors = {}
  const fixtures = storageFixtures()
  let uploaded = false
  const makeClient = actor => createClient(runtime.url, runtime.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: actor ? { Authorization: `Bearer ${actor.token}` } : {} },
  })
  const anon = makeClient()
  const load = async (client = anon, slug) => {
    const result = await readPublicMenu(client, AbortSignal.timeout(10000), slug)
    assert.equal(result.kind, 'ready', 'Active published menu available')
    return result.data
  }
  const restore = (table, rows) => {
    // Snapshot captured before mutation, IDs/columns never supplied by a user.
    const key = table === 'loyalty_settings' ? 'business_id' : 'id'
    const cols = Object.keys(rows[0]).filter(c => ![key, 'created_at', 'updated_at'].includes(c))
    localSql(`update public.${table} target set ${cols.map(c => `${c}=source.${c}`).join(',')}
      from json_populate_recordset(null::public.${table}, ${quote(JSON.stringify(rows))}) source
      where target.${key}=source.${key};`)
  }
  try {
    await t.test('actual seed contracts: 4 categories / 5 items, fractional exhausted price and null image', async () => {
      const menu = await load()
      assert.equal(menu.categories.length, 4)
      assert.equal(menu.items.length, 5)
      assert.equal(menu.previewCurrencyPerPoint, 1000)
      assert.ok(menu.pointsEnabled)
      assert.equal(menu.items.find(i => !i.isAvailable).price, 6500.50)
      assert.ok(menu.items.some(i => i.isFeatured))
      assert.ok(menu.items.every(i => i.imageUrl === undefined))
      assert.deepEqual(await readPublicMenu(anon, undefined, 'missing-task2d-business'), { kind: 'not-found' })
    })
    for (const name of ['customer', 'adminA', 'adminB', 'adminBoth', 'platform']) {
      const pending = await signup()
      ownedUsers.push(pending.email)
      actors[name] = await pending.create()
    }
    localSql(`begin;
      insert into public.businesses(id,slug,name,timezone) values(${quote(otherBusiness)},'task2d-${otherBusiness}','Task 2D tenant B','America/Argentina/Buenos_Aires');
      insert into public.loyalty_settings(business_id) values(${quote(otherBusiness)});
      insert into public.menu_categories(id,business_id,slug,name) values
        (${quote(emptyCategory)},${quote(business)},'task2d-empty','Task 2D empty'),
        (${quote(otherCategory)},${quote(otherBusiness)},'task2d-other','Other tenant');
      insert into public.menu_items(id,business_id,category_id,name,price_amount) values
        (${quote(otherItem)},${quote(otherBusiness)},${quote(otherCategory)},'Other tenant item',123);
      insert into public.business_memberships(user_id,business_id,role) values
        (${quote(actors.adminA.id)},${quote(business)},'admin'),
        (${quote(actors.adminB.id)},${quote(otherBusiness)},'admin'),
        (${quote(actors.adminBoth.id)},${quote(business)},'admin'),
        (${quote(actors.adminBoth.id)},${quote(otherBusiness)},'admin');
      insert into private.platform_admins(user_id) values(${quote(actors.platform.id)});
      commit;`)
    actors.platformAAL2 = await mfa(actors.platform)
    const clients = [anon, ...Object.values(actors).map(makeClient)]
    const identicalPublication = async expectedCount => {
      const menus = await Promise.all(clients.map(c => load(c)))
      assert.equal(menus[0].items.length, expectedCount)
      for (const menu of menus) {
        assert.deepEqual(menu, menus[0], 'Publication independent of JWT authority/AAL')
        assert.ok(menu.items.every(i => i.businessId === business))
        assert.ok(menu.categories.every(c => c.id !== emptyCategory))
      }
      return menus[0]
    }
    await t.test('anon/customer/Admin A/B/Both/Platform AAL1/AAL2 see identical public menu', async () => { await identicalPublication(5) })
    await t.test('privileged DEV name/decimal price mutation appears on next real read', async () => {
      localSql(`update public.menu_items set name='Task 2D renamed',price_amount=4321.25 where id=${quote(beer)};`)
      const item = (await load()).items.find(i => i.id === beer)
      assert.equal(item.name, 'Task 2D renamed'); assert.equal(item.price, 4321.25)
      restore('menu_items', snapshot.items)
    })
    await t.test('inactive item stays hidden even to its admin/platform; empty category omitted', async () => {
      localSql(`update public.menu_items set is_active=false where id=${quote(beer)};`)
      assert.ok(!(await identicalPublication(4)).items.some(i => i.id === beer))
      restore('menu_items', snapshot.items)
    })
    await t.test('inactive category hides all children even to admin/platform', async () => {
      localSql(`update public.menu_categories set is_active=false where id=${quote(beerCategory)};`)
      assert.ok(!(await identicalPublication(3)).categories.some(c => c.id === beerCategory))
      restore('menu_categories', snapshot.categories)
    })
    await t.test('inactive business returns not-found for every real session', async () => {
      localSql(`update public.businesses set is_active=false where id=${quote(business)};`)
      for (const c of clients) assert.deepEqual(await readPublicMenu(c), { kind: 'not-found' })
      restore('businesses', snapshot.businesses)
    })
    await t.test('unavailable remains visible; published empty menu is not an error', async () => {
      assert.ok((await load()).items.some(i => !i.isAvailable))
      localSql(`update public.menu_items set is_available=false where id=${quote(beer)};`)
      assert.equal((await load()).items.find(i => i.id === beer).isAvailable, false)
      localSql(`update public.menu_items set is_active=false where business_id=${quote(business)};`)
      for (const c of clients) {
        const menu = await load(c)
        assert.equal(menu.items.length, 0); assert.equal(menu.categories.length, 0)
      }
      restore('menu_items', snapshot.items)
    })
    await t.test('DB display_order changes category and item order, UUID tie-break stable', async () => {
      localSql(`update public.menu_categories set display_order=0 where slug='sin-alcohol' and business_id=${quote(business)};
        update public.menu_items set display_order=999 where id=${quote(beer)};`)
      const menu = await load()
      assert.equal(menu.categories[0].slug, 'sin-alcohol')
      assert.equal(menu.items.filter(i => i.categoryId === beerCategory).at(-1).id, beer)
      restore('menu_categories', snapshot.categories); restore('menu_items', snapshot.items)
    })
    await t.test('real loyalty settings, fractional divisor and disabled flag reflected', async () => {
      localSql(`update public.loyalty_settings set currency_per_point=1500.50,points_enabled=false where business_id=${quote(business)};`)
      const menu = await load()
      assert.equal(menu.previewCurrencyPerPoint, 1500.50); assert.equal(menu.pointsEnabled, false)
      restore('loyalty_settings', snapshot.settings)
    })
    await t.test('real JWT upload fixture → image_path → public URL → no-key binary download', async () => {
      // Track before request so partial failures still clean up only our owned path.
      uploaded = true
      const upload = await storageRequest(objectRoute('menu-images', path), actors.adminA, 'POST', png)
      assert.equal(upload.status, 200, 'Real active-tenant upload')
      localSql(`update public.menu_items set image_path=${quote(path)},image_alt='Task 2D PNG fixture',image_presentation='cutout' where id=${quote(beer)};`)
      const image = (await load()).items.find(i => i.id === beer)
      assert.equal(image.imageUrl, `${runtime.url}/storage/v1/object/public/menu-images/${path}`)
      assert.equal(image.imagePresentation, 'cutout')
      const response = await fetch(image.imageUrl, { signal: AbortSignal.timeout(10000) })
      assert.equal(response.status, 200); assert.match(response.headers.get('Content-Type'), /image\/png/)
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), png)
      restore('menu_items', snapshot.items)
      assert.equal((await load()).items.find(i => i.id === beer).imageUrl, undefined)
    })
  } finally {
    // Restore references before removing fixture payload; never app DELETE/cleanup.
    restore('menu_items', snapshot.items)
    restore('menu_categories', snapshot.categories)
    restore('loyalty_settings', snapshot.settings)
    restore('businesses', snapshot.businesses)
    if (uploaded) await fixtures.removeObjects('menu-images', [path])
    localSql(`begin;
      delete from public.menu_categories where id=${quote(emptyCategory)};
      delete from public.menu_items where id=${quote(otherItem)};
      delete from public.menu_categories where id=${quote(otherCategory)};
      delete from public.business_memberships where business_id=${quote(otherBusiness)};
      delete from public.loyalty_settings where business_id=${quote(otherBusiness)};
      delete from public.businesses where id=${quote(otherBusiness)};
      ${ownedUsers.length ? `delete from auth.users where email in (${ownedUsers.map(quote).join(',')});` : ''}
      commit;`)
    assert.equal(localSql(checksumSQL), before, 'Original logical catalog restored')
    assert.equal(localSql('select count(*) from auth.users;'), '0', 'All owned identities removed')
    assert.equal(localSql(`select count(*) from storage.objects where bucket_id='menu-images' and name=${quote(path)};`), '0', 'Owned Storage fixture removed through privileged DEV channel')
    console.log('Task 2D local fixture cleanup: original seed checksum, no owned users/objects remaining.')
  }
})
