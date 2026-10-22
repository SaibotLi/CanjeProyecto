import { Link } from 'react-router-dom'
import { Icon } from '../../../components/Icon'
import { formatMenuPrice } from '../presentation'

export function PointsOnboarding({ currencyPerPoint,businessName='el comercio',pointsPath='/points' }: { currencyPerPoint: number;businessName?:string;pointsPath?:string }) {
  return <aside className="menu-points-onboarding" aria-labelledby="menu-points-title"><p className="eyebrow"><span aria-hidden="true">⚡</span> {businessName} · PUNTOS</p><h2 id="menu-points-title">Cada consumo suma.</h2><p>Mostrá tu código al personal al pagar. Los puntos se calculan sobre cada consumo confirmado.</p><div className="menu-points-bottom"><small>{formatMenuPrice(currencyPerPoint)} = 1 punto · sin acumular sobrantes</small><Link to={pointsPath} className="menu-points-link">Mis puntos <Icon name="arrow" /></Link></div></aside>
}
