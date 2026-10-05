// Local test/generation tooling only. Never imported by React.
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url))
export function run(command, args, input, testDiagnostics = false) {
  const result = spawnSync(command, args, {
    cwd: projectRoot, encoding: 'utf8', input, timeout: 60000,
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
    windowsHide: true,
  })
  // Do not leak CLI status, credentials, Auth responses or SQL inputs on errors.
  if (result.error || result.status !== 0) {
    const error = new Error(`Local tool failed: ${command} (exit ${result.status ?? 'unavailable'})`)
    // Only pgTAP diagnostics may be returned. Never attach status JSON, SQL
    // input or credential-bearing output to an uncaught Node error.
    if (testDiagnostics) error.toolOutput = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
      .replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted database URL]')
      .replace(/sb_(?:secret|publishable)_[\w-]+/g, '[redacted key]')
      .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[redacted JWT]')
    throw error
  }
  return result.stdout.trim()
}
export function cli(args) {
  // Arguments are fixed by our source code, never user input.
  const testDiagnostics = args[0] === 'test' && args[1] === 'db'
  if (process.platform === 'win32') {
    return run(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `node_modules\\.bin\\supabase.cmd ${args.join(' ')}`], undefined, testDiagnostics)
  }
  return run('./node_modules/.bin/supabase', args, undefined, testDiagnostics)
}
export function localSql(sql) {
  return run('docker', ['exec', '-i', 'supabase_db_canjeproyect', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], sql)
}
export function localRuntime() {
  const config = readFileSync(new URL('../config.toml', import.meta.url), 'utf8')
  if (!/^project_id = "canjeproyect"$/m.test(config) || existsSync(new URL('../.temp/project-ref', import.meta.url))) {
    throw new Error('Refusing: unexpected project or hosted link')
  }
  const label = run('docker', ['inspect', 'supabase_db_canjeproyect', '--format', '{{index .Config.Labels "com.supabase.cli.project"}}'])
  if (label !== 'canjeproyect') throw new Error('Refusing: unexpected Docker target')
  let status, db
  try {
    status = JSON.parse(cli(['status', '-o', 'json']))
    db = new URL(status.DB_URL)
  } catch {
    throw new Error('Invalid local status; details hidden to protect credentials')
  }
  if (status.API_URL !== 'http://127.0.0.1:54321' || db.hostname !== '127.0.0.1' || db.port !== '54322' || db.pathname !== '/postgres') {
    throw new Error('Refusing: non-local or unexpected endpoint')
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(status.PUBLISHABLE_KEY)) throw new Error('Missing local publishable key')
  // Retain only the public API key in process memory; never return the status.
  return { url: status.API_URL, publishableKey: status.PUBLISHABLE_KEY }
}
