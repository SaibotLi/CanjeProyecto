# Task 2H — Final Integration, Security Hardening & QA

> Registro histórico LOCAL del 05/10/2026. El cierre definitivo del 08/10/2026 incorpora
> H1/H2/H3 y sincronización Git autorizada en [SPRINT_2_CLOSEOUT.md](SPRINT_2_CLOSEOUT.md).
> Las 1.257 comprobaciones siguen siendo evidencia histórica, no una nueva corrida.

05/10/2026. **COMPLETADA LOCAL — SPRINT 2 LOCAL READY.**
LOCAL FOUNDATION COMPLETE, **no PRODUCTION READY**. No blockers de seguridad/integración
detectados en la matriz ejecutada. No aprobación automática de un futuro entorno remoto.

## 1. Executive summary

Se inspeccionaron README, todos los documentos/walkthroughs anteriores, las cinco migrations,
config/seed, scripts/tests, frontend/guards/stores, Auth, catálogo, Storage, PWA y env.
Se contrastaron documentos con DB/APIs/código; snapshot inicial SHA-256 de 160 archivos
para separar esta task del worktree acumulado. Trabajo previo preservado, sin delegación.
El contrato del usuario aprueba 2A/B/C/G/D/E/F y confirma la validación manual real de 2F.

Único defecto de producto corregido: display_name aceptaba 100 en frontend pero DB ya limitaba
a 80. Helper compartido y input ahora usan 80; copy explícita; regressions unit/SSR/SDK/DB.
Sin cambiar esquema, arquitectura, permisos ni diseño. Se amplió QA, no features.

## 2. Estado Sprint 2

2A/B/C/G/D/E/F COMPLETADAS/APROBADAS por declaración expresa del usuario.
2H técnicamente completada LOCAL. Cierre humano 2F agregado a su walkthrough sin borrar
la entrega original. Esa evidencia no equivale a nuevas capturas o checks físicos del agente.
Quedan gates hosted/pilot, no blockers de foundation local; ver SPRINT_2_CLOSEOUT.md.

## 3. End-to-end journeys y evidencia

| Journey | Evidencia ejecutada, no sólo funciones aisladas |
| --- | --- |
| Anon → Carta DB | menu-local, seed/orden/flags/settings/public bytes, cliente SDK real |
| Register → Mailpit → callback → sesión/perfil → login/restore | auth-flow-proof + auth-local, GoTrue real, adapter de URL/storage del SDK |
| Customer → perfil → ataque known-ID → Carta anon idéntica | admin-local ampliada 2H, propia edición de 80, CHECK 81, estado público persistido sin cambios |
| Business Admin → password login → categorías/items → imagen → Carta | admin-local, SDK/stores/actions actuales sobre PostgREST/Storage real, bytes exactos |
| Platform → password login → AAL1 → TOTP → AAL2 → global read-only | admin-local + authorization-rest + storage-rest, JWT firmado por GoTrue |
| Revocation → misma sesión pierde permisos → restaura | authority store + RPC/API con el mismo JWT, sin refresh/relogin |

Las cuentas admin/platform del journey ahora hacen signOut y signInWithPassword real
después de confirmar, antes de iniciar stores. No tokens fabricados ni service_role en
assertions. Fixtures privilegiadas sólo setup/revocación/cleanup.

## 4. Anon

Carta: cuatro categorías/cinco bebidas seed; orden estable, featured, agotado 6500,50,
preview real por settings y fallback null. Nombre/precio/config/estado alterados sólo como
fixture reversible; la siguiente lectura refleja DB. Categorías vacías no aparecen;
sin productos publicados → empty, negocio ausente/inactivo → not-found.
Anon sin profiles/memberships, writes ni Storage listing. SSR AuthRequired oculta children
protegidos de profile/admin/platform/MFA; router exige sesión en esas rutas.
Rutas y botones reales en navegador: evidencia humana previa; no nuevos clics del agente.

## 5. Customer

Carta idéntica a anon; profile propio únicamente, email en Auth, display_name editable.
Nuevo caso integrado: 80 caracteres persistidos; 81 rechazado antes de request y, al saltar
el frontend, CHECK 23514 de DB mantiene los 80. Ataque UPDATE a item conocido produce
error/zero rows y publicación posterior idéntica. Otro perfil denegado; sin admin/platform.
Metadata maliciosa no crea autoridad. Switch A→B y logout limpian datos/stores; respuestas
tardías A nunca se aplican a B (unit + SDK real). No cache durable de autoridad.

## 6. Auth

Signup sin metadata role/business; session null hasta confirmación; un único profile mínimo.
Correo Mailpit local, no delivery Internet. Password login real, confirmación pendiente
rechazada, credenciales incorrectas, email inválido y password corta rechazados sin nuevas
identidades. Passwords/token hashes/JWT sólo memoria, no logs ni documentación.
Confirmation/recovery con storage previo/limpio; SDK procesa fragment y app limpia URL.
Enlaces usados/expirados y callback malformado no aprovechan una sesión previa.
Restore, refresh y sesión invalidada con expiración del cliente probados por SDK real.
El adapter Node no certifica browser instalado/cross-device/back-forward visual.

## 7. Admin

Membership vigente Valhalla, no UUID hardcoded/email/metadata. Category/item INSERT/UPDATE,
nombre/descripción/slug/orden/flags/centavos, drafts propios listados pero no publicados.
Caso nuevo: cambio válido de categoría propia/descripción visible a anon; ocultar esa
categoría retira su item público, sigue visible admin, luego referencia restaurada.
Payloads whitelist; `.single()` exige una fila y zero-row no se informa como éxito.
READ propio persiste en negocio inactivo; name/settings/menu/upload bloqueados por API/RLS.
Mismo JWT active→inactive→reactivado por fixture; el otro tenant activo sigue independiente.
No canal de aplicación para reactivar, asignar memberships o elegir un tenant arbitrario.

## 8. Platform

RPC self sin parámetros/boolean sin AAL; authority actual en private.platform_admins.
AAL1 devuelve true pero no global READ; guard exige MFA. AAL2 de misma identidad permite
lectura global aprobada, frontend sólo lista nombre/slug/estado de negocios.
Sin global writes ni edición ajena, Auth Admin API, exports o management. Perfil propio
sigue editable como customer; writes locales requieren membership independiente y activo.
Customer AAL2 no global READ ni Platform. Nuevo caso Business Admin AAL2: conserva sólo
membership propia, RPC false, sin perfiles ajenos ni vista/global reads/foreign writes.

## 9. MFA

Enroll real, factor unverified, cancel/unenroll pendiente; código incorrecto rechazado,
challenge/verify válidos promueven sesión a AAL2 mediante GoTrue. Factor verified requiere
AAL2 para retiro; refresh oficial después del retiro degrada a AAL1.
No promoción por metadata ni TOTP simulado. Secret/QR enrollment efímeros, sin capturas.
Customer normal no necesita MFA; Business Admin no obligación global nueva.
Recuperación administrativa de MFA final queda fuera del cierre local.

## 10. Revocation

Membership retirada: guard pierde autoridad; siguiente write zero-row/denegado, Carta
y perfil self siguen disponibles. Reañadir restaura tras comprobación nueva, mismo JWT.
Platform row retirada con AAL2: RPC false, global READ desaparece, guard/data pierden acceso;
restaurar fila vuelve true, sin refresh/login. Membership local independiente sobrevive.
Revocación entre upload y PATCH provoca error RLS real y receipt; retry mismo JWT tras
restauración guarda el mismo path sin segunda subida. Revocación antes del upload lo niega.
No promesa de push instantáneo: frontend comprueba en boundaries/foco/refetch/antes de writes;
DB aplica autoridad vigente a cada petición. Access tokens pueden vivir hasta su expiración.

## 11. Cross-business / ataques directos

Admin A/B simétricos, Both opera separadamente en ambos. UUIDs conocidos usados contra
REST y Storage, no seguridad por ocultar IDs. Re-home de category/item bloqueado por grants;
FK compuesta rechaza categoría extranjera incluso Both; CHECK rechaza image_path B en A.
Namespace extranjero, upload inactivo, metadata arbitraria y global Platform writes denegados.
Tests comprueban filas afectadas y estado persistido/bytes, no sólo código HTTP.
Catálogo público activo de otro negocio por API es publicación aprobada, no leak de drafts.

## 12. Menu publication con todas las sesiones

Anon/customer/Admin A/B/Both/Platform AAL1/AAL2 ven exactamente la misma Carta Valhalla
por el adaptador público. Query filtra explícitamente business/category/item activos aun
con las policies OR más amplias de un operador. Inactive item/category ocultos; business
inactivo not-found para todos. Disponibilidad false sigue pública. Settings points_enabled
false oculta preview. No catálogo mock silencioso ni acreditación/saldo/total económico.

## 13. Storage

Bucket público reproducible menu-images, 5 MiB, jpg/jpeg/png/webp/avif/MIME correspondientes,
path business_uuid/asset_uuid.ext. PUBLIC bucket ≠ public administrative listing.
Path conocido: archivo/info técnica/custom metadata públicos, UUID no confidencialidad.
Uploads estándar nuevos con metadata vacía; listado own tenant incluso inactivo; Platform
row+AAL2 metadata global únicamente menu-images, AAL1 sin global listing.
Límite inclusivo 5 MiB y rechazo +1; SVG/GIF/mismatch/namespace inválido rechazados.
Sin overwrite/move/copy/re-home/signed-upload bypass/global write/app DELETE.
Reemplazo genera nuevo UUID, PATCH posterior, anterior puede quedar orphan aceptado.
DELETE DENY es DoD correcto. No cleanup automático ni nueva garantía DB→Storage.
Historical orphan-probe no ejecutado: agrega candidate policy insegura, no aceptación actual.
MIME declarado no certifica magic bytes/seguridad del contenido; deuda de ingestión futura.

## 14. Routing

HTTP local directo verificado 200 + shell SPA en 15 targets: /, /login, /register, /profile,
/admin, /admin/categories, /admin/products, /platform, /auth/callback, callback con error,
/auth/forgot-password, /auth/recovery, /auth/mfa, /points y /rewards.
Eso confirma fallback del servidor, **no** login/autorización por un HTTP200 del shell.
Guards logged-out/customer/AAL1/AAL2 y links inválidos cubiertos SSR/stores/SDK.
Reload/restore del SDK comprobado; navegación/back-forward/focus de browser físicos no
revalidados por el agente. Usuario aprobó navegación/Auth anteriormente y 2F en este prompt.

## 15. PWA

Build emite manifest standalone scope/start '/', SW y Workbox; 11 precache entries,
711,72 KiB. QA inspecciona urls del SW emitido: sólo assets estáticos/index/manifest,
una NavigationRoute shell, runtimeCaching vacío. /auth/* queda como SPA; /api/ excluido.
No API/Auth/perfil/session responses/tokens precached ni cola offline. API uses fetch,
no promesa de offline Auth. Dev SW disabled. Icono placeholder, update/install/notch/
cross-device físicos siguen pendientes antes del piloto. No cambió config PWA en 2H.
Build puede compilar sin env: no prueba conexión; Vite vivo sí se comprobó con URL/key
públicas locales actuales en su módulo env servido, sin imprimir valores.

## 16. Responsive / manual status

Se respeta el bloqueo de Browser Use documentado: no workaround ni Vercel/hosted.
No nueva inspección visual/capturas del agente en 2H. Usuario confirmó 2F funcionalmente:
admin/membership/categorías/items/centavos/uploads/inactivo/customer/Platform/MFA/read-only.
No convertir esa declaración en PASS de todos los tamaños/teclado/consola/PWA física.

Servicios quedan activos: http://127.0.0.1:5173/ ; Mailpit 54324 ; Studio 54323.
Checklist humano: 390×844 primero, luego 360/430/768/1280; Carta/login/register/profile/
recovery/MFA/admin/Platform y loading/error/forbidden/readonly; revisar overflow, texto largo,
precios decimales, botones/forms, Tab/foco/Enter, sticky/nav/safe areas/image aspect ratio,
fallback de imagen rota, volver/avanzar/reload/deep link y consola.
PWA instalada/cross-device requiere después un backend accesible/HTTPS autorizado: no
abrir firewall/túneles ni convertir 127.0.0.1 en acceso de teléfono aquí.
No dejar fixtures privilegiadas persistentes; provisioning humano sólo workflow LOCAL elegido.
Si se crean datos humanos, no ejecutar suites exclusivas/reset sin preservación y autorización.

## 17. Accessibility

Inspección de labels htmlFor, autocomplete, type=submit/keyboard, fieldset/disabled, aria-busy,
status/alert, alt/fallback, headings/skip link; controles nativos y links, no clickable divs.
QA SSR confirma profile límite/label/submit, children ocultos, alerts/status; tests existentes
validan forms/guards. CSS conserva focus-visible, touch 44px, min-width/wrap y safe areas.
Son contratos de código/markup, no auditoría WCAG ni tab-order/contraste/notch real medidos.

## 18. Error handling

Fetch/backend failure y settings inválidos simulados en unit → mensajes controlados, no SQL
ni mock. Loading/empty/error/not-found con retry y status por SSR; catálogos reales vacíos
e inactivos mediante fixtures. Auth error mapping/login inválido/network logout failure
fail-closed y retry; expiry/refresco inválido SDK real elimina estado privado.
RLS/zero-row/upload denegado real, partial image-save con receipt y retry sin DELETE.
Asset inexistente solicitado realmente: transporte HTTP400, Storage statusCode '404',
respuesta no imagen. Card tiene onError/fallback asociado a URL; evento DOM/visual final
queda en checklist humano, no fingido con SSR. No outage físico de contenedores: las
fallas de red/backend se simularon en clientes unit sin apagar servicios del usuario.

## 19. Secret audit

Comando nuevo `pnpm supabase:audit:secrets`: read-only, git tracked/untracked + env/logs/
key material ignorados + dist. Normaliza rutas para no contar duplicados Windows.
Busca JWT literales, sb_secret, private keys, provider/PAT/Google tokens, DB URL con password,
credenciales literales y passwords DB env; imprime sólo tipo/file/line, nunca valor.
Última ejecución: 145 archivos de texto únicos examinados, 0 hallazgos; sin credenciales
literales en la salida acumulada de tests revisada. Usos de service_role en scripts son capacidades encapsuladas en memoria para
fixture setup/cleanup, nunca assertions ni imports browser. Env example sólo nombres vacíos,
frontend sólo URL/publishable key. Logs de pruebas revisados sin passwords/JWT/TOTP reales.
Vector RFC6238 público en tests no es una credencial operativa. No escaneo de todas las
dependencias/historia Git/credential stores Docker/CLI ni certificación universal de secretos.

## 20. Source of truth audit

| Dato | Fuente actual |
| --- | --- |
| Carta/publicación/orden/settings | PostgreSQL vía query pública explícita |
| Imagen | menu_items.image_path + Storage público, null/broken fallback |
| Business autoridad/activo | memberships/businesses actuales DB |
| Platform capacidad | private.platform_admins vía RPC self booleana |
| Sesión/email/AAL | Supabase Auth SDK, no JWT decode de frontend |
| Perfil/display_name | public.profiles self-scoped |
| Puntos/rewards screens | demo explícita; no saldo real ni autoridad económica |

Sin roles/email/points duplicados en profiles, mocks runtime en Carta ni autoridad localStorage.
SDK sí persiste su sesión según contrato 2E; eso no es caché durable de permiso Platform.

## 21. Database/RLS regression

Seis archivos pgTAP: columnas/PK/FK/CHECK/numeric/path/triggers/seed/perfil atómico;
inventarios independientes exactos de policies/table+column ACLs/schema/helper/function
EXECUTE/search_path/owner/INVOKER; RPC sin overload/AAL/DEFINER; Storage managed ACL intacta.
24 domain/private + 3 Storage = 27 policies. No UPDATE/DELETE/ALL Storage ni bucket policy.
REST real confirma private Accept/Content-Profile 406 y no endpoint public platform_admins.
No baseline de seguridad relajado para hacer pasar tests; SQL/expected inventory intactos.

## 22. Clean rebuild

Guard comprobado inmediatamente antes de reset: project_id canjeproyect, no hosted link,
Docker label esperado, API 127.0.0.1:54321/DB 54322; seed fingerprint esperado.
Usuarios/perfiles/memberships/platform/objetos = 0: ningún dato humano presente.
`db reset --local` autorizado por contrato, reconstruyó en orden:
20261002120000 → 20261002130000 → 20261002140000 → 20261002150000 → 20261005160000.
Seed 5bc80b32792095fb6cf02694de9626a1 y bucket PUBLIC/5242880 reconstruidos.
Todas las suites ejecutadas secuencialmente desde ese estado, sin actividad manual.
Reset sólo DB, no limpieza de filesystem/volumen Storage. No reset ciego ni remoto.

## 23. Full test matrix — resultados finales

| Comando | PASS | FAIL / skipped |
| --- | ---: | --- |
| pnpm test:menu | 10 | 0 / 0 |
| pnpm test:menu:local | 11 | 0 / 0 |
| pnpm test:auth | 11 | 0 / 0 |
| pnpm test:auth:local | 14 | 0 / 0 |
| pnpm test:admin | 14 | 0 / 0 |
| pnpm test:admin:local | 15 | 0 / 0 |
| pnpm test:qa (nuevo, después de build) | 4 | 0 / 0 |
| pnpm --filter @canjeproyect/web test:env | 6 | 0 / 0 |
| pnpm supabase:test:db | 1.110, seis archivos | 0 / 0 |
| pnpm supabase:test:authz | 32 | 0 / 0 |
| pnpm supabase:test:storage | 24 | 0 / 0 |
| pnpm supabase:test:smoke | 6 | 0 / 0 |

Total: **1.257 comprobaciones** = 1.110 pgTAP assertions + 147 casos Node reportados
(los runners Node incluyen sus parents; no son 1.257 journeys independientes).
0 fail/cancelled/skipped/todo. No sumar reruns duplicados: admin-local pasó primero 14,
después 15 al añadir Business Admin AAL2; la tabla usa la última versión.
Historical orphan-probe no invocado, fuera de aceptación; no es un skipped oculto.
Lint/typecheck/build PASS; env PASS; types check zero drift; audit secrets sin hallazgos.
Build: 138 módulos; main387,92kB/gzip121,30; SDK224,44/gzip58,82; CSS27,44/gzip6,36.
Warning conocido del adapter Auth: Multiple GoTrueClient al recrear contextos con mismo
storageKey; no error/fallo, no warning de browser productivo observado. Producto singleton.
No console browser QA nuevo. Git advierte CRLF al revisar worktree, sin cambio a config Git.

## 24. Cleanup

Sólo fixtures propias removidas: auth identities/sessions/factors, filas catálogo/tenant,
memberships/platform y objetos mediante Storage API privilegiada encapsulada.
Smoke retira su CHECK de fault injection en finally. Final: users/profiles/memberships/
platform/objects = 0; temporary policies = 0; fault constraints = 0; Mailpit messages = 0.
Un business, cuatro categorías, cinco items; seed fingerprint original.
No datos humanos borrados: no existían en precheck. No volumen/prune/cleanup automático,
ni afirmación de ausencia universal de payloads físicos por contar metadata.
Supabase/Vite activos; ningún admin/Platform persistente provisionado.

## 25. Known limitations / debt

Ver closeout: OAuth, GC A-S2-005, global writes+audit, support/Auth Admin, SMTP/hosted/Vercel/
CSP, runbook MFA emergency, assets/catálogo comercial, performance/load y economía.
No bloquean Sprint2 LOCAL. También: PWA update/icon/physical certification; no atomicidad
DB/Storage, objetos faltantes posibles, last-write-wins sin optimistic lock, sin benchmark
paginación masiva ni snapshot entre páginas. Verificación de byte-type futura, no garantía actual.

## 26. Hosted readiness checklist

Checklist exacto no ejecutado en [SPRINT_2_CLOSEOUT.md — Hosted/pilot](SPRINT_2_CLOSEOUT.md).
Incluye proyecto/propiedad/región/password privado/versionPG/migration apply/seedstrategy,
publishable key/Site URL/redirects/SMTP/OAuth futuro/MFA/bootstrap operadores,
bucket/Vercelenv/SPA/HTTPS/securitysmoke/import piloto y revisión física.

## 27. Documentation

Actualizados README raíz/web, ARCHITECTURE, DATABASE, SECURITY, DECISIONS, ROADMAP,
PROJECT_BLUEPRINT, SUPABASE_WORKFLOW, UI_GUIDE, SPRINT_2_ARCHITECTURE, cierre humano 2F
y nota histórica límite 2E; nuevos este walkthrough y SPRINT_2_CLOSEOUT.
Historia 2A/B/C/G/D/E/F preservada. V2/decisiones A003/A004/A006 conservadas; hosted no completado.

## 28. Diff summary

2H: sólo authData/ProfilePage límite80; tests auth-state/auth-local/admin-local ampliados;
nuevo sprint2-qa, secret-audit y scripts root/web; documentación arriba.
Todo el resto del worktree viene de tasks anteriores. Snapshot demuestra sin modificaciones
2H a las cinco migrations, config, seed, tipos, lockfile, client/env/router/stores, Storage,
CSS/Carta/branding ni preview económico. Resumen por Task y estrategia commits en closeout.
Diff tracked/untracked revisado; no stage/commit/push. No normalización masiva de archivos.

Comparación contra snapshot inicial: 20 archivos existentes cambiados (dos de producto,
tres tests, dos manifests de scripts y trece documentos); cuatro nuevos; cero removidos.
Integridad byte-for-byte antes/después de 2H, SHA-256:

| Fuente protegida | SHA-256 sin cambio |
| --- | --- |
| 20261002120000 foundation | 66d1e13ebaf032050ac62c584187465fb6365791def4344794ad8ded14523103 |
| 20261002130000 authorization | 479144a2f47959b9de7663bd42b7b03d5612439ec03395a9888322b8c3be5ec3 |
| 20261002140000 active writes | 7503e887509313943590165848a5b2633290d531c646292bd6cac595bee8be79 |
| 20261002150000 Storage | e2caaaff62b1e09b3ae0238c2c51e3f95057848b76ff351638538c813894710f |
| 20261005160000 RPC | 0dd6b735595a87083f637658a1a8a9c6aadbe361828b6b025acada223cbe603a |
| supabase/config.toml | d0d31ba3b6a4f9b98a474cfdb7b8340085477206fb1b625e2d01b1c9366467ae |
| supabase/seed.sql | f8c01ae0601549cb8be1f15c597b72a82cf6c763dbeaffbdebc5a09b01bd46d0 |
| supabase/types/database.types.ts | b817d95280459a560b55de07147fdb67e399715615ceea5ec69786c27e2edfa6 |
| pnpm-lock.yaml | 2abb1676c72d3d65741f83ea38616f7728496c01bceb0e01cbeedbd7108035e1 |

## 29. Scope confirmation

NO hosted/Supabase remoto/login/link/Vercel/deployment. NO Google OAuth.
NO economía/purchases/ledger/balance/credits/reversal/rewards/vouchers/QR/redemption.
NO global Platform writes/membership management/Auth Admin/impersonation/export.
NO nuevas tablas/roles/migrations/policies/Storage DELETE/lifecycle/cleanup automático.
NO stage/commit/push ni nueva task. Reset y fixtures fueron exclusivamente LOCAL guardado.

## 30. Clasificación final

**SPRINT 2 LOCAL READY — LOCAL FOUNDATION COMPLETE.**
No blockers reales hallados en la evidencia ejecutada. No production ready; checklist
físico/manual adicional conservado explícitamente y entorno hosted sin verificar.

## 31. Recomendación exacta del siguiente paso

Revisar este cierre y el diff acumulado. Si se acepta, autorizar por prompt separado la
estrategia de commits y/o la preparación hosted/pilot con proyecto/target/propiedad/región
explícitos, secretos gestionados privadamente y checklist de closeout. No iniciar ahora.
Sprint3 economía requiere también contrato propio; no saltear su diseño de seguridad.

Fuentes oficiales contrastadas 05/10/2026: [public buckets y gestión](https://supabase.com/docs/guides/storage/buckets/fundamentals),
[Storage RLS](https://supabase.com/docs/guides/storage/security/access-control),
[INVOKER/search_path](https://supabase.com/docs/guides/database/functions),
[MFA y AAL/RLS](https://supabase.com/docs/guides/auth/auth-mfa).
No se usaron fuentes externas como sustituto de las pruebas contra versiones locales fijadas.
