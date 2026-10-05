// CLI 2.119.0 mounts only the test directory, not sibling fixtures. Resolve the
// one reviewed include into an ignored temporary test suite (no source copies).
import { readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { cli, localRuntime, projectRoot } from './local-runtime.mjs'

localRuntime()
const directory = mkdtempSync(join(projectRoot, 'supabase', '.temp', 'task-2c-pgtap-'))
const files = ['01_schema.test.sql', '02_integrity.test.sql', '03_auth_seed.test.sql', '04_authorization_inventory.test.sql', '05_storage_inventory.test.sql', '06_platform_capability.test.sql']
const written = []
try {
  const fixture = readFileSync(new URL('../fixtures/catalog.sql', import.meta.url), 'utf8')
  for (const filename of files) {
    let sql = readFileSync(new URL(`../tests/${filename}`, import.meta.url), 'utf8')
    sql = sql.replace('\\ir ../fixtures/catalog.sql', fixture)
    if (sql.includes('\\ir ')) throw new Error('Unexpected unresolved test include')
    const target = join(directory, filename)
    writeFileSync(target, sql, 'utf8')
    written.push(target)
  }
  const localPath = relative(projectRoot, directory).replaceAll('\\', '/')
  console.log(cli(['test', 'db', '--local', localPath]))
} catch (error) {
  console.error(error.message ?? 'Local pgTAP setup failed')
  // This command contains no credentials or Auth bodies. Still redact possible
  // connection strings/tokens from tool diagnostics before showing test failures.
  if (error.toolOutput) console.error(error.toolOutput
    .replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted database URL]')
    .replace(/sb_(?:secret|publishable)_[\w-]+/g, '[redacted key]')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[redacted JWT]'))
  process.exitCode = 1
} finally {
  // Delete only exact generated files created above; no recursive workspace removal.
  for (const target of written) unlinkSync(target)
  rmdirSync(directory)
}
