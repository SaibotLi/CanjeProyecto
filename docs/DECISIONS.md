# Decisions — Architecture Decision Log

Las decisiones `CLOSED` no cambian sin una propuesta documentada y aprobación. `PROVISIONAL` identifica elecciones de Foundation que requieren validación. `OPEN` no debe resolverse por accidente en código.

## A-H1-001 — APPROVED (07/10/2026)

Managed Storage ACL may differ between local Supabase distribution and Hosted;
CanjeProyecto owns policies/application grants, not Supabase-managed schema ACL.

El usuario acepta el baseline HOSTED con TRUNCATE/REFERENCES/TRIGGER/MAINTAIN adicionales
para anon/authenticated sobre storage.objects/buckets. No revocarlos, alterar internals
ni crear una migration para igualar el baseline LOCAL. Las cinco migrations se conservan.
El test 05 mantiene policies/roles/RLS/bucket y ausencia de UPDATE/DELETE de aplicación;
las ACL administradas se inventarían mediante diagnósticos, sin ser drift de app por sí solas.
El guard de fuentes storage-ownership-contract.test.mjs comprueba que las migrations no
crean grants, grantees, grant options, role grants indirectos o DDL sobre Storage administrado.
La procedencia histórica de una ACL no puede atribuirse sólo por su catálogo actual.

Antes de cerrar H1: verificar exposición efectiva de Data API/private/storage, RPCs sin SQL
arbitrario/whole-table/DDL y requests reales con identidades/JWT autorizados. No ejecutar
TRUNCATE ni suites destructivas hosted. STOP si private/SQL Storage quedan expuestos, aparece
una capacidad API nueva o resulta necesario modificar managed ACLs para asegurar la frontera.
Inventario SQL y checks anon solos no equivalen a la matriz Customer/Admin/Platform AAL2.
No seed/bootstrap productivo/Vercel/OAuth/economía ni avance automático a H2.
La excepción posterior A-H1-003 autoriza únicamente fixtures efímeras H1.

## A-H1-002 / A-H1-003 / A-H1-004 — APPROVED (07/10/2026)

A-H1-002 acepta `graphql_public` como superficie administrada HOSTED: sólo el stub
administrado, sin objetos CanjeProyecto, sin `pg_graphql` habilitado, sin exposición
private/storage, SQL arbitrario ni autoridad app adicional. No forzar paridad de schemas
con LOCAL, quitar ese schema por migration ni habilitar la extensión. STOP ante capacidad
SQL arbitraria u objeto app bajo ese schema.

A-H1-003 autoriza fixtures ficticias mínimas exclusivamente H1: hasta cuatro usuarios,
dos businesses, memberships mínimas, una fila Platform temporal, categorías/items/objetos
mínimos y TOTP. Tooling privilegiado sólo para setup/revocación/cleanup exacto; assertions
con publishable key/JWT reales. Customer/Admin A/Admin B/Customer AAL2/Platform AAL1/AAL2
y revocaciones SAME JWT obligatorias. Sin cuentas personales ni secretos persistidos.
No TRUNCATE, whole-table destructivo, DELETE de aplicación o Storage overwrite/move/copy.
Cleanup debe dejar cero fixtures y MFA residual. No es bootstrap productivo ni seed.sql.

A-H1-004 limita Auth a inventario read-only: Site URL, redirects, email/confirmación,
MFA/TOTP, SMTP general, límites/templates visibles. Datos no accesibles de forma fiable
se documentan `UNKNOWN / TO CONFIGURE IN H2` y no bloquean H1. No configuración Auth ni
certificación de delivery; SMTP/templates/URLs/redirects/cuotas productivos son H2.
H1 cierra sólo con foundation/matriz/revocación/cleanup verificados. No avance automático
a H2, Vercel, Google OAuth, economía, bootstrap real o seed.

## A-H2-001 — APPROVED (07/10/2026)

Frontend piloto confirmado: https://valhalapp.vercel.app. Auth Site URL y sus redirects
exactos /auth/callback y /auth/recovery autorizados; sin wildcard ni conexión Vercel en H2.
Para verificar H2 antes de H3, frontend local contra Hosted en127.0.0.1:5173 con sólo URL/
publishable key del proyecto en el proceso. Se autorizan las dos rutas callback/recovery
exactas de loopback necesarias; no LOCAL Supabase ni Mailpit como backend de esa prueba.
Email/password, confirmation, implicit y TOTP se mantienen; no Google OAuth.

SMTP default permitido únicamente para una cuenta operadora interna con dirección
autorizada como miembro del proyecto/organización y correo efectivamente recibido.
Sin sortear cuotas, bajar controles o auto-confirmación SQL/Admin. STOP si correo falla.
Usuario completa signup/confirmation/password/MFA por UI normal, sin secretos en chat/logs.
Platform: UUID Auth confirmado y autorización explícita inmediatamente antes de INSERT
exacto private.platform_admins; no metadata ni profiles.role. Después AAL1 DENY/AAL2 READ.
Valhalla real sólo después: slug valhalla-space, name Valhalla Space, ARS, timezone
America/Argentina/Cordoba, activo, UUID DB nuevo; loyalty1000.00/true sólo preview.
Membership Admin del operador independiente de Platform; catálogo vacío sin datos aprobados.
Sin imágenes ficticias, economía, seed, global writes, proveedor nuevo, commit/push o H3.

### A-H2-SMTP — HARD GATE externo / DEFERRED interno

Custom SMTP + dominio autenticado requeridos antes de external pilot.
Bloquea usuarios reales externos, piloto con clientes Valhalla y lanzamiento público.
Preferencia arquitectónica futura: Resend; sin crear cuenta/proveedor/dominio ahora ni
hardcodearlo en la app. H2 puede cerrar con bootstrap interno verificado y este gate
explícito. H3 conecta Vercel/redeploy/smoke HTTPS; no habilita piloto externo automáticamente.

## CLOSED

### Admin — defecto temporal de catálogo (08/10/2026)

Se reabre únicamente la validación de edición prolongada: timeout15s sobrevivía una lectura
exitosa y convertía ready a error, desmontando el formulario. Corrección frontend de deadline
por request, cache de display por identidad/negocio y refresh recuperable. Cache no es
autoridad: permisos desconocidos pausan operaciones, revocación confirmada retira acceso,
save revalida DB/RLS. Sin cambios a schema/grants/migrations/RPC/Storage. Regresión temporal
incluida en test:admin. [Causa y evidencia](ADMIN_CATALOG_LIFECYCLE_FIX.md). No Sprint3 antes
de verificar edición prolongada/guardado Hosted y publicación Git del fix.

### Sprint 2 + Hosted — cierre definitivo autorizado (08/10/2026)

Sprint 2 LOCAL READY y H1/H2/H3 completados. External Pilot Ready: NO, por A-H2-SMTP,
catálogo comercial y validaciones operativas finales. El usuario autoriza stage, commit
de consolidación y push normal origin/main, sin force/history rewrite, con auditoría del
diff staged y verificación del nuevo deployment que dispare Git. Se versiona rewrite SPA
ya probado; sólo copy corrige LOCAL/prueba sobre datos reales. Sin cambios a migrations,
RLS, grants, RPC o Storage. Reportes repo sanitizados: sin identidad UUID del operador,
credenciales, logs privados ni temporales. [Cierre vigente](SPRINT_2_CLOSEOUT.md).
Sprint3 queda listo para planificar consumos/ledger/backend/idempotencia/reversas, no para
implementación automática. Premios/vouchers/canje QR siguen Sprint4. Decisiones aprobadas
de managed ACL y stub GraphQL conservadas, sin nueva auditoría extensiva.

### H3 — HOSTED FRONTEND CONNECTED (07/10/2026)

El usuario corrigió la URL frontend a **https://valhallapp.vercel.app**, supersediendo
valhalapp.vercel.app de A-H2-001. H3 iniciado explícitamente: env públicas Production,
redeploy limpio y smoke HTTPS; rewrite SPA mínimo permitido si rutas internas dan404.
Sólo Site URL/redirects exactos fueron corregidos en Hosted Auth, sin arquitectura ni
controles nuevos. Production recibió únicamente URL/publishable del Hosted correcto.
Deployment limpio main8042780 + rewrite SPA mínimo READY, ocho rutas HTTPS200, login/
profile/Admin/reload y Platform AAL1 gate/AAL2 read-only PASS; consola sin errores/warnings.
H2 continúa COMPLETADA/APROBADA. A-H2-SMTP vigente: no external pilot ready. Sin Google
OAuth/economía ni avance automático. Sin commit/push; versionar rewrite antes del próximo
deployment desde Git. [Cierre H3 y límites](H3_VERCEL_HOSTED_SMOKE_WALKTHROUGH.md).

### H2 — COMPLETADA / APROBADA (07/10/2026)

Auth Hosted y bootstrap interno real verificados: operador confirmado/profile, MFA/AAL2
con Platform read-only, Valhalla Space ARS/America/Argentina/Cordoba activo, loyalty
1000.00/true y Business Admin membership independiente. Catálogo/Storage vacíos por falta
de datos comerciales aprobados. Reingreso y validación visual final confirmados por usuario;
ningún blocker interno restante. [Evidencia H2](H2_HOSTED_BOOTSTRAP_WALKTHROUGH.md).
A-H2-SMTP permanece HARD GATE para externos. Al cierre de H2 Vercel aún no estaba conectado;
el H3 iniciado después lo conecta, según su cierre arriba. Google OAuth pendiente;
economía/Sprint 3 fuera de scope.
Este cierre sólo actualiza documentación, sin nuevos cambios funcionales/Hosted/commit/push.

| ID | Decisión |
| --- | --- |
| D-001 | React + Vite + TypeScript para el frontend. |
| D-002 | Tailwind convive con design tokens CSS semánticos. |
| D-003 | PWA como formato instalable del producto. |
| D-004 | Supabase/PostgreSQL/Auth/RLS como backend previsto. |
| D-005 | Valhalla Space es el piloto y único negocio visible del MVP. |
| D-006 | Arquitectura de datos preparada para múltiples negocios. |
| D-007 | Roles iniciales `customer` y `admin`; no existe `staff`. |
| D-008 | Admin pertenece a `business_memberships`, no a `profiles.role`. |
| D-009 | `point_transactions` será un ledger inmutable y fuente de verdad. |
| D-010 | Reversiones mediante transacciones compensatorias. |
| D-011 | Operaciones económicas sin autoridad frontend. |
| D-012 | Menú público sin carrito, pedidos ni pagos. |
| D-013 | Experiencia customer mobile-first. |
| D-014 | Inter Variable como tipografía actual de body/UI. |
| D-015 | Identidad Valhalla basada en amarillo intenso y negro azulado. |
| D-016 | Regla inicial prevista: 1 punto por cada 1.000 ARS usando `floor`. |
| D-017 | Carta actual de Valhalla exclusivamente de bebidas, pública y sin Auth. |
| D-018 | Categorías iniciales: Cervezas, Tragos, Vinos / Espumantes, Sin alcohol. |
| D-019 | Categorías e items se ordenan mediante displayOrder; los componentes reciben props. |
| D-020 | Task 02 deriva puntos como preview no autoritativo, sin persistir puntos en productos. |
| D-021 | Featured e isAvailable son estados de presentación; agotados permanecen visibles. |
| D-022 | Categorías sticky con scroll a secciones y seguimiento de la categoría activa. Búsqueda fuera de Task 02. |
| D-023 | Task 02B cambia el lenguaje de Carta a app móvil: sin numeración editorial ni hero, pills compactas y productos en una columna mobile. |
| D-024 | Imagen opcional pequeña para productos normales; featured con imagen protagonista. Placeholders locales seguros mientras no existan assets reales autorizados. Sin carrito ni nueva lógica económica. |
| D-025 | Sprint 2 V2 aprobada: seis tablas públicas y private.platform_admins no expuesto por Data API; customer implícito y admin por negocio. Ver SPRINT_2_ARCHITECTURE.md. |
| D-026 | Autoridad platform consultada en DB, MFA/AAL2 para lectura global; sin escrituras globales hasta auditoría append-only y aprobación nueva. |
| D-027 | Migraciones versionadas source of truth; local/dev/pilot separados; sin acciones remotas ni tests destructivos contra piloto. |
| D-028 | Frontend solo URL/publishable key; CLI Supabase estable 2.119.0 fijada por proyecto en Task 2A. |
| D-029 | Prompt Task 2B reafirma e implementa NUMERIC(14,2) en unidades mayores ARS, precio >=0/divisor >0, máximo 999999999999.99 y rechazo de valores especiales. Sustituye P-S2-001; no nueva lógica económica. |
| D-030 | Task 2B crea esquema de forma atómica con RLS enabled y sin policies/grants de aplicación. Triggers internos privados de timestamps/perfil; autorización funcional en 2C. |
| D-031 | Task 2C: 24 policies separadas PERMISSIVE + grants por columna y helpers privados SQL STABLE INVOKER/search_path vacío; private nunca Data API. A-S2-006 aprueba únicamente wrapper público booleano self, no endpoint de private. |
| D-032 | Global SELECT exige fila platform actual + AAL2 verificado; no global writes. Membership local independiente y revocación same-JWT probadas por Auth/TOTP/REST reales LOCAL. |
| D-033 | CORREGIDA tras revisión 2C para respetar V2: admin READ propio incluso negocio inactivo; TODA escritura business-scoped (menú/name/settings) requiere negocio activo. Sólo canal privilegiado futuro reactiva is_active. INSERT sin ID/timestamps; UPDATE sin PK/tenant/timestamps. |
| D-034 | Prompt 2C define próxima Task 2G como Storage + pruebas de aislamiento de objetos. No inicio automático ni bucket/uploads/policies Storage en 2C. |
| D-035 | 05/10/2026: ADR Auth Flow = IMPLICIT para SPA/PWA browser-only sin SSR. SDK 2.117.2 + GoTrue/Mailpit LOCAL prueban confirmation/recovery con almacenamiento previo y limpio, sin verifier. Docs oficiales mantienen soporte; PKCE requiere contexto original. P-S2-002/A-001 supersedidos para flujo actual; garantías físicas PWA/cross-device/hosted pendientes antes del piloto, no blockers LOCAL 2H. |
| D-036 | Singleton browser con persistSession/autoRefreshToken/detectSessionInUrl=true, debug=false; SDK administra tokens. Session store único, INITIAL_SESSION sin getSession competidor, callbacks síncronos, limpieza privada y guard de sesión sin autoridad. Perfil self explícito/display_name sólo; signup sin metadata. |
| D-037 | TOTP opcional, AAL oficial SDK no role. Cancelar retira unverified; abandonar enrollment conserva pendiente visible, no secret persistido. Retiro verified exige AAL2 y refresh para downgrade. Recuperación privilegiada antes del piloto; ningún bypass frontend. |
| D-038 | Task 2F: autoridad Business por memberships actuales self-filter + join FK, tenant por slug DB. Guard UX, refetch en boundaries/antes de writes, RLS autoridad final. Sin UUID DEV/selector SaaS/membership UI. |
| D-039 | Admin Carta LOCAL: create/update por payloads whitelist; fila afectada obligatoria. Input ARS sin separador de miles, coma o punto decimal, hasta dos decimales; no redondear silenciosamente ni quitar puntuación. Negocio inactivo read-only. |
| D-040 | Upload sólo al Save, nuevo UUID/path y metadata vacía/upsert=false. Asociación DB posterior no atómica; receipt efímero self/tenant para retry sin otra subida. Sin DELETE/cleanup, orphan aceptado. Red ambigua no implica guardado exitoso ni retry automático de creación. |
| D-041 | QA 2H alinea el límite frontend de display_name con el CHECK DB existente de 80; no nueva decisión de modelo ni migration. Prueba 80 aceptado/81 rechazado por UI-adapter y DB; límite HTML/JS por unidades UTF-16 conservador frente a caracteres PostgreSQL. |
| D-042 | Contrato 2H: cierre SPRINT 2 LOCAL READY no equivale a production ready. Usuario aprueba 2A/B/C/G/D/E/F y validación manual 2F. Hosted/pilot/SMTP/CSP/MFA emergency recovery/OAuth/GC/economía requieren tareas posteriores explícitas. |

## Task 2D — concreciones del contrato aprobado

03/10/2026: Carta por slug valhalla-space; filtros explícitos de publicación incluso con admin/platform. Orden display_order/id; categorías sin productos publicados ocultas conforme preferencia del prompt. NUMERIC(14,2) conserva centavos; preview con settings reales respeta points_enabled, sin sumar badges como saldo/total. image_path deriva getPublicUrl del bucket público, sin metadata listing; null/broken usa fallback neutral. Nunca mocks como fallback de error. No nuevas decisiones económicas/autorización.

SDK 2.117.2 compartido/lazy; Auth estaba deshabilitado en 2D y se habilita en 2E. Consulta/
mapper comprobados con JWT reales. **2D COMPLETADA/APROBADA** el 05/10 por confirmación
expresa del usuario de su validación visual/manual en navegador real. No son capturas del
agente; se preserva evidencia histórica del bloqueo. El mismo prompt autoriza 2E LOCAL.

### ADR Auth Flow — CLOSED, IMPLICIT

Contexto: sólo browser, sin sesión servidor ni SSR. Implicit soportado oficialmente; SDK
extrae/persiste tokens del fragment. PKCE introduce code verifier ligado al browser original.
Pruebas reales LOCAL de confirmation/recovery en cuatro combinaciones (storage previo/limpio),
evento PASSWORD_RECOVERY y URL limpia dan PASS. Adapter de URL en Node **no es un browser**:
visual/Auth manual quedó aprobado por el usuario al autorizar 2F; app instalada→browser normal
y dispositivos físicos quedan pendientes.
No afirmar independencia de almacenamiento entre PWA/browser; sesión se establece donde
se abre el enlace. Si aparece SSR o exigencia servidor, reabrir ADR antes de cambiar flow.

[Implicit oficial](https://supabase.com/docs/guides/auth/sessions/implicit-flow),
[PKCE y verifier](https://supabase.com/docs/guides/auth/sessions/pkce-flow),
[evidencia y limitaciones](TASK_2E_WALKTHROUGH.md).

## APPROVED — contrato Storage

Task 2E COMPLETADA/APROBADA por validación humana declarada en el prompt 2F: login,
register, profile, recovery, navegación, responsive, tabs/rutas y comportamiento visual.
No atribuir capturas/MFA/PWA física al agente o al usuario si no las declaró.

| ID | Decisión aprobada expresamente por el usuario el 02/10/2026 |
| --- | --- |
| A-S2-003 | menu-images PUBLIC: archivo, información técnica y cualquier custom/user metadata de un path conocido son públicos. Todo filename/path/metadata es no confidencial; UUID no es barrera de confidencialidad. PUBLIC bucket ≠ public administrative listing. Anon/customer sin listado administrativo; Business Admin sólo tenant propio; Platform con fila actual + AAL2 read-only global sólo menu-images. Flujo app no usa custom metadata para datos funcionales, privados o autoridad; uploads preferentemente vacíos. Restricción limpia de metadata opcional; sin hacks, internals o DEFINER innecesario. |
| A-S2-004 — APPROVED/DEFERRED | Application DELETE for menu-images deferred beyond Sprint 2. DELETE app DENY es acceptance definitiva, no implementación incompleta. UPDATE/overwrite/move/copy/re-home DENY. Reemplazo: nuevo asset UUID/path, luego actualizar menu_items.image_path; el anterior puede quedar orphan. Deuda operacional aceptada, no leak ni corrupción de integridad por sí misma. No lifecycle, cleanup automático, NOT EXISTS DELETE policy, FK DB→Storage, triggers gestionados o DEFINER para resolver la carrera. |

## APPROVED — A-S2-006 (05/10/2026)

`public.is_current_user_platform_admin()` expone únicamente una respuesta booleana
self-scoped, sin parámetros. SQL STABLE SECURITY INVOKER, search_path vacío, delega
a `private.is_platform_admin()` sin duplicar lógica. EXECUTE sólo authenticated, sin grant
option ni PUBLIC/anon/service_role. Nueva migration forward-only 20261005160000;
las cuatro migrations anteriores no se editan. private sigue fuera de Data API (406).
La autoridad real sigue almacenada en `private.platform_admins` vigente; no metadata,
email, claims custom, localStorage o constante. **La RPC NO incluye AAL2**: el frontend
combina boolean DB y nivel Auth SDK. false → Forbidden; true+AAL1 → MFA requerido;
true+AAL2 → vista `/platform` mínima/read-only. Las operaciones globales siguen exigiendo
AAL2 en RLS. Sin global writes, enumeración de operadores, DEFINER ni consulta arbitraria.
Estado React efímero revalidado en Auth events/MFA, navegación relevante, foco y refetch;
revocación same-JWT retira acceso. Sustituye la propuesta anterior de enum/AAL combinado:
esa propuesta no se implementó. 2F COMPLETADA/APROBADA por validación manual declarada
por el usuario en el prompt 2H; no inferir certificación adicional de PWA/teclado/viewports/consola.

## PROVISIONAL

| ID | Elección pendiente de validación |
| --- | --- |
| P-001 | Oswald Variable como `current display candidate`. |
| P-002 | Valores exactos de algunos tokens de color, radios y espaciado. |
| P-003 | Asset raster suministrado para header; favicon/PWA sigue siendo placeholder. |
| P-004 | Composición y copy de los skeletons actuales. |
| P-005 | Contenido comercial sin confirmar. 2D lee DB LOCAL con seed ficticio; mock histórico sólo referencia, no fuente runtime. |
| P-006 | Copia WebP lossless para headers; master conservado. Favicon/app icon continúa pendiente. |
| P-007 | Composición Task 02B: thumbnails 72 px, cards compactas, featured 16:9 mobile, onboarding breve y bottom nav. Inspección del deployment superada el 30/09/2026; refinamientos con catálogo real/negocio siguen posibles. |
| P-008 | Siete ilustraciones SVG locales originales y fallback neutro; no son fotos ni imágenes oficiales del catálogo. Reemplazo por assets definitivos pendiente. |
| P-S2-002 — CLOSED/SUPERSEDED | Flow actual cerrado como implicit en D-035; pruebas físicas PWA/hosted siguen pendientes, no ADR provisional. |

## OPEN

| ID | Tema |
| --- | --- |
| A-001 — CLOSED para Sprint 2 | Email/password + implicit D-035. OAuth/magic-link login/phone fuera de alcance; MFA TOTP opcional no autoridad. |
| A-002 | Comportamiento al revertir una compra si el cliente ya gastó puntos. |
| A-003 | Expiración de puntos y vouchers. |
| A-004 | Referencia obligatoria de una compra acreditada. |
| A-005 | Quién puede otorgar/revocar membresías admin y por qué canal. |
| A-006 | Token QR firmado o aleatorio con hash persistido. |
| A-007 | Datos mínimos, consentimiento y retención. |
| A-008 | Reglas y efectos de gamificación y votaciones. |
| A-009 | Modelo de URL, onboarding y tema para el segundo negocio. |
| A-S2-005 | FUTURA: diseñar lifecycle/garbage collection coordinado antes de necesitar cleanup productivo significativo. Contemplar todos los escritores de image_path y borrados, concurrencia, período de gracia, revalidación, auditoría y fallos/reintentos DB/Storage. No diseñar/implementar ahora ni bloquear cierre de 2G por esta deuda operacional aceptada. |
| A-S2-007 — FUTURA OPCIONAL | Google OAuth sólo en tarea explícita con configuración externa/redirects y entorno adecuado. No requisito ni blocker de 2F, no deuda de seguridad del email/password funcional. |

## Protocolo

Todo cambio de una decisión cerrada incluye problema, alternativas, impacto en UI/datos/seguridad y actualización de los documentos afectados antes de implementarse.

## Task 02B — cambio visual autorizado y estado

La dirección tipográfica de Task 02 se sustituye, a pedido del usuario, por una Carta app-first con apoyo visual. El baseline público fue inspeccionado en 390/360/430/1280 px el 30/09/2026; no sirve para validar los cambios locales posteriores. Oswald continúa provisional y se usa con moderación, sin cambiar Inter ni la paleta aprobada. Los contratos MenuCategory/MenuItem/MenuData, displayOrder, mocks económicos y hook de categorías se conservan. Se elimina únicamente la prop visual `number` de MenuSection, porque deja de existir esa numeración.

Task 02B CERRADA el 30/09/2026 tras validar el deployment publicado por el usuario en 390/360/430/768/1280 px, con capturas reales, navegación, teclado/foco, estados y consola sin errores/warnings. No se requirieron correcciones de código ni otro deployment. Safe areas no nulas y ciclo de actualización de PWA instalada quedan como comprobaciones de producción; Oswald y recursos de muestra continúan provisionales. No se realizaron commit, push, deployment propio ni cambios de backend en Task 02B.

## Task 2B — concreciones estructurales autorizadas

02/10/2026: mínimo Node >=22.13 coherente con pnpm fijado, sin upgrade mayor. Esquema
exclusivamente local según V2, límites textuales explícitos en DATABASE/migración. CASCADE
de perfil→memberships retira relaciones revocables al eliminar identidad; dependencias
comerciales RESTRICT. `now()` transaccional para timestamps; grants por columna implementados después en 2C.
Seed genérico DEV-ONLY en vez de copiar Budweiser/Fernet no confirmados; imágenes NULL hasta
Storage. Tipos SQL generados fuera de cards y drift comprobable. No decisiones abiertas de
Auth, MFA, provisionamiento ni economía resueltas por código. Evidencia en TASK_2B_WALKTHROUGH.md.

## Task 2C — frontera implementada

TOTP activado sólo LOCAL para pruebas reales, no aprobación del flujo MFA/recovery productivo.
Customer/admin normal sin MFA obligatoria. Revocar DB afecta siguientes requests del mismo
JWT, no consultas iniciadas/descargas previas. Carta 2D filtra publicación explícitamente,
aunque sesión tenga otras policies OR. Provisionamiento/revocación sigue privilegiado, no app.
2B baseline ACL histórico supersedido por 2C, invariantes estructurales sin cambios.
Evidencia y límites en TASK_2C_WALKTHROUGH.md.

Corrección exclusiva 2C: la interpretación previa de D-033 permitía escrituras de menú en
negocio inactivo y divergía de V2. Nueva migración 20261002140000 altera sólo cuatro policies
INSERT/UPDATE menu_categories/menu_items con membership + negocio activo. Helpers, lecturas,
grants y Platform read-only intactos. No editar migraciones aplicadas 2B/2C.

## Task 2G — contrato definitivo de Sprint 2

A-S2-003 pasa de OPEN a APPROVED por instrucción explícita del usuario. Cuarta migración
forward-only crea menu-images PUBLIC, 5 MiB/MIME y tres policies; ninguna UPDATE/DELETE.
Restricción limpia user_metadata NULL/{} mediante INSERT RLS y operación nativa object.upload,
sin helpers/grants/DEFINER nuevos. Path real canónico original, no modelo alternativo.
x-upsert en path nuevo puede INSERT; jamás overwrite existente por autoridad de app.
SQL reset reconstruye configuración/metadatos, no elimina payloads del volumen: probado.
La prueba concurrente se conserva sólo como diagnóstico histórico de un candidato rechazado.
A-S2-004 APPROVED/DEFERRED elimina el STOP: DELETE denegado es el comportamiento correcto.
DoD exige cero policies DELETE/UPDATE/ALL/bucket/temporales, retención de bytes para orphan
y referenciados, regresiones después de reset y documentación sincronizada. La migration ya
aplicada permanece byte a byte; su comentario original de STOP refleja la etapa histórica,
supersedida por esta decisión, no un gate vigente. No nueva migration sólo por documentación.
Task 2G COMPLETADA/CERRADA LOCAL y aprobable tras reset/regresiones finales PASS.
No cambia 2C ni inicia 2D. [Evidencia final](TASK_2G_WALKTHROUGH.md).
