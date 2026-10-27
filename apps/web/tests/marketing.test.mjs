import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MarketingPage } from '../src/marketing/MarketingPage.tsx'
import {
  commercialPaths,
  commercialPath,
  marketing,
  pageMetadata,
  contactLink,
} from '../src/marketing/config.ts'
import { isBusinessSlug } from '../src/features/business/businessRoutes.ts'
import {
  measureCommercial,
  setCommercialMeasurementConsent,
} from '../src/marketing/measurement.ts'
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('Commercial URLs use already reserved namespaces, never shadow an allowed tenant', () => {
  for (const path of commercialPaths) {
    assert.equal(commercialPath(path + '/'), path)
    if (path !== '/') assert.equal(isBusinessSlug(path.split('/')[1]), false)
  }
  for (const path of [
    '/valhalla-space',
    '/valhalla-space/admin',
    '/login',
    '/auth/callback',
    '/planes/unknown',
  ])
    assert.equal(commercialPath(path), null)
})
test('WhatsApp destination is exact and encoded; no dispatch, tracking, PII or unsupported channel', () => {
  const url = new URL(contactLink('loyalty'))
  assert.equal(url.origin, 'https://wa.me')
  assert.equal(url.pathname, '/5493455436036')
  assert.match(url.searchParams.get('text'), /Carta \+ Fidelización/)
  assert.equal(url.searchParams.size, 1)
  assert.equal(
    contactLink('demo', { whatsapp: 'javascript:bad', email: '' }),
    null,
  )
  assert.equal(
    contactLink('demo', { whatsapp: '', email: 'bad\n@example.test' }),
    null,
  )
  assert.match(
    contactLink('menu', { whatsapp: '', email: 'hello@example.test' }),
    /^mailto:hello@example.test\?subject=/,
  )
})
test('Commercial pages SSR without Auth, Supabase, profile or browser storage', () => {
  for (const path of commercialPaths) {
    const html = renderToStaticMarkup(
      React.createElement(MarketingPage, { path }),
    )
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1)
    assert.match(html, /commercial-main/)
    assert.doesNotMatch(
      html,
      /<form|type="submit"|sb_secret_|service_role|supabase\.co|TobiL8485/i,
    )
  }
  const home = renderToStaticMarkup(React.createElement(MarketingPage))
  for (const text of [
    '15.000',
    '35.000',
    'orientativo',
    'Valhalla Space',
    '/valhalla-space',
    'Canjes',
    'canjes',
    'demostración',
  ])
    assert.ok(home.toLowerCase().includes(text.toLowerCase()))
  assert.match(home, /datos de demostración/i)
  assert.match(home, /sin fecha comprometida/i)
})
test('Prerendered output has unique metadata, real crawlable text and canonicals on every page', () => {
  const titles = new Set()
  for (const path of commercialPaths) {
    const html = read(
      path === '/' ? '../dist/index.html' : `../dist${path}/index.html`,
    )
    const metadata = pageMetadata(path)
    titles.add(metadata.title)
    assert.equal((html.match(/<title>/g) ?? []).length, 1)
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1)
    assert.ok(html.includes(metadata.title))
    assert.ok(html.includes(`href="${new URL(path, marketing.origin).href}"`))
    assert.match(html, /name="robots" content="noindex,follow"/)
    assert.match(html, /og:image/)
    assert.match(html, /twitter:card/)
    assert.doesNotMatch(
      html,
      /commercial-content|commercial-head|src\/app\/main|registerSW\.js/,
    )
    assert.ok(gzipSync(html).length < 16000, 'HTML must remain small')
  }
  assert.equal(titles.size, commercialPaths.length)
  const app = read('../dist/app.html')
  assert.match(app, /noindex,follow/)
  assert.doesNotMatch(app, /<h1|class="marketing"|rel="canonical"/)
  assert.match(read('../dist/sitemap.xml'), /planes\/carta-digital/)
  assert.doesNotMatch(
    read('../dist/sitemap.xml'),
    /\/admin|\/profile|valhalla-space/,
  )
  assert.match(
    read('../dist/robots.txt'),
    /Allow: \//,
    'Crawler must see noindex, not be blocked from it',
  )
  assert.equal(
    readFileSync(
      new URL('../public/marketing/social.png', import.meta.url),
    ).readUInt32BE(16),
    1200,
  )
})
test('Vercel static routes and PWA fallback preserve tenant/Auth documents', () => {
  const routes = JSON.parse(read('../vercel.json')).rewrites
  for (const path of commercialPaths)
    assert.equal(
      routes.find((r) => r.source === path)?.destination,
      path === '/' ? '/index.html' : `${path}/index.html`,
    )
  assert.equal(routes.at(-1).destination, '/app.html')
  const sw = read('../dist/sw.js')
  assert.match(sw, /createHandlerBoundToURL\("app\.html"\)/)
  assert.match(sw, /contacto\|privacidad/)
})
test('Measurement stays off by default; opt-in events use only approved nonpersonal dimensions', () => {
  const events = []
  const previousWindow = globalThis.window
  globalThis.window = { dispatchEvent: (event) => events.push(event) }
  try {
    const event = { action: 'contact_open', placement: 'contact', plan: 'menu' }
    measureCommercial(event)
    assert.equal(events.length, 0)
    setCommercialMeasurementConsent(true)
    measureCommercial({
      ...event,
      email: 'must-not-pass',
      url: '?token=must-not-pass',
    })
    assert.equal(events.length, 1)
    assert.deepEqual(events[0].detail, event)
    setCommercialMeasurementConsent(false)
    measureCommercial(event)
    assert.equal(events.length, 1)
  } finally {
    setCommercialMeasurementConsent(false)
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})
