# Task 2F — Authority Experience, Business Admin & Platform Guards

05/10/2026. **TASK 2F COMPLETADA/APROBADA por el usuario en el prompt de Task 2H.**
A-S2-006 APPROVED e implementada con alcance mínimo; STOP Platform resuelto.
La entrega original y sus pruebas se conservan como evidencia histórica abajo.

## Cierre humano posterior a la entrega

El usuario confirmó expresamente: /admin y authority por membership; categorías/productos;
precios con centavos; uploads reales; negocio inactivo read-only; customer bloqueado;
/platform funcional; AAL1 requiere MFA; AAL2 accede; vista Platform read-only.
No son capturas del agente ni validación adicional de teclado/consola/viewports/PWA instalada.
Ese nuevo prompt autoriza exclusivamente 2H LOCAL. Las menciones originales de revisión
pendiente en secciones 20–22/25 quedan supersedidas por este cierre, no borradas de la historia.

## 1. Executive summary

`/admin` deja de ser placeholder público: sesión y membership actual de Valhalla requeridas.
Panel, categorías y productos reales; create/update, flags/orden/precios con centavos e
imágenes Storage al guardar. Negocio inactivo sólo lectura. Revocación same-JWT revalidada.
Todas las regresiones técnicas PASS. Única excepción backend aprobada: RPC booleana self
en nueva migration forward-only, sin cambiar autoridad/lecturas RLS.

Preparación: attachment, README y TODOS /docs leídos; Auth/session/router/layout/profile,
tipos, migrations/helpers/policies/grants/Storage/config, capa Carta y SDK inspeccionados.
Worktree previo preservado, sin stage/delegación. 2E COMPLETADA/APROBADA registrada por
validación humana expresamente declarada en el prompt 2F, no por capturas del agente.

## 2. Authority architecture frontend

features/authority: query/mapper → store → provider/context → BusinessAdminRequired.
Separada de Auth y de adminData/forms. Un solo cliente browser de 2E; estado derivado,
no role persistido ni user_metadata/email/JWT decode. Platform isAdmin es el booleano real
de RPC self, sin AAL. PlatformRequired combina con assurance Auth SDK por separado.
Guards sólo UX; RLS decide seguridad en cada petición. Sin Realtime ni authority cache persistente.

## 3. Business memberships resolution

SELECT business_memberships filtrado explícitamente por user_id de sesión, incluso con
Platform AAL2/global READ. Embedding por FK a businesses; mapper valida owner/role/tenant.
Paginación estable 500, timeout/cancelación; adminBusinesses tipados y tenant por slug
`valhalla-space`, no UUID DEV. Inactivo permanece visible para miembro. Admin B no accede
Valhalla; Both tiene abstracción correcta para ambos negocios sin selector SaaS en UI.

## 4. Business guard

AuthRequired: anon → /login. BusinessAdminRequired: loading/error fail-closed/Sin acceso/
allowed. Customer sin membership y Admin B → Sin acceso, sin bucle ni herramientas.
UI del panel sólo tras comprobación. Cuenta customer no ve enlace Admin en profile.
Request RLS puede negar aunque guard haya permitido antes: no permiso por token/boolean.

## 5. Platform capability — A-S2-006 APPROVED

STOP anterior respetado hasta aprobación explícita. Contrato final sustituye propuesta de
enum/AAL combinado, que nunca se implementó. Nueva migration
`20261005160000_current_platform_capability.sql` aplicada sólo con migration up --local,
sin reset ni editar historia. `public.is_current_user_platform_admin()` sin parámetros,
RETURNS boolean, SQL STABLE SECURITY INVOKER/search_path vacío. SQL estático totalmente
calificado: `select private.is_platform_admin();`. Reutiliza lógica/grants/RLS existentes,
sin DEFINER ni privilegios de tablas nuevos. EXECUTE revocado PUBLIC/anon/service_role;
sólo authenticated sin grant option. Respuesta únicamente boolean self: sin argumentos
de identidad/tenant/metadata, filas, UUIDs ajenos, timestamps, perfiles o memberships.
NO incluye AAL2. Autoridad real sigue en private.platform_admins; private REST excluido
(Accept-Profile →406), global RLS exige fila vigente+AAL2. Tipos regenerados por CLI.

## 6. MFA gate

TOTP de 2E conservado. Business Admin/customer no requieren MFA por defecto. Platform:
sesión → RPC actual → false Sin acceso; true → nivel Auth SDK → AAL1 MFA requerido y
/auth/mfa?continue=platform; AAL2 vista read-only. Tras verificar aparece enlace fijo
Continuar a Platform, sin redirect arbitrario. Assurance desconocida/error fail-closed.
Loading/refetch desmonta contenido global. Fila+AAL1 sin global/customer AAL2 sin Platform/
fila+AAL2 read-only revalidados. MFA verifica sesión, no otorga autoridad.

## 7. Admin routes

- `/admin`: resumen con enlaces a categorías/productos/Carta.
- `/admin/categories`: catálogo propio activo/inactivo y editor inline.
- `/admin/products`: catálogo propio activo/inactivo y editor inline/imagen.
- `/platform`: negocios globales nombre/slug/activo, sesión+capability self+AAL2; sólo lectura.
  Sin operadores/perfiles/memberships/exports/soporte ni edición global.

Layout Valhalla, navegación simple, cuenta/salida a Carta. Sin botones de economía futura.
Refresh por navegación/foco/visibility, Auth events y botón Actualizar datos y permisos.

## 8. Categories admin

Lista activas/inactivas; crear/editar name/slug/display_order/is_active. Validación de nombre
1–80, slug canónico max80 y orden entero 0–2147483647 coherente con DB. Payload whitelist.
INSERT business_id del contexto; DB genera ID/timestamps. UPDATE tenant+id sin re-home.
Sin DELETE. Categoría inactiva oculta sus hijos en Carta. Si el registro ya no existe tras
reload, no convertir accidentalmente una edición en creación.

## 9. Items admin

Lista propios incluyendo borradores; create/update category_id/name/description/price_amount/
image_path por flujo upload, image_alt/image_presentation/is_available/is_featured/is_active/
display_order. Categorías propias, incluidas inactivas, con etiqueta clara. FK/RLS defensa real.
IDs/business_id/timestamps no editables ni payload UPDATE; sin hard-delete.
Activa publicación sólo si negocio/categoría/item activos; agotado sigue visible, featured
conserva cards 2D. Sin imagen, fallback existente. No puntos editables ni stock/POS.

## 10. Business inactive behavior

READ propio permitido, formularios deshabilitados, aviso explícito “Sólo lectura”. Contexto
preflight vuelve a leer membership + is_active; backend sigue denegando writes incluso si
hay carrera después de lectura. No UI de reactivación. Both conserva otro tenant activo.
No lookup de negocio agregado a private.is_business_admin ni cambio de policies.

## 11. Money inputs

ARS en numeric(14,2) unidades mayores. Input text/inputMode decimal; admite 6500,50 o 6500.50,
se edita como 6500,50. Rechaza símbolos, separador de miles, exponentes, negativos, NaN,
más de dos decimales y overflow, sin quitar puntuación/convertir a centavos accidentalmente.
Máximo 999999999999.99, cero permitido. JS number sólo transporte/presentación del catálogo,
no operaciones económicas ni nueva regla de redondeo. DB autoridad final.

## 12. Image upload flow

File elegido → validación tipo/extensión/tamaño → preview URL local efímera → Save →
refetch autoridad/negocio activo → nuevo asset UUID → `<business_uuid>/<asset_uuid>.<ext>` →
SDK Storage upload estándar con upsert=false, contentType y sin custom metadata → DB save.
JPEG/JPG/PNG/WebP/AVIF, 5 MiB inclusivos; no SVG/GIF. No upload automático al seleccionar.
Nombre de objeto no deriva del filename original. Public path/info/metadata no confidenciales;
UI avisa no subir información privada. Preview se revoca al cambiar archivo/desmontar.
Sin listing/media manager necesario, overwrite/move/copy/re-home/delete/cleanup.
MIME declarado no certifica magic bytes/antivirus/decodificación, conforme límite 2G.

## 13. Failure/orphan behavior

Upload fallido → no PATCH. Upload confirmado y DB error/0 rows/sesión cambiada → mensaje
explícito, no éxito y asset puede quedar orphan. Receipt {userId,businessId,path} efímero
permite retry del guardado con nueva authority check y sin otra subida si el editor sigue
montado. No receipt de otra cuenta/tenant ni persistencia del secreto/estado en storage.
Cerrar/desmontar/elegir otro archivo pierde receipt; orphan aceptado de Sprint 2, no leak.
Reemplazo deja objeto anterior intacto. No atomicidad cross-service ni garantía de existencia
por CHECK image_path. Red ambigua puede haber guardado: revisar catálogo antes de repetir
creación, sin retry automático/idempotencia prometida ni borrado best-effort.

## 14. Customer behavior

Carta pública conserva query/filtros/mapper/cards/fallback; profile/Auth normales. Admin link
sólo membership de Valhalla. Navegación manual sin acceso muestra estado claro y retorno a
Carta. Ninguna elevación por AAL2 ni UI para provisionar permisos. Puntos/rewards siguen demo.

## 15. Revocation same-JWT

Store usa generation + Auth revision/identity y cancelación para descartar respuesta de A en B.
Logout/account switch borra authority inmediata y desmonta editores/receipts. Refetch de
misma identidad conserva draft pero pausa writes; error/revocación retira acceso.
Antes y después de writes hay nueva comprobación. Mismo JWT: quitar membership → guard
forbidden y writes RLS denegados; reañadir → allowed sin refresh/login. RLS sigue defensa
ante carrera entre preflight y request. No invalidación retroactiva de requests iniciados/
descargas/copies públicas ni revocación instantánea por Realtime.

## 16. Platform AAL1/AAL2

Pruebas backend reales: Platform AAL1 SELECT profiles sólo self; AAL2 con fila ve global;
Customer AAL2 sigue self; revocar fila con mismo AAL2 JWT pierde global. Membership local
independiente continúa. La query nueva sigue self-filter aun con global RLS, no incorpora
memberships de otros usuarios. Frontend real: RPC booleana, guard MFA y negocios read-only.
Pre/postflight consulta capability y nivel SDK, comprueba owner/revisión/cancelación y
descarta lectura tras revocación o switch. Refetch desmonta contenido global mientras
verifica; quitar fila →forbidden, reañadir →allowed con mismo JWT. Sin autoridad durable/
Realtime ni revocación retroactiva de requests/copies ya iniciados.

## 17. Tests

`test:admin`: **14 PASS**, fuente productiva TypeScript + SDK y SSR. Mapper/query self-FK,
store A→B/logout/error/StrictMode/revocation/refetch misma cuenta, guard, ARS, whitelist,
slug/orden, MIME/límite/path/metadata/upsert, 0-row writes, fallo parcial + retry sin upload/
DELETE y inactive/revoked preflight. Platform false+AAL2/true+AAL1 MFA/true+AAL2, error,
assurance desconocida/checking; SSR enlace MFA, global response descartada por revocación/
switch y refetch revocar/restaurar. Labels/fieldset/inputMode SSR; no browser visual.

## 18. Real LOCAL integration

`test:admin:local`: **12 PASS** (11 escenarios + padre). Cinco cuentas efímeras confirmadas
por Mailpit/GoTrue y sesión SDK real, sin JWT fabricado/service_role en assertions. Admin
A/B/Both, customer y Platform; TOTP real para customer/Platform AAL2. Auth/authority stores
y adminActions/data productivos, PostgREST/Storage reales.
Create/update categorías/productos, centavos/flags/publicación; foreign writes/FK; inactive
read-only/Both B; same-JWT revocar/reañadir; File upload/bytes/Carta URL/old orphan; revocación
real después de upload antes de PATCH y retry sin nueva subida; revocación antes del upload
conserva producto; Platform RPC real sin AAL, guard MFA, negocios globales y revocar/restaurar
con mismo JWT/membership independiente; logout A→login B limpia authority.
Hook de transporte sólo instala revocación privilegiada exacta de fixture antes del request:
respuesta/denegación provienen del servicio real, no de un mock HTTP.

Cleanup: sólo IDs/emails/paths generados propios, restaura negocio/seed lógico, no timestamps.
SQL privilegiado sólo setup/revocación/cleanup/guards; fixture credential encapsulada sólo
limpia sus objetos por API, nunca frontend/assertions. Sin reset ni borrado de cuentas humanas.
Una primera corrida esperó AAL demasiado pronto; se corrigió la espera del test al estado
asíncrono real y se repitió. No se cambiaron policies para hacerlo pasar.

## 19. Regressions

Todos reejecutados secuencialmente sobre LOCAL exclusivo, sin reset:

| Check | Resultado |
| --- | --- |
| lint / typecheck / build | PASS, cero warnings lint |
| env / types drift | 6 PASS / cero drift |
| menu unit / menu LOCAL | 10 / 11 PASS |
| Auth unit / Auth LOCAL | 11 / 13 PASS |
| Admin unit / Admin LOCAL | 14 / 12 PASS |
| DB estructura/inventarios | 1.110 PASS, seis archivos |
| Authorization REST/Auth | 32 PASS |
| Storage | 24 PASS, DELETE DENY |
| Smoke | 6 PASS |

Build PWA shell conservado, SDK chunk separado, sin warning >500 kB. No runtime API caching.
Aviso heredado Multiple GoTrueClient instances sólo en adapter de tests Auth que recrea
clientes con storage key compartida; no warning silenciado ni consola browser certificada.
Producto conserva singleton. No orphan-probe temporal ejecutado.

## 20. Visual/manual status

**PENDIENTE**, no capturas del nuevo Admin ni consola/foco/interacción browser observados.
Bloqueo Browser Use saved preference ya comprobado en 2D/2E: no se reintenta mediante
otro navegador/CDP/Playwright/native/hosted ni se cambian permisos. SSR/SDK no sustituye UI.
Supabase y Vite quedan disponibles: http://127.0.0.1:5173, Mailpit 54324, Studio LOCAL 54323.
No se crearon admins persistentes. Runbook manual membership/Platform fixture de cuenta
ficticia elegida únicamente por el usuario en SUPABASE_WORKFLOW; no app provisioning.

Revisar 390×844 primero, 360/430/768/1280: customer forbidden y Admin acceso; tabs; categorías/
productos create/edit; precio con centavos; orden/agotado/featured/inactivo; imagen real,
preview/failure/retry; Carta tras cambios; labels/Tab/foco/disabled/loading; overflow/safe areas/
consola. Platform: customer AAL1/AAL2 Forbidden, fila+AAL1 MFA requerido, enrollment/challenge,
Continuar a Platform con AAL2, negocios sólo lectura sin herramientas globales; revocar/
restaurar misma fila/sesión y Actualizar datos y permisos. Sin compartir QR/secret/password/tokens.
No correr suites exclusivas después de crear cuentas/edits humanos ni resetearlos automáticamente.

## 21. Docs

READMEs raíz/web/lib, DATABASE, ARCHITECTURE, SECURITY, ROADMAP, PROJECT_BLUEPRINT, UI_GUIDE, DECISIONS,
SPRINT_2_ARCHITECTURE, SUPABASE_WORKFLOW, TASK_2E_WALKTHROUGH y este documento.
2E cierre humano registrado sin inventar verificaciones adicionales; 2F implementada LOCAL,
visual/manual pendiente; A-S2-006 APPROVED booleana self SIN AAL. Google OAuth A-S2-007
opcional futuro, no deuda de seguridad ni blocker.
2A/B/C/D/G historia conservada. Hosted/economía no marcados completos.

## 22. Warnings

Visual/manual Admin/Platform pendiente; SDK/SSR no equivale a aprobación visual.
No readiness producción: PWA física, SMTP/CSP/dominio/runbooks/MFA recovery en 2H.
Catálogo consultas paginadas no garantiza snapshot entre páginas ni benchmark masivo.
No optimistic-lock/versionado de ediciones simultáneas; actualizaciones normales last-write
wins, revisar estrategia antes de operación multioperador significativa. No nueva economía.
Docker puertos publicados: red confiable, sin firewall/túnel; detener cuando termine revisión.
Fixtures exclusivas guardadas; terminación abrupta requiere inspeccionar, no reset ciego.

## 23. Diff

Nuevos features/authority, features/admin y AdminCatalogPage; reemplazo AdminPage placeholder;
router/main/AdminLayout/ProfilePage integrados. CSS Admin scoped, Carta/branding intactos.
Tests authority-admin/admin-local, scripts raíz/web; helper Mailpit admite sólo nuevo prefijo
fixture task2f además de los anteriores. A-S2-006 agrega una migration/tipos generados,
PlatformData/guard/PlatformPage/enlace MFA e inventarios/tests. Sin nuevas dependencias/
lockfile/config/tablas/policies/helpers/seed/Storage.
Worktree anterior 2A–2E/2G preservado, diff global no atribuible íntegro a 2F. Sin stage.

## 24. Confirmación

NO Google OAuth, hosted/Supabase remoto/Vercel/deployment. NO global Platform writes,
consola completa, private REST, Auth Admin API o admins reales provisionados. NO economía,
ledger/compras/balance/reversal/rewards/vouchers/QR customer. Única migration/function/grant
nuevos expresamente aprobados: RPC self/EXECUTE authenticated. NO editar migrations previas,
RLS/helpers/tablas/config/seed/Storage. NO DELETE/cleanup/lifecycle/move/overwrite.
NO secretos en browser/bundle/metadata ni authority desde metadata/JWT custom/email.
NO commit/push/stage ni inicio automático de otra task.

## 25. Recomendación exacta para 2H

**No comenzar 2H todavía.** A-S2-006 aprobada y Platform mínimo completado técnicamente.
Primero revisión humana Admin/Platform y aprobación de Task 2F.
Después, sólo por nuevo prompt: “Task 2H — hardening/runbooks y preparación de entorno
autorizado. Revisar 2A–2G, MFA recovery, privacidad, SMTP/redirects/CSP, PWA instalada y
actualización, accesibilidad/errores reales, observabilidad/backups y concurrencia operativa.
No hosted/deployment sin aprobación específica del target/propiedad, no economía ni global
writes; no commit/push automático. Preservar datos útiles y reportar gates.”

## Estado operativo y alcance protegido

Supabase LOCAL/Vite activos para revisión humana; credenciales sólo públicas en memoria
del proceso, sin .env.local creado/sobrescrito. Cuatro migrations previas y seed fuente
verificados por hashes históricos; config/lockfile sin edición. Quinta migration/tipos
nuevos intencionales. Inventarios 24 policies dominio +3 Storage,
cero DELETE/temporales; users/profiles/memberships/platform/objects de fixture retirados,
seed lógico 5bc80b32792095fb6cf02694de9626a1.

Comprobación final real: cero users/profiles/memberships/platform/objects, 27 policies,
una RPC pública self aprobada, cero temporales/DELETE Storage, seed lógico intacto y hashes protegidos sin
cambios. Nueve servicios Supabase operativos, healthchecks disponibles healthy; Vite responde
200 en Carta/login/profile/admin/categories/products/platform/mfa. Mailpit sin correos de fixture.
Patrones de credenciales sensibles en JS build: cero hallazgos; diff --check correcto y
staged vacío. HTTP/health checks no aprueban visualmente la UI.

Fuentes oficiales contrastadas con SDK fijado y pruebas reales:
[upload estándar](https://supabase.com/docs/reference/javascript/storage-from-upload),
[UPDATE y representation](https://supabase.com/docs/reference/javascript/update),
[joins FK](https://supabase.com/docs/guides/database/joins-and-nesting),
[schemas REST](https://supabase.com/docs/guides/api/using-custom-schemas).
RPC INVOKER y EXECUTE contrastados con [funciones Supabase](https://supabase.com/docs/guides/database/functions).

## Evidencia específica A-S2-006

Inventario 06 verifica única firma sin parámetros, boolean, STABLE/SQL/INVOKER/search_path,
delegación exacta sin AAL, owner, EXECUTE efectivos y sin grants extra/grant option.
Inventario 04 espera exactamente un wrapper público y conserva cuatro helpers privados
exactos/grants/columnas/policies. SQL rollback no se presenta como prueba JWT.
REST usa GoTrue/Mailpit/TOTP genuinos: Customer, Admin Valhalla/B/Both, Customer AAL2 y
user_metadata.platform_admin=true →false; misma identidad Platform AAL1/AAL2 →true.
Quitar fila →MISMO JWT→false y sólo self/public; reañadir →true sin refresh/login.
POST user_id/email/business_id/role/metadata y GET user_id →404 (no firma); anon →401;
private Accept-Profile →406, public platform_admins →404. No enumeración de operadores.
RPC no habilita global reads: AAL1/Customer AAL2 siguen self/public y sin drafts globales;
Platform AAL2 global read-only, writes globales rechazados. AAL no se combina en DB ni se
guarda en authority; lo resuelve SDK. Regresiones 2B–2F/2G reejecutadas tras migration, sin
reset, sin datos humanos preexistentes y con cleanup propio. Sin nueva policy temporal.
