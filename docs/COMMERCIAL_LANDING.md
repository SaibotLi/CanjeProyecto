# Landing LOCAL — implementación y salida

## Diseño y alcance

Raíz comercial independiente de Valhalla: tinta verde, papel cálido y acento lima;
jerarquía editorial, captura real, proceso, comparación de planes, comercio autorizado,
FAQ, equipo y conversión. Móvil primero, foco visible, enlace de salto, FAQ nativa,
fuentes locales, imágenes con dimensiones, imagen secundaria lazy y sin recursos de terceros.
La captura `public/marketing/menu-real-local.jpg` viene de la prueba SaaS del22/10;
es producto real con datos LOCAL explícitamente ficticios. No se crearon productos Hosted.

WhatsApp autorizado: **+54 9 3455 436036**, normalizado a `5493455436036` para `wa.me`.
CTA abre `/contacto`; allí cada modalidad abre un borrador editable en WhatsApp. No envía
automáticamente ni afirma recepción. Copiar número tiene confirmación accesible tras éxito.
No se publica el email anterior, sustituido por decisión del usuario. Sin formulario/backend.

## Configuración

- Marca: `apps/web/src/config/platform.ts`, reutilizada por marketing.
- Origen canónico, indexación, contacto, precios orientativos y comercio autorizado:
  `apps/web/src/marketing/config.ts`. Son datos públicos; no colocar secretos.
- `indexable:false` mantiene **noindex,follow** en la salida LOCAL/preview. Cambiar sólo al
  aprobar publicación y confirmar el dominio. Robots permite rastrear para ver ese noindex.
- Si cambia marca, actualizar también el PNG social1200×630 y el título del shell
  `app.html`. No cambiar el slug/UUID de Valhalla para acompañar la marca.
- `contactLink` valida destino, codifica texto y admite fallback futuro email; sin un contacto
  válido no se muestran CTAs de envío. No es almacenamiento ni entrega de leads.

## HTML y convivencia

Vite tiene dos entradas. `index.html` es marketing; `app.html` conserva el bootstrap de
Auth/Authority/router existente. `marketing-build.ts` renderiza React **en build**, sin
servidor en producción, Supabase ni sesiones. Cada página tiene contenido completo,
título/description/canonical únicos, OpenGraph y TwitterCard. No hay entrega especial a bots.

Rutas comerciales: `/`, `/planes/carta-digital`, `/planes/fidelizacion`, `/contacto`,
`/privacidad`. Sus primeros segmentos ya estaban reservados por DB/TS: ninguna migration
para reservar nuevos slugs. No agregar un segmento de marketing que pueda ser un comercio.

`vercel.json` prioriza archivos comerciales, después fallbackSPA a `app.html`. También
se configura middleware local de dev/preview para probar las mismas rutas. Las rutas
multi-comercio/Auth/legacy/Admin/Staff/Platform siguen en la app; una vuelta SPA a `/`
abre el documento comercial completo, conservando la sesión del mismo origen.

PWA: shell de aplicación `app.html`, marketing excluido del fallback de navegación. El
precache sigue sólo estático, sin cache de API/perfiles/sesiones. No mover Auth ni permisos
a la landing. No se modificó store de sesión, RLS, ledger, idempotencia ni contratos económicos.
Marketing no registra el serviceworker: evita descargar el precache de toda la aplicación
en la primera visita comercial. La aplicación conserva su registro/actualizaciones.

`sitemap.xml` enumera sólo páginas comerciales, sin listar comercios ni rutas de cuenta.
El shellSPA tiene noindex para evitar indexar login/privados/errores como páginas comerciales;
la indexación específica de cartas públicas queda para un trabajo posterior. No generar
páginas por ciudad sin contenido original o inventar domicilios para SEO local.

Fuentes técnicas: [Google sobre HTML/JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics),
[ViteSSR](https://vite.dev/guide/ssr), [rewritesVercel](https://vercel.com/docs/rewrites).
Las dos páginas por modalidad cubren intenciones distintas observadas en competidores;
no hay estudio de volumen de búsqueda ni garantía de ranking.

## Medición y privacidad

`measurement.ts` expone eventos mínimos demo/contacto sólo después de consentimiento
explícito en una integración futura. Por defecto desactivado; sin proveedor, llamadas de
red, cookies, IP, URLs, querystrings, identificadores de cuenta o persistencia. No se activó
GA, MetaPixel ni panel de analítica. Clic de WhatsApp no prueba mensaje enviado.
La página `/privacidad` describe sólo el comportamiento real de esta landing, no sustituye
los avisos definitivos del servicio para clientes externos.

## Reproducir

Desde repo: `pnpm lint`, `pnpm typecheck`, `pnpm build` y, desde `apps/web`,
`pnpm test:marketing`. Para producto: `pnpm test:saas`, `test:auth`, `test:admin`,
`test:loyalty`, `test:menu` y `test:qa`. Preview: `pnpm preview --port 4173`.
La landing funciona sin Docker ni variables Supabase. Para probar viajes Auth/tenant reales
usar sólo el runner LOCAL aprobado y su Supabase local. No sustituir .env por secrets.

## Antes de publicar (STOP vigente)

1. Revisión visual humana, confirmar marca/dominio/número y condiciones de oferta.
2. Resolver custom SMTP/dominio autenticado antes de altas/piloto externo; sin invitaciones
   de signup desde la landing. No confundir publicar información con habilitar el piloto.
3. Autorizar publicación expresamente. Esta tarea no hace push ni deploy: Git integrado con
   Vercel podría publicar automáticamente.
4. Configurar origen final e indexación; regenerar build; probar HTMLsinJS, metadata,
   sitemap/robots, links, `/login`, `/profile`, `/admin`, `/platform`, `/auth/*`, carta real
   y reload. Revisar actualización del serviceworker con una sesión existente.
5. Publicar con rewrites, confirmar READY/SHA/alias, verificar producción y SearchConsole.
   No garantizar indexación inmediata. Abrir WhatsApp puede verificarse manualmente sin enviar.

No migrations, cambios Hosted ni compras son necesarios para desplegar esta landing.

## Verificación final LOCAL — 27/10/2026

- Lint y TypeScript sin errores. Build completado; raíz con HTML completo de 4,28KB gzip,
  CSS comercial de 3,83KB gzip y captura del producto de 23KB. Son tamaños del build,
  no un puntaje Lighthouse ni una medición de carga en una red móvil real.
- **85/85 tests PASS**: seis de marketing más regresiones de Auth, Admin/catálogo,
  Staff/autoridad, SaaS, fidelización/idempotencia, Carta, PWA y entorno público.
- Navegador Chromium aislado: cinco páginas × anchos 320/390/1440; sin desbordes,
  imágenes rotas ni errores/warnings JavaScript. FAQ, navegación a contacto, refresh
  y contenido con JavaScript deshabilitado comprobados. Cero requests externos desde
  marketing. No se abrió WhatsApp ni se envió un mensaje comercial.
- Ocho rutas de aplicación responden con su shellSPA en acceso directo, sin landing:
  login/register/profile/admin/platform/callback/recovery y Carta de Valhalla. Login/reload
  de la app comprobado sin sesión en el navegador de prueba. Las requests Hosted fueron
  bloqueadas en esa prueba: no certifica un login real ni una nueva matriz Hosted.
- Auditoría de secretos: 212 archivos, sin hallazgos. Sin cambios en `supabase/` ni en
  `pnpm-lock.yaml`; ninguna nueva dependencia del producto. No nuevas escrituras remotas.

Capturas y resultado del navegador conservados en `work/commercial/` fuera del repositorio.
Las pruebas de DB/economía Hosted anteriores no se repiten ni se alteran por esta landing.
