# Task 2G — Storage Menu Images & Tenant Authorization

Fecha: 02/10/2026. Exclusivamente LOCAL.
**TASK 2G COMPLETADA/CERRADA LOCAL — APROBABLE CON DOD DEFINITIVO EN PASS.**
A-S2-004 APPROVED/DEFERRED por instrucción del usuario; ningún STOP vigente de Task 2G.
DELETE app DENY es comportamiento correcto de Sprint 2. No avanzar automáticamente a 2D.
A-S2-003 **APPROVED** por instrucción explícita del usuario; STOP anterior por metadata resuelto.

## 1. Executive summary

Se retomó la auditoría previa con el contrato público aprobado. Se creó una nueva migration
forward-only reproducible para menu-images y su frontera de listado/upload. Sin alterar las
tres migrations aprobadas, frontend, Auth UI, hosted o economía. Docker Desktop arrancado
oculto; CLI2.119.0, PostgreSQL17.11 y Storage API v1.79.28, nueve servicios locales.
README/docs, migrations/config/tests y tablas/ACL/helpers reales revisados antes de implementar.

**PUBLIC bucket ≠ public administrative listing.** Archivo, información técnica y cualquier
custom/user metadata de path conocido son públicos. UUID/path no es confidencialidad.
Listado/gestión siguen bajo RLS; uploads de app sólo custom metadata NULL/{}.

Core validado: 5 MiB/MIME, paths canónicos, uploads nuevos de tenant activo, metadata propia
incluso inactivo, Platform DB+AAL2 global sólo menu-images, no global writes, no overwrite/
re-home, revocación same-JWT y cross-service image_path. Full reset y regresiones PASS.

Hallazgo específico: DELETE con NOT EXISTS pasó casos secuenciales pero falló concurrencia
real REST/JWT. Una referencia de menú confirmada mientras DELETE esperaba quedó apuntando
a un archivo eliminado. Candidato temporal retirado; migration final **sin DELETE policy**.
El usuario aprobó A-S2-004: diferir DELETE app más allá de Sprint 2. Orphans aceptados como
deuda operacional, no leak/corrupción por sí mismos. No lifecycle ni cleanup automático ahora.
Se actualizó DoD y reejecutó reset/regresiones finales, todas PASS; cierre formal solicitado.

## 2. Migration creada

supabase/migrations/20261002150000_sprint2_storage.sql, BEGIN/COMMIT, sólo INSERT bucket
y tres CREATE POLICY storage.objects. Sin fixtures, helper nuevo, grants, trigger o DEFINER.
Sin cambios en este cierre: misma migration aplicada, SHA protegido antes/después. Comentario
histórico de STOP conservado, supersedido por A-S2-004 y acceptance/documentación actuales.
Migraciones originales protegidas e intactas byte a byte:

| Migración | SHA256 |
| --- | --- |
| 20261002120000_sprint2_foundation.sql | 66D1E13EBAF032050AC62C584187465FB6365791DEF4344794AD8DED14523103 |
| 20261002130000_sprint2_authorization.sql | 479144A2F47959B9DE7663BD42B7B03D5612439EC03395A9888322B8C3BE5EC3 |
| 20261002140000_sprint2_active_business_menu_writes.sql | 7503E887509313943590165848A5B2633290D531C646292BD6CAC595BEE8BE79 |

## 3. Bucket final

menu-images, id=name, PUBLIC=true, file_size_limit=5.242.880 bytes, allowlist exacta
image/jpeg, image/png, image/webp, image/avif. Creación SQL oficial, no click Studio.
Bucket STANDARD con versioning DISABLED, defaults gestionados inventariados. Una sola
fila final, cero objetos/fixtures/identidades. No policies administrativas de storage.buckets.

## 4. Public/private semantics

Contrato A-S2-003 actualizado de OPEN a APPROVED en DECISIONS. Conocer un path permite
descargar archivo y consultar información pública, aunque anon/customer no puedan listar.
Todo filename/path/metadata debe ser no confidencial; no datos funcionales, privados o de
autorización. El flujo app deja custom metadata vacía y no la usa como autoridad.

Evidencia histórica del STOP: sin policies SELECT, la fixture pública devolvió HTTP200 en
GET object/info/public con marcador user_metadata ficticio; listado anon/customer HTTP200[].
El código de la imagen instalada usa asSuperUser para info pública y expone user_metadata.
Ese resultado no se ocultó ni se modificó el servicio: el usuario aprobó su semántica.
La suite final vuelve a comprobar info pública con anon/customer y descarga exacta sin API
key/JWT. El listado es administrativo, no mecanismo para obtener imágenes de la Carta.
Revocación de membership no revoca URLs públicas ni elimina copias descargadas/cacheadas.

## 5. Size/MIME rules

5 MiB exactos aceptados; 5 MiB + 1 rechazados y sin objeto/payload público nuevo. Cada par
jpg/jpeg→image/jpeg, png→image/png, webp→image/webp, avif→image/avif aceptado. Bucket aplica
allowlist y INSERT exige metadata.mimetype coherente con storage.extension(name).
SVG/GIF/EXE, MIME text/plain y extensión/MIME inconsistente rechazados con estado intacto.

**Sólo MIME declarado + extensión, no validación del contenido.** La prueba usa el mismo PNG
mínimo bajo los otros MIME declarados y confirma que Storage no detecta esa discordancia
de bytes. No afirmar JPEG/AVIF decodificados, antivirus, resize, thumbnails o procesamiento.
Futuras mejoras de contenido necesitan diseño separado; no autorizadas en 2G.

## 6. Policies Storage

Tres PERMISSIVE, TO authenticated, ninguna FOR ALL:

| Policy | Operación | Condición efectiva |
| --- | --- | --- |
| menu_images_business_read | SELECT | Bucket exacto + name canónico + membership admin actual del namespace; sin is_active |
| menu_images_platform_read | SELECT | Sólo menu-images + fila private actual + JWT AAL2 |
| menu_images_business_insert | INSERT | Sólo menu-images + operación nativa object.upload + name canónico + membership actual + business activo + metadata vacía + MIME/extensión |

No policy UPDATE/DELETE ni anon/buckets. Public download/info no necesita SELECT RLS,
intencional según contrato. Metadata listing HTTP200[] significa sin filas autorizadas,
no listado libre. Operador global sin membership no obtiene ninguna escritura.

## 7. Grants

Ningún grant nuevo. ACL gestionada preservada: anon/authenticated SELECT/INSERT/UPDATE/
DELETE efectivos en buckets/objects, service_role privilegios gestionados. ACL no significa
operación permitida: RLS decide. Inventario pgTAP comprueba grantees/grant options, owner,
RLS y triggers de protección DELETE originales sin desactivarlos ni alterar internals.
Helpers 2C INVOKER intactos; sin nuevo SECURITY DEFINER ni RPC pública genérica.
Data API sigue schemas=[public], extra_search_path=[public,extensions]; private/storage
fuera de exposición. GET/POST private 406 regresión; petición Data API storage 406 comprobada.

## 8. Path authorization

Modelo exacto business_uuid/asset_uuid.ext, extensiones jpg/jpeg/png/webp/avif lowercase,
un slash, longitud77/78 y regex ARE completa con collation C. Native storage.foldername(name)[1]
contra business.id::text; helper original sólo membership. Sin cast frágil de input, owner,
metadata.business_id, nombre original o JWT claims custom como autoridad.

Name real del objeto es lo validado. URL completa, query, fragment, traversal/subdirs,
UUID/ext uppercase, filename libre, vacío y tenant desconocido rechazados. Matriz de paths
del CHECK DB original conserva su cobertura independiente.
**Matiz medido:** transporte A//asset.png normaliza a A/asset.png en el gateway; el upload
puede funcionar con el nombre almacenado canónico. No se guardó name con doble slash ni se
debilitó regex. Namespace B normalizado sigue denegado para Admin A. No prometer rechazo
literal de todo string HTTP antes de la normalización gestionada.

## 9. Business inactive behavior

Admin A/B y Admin Both en cada tenant: mismo JWT, active→inactive→reactivación privilegiada
de fixtures. Metadata propia continúa visible; upload/UPDATE/DELETE no cambian objetos en
inactivo. Both conserva upload en otro tenant activo. is_active explícito en INSERT,
no agregado al helper. No capacidad app para reactivar businesses; regresión catálogo 2C
incluye name/settings/categories/items y conserva exactamente el contrato aprobado.

## 10. Platform behavior

Platform AAL1 sin membership: sin global listing/write. Customer AAL2: sin elevación.
Platform fila DB actual + AAL2: metadata global menu-images, ningún otro bucket (fixture
privada distinta), sin upload/PUT/move/delete/bucket administration/cambiar public.
Se concedió membership A sólo por setup: upload A funciona, B no; A inactivo bloquea.
Retirar membership conserva lectura global, pierde upload; quitar fila platform conserva
membership A y sus writes activos, pierde listado B. Mismo JWT, sin refresh/login.

## 11. Delete/orphan — decisión aprobada

**A-S2-004 APPROVED/DEFERRED: Application DELETE for menu-images deferred beyond Sprint 2.**
DELETE app DENY es el comportamiento CORRECTO y completo de Sprint 2, no un gate abierto.
Migration sin DELETE; aun admin activo con orphan propio no puede borrarlo. HTTP200[] no
elimina archivo; bytes/metadata/ref posterior comprobados para todos los actores. Tampoco
Platform con membership local independiente tiene DELETE. Ningún global Platform write.

Reemplazo aprobado: subir nuevo asset UUID/path, actualizar después menu_items.image_path;
el asset anterior puede quedar orphan temporalmente. La suite final verifica este flujo real
y la retención del archivo anterior. Los orphans son deuda operacional aceptada, NO leak
de seguridad ni corrupción de integridad por sí mismos. Preferidos frente al borrado inseguro.

No diseñar lifecycle ahora ni habilitar NOT EXISTS DELETE policy, triggers sobre internals,
FK DB→Storage, SECURITY DEFINER para intentar resolver la carrera, cleanup automático o
best-effort presentado como seguro. No nueva migration: la aplicada ya cumple contrato.
Su comentario original de STOP se conserva como historia; esta decisión lo supersede.

**Evidencia histórica, no acceptance final:** orphan-delete-probe queda sin cambios como
diagnóstico opcional exclusivo LOCAL, separado de DoD y no reejecutado para este cierre.
La ejecución anterior (4/4) demostró fallo del candidato, NO comportamiento esperado de app:

1. Candidato permitía orphan secuencial y retenía referenciado secuencial.
2. Lock de fixture sobre storage.objects puso un DELETE real/JWT en espera confirmada.
3. PATCH real/JWT publicó y confirmó image_path mientras DELETE esperaba; al liberar lock,
   DELETE eliminó archivo y dejó referencia. NOT EXISTS no sincroniza publicaciones nuevas.

Policy diagnóstica temporal, identidad, objeto y lock fueron retirados en aquella ejecución.
Ninguna policy temporal se instala durante las suites finales. Si se ejecuta opcionalmente,
exige stack descartable/exclusivo y cleanup en finally; nunca promoverla a migration.

**A-S2-005 FUTURA/OPEN, no blocker de 2G:** diseñar lifecycle/garbage collection coordinado
antes de necesitar cleanup productivo significativo. Debe contemplar todos los escritores
de image_path y borrados, concurrencia, período de gracia, revalidación, auditoría y fallos/
reintentos DB/Storage. Esta nota NO implementa diseño ni autoriza cleanup actual.

## 12. Update/overwrite decision

Sin UPDATE policy: nuevo asset UUID/path por archivo. Duplicate upload y x-upsert en path
existente denegados; metadata/version/bytes originales conservados. PUT overwrite/move/
copy a A o B denegados, incluso Admin Both; destinos sin bytes. Copiar no implica re-home.
**x-upsert=true sobre path inexistente puede INSERT**, medido; no concede overwrite posterior.
No prometer rechazo global del flag. INSERT sólo operación oficial object.upload;
signed-upload alternativo rechazado por API real. TUS/S3 no habilitados como flujo app ni
declarados suites end-to-end ejecutadas. No dependencia de sobrescritura para Sprint 2.
Reemplazo probado: upload nuevo UUID/path → PATCH del producto → nuevo path persistido;
bytes del anterior y nuevo conservados. DELETE sobre el anterior orphan continúa DENY.

## 13. Test identities

Siete cuentas ficticias efímeras Auth con labels Customer A/B, Admin Valhalla/B/Both,
Platform y Customer MFA; Platform/Customer MFA enrolment/challenge/verify TOTP real para
JWT AAL2, además de sesiones AAL1. Anon sin sesión. Diagnóstico orphan usa otra identidad
admin A efímera y exclusiva en la etapa anterior, no reejecutada al cerrar A-S2-004. Ningún
JWT fabricado ni SQL claims como sustituto de MFA.
Passwords, JWT, TOTP y keys sólo memoria, no logs/repo. Credentials server-only únicamente
fixture/cleanup; ninguna assertion Storage usando service_role. SQL owner sólo guard/setup/
provision/revocación/cleanup, inventario estructural y lock diagnóstico de fixture.

## 14. Storage REST tests

Nuevo runtime encapsulado supabase/scripts/storage-test-runtime.mjs; nueva suite
supabase/tests/storage-rest.test.mjs; scripts raíz storage y storage:orphan-probe.
**24/24 PASS** (23 subtests + padre), cero skipped/todo. Status + metadata/affected rows +
bytes/persistencia observados; rechazo HTTP no basta. Metadata custom no vacía rechazada
en upload binario x-metadata y multipart; NULL/{} aceptadas. Header business/role falsos
no concede namespace ajeno. Límite 5 MiB probado con bytes íntegros. Suite final fortalecida
sin expectativa DELETE allow: todo actor sobre referenciado A/orphan A/B, también Platform
con membership local independiente. Reemplazo nuevo UUID/path retiene old asset orphan.

Primera ejecución detectó dos expectativas incorrectas del harness: x-upsert nuevo y slash
doble de transporte. Se ajustaron a la API real con assertions de inmutabilidad/name final,
NO se debilitó la migration para hacerlos pasar. Fixtures de esos intentos también retiradas.
Guards contra hosted/link/endpoints ambiguos/identidades/objetos/buckets ajenos. No pruebas
simultáneas. Cleanup propio vía API y eliminación exacta de identidades/tenants ficticios.

## 15. Public URL tests

GET object/public/menu-images/path conocido sin API key/JWT: HTTP200, PNG exacto de 68 bytes
y buffer de 5 MiB exacto según caso. Info público expuesto conforme A-S2-003. Denegaciones
de write no crean nuevos bytes; sobrescrituras fallidas conservan originales. No pruebas de
CDN hosted ni invalidación instantánea de copias/cache, ningún dato privado en paths/metadata.

## 16. Cross-business tests

A→A/B→B upload/listado propios permitidos; A→B/B→A upload/UPDATE/DELETE no altera estado.
Admin Both uploads en A y B independientes, sin move/copy/re-home. Tenant aleatorio o no
existente no obtiene uploads. Platform global sólo bucket aprobado, nunca otro bucket.
Regresión 2C incluye catálogo/grants por columna/FK compuesta y ausencia de tenant mutation.

## 17. Revocation same-JWT

Admin A sube y lista; fixture retira membership; idéntico JWT pierde siguiente upload/listado,
DELETE no puede afectar archivo previo. Platform AAL2 pierde listado B al quitar fila actual,
mantiene autoridad local A independiente; quitar sólo membership elimina write, no global READ.
Sin refresh/login. DELETE está denegado incluso antes de revocar: esa assertion no demuestra
una transición allow→deny de DELETE. Si se habilita en futuro, repetir su revocación específica.
No revocación retroactiva de operaciones ya iniciadas ni lectura pública.

## 18. DB image_path interoperability

Admin A upload real → PATCH menu_items.image_path exactamente ese path:200/una fila;
path B en item A:400/23514, path A previo persiste; Admin B no altera objeto A. CHECK original
sin cambios, sin FK/lookup Storage. No autoridad económica ni frontend. DB path sin objeto
y objeto orphan posibles por diseño, no implica garantía concurrente de borrado seguro.

## 19. Policy inventory

Nuevo 05_storage_inventory.test.sql: **65** assertions esperadas mantenidas independiente
del estado real, USING/WITH CHECK exactos, roles/operación/PERMISSIVE, bucket/size/MIME,
ACL gestionada efectiva/owner/RLS, ausencia policies UPDATE/DELETE/ALL/anon/buckets,
triggers de protección originales y semántica de helpers nativos. Runner incluye quinto archivo.
Final:24 policies dominio +3 Storage. Cero probe policies, sin funciones ni ACL nuevas.

## 20. Reset/rebuild y limpieza

Dos resets locales durante implementación y uno adicional autorizado para cerrar A-S2-004.
El reset de cierre db reset --local reconstruyó:
foundation→authorization→active-business fix→storage→seed. Nada aplicado hosted.
Guard verificó target exacto y datos exclusivamente ficticios antes de cada reset.

Evidencia histórica anterior al cierre: canary propio de 68 bytes con path/version únicos
antes del reset de aquella etapa. Metadata/Auth
desaparecen, pero archivo físico **permanece en volumen Storage**. GET público después
HTTP400, no existe metadata; no concluir que reset elimina blobs. Se verificó archivo exacto
y tamaño y se retiró exclusivamente esa versión propia, sin borrar directorios/volúmenes.
Excepción de limpieza diagnóstica, NO implementación o runbook de orphan-delete app.
Fixtures regulares siempre cleanup vía API; no SQL DELETE metadata ni triggers desactivados.

Estado final verificado tras todas las suites: users/profiles/memberships/platform/objects=0;
buckets=1(menu-images), businesses=1, categories=4, items=5, cuatro migrations, 24+3 policies,
cero task2g_orphan_probe y constraint task_2b_smoke_reject_profile retirada. find /mnt -type f
sin archivos. Fingerprint lógico seed 5bc80b32792095fb6cf02694de9626a1 sin timestamps, igual
al inicial. Stop normal conserva volúmenes, sin --no-backup/prune. Logs propios retirados.

## 21. Regression 2B/2C

Resultados finales reejecutados **después del reset de cierre A-S2-004**, secuencialmente:

| Suite | Resultado |
| --- | --- |
| supabase:test:db | 1.092/1.092 PASS, cinco archivos (1.027 baseline +65 Storage) |
| supabase:test:authz | 31/31 PASS |
| supabase:test:storage | 24/24 PASS, DELETE DENY definitivo, reemplazo retiene old orphan |
| supabase:test:smoke | 6/6 PASS |

orphan-probe: 4/4 PASS HISTÓRICO en la etapa previa, no reejecutado ni contado como DoD final.
El cierre no instala ninguna policy temporal. Inventario estructural/policies incluido en
supabase:test:db, no omitido por no ejecutar diagnóstico opcional.

2C sólo ajusta preflight para esperar bucket menu-images y cero objetos en lugar de cero
buckets: sus 30 escenarios/autoridad no cambian. Baselines 2B/2C protegidos no reescritos.

## 22. lint/typecheck/build/env/types

Todos finales PASS: lint cero warnings, typecheck, build74 módulos/PWA14 entradas,
test:env6/6, supabase:types:check cero drift. node --check del runtime Storage y ambas suites
nuevas PASS. Generación public/private mantiene database.types.ts byte a byte, no importar
Storage en React. En este cierre se repitieron lint/typecheck/build/env/types y todos PASS.
Históricamente, build inicial en sandbox falló al leer directorio padre (Acceso denegado);
misma compilación repetida con permisos de ejecución local PASS, sin cambiar configuración
ni código. No presentar ese fallo de entorno como bug corregido del frontend.

## 23. Docs modified

SECURITY, DATABASE, ARCHITECTURE, DECISIONS, SUPABASE_WORKFLOW, ROADMAP,
SPRINT_2_ARCHITECTURE, TASK_2G_AUTHORIZATION_PLAN y este walkthrough; READMEs raíz,
supabase y tests. STOPs históricos resueltos: A-S2-003 APPROVED, A-S2-004 APPROVED/DEFERRED.
DoD revisado: DELETE DENY definitivo, no implementación incompleta. A-S2-005 FUTURA/OPEN
para GC coordinado antes de cleanup significativo, sin blocker actual. Task 2G COMPLETADA/
CERRADA LOCAL y aprobable. Walkthroughs 2A/B/C intactos.

## 24. Warnings

DELETE app diferido por decisión aprobada; orphan temporal es deuda operacional aceptada,
no leak/corrupción por sí mismo. Sin garantía de existencia Storage por CHECK path.
MIME no detecta contenido; UUID no confidencialidad; APIs gestionadas
normalizan transporte y usan preflight/finalización internos. Revocación sólo siguientes
requests, sin control sobre descargas/cache o requests ya iniciados. Reset DB no limpia
payloads. Docker publica puertos: red confiable y stack detenido al terminar. Fixtures sólo
ficticias; no ejecución concurrente con datos reales o Auth/dev.

## 25. Diff summary

Nueva migration, runtime Storage, inventario pgTAP y dos suites REST/diagnóstico; runner
pgTAP incluye quinto archivo, preflight authz espera bucket y cero objetos, package raíz dos
scripts nuevos. Documentación sincronizada. Ninguna dependencia nueva/lockfile/config/seed/
tipo generado/frontend modificado por esta reanudación. 64 archivos protegidos con hash
antes/después iguales, incluidas las tres migrations originales y frontend. Repo ya tenía
trabajo 2A/B/C sin commit: no atribuir todo git diff a 2G. git diff --check PASS, stage vacío;
avisos LF→CRLF existentes sin modificar config compartida.
En este cierre: únicamente docs/READMEs, nombres/descripción de acceptance en inventario
y cobertura REST fortalecida (reemplazo + DELETE DENY de todos los actores). Ninguna
migration nueva/editada, config/tipo/lock/dependencia/frontend cambiado. 66 archivos
protegidos en el cierre (64 anteriores +migration 2G +diagnóstico histórico) sin diferencias.

## 26. Confirmación explícita

NO hosted/login/link/Vercel. NO frontend/Carta conectada/client/Auth UI/admin UI/Platform UI.
NO global Platform writes ni bucket admin. NO economía/ledger/puntos/rewards/QR.
NO image processing/thumbnail/CDN custom. NO commit/push/stage ni 2D.
NO modificación de internals/triggers gestionados, nuevas funciones DEFINER o FK/check a Storage.
Sólo LOCAL: Task 2G COMPLETADA/CERRADA y aprobable, DELETE DENY definitivo, fixtures propias
retiradas y cero policies temporales. No diseño lifecycle/cleanup automático actual.

## 27. Recomendación exacta para Task 2D

**Task 2G cerrada; no iniciar 2D automáticamente.** A-S2-004 APPROVED/DEFERRED y DoD final
PASS. No requiere diseñar cleanup para continuar en una tarea futura autorizada.
Sólo con nuevo pedido explícito para 2D:

> Comenzá Task 2D exclusivamente LOCAL sobre 2B/2C/2G aprobadas: cliente con URL/publishable
> key y lectura/adaptador DB→MenuData, preservando cards/hooks/preview. Filtrá publicación
> explícitamente incluso con sesión admin; derivá URL pública desde image_path sin listar
> Storage, respetando el contrato público aprobado. Preservá decimales, estados y fallback,
> distinguí carga/vacío/error sin recurrir silenciosamente a mocks. No Auth UI, uploads,
> administración, hosted/Vercel, economía ni commit/push. No avances a otra task.

## Acceptance / DoD definitivo — cumplido

- A-S2-003 APPROVED: PUBLIC bucket ≠ public administrative listing; datos de path/metadata no confidenciales.
- A-S2-004 APPROVED/DEFERRED: Application DELETE for menu-images deferred beyond Sprint 2.
- Bucket reproducible de 5 MiB/MIME; formato exacto business_uuid/asset_uuid.ext, metadata vacía.
- Business READ propio incluso inactivo; upload sólo actual admin + negocio activo.
- Platform global metadata sólo menu-images/fila vigente/AAL2; ninguna global write.
- UPDATE/overwrite/move/copy/re-home/DELETE DENY; orphan/referenciado retenidos para todos los actores.
- Reemplazo nuevo UUID/path + PATCH; old orphan aceptado, sin cleanup automático/lifecycle actual.
- Cero policies Storage temporales/DELETE/UPDATE/ALL/buckets/anon, helpers y cuatro migrations intactos.
- Reset + estructura/inventarios/Auth/Storage/smoke/lint/typecheck/build/env/types en PASS.
- A-S2-005 registrada futura: concurrencia, gracia, revalidación, auditoría y fallos DB/Storage.
- NO frontend/hosted/Vercel/Auth UI/economía/commit/push/stage; NO inicio de 2D.

## Fuentes y alcance de la evidencia

[Buckets públicos](https://supabase.com/docs/guides/storage/buckets/fundamentals),
[ACL/RLS y overwrite](https://supabase.com/docs/guides/storage/security/access-control),
[helpers oficiales](https://supabase.com/docs/guides/storage/schema/helper-functions),
[creación SQL/límites](https://supabase.com/docs/guides/storage/buckets/creating-buckets),
[schema/operaciones API](https://supabase.com/docs/guides/storage/schema/design),
[uploads estándar](https://supabase.com/docs/guides/storage/uploads/standard-uploads),
[info](https://supabase.com/docs/reference/javascript/storage-from-info),
[PostgreSQL17 RLS: races con subconsultas](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).
Fuentes primarias contrastadas con Storage v1.79.28 realmente instalado y API/JWT locales.
No extrapolar a hosted/CDN ni considerar PASS del diagnóstico una garantía de DELETE.
