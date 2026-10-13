import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { decimal, estimate, customerCode, formatPaid, receipt, LoyaltyError } from '../src/features/loyalty/loyaltyData.ts'
import { createOperationStore, operationKey } from '../src/features/loyalty/operationStore.ts'
const uid=randomUUID(),business=randomUUID(),code='ABCDEFGHJK'
const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)}}
const result=i=>({id:randomUUID(),business_id:i.businessId,customer_code:code,entry_type:i.kind,currency_code:'ARS',paid_amount:i.amount??'6500.00',currency_per_point:'1000.00',points_delta:i.kind==='credit'?'6':'-6',request_id:i.requestId,reference:i.reference??null,reverses_id:i.originalId??null,reason:i.reason??null,created_at:new Date().toISOString()})
const customer={customer_code:code,display_name:'Rodrigo'}
const setup=(send,storage=memory())=>{const key=operationKey('http://127.0.0.1:54321',uid,business),actions={lookup:async()=>customer,send};return {storage,key,actions,store:createOperationStore(storage,key,uid,business,actions)}}
const prepare=async store=>{store.edit('code',code);store.edit('amount','6500');await store.lookup()}
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}

test('exact money and transaction floor, no precision loss',()=>{
 assert.equal(decimal('006500,50'),'6500.50');assert.equal(estimate('6500','1000.00'),'6');assert.equal(estimate('600','1000'),'0');assert.equal(formatPaid('6500.50'),'$ 6.500,50')
 for(const value of ['6500.001','6500.000','6.500,50','1e3','NaN','0','-1',' 6500','1000000000000','6500\n'])assert.throws(()=>decimal(value))
 assert.equal(customerCode('abcd-efgh-jk'),code);assert.throws(()=>customerCode('ABCD'))
})
test('double click sends once, locks content and stores before dispatch',async()=>{
 const wait=deferred();let calls=0,intent
 const h=setup(async i=>{calls++;intent=i;assert.equal(JSON.parse(h.storage.getItem(h.key)).pending.requestId,i.requestId);await wait.promise;return result(i)})
 await prepare(h.store);const first=h.store.credit();await h.store.credit();h.store.edit('amount','9999');assert.equal(h.store.getSnapshot().draft.amount,'6500');assert.equal(calls,1)
 wait.resolve();await first;assert.equal(h.store.getSnapshot().last.request_id,intent.requestId);assert.equal(h.store.getSnapshot().pending,null);assert.equal(h.store.getSnapshot().draft.code,'')
})
test('lost response and reload recover same id/payload; no second intent',async()=>{
 let saved,calls=0
 const h=setup(async i=>{calls++;if(!saved){saved=result(i);throw new TypeError('Network')}assert.equal(i.requestId,saved.request_id);return saved})
 await prepare(h.store);await h.store.credit();assert.equal(h.store.getSnapshot().status,'uncertain');assert.equal(h.store.getSnapshot().draft.amount,'6500')
 const restored=createOperationStore(h.storage,h.key,uid,business,h.actions);await restored.credit();assert.equal(calls,1);await restored.recover();assert.equal(restored.getSnapshot().last.id,saved.id);assert.equal(calls,2)
})
test('revoked recovery cannot clear a previously uncertain intent',async()=>{
 let fail=new TypeError('Network');const h=setup(async()=>{throw fail});await prepare(h.store);await h.store.credit();const id=h.store.getSnapshot().pending.requestId
 fail=new LoyaltyError('Revoked',true);await h.store.recover();h.store.editRejected();assert.equal(h.store.getSnapshot().pending.requestId,id);assert.equal(h.store.getSnapshot().status,'uncertain')
})
test('fresh definite rejection keeps draft and permits explicit correction',async()=>{
 const h=setup(async()=>{throw new LoyaltyError('Denied',true)});await prepare(h.store);await h.store.credit();assert.equal(h.store.getSnapshot().status,'rejected');h.store.editRejected();assert.equal(h.store.getSnapshot().pending,null);assert.equal(h.store.getSnapshot().draft.amount,'6500')
})
test('storage failure prevents dispatch; recovery preserves id',async()=>{
 const storage=memory(),original=storage.setItem;let fail=false,calls=0
 storage.setItem=(...args)=>{if(fail)throw new Error('Quota');original(...args)}
 const h=setup(async i=>{calls++;return result(i)},storage);await prepare(h.store);fail=true;await h.store.credit();assert.equal(calls,0);const id=h.store.getSnapshot().pending.requestId
 fail=false;h.store.retryStorage();await h.store.recover();assert.equal(h.store.getSnapshot().last.request_id,id);assert.equal(calls,1)
})
test('corrupt/cross-owner storage is not overwritten; scope includes endpoint/user/tenant',()=>{
 const storage=memory(),key='fixture';storage.setItem(key,JSON.stringify({version:1,userId:'other',businessId:business,draft:{code,amount:'6500',reference:''},pending:{requestId:randomUUID()}}));const raw=storage.getItem(key)
 const store=createOperationStore(storage,key,uid,business,{lookup:async()=>customer,send:async()=>{throw new Error('must not send')}});store.retryStorage();assert.equal(store.getSnapshot().storageError,true);assert.equal(storage.getItem(key),raw)
 assert.notEqual(operationKey('local',uid,business),operationKey('hosted',uid,business));assert.notEqual(operationKey('local',uid,business),operationKey('local','other',business))
})
test('slow lookup survives amount typing; code change discards stale lookup',async()=>{
 const wait=deferred(),h=setup(async i=>result(i));h.actions.lookup=async()=>{await wait.promise;return customer};h.store.edit('code',code);const lookup=h.store.lookup();h.store.edit('amount','6500');wait.resolve();await lookup;assert.deepEqual(h.store.getSnapshot().customer,customer)
 const next=deferred();h.actions.lookup=async()=>{await next.promise;return customer};const old=h.store.lookup();h.store.edit('code','BBBBBBBBBB');next.resolve();await old;assert.equal(h.store.getSnapshot().customer,null)
})
test('invalid server money is ambiguous, never treated as client rejection',()=>{
 const r=result({kind:'credit',businessId:business,requestId:randomUUID(),amount:'6500'});assert.throws(()=>receipt({...r,paid_amount:'6500.001'}),e=>e instanceof LoyaltyError&&!e.definite)
})
test('reversal needs reason and recovers same request after reload',async()=>{
 let calls=0,saved;const h=setup(async i=>{calls++;saved??=result(i);if(calls===1)throw new TypeError('Network');return saved});h.store.selectReversal(randomUUID());await h.store.reverse();assert.equal(calls,0);h.store.reason('Corrección completa');await h.store.reverse();const restored=createOperationStore(h.storage,h.key,uid,business,h.actions);assert.equal(restored.getSnapshot().reversal.reason,'Corrección completa');await restored.recover();assert.equal(restored.getSnapshot().last.id,saved.id)
})
import { createClient } from '@supabase/supabase-js'
import { createLoyaltyActions } from '../src/features/loyalty/loyaltyData.ts'
function actionHarness(fetch){
 const client=createClient('http://127.0.0.1:54321','public-unit-fixture',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch}})
 let snapshot={session:{user:{id:uid},access_token:'unitA'},epoch:1,signingOut:false,logoutError:false}
 const auth={getClient:()=>client,getSnapshot:()=>snapshot},authority={reload:async()=>({operatorBusinesses:[{id:business,role:'staff',isActive:true}]})}
 return {client,auth,authority,switch:()=>{snapshot={...snapshot,session:{user:{id:'another-owner'},access_token:'unitB'},epoch:2}}}
}
test('identity change during permission check sends no economic RPC',async()=>{
 let calls=0;const h=actionHarness(async()=>{calls++;throw new Error('must not send')});h.authority.reload=async()=>{h.switch();return {operatorBusinesses:[{id:business,role:'staff'}]}}
 await assert.rejects(()=>createLoyaltyActions(h.auth,h.authority).send({kind:'credit',userId:uid,businessId:business,requestId:randomUUID(),code,amount:'6500.00',reference:null}),e=>e instanceof LoyaltyError&&e.definite);assert.equal(calls,0);await h.client.auth.dispose()
})
test('actual SDK economic request binds Authorization to checked identity and keeps money JSON string',async()=>{
 const intent={kind:'credit',userId:uid,businessId:business,requestId:randomUUID(),code,amount:'6500.00',reference:null}
 const h=actionHarness(async(url,options)=>{h.switch();assert.equal(new Headers(options.headers).get('Authorization'),'Bearer unitA');const body=JSON.parse(options.body);assert.equal(typeof body.paid_amount,'string');assert.equal(body.request_id,intent.requestId);assert.equal(body.business_id,business);return new Response(JSON.stringify(result(intent)),{status:200,headers:{'Content-Type':'application/json'}})})
 const r=await createLoyaltyActions(h.auth,h.authority).send(intent);assert.equal(r.request_id,intent.requestId);await h.client.auth.dispose()
})

