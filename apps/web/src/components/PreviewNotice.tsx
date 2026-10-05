export function PreviewNotice({ publicMenu = false }: { publicMenu?: boolean }) {
  return <p className="preview-notice"><span className="status-dot" aria-hidden="true" />{publicMenu ? 'Carta conectada · vista de prueba' : 'Vista de prueba · datos de ejemplo'}</p>
}
