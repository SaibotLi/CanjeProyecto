# CANJEPROYECT — HOSTED / PILOT FOUNDATION — H1

> Registro histórico H1, cerrado antes de H2/H3. Estado consolidado actual y Git en
> [SPRINT_2_CLOSEOUT.md](SPRINT_2_CLOSEOUT.md). Este resumen sanitizado contiene la
> evidencia necesaria; artefactos detallados fuera del repo no se versionan.

Fecha de cierre: 07/10/2026 (America/Buenos_Aires).
Estado: **HOSTED FOUNDATION VERIFIED**.
Target: Canje Proyecto / `liojmtsopplgzderrrqi` / us-east-1.
URL pública: https://liojmtsopplgzderrrqi.supabase.co.
Base: main / `80427801bc1a38c1b637d7565a5aa6782e12da28`.

H1 verifica foundation hosted, exposición efectiva, autorización y cleanup de fixtures.
Auth permanece sin configurar para producción. H2 no fue iniciada.

## 1. Reconstrucción y target

Repo clonado desde https://github.com/SaibotLi/CanjeProyecto.git; HEAD exacto y checkout
inicial limpio. README y los 21 documentos de docs leídos; fuentes/walkthroughs aprobados
fueron el contrato de comparación. No se dependió del contexto de otra notebook.
Git2.55.0.windows.5; Node24.20.0; runner pnpm11.19.0 exacto, aislado del global11.25.0.
Install frozen-lockfile (479 paquetes), CLI2.119.0 y SDK2.117.2 conservados; sin updates,
regeneración del lockfile, CLI global o Docker/start/reset local.

El usuario completó login oficial local; no se pidieron/publicaron credenciales.
Metadata oficial: ACTIVE_HEALTHY, creado07/10/2026, DB17.11.0.003/server_version17.11,
branches=[] (proyecto principal). Link oficial y project-ref ignorado coinciden con el
target. Cada query/runner verifica ese ref. Sin proyecto nuevo ni branch remota.
La CLI accedió a su estado oficial local fuera del sandbox. No .env frontend hosted.

## 2. Preflight, dry-run y migrations

Preflight original read-only: cero objetos/rutinas app public/private, usuarios, buckets,
objetos y policies Storage custom; private/history aún ausentes. Helpers nativos Storage y
user_metadata disponibles. No db pull/reset/repair/baseline nueva/seed.
Dry-run `db push --linked --dry-run --skip-vault` propuso exactamente cinco migrations,
seeds=[] y roles=[]. Tras guard de ref/HEAD/fuentes, push autorizado
`db push --linked --skip-vault --yes`: cinco aplicadas, sin seed/roles/Vault.
Migration list posterior y catálogo final coinciden:

| Migration aprobada | Versión hosted |
| --- | --- |
| 20261002120000_sprint2_foundation.sql | 20261002120000 |
| 20261002130000_sprint2_authorization.sql | 20261002130000 |
| 20261002140000_sprint2_active_business_menu_writes.sql | 20261002140000 |
| 20261002150000_sprint2_storage.sql | 20261002150000 |
| 20261005160000_current_platform_capability.sql | 20261005160000 |

Cinco fuentes intactas. Blobs/contenido LF coinciden con hashes2H; core.autocrlf=true
explica CRLF en checkout. Sin cambio Git/newlines ni config push; config.toml sigue LOCAL.

## 3. Foundation app — PASS

Inventario independiente read-only de contratos aprobados, reejecutado tras cleanup.
Sin instalar pgTAP/extensiones ni simular claims SQL hosted.

| Invariante | Evidencia |
| --- | --- |
| Siete tablas | Columnas/PK exactas; owner postgres; RLS enabled; FORCE RLS=false |
| Integridad | Siete PK, tres UNIQUE, ocho FK, 17 CHECK; todos validated=true |
| FK tenant/category | Compuesta menu_items(business_id,category_id), acciones aprobadas |
| Columnas/defaults | 46 columnas; nulabilidad exacta; dos numeric(14,2); 12 timestamps; tres UUID |
| Índices/triggers | 13 índices válidos; cinco updated_at; trigger Auth mínimo habilitado |
| Policies | 27 exactas: 23public, una private, tres Storage; cero diferencias |
| Grants app | 168 ACL tablas +552 ACL columnas =720; cero diferencias |
| Grantees/grant options | Cero inesperados de app; sin PUBLIC EXECUTE adicional |
| Helpers | INVOKER/STABLE/search_path vacío/owner/body/EXECUTE aprobados |
| Trigger profile | DEFINER mínimo, body estático; sin promoción por metadata |
| RPC | Única public is_current_user_platform_admin(), sin args, boolean, SQL/STABLE/INVOKER |

RPC body exacto `select private.is_platform_admin();`; capability no incorpora AAL.
Global READ requiere fila Platform vigente +JWT AAL2. Platform AAL1 devuelve capability=true
y carece de las lecturas protegidas. Constraints/índices/triggers/migrations/helpers/ACL
posteriores iguales al preflight JWT. Cero grants/DDL/policies nuevos durante fixtures.

## 4. Data API y A-H1-002 — PASS

CLI oficial confirma lista exacta aprobada `[public, graphql_public]`; no se cambió para
forzar paridad LOCAL. private/storage no están expuestos. Requests reales con publishable
key y JWT Customer/Admin A/Admin B/Customer AAL2/Platform AAL1/AAL2: GET Accept-Profile y
POST Content-Profile private/storage →406/PGRST106. JWT anon oficial también dio406 en
la fase previa. Sin exposición directa/indirecta private o Storage SQL.

graphql_public: cero relaciones/tipos, una rutina managed graphql (supabase_admin/INVOKER),
body estático que devuelve `pg_graphql extension is not enabled.`. Extensión ausente antes
y después. No objetos CanjeProyecto ni cambios de schema. Requests de los siete contextos
devuelven ese error y no conceden autoridad adicional.

Sin vistas/materialized views/foreign tables public ni Edge Functions. Únicas rutinas API:
stub managed y RPC booleana app. anon/authenticated sin LOGIN/SUPERUSER/BYPASSRLS/CREATEDB/
CREATEROLE/role memberships/CREATE schema. Sin SQL dinámico/DDL/TRUNCATE/triggers/maintenance
RPC. execute_sql →404/PGRST202 en todos los contextos. Management SQL con SELECT1 inocuo
rechaza publishable key/JWT de todos los actores con401; también el JWT anon oficial.
No se intentó emitir TRUNCATE ni DDL. La ausencia de superficie whole-table se comprobó
estructuralmente y con requests inocuas, no por una operación destructiva.

## 5. Storage y A-H1-001 — PASS

Managed Storage ACL may differ between local Supabase distribution and Hosted;
CanjeProyecto owns policies/application grants, not Supabase-managed schema ACL.

menu-images: PUBLIC, STANDARD, versioning DISABLED, 5.242.880bytes, MIME jpeg/png/webp/avif.
objects/buckets RLS enabled, owner supabase_storage_admin, protect_objects_delete y
protect_buckets_delete habilitados. Tres policies exactas: Business own READ incluso
inactivo; Platform READ fila+AAL2; standard new upload propio con membership/business
activo/path UUID/MIME/extensión/metadata NULL o{}. Sin UPDATE/DELETE/ALL/anon/bucket policy.

STOP inicial: 16 diferencias LOCAL/HOSTED TRUNCATE/REFERENCES/TRIGGER/MAINTAIN para anon/
authenticated en objects/buckets. ACL pre-push no se capturó; el usuario confirmó baseline
managed y aprobó A-H1-001. Ninguna migration app concede Storage grants. ACL antes/después
de fixtures idénticas. Sin REVOKE/managed DDL/migration de paridad/grant/policy nuevos.
TRUNCATE/REFERENCES no dependen de RLS; se verifica frontera API/RPC sin ejercerlos.

Test05 elimina sólo48 expectativas ACL managed de PASS/FAIL y emite diagnósticos con
privilegio/grantor/grantee/grantable. Mantiene17 assertions policies/roles/RLS/bucket/no
app UPDATE/DELETE/triggers/helpers. Bloque propio y final idénticos al commit base.
Guard de fuentes PASS1/0: app migrations no crean ACL/grantees/grant options/role grants
indirectos/managed Storage DDL. Catálogo actual no atribuye por sí solo procedencia histórica.
Counts pgTAP65/1.092/1.110 de2G/2H son históricos. No suites LOCAL destructivas/pgTAP hosted;
invariantes read-only reejecutadas. Cambio separado test/documentación, sin debilitar policies.

## 6. A-H1-003 — JWT real PASS (116 checks)

Runner separado, target/HEAD guard, estado inicialmente vacío y manifiesto UUID propio.
Cuatro identidades ficticias example.test; cero cuentas personales. Auth Admin sólo
setup/cleanup, email_confirm por fixture, sin emails enviados o Auth config cambiado.
Password sign-in real →JWT AAL1. Enrolamiento/challenge/verify TOTP reales para Customer y
Platform →JWT AAL2. Sin JWT fabricado, service_role assertions, refresh automático o secretos
persistidos. Privilegio DB sólo setup/estado activo/revocaciones exactas/cleanup.
Fixtures: dos businesses, dos memberships, una fila Platform, dos categorías/items ocultos,
dos PNG68bytes y dos factores TOTP. Sin loyalty_settings/seed/catálogo real/economía.
user_metadata role/platform_admin/aal ficticia no concede autoridad.

| Actor/caso | Resultado real |
| --- | --- |
| Customer AAL1/AAL2 | Sólo profile propio; capability=false; sin memberships/Admin/Platform/global hidden READ |
| Customer writes | Self display_name permitido; otro profile/tenant insert/promotion denegados |
| Admin A/B | Own INSERT/UPDATE/hidden READ; aislamiento inverso y foreign writes denegados |
| Storage anon/Customer/AAL2/Platform AAL1 | No administrative listing pese a objetos A/B existentes; uploads denegados |
| Storage Admin A/B | Standard upload propio/bytes exactos/own list; foreign list/upload y custom metadata denegados |
| Platform AAL1 | Capability=true; global profiles/memberships/hidden menu/inactive businesses denegados |
| Platform AAL2 | Global READ profiles/memberships/hidden categories/items/inactive businesses/objetos A/B |
| Platform writes AAL1/AAL2 | Global business/category/item/otro profile/INSERT/promotion/upload denegados |
| Bucket administration | Listing vacío para todos; sin app bucket policy |
| Membership revoke SAME JWT | Quitar filaA exacta: pierde membership/hidden READ/list/write/upload sin relogin |
| Inactive SAME JWT | AdminB conserva own READ; pierde write/upload |
| Platform revoke SAME JWT AAL2 | Quitar fila exacta: capability=false; pierde global app/Storage READ |

Writes verifican representación/affected rows/persistencia. Denegados: cero filas o42501,
estado persistido intacto observado con JWT Platform AAL2 mientras conserva autoridad.
Upload denegado verifica metadata y bytes ausentes. image_path interoperable con objetos.
Known-path public download conserva bytes aprobados; no equivale a administrative listing.

Exclusión A-H1-003: no DELETE app ni Storage overwrite/move/copy/UPDATE de objetos remotos.
Se verifican estructuralmente por policies exactas y superficie SQL/RPC ausente; no se
presentan como requests ejecutadas. DELETE Storage sólo cleanup privilegiado autorizado.

## 7. Cleanup exacto — PASS

Storage API retiró sólo paths UUID registrados de menu-images, sin DELETE SQL metadata o
emptyBucket. DB retiró filas sólo de dos business UUID y autoridad de cuatro user UUID.
Auth Admin hard-delete exacto de identidades ficticias/dependencias. Bucket/ACL/policies/
config intactos. Inventario final:

| Residuo | Count |
| --- | --- |
| Auth users / profiles | 0 /0 |
| Memberships / Platform rows | 0 /0 |
| Businesses / categories /items /loyalty_settings | 0 /0 /0 /0 |
| Storage objects | 0 |
| MFA factors /challenges /amr claims | 0 /0 /0 |
| Sessions /refresh tokens | 0 /0 |

Sin fixture/MFA residual. Catálogo y ACL iguales al anterior. Sin autoridad, grants u hooks
nuevos residuales. Cleanup privilegiado acotado conforme aprobación, sin DELETE app.

## 8. A-H1-004 — Auth inventory suficiente

Lecturas oficiales: public Auth settings y config diff --output-format json con declaraciones
scratch fuera del repo. Sólo diff; sin config pull/push/start/debug. Configuración intacta.
Dashboard no autenticado no fue blocker; valores inaccesibles no se asumieron como defaults.

| Campo | Observado |
| --- | --- |
| Site URL | http://localhost:3000 |
| Additional redirect URLs | [] |
| Email/password /signup | Enabled /enabled |
| Email confirmation | Enabled; mailer_autoconfirm=false |
| TOTP | Enroll/verify disponibles; dos journeys reales AAL2 PASS |
| SMTP general | Custom SMTP disabled; sin prueba de entrega |
| Email frequency /OTP length | 1min /8 |
| Rate limits visibles | SMS30/h; anonymous30/h/IP; refresh150/5min/IP; sign-in/signup30/5min/IP; verification30/5min/IP |
| Email sending quota exacta | UNKNOWN / TO CONFIGURE IN H2 |
| Templates visibles | Subjects de confirmation/recovery/invite/magic-link/email-change |
| Cuerpos completos templates | UNKNOWN / TO CONFIGURE IN H2 |
| Google/OAuth | Google y demás OAuth públicos deshabilitados |

Subjects: Confirm your email address; Reset your password; You've been invited;
Your sign-in link; Confirm your new email address. SMTP/templates/URLs/redirects/cuotas
productivos/delivery son H2 autorizada. H1 no configura Auth ni certifica delivery productiva.

## 9. Comparación y checks finales

| Dimensión | Cierre LOCAL vs HOSTED |
| --- | --- |
| Migrations/app schema/RLS/grants/helpers/RPC | Mismas cinco fuentes e invariantes aprobadas |
| Storage bucket/policies | Coinciden |
| Managed ACL | 16 diferencias informativas A-H1-001; intactas |
| Data API | LOCAL public; HOSTED public+stub A-H1-002; private/storage406 |
| Distribution DB | LOCAL17.11.0.002 /HOSTED17.11.0.003, major17 |
| Auth | Inventariado, configuración productiva H2 |
| Datos finales | Cero app/usuarios/objetos; sin seed |

LOCAL relevante: typecheck PASS; web test:env6/6 PASS (primera sandbox5/6 por lectura esbuild,
misma suite fuera de sandbox6/6 sin cambio de fuente). Source guard1/0 PASS, assertions propias
intactas y diff protegido limpio. No nueva QA física LOCAL2H/reset/fixtures de esos runners.
HOSTED: preflight/list/dry-run/push, catálogo read-only, 116 checks JWT/TOTP, SAME-JWT revocation,
cleanup exacto, comparación posterior y Auth inventory suficientes. No delivery/carga/UI productiva.

## 10. Evidencia y límite del cierre

Registro actual: outputs/H1_HOSTED_FOUNDATION_VERIFIED_EVIDENCE.json fuera del checkout.
Copia entregable del walkthrough y patch separado test/documentación en outputs.
H1_HOSTED_EVIDENCE.json y H1_A_H1_001_EVIDENCE.json son históricos (STOP inicial/reanudación
pendiente); no representan el cierre. Plan pendiente supersedido por A-H1-002/003/004 y PASS.
Sin passwords/JWT/refresh tokens/TOTP secrets/service_role/secret keys/DB password persistidos.
Cinco migrations/config.toml/seed.sql/package.json/lockfile intactos; sin stage/commit/push.

**HOSTED FOUNDATION VERIFIED.** No H2 automático, Vercel, Google OAuth, bootstrap real,
cuentas personales/usuarios reales, catálogo real, economía, seed.sql, TRUNCATE o whole-table
destructivo. No REVOKE managed ACL/pg_graphql habilitado. Cleanup sólo fixtures propias.

Fuentes oficiales consultadas:
[CLI login](https://supabase.com/docs/reference/cli/supabase-login),
[link](https://supabase.com/docs/reference/cli/supabase-link),
[push/dry-run](https://supabase.com/docs/reference/cli/supabase-db-push),
[Auth fixture creation](https://supabase.com/docs/reference/javascript/auth-admin-createuser),
[Auth fixture deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser),
[TOTP verification](https://supabase.com/docs/reference/javascript/auth-mfa-challengeandverify).
Ayuda de la CLI fijada y mediciones reales del target determinaron flags/resultados.
