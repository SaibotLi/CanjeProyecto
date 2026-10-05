import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createClient } from '@supabase/supabase-js'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { mapMenuItem, mapPublicMenu } from '../src/features/menu/menuMapper.ts'
import { readPublicMenu, publicMenuImageUrl } from '../src/features/menu/publicMenu.ts'
import { formatMenuPrice, previewMenuPoints } from '../src/features/menu/presentation.ts'
import { MenuItemCard } from '../src/features/menu/components/MenuItemCard.tsx'
import { MenuLoadState } from '../src/features/menu/components/MenuLoadState.tsx'

const path = 'a11a0000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.png'
const item = { id: 'i2', business_id: 'b', category_id: 'c2', name: 'Bebida', description: null,
  price_amount: 6500.50, image_path: null, image_alt: null, image_presentation: 'photo',
  is_active: true, is_available: false, is_featured: true, display_order: 20 }
const category = { id: 'c2', name: 'Categoría', slug: 'categoria', display_order: 20, is_active: true, menu_items: [item] }
const row = { id: 'b', is_active: true, loyalty_settings: { currency_per_point: 1000, points_enabled: true }, menu_categories: [category] }
const client = (fetchImpl = async () => { throw new Error('Unexpected network request') }) => createClient('http://127.0.0.1:54321', 'sb_publishable_test_only', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: fetchImpl },
})
const resolveImage = p => publicMenuImageUrl(client(), p)

test('explicit item mapping preserves cents, nulls, availability, featured and order', () => {
  assert.deepEqual(mapMenuItem(item, resolveImage), { id: 'i2', businessId: 'b', categoryId: 'c2', name: 'Bebida', description: undefined,
    price: 6500.50, imageUrl: undefined, imageAlt: undefined, imagePresentation: undefined, isAvailable: false, isFeatured: true, displayOrder: 20 })
  const mapped = mapMenuItem({ ...item, description: 'Texto', image_alt: 'Alt', image_path: path, image_presentation: 'cutout' }, resolveImage)
  assert.equal(mapped.imagePresentation, 'cutout')
  assert.equal(mapped.imageAlt, 'Alt')
  assert.equal(mapped.description, 'Texto')
})
test('public storage URL derivation makes zero network calls', () => {
  assert.equal(resolveImage(path), `http://127.0.0.1:54321/storage/v1/object/public/menu-images/${path}`)
})
test('ARS prices retain cents without changing integer presentation', () => {
  assert.match(formatMenuPrice(6500.50), /6\.500,50/)
  assert.match(formatMenuPrice(6500.01), /6\.500,01/)
  assert.match(formatMenuPrice(4000), /4\.000$/)
  assert.match(formatMenuPrice(999999999999.99), /999\.999\.999\.999,99/)
})
test('per-product estimate uses actual rule, never sum as total; invalid rule guarded', () => {
  assert.equal(previewMenuPoints(6500, 1000), 6)
  assert.equal(previewMenuPoints(13000, 1000), 13)
  assert.equal(previewMenuPoints(6500.50, 1500), 4)
  assert.equal(previewMenuPoints(0, 1000), 0)
  assert.equal(previewMenuPoints(1000, 0), 0)
  assert.equal(previewMenuPoints(NaN, 1000), 0)
})
test('stable order by displayOrder/id; empty and inactive categories/items hidden', () => {
  const mapped = mapPublicMenu({ ...row, menu_categories: [category,
    { ...category, id: 'c1', display_order: 20, menu_items: [{ ...item, id: 'i1', category_id: 'c1' }] },
    { ...category, id: 'empty', menu_items: [] },
    { ...category, id: 'draft', is_active: false },
    { ...category, id: 'unpublished', menu_items: [{ ...item, is_active: false }] },
  ] }, resolveImage)
  assert.deepEqual(mapped.categories.map(c => c.id), ['c1', 'c2'])
  assert.deepEqual(mapped.items.map(i => i.id), ['i1', 'i2'])
  assert.equal(mapPublicMenu({ ...row, menu_categories: [] }, resolveImage).items.length, 0)
})
test('real settings mapped, disabled points respected, invalid settings/tenant fail closed', () => {
  const disabled = mapPublicMenu({ ...row, loyalty_settings: { currency_per_point: 1500, points_enabled: false } }, resolveImage)
  assert.equal(disabled.previewCurrencyPerPoint, 1500)
  assert.equal(disabled.pointsEnabled, false)
  for (const settings of [null, { currency_per_point: 0 }, { currency_per_point: Infinity }]) {
    assert.throws(() => mapPublicMenu({ ...row, loyalty_settings: settings }, resolveImage))
  }
  assert.throws(() => mapPublicMenu({ ...row, menu_categories: [{ ...category, menu_items: [{ ...item, business_id: 'other' }] }] }, resolveImage))
  assert.throws(() => mapMenuItem({ ...item, price_amount: NaN }, resolveImage))
})
test('existing card renders cents, fallback, exhausted/featured and optional estimate', () => {
  const mapped = mapMenuItem(item, resolveImage)
  const markup = enabled => renderToStaticMarkup(createElement(MenuItemCard, { item: mapped, currencyPerPoint: 1000, pointsEnabled: enabled }))
  assert.match(markup(true), /6\.500,50/)
  assert.match(markup(true), /Sin imagen de Bebida/)
  assert.match(markup(true), /AGOTADO/)
  assert.match(markup(true), /RECOMENDADO/)
  assert.match(markup(true), /6 puntos estimados/)
  assert.doesNotMatch(markup(false), /drink-points/)
  assert.doesNotMatch(markup(true), /<img/)
})
test('loading/empty/error/not-found have controlled accessible markup; success removes state panel', () => {
  const markup = status => renderToStaticMarkup(createElement(MenuLoadState, { status, onRetry: () => {} }))
  assert.match(markup('loading'), /aria-busy="true"/)
  assert.match(markup('loading'), /Cargando la carta/)
  assert.doesNotMatch(markup('loading'), /<button/)
  for (const status of ['empty', 'error', 'not-found']) {
    assert.match(markup(status), /aria-live="polite"/)
    assert.match(markup(status), /Volver a intentar/)
    assert.doesNotMatch(markup(status), /drink-item|Budweiser|sb_publishable/)
  }
  assert.match(markup('empty'), /no hay bebidas publicadas/)
  assert.match(markup('not-found'), /Carta no disponible/)
  assert.match(markup('error'), /No pudimos cargar/)
  assert.equal(markup('success'), '')
})
test('actual query builder uses slug, explicit publication filters and stable orders', async () => {
  let calls = 0
  const c = client(async input => {
    calls++
    const url = new URL(input)
    assert.equal(url.pathname, '/rest/v1/businesses')
    for (const field of ['is_active', 'menu_categories.is_active', 'menu_categories.menu_items.is_active']) {
      assert.equal(url.searchParams.get(field), 'eq.true')
    }
    assert.equal(url.searchParams.get('slug'), 'eq.valhalla-space')
    for (const field of ['menu_categories.order', 'menu_categories.menu_items.order']) assert.equal(url.searchParams.get(field), 'display_order.asc,id.asc')
    return new Response(JSON.stringify([row]), { headers: { 'Content-Type': 'application/json' } })
  })
  assert.equal((await readPublicMenu(c)).kind, 'ready')
  assert.equal(calls, 1)
})
test('missing business is explicit, empty menu remains valid, no fallback on network/backend/bad settings', async () => {
  const responseClient = (data, status = 200) => client(async () => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }))
  assert.deepEqual(await readPublicMenu(responseClient([])), { kind: 'not-found' })
  assert.equal((await readPublicMenu(responseClient([{ ...row, menu_categories: [] }]))).data.items.length, 0)
  for (const c of [client(), responseClient({ code: 'XX', message: 'private detail' }, 500), responseClient([{ ...row, loyalty_settings: null }])]) {
    await assert.rejects(readPublicMenu(c), error => error.message === 'No pudimos cargar la carta. Intentá nuevamente.')
  }
})
