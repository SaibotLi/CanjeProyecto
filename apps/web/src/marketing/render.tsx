import { renderToString } from 'react-dom/server'
import { MarketingPage } from './MarketingPage'
import { commercialPaths, marketing, pageMetadata } from './config'
export { commercialPaths, marketing, pageMetadata }
export function renderCommercial(path: (typeof commercialPaths)[number]) {
  return renderToString(<MarketingPage path={path} />)
}
