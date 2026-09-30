import { Link } from 'react-router-dom'
import { Icon } from '../../../components/Icon'

export function PointsOnboarding({ currencyPerPoint }: { currencyPerPoint: number }) {
  return <aside className="menu-points-onboarding" aria-labelledby="menu-points-title"><p className="eyebrow"><span aria-hidden="true">⚡</span> VALHALLA POINTS</p><h2 id="menu-points-title">Tu noche también suma.</h2><p>Cada ${currencyPerPoint.toLocaleString('es-AR')} que gastás suma 1 punto.</p><p className="muted">Acumulá puntos y desbloqueá recompensas.</p><Link to="/points" className="menu-points-link">Conocer más <Icon name="arrow" /></Link><small>Vista previa del programa de fidelización.</small></aside>
}
