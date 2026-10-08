export function PreviewNotice({ publicMenu = false }: { publicMenu?: boolean }) {
  return <p className="preview-notice"><span className="status-dot" aria-hidden="true" />{publicMenu ? 'Carta de Valhalla · Puntos estimativos' : 'Vista de prueba · datos de ejemplo'}</p>
}
