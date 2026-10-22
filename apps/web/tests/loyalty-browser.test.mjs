// LOCAL browser proof. No tokens/passwords/trace/HAR or Auth response logging.
/* global window, document */
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { localRuntime, localSql } from '../../../supabase/scripts/local-runtime.mjs'
import { confirmationLink, cleanupFixtureMail } from '../../../supabase/scripts/auth-mail-runtime.mjs'
import { updateDisplayName } from '../src/features/auth/authData.ts'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.CANJE_PLAYWRIGHT_PACKAGE??'playwright')
const app='http://127.0.0.1:5173',runtime=localRuntime(),A='a11a0000-0000-4000-8000-000000000001'
const fixtureEmails=[],fixtureIds=[],accounts=[],contexts=[]
const manifest=()=>writeFileSync(new URL('../../../supabase/.temp/sprint3b-fixtures.json',import.meta.url),JSON.stringify({version:1,localOnly:true,economicFixtures:true,users:fixtureIds,emails:fixtureEmails,businesses:[A]}))
const quote=value=>`'${value.replaceAll("'","''")}'`
const proof=[],safePhase=value=>{proof.push(value);console.log(JSON.stringify({local_browser_phase:value}))}

test('Sprint 3C mobile LOCAL real Admin/Staff/Customer journey',{timeout:480000},async()=>{
 let browser,phase='initial guard',networkErrors=0,pageErrors=0
 try {
  assert.equal(localSql('select (select count(*) from auth.users)+(select count(*) from public.point_transactions)+(select count(*) from public.business_memberships)+(select count(*) from private.platform_admins)+(select count(*) from storage.objects);'),'0')
  for(const [role,name] of [['admin','Admin fixture'],['staff','Bartender fixture'],['customer','Rodrigo']]){
   phase=`signup ${role}`;const email=`task2c-${randomUUID()}@example.test`,password=`${randomUUID()}!Aa9`;fixtureEmails.push(email);manifest()
   const client=createClient(runtime.url,runtime.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
   const signup=await client.auth.signUp({email,password});assert.ok(!signup.error);assert.equal(signup.data.session,null)
   const link=await confirmationLink(email,'signup'),verified=await client.auth.verifyOtp({token_hash:link.searchParams.get('token'),type:'signup'});assert.ok(!verified.error)
   const id=verified.data.user.id;fixtureIds.push(id);manifest();await updateDisplayName(client,id,name);await cleanupFixtureMail()
   if(role!=='customer')localSql(`insert into public.business_memberships(business_id,user_id,role) values (${quote(A)},${quote(id)},${quote(role)});`)
   const profile=await client.from('profiles').select('customer_code').eq('id',id).single();assert.ok(!profile.error);accounts.push({role,email,password,id,client,code:profile.data.customer_code})
  }
  browser=await chromium.launch({channel:process.env.CANJE_BROWSER_CHANNEL??'msedge',headless:true})
  for(const actor of accounts){
   phase=`browser login ${actor.role}`;const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});contexts.push(ctx)
   await ctx.route('**/*',route=>{const target=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(target.hostname)){networkErrors++;return route.abort()}return route.continue()})
   actor.page=await ctx.newPage();actor.page.on('pageerror',()=>pageErrors++)
   await actor.page.goto(app+'/login');await actor.page.getByLabel('Email',{exact:true}).fill(actor.email);await actor.page.getByLabel('Contraseña',{exact:true}).fill(actor.password);await actor.page.getByRole('button',{name:'Ingresar',exact:true}).click();await actor.page.waitForURL(app+'/');await actor.page.getByRole('heading',{name:'Tu carta, siempre a mano.',exact:true}).waitFor()
  }
  const admin=accounts[0],staff=accounts[1],customer=accounts[2]
  phase='customer code and zero balance';await customer.page.goto(app+'/points');await customer.page.locator('.customer-code').waitFor();await customer.page.getByText('Todavía no hay movimientos. Cada consumo confirmado aparecerá acá.',{exact:true}).waitFor();assert.equal((await customer.page.locator('.customer-code').textContent()).replaceAll('-',''),customer.code);assert.match(await customer.page.locator('.balance-number').textContent(),/^0/)
  phase='staff catalog guard';await staff.page.goto(app+'/admin');await staff.page.getByRole('heading',{name:'Sin acceso',exact:true}).waitFor()
  phase='staff identify and preview';await staff.page.goto(app+'/operar');await staff.page.getByRole('heading',{name:'Acreditar consumo',exact:true}).waitFor();await staff.page.locator('#customer-code').fill(customer.code);await staff.page.getByRole('button',{name:'Buscar cliente',exact:true}).click();await staff.page.getByText('Rodrigo',{exact:true}).waitFor();await staff.page.locator('#paid-amount').fill('6500');assert.equal(await staff.page.locator('.points-estimate strong').textContent(),'6')
  phase='draft reload';await staff.page.reload();await staff.page.locator('#paid-amount').waitFor();assert.equal(await staff.page.locator('#paid-amount').inputValue(),'6500');assert.equal(await staff.page.locator('#customer-code').inputValue(),customer.code);await staff.page.getByRole('button',{name:'Buscar cliente',exact:true}).click();await staff.page.getByText('Rodrigo',{exact:true}).waitFor()
  safePhase('draft_reload_pass_editor_wait_started');phase='long edit and focus';await staff.page.waitForTimeout(Number(process.env.CANJE_EDITOR_WAIT_MS??125000));await staff.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await staff.page.getByRole('button',{name:'Confirmar acreditación',exact:true}).waitFor({state:'visible'});assert.equal(await staff.page.locator('#paid-amount').inputValue(),'6500')
  phase='credit Rodrigo 6500';await staff.page.getByRole('button',{name:'Confirmar acreditación',exact:true}).click();await staff.page.locator('.operation-receipt').waitFor();assert.match(await staff.page.locator('.operation-receipt strong').textContent(),/\+6 puntos/);assert.equal(localSql(`select sum(points_delta)::text from public.point_transactions where customer_id=${quote(customer.id)} and business_id=${quote(A)};`),'6')
  assert.equal(await staff.page.locator('#customer-code').inputValue(),'');await customer.page.reload();await customer.page.locator('.loyalty-movement').first().waitFor();assert.match(await customer.page.locator('.balance-number').textContent(),/^6/);safePhase('Rodrigo_6500_6_points_pass')
  phase='response loss after real commit';const requests=[]
  await staff.page.route('**/rest/v1/rpc/credit_points',async route=>{requests.push(route.request().postDataJSON().request_id);const r=await route.fetch();assert.equal(r.status(),200);await route.abort('failed')})
  await staff.page.locator('#customer-code').fill(customer.code);await staff.page.getByRole('button',{name:'Buscar cliente',exact:true}).click();await staff.page.getByText('Rodrigo',{exact:true}).waitFor();await staff.page.locator('#paid-amount').fill('6500');await staff.page.getByRole('button',{name:'Confirmar acreditación',exact:true}).click();await staff.page.getByRole('button',{name:'Recuperar mismo intento',exact:true}).waitFor();await staff.page.unroute('**/rest/v1/rpc/credit_points')
  assert.equal(localSql(`select count(*) from public.point_transactions where request_id=${quote(requests[0])};`),'1')
  phase='same session revocation with pending';localSql(`delete from public.business_memberships where user_id=${quote(staff.id)} and business_id=${quote(A)};`);await staff.page.getByRole('button',{name:'Recuperar mismo intento',exact:true}).click();await staff.page.getByRole('heading',{name:'Sin acceso operativo',exact:true}).waitFor();assert.equal(localSql(`select count(*) from public.point_transactions where request_id=${quote(requests[0])};`),'1')
  localSql(`insert into public.business_memberships(user_id,business_id,role) values (${quote(staff.id)},${quote(A)},'staff');`)
  phase='reload pending and recover';await staff.page.reload();await staff.page.getByRole('button',{name:'Recuperar mismo intento',exact:true}).waitFor();await staff.page.route('**/rest/v1/rpc/credit_points',route=>{requests.push(route.request().postDataJSON().request_id);return route.continue()});await staff.page.getByRole('button',{name:'Recuperar mismo intento',exact:true}).click();await staff.page.getByText('Acreditación confirmada.',{exact:true}).waitFor();assert.equal(requests.length,2);assert.equal(requests[0],requests[1]);assert.equal(localSql(`select count(*) from public.point_transactions where request_id=${quote(requests[0])};`),'1');safePhase('response_loss_reload_same_id_revocation_pass')
  phase='staff no reversals';assert.equal(await staff.page.getByRole('button',{name:/Revertir consumo/}).count(),0)
  phase='admin reversal';await admin.page.goto(app+'/operar');await admin.page.getByRole('button',{name:/Revertir consumo/}).first().waitFor();await admin.page.getByRole('button',{name:/Revertir consumo/}).first().click();await admin.page.locator('#reversal-reason').fill('Corrección completa fixture');await admin.page.getByRole('button',{name:'Confirmar reversa completa',exact:true}).click();await admin.page.getByText('Reversa confirmada.',{exact:true}).waitFor();assert.equal(localSql(`select sum(points_delta)::text from public.point_transactions where customer_id=${quote(customer.id)} and business_id=${quote(A)};`),'6')
  await customer.page.reload();await customer.page.getByText('Reversa completa',{exact:true}).waitFor();assert.match(await customer.page.locator('.balance-number').textContent(),/^6/);assert.equal(await customer.page.getByText('Reversa completa',{exact:true}).count(),1)
  phase='customer operation guard';await customer.page.goto(app+'/operar');await customer.page.getByRole('heading',{name:'Sin acceso operativo',exact:true}).waitFor();safePhase('Admin_reversal_Staff_Customer_guards_pass')
  phase='Admin downgrade plus failed history refresh';await admin.page.route('**/rest/v1/rpc/get_loyalty_history',route=>route.abort('failed'));localSql(`update public.business_memberships set role='staff' where user_id=${quote(admin.id)} and business_id=${quote(A)};`);await admin.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await admin.page.getByText('No pudimos actualizar el historial. Reintentá; las operaciones pendientes se conservan.',{exact:true}).waitFor();await admin.page.getByRole('link',{name:'Administrar Carta',exact:true}).waitFor({state:'hidden'});assert.equal(await admin.page.locator('.loyalty-movement').count(),0,'No stale Admin data after scope downgrade/read failure');await admin.page.unroute('**/rest/v1/rpc/get_loyalty_history');await admin.page.getByRole('button',{name:'Actualizar historial',exact:true}).click();await admin.page.locator('.loyalty-movement').first().waitFor();assert.equal(await admin.page.locator('.loyalty-movement').count(),1,'Former Admin as Staff sees only own reversal');assert.equal(await admin.page.getByRole('button',{name:/Revertir consumo/}).count(),0);safePhase('role_downgrade_failed_refresh_privacy_pass')
  phase='mobile visual';await staff.page.reload();await staff.page.getByRole('heading',{name:'Acreditar consumo',exact:true}).waitFor();assert.ok(await staff.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));const button=await staff.page.getByRole('button',{name:'Confirmar acreditación',exact:true}).boundingBox();assert.ok(button.height>=44)
  const dir=new URL('../../../supabase/.temp/sprint3c-visual/',import.meta.url);mkdirSync(dir,{recursive:true});await staff.page.screenshot({path:fileURLToPath(new URL('operator-mobile.png',dir)),fullPage:true});writeFileSync(new URL('proof.json',dir),JSON.stringify({status:'PASS',phases:proof,viewport:[390,844],editor_wait_ms:Number(process.env.CANJE_EDITOR_WAIT_MS??125000),external_requests:networkErrors,page_errors:pageErrors,credentials_logged:false}))
  assert.equal(networkErrors,0);assert.equal(pageErrors,0);safePhase('mobile_layout_console_network_pass')
 } catch {throw new Error(`LOCAL browser validation failed at ${phase}; credential-bearing details withheld`)}
 finally {manifest();for(const ctx of contexts)await ctx.close();await browser?.close();for(const actor of accounts)await actor.client.auth.dispose()}
})
