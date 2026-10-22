// Exclusive, disposable LOCAL. Normal GoTrue signup/confirmation; real signed JWTs.
import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {writeFileSync} from 'node:fs'
import {spawn} from 'node:child_process'
import {localRuntime,localSql} from '../scripts/local-runtime.mjs'
import {http,signup,mfa} from '../scripts/auth-test-runtime.mjs'
import {png,storageRequest} from '../scripts/storage-test-runtime.mjs'
localRuntime()
const A='a11a0000-0000-4000-8000-000000000001',q=s=>`'${s.replaceAll("'","''")}'`
const rpc=(name,actor,body)=>http(`/rest/v1/rpc/${name}`,actor,'POST',body)
const ok=r=>{assert.equal(r.status,200,r.data?.message??'Expected success');return r.data}
const deny=(r,status=403)=>{assert.equal(r.status,status);return r.data}
function queuedRevocation(){
  let ready,done,failReady,failDone,buffer=''
  const locked=new Promise((resolve,reject)=>{ready=resolve;failReady=reject}),completed=new Promise((resolve,reject)=>{done=resolve;failDone=reject})
  const child=spawn('docker',['exec','-i','supabase_db_canjeproyect','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{windowsHide:true,stdio:['pipe','pipe','pipe']})
  child.stdout.on('data',part=>{buffer+=part;if(buffer.includes('CAPABILITY_LOCKED'))ready()})
  child.stderr.resume();child.on('error',()=>{failReady(Error('LOCAL lock helper failed'));failDone(Error('LOCAL lock helper failed'))})
  child.on('close',code=>{if(code===0)done();else{failReady(Error('LOCAL revocation failed'));failDone(Error('LOCAL revocation failed'))}})
  child.stdin.end(`begin;select loyalty_enabled from public.business_entitlements where business_id=${q(A)} for update;\n\\echo CAPABILITY_LOCKED\nselect pg_sleep(1);update public.business_entitlements set loyalty_enabled=false where business_id=${q(A)};commit;`)
  return {locked,completed}
}

test('SaaS LOCAL: provisioning, capabilities, isolation and immutable economy',{concurrency:false},async t=>{
  assert.equal(localSql('select (select count(*) from auth.users)+(select count(*) from public.point_transactions)+(select count(*) from storage.objects);'),'0','Exclusive fresh LOCAL required; no implicit reset')
  const actors={},users=[],emails=[],businesses=[A]
  const manifest=()=>writeFileSync(new URL('../.temp/sprint3b-fixtures.json',import.meta.url),JSON.stringify({version:1,localOnly:true,users,emails,businesses,economicFixtures:true}))
  let B,code,credit,reversal,creditBody,reverseBody,categoryId,itemId
  try{
    for(const name of ['adminA','adminB','both','staff','customer','other','platform']){const pending=await signup();emails.push(pending.email);manifest();actors[name]=await pending.create();users.push(actors[name].id);manifest()}
    code=ok(await http(`/rest/v1/profiles?select=customer_code&id=eq.${actors.customer.id}`,actors.customer))[0].customer_code
    await t.test('Existing entitlement backfill; atomic owner-only provisioning with complete defaults',async()=>{
      assert.equal(localSql(`select loyalty_enabled from public.business_entitlements where business_id=${q(A)};`),'t')
      B=localSql(`select private.provision_business(${q(actors.adminB.id)},'Café Demo LOCAL','cafe-demo',false,'America/Argentina/Cordoba');`);businesses.push(B);manifest()
      const config=JSON.parse(localSql(`select json_build_object('admin',(select count(*) from public.business_memberships where business_id=${q(B)} and user_id=${q(actors.adminB.id)} and role='admin'),'presentation',(select count(*) from public.business_presentation where business_id=${q(B)}),'loyalty',(select loyalty_enabled from public.business_entitlements where business_id=${q(B)}),'operational',(select points_enabled from public.loyalty_settings where business_id=${q(B)}));`))
      assert.deepEqual(config,{admin:1,presentation:1,loyalty:false,operational:false})
      const before=localSql('select count(*) from public.businesses;')
      for(const sql of [`select private.provision_business(${q(actors.customer.id)},'Reserved','login',false);`,`select private.provision_business(${q(randomUUID())},'Unconfirmed','invalid-owner',true);`,`select private.provision_business(${q(actors.adminB.id)},'Timezone','invalid-zone',false,'Not/AZone');`])assert.throws(()=>localSql(sql))
      assert.equal(localSql('select count(*) from public.businesses;'),before,'Failed provisioning leaves no partial rows or membership')
      assert.equal(localSql("select has_function_privilege('authenticated','private.provision_business(uuid,text,text,boolean,text)','EXECUTE');"),'f')
      assert.equal((await rpc('provision_business',actors.adminB,{owner_user_id:actors.adminB.id,business_name:'Escalation',business_slug:'escalation'})).status,404)
      assert.equal((await http('/rest/v1/businesses',actors.adminB,'POST',{name:'Escalation',slug:'escalation',timezone:'UTC'})).status,403)
      localSql(`insert into public.business_memberships(business_id,user_id,role) values (${q(A)},${q(actors.adminA.id)},'admin'),(${q(A)},${q(actors.staff.id)},'staff'),(${q(A)},${q(actors.both.id)},'admin'),(${q(B)},${q(actors.both.id)},'admin');insert into private.platform_admins(user_id) values (${q(actors.platform.id)});`)
    })
    await t.test('Public menus are independent; merchant can maintain only own categories/products',async()=>{
      const category=await http('/rest/v1/menu_categories?select=id',actors.adminB,'POST',{business_id:B,name:'Cafetería',slug:'cafeteria'}, {Prefer:'return=representation'})
      assert.equal(category.status,201);categoryId=category.data[0].id
      const item=await http('/rest/v1/menu_items?select=id',actors.adminB,'POST',{business_id:B,category_id:categoryId,name:'Café de prueba LOCAL',price_amount:2500.50},{Prefer:'return=representation'})
      assert.equal(item.status,201);itemId=item.data[0].id
      const menu=ok(await http(`/rest/v1/menu_items?select=id,price_amount&business_id=eq.${B}`,null));assert.equal(menu.length,1);assert.equal(menu[0].price_amount,2500.50)
      const noWrite=await http(`/rest/v1/menu_items?id=eq.${itemId}&business_id=eq.${B}&select=id`,actors.adminA,'PATCH',{price_amount:1},{Prefer:'return=representation'})
      assert.equal(noWrite.status,200);assert.deepEqual(noWrite.data,[])
      deny(await http('/rest/v1/menu_items',actors.adminA,'POST',{business_id:B,category_id:categoryId,name:'Cross-tenant',price_amount:1}))
      deny(await http('/rest/v1/menu_categories',actors.staff,'POST',{business_id:A,name:'Forbidden',slug:'forbidden'}))
      assert.equal(localSql(`select price_amount from public.menu_items where id=${q(itemId)};`),'2500.50')
      const both=ok(await http(`/rest/v1/business_memberships?select=business_id&user_id=eq.${actors.both.id}`,actors.both));assert.deepEqual(both.map(b=>b.business_id).sort(),[A,B].sort())
    })
    await t.test('Presentation RLS/grants: own Admin only; no cross-tenant, Staff or feature escalation',async()=>{
      const path=`/rest/v1/business_presentation?business_id=eq.${B}&select=business_id,template,city`
      const own=ok(await http(path,actors.adminB,'PATCH',{template:'light',accent:'teal',city:'Córdoba',instagram_handle:'cafe.demo'},{Prefer:'return=representation'}));assert.equal(own[0].template,'light')
      for(const actor of [actors.adminA,actors.staff,actors.customer]){const r=await http(path,actor,'PATCH',{city:'Forbidden'},{Prefer:'return=representation'});assert.equal(r.status,200);assert.deepEqual(r.data,[])}
      deny(await http('/rest/v1/business_presentation',actors.adminB,'POST',{business_id:B}))
      deny(await http(`/rest/v1/business_entitlements?business_id=eq.${B}`,actors.adminB,'PATCH',{loyalty_enabled:true}))
      deny(await http('/rest/v1/business_entitlements',actors.adminB,'POST',{business_id:B,loyalty_enabled:true}))
      deny(await http(path,actors.adminB,'PATCH',{business_id:A}))
      deny(await http(path,actors.adminB,'PATCH',{website_url:'javascript:alert(1)'}),400)
      deny(await http(path,actors.adminB,'PATCH',{logo_path:`${A}/${randomUUID()}.png`}),400)
      assert.equal(localSql(`select city from public.business_presentation where business_id=${q(B)};`),'Córdoba')
      const upload=await storageRequest(`object/menu-images/${A}/${randomUUID()}.png`,actors.staff,'POST',png);assert.ok(upload.status>=400);assert.equal(localSql('select count(*) from storage.objects;'),'0')
    })
    await t.test('Menu-only module cannot be obtained by enabling operational points or calling RPC directly',async()=>{
      const settings=await http(`/rest/v1/loyalty_settings?business_id=eq.${B}`,actors.adminB,'PATCH',{points_enabled:true});assert.equal(settings.status,204)
      for(const name of ['lookup_loyalty_customer','credit_points']){
        const body={business_id:B,customer_code:code,...(name==='credit_points'?{paid_amount:'6500',request_id:randomUUID()}: {})}
        assert.equal(deny(await rpc(name,actors.adminB,body)).message,'loyalty_not_contracted')
      }
      assert.equal(localSql('select count(*) from public.point_transactions;'),'0')
    })
    await t.test('Economic authority, precision and concurrent idempotency remain intact',async()=>{
      creditBody={business_id:A,customer_code:code,paid_amount:'6500.00',request_id:randomUUID(),reference:'SAAS LOCAL'}
      deny(await rpc('credit_points',actors.customer,creditBody));deny(await rpc('credit_points',actors.adminB,creditBody))
      const ownCode=ok(await http(`/rest/v1/profiles?select=customer_code&id=eq.${actors.adminA.id}`,actors.adminA))[0].customer_code
      deny(await rpc('credit_points',actors.adminA,{...creditBody,customer_code:ownCode}))
      for(const amount of ['6500.001','6500.000',6500,'1e3','NaN'])deny(await rpc('credit_points',actors.staff,{...creditBody,paid_amount:amount}),400)
      const results=await Promise.all(Array.from({length:8},()=>rpc('credit_points',actors.staff,creditBody)));const receipts=results.map(ok)
      assert.equal(new Set(receipts.map(r=>r.id)).size,1);credit=receipts[0];assert.equal(credit.points_delta,'6');assert.equal(credit.currency_per_point,'1000.00')
      assert.deepEqual(ok(await rpc('credit_points',actors.staff,creditBody)),credit)
      deny(await rpc('credit_points',actors.staff,{...creditBody,paid_amount:'7000'}),409)
      assert.equal(ok(await rpc('get_my_loyalty',actors.customer,{business_id:A})).balance,'6')
      assert.equal(ok(await rpc('get_my_loyalty',actors.customer,{business_id:B})).balance,'0')
      assert.deepEqual(ok(await rpc('get_my_loyalty',actors.other,{business_id:A})).history,[])
    })
    await t.test('A credit queued behind commercial revocation cannot use the old capability snapshot',async()=>{
      const before=localSql('select count(*) from public.point_transactions;'),lock=queuedRevocation()
      await lock.locked
      const pending=rpc('credit_points',actors.staff,{...creditBody,request_id:randomUUID()})
      await lock.completed
      assert.equal(deny(await pending).message,'loyalty_not_contracted')
      assert.equal(localSql('select count(*) from public.point_transactions;'),before)
      localSql(`update public.business_entitlements set loyalty_enabled=true where business_id=${q(A)};`)
    })
    await t.test('Commercial revocation on SAME JWT blocks new operations; original receipt/history survives',async()=>{
      localSql(`update public.business_entitlements set loyalty_enabled=false where business_id=${q(A)};`)
      const before=localSql('select count(*) from public.point_transactions;')
      deny(await rpc('credit_points',actors.staff,{...creditBody,request_id:randomUUID()}))
      deny(await rpc('lookup_loyalty_customer',actors.staff,{business_id:A,customer_code:code}))
      reverseBody={business_id:A,original_id:credit.id,reason:'SAAS LOCAL correction',request_id:randomUUID()}
      deny(await rpc('reverse_credit',actors.adminA,reverseBody))
      assert.deepEqual(ok(await rpc('credit_points',actors.staff,creditBody)),credit,'Recovery is a read, not a new credit')
      assert.equal(ok(await rpc('get_my_loyalty',actors.customer,{business_id:A})).balance,'6')
      assert.equal(ok(await rpc('get_loyalty_history',actors.staff,{business_id:A})).history.length,1)
      assert.equal(localSql('select count(*) from public.point_transactions;'),before)
      localSql(`update public.business_entitlements set loyalty_enabled=true where business_id=${q(A)};`)
    })
    await t.test('Admin-only full reversal, concurrent replay and disabled-module reversal recovery',async()=>{
      deny(await rpc('reverse_credit',actors.staff,reverseBody))
      const rows=(await Promise.all(Array.from({length:6},()=>rpc('reverse_credit',actors.adminA,reverseBody)))).map(ok)
      assert.equal(new Set(rows.map(r=>r.id)).size,1);reversal=rows[0];assert.equal(reversal.points_delta,'-6');assert.equal(reversal.reverses_id,credit.id)
      localSql(`update public.business_entitlements set loyalty_enabled=false where business_id=${q(A)};`)
      assert.deepEqual(ok(await rpc('reverse_credit',actors.adminA,reverseBody)),reversal)
      assert.equal(ok(await rpc('get_my_loyalty',actors.customer,{business_id:A})).balance,'0')
      localSql(`update public.business_entitlements set loyalty_enabled=true where business_id=${q(A)};`)
      assert.equal(localSql('select count(*) from public.point_transactions;'),'2')
    })
    await t.test('Membership revocation SAME JWT, privacy and immutable ledger remain authoritative',async()=>{
      localSql(`delete from public.business_memberships where business_id=${q(A)} and user_id=${q(actors.staff.id)};`)
      deny(await rpc('credit_points',actors.staff,{...creditBody,request_id:randomUUID()}));deny(await rpc('credit_points',actors.staff,creditBody));deny(await rpc('get_loyalty_history',actors.staff,{business_id:A}))
      const history=ok(await rpc('get_my_loyalty',actors.customer,{business_id:A}));assert.equal(history.history.length,2)
      for(const row of history.history)for(const field of ['customer_id','actor_id','email'])assert.ok(!(field in row))
      deny(await http('/rest/v1/point_transactions',actors.adminA));deny(await http('/rest/v1/point_transactions',actors.adminA,'POST',{}));deny(await http(`/rest/v1/point_transactions?id=eq.${credit.id}`,actors.adminA,'PATCH',{points_delta:99}))
      assert.throws(()=>localSql(`update public.point_transactions set points_delta=99 where id=${q(credit.id)};`))
      assert.equal(localSql(`select points_delta from public.point_transactions where id=${q(credit.id)};`),'6')
      localSql(`insert into public.business_memberships(business_id,user_id,role) values (${q(A)},${q(actors.staff.id)},'staff');`)
    })
    await t.test('Platform AAL2 still reads only; inactive businesses hidden publicly, own Admin read retained',async()=>{
      localSql(`update public.businesses set is_active=false where id=${q(B)};`)
      assert.deepEqual(ok(await http(`/rest/v1/businesses?select=id&id=eq.${B}`,null)),[])
      assert.deepEqual(ok(await http(`/rest/v1/business_presentation?select=business_id&business_id=eq.${B}`,actors.platform)),[])
      const elevated=await mfa(actors.platform)
      assert.equal(ok(await http(`/rest/v1/business_presentation?select=business_id&business_id=eq.${B}`,elevated)).length,1)
      assert.deepEqual(ok(await http(`/rest/v1/business_presentation?business_id=eq.${B}&select=business_id`,elevated,'PATCH',{city:'Platform write'},{Prefer:'return=representation'})),[])
      deny(await http(`/rest/v1/business_entitlements?business_id=eq.${B}`,elevated,'PATCH',{loyalty_enabled:true}))
      deny(await rpc('credit_points',elevated,creditBody));deny(await rpc('get_loyalty_history',elevated,{business_id:A}))
      assert.equal(ok(await http(`/rest/v1/businesses?select=id&id=eq.${B}`,actors.adminB)).length,1)
      localSql(`update public.businesses set is_active=true where id=${q(B)};delete from private.platform_admins where user_id=${q(actors.platform.id)};`)
    })
  }finally{manifest()}
})
