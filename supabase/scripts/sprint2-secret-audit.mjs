// Read-only, value-redacted audit of source, ignored env/logs and generated bundle.
// Not a credential scanner certification; runtime Docker/CLI credential stores
// and dependencies are deliberately not repository artifacts under this audit.
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { projectRoot } from './local-runtime.mjs'

const files = new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'],
  { cwd: projectRoot, encoding: 'utf8', windowsHide: true }).trim().split(/\r?\n/).filter(Boolean).map(file => file.replaceAll('\\', '/')))
function walk(directory, bundle = false) {
  if (!existsSync(directory)) return
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', '.git', '.temp'].includes(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) walk(path, bundle)
    else if (bundle || entry.name.startsWith('.env') || /\.(?:log|pem|key)$/i.test(entry.name)) files.add(relative(projectRoot, path).replaceAll('\\', '/'))
  }
}
walk(projectRoot)
walk(join(projectRoot, 'apps/web/dist'), true)
const patterns = [
  ['secret API key', /\bsb_secret_[A-Za-z0-9_-]{20,}\b/g],
  ['JWT literal', /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{16,}\b/g],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['provider token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|GOCSPX-[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,})\b/g],
  ['password-bearing DB URL', /postgres(?:ql)?:\/\/[^\s:'"/]+:[^\s@'"/]+@[^\s'"<>]+/g],
  ['credential literal', /(?:DB_PASSWORD|SUPABASE_SERVICE_ROLE_KEY|client_secret|totp_secret|refresh_token|access_token)\s*[=:]\s*['"][A-Za-z0-9+/_=-]{16,}['"]/gi],
  ['DB password env literal', /^\s*(?:DB_PASSWORD|POSTGRES_PASSWORD)\s*=\s*['"]?[A-Za-z0-9+/_=-]{5,}['"]?\s*$/gm],
]
let scanned = 0
const findings = []
for (const file of [...files].sort()) {
  const path = join(projectRoot, file)
  if (!existsSync(path) || !statSync(path).isFile() || !/(?:\.(?:m?[jt]sx?|json|sql|toml|ya?ml|md|html|css|txt|log|map|pem|key)|(?:^|[/\\])\.env[^/\\]*)$/i.test(file)) continue
  const source = readFileSync(path, 'utf8'); scanned++
  for (const [kind, pattern] of patterns) {
    pattern.lastIndex = 0
    for (const match of source.matchAll(pattern)) findings.push({ file, line: source.slice(0, match.index).split('\n').length, kind })
  }
}
console.log(JSON.stringify({ scanned, findings, scope: 'repository + ignored env/logs + dist; values never printed' }))
if (findings.length) process.exitCode = 1
