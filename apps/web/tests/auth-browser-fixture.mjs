// SDK contract test adapter, NOT a browser/visual test or browser policy workaround.
// Real GoTrue redirects are supplied to the SDK; no manual token parsing/copying.
export function memoryStorage() {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}
export function sdkWindow(href) {
  const location = new URL(href)
  const previous = { window: globalThis.window, document: globalThis.document }
  globalThis.window = { location, history: { state: null, replaceState: (_state, _title, url) => { location.href = new URL(url, location).href } }, addEventListener() {}, removeEventListener() {} }
  globalThis.document = { visibilityState: 'hidden' }
  return { location, close() {
    if (previous.window === undefined) delete globalThis.window
    else globalThis.window = previous.window
    if (previous.document === undefined) delete globalThis.document
    else globalThis.document = previous.document
  } }
}
