// Disposable LOCAL only. Real Auth/confirmation/JWT. No token or password logging.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { localRuntime, localSql } from '../scripts/local-runtime.mjs'
import { http, signup, mfa } from '../scripts/auth-test-runtime.mjs'
import { png, storageRequest } from '../scripts/storage-test-runtime.mjs'

localRuntime()
const A = 'a11a0000-0000-4000-8000-000000000001', B = randomUUID()
const quote = value => `'${value.replaceAll("'", "''")}'`
const rpc = (name, actor, body) => http(`/rest/v1/rpc/${name}`, actor, 'POST', body)
const ok = response => { assert.equal(response.status,200,response.data?.message ?? 'RPC success'); return response.data }
const denied = (response, status=403) => { assert.equal(response.status,status); return response.data }
const codeOf = async actor => { const r=await http('/rest/v1/profiles?select=customer_code',actor); assert.equal(r.status,200); assert.equal(r.data.length,1); return r.data[0].customer_code }

test('Sprint 3B real LOCAL economic RPC contract', {concurrency:false}, async t => {
  assert.equal(localSql('select (select count(*) from auth.users)+(select count(*) from public.point_transactions)+(select count(*) from public.business_memberships)+(select count(*) from private.platform_admins)+(select count(*) from storage.objects);'),'0','Fresh disposable LOCAL required; never reset human data implicitly')
  assert.equal(localSql('select string_agg(id::text,\',\' order by id) from public.businesses;'),A)
  const actors={}, ids=[], emails=[], pendingId=randomUUID()
  // Kept for explicit guarded LOCAL reset; deleting ledger fixtures would violate its contract.
  const manifest = () => writeFileSync(new URL('../.temp/sprint3b-fixtures.json',import.meta.url),JSON.stringify({version:1,localOnly:true,users:ids,emails,businesses:[A,B],economicFixtures:true}))
  try {
    for (const name of ['adminA','adminB','staffA','customer','other','platform']) {
      const pending=await signup(); emails.push(pending.email); manifest()
      const actor=await pending.create(); actors[name]=actor; ids.push(actor.id); manifest()
    }
    ids.push(pendingId); manifest()
    localSql(`begin;
      insert into public.businesses(id,slug,name,timezone) values (${quote(B)},'loyalty-fixture-b','LOCAL fixture B','America/Argentina/Cordoba');
      insert into public.loyalty_settings(business_id,currency_per_point) values (${quote(B)},2000.00);
      -- This legacy economic fixture contracts loyalty explicitly; new businesses default to menu-only.
      update public.business_entitlements set loyalty_enabled=true where business_id=${quote(B)};
      insert into public.business_memberships(business_id,user_id,role) values
        (${quote(A)},${quote(actors.adminA.id)},'admin'),(${quote(B)},${quote(actors.adminB.id)},'admin'),(${quote(A)},${quote(actors.staffA.id)},'staff');
      insert into private.platform_admins(user_id) values (${quote(actors.platform.id)});
      insert into auth.users(id) values (${quote(pendingId)});
      commit;`)
    const codes={}; for (const [name,actor] of Object.entries(actors)) codes[name]=await codeOf(actor)
    const pendingCode=localSql(`select customer_code from public.profiles where id=${quote(pendingId)};`)
    const creditBody=(amount, options={})=>({business_id:A,customer_code:codes.customer,paid_amount:amount,request_id:randomUUID(),...options})
    const credit=async (amount,actor=actors.staffA,options={})=>ok(await rpc('credit_points',actor,creditBody(amount,options)))
    const own=async (actor=actors.customer,extra={})=>ok(await rpc('get_my_loyalty',actor,{business_id:A,...extra}))
    let first, concurrent, reversed

    await t.test('Secure generated codes, exact resolver and no profile enumeration',async()=>{
      assert.equal(new Set(Object.values(codes)).size,6)
      for(const code of Object.values(codes)) assert.match(code,/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/)
      const formatted=codes.customer.slice(0,4)+'-'+codes.customer.slice(4,8)+'-'+codes.customer.slice(8)
      const r=ok(await rpc('lookup_loyalty_customer',actors.staffA,{business_id:A,customer_code:formatted.toLowerCase()}))
      assert.deepEqual(Object.keys(r).sort(),['customer_code','display_name']); assert.equal(r.customer_code,codes.customer)
      denied(await rpc('lookup_loyalty_customer',actors.staffA,{business_id:A,customer_code:codes.customer.slice(0,4)}),400)
      denied(await rpc('lookup_loyalty_customer',actors.customer,{business_id:A,customer_code:codes.other}))
      denied(await rpc('lookup_loyalty_customer',actors.staffA,{business_id:B,customer_code:codes.customer}))
      denied(await rpc('lookup_loyalty_customer',actors.staffA,{business_id:A,customer_code:pendingCode}),404)
      localSql(`update auth.users set banned_until=now()+interval '1 hour' where id=${quote(actors.other.id)};`)
      denied(await rpc('lookup_loyalty_customer',actors.staffA,{business_id:A,customer_code:codes.other}),404)
      denied(await rpc('credit_points',actors.staffA,{business_id:A,customer_code:codes.other,paid_amount:'1000',request_id:randomUUID()}),404)
      localSql(`update auth.users set banned_until=null where id=${quote(actors.other.id)};`)
      const profiles=await http('/rest/v1/profiles?select=id,customer_code',actors.staffA)
      assert.equal(profiles.status,200); assert.deepEqual(profiles.data.map(p=>p.id),[actors.staffA.id])
      denied(await http(`/rest/v1/profiles?id=eq.${actors.staffA.id}`,actors.staffA,'PATCH',{customer_code:codes.other}))
    })

    await t.test('Exact money validation BEFORE coercion, rounding or economic insertion',async()=>{
      const before=localSql('select count(*) from public.point_transactions;')
      for(const amount of ['1000.001','1000.000','999.999','1e3','NaN','Infinity','-1','0','1000000000000','1,00',' 1000',1000,1000.001,null,{},[]]) {
        denied(await rpc('credit_points',actors.staffA,creditBody(amount)),400)
      }
      assert.equal(localSql('select count(*) from public.point_transactions;'),before)
      first=await credit('1999.99'); assert.equal(first.points_delta,'1'); assert.equal(first.paid_amount,'1999.99'); assert.equal(first.currency_per_point,'1000.00')
      assert.equal((await credit('13000.00')).points_delta,'13','Total transaction, not sum of product badges')
      assert.equal((await credit('999999999999.99')).points_delta,'999999999')
      assert.equal((await credit('0.01')).points_delta,'0')
      assert.equal((await credit('600.00')).points_delta,'0'); assert.equal((await credit('600.00')).points_delta,'0','No carry across transactions')
    })

    await t.test('No self-credit, no Customer/Platform write authority, invalid/unconfirmed recipient denied',async()=>{
      for(const name of ['adminA','staffA']) denied(await rpc('credit_points',actors[name],creditBody('1000',{customer_code:codes[name]})))
      denied(await rpc('credit_points',actors.customer,creditBody('1000')))
      denied(await rpc('credit_points',actors.staffA,creditBody('1000',{customer_code:pendingCode})),404)
      denied(await rpc('credit_points',actors.staffA,creditBody('1000',{customer_code:'AAAAAAAAAA'})),404)
      const platformAal2=await mfa(actors.platform)
      denied(await rpc('credit_points',platformAal2,creditBody('1000')))
      denied(await rpc('get_loyalty_history',platformAal2,{business_id:A}))
      assert.deepEqual((await http('/rest/v1/point_transactions?select=*',platformAal2)).status,403)
    })

    await t.test('Concurrent duplicate credit and response-loss retry return exactly one immutable operation',async()=>{
      const body=creditBody('2300.50',{reference:'LOCAL receipt'})
      const results=await Promise.all(Array.from({length:12},()=>rpc('credit_points',actors.staffA,body)))
      const receipts=results.map(ok); assert.equal(new Set(receipts.map(r=>r.id)).size,1)
      concurrent=receipts[0]; assert.equal(concurrent.points_delta,'2')
      assert.equal(localSql(`select count(*) from public.point_transactions where request_id=${quote(body.request_id)};`),'1')
      // Cancel the HTTP response without consuming the committed receipt, then
      // recover through the same request id. No assumption that abort rolled back DB.
      const lostBody=creditBody('3000'), loss=new AbortController(), runtime=localRuntime()
      await fetch(`${runtime.url}/rest/v1/rpc/credit_points`,{method:'POST',signal:loss.signal,
        headers:{apikey:runtime.publishableKey,Authorization:`Bearer ${actors.staffA.token}`,'Content-Type':'application/json'},body:JSON.stringify(lostBody)})
      loss.abort()
      const recovered=ok(await rpc('credit_points',actors.staffA,lostBody))
      assert.equal(localSql(`select count(*) from public.point_transactions where request_id=${quote(lostBody.request_id)};`),'1')
      assert.equal(recovered.points_delta,'3')
      const before=localSql(`select row_to_json(t)::text from public.point_transactions t where id=${quote(concurrent.id)};`)
      assert.deepEqual(ok(await rpc('credit_points',actors.staffA,{...body,paid_amount:'02300.50'})),concurrent)
      for(const patch of [{paid_amount:'2400'},{customer_code:codes.other},{reference:'Different'}]) denied(await rpc('credit_points',actors.staffA,{...body,...patch}),409)
      denied(await rpc('credit_points',actors.adminA,body),409,'Another actor cannot take over an intent')
      assert.equal(localSql(`select row_to_json(t)::text from public.point_transactions t where id=${quote(concurrent.id)};`),before)
      const race=creditBody('1000'), outcomes=await Promise.all([rpc('credit_points',actors.staffA,race),rpc('credit_points',actors.staffA,{...race,paid_amount:'2000'})])
      assert.deepEqual(outcomes.map(r=>r.status).sort(),[200,409])
    })

    await t.test('Tenant isolation and independent settings snapshots',async()=>{
      denied(await rpc('credit_points',actors.staffA,creditBody('1000',{business_id:B})))
      const b=ok(await rpc('credit_points',actors.adminB,creditBody('5000',{business_id:B,request_id:first.request_id})))
      assert.equal(b.points_delta,'2'); assert.equal(b.currency_per_point,'2000.00')
      denied(await rpc('reverse_credit',actors.adminB,{business_id:B,original_id:first.id,reason:'Wrong tenant',request_id:randomUUID()}),404)
      assert.equal((await own(actors.customer,{business_id:B})).balance,'2')
      assert.deepEqual((await own(actors.other)).history,[])
    })

    await t.test('Disabled/inactive business stops NEW writes, existing intent still recovers original receipt',async()=>{
      const body=creditBody('5000'), receipt=ok(await rpc('credit_points',actors.staffA,body))
      localSql(`update public.loyalty_settings set points_enabled=false,currency_per_point=1500 where business_id=${quote(A)};`)
      denied(await rpc('credit_points',actors.staffA,creditBody('1000')))
      assert.deepEqual(ok(await rpc('credit_points',actors.staffA,body)),receipt)
      const corrected=ok(await rpc('reverse_credit',actors.adminA,{business_id:A,original_id:receipt.id,reason:'Disabled program correction',request_id:randomUUID()}))
      assert.equal(corrected.points_delta,'-5'); assert.equal(corrected.currency_per_point,'1000.00')
      localSql(`update public.businesses set is_active=false where id=${quote(A)};`)
      denied(await rpc('credit_points',actors.staffA,creditBody('1000')))
      denied(await rpc('reverse_credit',actors.adminA,{business_id:A,original_id:first.id,reason:'Inactive correction',request_id:randomUUID()}))
      assert.deepEqual(ok(await rpc('credit_points',actors.staffA,body)),receipt,'Recovery performs no economic write')
      assert.ok((await own()).history.length>0,'Own history survives inactive program/business')
      const staffBusiness=await http(`/rest/v1/businesses?id=eq.${A}&select=id,is_active`,actors.staffA)
      assert.equal(staffBusiness.status,200); assert.equal(staffBusiness.data[0].is_active,false)
      localSql(`update public.businesses set is_active=true where id=${quote(A)}; update public.loyalty_settings set points_enabled=true,currency_per_point=1000 where business_id=${quote(A)};`)
    })

    await t.test('Concurrent complete reversals are atomic, unique and idempotent',async()=>{
      denied(await rpc('reverse_credit',actors.staffA,{business_id:A,original_id:concurrent.id,reason:'Forbidden',request_id:randomUUID()}))
      const body={business_id:A,original_id:concurrent.id,reason:'LOCAL correction',request_id:randomUUID()}
      const results=await Promise.all(Array.from({length:8},()=>rpc('reverse_credit',actors.adminA,body)))
      const receipts=results.map(ok); assert.equal(new Set(receipts.map(r=>r.id)).size,1); reversed=receipts[0]
      assert.equal(reversed.points_delta,'-2'); assert.equal(reversed.paid_amount,concurrent.paid_amount); assert.equal(reversed.reverses_id,concurrent.id)
      denied(await rpc('reverse_credit',actors.adminA,{...body,reason:'Different'}),409)
      denied(await rpc('reverse_credit',actors.adminA,{...body,request_id:randomUUID()}),409)
      denied(await rpc('reverse_credit',actors.adminA,{...body,request_id:randomUUID(),original_id:reversed.id}),404)
      const zero=await credit('10'), zeroReverse=ok(await rpc('reverse_credit',actors.adminA,{business_id:A,original_id:zero.id,reason:'Zero point correction',request_id:randomUUID()}))
      assert.equal(zeroReverse.points_delta,'0')
      const other=await credit('4500'), different=await Promise.all([0,1].map(()=>rpc('reverse_credit',actors.adminA,{business_id:A,original_id:other.id,reason:'Competing correction',request_id:randomUUID()})))
      assert.deepEqual(different.map(r=>r.status).sort(),[200,409]); assert.equal(localSql(`select count(*) from public.point_transactions where reverses_id=${quote(other.id)};`),'1')
    })

    await t.test('Full ledger balance, paginated history and minimal per-role privacy',async()=>{
      const adminOnly=await credit('1200',actors.adminA)
      const page=await own(actors.customer,{page_size:2})
      const expected=localSql(`select coalesce(sum(points_delta),0)::text from public.point_transactions where business_id=${quote(A)} and customer_id=${quote(actors.customer.id)};`)
      assert.equal(page.balance,expected); assert.equal(page.history.length,2)
      const cursor=page.history.at(-1), next=await own(actors.customer,{page_size:2,before_time:cursor.created_at,before_id:cursor.id})
      assert.equal(next.balance,expected); assert.ok(next.history.every(r=>!page.history.some(first=>first.id===r.id)))
      for(const row of page.history) { assert.ok(!('actor_id' in row)); assert.ok(!('customer_id' in row)); assert.ok(!('email' in row)) }
      const staffHistory=ok(await rpc('get_loyalty_history',actors.staffA,{business_id:A})).history
      assert.ok(staffHistory.some(r=>r.id===reversed.id)); assert.ok(!staffHistory.some(r=>r.id===adminOnly.id)); assert.ok(staffHistory.every(r=>!('actor_id' in r)))
      const adminHistory=ok(await rpc('get_loyalty_history',actors.adminA,{business_id:A})).history
      assert.ok(adminHistory.some(r=>r.id===adminOnly.id)); assert.ok(adminHistory.every(r=>typeof r.actor_id==='string' && !('email' in r)))
      denied(await rpc('get_loyalty_history',actors.customer,{business_id:A}))
      denied(await rpc('get_loyalty_history',actors.adminB,{business_id:A}))
      for(const body of [{page_size:0},{page_size:101},{page_size:null},{before_id:first.id}]) denied(await rpc('get_my_loyalty',actors.customer,{business_id:A,...body}),400)
      const forged=await rpc('get_my_loyalty',actors.other,{business_id:A,customer_id:actors.customer.id})
      assert.ok(forged.status>=400,'No user-targeting parameter accepted')
    })

    await t.test('Staff cannot mutate catalog/settings/Storage/memberships; direct ledger access and arbitrary RPCs denied',async()=>{
      const ledgerBefore=localSql('select count(*) from public.point_transactions;')
      const forgedLedger={business_id:A,customer_id:actors.customer.id,customer_code:codes.customer,actor_id:actors.staffA.id,
        actor_role:'staff',entry_type:'credit',paid_amount:'999000.00',currency_per_point:'1000.00',points_delta:999,request_id:randomUUID()}
      for(const actor of [actors.customer,actors.staffA,actors.adminA]) {
        denied(await http('/rest/v1/point_transactions?select=*',actor))
        for(const method of ['POST','PATCH','DELETE']) {
          const path='/rest/v1/point_transactions'+(method==='POST'?'':`?id=eq.${first.id}`)
          const r=await http(path,actor,method,method==='DELETE'?undefined:method==='POST'?forgedLedger:{points_delta:999})
          // PostgREST may hide non-granted columns from its schema cache before
          // SQL permissions are checked. That denial is distinct from bad money,
          // NOT NULL or other invalid-input errors; use a valid insertion above.
          assert.ok((r.status===403 && ['42501','PT403'].includes(r.data?.code))
            || (r.status===400 && r.data?.code==='PGRST204'),`Direct ${method} denied by authority/schema exposure: ${r.status}/${r.data?.code}`)
        }
      }
      assert.equal(localSql('select count(*) from public.point_transactions;'),ledgerBefore,'Denied direct writes leave the ledger intact')
      for(const [table,body] of [['businesses',{name:'Forged'}],['loyalty_settings',{currency_per_point:1}],['menu_categories',{name:'Forged'}],['menu_items',{name:'Forged'}]]) {
        const key=table==='businesses'?'id':'business_id'
        const orderKey=table==='loyalty_settings'?'business_id':'id'
        const before=localSql(`select json_agg(t order by t.${orderKey})::text from public.${table} t where ${key}=${quote(A)};`)
        const r=await http(`/rest/v1/${table}?${key}=eq.${A}`,actors.staffA,'PATCH',body,{Prefer:'return=representation'})
        assert.equal(r.status,200,`Valid scoped ${table} update: ${r.data?.code ?? ''} ${r.data?.message ?? ''}`)
        assert.deepEqual(r.data,[],'RLS denies affected rows')
        assert.equal(localSql(`select json_agg(t order by t.${orderKey})::text from public.${table} t where ${key}=${quote(A)};`),before,'Denied Staff patch preserves data')
      }
      denied(await http('/rest/v1/business_memberships',actors.staffA,'POST',{business_id:A,user_id:actors.other.id,role:'admin'}))
      denied(await http('/rest/v1/menu_categories',actors.staffA,'POST',{business_id:A,name:'Denied fixture',slug:'denied-fixture'}))
      const listed=await http('/storage/v1/object/list/menu-images',actors.staffA,'POST',{prefix:A})
      assert.equal(listed.status,200); assert.deepEqual(listed.data,[])
      const beforeStorage=localSql('select count(*) from storage.objects;')
      const upload=await storageRequest(`object/menu-images/${A}/${randomUUID()}.png`,actors.staffA,'POST',png)
      assert.ok(upload.status>=400,'Staff has no Storage upload authority')
      assert.match(`${upload.data?.error ?? ''} ${upload.data?.message ?? ''}`,/row.level|unauthorized|access denied/i,'A valid image is denied by authorization, not malformed input')
      assert.equal(localSql('select count(*) from storage.objects;'),beforeStorage,'Denied Staff upload creates no object')
      assert.ok((await http('/rest/v1/point_transactions',null)).status>=400)
      assert.ok((await rpc('credit_points',null,creditBody('1000'))).status>=400)
      assert.ok((await http('/rest/v1/point_transactions',actors.adminA,'GET',undefined,{'Accept-Profile':'private'})).status===406)
      assert.ok((await rpc('parse_paid_amount',actors.staffA,{value:'1000'})).status>=400,'Internal parser is not a Data API endpoint')
    })

    await t.test('SAME JWT membership removal and Admin downgrade revoke authority without relogin',async()=>{
      const before=localSql('select count(*) from public.point_transactions;')
      localSql(`delete from public.business_memberships where business_id=${quote(A)} and user_id=${quote(actors.staffA.id)};`)
      denied(await rpc('credit_points',actors.staffA,creditBody('1000')))
      denied(await rpc('get_loyalty_history',actors.staffA,{business_id:A}))
      denied(await rpc('lookup_loyalty_customer',actors.staffA,{business_id:A,customer_code:codes.customer}))
      assert.equal(localSql('select count(*) from public.point_transactions;'),before)
      localSql(`insert into public.business_memberships(business_id,user_id,role) values (${quote(A)},${quote(actors.staffA.id)},'staff'); update public.business_memberships set role='staff' where business_id=${quote(A)} and user_id=${quote(actors.adminA.id)};`)
      denied(await rpc('reverse_credit',actors.adminA,{business_id:A,original_id:first.id,reason:'Lost Admin',request_id:randomUUID()}))
      assert.equal((await credit('1000',actors.adminA)).points_delta,'1','Downgraded Staff still has independent credit capability')
      localSql(`update public.business_memberships set role='admin' where business_id=${quote(A)} and user_id=${quote(actors.adminA.id)};`)
    })
  } finally {
    // Retain exact local fixture ownership manifest. Cleanup is a guarded LOCAL
    // schema reset, never DELETE/TRUNCATE economic rows or an implicit remote action.
    manifest()
  }
})
