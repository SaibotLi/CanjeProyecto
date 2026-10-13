// Explicit cleanup for this disposable LOCAL suite, never an economic DELETE.
import { readFileSync, unlinkSync } from 'node:fs'
import { localRuntime, localSql, cli } from './local-runtime.mjs'
localRuntime()
const marker = new URL('../.temp/sprint3b-fixtures.json', import.meta.url)
const owned = JSON.parse(readFileSync(marker, 'utf8'))
if (owned.version !== 1 || !owned.localOnly || !owned.economicFixtures
  || !Array.isArray(owned.users) || !Array.isArray(owned.businesses) || owned.businesses.length === 0
  || !Array.isArray(owned.emails)
  || !owned.users.every(id => /^[0-9a-f-]{36}$/.test(id))
  || !owned.businesses.every(id => /^[0-9a-f-]{36}$/.test(id))
  || !owned.emails.every(email => /^task2c-[0-9a-f-]{36}@example\.test$/.test(email))) {
  throw new Error('Refusing: invalid LOCAL fixture ownership')
}
const actual = JSON.parse(localSql("select coalesce(json_agg(json_build_object('id',id,'email',email)),'[]') from auth.users;"))
if (actual.some(user => !owned.users.includes(user.id) && !owned.emails.includes(user.email))) throw new Error('Refusing: unowned LOCAL Auth user')
const quote = id => `'${id}'` // UUIDs already validated, not arbitrary SQL input.
if (localSql(`select (select count(*) from storage.objects)+(select count(*) from public.businesses where id not in (${owned.businesses.map(quote).join(',')}));`) !== '0') {
  throw new Error('Refusing: unowned LOCAL business/Storage data')
}
// Destroy/recreate only the guarded disposable local schema. No bypass of
// ledger mutation triggers, no remote reset, no real-world economic records.
cli(['db','reset','--local'])
const count = localSql('select (select count(*) from auth.users)+(select count(*) from auth.mfa_factors)+(select count(*) from public.profiles)+(select count(*) from public.point_transactions)+(select count(*) from public.business_memberships)+(select count(*) from private.platform_admins)+(select count(*) from storage.objects);')
if (count !== '0') throw new Error('LOCAL cleanup residuals')
unlinkSync(marker)
console.log('Sprint 3 LOCAL fixtures removed through guarded schema reset; zero Auth/membership/MFA/ledger/Storage residuals.')
