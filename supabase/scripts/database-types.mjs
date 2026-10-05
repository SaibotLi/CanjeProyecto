import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { cli, localRuntime } from './local-runtime.mjs'

const mode = process.argv[2]
if (!['--write', '--check'].includes(mode)) throw new Error('Use --write or --check')
localRuntime()
const raw = cli(['gen', 'types', '--local', '--lang', 'typescript', '--schema', 'public,private'])
if (!raw.includes('export type Database') || !/"?platform_admins"?\s*:/.test(raw)) {
  throw new Error('Unexpected generated schema; refusing to write')
}
// CLI 2.119.0 emits unformatted TS. Use the existing workspace compiler's
// deterministic printer, not manual edits or a new formatter dependency.
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url))
const ts = require('typescript')
const source = ts.createSourceFile('database.types.ts', raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
if (source.parseDiagnostics.length) throw new Error('Invalid generated TypeScript')
const generated = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(source)
const target = new URL('../types/database.types.ts', import.meta.url)
if (mode === '--write') {
  mkdirSync(new URL('../types/', import.meta.url), { recursive: true })
  // Generated exclusively from CLI stdout, never manually maintained.
  writeFileSync(target, generated, 'utf8')
  console.log('Local database types generated (public + private; not wired to React).')
} else {
  const existing = readFileSync(target, 'utf8').replaceAll('\r\n', '\n')
  if (existing !== generated.replaceAll('\r\n', '\n')) throw new Error('Database type drift: review migrations and regenerate locally')
  console.log('Local database types: zero drift.')
}
