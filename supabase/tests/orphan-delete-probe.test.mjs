// Diagnostic ONLY, not production authorization. Creates one temporary DELETE
// policy limited to one generated path; always removes it. Exclusive LOCAL stack.
// Demonstrates why snapshot NOT EXISTS is not a concurrent integrity guarantee.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { localRuntime, localSql } from '../scripts/local-runtime.mjs'
import { signup, http } from '../scripts/auth-test-runtime.mjs'
import { storageRequest as request, storageFixtures, objectRoute, png } from '../scripts/storage-test-runtime.mjs'

localRuntime()
const A='a11a0000-0000-4000-8000-000000000001', item='1de00000-0000-4000-8000-000000000001'
const policy='task2g_orphan_probe', bucket='menu-images'
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))

// Owner connection is only a deterministic fixture lock, never the tested DELETE.
async function holdObjectLock(path) {
  assert.match(path,/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/)
  const process=spawn('docker',['exec','-i','supabase_db_canjeproyect','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{windowsHide:true,stdio:['pipe','pipe','pipe']})
  const exited=new Promise(resolve=>process.once('close',resolve))
  const ready=new Promise((resolve,reject)=>{
    let output=''
    const timer=setTimeout(()=>reject(new Error('Local fixture lock setup timed out')),10000)
    process.once('error',()=>{clearTimeout(timer);reject(new Error('Local fixture lock could not start'))})
    process.once('close',()=>{clearTimeout(timer);reject(new Error('Local fixture lock closed before readiness'))})
    process.stdout.on('data',chunk=>{output+=chunk.toString();if(output.includes('LOCK_HELD')){clearTimeout(timer);resolve()}})
    process.stderr.on('data',()=>{}) // Do not print SQL/credential-bearing errors.
  })
  process.stdin.on('error',()=>{})
  process.stdin.write(`begin; set local application_name='task2g_orphan_blocker'; select id from storage.objects where bucket_id='${bucket}' and name='${path}' for update; select 'LOCK_HELD';\n`)
  try {await ready} catch(error){process.stdin.end('rollback;\n');await exited;throw error}
  return {release:async()=>{process.stdin.end('commit;\n');assert.equal(await exited,0,'Fixture lock cleanly released')}}
}

test('Orphan-delete gate diagnostic: NOT EXISTS fails concurrent publication (real REST/JWT)',async t=>{
  assert.equal(localSql('select (select count(*) from auth.users)+(select count(*) from storage.objects);'),'0')
  assert.equal(localSql("select string_agg(id,',' order by id) from storage.buckets;"),bucket)
  assert.equal(localSql("select count(*) from pg_policies where schemaname='storage';"),'3')
  assert.equal(localSql(`select count(*) from pg_policies where policyname='${policy}';`),'0')
  assert.equal(localSql(`select coalesce(image_path,'') from public.menu_items where id='${item}';`),'')
  const path=`${A}/${randomUUID()}.png`, fixture=storageFixtures()
  let email, installed=false, lock, deleting
  const setReference=async(actor,value)=>{
    const r=await http(`/rest/v1/menu_items?id=eq.${item}`,actor,'PATCH',{image_path:value},{Prefer:'return=representation'})
    assert.equal(r.status,200);assert.equal(r.data.length,1);assert.equal(r.data[0].image_path,value)
  }
  const uploaded=async actor=>{assert.equal((await request(objectRoute(bucket,path),actor,'POST',png)).status,200)}
  const remove=actor=>request(`object/${bucket}`,actor,'DELETE',{prefixes:[path]})
  const publicBytes=()=>request(`object/public/${bucket}/${path}`,null,'GET',undefined,{},true)
  try {
    const pending=await signup();email=pending.email;const actor=await pending.create()
    localSql(`insert into public.business_memberships(business_id,user_id,role) values ('${A}','${actor.id}','admin');`)
    // Only generated diagnostic path is deletable; no modification of approved
    // policies/helper/ACL/managed triggers. Candidate not included in migrations.
    localSql(`create policy ${policy} on storage.objects for delete to authenticated using (
      bucket_id='${bucket}' and name='${path}' and private.is_business_admin('${A}')
      and exists(select 1 from public.businesses b where b.id='${A}' and b.is_active)
      and not exists(select 1 from public.menu_items m where m.business_id='${A}' and m.image_path=objects.name));`)
    installed=true
    await t.test('Sequential orphan DELETE allowed, exact object and bytes removed',async()=>{
      await uploaded(actor)
      const r=await remove(actor);assert.equal(r.status,200);assert.equal(r.data.length,1);assert.equal(r.data[0].name,path)
      assert.ok((await publicBytes()).status!==200)
    })
    await t.test('Sequential referenced DELETE denied, bytes/reference unchanged',async()=>{
      await uploaded(actor);await setReference(actor,path)
      const r=await remove(actor);assert.equal(r.status,200);assert.deepEqual(r.data,[])
      assert.deepEqual((await publicBytes()).bytes,png)
      const db=await http(`/rest/v1/menu_items?id=eq.${item}&select=image_path`,actor)
      assert.deepEqual(db.data,[{image_path:path}]);await setReference(actor,null)
    })
    await t.test('Concurrent publication commits while DELETE waits; candidate still removes referenced file',async()=>{
      lock=await holdObjectLock(path)
      deleting=remove(actor)
      // Wait for a real Storage DELETE blocked by fixture lock. No timing-only
      // assertion: inspect lock wait existence, never print query/JWT/settings.
      const deadline=Date.now()+10000
      let waiting=false
      while(Date.now()<deadline){
        await pause(100)
        waiting=localSql("select exists(select 1 from pg_stat_activity where wait_event_type='Lock' and query like '%DELETE FROM storage.objects%' and application_name<>'task2g_orphan_blocker');")==='t'
        if(waiting)break
      }
      assert.ok(waiting,'Real Storage DELETE reached SQL lock wait')
      await setReference(actor,path)
      const published=await http(`/rest/v1/menu_items?id=eq.${item}&select=image_path`,actor)
      assert.equal(published.status,200);assert.deepEqual(published.data,[{image_path:path}])
      await lock.release();lock=null
      const r=await deleting;deleting=null
      assert.equal(r.status,200);assert.equal(r.data.length,1);assert.equal(r.data[0].name,path)
      const missing=await publicBytes();assert.ok(missing.status!==200,'File no longer downloadable')
      const dangling=await http(`/rest/v1/menu_items?id=eq.${item}&select=image_path`,actor)
      assert.equal(dangling.status,200);assert.deepEqual(dangling.data,[{image_path:path}])
      console.log('Confirmed: committed menu reference + successful concurrent Storage DELETE = missing referenced file. Candidate rejected; no integrity guarantee.')
    })
  } finally {
    if(lock)await lock.release()
    if(deleting)await deleting
    if(installed)localSql(`drop policy ${policy} on storage.objects;`)
    localSql(`update public.menu_items set image_path=null where id='${item}';`)
    await fixture.removeObjects(bucket,[path])
    if(email){assert.match(email,/^task2c-[0-9a-f-]{36}@example\.test$/);localSql(`delete from auth.users where email='${email}';`)}
    assert.equal(localSql(`select count(*) from pg_policies where policyname='${policy}';`),'0')
    assert.equal(localSql('select (select count(*) from auth.users)+(select count(*) from storage.objects);'),'0')
  }
})
