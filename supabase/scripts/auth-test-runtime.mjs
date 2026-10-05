// LOCAL TEST TOOLING ONLY. Real Auth endpoints; no token fabrication/SDK/storage.
import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { localRuntime } from './local-runtime.mjs'
import { confirmationLink, cleanupFixtureMail } from './auth-mail-runtime.mjs'

const runtime = localRuntime()
export async function http(path, actor, method = 'GET', body, extraHeaders = {}) {
  const response = await fetch(`${runtime.url}${path}`, {
    method, signal: AbortSignal.timeout(10000),
    headers: {
      apikey: runtime.publishableKey, 'Content-Type': 'application/json',
      ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}),
      ...extraHeaders,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const text = await response.text()
  let data
  try { data = text ? JSON.parse(text) : null } catch { throw new Error(`Non-JSON local response: HTTP ${response.status}`) }
  return { status: response.status, data }
}
const claims = token => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
export function aal(actor) { return claims(actor.token).aal }
export async function signup() {
  const email = `task2c-${randomUUID()}@example.test`
  const password = `${randomUUID()}!Aa9`
  // Caller owns this generated email BEFORE request, so failed/partial signup
  // can still be cleaned. Never return the password or full response.
  return { email, create: async () => {
    const r = await http('/auth/v1/signup', null, 'POST', {
      email, password, data: { role: 'admin', platform_admin: true, business_id: 'a11a0000-0000-4000-8000-000000000001', aal: 'aal2' },
    })
    assert.equal(r.status, 200, 'Real local Auth signup')
    // 2E enables confirmations. Keep real GoTrue JWT tests: verify the token
    // delivered by Mailpit, never auto-confirm via SQL/Admin or fabricate JWTs.
    assert.ok(!r.data.access_token, 'Signup requires confirmation')
    const link = await confirmationLink(email, 'signup')
    const confirmed = await http('/auth/v1/verify', null, 'POST', { token_hash: link.searchParams.get('token'), type: 'signup' })
    assert.equal(confirmed.status, 200, 'Real email confirmation')
    await cleanupFixtureMail()
    const actor = { id: confirmed.data.user?.id, token: confirmed.data.access_token }
    assert.match(actor.id ?? '', /^[0-9a-f-]{36}$/)
    assert.ok(typeof actor.token === 'string', 'Auth returned signed access token')
    assert.equal(claims(actor.token).sub, actor.id)
    assert.equal(claims(actor.token).role, 'authenticated')
    assert.equal(aal(actor), 'aal1')
    return actor
  } }
}
export function totp(secret, time = Date.now(), digits = 6, period = 30, algorithm = 'sha1') {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const ch of secret.toUpperCase().replace(/=+$/, '')) {
    const i = alphabet.indexOf(ch)
    assert.ok(i >= 0, 'Valid TOTP base32 alphabet')
    bits += i.toString(2).padStart(5, '0')
  }
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map(b => Number.parseInt(b, 2)))
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(time / 1000 / period)))
  const digest = createHmac(algorithm, key).update(counter).digest()
  const offset = digest.at(-1) & 15
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits)).toString().padStart(digits, '0')
}
export async function mfa(actor) {
  const enroll = await http('/auth/v1/factors', actor, 'POST', { factor_type: 'totp', friendly_name: `task2c-${randomUUID()}` })
  assert.equal(enroll.status, 200, 'Real TOTP enrolment (stop on failure; no simulated AAL2)')
  assert.equal(enroll.data.type, 'totp')
  const factorId = enroll.data.id
  assert.match(factorId, /^[0-9a-f-]{36}$/)
  const uri = new URL(enroll.data.totp.uri)
  const code = () => totp(enroll.data.totp.secret, Date.now(), Number(uri.searchParams.get('digits') ?? 6), Number(uri.searchParams.get('period') ?? 30), (uri.searchParams.get('algorithm') ?? 'sha1').toLowerCase())
  // Wrong code must not mint AAL2. Distinct challenge for legitimate verification.
  const badChallenge = await http(`/auth/v1/factors/${factorId}/challenge`, actor, 'POST', {})
  assert.equal(badChallenge.status, 200)
  const valid = code()
  const bad = await http(`/auth/v1/factors/${factorId}/verify`, actor, 'POST', { challenge_id: badChallenge.data.id, code: (Number(valid) + 1).toString().padStart(valid.length, '0').slice(-valid.length) })
  assert.equal(bad.status, 422, 'Invalid TOTP is rejected by Auth')
  const challenge = await http(`/auth/v1/factors/${factorId}/challenge`, actor, 'POST', {})
  assert.equal(challenge.status, 200)
  const verified = await http(`/auth/v1/factors/${factorId}/verify`, actor, 'POST', { challenge_id: challenge.data.id, code: code() })
  assert.equal(verified.status, 200, 'Real Auth challenge verification')
  const elevated = { id: actor.id, token: verified.data.access_token }
  assert.equal(aal(elevated), 'aal2')
  assert.ok(claims(elevated.token).amr.some(method => method.method === 'totp'), 'Signed session records TOTP authentication')
  assert.ok(elevated.token !== actor.token, 'MFA minted a different signed JWT')
  return elevated
}
