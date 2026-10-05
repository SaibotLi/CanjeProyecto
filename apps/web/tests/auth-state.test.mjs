import test from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createAuthStore, initialAuthState, sessionTransition, authGate, needsMfa } from '../src/features/auth/sessionStore.ts'
import { mapProfile, updateDisplayName, signUp, requestRecovery, authMessage, verifyTotp, totpQrSource } from '../src/features/auth/authData.ts'
import { AuthContext } from '../src/features/auth/authContext.ts'
import { AuthRequired } from '../src/features/auth/AuthRequired.tsx'
import { AuthPage } from '../src/pages/AuthPage.tsx'
import { AuthCallbackPage } from '../src/pages/AuthCallbackPage.tsx'
import { RecoveryPage } from '../src/pages/RecoveryPage.tsx'

const session = id => ({ user: { id, email: `${id}@example.test` } })
const row = id => ({ id, display_name: id, created_at: '2026-10-05', updated_at: '2026-10-05' })
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
function harness() {
  let callback
  let unsubscribed = 0
  const reads = []
  const client = {
    auth: { onAuthStateChange(fn) { callback = fn; return { data: { subscription: { unsubscribe() { unsubscribed++ } } } } },
      initialize: async () => ({ error: null }), signOut: async () => ({ error: null }),
      mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null }) } },
    from: () => ({ select: () => ({ eq: (_field, id) => ({ single: () => { const d = deferred(); reads.push({ id, ...d }); return d.promise } }) }) }),
  }
  return { client, reads, event: (event, value) => callback(event, value), unsubscribed: () => unsubscribed }
}
test('initial/loading/anonymous/self-only gates have no authority role', () => {
  assert.equal(authGate(initialAuthState), 'loading')
  assert.equal(authGate({ ...initialAuthState, initializing: false }), 'login')
  assert.equal(authGate({ ...initialAuthState, initializing: false, session: session('A') }), 'allowed')
  assert.equal(authGate({ ...initialAuthState, initializing: false, unavailable: true }), 'unavailable')
  assert.equal(needsMfa({ currentLevel: 'aal1', nextLevel: 'aal2' }), true)
  assert.equal(needsMfa({ currentLevel: 'aal2', nextLevel: 'aal2' }), false)
  assert.equal(needsMfa(null), false)
})
test('events update session; logout and A→B clear private data synchronously', () => {
  const a = { ...sessionTransition(initialAuthState, 'SIGNED_IN', session('A')), profile: mapProfile(row('A'), 'A') }
  const b = sessionTransition(a, 'SIGNED_IN', session('B'))
  assert.equal(b.profile, null)
  assert.equal(b.assurance, null)
  assert.equal(sessionTransition(a, 'SIGNED_OUT', null).profile, null)
  assert.equal(sessionTransition(a, 'TOKEN_REFRESHED', session('A')).session.user.id, 'A')
  assert.equal(sessionTransition(a, 'USER_UPDATED', session('A')).profile.id, 'A')
  const recovery = sessionTransition(a, 'PASSWORD_RECOVERY', session('A'))
  assert.ok(recovery.recovery)
  assert.ok(sessionTransition(recovery, 'INITIAL_SESSION', session('A')).recovery)
  assert.equal(sessionTransition(recovery, 'SIGNED_IN', session('B')).recovery, false)
  assert.equal(sessionTransition(recovery, 'SIGNED_OUT', null).recovery, false)
})
test('store subscription + deferred profiles discard late A responses after B login', async () => {
  const h = harness(), store = createAuthStore(h.client)
  store.connect(); h.event('INITIAL_SESSION', session('A'))
  await delay(10)
  assert.equal(store.getSnapshot().initializing, false)
  h.event('SIGNED_OUT', null); h.event('SIGNED_IN', session('B'))
  assert.equal(store.getSnapshot().profile, null)
  await delay(10)
  for (const r of h.reads.filter(r => r.id === 'B')) r.resolve({ data: row('B'), error: null })
  await delay(10)
  for (const r of h.reads.filter(r => r.id === 'A')) r.resolve({ data: row('A'), error: null })
  await delay(10)
  assert.equal(store.getSnapshot().profile.id, 'B')
  store.disconnect(); assert.equal(h.unsubscribed(), 1)
})
test('logout hides private state before network; failure is explicit and retryable', async () => {
  const h = harness(), pending = deferred()
  h.client.auth.signOut = () => pending.promise
  const store = createAuthStore(h.client)
  store.connect(); h.event('INITIAL_SESSION', session('A'))
  await delay(5)
  const logout = store.signOut()
  assert.equal(store.getSnapshot().session, null)
  assert.equal(store.getSnapshot().profile, null)
  h.event('SIGNED_IN', session('A')) // cannot resurrect A during logout
  assert.equal(store.getSnapshot().session, null)
  pending.resolve({ error: { code: 'network_error' } })
  await assert.rejects(logout)
  assert.equal(store.getSnapshot().logoutError, true)
  h.event('TOKEN_REFRESHED', session('A'))
  assert.equal(store.getSnapshot().session, null, 'Failed logout cannot resurrect the hidden identity')
  h.client.auth.signOut = async () => ({ error: null })
  await store.signOut(); assert.equal(store.getSnapshot().logoutError, false)
  store.disconnect()
})
test('malformed callback with prior login stays rejected after reconnect/URL cleanup', async () => {
  const previous = globalThis.window
  globalThis.window = { location: { pathname: '/auth/callback', hash: '#malformed' }, history: { state: null, replaceState() { globalThis.window.location.hash = '' } } }
  const h = harness(), store = createAuthStore(h.client)
  try {
    store.connect(); h.event('INITIAL_SESSION', session('A')); await delay(10)
    assert.equal(store.getSnapshot().callbackAccepted, false)
    store.disconnect(); store.connect(); h.event('INITIAL_SESSION', session('A')); await delay(10)
    assert.equal(store.getSnapshot().callbackAccepted, false)
  } finally { store.disconnect(); if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})
test('profile mapper never copies email/metadata; UPDATE contains only display_name and own id', async () => {
  assert.deepEqual(Object.keys(mapProfile(row('A'), 'A')), ['id', 'displayName', 'createdAt', 'updatedAt'])
  assert.throws(() => mapProfile(row('A'), 'B'))
  let payload, filter
  const client = { from: table => { assert.equal(table, 'profiles'); return { update(value) { payload = value; return { eq(field, id) { filter = [field, id]; return { select: () => ({ single: async () => ({ data: { ...row(id), display_name: value.display_name }, error: null }) }) } } } } } } }
  assert.equal((await updateDisplayName(client, 'A', ' Alice ')).displayName, 'Alice')
  assert.deepEqual(payload, { display_name: 'Alice' }); assert.deepEqual(filter, ['id', 'A'])
  assert.equal((await updateDisplayName(client, 'A', ' ')).displayName, null)
  assert.equal((await updateDisplayName(client, 'A', 'x'.repeat(80))).displayName.length, 80)
  payload = undefined
  await assert.rejects(() => updateDisplayName(client, 'A', 'x'.repeat(81)), /hasta 80 caracteres/)
  assert.equal(payload, undefined, 'Reject before requesting a DB write')
})
test('signup confirmation state and recovery use exact redirects with no user metadata', async () => {
  let signup, recovery
  const client = { auth: { signUp: async value => { signup = value; return { data: { session: null }, error: null } }, resetPasswordForEmail: async (email, options) => { recovery = { email, options }; return { error: null } } } }
  assert.equal((await signUp(client, ' a@example.test ', 'ephemeral', 'http://127.0.0.1:5173')).data.session, null)
  assert.deepEqual(Object.keys(signup.options), ['emailRedirectTo'])
  assert.equal(signup.options.emailRedirectTo, 'http://127.0.0.1:5173/auth/callback')
  await requestRecovery(client, ' a@example.test ', 'http://127.0.0.1:5173')
  assert.equal(recovery.options.redirectTo, 'http://127.0.0.1:5173/auth/recovery')
})
test('MFA verifies real challenge contract; errors cannot promote a session', async () => {
  const calls = []
  const client = { auth: { mfa: { challenge: async p => { calls.push(p); return { data: { id: 'challenge' }, error: null } }, verify: async p => { calls.push(p); return { error: null } } } } }
  await verifyTotp(client, 'factor', '123456')
  assert.deepEqual(calls, [{ factorId: 'factor' }, { factorId: 'factor', challengeId: 'challenge', code: '123456' }])
  await assert.rejects(() => verifyTotp(client, 'factor', 'bad'))
  client.auth.mfa.verify = async () => ({ error: { code: 'mfa_verification_failed' } })
  await assert.rejects(() => verifyTotp(client, 'factor', '123456'))
})
const markup = (element, overrides = {}) => renderToStaticMarkup(React.createElement(MemoryRouter, null,
  React.createElement(AuthContext.Provider, { value: { ...initialAuthState, initializing: false, ...overrides, store: { getClient() {} } } }, element)))
test('guard/callback/recovery SSR: no private content or password form without valid context', () => {
  const privateContent = React.createElement(AuthRequired, null, React.createElement('span', null, 'private-value'))
  assert.ok(!markup(privateContent).includes('private-value'))
  assert.ok(markup(privateContent, { session: session('A') }).includes('private-value'))
  assert.ok(markup(React.createElement(AuthCallbackPage)).includes('Revisá el enlace'))
  assert.ok(!markup(React.createElement(RecoveryPage), { session: session('A') }).includes('type="password"'))
  assert.ok(markup(React.createElement(RecoveryPage), { session: session('A'), recovery: true }).includes('new-password'))
  assert.ok(!markup(React.createElement(RecoveryPage), { session: session('A'), recovery: true, linkError: true }).includes('type="password"'))
})
test('TOTP QR raw SDK SVG is encoded without URL fragments or external resources', () => {
  const qr = totpQrSource('data:image/svg+xml;utf-8,<svg><path fill="#fff"/></svg>')
  assert.ok(qr.includes('%23fff')); assert.ok(!qr.includes('#'))
  assert.throws(() => totpQrSource('https://example.test/image'))
})
test('auth forms semantic labels/autocomplete/loading and consistent safe errors', () => {
  const login = markup(React.createElement(AuthPage, { mode: 'login' }))
  assert.ok(login.includes('for="email-login"')); assert.ok(login.includes('autoComplete="current-password"'))
  const register = markup(React.createElement(AuthPage, { mode: 'register' }))
  assert.ok(register.includes('autoComplete="new-password"')); assert.ok(register.includes('password-confirmation'))
  assert.ok(!markup(React.createElement(AuthPage, { mode: 'login' }), { initializing: true }).includes('type="password"'))
  assert.ok(!authMessage({ message: 'sensitive secret', code: 'unknown' }).includes('sensitive'))
  assert.ok(authMessage({ code: 'invalid_credentials' }).includes('no son correctos'))
  assert.ok(authMessage({ code: 'otp_expired' }).includes('enlace'))
})
