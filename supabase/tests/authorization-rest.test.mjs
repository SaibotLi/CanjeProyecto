// Exclusive disposable LOCAL DB only. Every tested operation uses real JWT/anon.
// PostgreSQL owner is used only for guards/setup/provision/revocation/cleanup.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { localRuntime, localSql } from '../scripts/local-runtime.mjs'
import { http, signup, mfa, aal, totp } from '../scripts/auth-test-runtime.mjs'

localRuntime()
const A = 'a11a0000-0000-4000-8000-000000000001'
const B = 'b22b0000-0000-4000-8000-000000000002'
const C = 'c33c0000-0000-4000-8000-000000000003'
const catA = 'ca110000-0000-4000-8000-000000000001'
const catB = 'cb220000-0000-4000-8000-000000000001'
const itemA = '1de00000-0000-4000-8000-000000000001'
const itemB = '1fb00000-0000-4000-8000-000000000003'
const hiddenB = '1fb00000-0000-4000-8000-000000000001'
const sqlLiteral = text => `'${text.replaceAll("'", "''")}'`
const identities = JSON.parse(readFileSync(new URL('../fixtures/identities.json', import.meta.url))).identities
const pk = table => table === 'loyalty_settings' ? 'business_id' : 'id'
const path = (table, id) => `/rest/v1/${table}${id ? `?${pk(table)}=eq.${id}` : ''}`
const mutation = (table, actor, method, body, id) => http(path(table, id), actor, method, body, { Prefer: 'return=representation' })

test('Task 2C genuine LOCAL Auth / REST authorization', { concurrency: false }, async t => {
  // Guard rejects real data, preexisting identities, foreign fixtures and hosted.
  assert.equal(localSql('select (select count(*) from auth.users)+(select count(*) from public.profiles)+(select count(*) from private.platform_admins)+(select count(*) from public.business_memberships)+(select count(*) from storage.objects);'), '0')
  // 2G adds exactly one normal bucket, not fixture/user data. Reject other buckets.
  assert.equal(localSql("select string_agg(id,',' order by id) from storage.buckets;"), 'menu-images')
  assert.equal(localSql(`select string_agg(id::text,',' order by id) from public.businesses;`), A)
  const original = JSON.parse(localSql(`select json_build_object('businesses',(select json_agg(t) from public.businesses t),'loyalty_settings',(select json_agg(t) from public.loyalty_settings t),'menu_categories',(select json_agg(t) from public.menu_categories t),'menu_items',(select json_agg(t) from public.menu_items t));`))
  const createdEmails = [], createdRows = { menu_items: [], menu_categories: [] }
  const actors = {}
  let observer
  const get = async (table, actor, id) => {
    const r = await http(`${path(table, id)}${id ? '&' : '?'}select=*`, actor)
    assert.equal(r.status, 200, `${table}: GET works under real session`)
    assert.ok(Array.isArray(r.data))
    return r.data
  }
  const stored = async (table, id) => get(table, observer, id)
  const deny = async (table, actor, method, body, id, expectedCode) => {
    const before = await stored(table, id)
    const r = await mutation(table, actor, method, body, id)
    if (method === 'PATCH' && r.status === 200) assert.deepEqual(r.data, [], 'RLS denial = zero affected rows, not success')
    else {
      assert.ok([401,403].includes(r.status), `${method} ${table}: denied HTTP ${r.status}`)
      assert.equal(r.data.code, expectedCode ?? '42501')
    }
    assert.deepEqual(await stored(table, id), before, 'Stored state unchanged (observed with real AAL2 JWT)')
  }
  const write = async (table, actor, body, id) => {
    const r = await mutation(table, actor, 'PATCH', body, id)
    assert.equal(r.status, 200)
    assert.equal(r.data.length, 1, 'Exactly one row affected')
    for (const [key,value] of Object.entries(body)) assert.equal(r.data[0][key], value)
    assert.deepEqual(await stored(table, id), r.data, 'Persisted representation matches write')
    return r.data[0]
  }
  const insert = async (table, actor, body) => {
    const r = await mutation(table, actor, 'POST', body)
    assert.equal(r.status, 201)
    assert.equal(r.data.length, 1)
    const row = r.data[0]
    createdRows[table].push(row.id)
    assert.match(row.id, /^[0-9a-f-]{36}$/)
    assert.ok(row.created_at && row.updated_at, 'DB generates ID and timestamps')
    assert.deepEqual(await stored(table, row.id), r.data)
    return row.id
  }
  try {
    localSql(`begin; ${readFileSync(new URL('../fixtures/catalog.sql', import.meta.url), 'utf8')} ${readFileSync(new URL('../fixtures/security-catalog.sql', import.meta.url), 'utf8')} commit;`)
    for (const identity of identities) {
      const pending = await signup()
      createdEmails.push(pending.email)
      const actor = await pending.create()
      actors[identity.label] = actor
      for (const business of identity.adminBusinessIds) localSql(`insert into public.business_memberships(business_id,user_id,role) values ('${business}','${actor.id}','admin');`)
      if (identity.platform) localSql(`insert into private.platform_admins(user_id) values ('${actor.id}');`)
    }
    // Real GoTrue verification or abort; never substitute SET ROLE/custom JWT AAL.
    actors['Platform AAL2'] = await mfa(actors.Platform)
    actors['Customer AAL2'] = await mfa(actors['Customer MFA'])
    observer = actors['Platform AAL2']
    await t.test('A-S2-006 self boolean RPC with genuine JWTs; capability is independent of AAL', async () => {
      for (const [actor, expected] of [[actors['Customer A'],false],[actors['Admin Valhalla'],false],
        [actors['Admin B'],false],[actors['Admin Both'],false],[actors['Customer AAL2'],false],
        [actors.Platform,true],[observer,true]]) {
        // Every fixture has malicious user_metadata.platform_admin=true.
        const response = await http('/rest/v1/rpc/is_current_user_platform_admin',actor,'POST',{})
        assert.equal(response.status,200,'INVOKER succeeds with existing grants')
        assert.equal(response.data,expected,'Only a self-scoped boolean, not rows or AAL')
        assert.equal(typeof response.data,'boolean')
      }
      const anon = await http('/rest/v1/rpc/is_current_user_platform_admin',null,'POST',{})
      assert.equal(anon.status,401)
      for (const key of ['user_id','email','business_id','role','metadata']) {
        const arbitrary = await http('/rest/v1/rpc/is_current_user_platform_admin',actors['Customer A'],'POST',{[key]:observer.id})
        assert.equal(arbitrary.status,404,'No identity/metadata-taking signature')
      }
      assert.equal((await http(`/rest/v1/rpc/is_current_user_platform_admin?user_id=${observer.id}`,actors['Customer A'])).status,404)
      for (const actor of [actors['Customer A'],actors.Platform,observer]) {
        assert.equal((await http('/rest/v1/platform_admins?select=*',actor,'GET',undefined,{'Accept-Profile':'private'})).status,406)
        assert.equal((await http('/rest/v1/platform_admins?select=*',actor)).status,404)
      }
      const sameToken = observer.token
      localSql(`delete from private.platform_admins where user_id='${observer.id}';`)
      assert.equal((await http('/rest/v1/rpc/is_current_user_platform_admin',observer,'POST',{})).data,false)
      assert.equal((await get('profiles',observer)).length,1,'RPC does not retain global access after revocation')
      localSql(`insert into private.platform_admins(user_id) values('${observer.id}');`)
      assert.equal((await http('/rest/v1/rpc/is_current_user_platform_admin',observer,'POST',{})).data,true)
      assert.equal(observer.token,sameToken,'No refresh or relogin during revocation/restoration')
    })
    await t.test('RFC 6238 reference vector; genuine signed AAL1/AAL2 sessions', () => {
      assert.equal(totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',59000,8), '94287082')
      assert.equal(aal(actors.Platform),'aal1')
      assert.equal(aal(observer),'aal2')
      assert.equal(aal(actors['Customer AAL2']),'aal2')
    })
    for (const [label,actor] of [['ANON',null],['Customer A',actors['Customer A']],['Customer B',actors['Customer B']],['Customer AAL2',actors['Customer AAL2']],['Platform AAL1',actors.Platform]]) {
      await t.test(`${label}: public visibility and known hidden IDs`, async () => {
        assert.deepEqual((await get('businesses',actor)).map(r=>r.id).sort(),[A,B])
        assert.equal((await get('loyalty_settings',actor)).length,2)
        assert.equal((await get('menu_categories',actor)).length,5)
        const items = await get('menu_items',actor)
        assert.equal(items.length,7)
        assert.ok(items.some(r=>r.id==='1fb00000-0000-4000-8000-000000000002' && !r.is_available), 'Unavailable remains public')
        assert.ok(items.some(r=>r.id===itemB && r.image_path===null), 'Imageless remains public')
        assert.deepEqual(await get('businesses',actor,C),[])
        assert.deepEqual(await get('loyalty_settings',actor,C),[])
        for(const id of ['cb220000-0000-4000-8000-000000000002','cc330000-0000-4000-8000-000000000001']) assert.deepEqual(await get('menu_categories',actor,id),[])
        for (const id of [hiddenB,'1fb00000-0000-4000-8000-000000000004','1fc00000-0000-4000-8000-000000000001']) assert.deepEqual(await get('menu_items',actor,id),[])
      })
    }
    await t.test('Anon has no profiles/memberships; all writes denied', async () => {
      for (const table of ['profiles','business_memberships']) {
        const r = await http(`/rest/v1/${table}?select=*`,null)
        assert.equal(r.status,401); assert.equal(r.data.code,'42501')
      }
      for (const [table,id,body] of [['businesses',A,{name:'Attack'}],['loyalty_settings',A,{points_enabled:false}],['menu_categories',catA,{name:'Attack'}],['menu_items',itemA,{name:'Attack'}],['profiles',actors['Customer A'].id,{display_name:'Attack'}]]) {
        await deny(table,null,'PATCH',body,id)
        await deny(table,null,'POST',body)
        await deny(table,null,'DELETE',undefined,id)
      }
      for (const method of ['POST','PATCH','DELETE']) {
        const r = await http(`/rest/v1/business_memberships?user_id=eq.${actors['Customer A'].id}`,null,method,method==='DELETE'?undefined:{business_id:A,user_id:actors['Customer A'].id,role:'admin'})
        assert.equal(r.status,401); assert.equal(r.data.code,'42501')
      }
    })
    for (const label of ['Customer A','Customer B','Customer AAL2']) {
      const actor=actors[label], foreign=actors[label==='Customer A'?'Customer B':'Customer A']
      await t.test(`${label}: self profile only; metadata is not authority`, async () => {
        assert.equal((await get('profiles',actor)).length,1)
        assert.equal((await get('profiles',actor))[0].id,actor.id)
        assert.equal((await get('profiles',actor))[0].display_name,null, 'Untrusted metadata not copied')
        assert.deepEqual(await get('profiles',actor,foreign.id),[])
        assert.deepEqual(await get('business_memberships',actor),[])
        await write('profiles',actor,{display_name:'Test customer'},actor.id)
        await deny('profiles',actor,'PATCH',{display_name:'Foreign attack'},foreign.id)
        for (const body of [{id:randomUUID()},{created_at:'2000-01-01'},{updated_at:'2000-01-01'}]) await deny('profiles',actor,'PATCH',body,actor.id)
        await deny('profiles',actor,'POST',{id:actor.id})
        await deny('profiles',actor,'DELETE',undefined,actor.id)
        for(const [table,id] of [['menu_categories',catA],['menu_items',itemA]]) await deny(table,actor,'DELETE',undefined,id)
        const metadata = await http('/auth/v1/user',actor,'PUT',{data:{role:'admin',platform_admin:true,business_id:A,aal:'aal2',app_metadata:{role:'admin'}}})
        assert.equal(metadata.status,200, 'Client-editable metadata update succeeds without authority')
        const trustedMetadataAttack = await http('/auth/v1/user',actor,'PUT',{app_metadata:{role:'admin',platform_admin:true}})
        assert.equal(trustedMetadataAttack.status,403,'Auth rejects client promotion of trusted app_metadata')
        const authUser = await http('/auth/v1/user',actor)
        assert.equal(authUser.status,200)
        assert.ok(authUser.data.app_metadata?.role !== 'admin', 'Client cannot promote trusted app_metadata')
        assert.ok(authUser.data.app_metadata?.platform_admin !== true, 'Client cannot set platform app_metadata')
        for (const [table,id,body] of [['businesses',A,{name:'Attack'}],['loyalty_settings',A,{currency_per_point:1}],['menu_categories',catA,{name:'Attack'}],['menu_items',itemA,{name:'Attack'}]]) await deny(table,actor,'PATCH',body,id)
        for (const [table,body] of [['menu_categories',{business_id:A,name:'Attack',slug:`attack-${randomUUID()}`}],['menu_items',{business_id:A,category_id:catA,name:'Attack',price_amount:0}]]) await deny(table,actor,'POST',body)
        assert.deepEqual(await get('business_memberships',actor),[])
      })
    }
    const membershipBody={business_id:A,user_id:actors['Customer A'].id,role:'admin'}
    for (const label of ['Customer A','Customer B','Admin Valhalla','Admin B','Admin Both','Platform','Platform AAL2','Customer AAL2']) {
      await t.test(`${label}: registry writes, hard delete and private API denied`, async () => {
        const actor=actors[label]
        for (const method of ['POST','PATCH','DELETE']) {
          const before=await get('business_memberships',observer)
          const r=await http(`/rest/v1/business_memberships?user_id=eq.${actors['Customer A'].id}`,actor,method,method==='DELETE'?undefined:membershipBody,{Prefer:'return=representation'})
          assert.equal(r.status,403); assert.equal(r.data.code,'42501')
          assert.deepEqual(await get('business_memberships',observer),before)
        }
        for (const table of ['businesses','loyalty_settings']) await deny(table,actor,'POST',table==='businesses'?{name:'Attack',slug:'attack',timezone:'UTC'}:{business_id:A})
        for (const [table,id] of [['businesses',A],['loyalty_settings',A],['menu_categories',catA],['menu_items',itemA],['profiles',actor.id]]) await deny(table,actor,'DELETE',undefined,id)
        for (const [method,headers] of [['GET',{'Accept-Profile':'private'}],['POST',{'Content-Profile':'private'}],['PATCH',{'Content-Profile':'private'}],['DELETE',{'Content-Profile':'private'}]]) {
          const r=await http('/rest/v1/platform_admins',actor,method,['POST','PATCH'].includes(method)?{user_id:actor.id}:undefined,headers)
          assert.equal(r.status,406); assert.equal(r.data.code,'PGRST106')
        }
        for (const helper of ['is_business_admin','is_platform_admin']) {
          const r=await http(`/rest/v1/rpc/${helper}`,actor,'POST',helper==='is_business_admin'?{target_business_id:A}:{})
          assert.equal(r.status,404, 'No public RPC wrapper')
        }
      })
    }
    await t.test('Anon private schema GET/POST stays 406',async()=>{
      for (const [method,headers] of [['GET',{'Accept-Profile':'private'}],['POST',{'Content-Profile':'private'}]]) assert.equal((await http('/rest/v1/platform_admins',null,method,method==='POST'?{}:undefined,headers)).status,406)
    })
    for (const [label,own,other,category,item,foreignCategory,foreignItem] of [
      ['Admin Valhalla',A,B,catA,itemA,catB,itemB],['Admin B',B,A,catB,itemB,catA,itemA],
    ]) {
      await t.test(`${label}: own administration and symmetric tenant isolation`, async()=>{
        const actor=actors[label]
        const memberships=await get('business_memberships',actor)
        assert.equal(memberships.length,1); assert.equal(memberships[0].business_id,own)
        assert.equal((await get('profiles',actor)).length,1)
        if(own===B) assert.equal((await get('menu_items',actor,hiddenB)).length,1, 'Own drafts readable')
        await write('businesses',actor,{name:own===A?'Valhalla Space':'Business B TEST'},own)
        await write('loyalty_settings',actor,{currency_per_point:1500,points_enabled:false},own)
        await write('loyalty_settings',actor,{currency_per_point:1000,points_enabled:true},own)
        await write('menu_categories',actor,{name:'Admin category TEST',slug:own===A?'cervezas':'cervezas',display_order:10,is_active:true},category)
        await write('menu_items',actor,{name:'Admin item TEST',category_id:category,description:'TEST',price_amount:6500.5,image_path:`${own}/abcdef00-0000-4000-8000-000000000001.webp`,image_alt:'TEST',image_presentation:'cutout',is_available:false,is_featured:true,is_active:false,display_order:7},item)
        await write('menu_items',actor,{is_available:true,is_featured:false,is_active:true,image_path:null},item)
        const insertedCat=await insert('menu_categories',actor,{business_id:own,name:'TEST inserted',slug:`test-${randomUUID()}`,is_active:false})
        await insert('menu_items',actor,{business_id:own,category_id:insertedCat,name:'TEST inserted',price_amount:1,is_active:false})
        await deny('menu_categories',actor,'POST',{business_id:other,name:'Attack',slug:`test-${randomUUID()}`})
        await deny('menu_items',actor,'POST',{business_id:other,category_id:foreignCategory,name:'Attack',price_amount:0})
        for(const [table,id,body] of [['businesses',other,{name:'Attack'}],['loyalty_settings',other,{points_enabled:false}],['menu_categories',foreignCategory,{name:'Attack'}],['menu_items',foreignItem,{name:'Attack'}]]) await deny(table,actor,'PATCH',body,id)
        for(const [table,id] of [['menu_categories',category],['menu_items',item]]) {
          for(const body of [{business_id:other},{id:randomUUID()},{created_at:'2000-01-01'},{updated_at:'2000-01-01'}]) await deny(table,actor,'PATCH',body,id)
          const base=table==='menu_categories'?{business_id:own,name:'TEST',slug:`test-${randomUUID()}`}:{business_id:own,category_id:category,name:'TEST',price_amount:1}
          for(const body of [{id:randomUUID()},{created_at:'2000-01-01'},{updated_at:'2000-01-01'}]) await deny(table,actor,'POST',{...base,...body})
        }
        for(const [table,id,body] of [['businesses',own,{slug:'attack'}],['businesses',own,{currency_code:'USD'}],['businesses',own,{timezone:'UTC'}],['businesses',own,{is_active:false}],['businesses',own,{id:other}],['businesses',own,{created_at:'2000-01-01'}],['businesses',own,{updated_at:'2000-01-01'}],['loyalty_settings',own,{business_id:other}],['loyalty_settings',own,{created_at:'2000-01-01'}],['loyalty_settings',own,{updated_at:'2000-01-01'}]]) await deny(table,actor,'PATCH',body,id)
        for(const [body,code,status] of [[{category_id:foreignCategory},'23503',409],[{image_path:`${other}/abcdef00-0000-4000-8000-000000000001.png`},'23514',400],[{price_amount:-1},'23514',400]]) {
          const before=await stored('menu_items',item)
          const r=await mutation('menu_items',actor,'PATCH',body,item)
          assert.equal(r.status,status); assert.equal(r.data.code,code)
          assert.deepEqual(await stored('menu_items',item),before)
        }
      })
    }
    await t.test('Admin Both: both tenants independently; no re-home or cross-category',async()=>{
      const actor=actors['Admin Both']
      assert.equal((await get('business_memberships',actor)).length,2)
      for(const [business,category,item] of [[A,catA,itemA],[B,catB,itemB]]) {
        await write('menu_items',actor,{name:'Both admin TEST'},item)
        const newCategory=await insert('menu_categories',actor,{business_id:business,name:'Both TEST',slug:`test-${randomUUID()}`})
        await insert('menu_items',actor,{business_id:business,category_id:newCategory,name:'Both TEST',price_amount:2})
        await write('menu_categories',actor,{display_order:20},category)
        await deny('menu_items',actor,'PATCH',{business_id:business===A?B:A},item)
        await deny('menu_categories',actor,'PATCH',{business_id:business===A?B:A},category)
        const before=await stored('menu_items',item)
        const r=await mutation('menu_items',actor,'PATCH',{category_id:business===A?catB:catA},item)
        assert.equal(r.status,409); assert.equal(r.data.code,'23503'); assert.deepEqual(await stored('menu_items',item),before)
        const badInsert=await mutation('menu_items',actor,'POST',{business_id:business,category_id:business===A?catB:catA,name:'Attack',price_amount:0})
        assert.equal(badInsert.status,409); assert.equal(badInsert.data.code,'23503')
      }
    })
    for(const [label,business,category,item,otherItem] of [
      ['Admin Valhalla',A,catA,itemA,itemB],['Admin B',B,catB,itemB,itemA],
      ['Admin Both',A,catA,itemA,itemB],['Admin Both',B,catB,itemB,itemA],
    ]) {
      await t.test(`${label}/${business}: active writes -> inactive read-only -> privileged reactivation, SAME JWT`,async()=>{
        const actor=actors[label], originalToken=actor.token
        assert.equal((await get('businesses',actor,business))[0].is_active,true)
        const newCategory=await insert('menu_categories',actor,{business_id:business,name:'Active transition TEST',slug:`test-${randomUUID()}`,is_active:false})
        const newItem=await insert('menu_items',actor,{business_id:business,category_id:newCategory,name:'Active transition TEST',price_amount:1,is_active:false})
        await write('menu_categories',actor,{name:'Active edited TEST'},newCategory)
        await write('menu_items',actor,{name:'Active edited TEST'},newItem)
        // Fixture state change only, never an app endpoint for activation.
        localSql(`update public.businesses set is_active=false where id='${business}';`)
        try {
          assert.equal((await get('businesses',actor,business))[0].is_active,false)
          assert.equal((await get('loyalty_settings',actor,business)).length,1)
          for(const id of [category,newCategory]) assert.equal((await get('menu_categories',actor,id)).length,1)
          for(const id of [item,newItem]) assert.equal((await get('menu_items',actor,id)).length,1)
          await deny('menu_categories',actor,'POST',{business_id:business,name:'Inactive attack',slug:`test-${randomUUID()}`})
          await deny('menu_items',actor,'POST',{business_id:business,category_id:category,name:'Inactive attack',price_amount:1})
          for(const id of [category,newCategory]) await deny('menu_categories',actor,'PATCH',{name:'Inactive attack'},id)
          for(const id of [item,newItem]) await deny('menu_items',actor,'PATCH',{name:'Inactive attack'},id)
          await deny('businesses',actor,'PATCH',{name:'Inactive attack'},business)
          await deny('loyalty_settings',actor,'PATCH',{points_enabled:false},business)
          await deny('businesses',actor,'PATCH',{is_active:true},business)
          assert.equal((await get('businesses',observer,business))[0].is_active,false)
          await deny('menu_items',observer,'PATCH',{name:'Platform inactive attack'},item)
          if(label==='Admin Both') await write('menu_items',actor,{name:'Other active tenant TEST'},otherItem)
          assert.ok(actor.token===originalToken,'Same signed JWT; no refresh/login after deactivation')
        } finally {
          localSql(`update public.businesses set is_active=true where id='${business}';`)
        }
        await write('menu_categories',actor,{name:'Reactivated TEST'},newCategory)
        await write('menu_items',actor,{name:'Reactivated TEST'},newItem)
        assert.ok(actor.token===originalToken,'Same signed JWT after privileged fixture reactivation')
      })
    }
    await t.test('Initially inactive tenant: own read allowed; all business-scoped writes denied',async()=>{
      const actor=actors['Admin Both']
      localSql(`insert into public.business_memberships(business_id,user_id,role) values ('${C}','${actor.id}','admin');`)
      assert.equal((await get('businesses',actor,C)).length,1)
      assert.equal((await get('loyalty_settings',actor,C)).length,1)
      assert.equal((await get('menu_categories',actor,'cc330000-0000-4000-8000-000000000001')).length,1)
      assert.equal((await get('menu_items',actor,'1fc00000-0000-4000-8000-000000000001')).length,1)
      await deny('businesses',actor,'PATCH',{name:'Inactive attack'},C)
      await deny('loyalty_settings',actor,'PATCH',{points_enabled:false},C)
      await deny('menu_categories',actor,'POST',{business_id:C,name:'Inactive attack',slug:`test-${randomUUID()}`})
      await deny('menu_items',actor,'POST',{business_id:C,category_id:'cc330000-0000-4000-8000-000000000001',name:'Inactive attack',price_amount:1})
      await deny('menu_categories',actor,'PATCH',{name:'Inactive attack'},'cc330000-0000-4000-8000-000000000001')
      await deny('menu_items',actor,'PATCH',{name:'Inactive attack'},'1fc00000-0000-4000-8000-000000000001')
      await deny('businesses',actor,'PATCH',{is_active:true},C)
      localSql(`delete from public.business_memberships where business_id='${C}' and user_id='${actor.id}';`)
    })
    await t.test('Platform AAL2: global SELECT all six, no global writes; AAL1/Customer AAL2 not global',async()=>{
      assert.equal((await get('businesses',observer)).length,3)
      assert.equal((await get('loyalty_settings',observer)).length,3)
      assert.equal((await get('profiles',observer)).length,7)
      assert.equal((await get('business_memberships',observer)).length,4)
      assert.ok((await get('menu_categories',observer)).some(r=>!r.is_active))
      assert.ok((await get('menu_items',observer)).some(r=>r.id===hiddenB))
      for(const actor of [actors.Platform,actors['Customer AAL2']]) {
        assert.equal((await get('profiles',actor)).length,1)
        assert.deepEqual(await get('business_memberships',actor),[])
        assert.deepEqual(await get('menu_items',actor,hiddenB),[])
      }
      await write('profiles',observer,{display_name:'Platform self TEST'},observer.id)
      await deny('profiles',observer,'PATCH',{display_name:'Foreign attack'},actors['Customer A'].id)
      for(const [business,category,item] of [[A,catA,itemA],[B,catB,itemB],[C,'cc330000-0000-4000-8000-000000000001','1fc00000-0000-4000-8000-000000000001']]) {
        for(const [table,id,body] of [['businesses',business,{name:'Attack'}],['loyalty_settings',business,{points_enabled:false}],['menu_categories',category,{name:'Attack'}],['menu_items',item,{name:'Attack'}]]) await deny(table,observer,'PATCH',body,id)
        await deny('menu_categories',observer,'POST',{business_id:business,name:'Attack',slug:`test-${randomUUID()}`})
        await deny('menu_items',observer,'POST',{business_id:business,category_id:category,name:'Attack',price_amount:0})
      }
    })
    await t.test('Business membership revocation: SAME JWT, next write zero rows',async()=>{
      const actor=actors['Admin Valhalla'], originalToken=actor.token
      await write('menu_items',actor,{name:'Before revoke TEST'},itemA)
      localSql(`delete from public.business_memberships where business_id='${A}' and user_id='${actor.id}';`)
      await deny('menu_items',actor,'PATCH',{name:'After revoke attack'},itemA)
      await deny('menu_categories',actor,'POST',{business_id:A,name:'Attack',slug:`test-${randomUUID()}`})
      assert.deepEqual(await get('business_memberships',actor),[])
      assert.ok(actor.token===originalToken, 'Original JWT retained; no refresh/login')
    })
    await t.test('Platform/local membership independent, both revoked with SAME AAL2 JWT',async()=>{
      const actor=observer, originalToken=actor.token
      localSql(`insert into public.business_memberships(business_id,user_id,role) values ('${A}','${actor.id}','admin');`)
      await write('menu_items',actor,{name:'Platform + local TEST'},itemA)
      await deny('menu_items',actor,'PATCH',{name:'Other tenant attack'},itemB)
      localSql(`delete from public.business_memberships where business_id='${A}' and user_id='${actor.id}';`)
      assert.equal((await get('businesses',actor)).length,3)
      await deny('menu_items',actor,'PATCH',{name:'Local revoked attack'},itemA)
      localSql(`insert into public.business_memberships(business_id,user_id,role) values ('${A}','${actor.id}','admin'); delete from private.platform_admins where user_id='${actor.id}';`)
      assert.equal((await get('businesses',actor)).length,2, 'Global read removed, public read retained')
      assert.equal((await get('profiles',actor)).length,1)
      assert.equal((await get('business_memberships',actor)).length,1)
      assert.deepEqual(await get('menu_items',actor,hiddenB),[])
      // observer is now local-admin: assertion only on owned/public rows.
      await write('menu_items',actor,{name:'Local survives platform revoke TEST'},itemA)
      await deny('menu_items',actor,'PATCH',{name:'Foreign after revoke attack'},itemB)
      assert.ok(actor.token===originalToken,'Same originally issued AAL2 JWT throughout')
    })
  } finally {
    // Exact suite-created identities only. Cascades clean factors/sessions/memberships.
    for(const email of createdEmails) {
      assert.match(email,/^task2c-[0-9a-f-]{36}@example\.test$/)
      localSql(`delete from auth.users where email=${sqlLiteral(email)};`)
    }
    // Restore prior seed logical values; timestamps intentionally remain DB-owned.
    for(const [table,columns] of [['menu_items',['category_id','name','description','price_amount','image_path','image_alt','image_presentation','is_available','is_featured','is_active','display_order']],['menu_categories',['name','slug','display_order','is_active']],['loyalty_settings',['currency_per_point','points_enabled']],['businesses',['name']]]) {
      for(const row of original[table]) localSql(`update public.${table} t set ${columns.map(col=>`${col}=r.${col}`).join(',')} from json_populate_record(null::public.${table},${sqlLiteral(JSON.stringify(row))}::json) r where t.${pk(table)}=r.${pk(table)};`)
    }
    for(const table of ['menu_items','menu_categories']) for(const id of createdRows[table]) {
      assert.match(id,/^[0-9a-f-]{36}$/)
      localSql(`delete from public.${table} where id='${id}';`)
    }
    localSql(`begin; delete from public.menu_items where business_id in ('${B}','${C}'); delete from public.menu_categories where business_id in ('${B}','${C}'); delete from public.loyalty_settings where business_id in ('${B}','${C}'); delete from public.businesses where id in ('${B}','${C}'); commit;`)
  }
})
