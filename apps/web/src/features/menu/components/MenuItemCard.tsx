import type { MenuItem } from '../types'
import { formatMenuPrice, previewMenuPoints } from '../presentation'

export function MenuItemCard({ item, currencyPerPoint }: { item: MenuItem; currencyPerPoint: number }) {
  return <article className={['drink-item', item.isFeatured ? 'drink-featured' : '', !item.isAvailable ? 'drink-unavailable' : ''].filter(Boolean).join(' ')}>
    {item.isFeatured && <p className="featured-label">RECOMENDADO · VALHALLA</p>}
    {item.imageUrl && <img className="drink-image" src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" width="480" height="320" />}
    <div className="drink-title-row"><h3>{item.name}</h3>{!item.isAvailable && <span className="unavailable-label">AGOTADO</span>}</div>
    {item.description && <p className="drink-description">{item.description}</p>}
    <div className="drink-details"><strong className="drink-price">{formatMenuPrice(item.price)}</strong><span className="drink-points" aria-label={`${previewMenuPoints(item.price, currencyPerPoint)} puntos de muestra`}><span aria-hidden="true">⚡</span> +{previewMenuPoints(item.price, currencyPerPoint)} PTS</span></div>
  </article>
}
