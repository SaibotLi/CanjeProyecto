# Database — modelo propuesto

No existe base de datos ni migraciones en Foundation. Este documento registra el modelo objetivo para revisión futura.

## Principios

- PostgreSQL será la fuente de verdad.
- Las tablas operativas incluirán `business_id` para aislamiento multi-business.
- Los IDs serán UUID y los tiempos `timestamptz`.
- Los importes ARS serán enteros, nunca `float`.
- El saldo se derivará del ledger; no se usará `user.points = X` como autoridad.

## Entidades previstas

| Tabla | Propósito |
| --- | --- |
| `businesses` | Tenant, slug, nombre y estado del comercio. |
| `profiles` | Datos mínimos del usuario asociados a `auth.users`. |
| `business_memberships` | Rol admin activo por usuario y negocio. |
| `loyalty_settings` | Moneda, regla de puntos y políticas del negocio. |
| `menu_categories` | Categorías propias del negocio. |
| `menu_items` | Productos, precio y visibilidad. |
| `purchase_credits` | Compra acreditada y su referencia auditable. |
| `point_transactions` | Ledger inmutable de deltas enteros. |
| `rewards` | Catálogo de premios y costo en puntos. |
| `redemptions` | Resultado histórico de un canje. |
| `vouchers` | Credencial de un solo uso asociada al canje. |
| `audit_events` | Registro mínimo de acciones administrativas. |

## Ledger futuro

`point_transactions` será append-only. Cada registro incluirá negocio, cliente, delta, tipo, fuente, actor, idempotencia y snapshots de la regla aplicada. El saldo será `SUM(points_delta)` por negocio y cliente.

Una reversión insertará una transacción compensatoria enlazada a la original. Nunca editará ni borrará la transacción original. La política para una reversión que produciría saldo negativo sigue abierta.

## Menú y cálculo

Los puntos visibles de un producto se derivarán del precio y `loyalty_settings`; no se duplicarán como un campo editable del producto. Task 02 usa precios mock numéricos y calcula `Math.floor(price / previewCurrencyPerPoint)` solamente para la presentación. Este cálculo no acredita puntos ni tiene autoridad económica. Las otras pantallas conservan sus mocks fijos de Foundation.

El contrato frontend de lectura propone `MenuCategory` con `displayOrder` y `MenuItem` con `businessId`, `categoryId`, `price`, `isAvailable`, `isFeatured`, `displayOrder` e imagen opcional. El mapeo final a PostgreSQL se revisará en el sprint de Supabase; no se creó ningún esquema en esta tarea.

## Canje futuro

El débito, `redemption` y voucher se crearán en una única transacción. El QR contendrá un token opaco o firmado, no datos personales. La elección exacta del token y las políticas de vencimiento siguen abiertas.
