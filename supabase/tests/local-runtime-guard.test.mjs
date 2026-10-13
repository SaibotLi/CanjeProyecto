// Unit proof of target guards; no Docker engine, API or credentials required.
import test from 'node:test'
import assert from 'node:assert/strict'
import { localDockerHost } from '../scripts/local-runtime.mjs'

test('LOCAL tooling rejects remote Docker endpoints before invoking tools', () => {
  const savedHost = process.env.DOCKER_HOST, savedContext = process.env.DOCKER_CONTEXT
  try {
    delete process.env.DOCKER_CONTEXT
    for (const host of ['tcp://192.0.2.1:2375', 'ssh://example.invalid', 'npipe:////remote/pipe/docker_engine']) {
      process.env.DOCKER_HOST = host
      assert.throws(localDockerHost, { message: 'Refusing: non-local Docker host' })
    }
    for (const host of ['unix:///var/run/docker.sock', 'npipe:////./pipe/docker_engine', 'npipe:////./pipe/dockerDesktopLinuxEngine']) {
      process.env.DOCKER_HOST = host
      assert.equal(localDockerHost(), host)
    }
  } finally {
    if (savedHost === undefined) delete process.env.DOCKER_HOST
    else process.env.DOCKER_HOST = savedHost
    if (savedContext === undefined) delete process.env.DOCKER_CONTEXT
    else process.env.DOCKER_CONTEXT = savedContext
  }
})
