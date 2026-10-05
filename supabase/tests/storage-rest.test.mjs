// Exclusive disposable LOCAL stack. No fabricated claims or service-role assertions.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { localRuntime, localSql } from '../scripts/local-runtime.mjs'
import { http, signup, mfa, aal } from '../scripts/auth-test-runtime.mjs'
import { storageRequest as request, storageFixtures, objectRoute, png } from '../scripts/storage-test-runtime.mjs'

localRuntime()
const bucket = 'menu-images'
const A = 'a11a0000-0000-4000-8000-000000000001'
const B = 'b22b0000-0000-4000-8000-000000000002'
const itemA = '1de00000-0000-4000-8000-000000000001'
const identities = JSON.parse(readFileSync(new URL('../fixtures/identities.json', import.meta.url))).identities

test('Task 2G LOCAL Storage / real JWT tenant authorization (Sprint 2 DELETE DENY approved)', { concurrency: false }, async t => {
  assert.equal(localSql('select (select count(*) from auth.users)+(select count(*) from public.profiles)+(select count(*) from public.business_memberships)+(select count(*) from private.platform_admins)+(select count(*) from storage.objects);'), '0')
  assert.equal(localSql("select string_agg(id,',' order by id) from storage.buckets;"), bucket)
  assert.equal(localSql("select string_agg(id::text,',' order by id) from public.businesses;"), A)
  const fixture = storageFixtures(), otherBucket = `task2g-other-${randomUUID()}`
  const emails = [], createdPaths = [], actors = {}
  let otherCreated = false
  const fresh = (business = A, extension = 'png') => {
    const path = `${business}/${randomUUID()}.${extension}`
    createdPaths.push(path)
    return path
  }
  const list = async (actor, business, target = bucket) => {
    const r = await request(`object/list/${target}`, actor, 'POST', { prefix: business ?? '', limit: 1000, sortBy: { column: 'name', order: 'asc' } })
    assert.equal(r.status, 200, 'List request succeeds with RLS-filtered rows')
    assert.ok(Array.isArray(r.data))
    return r.data
  }
  const info = async (path, actor) => {
    const r = await request(`object/info/public/${bucket}/${path}`, actor)
    assert.equal(r.status, 200)
    return r.data
  }
  const bytes = async path => {
    const r = await request(`object/public/${bucket}/${path}`, null, 'GET', undefined, {}, true)
    assert.equal(r.status, 200, 'Public download needs no credentials')
    return r.bytes
  }
  const upload = (actor, path, body = png, headers = {}) => request(objectRoute(bucket, path), actor, 'POST', body, headers)
  const observerState = async () => [await list(actors['Platform AAL2'], A), await list(actors['Platform AAL2'], B)]
  const deniedUpload = async (actor, path, body = png, headers = {}) => {
    const before = await observerState()
    const r = await upload(actor, path, body, headers)
    assert.ok([400,401,403,413,415].includes(r.status), `Upload denied, HTTP ${r.status}, synthetic path ${JSON.stringify(path)}`)
    assert.deepEqual(await observerState(), before, 'Denied upload leaves metadata unchanged')
    const missing = await request(`object/public/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`, null, 'GET', undefined, {}, true)
    assert.ok(missing.status !== 200, 'Denied upload did not create publicly downloadable bytes')
  }
  const uploaded = async (actor, path, headers = {}) => {
    const r = await upload(actor, path, png, headers)
    assert.equal(r.status, 200, 'Real admin upload allowed')
    assert.equal(r.data.Key, `${bucket}/${path}`)
    assert.ok(r.data.Id)
    assert.deepEqual(await bytes(path), png, 'Stored bytes match upload')
    assert.equal((await info(path)).name, path)
    return path
  }
  const unchangedOperation = async (route, actor, method, body, path) => {
    const before = await info(path)
    const r = await request(route, actor, method, body)
    if (r.status === 200) assert.deepEqual(r.data, [], 'Zero affected rows = denied DELETE, not success')
    else assert.ok([400,401,403,404].includes(r.status), `Operation denied, HTTP ${r.status}`)
    assert.deepEqual(await info(path), before)
    assert.deepEqual(await bytes(path), png)
  }
  try {
    localSql(`begin; ${readFileSync(new URL('../fixtures/catalog.sql', import.meta.url), 'utf8')} commit;`)
    for (const identity of identities) {
      const pending = await signup(); emails.push(pending.email)
      const actor = await pending.create(); actors[identity.label] = actor
      for (const business of identity.adminBusinessIds) localSql(`insert into public.business_memberships(business_id,user_id,role) values ('${business}','${actor.id}','admin');`)
      if (identity.platform) localSql(`insert into private.platform_admins(user_id) values ('${actor.id}');`)
    }
    actors['Platform AAL2'] = await mfa(actors.Platform)
    actors['Customer AAL2'] = await mfa(actors['Customer MFA'])
    assert.equal(aal(actors.Platform), 'aal1'); assert.equal(aal(actors['Platform AAL2']), 'aal2')
    assert.equal(aal(actors['Customer AAL2']), 'aal2')
    await fixture.createBucket(otherBucket); otherCreated = true
    const otherPath = `${A}/${randomUUID()}.png`
    await fixture.seedObject(otherBucket, otherPath)
    const assetA = fresh(), assetB = fresh(B)
    await t.test('Admin A/B: canonical upload and exact public bytes', async () => {
      await uploaded(actors['Admin Valhalla'], assetA)
      await uploaded(actors['Admin B'], assetB)
    })
    for (const [label,actor] of [['ANON',null],['Customer A',actors['Customer A']],['Customer B',actors['Customer B']],['Customer AAL2',actors['Customer AAL2']],['Platform AAL1',actors.Platform]]) {
      await t.test(`${label}: no listing/upload/delete; public info/download intentional`, async () => {
        for (const prefix of [undefined,A,B]) assert.deepEqual(await list(actor, prefix), [])
        await deniedUpload(actor, fresh())
        await unchangedOperation(objectRoute(bucket,assetA),actor,'PUT',png,assetA)
        await unchangedOperation(`object/${bucket}`, actor, 'DELETE', { prefixes: [assetA] }, assetA)
        assert.equal((await info(assetA, actor)).name, assetA)
        assert.deepEqual(await bytes(assetA), png)
      })
    }
    for (const [label,own,foreign,ownAsset,foreignAsset] of [
      ['Admin Valhalla',A,B,assetA,assetB], ['Admin B',B,A,assetB,assetA],
    ]) {
      await t.test(`${label}: own metadata only, foreign known paths protected`, async () => {
        const actor = actors[label]
        assert.equal((await list(actor, own)).length, 1)
        assert.equal((await list(actor, own))[0].name, ownAsset.split('/')[1])
        assert.deepEqual(await list(actor, foreign), [])
        await deniedUpload(actor, fresh(foreign))
        await deniedUpload(actor, fresh(foreign), png, { 'x-metadata': Buffer.from(JSON.stringify({ business_id: own, role: 'admin' })).toString('base64') })
        await unchangedOperation(objectRoute(bucket, foreignAsset), actor, 'PUT', png, foreignAsset)
        await unchangedOperation(`object/${bucket}`, actor, 'DELETE', { prefixes: [foreignAsset] }, foreignAsset)
      })
    }
    await t.test('Admin Both: independent namespaces, no move/copy/re-home/overwrite', async () => {
      const actor = actors['Admin Both']
      for (const business of [A,B]) await uploaded(actor, fresh(business))
      assert.equal((await list(actor,A)).length, 2); assert.equal((await list(actor,B)).length, 2)
      for (const destination of [fresh(A),fresh(B)]) {
        for (const operation of ['move','copy']) {
          await unchangedOperation(`object/${operation}`, actor, 'POST', { bucketId: bucket, sourceKey: assetA, destinationKey: destination }, assetA)
          assert.ok((await request(`object/public/${bucket}/${destination}`,null,'GET',undefined,{},true)).status !== 200)
        }
      }
      const before = await info(assetA)
      const duplicate = await upload(actor,assetA)
      assert.ok([400,409].includes(duplicate.status))
      const replace = await upload(actor,assetA,Buffer.from('replacement'),{'x-upsert':'true'})
      assert.ok([400,401,403].includes(replace.status))
      // Verified Storage behavior: x-upsert on an absent path can INSERT. It must
      // never permit replacement on the subsequent request (no UPDATE policy).
      const newUpsert=fresh()
      await uploaded(actor,newUpsert,{'x-upsert':'true'})
      const upsertReplace=await upload(actor,newUpsert,Buffer.from('replacement'),{'x-upsert':'true'})
      assert.ok([400,401,403].includes(upsertReplace.status)); assert.deepEqual(await bytes(newUpsert),png)
      await unchangedOperation(objectRoute(bucket,assetA),actor,'PUT',png,assetA)
      assert.deepEqual(await info(assetA),before); assert.deepEqual(await bytes(assetA),png)
    })
    await t.test('All approved extensions / MIME pairs and empty custom metadata', async () => {
      for (const [ext,mime] of [['jpg','image/jpeg'],['jpeg','image/jpeg'],['png','image/png'],['webp','image/webp'],['avif','image/avif']]) {
        const path = await uploaded(actors['Admin Valhalla'],fresh(A,ext),{'Content-Type':mime})
        const data = await info(path)
        assert.equal(data.content_type,mime)
        assert.ok(data.metadata === null || JSON.stringify(data.metadata) === '{}')
      }
      // Intentionally identical PNG bytes under other declared types demonstrate
      // this is declared-MIME/path validation, NOT magic-byte image validation.
      const emptyPath = await uploaded(actors['Admin Valhalla'],fresh(),{'x-metadata':Buffer.from('{}').toString('base64')})
      assert.deepEqual((await info(emptyPath)).metadata,{})
      await deniedUpload(actors['Admin Valhalla'],fresh(),png,{'x-metadata':Buffer.from(JSON.stringify({ untrusted:'public-not-authority' })).toString('base64')})
      const form = new FormData(); form.append('file',new Blob([png],{type:'image/png'}),'original-user-file.png'); form.append('metadata',JSON.stringify({untrusted:'multipart'}))
      // Native fetch multipart route (same real JWT, no setup credentials).
      const runtime = localRuntime(), path = fresh()
      const before = await observerState()
      const r = await fetch(`${runtime.url}/storage/v1/${objectRoute(bucket,path)}`,{method:'POST',headers:{apikey:runtime.publishableKey,Authorization:`Bearer ${actors['Admin Valhalla'].token}`},body:form,signal:AbortSignal.timeout(20000)})
      assert.ok([400,403].includes(r.status)); await r.arrayBuffer()
      assert.deepEqual(await observerState(),before)
      assert.ok((await request(`object/public/${bucket}/${path}`,null,'GET',undefined,{},true)).status!==200)
    })
    await t.test('Invalid paths, tenant UUIDs, MIME/extension mismatches rejected', async () => {
      const asset = 'abcdef00-0000-4000-8000-000000000001'
      // Own deterministic transport-normalization diagnostic path for cleanup.
      createdPaths.push(`${A}/${asset}.png`)
      const invalid = [
        `${asset}.png`, `not-a-business/${asset}.png`, `${A.toUpperCase()}/${asset}.png`,
        `${A}/${asset.toUpperCase()}.png`, `${A}/sub/${asset}.png`,
        `${A}/../${asset}.png`, `https://example.test/${A}/${asset}.png`,
        `${A}/${asset}.png?x=1`, `${A}/${asset}.png#x`, `${A}/${asset}.png\n`,
        `${A}/${asset}.png `, `${A}/free-name.png`, `${A}/${asset}.PNG`,
        `${A}/${asset}.jpg.png`, `${A}/${asset.replaceAll('-','')}.png`,
        `${A}/${asset}.exe`, `${A}/${asset}.svg`, `${A}/${asset}.gif`,
        `${randomUUID()}/${asset}.png`,
      ]
      for (const path of invalid) await deniedUpload(actors['Admin Valhalla'],path)
      for (const [extension,mime] of [['webp','image/png'],['png','text/plain'],['png','image/svg+xml'],['png','image/gif'],['png','application/octet-stream']]) {
        await deniedUpload(actors['Admin Valhalla'],fresh(A,extension),png,{'Content-Type':mime})
      }
    })
    await t.test('Transport double slash normalizes; REAL stored name remains canonical and foreign namespace denied',async()=>{
      const canonical=fresh(), raw=canonical.replace('/','//')
      const r=await upload(actors['Admin Valhalla'],raw)
      assert.equal(r.status,200); assert.equal(r.data.Key,`${bucket}/${canonical}`)
      assert.equal((await info(canonical)).name,canonical)
      assert.deepEqual(await bytes(canonical),png)
      // RLS must enforce the real namespace after gateway normalization.
      await deniedUpload(actors['Admin B'],fresh().replace('/','//'))
    })
    await t.test('5 MiB boundary allowed; 5 MiB + 1 rejected', async () => {
      const path = fresh(), large = Buffer.alloc(5242880)
      png.copy(large)
      assert.equal((await upload(actors['Admin Valhalla'],path,large)).status,200)
      assert.deepEqual(await bytes(path),large)
      assert.equal((await info(path)).size,large.length)
      await deniedUpload(actors['Admin Valhalla'],fresh(),Buffer.alloc(5242881))
    })
    for (const [label,business,asset] of [['Admin Valhalla',A,assetA],['Admin B',B,assetB],['Admin Both',A,assetA],['Admin Both',B,assetB]]) {
      await t.test(`${label}/${business}: SAME JWT active -> inactive own read, writes denied`, async () => {
        const actor=actors[label], originalToken=actor.token
        await uploaded(actor,fresh(business))
        const visible=await list(actor,business)
        localSql(`update public.businesses set is_active=false where id='${business}';`)
        try {
          assert.deepEqual(await list(actor,business),visible)
          await deniedUpload(actor,fresh(business))
          await unchangedOperation(objectRoute(bucket,asset),actor,'PUT',png,asset)
          await unchangedOperation(`object/${bucket}`,actor,'DELETE',{prefixes:[asset]},asset)
          if(label==='Admin Both') await uploaded(actor,fresh(business===A?B:A))
          assert.equal(actor.token,originalToken)
          assert.ok((await list(actors['Platform AAL2'],business)).length>0)
        } finally {localSql(`update public.businesses set is_active=true where id='${business}';`)}
      })
    }
    await t.test('Platform AAL2 menu-images global metadata ONLY; no writes or bucket administration', async () => {
      const actor=actors['Platform AAL2']
      for(const business of [A,B]) assert.ok((await list(actor,business)).length>0)
      for(const candidate of [null,actors['Customer A'],actors['Admin Valhalla'],actors['Admin Both'],actors.Platform,actor]) {
        assert.deepEqual(await list(candidate,A,otherBucket),[])
        const privateSchema=await http('/rest/v1/objects',candidate,'GET',undefined,{'Accept-Profile':'storage'})
        assert.equal(privateSchema.status,406); assert.equal(privateSchema.data.code,'PGRST106')
        const r=await request(objectRoute(otherBucket,`${A}/${randomUUID()}.png`),candidate,'POST',png)
        assert.ok([400,401,403].includes(r.status))
      }
      await deniedUpload(actor,fresh()); await deniedUpload(actor,fresh(B))
      await unchangedOperation(objectRoute(bucket,assetB),actor,'PUT',png,assetB)
      await unchangedOperation(`object/${bucket}`,actor,'DELETE',{prefixes:[assetB]},assetB)
      for(const candidate of [null,actors['Customer A'],actors['Admin Valhalla'],actors['Admin Both'],actors.Platform,actor]) {
        assert.deepEqual((await request('bucket',candidate)).data,[])
        for(const [route,method,body] of [['bucket','POST',{id:`task2g-denied-${randomUUID()}`,name:'Attack'}],[`bucket/${bucket}`,'PUT',{public:false}],[`bucket/${bucket}`,'DELETE',undefined]]) {
          const r=await request(route,candidate,method,body)
          assert.ok([400,401,403,404].includes(r.status),`Bucket management denied HTTP ${r.status}`)
        }
      }
      assert.deepEqual(await bytes(assetA),png)
    })
    await t.test('Signed upload not enabled as alternate INSERT path',async()=>{
      const path=fresh()
      const r=await request(`object/upload/sign/${bucket}/${path}`,actors['Admin Valhalla'],'POST',{})
      assert.ok([400,401,403].includes(r.status))
      assert.ok((await request(`object/public/${bucket}/${path}`,null,'GET',undefined,{},true)).status!==200)
    })
    await t.test('Cross-service: new UUID replacement retains prior orphan; foreign path CHECK rejected', async () => {
      const actor=actors['Admin Valhalla']
      const r=await http(`/rest/v1/menu_items?id=eq.${itemA}`,actor,'PATCH',{image_path:assetA},{Prefer:'return=representation'})
      assert.equal(r.status,200); assert.equal(r.data.length,1); assert.equal(r.data[0].image_path,assetA)
      const bad=await http(`/rest/v1/menu_items?id=eq.${itemA}`,actor,'PATCH',{image_path:assetB},{Prefer:'return=representation'})
      assert.equal(bad.status,400); assert.equal(bad.data.code,'23514')
      const persisted=await http(`/rest/v1/menu_items?id=eq.${itemA}&select=image_path`,actor)
      assert.equal(persisted.status,200); assert.deepEqual(persisted.data,[{image_path:assetA}])
      // Approved replacement flow: upload a new immutable asset, then publish
      // its path. The previous object remains as accepted operational debt.
      const replacement=fresh()
      assert.notEqual(replacement,assetA)
      await uploaded(actor,replacement)
      const changed=await http(`/rest/v1/menu_items?id=eq.${itemA}`,actor,'PATCH',{image_path:replacement},{Prefer:'return=representation'})
      assert.equal(changed.status,200); assert.equal(changed.data.length,1)
      assert.equal(changed.data[0].image_path,replacement)
      const replaced=await http(`/rest/v1/menu_items?id=eq.${itemA}&select=image_path`,actor)
      assert.equal(replaced.status,200); assert.deepEqual(replaced.data,[{image_path:replacement}])
      assert.deepEqual(await bytes(assetA),png); assert.deepEqual(await bytes(replacement),png)
      await unchangedOperation(`object/${bucket}`,actor,'DELETE',{prefixes:[assetA]},assetA)
      // Restore the referenced fixture for the final all-actor DELETE test.
      const restored=await http(`/rest/v1/menu_items?id=eq.${itemA}`,actor,'PATCH',{image_path:assetA},{Prefer:'return=representation'})
      assert.equal(restored.status,200); assert.equal(restored.data.length,1)
      assert.equal(restored.data[0].image_path,assetA)
      await unchangedOperation(objectRoute(bucket,assetA),actors['Admin B'],'PUT',png,assetA)
      await unchangedOperation(`object/${bucket}`,actors['Admin B'],'DELETE',{prefixes:[assetA]},assetA)
    })
    await t.test('A-S2-004: application DELETE DENY for every actor, referenced A and orphan A/B retained', async () => {
      const orphanA=await uploaded(actors['Admin Valhalla'],fresh())
      for(const actor of [null,actors['Customer A'],actors['Customer B'],actors['Customer AAL2'],actors['Admin Valhalla'],actors['Admin B'],actors['Admin Both'],actors.Platform,actors['Platform AAL2']]) {
        for(const path of [assetA,orphanA,assetB]) {
          await unchangedOperation(`object/${bucket}`,actor,'DELETE',{prefixes:[path]},path)
        }
      }
      const referenced=await http(`/rest/v1/menu_items?id=eq.${itemA}&select=image_path`,actors['Admin Valhalla'])
      assert.equal(referenced.status,200); assert.deepEqual(referenced.data,[{image_path:assetA}])
    })
    await t.test('Membership revocation, SAME JWT: next upload/list denied and delete cannot affect prior object', async () => {
      const actor=actors['Admin Valhalla'], originalToken=actor.token
      await uploaded(actor,fresh())
      localSql(`delete from public.business_memberships where business_id='${A}' and user_id='${actor.id}';`)
      await deniedUpload(actor,fresh()); assert.deepEqual(await list(actor,A),[])
      await unchangedOperation(`object/${bucket}`,actor,'DELETE',{prefixes:[assetA]},assetA)
      assert.equal(actor.token,originalToken)
    })
    await t.test('Platform revocation, SAME AAL2 JWT; local membership independent and inactive blocked', async () => {
      const actor=actors['Platform AAL2'], originalToken=actor.token
      localSql(`insert into public.business_memberships(business_id,user_id,role) values ('${A}','${actor.id}','admin');`)
      await uploaded(actor,fresh()); await deniedUpload(actor,fresh(B))
      // Platform's independent local membership never grants DELETE either.
      await unchangedOperation(`object/${bucket}`,actor,'DELETE',{prefixes:[assetA]},assetA)
      localSql(`update public.businesses set is_active=false where id='${A}';`)
      try {await deniedUpload(actor,fresh()); assert.ok((await list(actor,A)).length>0)}
      finally {localSql(`update public.businesses set is_active=true where id='${A}';`)}
      localSql(`delete from public.business_memberships where business_id='${A}' and user_id='${actor.id}';`)
      await deniedUpload(actor,fresh()); assert.ok((await list(actor,B)).length>0)
      localSql(`insert into public.business_memberships(business_id,user_id,role) values ('${A}','${actor.id}','admin'); delete from private.platform_admins where user_id='${actor.id}';`)
      assert.deepEqual(await list(actor,B),[]); assert.ok((await list(actor,A)).length>0)
      await uploaded(actor,fresh())
      // Observer lost global rights, so this final denial uses direct byte absence.
      const foreign=fresh(B), r=await upload(actor,foreign)
      assert.ok([400,401,403].includes(r.status))
      assert.ok((await request(`object/public/${bucket}/${foreign}`,null,'GET',undefined,{},true)).status!==200)
      assert.equal(actor.token,originalToken)
    })
  } finally {
    localSql(`update public.menu_items set image_path=null where id='${itemA}'; update public.businesses set is_active=true where id='${A}';`)
    await fixture.removeObjects(bucket,createdPaths)
    if(otherCreated){
      // Fixture object cleanup by exact known canonical path, queried for cleanup only.
      const paths=JSON.parse(localSql(`select coalesce(json_agg(name),'[]'::json) from storage.objects where bucket_id='${otherBucket}';`))
      await fixture.removeObjects(otherBucket,paths); await fixture.removeBucket(otherBucket)}
    for(const email of emails){assert.match(email,/^task2c-[0-9a-f-]{36}@example\.test$/);localSql(`delete from auth.users where email='${email}';`)}
    localSql(`begin; delete from public.menu_items where business_id in ('${B}','c33c0000-0000-4000-8000-000000000003'); delete from public.menu_categories where business_id in ('${B}','c33c0000-0000-4000-8000-000000000003'); delete from public.loyalty_settings where business_id in ('${B}','c33c0000-0000-4000-8000-000000000003'); delete from public.businesses where id in ('${B}','c33c0000-0000-4000-8000-000000000003'); commit;`)
  }
})
