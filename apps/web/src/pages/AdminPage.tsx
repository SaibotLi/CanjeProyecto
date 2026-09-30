import { PageHeading } from '../components/PageHeading'
import { Icon } from '../components/Icon'
import type { IconName } from '../components/Icon'

const tools: { title: string; detail: string; icon: IconName }[] = [
  { title: 'Registrar compra', detail: 'Acreditar el consumo de un cliente.', icon: 'points' },
  { title: 'Escanear cliente', detail: 'Identificar una cuenta en el local.', icon: 'scan' },
  { title: 'Validar voucher', detail: 'Verificar un canje de un solo uso.', icon: 'gift' },
  { title: 'Administrar carta', detail: 'Organizar categorías y productos.', icon: 'menu' },
  { title: 'Administrar premios', detail: 'Configurar las recompensas del negocio.', icon: 'settings' },
  { title: 'Historial', detail: 'Consultar movimientos y correcciones.', icon: 'history' },
]
export function AdminPage() {
  return <>
    <PageHeading eyebrow="VALHALLA · OPERACIÓN" title="Panel administrativo" description="Las herramientas del local, reunidas en un solo lugar." />
    <p className="admin-notice">Vista pública de demostración. Los permisos y las operaciones se habilitarán en una etapa posterior.</p>
    <section className="admin-grid" aria-label="Herramientas futuras">{tools.map(tool => <article className="admin-card" key={tool.title}><span className="small-icon"><Icon name={tool.icon} /></span><h2>{tool.title}</h2><p className="muted">{tool.detail}</p><button type="button" className="button-secondary" disabled>Próximamente</button></article>)}</section>
  </>
}
