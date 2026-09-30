import { Link } from 'react-router-dom'
import { PageHeading } from '../components/PageHeading'
import { Icon } from '../components/Icon'
import { mockProfile } from '../features/preview/data'

export function ProfilePage() {
  return <>
    <PageHeading eyebrow="TU ESPACIO EN VALHALLA" title="Mi perfil" description="Una vista previa de tu identidad dentro de la comunidad." />
    <div className="profile-grid"><section className="profile-card"><div className="avatar" aria-hidden="true">{mockProfile.initials}</div><h2>{mockProfile.name}</h2><p className="muted">{mockProfile.caption}</p><span className="outline-tag">Cuenta de ejemplo</span></section>
    <section className="qr-card"><span className="eyebrow">IDENTIFICACIÓN FUTURA</span><div className="qr-placeholder" role="img" aria-label="Espacio reservado para QR, no escaneable"><Icon name="scan" /><span>QR pendiente</span></div><p className="muted">Tu código aparecerá acá cuando habilitemos las cuentas.</p></section></div>
    <section className="profile-links" aria-label="Accesos de perfil"><Link to="/points"><span><Icon name="history" />Mi historial de puntos</span><Icon name="arrow" /></Link><Link to="/rewards"><span><Icon name="gift" />Explorar recompensas</span><Icon name="arrow" /></Link></section>
  </>
}
