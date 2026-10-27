import { createRoot, hydrateRoot } from 'react-dom/client'
import { MarketingPage } from './MarketingPage'
import { commercialPath, pageMetadata } from './config'
const root = document.getElementById('root')!
const path = commercialPath(window.location.pathname) ?? '/'
document.title = pageMetadata(path).title
if (root.querySelector('.marketing'))
  hydrateRoot(root, <MarketingPage path={path} />)
else createRoot(root).render(<MarketingPage path={path} />)
