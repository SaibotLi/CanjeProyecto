import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { loadEnv, resolveConfig } from 'vite'

const source = await readFile(new URL('../src/lib/env.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { readSupabaseEnvironment } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const publicConfig = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only',
}

test('missing configuration fails only when called', () => {
  assert.throws(() => readSupabaseEnvironment({}), /Faltan/)
  assert.throws(() => readSupabaseEnvironment({ VITE_SUPABASE_URL: publicConfig.VITE_SUPABASE_URL }), /Faltan/)
})

test('accepts public hosted and loopback URLs, normalizes whitespace', () => {
  for (const url of ['https://example.supabase.co/', 'http://127.0.0.1:54321', 'http://localhost:54321', 'http://[::1]:54321']) {
    assert.equal(readSupabaseEnvironment({ ...publicConfig, VITE_SUPABASE_URL: ` ${url} ` }).url, new URL(url).origin)
  }
})

test('rejects invalid, non-local HTTP and URLs carrying credentials or query', () => {
  for (const url of ['invalid', 'http://example.com', 'ftp://localhost', 'https://user:password@example.com', 'https://example.com?token=fake', 'https://example.com/path', 'https://example.com#fake']) {
    assert.throws(() => readSupabaseEnvironment({ ...publicConfig, VITE_SUPABASE_URL: url }))
  }
})

test('rejects secret/legacy keys without echoing the value', () => {
  for (const key of ['sb_secret_test_only', 'eyJ.fake.test', 'sb_publishable_']) {
    assert.throws(() => readSupabaseEnvironment({ ...publicConfig, VITE_SUPABASE_PUBLISHABLE_KEY: key }), error => !error.message.includes(key))
  }
})

test('example has only empty public Supabase variables', async () => {
  const example = await readFile(new URL('../.env.example', import.meta.url), 'utf8')
  const lines = example.split(/\r?\n/).filter(line => line && !line.startsWith('#'))
  assert.deepEqual(lines, ['VITE_SUPABASE_URL=', 'VITE_SUPABASE_PUBLISHABLE_KEY='])
})

test('real Vite config resolves envDir to apps/web, not workspace root', async () => {
  const webDirectory = fileURLToPath(new URL('../', import.meta.url)).replace(/[\\/]$/, '')
  const config = await resolveConfig({ root: webDirectory, configFile: `${webDirectory}/vite.config.ts` }, 'serve')
  assert.equal(config.envDir.replaceAll('\\', '/'), webDirectory.replaceAll('\\', '/'))
  assert.equal(config.envPrefix ?? 'VITE_', 'VITE_') // No custom exposure.
  const env = loadEnv('development', config.envDir, 'VITE_')
  assert.ok(Object.keys(env).every(key => key.startsWith('VITE_')))
})
