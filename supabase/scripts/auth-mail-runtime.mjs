// LOCAL fixtures only. Never imported by the app. No mail/link/token logging.
import { setTimeout as delay } from 'node:timers/promises'

const mailOrigin = 'http://127.0.0.1:54324'
const ownedMessages = new Set()
export async function confirmationLink(email, type) {
  if (!/^task2[bcef]-[0-9a-f-]{36}@example\.test$/.test(email) || !['signup', 'recovery'].includes(type)) {
    throw new Error('Refusing non-fixture mailbox')
  }
  for (let attempt = 0; attempt < 40; attempt++) {
    const response = await fetch(`${mailOrigin}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error('LOCAL Mailpit unavailable')
    const index = await response.json()
    for (const message of index.messages ?? []) {
      ownedMessages.add(message.ID)
      const detailResponse = await fetch(`${mailOrigin}/api/v1/message/${encodeURIComponent(message.ID)}`, { signal: AbortSignal.timeout(5000) })
      const detail = await detailResponse.json()
      const links = `${detail.Text ?? ''}\n${detail.HTML ?? ''}`.match(/http:\/\/127\.0\.0\.1:54321\/auth\/v1\/verify\?[^\s<>"']+/g) ?? []
      for (const raw of links) {
        const link = new URL(raw.replaceAll('&amp;', '&'))
        if (link.searchParams.get('type') === type) return link
      }
    }
    await delay(100)
  }
  throw new Error('Expected LOCAL fixture email not received (details hidden)')
}
export async function followAuthLink(link) {
  if (link.origin !== 'http://127.0.0.1:54321' || link.pathname !== '/auth/v1/verify') throw new Error('Refusing non-local Auth link')
  const response = await fetch(link, { redirect: 'manual', signal: AbortSignal.timeout(10000) })
  if (response.status !== 303 && response.status !== 302) throw new Error('LOCAL Auth did not redirect')
  const target = new URL(response.headers.get('location'))
  if (!['http://127.0.0.1:5173', 'http://localhost:5173'].includes(target.origin)) throw new Error('Unexpected Auth redirect origin')
  return target
}
export async function cleanupFixtureMail() {
  // Only exact message IDs discovered in our generated fixture mailboxes, not the inbox.
  for (const id of ownedMessages) {
    const response = await fetch(`${mailOrigin}/api/v1/messages`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ IDs: [id] }), signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error('LOCAL fixture mail cleanup failed')
    ownedMessages.delete(id)
  }
}
