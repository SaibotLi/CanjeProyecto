import type { AuthStore } from '../auth/sessionStore'
import { readCurrentPlatformCapability, type AdminBusiness } from './authorityData'

export class PlatformAccessLost extends Error {
  constructor() { super('Volvé a comprobar tu acceso Platform.') }
}
export async function readPlatformBusinesses(auth: AuthStore, signal = AbortSignal.timeout(15000)): Promise<AdminBusiness[]> {
  const initial = auth.getSnapshot(), owner = initial.session?.user.id, revision = initial.revision
  const current = () => !!owner && !auth.getSnapshot().signingOut && auth.getSnapshot().session?.user.id === owner
    && auth.getSnapshot().revision === revision && !signal.aborted
  if (!current()) throw new PlatformAccessLost()
  const client = auth.getClient()
  const checkAccess = async () => {
    const capability = await readCurrentPlatformCapability(client, signal)
    const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel()
    if (!current() || !capability || assurance.error || assurance.data?.currentLevel !== 'aal2') throw new PlatformAccessLost()
  }
  await checkAccess()
  const businesses: AdminBusiness[] = []
  for (let start = 0; ; start += 500) {
    const { data, error } = await client.from('businesses').select('id,slug,name,is_active')
      .order('id').range(start, start + 499).abortSignal(signal)
    if (error || !data) throw new Error('No pudimos cargar los negocios.')
    if (!current()) throw new PlatformAccessLost()
    businesses.push(...data.map(b => ({ id: b.id, slug: b.slug, name: b.name, isActive: b.is_active })))
    if (data.length < 500) break
  }
  // A revoked row may turn a successful 200 into a public-only result. Do not
  // display that as a global success; recheck capability after the read too.
  await checkAccess()
  return businesses
}
