# Supabase — entorno y workflow (Sprint 2 LOCAL)

## Cierre 2H y repetición segura

SPRINT 2 LOCAL READY, cinco migrations reproducidas y todas las suites PASS. Evidencia:
TASK_2H_WALKTHROUGH.md; checklist hosted/pilot NO ejecutado en SPRINT_2_CLOSEOUT.md.
2F COMPLETADA/APROBADA manualmente por el usuario, no inferida de SSR/API.
Para repetir: confirmar target guard y ausencia de datos humanos antes de un reset autorizado;
preservar cualquier cuenta/catálogo/objeto manual. No reset automático de las suites.
Ejecutar build antes de `pnpm test:qa`; `pnpm supabase:audit:secrets` revisa repo/env/logs/dist
sin valores. Suites reales DB/REST/Storage/menu/auth/admin/smoke exclusivas y secuenciales.
No ejecutar diagnóstico orphan-probe como aceptación final; DELETE DENY es correcto.
Tras fixtures, revisar seed/usuarios/memberships/platform/objetos/policies/fault constraints/mail.
Dev activo en127.0.0.1:5173 no usa SW; PWA física y hosted requieren task posterior.

CLI estable fijada: **2.119.0**, devDependency raíz y lockfile pnpm. Node >=22.13 y pnpm 11.19.0 según packageManager (alineación autorizada en 2B). Docker Desktop operativo con contenedores Linux. Esta versión distribuye su binario como optionalDependency por plataforma; pnpm la marca como build y strictDepBuilds requiere permitir explícitamente supabase en allowBuilds. Se permite solo esta herramienta revisada junto a esbuild, nunca todos los scripts. No CLI global ni login personal requerido para local.

## Dos desarrolladores

Cada uno clona el repo en su máquina, instala la misma versión con `pnpm install --frozen-lockfile`, abre Docker y ejecuta desde la raíz:

```bash
pnpm supabase:start
pnpm supabase:status
pnpm supabase:stop
```

stop conserva datos locales; no usar --no-backup. El primer start descarga imágenes oficiales y puede demorar. config.toml define un ID **local**, no un Project Ref remoto. Puertos por defecto permiten un stack de este repo por máquina; otro worktree/proyecto simultáneo debe acordar puertos/ID, nunca sobrescribir ni detener contenedores ajenos.

API local: http://127.0.0.1:54321; DB: puerto 54322; Studio: http://127.0.0.1:54323; correo local: http://127.0.0.1:54324. Solo desarrollo, sin datos reales; no exponer al internet ni abrir firewall automáticamente. Las credenciales locales conocidas/generadas por CLI no son credenciales de producción. start/status imprimen credenciales: no compartir su salida completa, capturas ni logs. Telemetría opcional: SUPABASE_TELEMETRY_DISABLED=1 en la terminal.

Advertencia verificada: los puertos publicados por Docker usan 0.0.0.0/[::], no solo loopback. Trabajar únicamente en una red confiable, sin redirecciones de puertos ni datos reales; stop al terminar. Task 2A/2B dejan stack detenido y volúmenes conservados. Mínimo Node alineado en engines/README: >=22.13.

## Variables de Vite

Copiar manualmente apps/web/.env.example → apps/web/.env.local (ignorado). Completar únicamente URL y **publishable** key del stack propio. No colocar claves en el ejemplo ni en chat. Vite usa apps/web como raíz/envDir predeterminado; no envDir raíz ni prefijo extra. El archivo raíz legacy fue eliminado; tampoco se necesita el slug env sin consumidor actual.

readSupabaseEnvironment valida lazy HTTPS (HTTP sólo loopback) y sb_publishable_, sin valores
en errores, antes del único cliente oficial 2.117.2. No sustituye RLS. Sin env, Carta muestra
error y cuentas no disponible; build no demuestra conectividad. Auth se habilita en 2E:
implicit, persistSession/autoRefreshToken/detectSessionInUrl=true, debug=false. SDK administra
storage/refresh/URL; bootstrap suscribe sessionStore antes de renderizar consumidores.

Toda variable VITE_ es pública y se incluye al compilar si se consume. Nunca poner contraseñas, tokens, refresh tokens, PAT, service_role ni secret key en apps/web, VITE_, config.toml, docs, fixtures o seeds. .env/.env.* están ignorados excepto .env.example; también estado .temp/.branches y archivos de claves/dumps. Los nombres no cubren cualquier fuga: revisar git diff y archivos staged antes de commit. No confiar únicamente en .gitignore o en regex de detección.

## Targets y migraciones

| Entorno | Uso | Reglas |
| --- | --- | --- |
| LOCAL | Desarrollo individual y pruebas destructivas aisladas | Docker; datos ficticios; sin cuenta hosted ni link remoto. |
| HOSTED DEV | Integración compartida posterior | Proyecto aparte propiedad del usuario; ref verificado antes de comandos; sin datos de clientes. |
| PILOT / PRODUCTION | Valhalla real posterior | Proyecto separado; respaldo/rollback, aprobación explícita y SMTP operativo; jamás reset/test destructivo. |

supabase/migrations es source of truth, no ediciones manuales irreproducibles en Studio. 2A tuvo
cero migraciones; 2B añade 20261002120000_sprint2_foundation.sql y seed DEV-ONLY. Tablas internas
gestionadas por Supabase no son nuestro modelo. No scripts remotos, db push/login/link/dumps.

## Reconstrucción y pruebas LOCAL — Task 2B

Usar un stack exclusivo de pruebas, sin identidades ni datos personales. Antes de reset confirmar:
cwd de este repo, project_id=canjeproyect, ausencia de .temp/project-ref, endpoints loopback
API54321/DB54322 y label Docker com.supabase.cli.project=canjeproyect. Consultar datos actuales;
si existen cambios útiles, usuarios o un target ambiguo, parar/preservarlos, no reset automático.
El comando siguiente **borra y reconstruye la DB LOCAL**; nunca añadir --linked/--db-url/--project-ref.

```bash
pnpm supabase:start
# SOLO después de verificar el target/datos locales y aprobar la pérdida de esos datos:
pnpm exec supabase db reset --local
pnpm supabase:test:db
pnpm supabase:test:smoke
pnpm supabase:test:authz
pnpm supabase:types:check
pnpm supabase:stop
```

Reset aplica migrations y seed automáticamente. stop normal conserva volúmenes; no --no-backup.
El seed solo Valhalla demo, cuatro categorías, cinco productos genéricos, cero identidades.
ON CONFLICT PK DO NOTHING permite repetir sin modificar filas existentes; NO es una herramienta
para reparar drift/edits ni importación de producción. Restauración canónica mediante reset aprobado.
Checksum lógico de supabase/scripts/seed-fingerprint.sql excluye timestamps DB nuevos del reset.

supabase:test:db invoca el pgTAP oficial `supabase test db --local`. CLI2.119 monta solamente
el directorio de tests: el wrapper resuelve el único include de fixtures/catalog.sql en una suite
temporal ignorada .temp/task-2c-pgtap-*, luego la retira. Las fuentes de test/fixture son únicas,
sin duplicación versionada. Cada SQL hace BEGIN→assertions→ROLLBACK, sin policies de prueba.
pgTAP puede descargar su imagen oficial pg_prove al primer uso. No requiere hosted.

supabase:test:smoke comprueba private GET/POST406 y catálogo público autorizado por 2C; repite seed,
verifica timestamps entre transacciones y crea un signup real efímero GoTrue. Contraseña
aleatoria solo en memoria y email ficticio example.test; no se muestran cuerpos, sesiones
ni keys. Limpia únicamente su identidad. Falla de forma segura si ya hay identidades.
Incluye fallo controlado de perfil mediante constraint transitoria en LOCAL; se retira en finally.
No ejecutar en paralelo con desarrollo/Auth o sobre datos que se quieren conservar. Si el proceso
es terminado abruptamente, inspeccionar constraint/identidad de test antes de continuar;
no asumir que finally se ejecutó. Reset local controlado puede restaurar este entorno ficticio.

El CLI pgTAP usa postgres sin permiso para SET ROLE supabase_auth_admin; no se cambia esa
relación para tests. Las pruebas SQL cubren estructura/atomicidad como owner; HTTP cubre
el contexto genuino GoTrue. Los resultados 2B no aprueban la matriz RLS de 2C/2G.

## Tipos SQL — fuente generada, no data access

```bash
pnpm supabase:types
pnpm supabase:types:check
```

Generación local `supabase gen types --local --lang typescript --schema public,private`.
Archivo versionado supabase/types/database.types.ts, separado de React/cards. CLI2.119 emite
TS sin formato: printer determinista del TypeScript ya instalado, sin nuevas dependencias.
No editar a mano. --check regenera en memoria y compara, tolerando CRLF; falla ante drift.
El tooling confirma config, ausencia de link, container label y endpoints antes de acceder.
Tipos private describen una estructura, no conceden acceso ni exponen el schema por REST.
CHECKs/ACL y precisión económica no se garantizan mediante tipos TS.

## Data API

Lista explícita api.schemas = ["public"] y extra_search_path = ["public", "extensions"]. private
creado en 2B, excluido de ambas; en 2C authenticated USAGE interno mínimo, nunca CREATE.
RLS en siete tablas, 24 policies/grants por columna;2C implementa helpers INVOKER. SQL interno y REST
Accept-Profile/Content-Profile private verificados con schema real→406. API expuesta no implica
tabla autorizada. Hosted comprobará su propia lista: config local no la sincroniza.

auto_expose_new_tables=false y REVOKE explícito de los objetos propios evitan grants heredados.
2B confirmó env efectivo public/public,extensions; repetir pruebas tras policies de 2C.
No confundir exit code0 de start/status con salud completa: comprobar servicios/endpoints
(el CLI puede reconocer un arranque parcial con solo DB).

## Auth por entorno (LOCAL implementado 2E; hosted pendiente)

- Local Site URL http://127.0.0.1:5173, puerto estricto. Redirects exactos /auth/callback y
  /auth/recovery bajo http://127.0.0.1:5173 y http://localhost:5173; sin wildcard/hosted.
  auth.email.enable_confirmations=true; TOTP enroll/verify=true en config.toml versionado.
  Cambios de config requieren stop/start normal conservando volúmenes; ningún reset ciego.
- Hosted dev: Site URL del frontend de integración acordado por usuario; redirects precisos para ese entorno. No agregar cualquier preview Vercel automáticamente.
- Piloto: dominio HTTPS aprobado y redirects exactos. No asumir que el deployment actual es ya producción.
- Correo local Mailpit captura mensajes, no entrega email productivo. SMTP propio, dominio/remitente verificados y pruebas de entrega/recovery antes del piloto. No configurar proveedor externo en 2A.
- ADR implicit cerrado en 2E para SPA browser-only sin SSR: soporte oficial y pruebas LOCAL
  GoTrue/SDK/Mailpit (URLs modeladas en Node, NO browser visual). PWA instalada/link en browser
  normal y otros dispositivos físicos siguen pendientes antes del piloto; sesión donde se abre el enlace,
  no prometer storage compartido entre app/browser. Si aparece SSR, reabrir ADR.

Validación humana LOCAL: iniciar stack, completar sólo URL/public key en apps/web/.env.local
si no se inyectaron en el proceso, y `pnpm --filter @canjeproyect/web dev --port 5173 --strictPort`.
Abrir /register → Mailpit http://127.0.0.1:54324 → confirmar → /profile → guardar nombre →
logout → login/reload. Recuperar desde /auth/forgot-password; cambiar contraseña con enlace.
TOTP desde /auth/mfa con app autenticadora; QR/secret son privados, no incluirlos en capturas.
En contextos limpios no copiar storage/tokens manualmente. Sólo cuentas ficticias locales.

`pnpm test:auth` unit/SSR/store; `pnpm test:auth:local` dos suites secuenciales reales.
Igual que backend/menu tests: guards target y cero identidades, seed lógico aprobado;
NO correr mientras una persona usa Auth ni sobre sus cuentas manuales. Nunca reset automático.
Fixtures task2e UUID; cleanup sólo sus usuarios/filas/sesiones/factores/correos exactos.
Expiry links: sent_at de usuario fixture; expiración cliente: clock de test, sin modificar JWT.
Fixtures legacy 2C/2G/2D ahora confirman correo real en Mailpit/GoTrue, no SQL auto-confirm ni
service_role en assertions. Smoke conserva prueba atómica del trigger y retira correo propio.

## Checklist Platform Admin (pruebas 2C realizadas; UI/recovery productivo pendientes)

1. TOTP local real 2C y UI LOCAL 2E aprobada por el usuario; diseñar recovery/runbook productivo
   privilegiado antes del piloto (sin bypass frontend).
2. Crear identidad Auth normal por canal controlado; sin cuenta personal en seeds ni roles en metadata.
3. Provisionar fila privada mediante runbook autorizado, no frontend. Confirmar schema fuera de Data API y negar escritura de aplicación.
4. Probar AAL1 deny/AAL2 allow para lectura global; customer/tenant admin sin elevación implícita.
5. Revocar fila y reutilizar mismo JWT AAL2: acceso global deny, membership local independiente conservada.
6. Antes de otorgar cualquier escritura global: auditoría append-only y aprobación nuevas. Recuperación MFA y acceso de emergencia documentados antes del piloto.

## Suite de autorización Task 2C — ejecución exclusiva LOCAL

`pnpm supabase:test:db`: ahora incluye 04_authorization_inventory.test.sql. 2B mantiene
todos sus tests de estructura/integridad/trigger/seed; sólo assertions históricas de cero
policies/grants se sustituyen por inventario esperado exhaustivo 2C. No generar inventario
esperado del estado actual. Se comparan USING/WITH CHECK exactos (sólo ignora whitespace),
roles/command/mode, ACL tabla/columna, funciones/EXECUTE/schema. SQL roles mínimo private;
prueba AAL real no se simula con request.jwt.claims en SQL.

`pnpm supabase:test:authz`: siete cuentas Auth ficticias efímeras, fixtures B/C y casos de
visibilidad. Signup/password/metadata, enrolment TOTP → challenge → verify real GoTrue →
JWT AAL2 real. Código inválido rechazado. Customer MFA sin platform no tiene autoridad.
Platform AAL1 no global. Mismos JWT al quitar membership/platform, sin refresh ni nuevo login.
Corrección 2C: mismo JWT en activo→inactivo→reactivado por setup privilegiado de fixtures,
Admin Valhalla/B y Admin Both en ambos tenants. READ propio continúa; menú/name/settings
writes denegados mientras inactivo; Admin Both conserva writes en otro negocio activo.
Reactivación app denegada por ACL; sólo canal privilegiado futuro, no endpoint nuevo.
Reset actual aplica 2B→2C→corrección 20261002140000→Storage 20261002150000→seed.
Scripts guardan config/link/labels/endpoints/cero identidades/objetos/tenant seed único;
authz y Storage esperan exactamente bucket menu-images tras 2G, ningún bucket ajeno.
no flags remotos/targets alternativos. Tests sólo con publishable key + JWT real. Owner SQL
sólo guards/setup/provision/revocación/cleanup. Estado posterior observado con JWT real,
incluyendo PATCH200/[] como denegación. No SDK/dependencias/Auth UI agregados.

No ejecutar suites simultáneamente ni con desarrollo/Auth activo. La suite limpia sólo emails
generados `task2c-<uuid>@example.test`, cascades de sus sesiones/factores/memberships/registry,
filas generadas y tenants B/C cuya ausencia verificó antes del setup. Restaura valores seed
originales, no timestamps: éstos siguen administrados por DB. Abrupt termination puede
dejar fixtures/usuarios: inspeccionar y preservar contenido útil antes de reset aprobado.
Nunca resetear automáticamente sobre identidades o datos ajenos.

Provisionamiento/revocación permanece canal privilegiado/manual: validar identidad/UUID/
business existente y decisión humana, INSERT/DELETE exacto de membership o fila private
en transacción. No SQL genérico recibido de frontend ni UI para elevar autoridad. Recovery
MFA, auditoría/control operativo y entorno hosted siguen gates futuros. Revocación sólo
siguientes requests, no datos descargados/queries ya iniciadas. Carta 2D filtros publicación
explícitos con sesión admin por OR de policies. Storage 2G con DELETE app DENY, CHECK path no ACL asset.

Fuentes: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[MFA](https://supabase.com/docs/guides/auth/auth-mfa),
[Auth REST client](https://github.com/supabase/auth-js/blob/master/src/GoTrueClient.ts),
[TOTP RFC6238](https://www.rfc-editor.org/rfc/rfc6238).

## Storage 2G — pruebas finales exclusivas LOCAL

A-S2-003 APPROVED: **PUBLIC bucket ≠ public administrative listing**. Configuración,
frontera implementada y límites en [SECURITY](SECURITY.md). A-S2-004 APPROVED/DEFERRED:
DELETE app DENY es el contrato correcto de Sprint 2, no gate abierto. Reemplazo nuevo UUID/
path y PATCH posterior; old asset orphan es deuda operacional aceptada, no leak/corrupción
por sí misma. Evidencia concurrente histórica en [walkthrough](TASK_2G_WALKTHROUGH.md).

Sobre stack ficticio verificado, sin Auth/dev concurrente, ejecutar secuencialmente:

```bash
pnpm supabase:test:db
pnpm supabase:test:authz
pnpm supabase:test:storage
pnpm supabase:test:smoke
pnpm supabase:types:check
```

Inventario esperado 05_storage_inventory.test.sql (65 assertions) no deriva de policies vivas.
Suite Storage: siete Auth reales, JWT/MFA, A/B/Both, límite exacto, metadata binaria/multipart,
rechazos + bytes/estado posterior, cross-service y same-JWT. Guard adicional cero objetos,
exactamente menu-images y seed original. Credencial server-only encapsulada únicamente para
crear/retirar bucket privado de fixture y limpiar objetos propios, nunca para assertions.
SQL owner sólo setup/provision/revocación/cleanup y comprobación estructural del guard.

`pnpm supabase:test:storage:orphan-probe` se conserva como diagnóstico histórico **opcional**,
fuera de DoD/suites finales. No es necesario reejecutarlo al cerrar A-S2-004. **NO implementación
ni comportamiento esperado de DELETE**: instala temporalmente
una policy acotada a un único objeto ficticio, muestra carrera con DELETE API real mientras
PATCH image_path real confirma referencia y retira policy/fixtures en finally. PASS de esa
suite significa reproducción del fallo, NO garantía segura. Exige cero identidades/objetos,
tres policies originales y ausencia de su policy reservada. No ejecutar en otro entorno o
simultáneamente con desarrollo. Tras terminación abrupta, inspeccionar policy
task2g_orphan_probe, fixtures y locks antes de continuar; no promoverla a migration.

Reset --local autorizado reconstruyó cuatro migrations/seed y cero metadatos Storage.
**NO limpia archivos físicos del volumen**: un canary propio de 68 bytes persistió tras
reset aunque GET público ya no encontraba su metadata (HTTP400). Se verificó y retiró
únicamente ese archivo/version exacto de diagnóstico, sin borrado recursivo ni datos ajenos.
Esto NO es un procedimiento de cleanup app ni autorización para tocar payloads de usuario.
Limpiar fixtures vía Storage API antes de resets evita ese artefacto. No borrar filas SQL
de storage.objects, no desactivar triggers gestionados ni hacer prune de volúmenes.

Final de pruebas: cero users/profiles/memberships/platform/objetos/payloads de fixture,
menu-images permanece y catálogo demo intacto; stop normal conserva volúmenes. No iniciar
2D sin nuevo pedido. No automatizar reset de datos útiles. A-S2-005 futura: diseñar GC antes
de cleanup productivo significativo, con concurrencia, gracia, revalidación, auditoría y fallos
DB/Storage; no diseñarlo/implementarlo ahora ni agregar cleanup automático.

## Carta pública LOCAL — Task 2D

1. Iniciar Docker/Supabase propio con `pnpm supabase:start`, verificar target LOCAL y catálogo.
2. Completar sólo VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY del stack propio en apps/web/.env.local ignorado. No pegar salida completa de status: incluye secretos. Preservar env útil existente; no hosted.
3. `pnpm dev`; para puerto estricto usar `pnpm --filter @canjeproyect/web dev --port 5173 --strictPort`. Carta necesita backend online. Otros skeletons siguen demo; seed LOCAL también ficticio pero viene de DB, no del módulo mock.
4. `pnpm test:menu`: query/mapper/formatter/componentes reales mediante loader TypeScript de test y SSR, sin browser ni nueva librería de tests. Node baseline existente, sin cambiar engines.
5. Sin desarrollo/Auth concurrente ejecutar `pnpm test:menu:local`. Guard config/link/Docker/endpoints + checksum seed aprobado + cero Auth users; si hay datos útiles, STOP/preservar, no reset automático. Cinco identidades efímeras, MFA real, tenant B/categoría vacía/PNG propios. Assertions con cliente oficial public-key + JWT real. SQL owner sólo setup/snapshot/restauración; credencial server-only fixture sólo limpia objeto propio vía Storage API, nunca assertions/frontend.
6. Mutaciones/restauración de nombre/precio, visibilidad item/category/business, availability, orden, settings, image_path. Checksum lógico original al final, timestamps DB-owned. Restituir referencias antes de borrar PNG propio por canal DEV privilegiado; no DELETE app. Cero fixtures al final. Si proceso aborta, inspeccionar antes de repetir/reset autorizado.
7. 2D aprobada visualmente por el usuario. SSR/API no equivalen a capturas, foco, sticky, CLS u onError browser ni certifican individualmente checks no declarados. No eludir políticas ni sustituir LOCAL por Vercel. Checklist adicional en walkthrough 2H.
8. `pnpm supabase:stop` normal al terminar; conservar volúmenes, no prune/--no-backup. Datos privados/economía/hosted fuera de scope.

Source of truth de Carta: negocio/categorías/items activos explícitos incluso con JWT admin/platform, settings reales, mapper y contratos. Categorías vacías ocultas; negocio ausente/inactivo distinto de menú sin publicaciones. Preview floor sólo presentación. image_path → getPublicUrl de menu-images sin listing/metadata/signed URL; null/broken → vaso neutral, no mock. API no cacheada por PWA; shell estático anterior intacto.

Fuentes oficiales 03/10/2026: [cliente](https://supabase.com/docs/reference/javascript/initializing), [joins tipados](https://supabase.com/docs/guides/database/joins-and-nesting), [order](https://supabase.com/docs/reference/javascript/order), [URL pública](https://supabase.com/docs/reference/javascript/storage-from-getpublicurl).

## Admin Carta 2F LOCAL y revisión humana

`pnpm test:admin` unitarios/store/SSR; `pnpm test:admin:local` integración real con GoTrue,
PostgREST, SDK File upload, same-JWT y cleanup exacto. Suites exclusivas y secuenciales,
guard seed sin cambios/usuarios/objetos humanos; si falla, preservar datos y STOP, no reset.
Vite/Supabase quedan activos para revisión humana al finalizar. Browser Use sigue bloqueado;
no eludirlo ni afirmar PASS visual por SSR/SDK. App http://127.0.0.1:5173; correo 54324.

No se crean cuentas Business Admin/Platform persistentes. Para probar customer, registrar una
cuenta ficticia y confirmar en Mailpit; /admin debe mostrar Sin acceso. Para probar Admin,
usar Studio LOCAL (http://127.0.0.1:54323), verificar target y UUID de esa cuenta registrada,
y provisionar únicamente su membership en Valhalla por el canal privilegiado manual:

```sql
-- Ejemplo manual: reemplazar sólo por el UUID de la cuenta ficticia LOCAL elegida.
insert into public.business_memberships(user_id, business_id, role)
select '<UUID_CUENTA_LOCAL>'::uuid, id, 'admin'
from public.businesses where slug = 'valhalla-space';
```

No ejecutar con placeholder, UUID personal ajeno ni contra hosted. No otorgar Platform.
Volver a la app → refocus/actualizar permisos → /admin/categories y /admin/products.
Crear/editar/agotado/destacado/inactivo/orden/precio 6500,50/imagen real; revisar Carta después.
El catálogo humano de prueba ya no tendrá fingerprint seed: NO ejecutar suites exclusivas ni
resetearlo automáticamente. Revocar membership propia exacta sólo si el usuario desea probar
revocación; la siguiente refetch/request retira acceso con el mismo JWT.

**A-S2-006 APPROVED:** RPC `is_current_user_platform_admin()` sin parámetros, boolean self
sin AAL, INVOKER; sólo authenticated. private REST sigue 406 y las RLS globales requieren
fila vigente+AAL2. Nueva migration forward-only aplicada con `supabase migration up --local`,
sin reset ni editar historia. `/platform` mínimo read-only; true+AAL1 pide /auth/mfa, luego
enlace fijo para volver. Regresiones se ejecutan sólo antes de introducir datos humanos.
Google OAuth futuro opcional no blocker. 2F COMPLETADA/APROBADA por el usuario en prompt 2H;
2H autoriza QA local, no hosted ni nuevas herramientas de provisioning.

Revisión Platform opcional por el usuario: sólo en Studio LOCAL, para la cuenta ficticia
que **él elija**. No usar UUID ajeno/hosted ni ejecutar placeholder:

```sql
-- Fixture manual exclusiva LOCAL, elegida por el usuario. No app provisioning.
insert into private.platform_admins(user_id) values ('<UUID_CUENTA_LOCAL>'::uuid);
```

No cuentas Platform persistentes creadas por el agente. Comprobar /platform AAL1 → MFA,
configurar/verificar TOTP sin compartir QR/clave/código, regresar a Platform → lista read-only.
Customer AAL2 sigue Sin acceso. Si el usuario decide probar revocación, retirar sólo esa
fila fixture con Studio; sin logout/refresh, actualizar permisos debe quitar acceso. Reañadir
la misma fila y volver a comprobar restaura capability. No edición global, exports ni soporte.

## Hosted: pendiente, sin acción automática

Sprint 2 se cierra exclusivamente LOCAL; no hace falta crear hosted para su DoD. Una tarea
posterior deberá autorizar organización/proyecto, región/plan/billing y guardar password de DB
privadamente. Luego registrar ref no secreto verificado y configurar API/Auth/SMTP del target.
Public URL/publishable key van en configuración de deployment; nunca secretos en chat.
No se hizo login/link ni se usaron cuentas del usuario. Checklist en SPRINT_2_CLOSEOUT.md.

## Fuentes oficiales revisadas el 02/10/2026

- [CLI: dependencia de proyecto fijada y runtime Docker](https://supabase.com/docs/guides/local-development/cli/getting-started).
- [Publishable vs secret keys](https://supabase.com/docs/guides/getting-started/api-keys).
- [Referencia de config local: schemas, Auth y correo](https://supabase.com/docs/guides/local-development/cli/config). El template real de la versión fijada prevalece sobre ejemplos de otras versiones.
- [Vite: envDir, prefijo público y modos](https://vite.dev/guide/env-and-mode).
- [Supabase: pruebas locales pgTAP](https://supabase.com/docs/guides/local-development/testing/overview).
- [pgTAP: assertions y sobrecargas](https://pgtap.org/documentation.html).
