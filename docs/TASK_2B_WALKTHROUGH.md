# Task 2B — Database Schema, Migrations & Development Seed

Fecha: 02/10/2026. **TASK 2B COMPLETADA exclusivamente LOCAL.** PostgreSQL real17.11,
CLI fijado2.119.0, Docker operativo. Stack detenido al finalizar; volúmenes DB/Storage conservados.
Sin commit/push/deployment. No avanzar automáticamente a 2C.

## 1. Executive summary

Una migración aditiva/atómica crea exactamente seis tablas public y private.platform_admins.
Integridad económica estructural y multi-business, timestamps/triggers mínimos, seed demo,
fixtures y tipos SQL generados. Todas nacen con RLS enabled y grants de aplicación retirados:
**no autorización funcional aún**. Carta/cards/mocks/assets/PWA intactos respecto al inicio 2B.
El mínimo Node se alineó >=22.13 sin actualizar dependencias mayores.

Antes de modificar se leyeron README y todos los documentos docs, config/seed/readmes/test
placeholders, contratos/mocks/presentación de menú y decisiones V2. No AGENTS.md aplicable.
Preflight local: 0 tablas de aplicación, 0 private schema, 0 Auth users y 0 buckets.
No hubo decisión V2 imposible ni necesidad de cuenta/secreto hosted o rediseño.

## 2. Migración creada

`supabase/migrations/20261002120000_sprint2_foundation.sql`.
BEGIN→schema/tables/constraints/RLS/revokes/triggers→COMMIT. Registro local de migración:
20261002120000. No DROP, migración económica, políticas parciales ni backfill de usuarios.
Los dos reset **locales** estaban autorizados por el prompt y se comprobaron antes de ejecutarse.

## 3–4. Esquema final real / tabla por tabla

| Tabla | Contrato real |
| --- | --- |
| public.businesses | UUID generado, slug canónico UNIQUE global, nombre/moneda ARS/zona/estado y timestamps. |
| public.profiles | PK/FK Auth, display_name nullable y timestamps; no email/rol/tenant/saldo/avatar. |
| public.business_memberships | PK business_id,user_id; role text solo admin; created_at; sin id extra/estado/updated_at. |
| public.loyalty_settings | PK/FK business_id; divisor numeric(14,2)=1000 y flag=true; timestamps. |
| public.menu_categories | UUID generado, negocio/nombre/slug/orden/activo/timestamps; dos UNIQUE por negocio. |
| public.menu_items | UUID generado, negocio/categoría/nombre/descripción/precio/imagen/presentación/flags/orden/timestamps. Sin default precio ni UNIQUE nombre. |
| private.platform_admins | Solo user_id PK/FK auth.users + created_at. Vacía; RLS enabled y no expuesta por REST. |

Owner de las siete: postgres. Campos, nulabilidad, defaults, límites e invariantes completos en
[DATABASE](DATABASE.md); el inventario pgTAP comprueba que no existen campos extra.

## 5. Constraints

Siete PK; tres UNIQUE adicionales (businesses.slug, categories.business_id+slug,
categories.business_id+id); ocho FK; **17 CHECKs nativos nombrados**.
No enum PostgreSQL. Role admin solamente, presentation photo/cutout, orden >=0,
ARS únicamente, slugs ASCII lowercase completos y límites textuales explícitos.
Nombres/display_name/alt no vacíos si presentes; descripción nullable máx.2000.
UUID/defaults y timestamps DB-side comprobados; precio sin default0.
timezone requerida, pero sin lookup dinámico de IANA: validación de zona en provisionamiento futuro.

## 6. FK / delete behavior

Todas ON UPDATE RESTRICT. ON DELETE CASCADE exclusivamente identidad:
profiles→auth.users, memberships→profiles y platform_admins→auth.users.
ON DELETE RESTRICT: memberships/settings/categories/items→businesses y FK compuesta
items→categories. Eliminar una identidad no elimina catálogo/negocio. Membership puede
revocarse físicamente por canal privilegiado. Borrado de negocio/categoría con dependencias
falló23503 y las filas siguieron existiendo. Los tests verifican endpoints/columnas y acciones
de las ocho FK, no solo presencia de alguna FK.

## 7. Índices

Tres explícitos:

- business_memberships_user_business_idx (user_id,business_id).
- menu_categories_business_order_idx (business_id,display_order,id).
- menu_items_business_category_order_idx (business_id,category_id,display_order,id).

Siete índices PK y tres UNIQUE implícitos, sin duplicar índices ni anticipar ledger.
Orden real de columnas de índices estructurales comprobado contra pg_catalog.

## 8. Trigger profile

AFTER INSERT auth.users→private.create_profile_for_auth_user(): únicamente INSERT profile(id)
y RETURN NEW. SECURITY DEFINER/owner postgres/search_path vacío/SQL estático calificado.
Sin params, metadata, email, rol/tenant, calls ni manejo que oculte errores. EXECUTE revocado
a PUBLIC/anon/authenticated/service_role/supabase_auth_admin; ningún grant Auth añadido.

Signup real HTTP GoTrue200→1 profile con display_name NULL. Metadata falsa role/admin/name/
business no generó autoridad ni nombre. Un CHECK transitorio provocado hizo signup500;
0 cuentas/perfiles parciales. Finally retiró constraint y eliminó solo identidad ficticia propia.
Pruebas SQL adicionales cubren la atomicidad/cascadas dentro de ROLLBACK.

## 9. Trigger updated_at

private.set_updated_at(): INVOKER/search_path vacío/owner postgres, BEFORE UPDATE en las
cinco tablas mutables, asigna pg_catalog.now(). Función no invocable directamente por roles app.
Comprobado contra valor antiguo y valor propuesto1900; una prueba entre transacciones
verifica que updated_at aumenta y created_at no cambia. now() permanece transaccional;
no se afirma que avance por cada statement de una misma transacción.
Default created_at no es restricción ACL: 2C debe limitar columnas de escritura.

## 10. CHECK image_path — PASS

Constraint menu_items_image_path_check: NULL o longitud77/78, prefijo exacto business_id::text,
asset UUID canónico lowercase, un slash/extensión allowlist. Regex PG17 ARE con \A/\Z y C.
Sin función custom, Storage lookup/FK ni cast de path. No garantiza existencia de imagen.

NULL y las cinco extensiones jpg/jpeg/png/webp/avif→OK. Tenant B, URL, uppercase de
business o asset (UUID con letras reales), ../, slash extra, subdirectorio, query, fragment,
newline final, whitespace, gif, doble extensión, extensión uppercase, vacío y UUID sin
guiones→23514 de la constraint nombrada. La última imagen válida permaneció intacta.
Pruebas ejecutadas como owner, independientes de RLS.

## 11. Integridad cross-business — PASS

La FK (business_id,category_id)→categories(business_id,id) impidió vincular un item Valhalla
a la categoría Business B (23503), incluso con privilegios owner. Estado original conservado.
No se simuló autorización RLS de Admin Both: esa matriz se probará en 2C/2G; esta propiedad
es estructural y no depende de si el actor administra uno o ambos negocios.

## 12. Money/numeric

numeric(14,2), unidades mayores ARS, máximo999999999999.99. Precio >=0/divisor >0,
CHECK explícito contra NaN/Infinity/-Infinity. Comprobación previa mostró NaN>=0 true.
Tipo rechaza infinity/overflow22003; CHECK rechaza NaN/negativo/cero divisor23514.
Precio0 explícito permitido; no precio omitido gratuito. Extremos válidos/min0.01 probados.
Más de dos decimales se redondean por el tipo (6000.005→6000.01), documentado sin añadir
regla económica. Prompt2B reafirma la anterior P-S2-001→D-029.
No Math.floor económico nuevo, puntos persistidos ni lógica de ledger/canje.

## 13. Seed

DEV-ONLY LOCAL, no carta real/piloto. UUID Valhalla a11a0000-0000-4000-8000-000000000001,
slug valhalla-space, name Valhalla Space, ARS, America/Argentina/Buenos_Aires, regla1000 true.
Cuatro categorías iguales a las actuales. Cinco productos genéricos con descripción DEMO:
cerveza, agotado, trago featured, vino, sin alcohol. Todos sin image_path, ningún bucket inventado.
Incluye precio6500.50 para ejercitar decimales; no se usa en la Carta mock actual.

Auditoría de contenido: mock Budweiser dice lata473ml con imagen de botella; borrador propone
botella1L. Fernet mock8500 vs borrador10000, tamaño sin confirmar/imagen de ingrediente.
Ambas fuentes siguen sin aprobación comercial: no se eligió una versión como verdad productiva.
Seed no copia esas marcas/precios; la Carta y VALHALLA_CONTENT_DRAFT se preservaron.
ON CONFLICT PK DO NOTHING permite repetir sin overwrite ni cambiar timestamps.
Cero usuarios/emails personales/memberships/platform authority/Business B en seed normal.

## 14. Fixtures / setup

fixtures/catalog.sql: B, negocio inactivo, categoría inactiva, producto inactivo, agotado e
imageless; únicamente dentro de tests rollback. Config no referencia fixtures.
fixtures/identities.json: Customer A/B, Admin Valhalla/B/Both como labels y relaciones
previstas, no cuentas/passwords/JWT/UUID personales. Setup Auth de esos actores se ejecutará
en 2C/2G mediante tooling local, conservando IDs/tokens en memoria y limpiando solo sus cuentas.
2B ya demuestra signup genuino con password aleatoria efímera y dirección example.test.

## 15. Pruebas finales

| Validación | Resultado |
| --- | --- |
| pgTAP, 3 archivos | **246/246 PASS** después de cada reconstrucción y en pasada final. |
| Smoke LOCAL HTTP/DB | **5 escenarios PASS**, Node reporta6 tests contando el contenedor. |
| Tipos generados, regeneración/drift | PASS, cero diferencias. |
| Compilación TS aislada de database.types.ts | PASS con strict/noEmit. |
| Syntax check de tooling .mjs | PASS. |
| Tests env frontend heredados | **6/6 PASS**. |

Smoke: private GET/POST406, catálogo401; seed repetible/timestamps sin overwrite;
UPDATE timestamps separado; signup real/minimalidad; fallo signup atómico y limpieza.
Inspección final: 7 RLS=true, 0 policies, 0 Auth/profile/membership/platform rows, 0 buckets,
0 constraints de fallo, 0 tablas económicas futuras; únicamente las dos funciones trigger privadas.
API root/Auth health200; nueve servicios locales operativos antes del stop.
No aprobación de matriz RLS, MFA, sesión frontend ni producción.

## 16. Reset / rebuild

Antes del primer reset: target canjeproyect confirmado por config/container label, sin link
hosted ni datos propios previos (0 tablas/usuarios/buckets). Comando explícito db reset --local.
Antes del segundo: label/sin link, 0 users y checksum del único seed demo conocido.
No --linked, --db-url ni --project-ref en operaciones destructivas.

Dos resets exit0 reconstruyeron schema+migration+seed. Checksum lógico ambos y final:
`5bc80b32792095fb6cf02694de9626a1`, leído con scripts/seed-fingerprint.sql (excluye timestamps).
Primera reconstrucción: pgTAP246 + smoke4 escenarios. Segunda/final: pgTAP246 + smoke5
tras añadir prueba timestamps entre transacciones. No datos reales eliminados.
Stop final exit0 sin --no-backup; **ningún contenedor canjeproyect corriendo**.
Volúmenes supabase_db_canjeproyect y supabase_storage_canjeproyect conservados.
Logs temporales propios de start/reset/stop retirados por posible contenido de claves locales;
cache de pnpm/imágenes Docker permanecen, sin prune ni eliminación de archivos del usuario.

## 17. Private / Data API

Schema private real, owner postgres. No USAGE/CREATE app ni grants de tabla/función.
Config no cambió: api.schemas public, extra_search_path public/extensions,
auto_expose_new_tables=false. Env PostgREST efectivo idéntico verificado.
GET Accept-Profile private406 y POST Content-Profile private406 con publishable key en
memoria; clave/cuerpos/JWT no mostrados. Catálogo público401 intencional hasta grants2C.
Privilegios internos mínimos para authenticated de V2 son futuros; no exposición REST.

## 18. Tipos generados

supabase/types/database.types.ts, schemas public/private de DB local ya migrada.
No edición manual: CLI stdout→printer TypeScript instalado→archivo versionable.
CLI2.119 emite sin formato, no se instaló formatter nuevo. Scripts types/types:check con
target guard; --check regenera en memoria/compara tolerando CRLF. Zero drift tras segundo reset.
Sin cliente/data access ni tipos SQL dentro de cards. Numeric→number y CHECKs→text son
contratos de transporte, no exactitud económica, unions de negocio o autorización.

## 19. Frontend / herramientas

pnpm lint PASS cero warnings; pnpm typecheck PASS; pnpm build PASS (74 módulos,
PWA14 entradas), tests env6 PASS. Sin cambio de archivos de Carta/cards/assets/layout/PWA.
Node real24.16.0; mínimo22.13 coherente con pnpm11.19.0. No upgrade mayor ni deps nuevas 2B.
Primera ejecución build en sandbox falló por lectura de directorios de esbuild; repetición
autorizada fuera del sandbox PASS, sin cambiar configuración/permisos del sistema.

## 20. Documentación sincronizada

DATABASE (schema real completo); ARCHITECTURE; SECURITY; DECISIONS D-029/D-030;
SUPABASE_WORKFLOW (reset local explícito/tests/tipos/guards); ROADMAP (estado y gate2C);
SPRINT_2_ARCHITECTURE (implementado vs pendiente); PROJECT_BLUEPRINT; README raíz y
supabase/readmes de tests/fixtures. TASK_2A conserva evidencia histórica con enlace a 2B.
UI_GUIDE y VALHALLA_CONTENT_DRAFT intactos. No marcado de RLS funcional como implementado.

## 21. Warnings / incidencias reales

- Primera suite falló por sobrecargas pgTAP sin description (seleccionaba otra firma), fixture
  hermana no montada por CLI2.119 y SET ROLE supabase_auth_admin no permitido al runner.
  Se corrigieron assertions y wrapper de include; se probó Auth mediante HTTP genuino, **sin
  conceder roles/permisos extra**. No era contradicción del modelo/triggers. No se presenta esa
  corrida fallida como PASS. Primera generación también rechazó correctamente formato con
  nombre de tabla quoted; se ajustó parser/printer y se regeneró, sin editar tipos a mano.
- Smoke falla si hay identidades; requiere stack de test exclusivo. Failure injection es una
  constraint transitoria, no migración. Terminación abrupta puede impedir finally: inspeccionar
  y recuperar LOCAL controladamente antes de usar Auth. No correr con actividad simultánea.
- Docker publica puertos0.0.0.0/[::]: red confiable/datos ficticios; stop al terminar. No firewall
  ni permisos cambiados. No readiness producción, SMTP, MFA o PWA/Auth aprobado.
- Defaults no sustituyen grants de columnas. No Storage lookup ni garantia de asset.
  Seed no-op no repara divergencias; catálogo demo no real. Formatter Carta actual usa enteros:
  futura adaptación2D debe tratar decimales explícitamente.
- Auditoría textual/diff no equivale a certificación automática de todo historial Git.
  Diferencias previas de Task2A permanecen sin commit; no se atribuyen todas a2B.

## 22. Diff / revisión

Nuevos 2B: migración, fixtures catalog/identities, tres SQL tests, smoke.mjs, cuatro archivos
scripts (runtime/test/types/fingerprint), tipos generados y este walkthrough.
Modificados 2B: package.json (Node/scripts), README raíz, seed y README Supabase/tests/fixtures,
y documentación listada arriba. No cambios de dependencias/lockfile, config Supabase, aplicación
visual ni env respecto al inicio 2B. Las modificaciones de lockfile/env/frontend ya eran de2A.
No se borró trabajo útil ni se hicieron git add/commit/push. git diff --check limpio salvo avisos
informativos LF→CRLF de Windows. Archivos nuevos aún untracked: deben incluirse en revisión;
git diff --stat por sí solo no los muestra. Revisar sin aplicar/stage automático.

## 23. Límites confirmados

**NO** policies completas/parciales funcionales; **NO** helpers de autorización; **NO** grants
de aplicación finales; **NO** hosted/login/link; **NO** bucket Storage/uploads; **NO** cuenta
platform real/MFA; **NO** cliente Supabase/Auth frontend/data access/Carta DB/admin UI;
**NO** operaciones económicas/ledger/rewards/vouchers/QR. NO Vercel/commit/push.
Auth signup efímero fue solamente prueba del trigger backend local, no implementación de2E.

## 24. Recomendación exacta para Task 2C

Siguiente prompt propuesto (requiere aprobación nueva):

> Comenzá Task 2C exclusivamente LOCAL sobre el esquema validado de Task 2B y Architecture V2.
> Leé docs/migrations/tests y definí la matriz de policies/grants por tabla, operación y columnas
> antes de aplicarla. Implementá helpers STABLE SECURITY INVOKER/search_path vacío con SQL
> calificado y autoridad actual DB: business membership, private.platform_admins self-row directa
> sin recursión y MFA/AAL2 en cada acceso global. No confiar en metadata/JWT claims ni orden de
> evaluación SQL. Habilitá solo los grants explícitos mínimos; private nunca REST/search_path,
> sin escritura app de platform_admins ni escrituras globales. Restringí IDs/tenant/timestamps y
> hard-delete. Conservá FK compuesta/CHECKs/triggers, probá allow/deny y revocación DB usando
> identidades/JWT locales reales; no declares 2G completo sin su matriz. No hosted, Storage bucket,
> cliente/Auth frontend ni operaciones económicas. No commit/push ni avance automático a otra Task.

Después de2C: gate2G aislamiento/autorización/AAL/revocación; recién luego2D lectura/adaptadores.
Las decisiones abiertas de Auth definitivo/provisionamiento/retención/economía siguen abiertas.

Fuentes técnicas consultadas: [PG17 numeric](https://www.postgresql.org/docs/17/datatype-numeric.html),
[PG17 regex](https://www.postgresql.org/docs/17/functions-matching.html),
[Supabase trigger de perfil](https://supabase.com/docs/guides/auth/managing-user-data),
[Supabase pgTAP](https://supabase.com/docs/guides/local-development/testing/overview),
[pgTAP assertions](https://pgtap.org/documentation.html). Resultados anteriores son mediciones
del entorno local de esta tarea, no inferencias basadas solamente en documentación.
