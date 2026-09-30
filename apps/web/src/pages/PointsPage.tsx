import { Link } from 'react-router-dom'
import { PageHeading } from '../components/PageHeading'
import { Icon } from '../components/Icon'
import { mockPoints, mockTransactions } from '../features/preview/data'

export function PointsPage() {
  return <>
    <PageHeading eyebrow="CADA VISITA CUENTA" title="Mis puntos" description="Un vistazo a cómo se verá tu cuenta en Valhalla." />
    <section className="balance-card"><div><p className="eyebrow">SALDO DE EJEMPLO</p><p className="balance-number">{mockPoints.balanceLabel}<span>{mockPoints.unit}</span></p><p className="muted">Tu próxima recompensa está más cerca.</p></div><Icon name="points" className="balance-icon" /><Link to="/rewards" className="button-primary">Explorar premios <Icon name="arrow" /></Link></section>
    <div className="section-heading"><h2>Últimos movimientos</h2><span className="muted">Muestra visual</span></div>
    <section className="transaction-list" aria-label="Historial de ejemplo">{mockTransactions.map(item => <article key={item.id} className="transaction-row"><span className="small-icon"><Icon name={item.positive ? 'points' : 'gift'} /></span><div><h3>{item.title}</h3><p className="muted">{item.detail}</p></div><strong className={item.positive ? 'delta positive' : 'delta'}>{item.deltaLabel}</strong></article>)}</section>
    <p className="context-note">Este saldo y estos movimientos son ficticios y no pertenecen a una cuenta real. El saldo no se calcula a partir de esta muestra parcial.</p>
  </>
}
