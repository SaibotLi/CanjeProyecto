import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router-dom'
import {createClient} from '@supabase/supabase-js'
import {isBusinessSlug,businessPath,businessDestination,reservedSlugs,publicBusinessUrl} from '../src/features/business/businessRoutes.ts'
import {mapAuthority,scopeAuthority,readAuthority} from '../src/features/authority/authorityData.ts'
import {BusinessContext} from '../src/features/business/businessContext.ts'
import {AuthorityContext} from '../src/features/authority/authorityContext.ts'
import {AuthContext} from '../src/features/auth/authContext.ts'
import {initialAuthState} from '../src/features/auth/sessionStore.ts'
import {Navigation} from '../src/components/Navigation.tsx'
import {PointsPage} from '../src/pages/PointsPage.tsx'
import {CustomerLayout} from '../src/layouts/CustomerLayout.tsx'
import {AdminPage} from '../src/pages/AdminPage.tsx'
import {NotFoundPage} from '../src/pages/NotFoundPage.tsx'
import {readBusiness} from '../src/features/business/businessData.ts'
import {presentationPayload} from '../src/features/business/businessSettings.ts'
import {categorySlug} from '../src/features/admin/adminData.ts'
import {mapPublicMenu} from '../src/features/menu/menuMapper.ts'
import {safeAuthDestination,confirmationDestination,mfaLoginDestination,authPathAfterCleanup} from '../src/features/auth/authNavigation.ts'

const presentation={business_id:'B',tagline:'Café de barrio',description:'',city:'Córdoba',region:'Córdoba',country_code:'AR',address:'',contact_phone:'',instagram_handle:'',website_url:'',template:'light',accent:'teal',logo_path:null,created_at:'',updated_at:''}
const B={id:'B',slug:'cafe-demo',name:'Café Demo',isActive:true,currency:'ARS',timezone:'America/Argentina/Cordoba',loyaltyEnabled:false,presentation}
const membership=(id,role)=>({user_id:'self',business_id:id,role,businesses:{id,slug:id==='B'?'cafe-demo':'valhalla-space',name:id,is_active:true}})
const own=mapAuthority([membership('A','staff'),membership('B','admin')],'self','')
const render=(component,business=B,authority=own,authOverrides={})=>renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:[businessPath(business.slug)]},React.createElement(AuthContext.Provider,{value:{...initialAuthState,initializing:false,session:{user:{id:'self'}},store:{},...authOverrides}},React.createElement(AuthorityContext.Provider,{value:{status:'ready',checking:false,data:authority,store:{}}},React.createElement(BusinessContext.Provider,{value:{business,checking:false,refreshError:false,reload(){}}},component)))))

test('Tenant URLs accept canonical slugs and reject reserved/ambiguous paths',()=>{
  for(const slug of ['valhalla-space','cafe-demo','local-2']){assert.ok(isBusinessSlug(slug));assert.equal(businessPath(slug,'admin'),`/${slug}/admin`)}
  for(const slug of [...reservedSlugs,'','UPPER','a--b','../foo','café','a/b','a?x=1','a#token','a'.repeat(81)]){assert.equal(isBusinessSlug(slug),false);assert.throws(()=>businessPath(slug))}
  assert.equal(businessDestination('/cafe-demo/admin/settings'),'/cafe-demo/admin/settings')
  for(const path of ['//evil.test','/cafe-demo/points?token=x','/cafe-demo/points#x','/cafe-demo/../admin','/cafe-demo//admin','/cafe-demo/unknown','/cafe-demo/'])assert.equal(businessDestination(path),null)
})
test('Category names produce simple editable identifiers, preserving accents in the visible name',()=>{
  assert.equal(categorySlug('Café y Té'),'cafe-y-te');assert.equal(categorySlug('  Vinos / Espumantes  '),'vinos-espumantes');assert.ok(categorySlug('A'.repeat(100)).length<=80)
})
test('Public share URL uses the current domain and contains only the tenant path',()=>{
  assert.equal(publicBusinessUrl('cafe-demo','https://future-brand.example/old?token=x'),'https://future-brand.example/cafe-demo')
  assert.equal(publicBusinessUrl('cafe-demo','http://127.0.0.1:5173'),'http://127.0.0.1:5173/cafe-demo')
  for(const origin of ['javascript:alert(1)','http://public.example','https://user:password@example.test'])assert.throws(()=>publicBusinessUrl('cafe-demo',origin))
})
test('One global membership snapshot scopes Admin/Staff independently per business',()=>{
  assert.equal(own.tenant,null);assert.equal(own.operatorTenant,null)
  assert.equal(scopeAuthority(own,'A').tenant,null);assert.equal(scopeAuthority(own,'A').operatorTenant.role,'staff')
  assert.equal(scopeAuthority(own,'B').tenant.id,'B');assert.equal(scopeAuthority(own,'B').operatorTenant.role,'admin')
  assert.equal(scopeAuthority(own,'unknown').tenant,null);assert.equal(scopeAuthority(own,'unknown').operatorTenant,null)
  assert.equal(scopeAuthority({...own,operatorBusinesses:[],adminBusinesses:[]},'B').tenant,null,'A cached route cannot recreate a revoked membership')
})
test('Tenant return intent crosses global login/MFA/confirmation safely without new redirect URLs',()=>{
  assert.equal(safeAuthDestination('/cafe-demo/admin/products'),'/cafe-demo/admin/products')
  assert.equal(mfaLoginDestination('/cafe-demo/admin'),'/auth/mfa?returnTo=%2Fcafe-demo%2Fadmin')
  assert.equal(confirmationDestination('/cafe-demo/points'),'/cafe-demo/profile')
  assert.equal(confirmationDestination('https://evil.test/foo'),'/profile')
})
test('MFA direct reload keeps only safe continuation; callback/recovery still strip URL inputs',()=>{
  assert.equal(authPathAfterCleanup('/auth/mfa','?returnTo=%2Fcafe-demo%2Fadmin&unexpected=value'),'/auth/mfa?returnTo=%2Fcafe-demo%2Fadmin')
  assert.equal(authPathAfterCleanup('/auth/mfa','?continue=platform&unexpected=value'),'/auth/mfa?continue=platform')
  assert.equal(authPathAfterCleanup('/auth/mfa','?returnTo=//evil.test'),'/auth/mfa')
  assert.equal(authPathAfterCleanup('/auth/callback','?unexpected=value'),'/auth/callback')
  assert.equal(authPathAfterCleanup('/auth/recovery','?unexpected=value'),'/auth/recovery')
})
test('Menu-only customer navigation has no signup, points, rewards or Staff entry; Admin remains available',()=>{
  const anonymous={...own,tenant:null,adminBusinesses:[],operatorBusinesses:[],operatorTenant:null}
  const publicMarkup=render(React.createElement(CustomerLayout),B,anonymous)
  assert.doesNotMatch(publicMarkup,/Valhalla|Puntos|Premios|registr|Fidelizaci|\/operar|\/points/i)
  assert.match(publicMarkup,/Café Demo/);assert.match(publicMarkup,/\/cafe-demo\/admin/)
  const admin=render(React.createElement(Navigation));assert.match(admin,/Administrar/);assert.doesNotMatch(admin,/Puntos|Acreditar/)
  const loyalty=render(React.createElement(Navigation),{...B,loyaltyEnabled:true});assert.match(loyalty,/\/cafe-demo\/points/);assert.match(loyalty,/\/cafe-demo\/operar/)
})
test('Reused Admin panel links stay inside the selected commerce',()=>{
  const html=render(React.createElement(AdminPage))
  assert.match(html,/\/cafe-demo\/admin\/categories/);assert.match(html,/\/cafe-demo\/admin\/products/);assert.match(html,/\/cafe-demo\/admin\/settings/);assert.match(html,/\/cafe-demo\/admin\/share/)
  assert.doesNotMatch(html,/valhalla-space|to="\/admin/)
  const missing=render(React.createElement(NotFoundPage))
  assert.match(missing,/Café Demo/);assert.match(missing,/href="\/cafe-demo"/);assert.doesNotMatch(missing,/Valhalla/)
})
test('An anonymous direct points URL on menu-only does not invite account creation or offer a new program',()=>{
  const html=render(React.createElement(PointsPage),B,own,{session:null})
  assert.match(html,/Función no disponible/);assert.match(html,/\/cafe-demo/)
  assert.doesNotMatch(html,/Ingresá|registr|Mis puntos|saldo|Código personal/i)
})
test('Commercial capability and operational points switch are separate; menu-only needs no loyalty rule',()=>{
  const row={id:'B',is_active:true,business_entitlements:{loyalty_enabled:false},loyalty_settings:null,menu_categories:[]}
  assert.equal(mapPublicMenu(row,()=>{throw Error('No asset')}).pointsEnabled,false)
  assert.equal(mapPublicMenu({...row,loyalty_settings:{currency_per_point:1000,points_enabled:true}},()=>'' ).pointsEnabled,false)
  assert.equal(mapPublicMenu({...row,business_entitlements:{loyalty_enabled:true},loyalty_settings:{currency_per_point:1000,points_enabled:false}},()=>'' ).pointsEnabled,false)
  assert.throws(()=>mapPublicMenu({...row,business_entitlements:null},()=>''))
})
test('Presentation payload whitelists fields; no entitlement/owner injection, URLs cannot carry credentials or scripts',()=>{
  const draft={...presentation,name:' Café ',loyalty_enabled:true,business_id:'attacker',owner_user_id:'attacker'}
  const payload=presentationPayload(draft);assert.equal(payload.name,'Café');assert.equal(payload.data.template,'light')
  for(const key of ['loyalty_enabled','business_id','owner_user_id','created_at','updated_at'])assert.ok(!(key in payload.data))
  for(const url of ['javascript:alert(1)','http://unsafe.test','https://name:password@example.test','https://bad .test'])assert.throws(()=>presentationPayload({...draft,website_url:url}))
  assert.throws(()=>presentationPayload({...draft,template:'custom-html'}));assert.throws(()=>presentationPayload({...draft,instagram_handle:'../profile'}))
})
test('Business resolver uses exact route slug; an old/mismatched tenant or missing configuration fails closed',async()=>{
  const row={id:'B',slug:'cafe-demo',name:'Café',is_active:true,currency_code:'ARS',timezone:'UTC',business_entitlements:{business_id:'B',loyalty_enabled:false},business_presentation:presentation}
  let seen;const sdk=data=>createClient('http://127.0.0.1:54321','unit-public-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async url=>{seen=new URL(url);return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}})}}})
  const c=sdk(row),result=await readBusiness(c,'cafe-demo',AbortSignal.timeout(1000));assert.equal(result.id,'B');assert.equal(seen.searchParams.get('slug'),'eq.cafe-demo');assert.equal(result.loyaltyEnabled,false)
  for(const bad of [{...row,slug:'old-tenant'},{...row,business_entitlements:null},{...row,business_presentation:{...presentation,business_id:'A'}}]){const client=sdk(bad);await assert.rejects(readBusiness(client,'cafe-demo',AbortSignal.timeout(1000)));await client.auth.dispose()}
  assert.equal(await readBusiness(c,'admin',AbortSignal.timeout(1000)),null);await c.auth.dispose()
})
test('Global authority reader never chooses a business even with multiple memberships',async()=>{
  const client=createClient('http://127.0.0.1:54321','unit-public-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async url=>new Response(JSON.stringify(String(url).includes('/rpc/')?false:[membership('A','staff'),membership('B','admin')]),{headers:{'Content-Type':'application/json'}})}})
  const data=await readAuthority(client,'self');assert.equal(data.tenant,null);assert.equal(data.operatorBusinesses.length,2);await client.auth.dispose()
})
