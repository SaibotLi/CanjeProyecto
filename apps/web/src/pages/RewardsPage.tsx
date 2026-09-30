import { PageHeading } from '../components/PageHeading'
import { Icon } from '../components/Icon'
import { mockRewards } from '../features/preview/data'

export function RewardsPage() {
  return <>
    <PageHeading eyebrow="MOTIVOS PARA VOLVER" title="Tus próximos premios" description="Así podrían verse las recompensas de Valhalla." />
    <section className="reward-grid" aria-label="Recompensas de ejemplo">{mockRewards.map((reward, index) => <article className="reward-card" key={reward.id}><div className="reward-top"><Icon name="gift" /><span className="points-tag">{reward.costLabel}</span></div><p className="eyebrow">PREMIO {String(index + 1).padStart(2, '0')}</p><h2>{reward.title}</h2><p className="muted">{reward.detail}</p><button className="button-secondary" type="button" disabled>Canje disponible más adelante</button></article>)}</section>
    <p className="context-note">Beneficios y costos ilustrativos. Ningún premio se puede canjear en esta versión.</p>
  </>
}
