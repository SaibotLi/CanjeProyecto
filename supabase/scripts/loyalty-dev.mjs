// Only an unlinked LOCAL checkout. Public config stays in child-process memory.
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { localRuntime, localDockerHost, projectRoot } from './local-runtime.mjs'
const runtime = localRuntime()
const env = { ...process.env, DOCKER_HOST: localDockerHost(), VITE_SUPABASE_URL: runtime.url, VITE_SUPABASE_PUBLISHABLE_KEY: runtime.publishableKey }
delete env.DOCKER_CONTEXT
const web = join(projectRoot, 'apps', 'web')
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
  cwd: web, env, windowsHide: true, stdio: 'inherit',
})
child.on('error', () => { console.error('No pudimos iniciar el frontend LOCAL.'); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
process.on('SIGINT', () => child.kill('SIGINT'))
process.on('SIGTERM', () => child.kill('SIGTERM'))
