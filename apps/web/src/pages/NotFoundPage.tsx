import { Link } from 'react-router-dom'
import { PageHeading } from '../components/PageHeading'
import { useBusinessOptional } from '../features/business/businessContext'
import { businessPath } from '../features/business/businessRoutes'
export function NotFoundPage() {
  const context = useBusinessOptional()
  return <><PageHeading eyebrow="404" title="Esta página no está disponible." description={context ? `Podés volver a la carta de ${context.business.name}.` : 'Podés volver al inicio de la plataforma.'} /><Link to={context ? businessPath(context.business.slug) : '/'} className="button-primary">{context ? 'Volver a la carta' : 'Volver al inicio'}</Link></>
}
