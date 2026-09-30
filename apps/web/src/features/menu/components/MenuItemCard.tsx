import { useState } from 'react'
import type { MenuItem } from '../types'
import { formatMenuPrice, previewMenuPoints } from '../presentation'

export function MenuItemCard({ item, currencyPerPoint }: { item: MenuItem; currencyPerPoint: number }) {
  const [failedImageUrl, setFailedImageUrl] = useState<string>()
  const hasImage = item.imageUrl && item.imageUrl !== failedImageUrl
  return <article className={['drink-item', item.isFeatured ? 'drink-featured' : '', !item.isAvailable ? 'drink-unavailable' : ''].filter(Boolean).join(' ')}>
    <div className="drink-media">
      {hasImage ? <img className="drink-image" src={item.imageUrl} alt={item.imageAlt ?? `Ilustración de muestra para ${item.name}`} loading="lazy" decoding="async" width={item.isFeatured ? 640 : 80} height={item.isFeatured ? 360 : 80} onError={() => setFailedImageUrl(item.imageUrl)} /> : <div className="drink-image-placeholder" role="img" aria-label={`Sin imagen de ${item.name}`}><svg viewBox="0 0 80 80" aria-hidden="true"><path d="M24 19h32l-5 42H29zM29 32h22M39 32l7-20" /><path d="M34 40h9v9h-9z" /></svg></div>}
      {item.isFeatured && <p className="featured-label"><span aria-hidden="true">★</span> RECOMENDADO</p>}
    </div>
    <div className="drink-content">
      <div className="drink-title-row"><h3>{item.name}</h3>{!item.isAvailable && <span className="unavailable-label">AGOTADO</span>}</div>
      {item.description && <p className="drink-description">{item.description}</p>}
      <div className="drink-details"><strong className="drink-price">{formatMenuPrice(item.price)}</strong><span className="drink-points" aria-label={`${previewMenuPoints(item.price, currencyPerPoint)} puntos de muestra`}><span aria-hidden="true">⚡</span> +{previewMenuPoints(item.price, currencyPerPoint)} PTS</span></div>
    </div>
  </article>
}
