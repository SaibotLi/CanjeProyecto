import type { MenuState } from '../menuState'

export function MenuLoadState({ status, onRetry }: { status: MenuState['status']; onRetry: () => void }) {
  if (status === 'success') return null
  return <section className="menu-load-state" aria-busy={status === 'loading'} aria-live="polite">
    {status === 'loading' ? <>
      <h2>Cargando la carta…</h2><p>Estamos consultando las bebidas de Valhalla.</p>
      <div className="menu-loading-placeholder" aria-hidden="true" /><div className="menu-loading-placeholder" aria-hidden="true" /><div className="menu-loading-placeholder" aria-hidden="true" />
    </> : <>
      <h2>{status === 'empty' ? 'La carta se está preparando' : status === 'not-found' ? 'Carta no disponible' : 'No pudimos cargar la carta'}</h2>
      <p>{status === 'empty' ? 'Todavía no hay bebidas publicadas. Volvé a consultar más tarde.' : status === 'not-found' ? 'La carta de Valhalla no está disponible en este momento.' : 'Revisá tu conexión e intentá nuevamente.'}</p>
      <button className="button-secondary" type="button" onClick={onRetry}>Volver a intentar</button>
    </>}
  </section>
}
