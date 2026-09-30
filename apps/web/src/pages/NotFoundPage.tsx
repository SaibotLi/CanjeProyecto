import { Link } from 'react-router-dom'
import { PageHeading } from '../components/PageHeading'
export function NotFoundPage() {
  return <><PageHeading eyebrow="404" title="Esta página no está en la carta." description="Podés volver al inicio para seguir recorriendo Valhalla." /><Link to="/" className="button-primary">Volver a la carta</Link></>
}
