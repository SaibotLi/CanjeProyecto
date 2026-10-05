# Database — esquema real Sprint 2 LOCAL

## Cierre 2H — 05/10/2026

Cinco migrations reproducibles: foundation → authorization → active business menu writes →
Storage → current platform capability. Ninguna migration/config/seed/tipo generado fue editado
por 2H; cero drift y 1.110 assertions pgTAP en seis archivos. Siete tablas y 27 policies
(23 public, 1 private, 3 Storage) sin ampliación de autoridad. Profile display_name ya era
1–80 en DB: 2H corrige sólo la discrepancia frontend de 100 → 80, con prueba de límite por
SDK y rechazo CHECK al intentar 81 directamente. Empty se normaliza a NULL desde la app.
El inventario histórico de cuatro migrations abajo corresponde al cierre 2G, antes de A-S2-006.
[Evidencia 2H](TASK_2H_WALKTHROUGH.md). No economía ni lifecycle Storage.

Task 2G COMPLETADA/CERRADA LOCAL, aprobable: A-S2-003 APPROVED;
**PUBLIC bucket ≠ public administrative listing**. DoD final/regresiones post-reset PASS.
Cuatro migraciones: nueva 20261002150000_sprint2_storage.sql crea menu-images PUBLIC,
5 MiB/MIME allowlist y tres policies en storage.objects; sin helpers/grants/UPDATE/DELETE
ni cambios de internals. Seed sigue sin objetos/identidades. Path/info/custom metadata
conocidos públicos; uploads app sólo custom metadata vacía. Listado por tenant o Platform
DB+AAL2 sólo menu-images. `image_path` conserva su CHECK sin FK/lookup Storage.
DELETE DENY es contrato definitivo de Sprint 2 (A-S2-004 APPROVED/DEFERRED), no feature
incompleta. NOT EXISTS no garantiza integridad concurrente con menu_items. Orphans aceptados
como deuda operacional; diseño GC futuro A-S2-005, sin cleanup ahora. [Evidencia](TASK_2G_WALKTHROUGH.md).

Implementación exclusivamente LOCAL, 02/10/2026, PostgreSQL 17. Source of truth:
`supabase/migrations/20261002120000_sprint2_foundation.sql`, según [Sprint 2 V2](SPRINT_2_ARCHITECTURE.md).
RLS habilitada en las siete tablas, con 24 policies y grants explícitos de aplicación en
`supabase/migrations/20261002130000_sprint2_authorization.sql` y corrección forward-only
`supabase/migrations/20261002140000_sprint2_active_business_menu_writes.sql`. 2B/2C originales
intactas. Sólo cuatro policies alteradas: INSERT/UPDATE menú con membership actual + negocio
activo explícito en policies. Lecturas propias inactivas, helpers, grants, esquema y Platform
read-only sin cambios. Reactivación no permitida por app.
Matriz/columnas/helpers en [SECURITY](SECURITY.md); evidencias en walkthroughs 2B y 2C.

## Principios

- PostgreSQL es la fuente de verdad de Carta; ledger/economía futuros también deberán permanecer allí.
- Las tablas operativas incluirán `business_id` para aislamiento multi-business.
- Los IDs serán UUID y los tiempos `timestamptz`.
- Prompt 2B implementa ARS en unidades mayores NUMERIC(14,2), nunca float DB. Task 2D conserva centavos en presentación; puntos futuros siempre enteros. Ver límites abajo.
- El saldo se derivará del ledger; no se usará `user.points = X` como autoridad.

## Tablas reales y columnas

Todos los campos son NOT NULL salvo display_name, description, image_path e image_alt.
UUID generado por DB en businesses, menu_categories y menu_items; identity/profile deriva de Auth.

| Tabla | Campos y defaults |
| --- | --- |
| public.businesses | id PK generado; slug UNIQUE global; name (1–120); currency_code='ARS', CHECK solo ARS; timezone requerida (1–100, sin espacios exteriores); is_active=true; created_at, updated_at. |
| public.profiles | id PK/FK auth.users; display_name nullable (1–80, no vacío si presente); created_at, updated_at. Sin email, rol, puntos, avatar ni tenant. |
| public.business_memberships | business_id + user_id PK compuesta; role text CHECK solo 'admin' (sin default); created_at. Sin id extra, customer, is_active ni updated_at. |
| private.platform_admins | user_id PK/FK auth.users; created_at. Ningún otro campo ni usuario preinstalado. |
| public.loyalty_settings | business_id PK/FK; currency_per_point numeric(14,2)=1000.00; points_enabled=true; created_at, updated_at. Máximo una fila por negocio, no existencia obligatoria automática. |
| public.menu_categories | id PK generado; business_id; name (1–80); slug; display_order=0 >=0; is_active=true; created_at, updated_at. UNIQUE(business_id,slug) y UNIQUE(business_id,id). |
| public.menu_items | id PK generado; business_id; category_id; name (1–120); description nullable (máx.2000); price_amount numeric(14,2) **sin default**; image_path nullable; image_alt nullable (1–240 si presente); image_presentation='photo' CHECK photo/cutout; is_available=true; is_featured=false; is_active=true; display_order=0 >=0; created_at, updated_at. No UNIQUE name. |

Slugs 1–80 caracteres ASCII lowercase alfanuméricos separados por un guion: sin inicial/final,
dobles, whitespace ni newline. Regex ARE `\A…\Z`, collation C. Nombres no vacíos/solo whitespace,
sin normalización silenciosa. description puede estar vacía; nombre/alt no.
timezone es texto requerido, no lookup/enum IANA: el provisionamiento futuro validará la zona
elegida. No se añadió una función dependiente del catálogo del servidor a un CHECK.

## Dinero — decisión reafirmada por 2B (D-029)

ARS en unidades principales `numeric(14,2)` (6000.00, no centavos enteros ni float).
Máximo explícito **999999999999.99**. Precio >=0; divisor >0. CHECKs nombrados rechazan
NaN/Infinity/-Infinity, sin confiar solo en >=0: PostgreSQL ordena NaN por encima de valores
finitos. El typmod rechaza infinities/overflow antes del CHECK (SQLSTATE 22003); NaN,
negativos y divisor cero fallan CHECK (23514). Se probaron ambos tipos y extremos.

El tipo redondea entradas de más de dos decimales (6000.005→6000.01). Es comportamiento
PostgreSQL, **no** una regla económica nueva. Tipos TS generan numeric como number;
no hacen aritmética JS autoritativa. 2D preserva centavos con formatter es-AR/ARS de dos dígitos cuando el precio es fraccional; enteros mantienen formato compacto. No copiar presentación ni floor JS a operaciones económicas.

## FK y eliminación explícita

Todas las FK usan ON UPDATE RESTRICT; ON DELETE:

| Desde | Referencia | ON DELETE |
| --- | --- | --- |
| profiles.id | auth.users.id | CASCADE |
| business_memberships.business_id | businesses.id | RESTRICT |
| business_memberships.user_id | profiles.id | CASCADE |
| platform_admins.user_id | auth.users.id | CASCADE |
| loyalty_settings.business_id | businesses.id | RESTRICT |
| menu_categories.business_id | businesses.id | RESTRICT |
| menu_items.business_id | businesses.id | RESTRICT |
| menu_items.(business_id,category_id) | menu_categories.(business_id,id) | RESTRICT |

CASCADE de identidad elimina solo perfil/autoridades obsoletas, no catálogo/negocios.
Membership físicamente revocable por canal privilegiado. Dependencias comerciales RESTRICT;
no DELETE de aplicación. La FK compuesta evita producto Valhalla→categoría B aun con actor
privilegiado que administra ambos, sin depender de RLS; fallo/estado posterior intacto probados.

## Índices y CHECKs

Siete PK, tres UNIQUE adicionales y 17 CHECKs nombrados. PK/UNIQUE generan índices implícitos.
Tres índices estructurales explícitos, sin índices especulativos:

- business_memberships(user_id,business_id): lookup inverso y limpieza por usuario.
- menu_categories(business_id,display_order,id): lectura ordenada y FK de negocio.
- menu_items(business_id,category_id,display_order,id): FK compuesta/lectura por categoría.

## Imagen — menu_items_image_path_check

NULL o exactamente `<business_uuid>/<asset_uuid>.<jpg|jpeg|png|webp|avif>`.
Prefijo de business_id::text, asset UUID canónico lowercase de 36 caracteres, un slash,
punto literal y extensión lowercase. Longitud 77/78, regex `\A…\Z` y `COLLATE "C"`.
CHECK sobre la fila, sin cast del path, lookup/FK Storage ni función custom.
Rechaza tenant ajeno, URL, uppercase, traversal, subdirectorios, slash extra, query,
fragment, whitespace/newline, doble extensión y vacío. Tests contra CHECK real con letras
en ambos UUID. No impone versión UUID ni garantiza existencia del objeto.

Cross-service 2G probado con JWT real: upload A → PATCH image_path exacto aceptado;
path B en item A rechazado por CHECK (23514), estado anterior intacto; Admin B no muta asset A.
Ni este CHECK ni un NOT EXISTS en DELETE sincronizan publicaciones concurrentes. La app
puede apuntar temporalmente a un path sin archivo y producir objetos orphan; no FK/check a
storage.objects. Borrado app diferido más allá de Sprint 2. Reemplazar siempre mediante
nuevo asset UUID/path y PATCH posterior; el objeto anterior retenido puede quedar orphan,
deuda operacional aceptada, no leak ni corrupción de integridad por sí misma. Antes de cleanup
significativo, diseñar lifecycle coordinado con concurrencia, gracia, revalidación, auditoría
y fallos DB/Storage; no implementado ni requerido para cerrar 2G.

## Timestamps y triggers

created_at: timestamptz NOT NULL DEFAULT now() en las siete tablas; updated_at igual en
las cinco mutables (no memberships/platform_admins). BEFORE UPDATE compartido mediante
`private.set_updated_at()`, SECURITY INVOKER/search_path vacío/owner postgres, sobrescribe
valor propuesto con pg_catalog.now(). now() es transaccional: dos UPDATE en una transacción
pueden compartir timestamp. Pruebas con timestamp antiguo y transacciones separadas.
Los defaults no son ACL: 2C limita created_at/updated_at/ID/tenant mediante grants de columnas.

`auth.users AFTER INSERT → private.create_profile_for_auth_user()` únicamente hace
INSERT public.profiles(id) VALUES(NEW.id) y retorna NEW. SECURITY DEFINER, owner postgres,
search_path vacío, SQL estático/calificado, sin parámetros/metadata/email/autoridad/calls/catch.
EXECUTE revocado a PUBLIC/anon/authenticated/service_role/supabase_auth_admin; el owner
instala el trigger. Signup genuino GoTrue comprobado sin ampliar permisos Auth.
Fallo inducido de perfil abortó alta completa (SQL/HTTP), sin cuentas parciales.
Son funciones trigger privadas, no RPC/helpers de autorización.

## Seed, fixtures y tipos

seed.sql DEV-ONLY: Valhalla demo estable, regla1000, cuatro categorías y cinco productos
genéricos ficticios. ON CONFLICT PK DO NOTHING no reescribe edits/timestamps locales.
No se copiaron Budweiser/Fernet dudosos. Todos los image_path NULL, sin inventar assets/bucket.
Hay agotado/featured/fallback; cero usuarios, memberships, platform authority o Business B.
No es import productivo/piloto. Dos resets reconstruyeron el mismo estado lógico (timestamps nuevos).

fixtures/catalog.sql agrega Business B, negocio/categoría/item inactivos, agotado e imageless
solo dentro de tests revertidos. identities.json define Customer A/B, Admin Valhalla/B/Both
como labels sin cuentas/passwords. Task 2C añade Platform y Customer MFA y crea siete
identidades Auth reales efímeras en tooling local; enrola TOTP y usa JWT reales AAL1/AAL2.
security-catalog.sql agrega producto bajo categoría inactiva y catálogo de negocio inactivo,
exclusivamente tests. Cleanup retira fixtures/identidades propios y restaura valores lógicos
seed, con timestamps DB-owned. El smoke 2B mantiene prueba signup/fallo atómico.

supabase/types/database.types.ts se genera desde el esquema local public/private, sin edición
manual; formatter determinista con TypeScript ya instalado. Cliente/capas de datos usan
tipos Database; cards no los importan.
Tipos no son ACL ni reflejan CHECKs como unions: role sigue text. Drift comprobable en workflow.

## Entidades futuras de producto

| Tabla | Propósito |
| --- | --- |
| `businesses` | Tenant, slug, nombre y estado del comercio. |
| `profiles` | Datos mínimos del usuario asociados a `auth.users`. |
| `business_memberships` | Autoridad admin por fila existente usuario/negocio (real 2B). |
| `loyalty_settings` | Divisor/flag por negocio (real 2B; moneda en businesses). |
| `menu_categories` | Categorías propias del negocio. |
| `menu_items` | Productos, precio y visibilidad. |
| `purchase_credits` | Compra acreditada y su referencia auditable. |
| `point_transactions` | Ledger inmutable de deltas enteros. |
| `rewards` | Catálogo de premios y costo en puntos. |
| `redemptions` | Resultado histórico de un canje. |
| `vouchers` | Credencial de un solo uso asociada al canje. |
| `audit_events` | Registro mínimo de acciones administrativas. |

## Ledger futuro

Task 2B implementó solo las seis tablas públicas y private.platform_admins. Compras, ledger,
rewards, redemptions, vouchers y audit_events son **futuras**. Constraints implementadas;
policies/helpers/grants implementados en 2C para las tablas actuales, no economía.
Migraciones versionadas son source of truth. Tipos incluyen helpers privados y, desde
A-S2-006, la firma pública booleana self sin parámetros. No conceden ACL ni cambian cards.

`point_transactions` será append-only. Cada registro incluirá negocio, cliente, delta, tipo, fuente, actor, idempotencia y snapshots de la regla aplicada. El saldo será `SUM(points_delta)` por negocio y cliente.

Una reversión insertará una transacción compensatoria enlazada a la original. Nunca editará ni borrará la transacción original. La política para una reversión que produciría saldo negativo sigue abierta.

## Menú y cálculo

Task 2D lee Carta pública de Supabase LOCAL por slug valhalla-space, sin UUID de desarrollo en runtime. Un select embebido relaciona business → settings / categorías → items mediante FK tenant; filtros explícitos business/category/item is_active=true incluso para admin/platform. Orden display_order/id en DB y mapper; categorías sin items publicados se ocultan. Sin settings válidos se devuelve error, nunca divisor inventado.

Los puntos de producto se derivan de price_amount y loyalty_settings reales mediante floor sólo visual; points_enabled=false oculta badges/onboarding. No campo editable de puntos, acreditación ni persistencia. Dos productos de 6500 muestran +6 cada uno; total futuro de 13000 podría dar 13, no 12. Las otras pantallas conservan mocks Foundation.

El contrato frontend conserva `MenuCategory` con displayOrder y `MenuItem` con businessId,
categoryId, price, isAvailable, isFeatured, displayOrder e imagen opcional. Mapper 2D explícito
DB→MenuData (pointsEnabled agregado). Tipos generados sólo capa de datos. image_path deriva
getPublicUrl sin listing; null/error usa fallback neutral, nunca mock. Sin cambios schema/policy.
[2D completada/aprobada por validación visual del usuario](TASK_2D_WALKTHROUGH.md).

2E agrega acceso self profiles vía SELECT id=user.id y mapper explícito a Profile; UPDATE
únicamente display_name, null si vacío. Email desde Auth, nunca columna nueva. Signup sin
metadata crea perfil mínimo por trigger existente. **Cero migrations/schema/RLS/grants/helpers/
triggers nuevos o editados en 2E**; cuatro migrations, seed y tipos conservan hashes. Config
Auth LOCAL reproducible cambia confirmación/redirects; fixtures/tipos no amplían autoridad.

## Experiencia administrativa 2F — capacidad Platform mínima

2E COMPLETADA/APROBADA por el usuario al pedir 2F. Frontend 2F usa memberships propias
con filtro user_id/embedding FK a businesses y slug Valhalla; sin UUID DEV ni rol en profiles.
Mapper separado de filas/tipos. Categories/items listan inactivos propios y create/update
whitelist bajo grants existentes; .select().single() exige representation de una fila.
Upload nuevo en Storage y asociación posterior no atómica, sin DELETE/lifecycle.
Única excepción A-S2-006 APPROVED: nueva migration 20261005160000_current_platform_capability.sql
crea `public.is_current_user_platform_admin()`, sin parámetros, RETURNS boolean, SQL STABLE
SECURITY INVOKER/search_path vacío. Sólo llama `private.is_platform_admin()`; no duplica
lógica ni incluye AAL. EXECUTE exclusivamente authenticated/sin grant option, no PUBLIC/anon.
Tipos regenerados mediante CLI. Cuatro migrations anteriores/config/seed/helpers/RLS intactos.
private no expuesto en REST (406). La autoridad permanece en private.platform_admins actual;
operaciones globales siguen fila+AAL2 en RLS. El wrapper no enumera ni otorga global access.
No nuevas tablas económicas ni catálogo comercial inventado.

## Canje futuro (principios)

El débito, `redemption` y voucher se crearán en una única transacción. El QR contendrá un token opaco o firmado, no datos personales. La elección exacta del token y las políticas de vencimiento siguen abiertas.

Fuentes revisadas: [numeric PG17](https://www.postgresql.org/docs/17/datatype-numeric.html),
[ARE/anchors PG17](https://www.postgresql.org/docs/17/functions-matching.html),
[trigger de perfil Supabase](https://supabase.com/docs/guides/auth/managing-user-data).
