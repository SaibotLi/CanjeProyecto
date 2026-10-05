import { Link } from 'react-router-dom'
import { Icon } from '../../../components/Icon'
import { formatMenuPrice } from '../presentation'

export function PointsOnboarding({ currencyPerPoint }: { currencyPerPoint: number }) {
  return <aside className="menu-points-onboarding" aria-labelledby="menu-points-title"><p className="eyebrow"><span aria-hidden="true">⚡</span> VALHALLA POINTS</p><h2 id="menu-points-title">Cada consumo suma.</h2><p>Los puntos de la carta son estimados. Todavía no se acreditan puntos ni se habilitan canjes.</p><div className="menu-points-bottom"><small>Estimación: {formatMenuPrice(currencyPerPoint)} = 1 punto</small><Link to="/points" className="menu-points-link">Conocer más <Icon name="arrow" /></Link></div></aside>
}
