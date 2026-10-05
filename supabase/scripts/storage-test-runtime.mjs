// LOCAL test tooling, never imported by React. Tested requests use public key/JWT.
import assert from 'node:assert/strict'
import { cli, localRuntime } from './local-runtime.mjs'

const runtime = localRuntime()
export const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=', 'base64')
export const objectRoute = (bucket, path) => `object/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`
export async function storageRequest(route, actor, method = 'GET', body, extraHeaders = {}, publicNoKey = false) {
  const response = await fetch(`${runtime.url}/storage/v1/${route}`, {
    method, signal: AbortSignal.timeout(20000),
    headers: {
      ...(publicNoKey ? {} : { apikey: runtime.publishableKey }),
      ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}),
      ...(Buffer.isBuffer(body) ? { 'Content-Type': 'image/png' } : body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...extraHeaders,
    },
    ...(body === undefined ? {} : { body: Buffer.isBuffer(body) ? body : JSON.stringify(body) }),
  })
  const bytes = Buffer.from(await response.arrayBuffer())
  let data = null
  if (response.headers.get('content-type')?.includes('application/json')) {
    try { data = JSON.parse(bytes.toString()) } catch { throw new Error('Non-JSON Storage API response') }
  }
  return { status: response.status, data, bytes, contentType: response.headers.get('content-type') }
}

// Server-only fixture capability. Never return keys/status or use for assertions.
// Whitelisted setup/cleanup actions, no generic privileged request interface.
export function storageFixtures() {
  const status = JSON.parse(cli(['status', '-o', 'json']))
  const setupToken = status.SERVICE_ROLE_KEY
  assert.ok(typeof setupToken === 'string', 'Local fixture credential available (not printed)')
  const fixtureBucket = bucket => assert.match(bucket, /^task2g-[a-z-]+-[0-9a-f-]{36}$/)
  const perform = async (route, method, body, binary = false) => {
    const response = await fetch(`${runtime.url}/storage/v1/${route}`, {
      method, signal: AbortSignal.timeout(20000),
      headers: { apikey: runtime.publishableKey, Authorization: `Bearer ${setupToken}`, 'Content-Type': binary ? 'image/png' : 'application/json' },
      ...(body === undefined ? {} : { body: binary ? body : JSON.stringify(body) }),
    })
    await response.arrayBuffer()
    if (response.status !== 200) throw new Error(`Local fixture setup/cleanup HTTP ${response.status}; response hidden`)
  }
  return {
    createBucket: async bucket => { fixtureBucket(bucket); await perform('bucket', 'POST', { id: bucket, name: bucket, public: false }) },
    seedObject: async (bucket, path) => { fixtureBucket(bucket); assert.match(path, /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/); await perform(objectRoute(bucket, path), 'POST', png, true) },
    removeObjects: async (bucket, paths) => {
      assert.ok(bucket === 'menu-images' || /^task2g-[a-z-]+-[0-9a-f-]{36}$/.test(bucket))
      for (const path of paths) assert.match(path, /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|avif)$/)
      if (paths.length) await perform(`object/${bucket}`, 'DELETE', { prefixes: paths })
    },
    removeBucket: async bucket => { fixtureBucket(bucket); await perform(`bucket/${bucket}`, 'DELETE') },
  }
}
