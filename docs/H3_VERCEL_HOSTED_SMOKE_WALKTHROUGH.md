# H3 — Vercel Connection & Hosted Smoke

> Registro histórico H3 del 07/10/2026. El cierre del 08/10/2026 versiona el rewrite y
> corrige copy histórica; ver [SPRINT_2_CLOSEOUT.md](SPRINT_2_CLOSEOUT.md). Las notas
> sobre archivos aún sin commit y etiquetas antiguas describen el deployment H3 original.

07/10/2026 (America/Buenos_Aires). **Estado final: HOSTED FRONTEND CONNECTED.**
H2 permanece COMPLETADA/APROBADA. H3 fue iniciado expresamente por el usuario y sus
checks de conexión/smoke pasaron. **External pilot continúa bloqueado por A-H2-SMTP.**

## Destino y configuración

Frontend correcto: **https://valhallapp.vercel.app**. El usuario corrigió el dominio
anterior `valhalapp.vercel.app`; esa referencia de H2 queda como antecedente histórico.
Supabase exclusivo: `liojmtsopplgzderrrqi` / https://liojmtsopplgzderrrqi.supabase.co.
Vercel: cuenta `saibotli`, scope `saibotlis-projects`, proyecto `valhalla`,
ID `prj_KMMNNBbPyiiBJaHktoGJ84S26rhN`, raíz `apps/web`, Vite, Node24.x.

Se configuraron exclusivamente estas variables públicas en **Production**:

| Variable | Verificación |
| --- | --- |
| VITE_SUPABASE_URL | URL del proyecto Hosted correcto |
| VITE_SUPABASE_PUBLISHABLE_KEY | Publishable existente del mismo proyecto; coincidencia verificada sin registrar su valor |

Sin variables service_role, secret key, DB password, JWT o access token de aplicación.
No cambios en Preview/Development. El archivo temporal de valores públicos se eliminó.

La corrección autorizada de dominio cambió sólo Site URL y redirects exactos en Hosted
Auth, con diff posterior sin pendientes:

| Campo | Valor vigente |
| --- | --- |
| Site URL | https://valhallapp.vercel.app |
| Callback HTTPS | https://valhallapp.vercel.app/auth/callback |
| Recovery HTTPS | https://valhallapp.vercel.app/auth/recovery |
| Desarrollo local conservado | http://127.0.0.1:5173/auth/callback y http://127.0.0.1:5173/auth/recovery |

Sin wildcard. Los dos redirects loopback son sólo para desarrollo aprobado; el cliente
Supabase publicado usa Hosted. Email/password, confirmation, implicit, MFA/TOTP y SMTP
conservan su configuración. No cambio de arquitectura Auth.

## Fuente y deployment limpio

Repo continúa en `main`, HEAD `80427801bc1a38c1b637d7565a5aa6782e12da28`.
No cambios funcionales necesarios para conectar Hosted. Se preservaron los cambios
locales previos H1/H2 y no se realizó stage, commit o push.

Antes del fix, `/` respondía200 pero siete rutas internas devolvían404. Se agregó sólo
`apps/web/vercel.json`, con rewrite `/(.*)` a `/index.html`, siguiendo la configuración
SPA de [Vercel para Vite](https://vercel.com/docs/frameworks/frontend/vite).
No rediseño de routing ni cambios de backend, RLS, Storage, migrations o schema.

Se desplegó un snapshot limpio de ese HEAD más el único archivo de rewrite mediante CLI
oficial Vercel62.7.0, Production, force, sin with-cache. El log oficial confirma build
sin cache restaurada, TypeScript/Vite completados y cero líneas de error.

- Deployment: `dpl_GXsGBzBfserB4igRxRukJNQABg1E`, **READY**, target Production.
- URL inmutable: https://valhalla-d1p64no3c-saibotlis-projects.vercel.app.
- Alias final: **https://valhallapp.vercel.app**.

## Smoke HTTPS y sesiones

| Ruta | Resultado |
| --- | --- |
| / | HTTP200; Carta Hosted vacía/controlada; acceso directo y reload PASS |
| /login | HTTP200; login personal email/password PASS |
| /register | HTTP200; formulario visible; no signup nuevo ni envío de correo |
| /profile | HTTP200; anon redirige a login; perfil autenticado directo/reload PASS |
| /admin | HTTP200; anon redirige a login; membership real permite Valhalla directo/reload PASS |
| /platform | HTTP200; anon redirige a login; AAL1 gate MFA; AAL2 lectura directa/reload PASS |
| /auth/callback | HTTP200; sin token muestra enlace inválido de forma controlada |
| /auth/recovery | HTTP200; sin token pide enlace nuevo de forma controlada |

Se comprobó restauración de la misma sesión tras reload en perfil/Admin AAL1 y
Platform AAL2. El usuario ingresó password y verificó su autenticador existente por UI
normal; ningún secreto fue solicitado, leído ni exportado. No nuevo usuario/factor.

Valhalla Space (`valhalla-space`) aparece como activo. Admin muestra cero categorías y
cero productos. Carta muestra «La carta se está preparando», también con sesión
autenticada; no fallback ficticio. Business Admin funciona independientemente de MFA.
Platform AAL1 no muestra listado global y exige segundo factor. En MFA se observó
`Sesión: aal2`; Platform luego muestra Negocios/Valhalla, «SÓLO LECTURA», ningún formulario
y únicamente el botón de revalidar datos/permisos. Tras recargar mantiene ese acceso.

No se ejecutaron escrituras globales para este smoke. La denegación backend de esas
escrituras conserva la evidencia H1/H2 y sus policies/grants sin cambios; H3 añade la
comprobación del gate y la vista publicada, no una nueva matriz destructiva o de fixtures.

## Consola, conexiones y límites de evidencia

Cero errores y cero warnings registrados antes y después de login/MFA. El bundle
publicado, incluido el chunk Supabase importado, configura únicamente la URL Hosted
correcta y publishable key; no endpoint Supabase loopback ni patrón de secreto servidor.
Los strings genéricos localhost y sb_secret_ del SDK/validador no son endpoints configurados
ni claves privadas. Las lecturas reales de Carta/profile/Admin/Platform y Auth completaron
sin errores críticos. Los redirects de email se construyen con el origin del browser y
las rutas exactas, coherentes con el Site URL/allowlist corregidos.

La revisión de conexiones se sustenta en configuración del cliente publicado, fuente,
requests funcionales y consola. La herramienta browser disponible no expone captura
Network/HAR; no se afirma una auditoría de todos los headers/payloads. No se exportaron
tokens ni cuerpos de tráfico. Callback/recovery se probaron sin tokens: H3 no certifica
nueva entrega de email, recuperación completa o delivery productiva.

## Diferencias y continuidad

HTTPS/Production reemplaza el origin loopback de desarrollo; ambos leen el mismo Hosted.
El deployment usa el código de main, excluyendo dos ajustes de texto H2 aún sin commit.
Persisten etiquetas antiguas «LOCAL», «prueba» o «datos de ejemplo» en algunas pantallas;
son copy histórico y no describen la fuente de datos comprobada. No se hicieron cambios
funcionales/cosméticos adicionales en H3. PWA instalada y ciclo de actualización físico
no se certifican mediante este smoke de navegador.

El rewrite queda en el checkout y en este deployment, **sin commit/push automático**.
Antes de un próximo deployment desde Git, deberá incluirse/versionarse ese archivo para
conservar el fix de rutas; el despliegue actual ya lo incorpora. No hay blocker de H3.

## Gate externo y exclusiones

**A-H2-SMTP: custom SMTP + dominio autenticado siguen HARD GATE antes de usuarios
externos, piloto con clientes de Valhalla o lanzamiento público.** No external pilot ready.
Google OAuth pendiente de tarea explícita. No SMTP nuevo, proveedor/dominio, catálogo o
imágenes ficticias, seed, economía/Sprint3, bootstrap o avance automático a otra fase.
Los datos reales persistentes de H2 permanecen: operador/profile/Platform row, Valhalla,
loyalty settings, membership y TOTP existente. No cleanup de esos datos reales.

Evidencia final: `H3_HOSTED_FRONTEND_CONNECTED_EVIDENCE.json` y capturas de variables
Production, Carta vacía, Admin vacío, gate AAL1 y Platform AAL2 read-only en outputs.
