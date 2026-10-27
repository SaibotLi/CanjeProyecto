import { createServer, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { commercialPath } from './src/marketing/config'

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  )
// Build-time rendering only. No runtime server, DB connection or crawler-specific output.
export function commercialHtml(): Plugin {
  return {
    name: 'commercial-static-html',
    enforce: 'post',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.headers.accept?.includes('text/html') && req.url) {
          const path = new URL(req.url, 'http://local.test').pathname
          if (commercialPath(path)) req.url = '/index.html'
          else if (!/\.[a-z0-9]+$/i.test(path) && !path.startsWith('/@'))
            req.url = '/app.html'
        }
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.headers.accept?.includes('text/html') && req.url) {
          const path = new URL(req.url, 'http://local.test').pathname
          const commercial = commercialPath(path)
          req.url = commercial
            ? commercial === '/'
              ? '/index.html'
              : `${commercial}/index.html`
            : /\.[a-z0-9]+$/i.test(path)
              ? req.url
              : '/app.html'
        }
        next()
      })
    },
    async generateBundle(_options, bundle) {
      const template = bundle['index.html']
      if (!template || template.type !== 'asset')
        throw Error('Missing commercial template')
      // Marketing visitors need no app installation or full application precache.
      // Existing app.html keeps the PWA registration and update behavior.
      const original = String(template.source).replace(
        /<script id="vite-plugin-pwa:register-sw"[^>]*><\/script>/g,
        '',
      )
      const ssr = await createServer({
        configFile: false,
        root: process.cwd(),
        plugins: [react()],
        optimizeDeps: { noDiscovery: true, include: [] },
        server: { middlewareMode: true },
        appType: 'custom',
      })
      try {
        const { renderCommercial, commercialPaths, marketing, pageMetadata } =
          await ssr.ssrLoadModule('/src/marketing/render.tsx')
        const origin = new URL(marketing.origin)
        if (
          origin.protocol !== 'https:' ||
          origin.username ||
          origin.password ||
          origin.pathname !== '/' ||
          origin.search ||
          origin.hash
        )
          throw Error('Invalid commercial canonical origin')
        for (const path of commercialPaths) {
          const { title, description } = pageMetadata(path),
            canonical = new URL(path, origin).href
          const head = `<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${marketing.indexable ? 'index,follow' : 'noindex,follow'}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:type" content="website"><meta property="og:locale" content="es_AR"><meta property="og:site_name" content="${escape(marketing.brand)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${origin.origin}/marketing/social.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">`
          const html = original
            .replace('<!--commercial-head-->', head)
            .replace('<!--commercial-content-->', renderCommercial(path))
          if (path === '/') template.source = html
          else
            this.emitFile({
              type: 'asset',
              fileName: `${path.slice(1)}/index.html`,
              source: html,
            })
        }
        this.emitFile({
          type: 'asset',
          fileName: 'robots.txt',
          source: `User-agent: *\nAllow: /\nSitemap: ${origin.origin}/sitemap.xml\n`,
        })
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${commercialPaths
            .filter((p: string) => p !== '/privacidad')
            .map(
              (path: string) =>
                `<url><loc>${escape(new URL(path, origin).href)}</loc></url>`,
            )
            .join('')}</urlset>`,
        })
      } finally {
        await ssr.close()
      }
    },
  }
}
