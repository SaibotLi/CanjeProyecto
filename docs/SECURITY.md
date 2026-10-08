# Security — frontera implementada Sprint 2 LOCAL + HOSTED

## Admin — recuperación frontend ante errores de refetch (08/10/2026)

El catálogo conserva datos/borrador del mismo dueño durante revalidación y fallos de red;
no se convierten en autoridad. Si falla el check de permisos, status error pausa operaciones
y businessGate permanece error; Platform global permanece oculto. Una respuesta DB válida
sin membership retira acceso; logout/cambio de identidad limpia inmediatamente. Guardar
siempre exige revalidación DB y RLS/representation actuales. No grants/schema/RPC nuevos.
[Causa temporal y regresión](ADMIN_CATALOG_LIFECYCLE_FIX.md).

## A-H1-001 — ownership de Storage administrado

Managed Storage ACL may differ between local Supabase distribution and Hosted;
CanjeProyecto owns policies/application grants, not Supabase-managed schema ACL.
Decisión aprobada el 07/10/2026: no revocar TRUNCATE/REFERENCES/TRIGGER/MAINTAIN del
baseline HOSTED ni modificar managed Storage DDL. Esos privilegios se inventarían;
la seguridad requiere también comprobar la superficie efectiva de API/RPC, porque
TRUNCATE/REFERENCES no se limitan mediante RLS. Nunca probar TRUNCATE destructivo hosted.
Policies, roles, RLS, bucket/MIME/límite, no app UPDATE/DELETE y grants app propios siguen
siendo invariantes estrictas. Guard de fuentes complementario:
`node --test supabase/tests/storage-ownership-contract.test.mjs`.
No atribuir las ACL administradas a la aplicación por una diferencia respecto a LOCAL.
Estado/evidencia de H1 en HOSTED_FOUNDATION_WALKTHROUGH.md; no cierre por inventario solo.

## A-H1-002/003/004 — frontera de validación Hosted

H1: A-H1-002 acepta el stub `graphql_public` administrado, con extensión deshabilitada y
sin autoridad app/SQL arbitrario. A-H1-003 permite fixtures ficticias acotadas para requests
JWT y TOTP reales, revocación sin relogin y cleanup exacto. No habilita bootstrap real ni
DELETE app/overwrite/move/copy remotos. A-H1-004 deja valores Auth inaccesibles como
`UNKNOWN / TO CONFIGURE IN H2`; H1 no configura Auth ni certifica delivery productiva.

## H3 — HOSTED FRONTEND CONNECTED (07/10/2026)

https://valhallapp.vercel.app conectado al Hosted liojmtsopplgzderrrqi. Production usa
exclusivamente VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY públicas. Sin secretos de
servidor en browser ni nuevos grants, RLS, schema, migrations o Storage. Sólo Site URL/
redirects exactos corregidos por el dominio indicado por usuario y rewrite SPA mínimo.
Login/profile/Admin con reload PASS; Platform AAL1 exige MFA y AAL2 permanece read-only.
La denegación backend conserva evidencia H1/H2 sin cambios ni nuevas escrituras globales.
Cero errores/warnings de consola observados; URL configurada Hosted sin loopback.
No HAR/payloads/JWT exportados. [Evidencia y límites H3](H3_VERCEL_HOSTED_SMOKE_WALKTHROUGH.md).
A-H2-SMTP sigue HARD GATE externo. No Google OAuth, economía o fase posterior automática.

## H2 — COMPLETADA / APROBADA (07/10/2026)

H2 / A-H2-001: bootstrap interno de una identidad operadora confirmada mediante signup
normal; password/confirmation/MFA humanos. SMTP default sólo dirección autorizada del
equipo, sin retries automáticos/bypass/auto-confirmación. A-H2-SMTP: custom SMTP + dominio
autenticado HARD GATE antes de usuarios externos/piloto clientes/lanzamiento público.
Platform sólo UUID confirmado + autorización exacta inmediata; Business Admin mediante
membership independiente. Global writes permanecen DENY. Sin secreto browser/Vercel/H3.

Auth Hosted, factor TOTP real y Platform AAL2 read-only verificados. AAL1 conserva el gate
MFA. Revalidación final mantiene las 27 policies y 720 comprobaciones ACL propias sin drift;
private/storage no expuestos en Data API. Reingreso y validación visual final confirmados
por el usuario. [Cierre H2](H2_HOSTED_BOOTSTRAP_WALKTHROUGH.md). Al cierre de H2 Vercel aún no estaba conectado;
Google OAuth pendiente y economía/Sprint 3 fuera de scope. Ningún blocker interno de H2;
el gate SMTP externo continúa vigente. No nuevas operaciones funcionales en este cierre.

## Cierre QA 2H — 05/10/2026

Regresión real LOCAL completada: RLS/grants/helpers/RPC/private 406, A/B/Both,
inactivo read-only, Platform DB+AAL2 read-only, Customer y Business Admin AAL2 sin autoridad
global, metadata maliciosa sin promoción, revocación/restauración same-JWT y DELETE Storage DENY.
Inventario exacto 27 policies; cero policies temporales/fault constraints al finalizar.
Secret audit de repo, env/logs ignorados y dist: sin hallazgos de patrones de credenciales;
salida redacted, revisión de usos runtime y logs de tests. No certificación de ausencia
universal de secretos ni escaneo de dependencias/credenciales gestionadas de Docker/CLI.
PWA sólo shell estático, sin cache de API/Auth/perfil; no offline Auth.
2F COMPLETADA/APROBADA manualmente por el usuario. Foco/safe areas/PWA física/consola
adicionales no se dan por validados visualmente por pruebas SDK/SSR.
[Walkthrough 2H](TASK_2H_WALKTHROUGH.md) y [gates hosted/pilot](SPRINT_2_CLOSEOUT.md).
SMTP/CSP/runbook MFA/GC/OAuth/operación remota no bloquean la foundation LOCAL y no se implementan aquí.

## Storage 2G — A-S2-003 APPROVED; A-S2-004 APPROVED/DEFERRED

Task 2G COMPLETADA/CERRADA LOCAL, aprobable; DoD final y regresiones post-reset en PASS.

`menu-images` deliberadamente PUBLIC. **PUBLIC bucket ≠ public administrative listing.**
Archivo, información técnica y cualquier custom/user metadata de un path conocido son
públicos, incluso sin JWT. Todo filename/path/metadata es no confidencial; UUID no protege
secretos. La app no almacena allí información funcional, privada o de autorización.
INSERT exige user_metadata NULL/{} mediante RLS estándar, comprobado con upload binario y
multipart reales. No se modificó ningún internal/trigger gestionado de Storage.

Migración 20261002150000: bucket reproducible de 5 MiB (5.242.880 bytes), MIME exactos
image/jpeg, image/png, image/webp, image/avif; sin SVG/GIF. Tres policies PERMISSIVE a
authenticated en storage.objects; ninguna policy anon, UPDATE, DELETE, ALL o sobre buckets:

| Actor | Listado administrativo | Upload nuevo estándar | UPDATE / DELETE / bucket admin |
| --- | --- | --- | --- |
| Anon/customer, incluso customer AAL2 | Sin filas | Denegado | Denegado |
| Business Admin vigente | Namespace propio, incluso inactivo | Propio y negocio activo | Denegado |
| Platform fila vigente + AAL1 sin membership | Sin global | Denegado | Denegado |
| Platform fila vigente + AAL2 | Global sólo menu-images | Sólo con membership independiente + negocio activo | Denegado |

business_read/business_insert validan name REAL completo y canónico, nativo foldername y
business.id::text, sin cast de input; autoridad sólo is_business_admin original. is_active
explícito en INSERT, no en helper/READ. platform_read exige fila DB + JWT AAL2. INSERT limita
operación oficial object.upload y MIME declarado coherente con extensión. No nuevas funciones,
grants ni SECURITY DEFINER. ACL gestionada inventariada, no ampliada; Data API no expone storage.

**DELETE DENY definitivo en Sprint 2, acceptance correcta (A-S2-004 APPROVED/DEFERRED).**
Candidato NOT EXISTS sobre
menu_items pasó secuencia pero falló concurrencia real: PATCH image_path confirmó referencia
mientras DELETE esperaba y luego el archivo fue eliminado. Policy experimental retirada;
Reemplazo: nuevo asset UUID/path, actualizar después menu_items.image_path; archivo anterior
puede quedar orphan. Es deuda operacional aceptada, no leak ni corrupción por sí misma.
No lifecycle/cleanup automático, FK/CHECK cross-service, triggers peligrosos o DEFINER.
Antes de cleanup productivo significativo, A-S2-005 exige diseño coordinado: concurrencia,
período de gracia, revalidación, auditoría y fallos DB/Storage. No diseñarlo ahora.
[Prueba y contrato definitivo](TASK_2G_WALKTHROUGH.md#11-deleteorphan--decisión-aprobada).

Límites: MIME declarado/extensión no verifica bytes ni decodifica imágenes. Gateway normaliza
algunas rutas (p. ej. slash doble); se valida el nombre canónico realmente almacenado. x-upsert
en path nuevo puede INSERT; en existente no puede overwrite. Move/copy/signed upload no
habilitados. Revocación same-JWT afecta siguientes requests, no uploads ya iniciados, URLs
públicas o copias descargadas/cacheadas. No promesa de invalidación instantánea.

02/10/2026: esquema 2B + migración forward-only 2C. Siete tablas con RLS, 24 policies
PERMISSIVE y grants explícitos por columna. En 2C frontend quedó mock; 2D conecta lectura
pública LOCAL y 2E añade Auth frontend. Sin hosted ni economía. PostgreSQL es autoridad,
no botones/guards/localStorage/metadata. Ninguna policy/grant/schema alterada por 2E.

## Lectura frontend pública — Task 2D (03/10/2026)

Cliente browser compartido sólo publishable key, env validado lazy; nunca service_role/secret/password/JWT privilegiado. Sin AuthProvider ni sesiones UI en 2D. Consulta real filtra business/category/item is_active=true explícitamente, no sólo RLS, por slug valhalla-space. Probado con anon/customer/Admin A/B/Both/Platform AAL1/AAL2 mediante JWT Auth real. Membership/global-read no convierte drafts en publicaciones. Mapper defensivo/errores controlados sin diagnósticos privados o fallback mock; settings ausentes inválidos no inventan regla.

URL sólo getPublicUrl(menu-images,image_path), sin metadata/listing/signed URL/uploads UI.
Paths públicos A-S2-003; DELETE app DENY A-S2-004. Sin cambios schema/grants/policies/helpers.
PNG fixture creado por admin JWT/cleanup DEV propio, no lifecycle app. Preview no acredita.
2D COMPLETADA/APROBADA por validación visual/manual del usuario (05/10), no capturas del agente.

## Auth frontend LOCAL — Task 2E (05/10/2026)

Implicit explícito para SPA sin SSR; singleton SDK 2.117.2 con persist/refresh/detectURL true,
debug false. Únicamente URL/publishable key validados; ningún Auth Admin API/secret/service_role,
custom token storage, JWT decode frontend o bootstrap platform. SDK almacena sesión normal:
no garantiza seguridad frente a XSS, máquina comprometida o storage alterado. Guards sólo UX
de sesión, nunca autorizan datos/operaciones. PostgreSQL/GoTrue continúan validando requests.

Signup no user_metadata (tampoco display_name); trigger INSERT(id) existente. profiles sigue
sin email/role. SELECT self explícito id=user.id incluso ante RLS global más amplia; UPDATE
payload sólo display_name. Email desde Auth user actual. Estado único con invalidación epoch/
generation; respuesta privada de A no puede aplicarse a B. Logout scope local oculta estado
privado antes del request; failure explícito/reintento, sin limpiar otros datos localStorage.
SIGNED_OUT y refresh expirado inválido limpian sesión/profile. SDK puede conservar JWT todavía
vigente si falla refresh anticipado: revocar sesión no invalida retroactivamente ese JWT.

Confirmation/recovery: redirects exactos LOCAL, SDK procesa fragment (no parser manual de
access/refresh tokens). Inicialización completada antes de forms y limpieza de URL Auth,
también errores; nunca raw diagnostics/token/link en UI/logs. Recovery exige evento oficial
PASSWORD_RECOVERY, no mera sesión previa. Links usados/expirados/malformed y acceso directo
controlados. Fragment evita logs de servidor, NO vuelve inocuo un link: no compartir/capturar
URLs de mail ni historial; pruebas sólo en memoria. Passwords únicamente form efímero/SDK.

TOTP opcional: QR SVG codificado como data URL, secret efímero sólo enrollment, sin fichero/
persistencia/log. Cancelación retira pendiente; abandono deja unverified visible para retirar,
sin volver a mostrar secret. Verified unenroll sólo AAL2 y refresh para downgrade inmediato.
No bypass/recovery empresarial ni MFA impuesto a todos. Customer AAL2 no global; Platform
fila+AAL1 no global; fila+AAL2 global READ; misma sesión pierde global al quitar fila.
Ningún global write. Antes piloto: runbook privilegiado MFA/reautenticación/recuperación.

SW sólo shell, /auth/* SPA fallback, /api/ excluido y runtimeCaching vacío. Ningún API Auth,
email/token/profile response cacheado por SW. Esto no equivale a auditar cache interno HTTP
hosted, CSP, navegadores físicos/PWA o delivery SMTP: gates de piloto posteriores al cierre LOCAL. 2E COMPLETADA/APROBADA por
validación humana declarada en el prompt 2F, sin capturas del agente. [Evidencia](TASK_2E_WALKTHROUGH.md).

## Matriz real 2C

| Tabla | Público anon/authenticated | Propio authenticated | Business Admin vigente | Platform row vigente + AAL2 |
| --- | --- | --- | --- | --- |
| businesses | SELECT activo | — | SELECT propio incl. inactivo; UPDATE name propio activo | SELECT global |
| profiles | Ninguno | SELECT propio; UPDATE display_name propio | Sin acceso extra | SELECT global mínimo |
| business_memberships | Ninguno | SELECT propias | Sin IUD ni acceso extra | SELECT global |
| private.platform_admins | Nunca REST | SELECT(user_id) propia fila, SQL interno | Sin acceso extra | Sin SELECT global ni IUD |
| loyalty_settings | SELECT negocio activo | — | SELECT propio; UPDATE currency_per_point/points_enabled si negocio activo | SELECT global |
| menu_categories | SELECT activa + negocio activo | — | SELECT propias incl. borradores/negocio inactivo; INSERT/UPDATE propias sólo con negocio activo | SELECT global |
| menu_items | SELECT activo + categoría activa correspondiente + negocio activo; agotados visibles | — | SELECT propios incl. borradores/negocio inactivo; INSERT/UPDATE propios sólo con negocio activo | SELECT global |

Customer implícito, sin membership. Business admin no ve perfiles de clientes ni administra
memberships. Platform no es JWT role/BYPASSRLS/service_role/profiles.role. Puede actualizar
su display_name como cualquiera; writes locales sólo mediante membership independiente y
negocio activo. Toda escritura business-scoped de aplicación requiere negocio activo:
nombre, settings y menú. Admin conserva lectura propia cuando el negocio está inactivo.
Sólo un canal privilegiado futuro puede reactivar businesses.is_active; no grant app sobre
esa columna. Corrección forward-only de 2C restablece V2, no modifica helper ni grants.
Provisionamiento/revocación privilegiados, no app.

## Column-level privileges

anon SELECT sólo businesses/settings/categories/items; authenticated SELECT seis públicas
bajo RLS. Sin grants INSERT/UPDATE de tabla generales.

| Tabla | INSERT authenticated | UPDATE authenticated |
| --- | --- | --- |
| businesses | — | name |
| profiles | — | display_name |
| memberships / private.platform_admins | — | — |
| loyalty_settings | — | currency_per_point, points_enabled |
| menu_categories | business_id, name, slug, display_order, is_active | name, slug, display_order, is_active |
| menu_items | business_id y columnas UPDATE | category_id, name, description, price_amount, image_path, image_alt, image_presentation, is_available, is_featured, is_active, display_order |

IDs/created_at/updated_at no INSERT/UPDATE cliente; DB los genera. business_id sólo INSERT
menú con WITH CHECK membership actual; no re-home incluso Admin Both. UPDATE valida fila
anterior USING/nueva WITH CHECK, membership vigente y negocio activo explícitos en policies
de escritura + grants + FK compuesta + CHECK path. Sin DELETE/TRUNCATE/
REFERENCES/TRIGGER/MAINTAIN/CREATE app, GRANT ALL, PUBLIC table/function grants ni app grant
options. service_role sin grants propios; nunca credenciales privadas en frontend/assertions.

## Helpers privados y policies actuales

is_business_admin(target_business_id uuid): EXISTS public.business_memberships con user_id
=auth.uid(), business_id=argumento, role='admin'; no businesses/metadata. is_platform_admin():
EXISTS private.platform_admins sólo user_id=auth.uid(), sin argumentos. SQL estático/calificado,
STABLE, SECURITY INVOKER, search_path vacío, owner postgres. authenticated recibe USAGE private,
SELECT(user_id) propio + EXECUTE sólo estos helpers; anon ningún acceso private.
private.platform_admins self_read usa auth.uid() directamente, nunca su helper. memberships
self_read no llama business helper; dependencias acíclicas. Ninguna RPC pública genérica.

24 policies por operación: public_read, self_read/self_update, business_admin_read/insert/update,
platform_admin_read. Public expressions sin helpers, admin/global TO authenticated. PERMISSIVE
OR deliberado. Cada global SELECT exige `(select auth.jwt()->>'aal') = 'aal2' AND
(select private.is_platform_admin())`. PostgREST verifica JWT; metadata aal/role/platform_admin
no concede autoridad. Customers/admins normales sin MFA obligatorio. Helper platform puede
comprobar propia fila a AAL1, pero no habilita lectura global por sí solo.

Carta 2D **debe filtrar publicación explícitamente**, incluso con JWT admin/platform: RLS
puede autorizar borradores por otra policy OR. Inventario esperado exacto USING/WITH CHECK/
roles/modo/ACL en supabase/tests/04_authorization_inventory.test.sql, no generado del estado vivo.

## Private, MFA y revocación probadas

Data API schemas=[public], extra_search_path=[public,extensions]. private fuera de ambos;
GET Accept-Profile/POST Content-Profile →406 incluso Platform AAL2. USAGE SQL no exposición REST.
Triggers sin EXECUTE app/Auth: updated_at INVOKER; profile DEFINER mínimo INSERT(id), ambos
owner postgres/search_path vacío. Signup genuino y fallo atómico mantienen regresión.

TOTP activado sólo LOCAL para enrolment/challenge/verify GoTrue auténticos. JWT AAL1/AAL2
emitidos por Auth, no fabricados ni simulados con SQL claims. Código inválido rechazado antes
del correcto. Passwords/TOTP secrets/JWT sólo memoria, no logs/repo. MFA UI/recovery/flujo
productivo antes del piloto; UI LOCAL de 2E completada/aprobada por el usuario.
[MFA oficial](https://supabase.com/docs/guides/auth/auth-mfa),
[flags locales](https://supabase.com/docs/guides/local-development/cli/config),
[column privileges](https://supabase.com/docs/guides/database/postgres/column-level-security).

Con MISMO JWT, quitar membership niega siguiente write; quitar platform row niega siguiente
global read y conserva membership local. Quitar membership conservando platform mantiene
global read y pierde local writes. No revocación retroactiva de queries iniciadas/descargas.
Lectura global de profiles permite enumeración/exportación por API aunque no exista botón;
MFA no sustituye controles operativos/privacidad futuros.

## Evidencia y límites actuales

Regresión estructural 2B + inventario 2C pgTAP/REST real todos los actores. SQL private mínimo
bajo authenticated no sustituye JWT/AAL real. En REST owner sólo guard/setup/provision/
revocación/cleanup; operaciones/assertions con sesiones reales. Writes verifican HTTP,
representation/filas y estado posterior con JWT; PATCH200/[] es denegación, no éxito.
Target guard LOCAL/fixtures ficticios/cleanup sólo propios; ver walkthrough/workflow.
Owner/BYPASSRLS/máquina comprometida/secretos filtrados fuera de frontera app. Docker publica
puertos: red confiable/stop al terminar. Storage NO asegurado por CHECK image_path; 2G aplica
frontera propia. No frontend/economía. Las siguientes secciones mantienen principios futuros
y contexto histórico 2B, no sustituyen la matriz actual anterior.

## Experiencia administrativa 2F — A-S2-006 mínimo aprobado

Memberships SELECT explícito user_id propio incluso bajo Platform AAL2; join FK a negocios,
tenant por slug DB. Ninguna autoridad metadata/email/localStorage/JWT custom. Auth events
invalidan contexto; cambio de identidad/logout borra catálogo/drafts/receipts. Refetch por
ruta/foco/manual y antes de writes; falla cerrada. Mismo usuario durante refresh conserva
vista/draft pero pausa writes hasta revalidar. No garantía de revocación retroactiva de requests
ya iniciados; RLS valida siguientes requests con el mismo JWT.

Sin cambios de tablas/RLS/helpers/config. Única excepción backend aprobada: migration
forward-only para RPC booleana self y EXECUTE authenticated; no grants de filas nuevos.
Payloads create/update
whitelist, sin ID/timestamps editables ni re-home; tenant del contexto, FK y RLS defensa real.
Guards son UX y preflight no vuelve atómico READ→write. .select().single() rechaza 200/0 rows.
Error humano sin SQL/stack/config. Writes sólo business activo; lectura propia inactiva.
Ninguna reactivación de negocio, gestión de memberships o acceso extra a clientes.

Upload estándar nuevo de hasta 5 MiB, MIME/extensión coincidentes, metadata omitida y
upsert=false. Objeto public conocido no confidencial, tampoco su metadata. Sin overwrite,
move/copy/delete/listing global/cleanup. Preview URL local efímera/revocada. DB save failure
tras upload se reporta con receipt self/tenant, retry sin reupload; abandono puede dejar orphan.
Receipt no persiste en storage ni concede permisos. Red ambigua exige revisar catálogo antes
de repetir creación; no promesa de idempotencia/atomicidad cross-service. MIME UX no verifica
contenido/antivirus ni permite afirmar archivo decodificado.

**A-S2-006 APPROVED:** `public.is_current_user_platform_admin()` devuelve sólo boolean
del llamador actual; no argumentos, SQL estático calificado, STABLE INVOKER/search_path
vacío. Delega al helper actual, sin DEFINER ni AAL en el resultado. PUBLIC/anon/service_role
sin EXECUTE; authenticated con EXECUTE sin grant option. private REST permanece 406:
USAGE SQL no es exposición API ni endpoint enumerable de operadores. Nuevos tipos reflejan
la firma sin parámetros, no cambian autoridad. `/platform` requiere boolean true + nivel AAL2
Auth SDK; true+AAL1 muestra MFA requerido. Customer AAL2 sigue Forbidden. Vista sólo negocios,
sin global edits/exports/support. Estado React efímero, invalidación Auth/MFA/identidad y
refetch ruta/foco/manual; contenido global desmontado durante revalidación, pre/postflight
evita presentar éxito global tras revocación comprobada. Backend RLS sigue aplicando
fila vigente+AAL2, no depende del boolean frontend. Same-JWT revocar/reañadir probado.
Google OAuth opcional futuro, no deuda de seguridad ni blocker del Auth aprobado.

## Frontera de confianza futura (principios)

El navegador será un cliente no confiable. Importes, puntos, negocio, costo de recompensa y estado de voucher se resolverán y validarán nuevamente en backend.

## Reglas cerradas

- RLS en toda tabla expuesta.
- Mínimo privilegio y aislamiento por `business_id`.
- Admin autorizado mediante `business_memberships` del mismo negocio.
- Clave pública/publishable solamente en frontend; jamás `service_role` o secret key.
- Escritura económica únicamente mediante funciones seguras.
- Ledger inmutable y auditable.
- Voucher de un uso consumido de forma atómica.
- Idempotencia para impedir duplicaciones por reintentos.

## Matriz conceptual

| Acción | Público | Customer | Admin del negocio |
| --- | --- | --- | --- |
| Leer menú activo | Sí | Sí | Sí |
| Leer cuenta/ledger propio | No | Sí | Solo alcance operativo definido |
| Administrar catálogo | No | No | Sí |
| Acreditar o revertir | No | No | Solo RPC segura |
| Emitir canje | No | Para sí, vía RPC | Flujo futuro explícito |
| Consumir voucher | No | No | Solo RPC segura |

## Pruebas futuras obligatorias

Pruebas allow/deny entre clientes y negocios, escrituras directas al ledger, concurrencia de canjes, doble validación de voucher, idempotencia y reversión con saldo insuficiente.

## Estado de secretos

apps/web/.env.example contiene solo nombres públicos vacíos; los archivos .env locales están ignorados. Vite expone VITE_: nunca almacenar credenciales privadas allí. start/status de CLI pueden imprimir secretos **locales**; no pegar esa salida ni incorporarla al repo. Auditoría Task 2A y límites en TASK_2A_WALKTHROUGH.md. Los tokens QR, JWT y secretos nunca deberán registrarse en logs.

## Sprint 2 V2 aprobada

Platform Admin es autoridad privada DB con MFA/AAL2, no profiles.role/metadata. private
nunca Data API; no global writes hasta auditoría/aprobación nueva. Runbook/pruebas en
[V2](SPRINT_2_ARCHITECTURE.md) y [workflow](SUPABASE_WORKFLOW.md). Policies/helpers/grants
implementados después del baseline cerrado 2B por Task 2C; matriz actual al inicio.

## Baseline histórico cerrado de Task 2B (supersedido por 2C)

La migración es atómica: seis tablas public y private.platform_admins nacen con RLS enabled;
sin policies y REVOKE ALL a PUBLIC/anon/authenticated/service_role. private sin USAGE/CREATE
de aplicación; API solo public, extra_search_path public/extensions. GET Accept-Profile y
POST Content-Profile private se comprobaron con schema real: 406. Incluso la lectura pública
de catálogo estaba denegada entonces; 2C añadió capacidades sin grants heredados.

Triggers privados no son RPC de autorización: updated_at INVOKER y profile SECURITY DEFINER
limitado a INSERT(id), owner postgres/search_path vacío/SQL estático/EXECUTE no público.
Signup genuino probado sin ampliar permisos de Auth. Metadata manipulable no creó roles,
membership, platform authority ni display_name. Fallo inducido rechazó signup completo;
las identidades ficticias y la constraint transitoria fueron retiradas tras cada prueba.

FK compuesta e image_path CHECK operan también para un actor privilegiado que evita RLS.
No garantizan existencia de imagen ni sustituyen políticas de lectura/escritura. Defaults de
timestamps/UUID tampoco sustituyen grants de columnas; 2C limita ID/tenant/timestamps.
Esquema en [DATABASE](DATABASE.md). En aquel baseline no se aprobaron tests negocio/MFA;
ahora implementados/validados en 2C. Datos locales exclusivamente ficticios.
