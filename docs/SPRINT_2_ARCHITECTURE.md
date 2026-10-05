# Sprint 2 — Architecture V2 aprobada

Estado 05/10/2026: 2A/B/C/G/D/E/F COMPLETADAS/APROBADAS por el usuario;
2H cierra regresión/integración exclusivamente LOCAL sin cambiar V2.
SPRINT 2 LOCAL READY; no production ready. [Cierre y gates posteriores](SPRINT_2_CLOSEOUT.md).

Registro de aprobación del usuario, consolidado el 02/10/2026. Complementa Foundation.
2A preparó entorno, 2B modelo/constraints/triggers y 2C policies/helpers/grants, sólo LOCAL.
Ver DATABASE, SECURITY y TASK_2C_WALKTHROUGH para realidad implementada.

## CLOSED — alcance y autoridad

- Supabase Auth identifica al usuario; PostgreSQL decide la autorización. `customer` es implícito, sin membership obligatorio. `profiles` no contiene roles ni email duplicado de Auth.
- Seis tablas en `public`: businesses, profiles, business_memberships, loyalty_settings, menu_categories, menu_items. `private.platform_admins` es la séptima y nunca se expone por Data API.
- Admin de negocio mediante membership vigente del mismo business. No rol staff, ni privilegios por user_metadata/JWT custom claims manipulables.
- Admin puede LEER sus recursos aunque el negocio esté inactivo; TODA escritura business-scoped de aplicación requiere negocio activo. Sólo canal privilegiado futuro puede reactivar businesses.is_active, nunca app por autoridad business/platform.
- Platform Admin: usuario Auth normal + fila DB privada vigente + MFA/AAL2 para autoridad global. No cuenta personal, UUID o email preinstalado. No tercer rol editable en profiles.
- Sprint 2 da al operador global **solo lectura**: negocios, perfiles mínimos, memberships, settings y catálogo; metadatos de Storage limitados a menu-images cuando exista. No escrituras globales ni impersonación. Puede actuar como admin de un negocio solo con su propia membership.
- La lectura global de perfiles permite enumeración/exportación por API aunque no haya botón exportar: es una capacidad aprobada que requiere cuidado de privacidad. Auditoría append-only obligatoria **antes de habilitar grants o cualquier escritura global**, no solo antes de una UI.
- Los cambios de autoridad se comprueban contra DB en cada petición. Revocar platform authority debe negar acceso global incluso reutilizando el mismo JWT AAL2; no debe revocar una membership local independiente.

## Modelo y contratos de 2B (implementados localmente)

- UUID y timestamptz; tenant en business_id donde corresponde. Configuración loyalty 1:1 (máximo una fila por business), provisionada junto al negocio en transacción controlada.
- FK compuesta menu_items(business_id, category_id) → menu_categories(business_id, id), con UNIQUE correspondiente. RLS sola no evita referencias cross-business.
- image_path nullable, relativo canónico `<business UUID>/<asset UUID>.<jpg|jpeg|png|webp|avif>`; CHECK vincula el prefijo a business_id, exige coincidencia completa y rechaza traversal/URL. No casts frágiles, dependencia de Storage ni FK a objetos. No garantiza que el asset exista. Bucket menu-images implementado LOCAL en 2G; DELETE app DENY definitivo en Sprint 2 (A-S2-004 APPROVED/DEFERRED).
- Activo/visible no equivale a disponible: agotados visibles; categorías/items inactivos ocultos al público. display_order conserva la ordenación actual. IDs, tenant y timestamps no son campos de escritura libre del cliente. Sin hard-delete de aplicación en Sprint 2.
- Perfiles mínimos asociados a auth.users; 2B implementa trigger privado mínimo INSERT profile(id), sin metadata ni autoridad. Signup y rollback por fallo probados localmente.
- Adaptador DB→MenuData mantiene cards, imagePresentation, preview y hooks. Nunca fallback silencioso a mocks ante un error real ni puntos persistidos en producto.

## Helpers/policies de 2C (implementados LOCAL)

- Helpers STABLE, SECURITY INVOKER, search_path vacío y referencias calificadas; nunca confiar en orden/short-circuit de evaluación SQL.
- is_business_admin comprueba auth.uid(), negocio y membership sin consultar businesses (evitar recursión RLS).
- private.is_platform_admin() sin parámetros consulta únicamente la fila propia vigente. Política self-row directa en private.platform_admins, sin llamar al propio helper (evitar recursión).
- Privilegios SQL internos mínimos para authenticated (USAGE private y SELECT de user_id necesario para helper); anon sin acceso. No IUD de platform_admins desde la aplicación. Grant interno **no** equivale a exposición Data API: la tabla privada sigue inaccesible vía REST.
- Policies públicas, self, business y platform separadas por operación. Recordar OR de policies permisivas; plataforma global exige AAL2 en cada policy relevante. Customers no requieren MFA por defecto.
- Auth Admin API, si se necesita después, solo servidor: JWT verificado + autoridad DB actual + AAL2 + validación + auditoría + credencial server-only; nunca secreto frontend.

24 policies/ACL por columna inventariadas. No generic INSERT/UPDATE de tabla, DELETE app ni
PK/tenant/timestamps editables. Lectura propia incluso negocio inactivo; name/settings/menú
sólo escrituras con membership actual y negocio activo. Corrección forward-only 20261002140000
restaura V2; helper únicamente membership, estado activo explícito en policies de escritura.
Platform SELECT, writes locales sólo membership + negocio activo. MFA real GoTrue/TOTP, JWT emitidos
por Auth; no simulación SQL AAL como evidencia REST. Revocación sin refresh. Carta 2D filtra
publicación explícitamente: otras policies OR pueden autorizar borradores a un admin.

## PROVISIONAL / OPEN

- Importes NUMERIC(14,2) en unidades mayores ARS: P-S2-001 fue provisional en V2 y el prompt 2B la reafirma/implementa (D-029). Precio >=0, divisor >0, máximo 999999999999.99, valores especiales rechazados. Las muestras frontend siguen usando enteros. Cálculo económico futuro floor por DB con snapshots, no implementado.
- P-S2-002 CLOSED/SUPERSEDED por D-035 el 05/10: email/password + implicit en SPA browser-only.
  GoTrue/SDK/Mailpit LOCAL validan contextos storage previo/limpio, recovery, enlaces usados/
  expirados y URL final. Visual Auth 2E aprobado por el usuario al pedir 2F; PWA instalada/
  cross-device físico aún pendientes, no PASS
  inferido de adapter Node. Reabrir ADR si aparece SSR; ningún contrato requiere backend web.
- Provisionamiento/revocación de admins, retención/consentimiento y futuro modelo URL multi-business necesitan runbooks/decisiones explícitas; no improvisar UI de plataforma.
- Ledger, auditoría económica, compras, rewards, vouchers y QR NO pertenecen a Sprint 2. Sus invariantes originales siguen cerradas.

## Orden de ejecución y acceptance gates

Contrato 2G A-S2-003 APPROVED: menu-images PUBLIC, archivo/info/custom metadata de path
conocido públicos; nunca datos privados/funcionales/de autoridad allí ni confidencialidad por
UUID. **PUBLIC bucket ≠ public administrative listing.** Frontera LOCAL implementada con
5 MiB/MIME, tres policies, metadata de uploads vacía, operación estándar y paths inmutables.
READ propio en inactivo, INSERT sólo membership + negocio activo; Platform DB+AAL2 sólo
global metadata menu-images, sin global writes. 2B/2C preservadas y revalidadas tras reset.

A-S2-004 APPROVED/DEFERRED: **Application DELETE for menu-images deferred beyond Sprint 2.**
DoD correcto: sin DELETE/UPDATE/ALL/bucket policies, ningún global Platform write, rechazo
de borrado incluso orphan propio activo, bytes/referencias conservados y cero policies temporales.
NOT EXISTS rechazado por evidencia concurrente, no lifecycle ni cleanup automático ahora.
Reemplazo con nuevo UUID/path y PATCH posterior; orphan anterior es deuda operacional aceptada,
no leak/corrupción por sí mismo. A-S2-005 futura antes de cleanup productivo significativo:
concurrencia, gracia, revalidación, auditoría y fallos DB/Storage. No bloquea 2G.
Task 2G COMPLETADA/CERRADA LOCAL y aprobable tras todas las regresiones finales PASS.
[Evidencia y validación final](TASK_2G_WALKTHROUGH.md). No iniciar automáticamente 2D.

2A entorno → 2B esquema/constraints → 2C RLS/helpers/grants/tests reales → 2G Storage y
aislamiento de objetos (scope actualizado por prompt 2C) → 2D cliente/adaptadores → 2E Auth →
2F experiencia autorizada → 2H hardening. No avanzar automáticamente entre tareas.

2D y 2E COMPLETADAS/APROBADAS por validación visual/manual declarada por el usuario.
El prompt 2F confirma el cierre humano de Auth y autoriza Business Admin/experiencia de autoridad LOCAL.
2E retira /auth/ del navigation denylist: callback/recovery usan shell SPA, runtimeCaching
vacío y /api/ excluido. Rutas HTTP/build comprobadas, no instalación/refresco PWA físico.
Perfil real self-filter/display_name, signup sin metadata, store único, TOTP y AAL oficial,
sin guards de autoridad ni global writes. No schema/RLS/grants/helper/trigger/migration nuevos.
SMTP real/dominio y recuperación privilegiada MFA son preparación del piloto, fuera de 2H LOCAL.
2F implementa Business Admin, catálogo y upload sobre permisos aprobados. A-S2-006 APPROVED
incorpora sólo nueva migration forward-only con RPC pública self sin parámetros, boolean
STABLE INVOKER/search_path vacío, EXECUTE authenticated. Delega al helper privado actual
sin AAL: DB membership y assurance Auth SDK se combinan en guard /platform mínimo read-only.
private continúa excluido (406), RLS global sigue fila vigente+AAL2. Sin global writes ni
probes por counts/metadata. Business Admin independiente sin MFA obligatorio.
2F COMPLETADA/APROBADA: usuario validó Admin/Platform y autorizó 2H LOCAL.
Ninguna otra ampliación de grants/RLS/schema/Storage. Google OAuth futuro, no blocker.
Ver TASK_2F_WALKTHROUGH.md, TASK_2E_WALKTHROUGH.md y SUPABASE_WORKFLOW.md.
