import { Link } from 'react-router-dom'
import { Icon } from '../../../components/Icon'

export function PointsOnboarding({ currencyPerPoint }: { currencyPerPoint: number }) {
  return <aside className="menu-points-onboarding" aria-labelledby="menu-points-title"><p className="eyebrow"><span aria-hidden="true">⚡</span> VALHALLA POINTS</p><h2 id="menu-points-title">Cada consumo suma.</h2><p>Acumulá puntos y desbloqueá recompensas.</p><div className="menu-points-bottom"><small>Preview: ${currencyPerPoint.toLocaleString('es-AR')} = 1 punto</small><Link to="/points" className="menu-points-link">Conocer más <Icon name="arrow" /></Link></div></aside>
}
