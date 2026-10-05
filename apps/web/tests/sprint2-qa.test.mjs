// Integration closure: SSR/static build contracts, not real-browser certification.
// Run AFTER build. Live DB/Auth/Storage journeys remain in the LOCAL suites.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../src/features/auth/authContext.ts'
import { AuthorityContext } from '../src/features/authority/authorityContext.ts'
import { initialAuthState } from '../src/features/auth/sessionStore.ts'
import { AuthRequired } from '../src/features/auth/AuthRequired.tsx'
import { BusinessAdminRequired } from '../src/features/authority/BusinessAdminRequired.tsx'
import { PlatformRequired } from '../src/features/authority/PlatformRequired.tsx'
import { ProfilePage } from '../src/pages/ProfilePage.tsx'
import { AuthStatus } from '../src/features/auth/components/AuthStatus.tsx'

const read = file => readFileSync(new URL(file, import.meta.url), 'utf8')
const render = (element, auth = {}) => renderToStaticMarkup(React.createElement(MemoryRouter, null,
  React.createElement(AuthContext.Provider, { value: { ...initialAuthState, initializing: false, store: {}, ...auth } },
    React.createElement(AuthorityContext.Provider, { value: { status: 'ready', checking: false, data: null, store: {} } }, element))))

test('2H profile input shares the DB 80-character boundary, labels and keyboard-submit form', () => {
  const html = render(React.createElement(ProfilePage), { session: { user: { id: 'self', email: 'synthetic@example.test' } },
    profile: { id: 'self', displayName: '', createdAt: '', updatedAt: '' }, profileStatus: 'ready' })
  assert.match(html, /maxLength="80"/)
  assert.match(html, /for="display-name"/)
  assert.match(html, /autoComplete="nickname"/)
  assert.match(html, /type="submit"/)
})
test('2H anonymous route guards hide profile/admin/platform/MFA children; customer cannot open tools', () => {
  const marker = React.createElement('span', null, 'PRIVATE-TOOLS-MARKER')
  for (const child of [marker, React.createElement(BusinessAdminRequired, null, marker), React.createElement(PlatformRequired, null, marker)]) {
    assert.doesNotMatch(render(React.createElement(AuthRequired, null, child)), /PRIVATE-TOOLS-MARKER/)
    assert.doesNotMatch(render(React.createElement(AuthRequired, null, child), { initializing: true }), /PRIVATE-TOOLS-MARKER/)
  }
  const customer = { session: { user: { id: 'self' } }, assurance: { currentLevel: 'aal2', nextLevel: 'aal2' } }
  for (const Guard of [BusinessAdminRequired, PlatformRequired]) assert.doesNotMatch(render(React.createElement(Guard, null, marker), customer), /PRIVATE-TOOLS-MARKER/)
})
test('2H accessible errors/loading and source-level focus/safe-area protections remain present', () => {
  assert.match(render(React.createElement(AuthStatus, { error: true, message: 'Error controlado' })), /role="alert"/)
  assert.match(render(React.createElement(AuthStatus, { message: 'Cargando' })), /role="status"/)
  const css = read('../src/styles/global.css')
  assert.match(css, /:focus-visible/)
  assert.match(css, /safe-area-inset-bottom/)
  assert.match(read('../src/features/menu/components/MenuItemCard.tsx'), /onError=/)
})
test('2H emitted PWA contains only static precache, no API runtime cache; Auth routes keep SPA fallback', () => {
  const sw = read('../dist/sw.js'), config = read('../vite.config.ts')
  const urls = [...sw.matchAll(/url:"([^"]+)"/g)].map(m => m[1])
  assert.ok(urls.length > 0)
  for (const url of urls) {
    assert.match(url, /^(?:assets\/[^/?]+\.(?:js|css|woff2|webp|png|svg)|icons\/[^/?]+\.svg|index\.html|registerSW\.js|manifest\.webmanifest)$/)
    assert.doesNotMatch(url, /auth\/v1|rest\/v1|storage\/v1|token|profiles|\.env/)
  }
  assert.match(config, /runtimeCaching:\s*\[\]/)
  assert.match(sw, /NavigationRoute/)
  assert.match(sw, /createHandlerBoundToURL\("index\.html"\)/)
  assert.equal((sw.match(/\.registerRoute\(/g) ?? []).length, 1, 'Only navigation fallback, besides the static precache route')
  assert.match(config, /devOptions:\s*\{\s*enabled:\s*false/)
  const manifest = JSON.parse(read('../dist/manifest.webmanifest'))
  assert.equal(manifest.display, 'standalone'); assert.equal(manifest.start_url, '/'); assert.equal(manifest.scope, '/')
})
