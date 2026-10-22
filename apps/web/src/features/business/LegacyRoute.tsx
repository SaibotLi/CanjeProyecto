import {Navigate} from 'react-router-dom'
import {businessPath} from './businessRoutes'
import {legacyBusinessSlug} from '../../config/platform'
export function LegacyRoute({section}:{section:string}){return <Navigate to={businessPath(legacyBusinessSlug,section)} replace/>}
