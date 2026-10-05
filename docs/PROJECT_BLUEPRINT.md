# Project Blueprint — CanjeProyect

Sprint 2 LOCAL cerrado por QA 2H; no producción ni hosted. [Cierre y límites](SPRINT_2_CLOSEOUT.md).
La economía sigue prevista para Sprint 3 y no existe un saldo real aún.

## Problema y producto

CanjeProyect busca aumentar la recurrencia de clientes mediante una experiencia simple de menú, puntos, recompensas y vouchers verificables. El primer caso real es Valhalla Space; el producto deberá poder convertirse después en un SaaS para distintos comercios.

## Piloto Valhalla

Valhalla es el único negocio visible durante el MVP. Su experiencia inicial es mobile-first porque el acceso habitual será QR → celular → aplicación. La identidad vigente usa amarillo intenso, negro y fondos negros azulados, con una estética nocturna, underground e industrial.

## Usuarios y roles

- `customer`: consulta menú, cuenta, puntos, recompensas y vouchers propios cuando existan.
- `admin`: opera exclusivamente dentro de un negocio autorizado.

No existe rol `staff`. La autorización admin vive en `business_memberships`, no como rol global en `profiles`.

Sprint 2 V2 aprobada añade autoridad operativa de plataforma mediante private.platform_admins (fuera de Data API), con MFA/AAL2 obligatorio y solo lectura global inicialmente. No cambia los dos roles de negocio ni crea un rol en profiles. Ver SPRINT_2_ARCHITECTURE.md.

## Núcleo futuro

- Menú público sin carrito, pedidos ni pagos.
- Regla inicial prevista: `floor(monto_ars / 1000)` puntos enteros.
- Ledger `point_transactions` inmutable como fuente de verdad.
- Reversiones mediante transacciones compensatorias auditables.
- Recompensas y canjes con voucher QR de un uso.
- Operaciones económicas autorizadas y calculadas en backend.
- Gamificación, logros y votaciones musicales en etapas posteriores.

## Alcance actual: Foundation

La aplicación tiene routing/layout/responsive/marca y PWA básica. 2D conecta `/` a lectura
real LOCAL y está COMPLETADA/APROBADA mediante validación visual del usuario el 05/10/2026.
Seed ficticio DEV, no carta comercial. 2E implementa email/password/confirmación/recovery,
sesión persistente, perfil DB propio con display_name y TOTP opcional. ADR implicit cerrado
para SPA cliente-only con pruebas GoTrue/SDK de contextos; 2E COMPLETADA/APROBADA por validación
humana declarada en el prompt 2F. `/points` y `/rewards` siguen mocks.
2F habilita `/admin` por membership actual: categorías/productos e imágenes Storage,
create/update, sin DELETE y read-only en negocio inactivo. Sin selector SaaS ni provisioning UI.
Platform mínimo implementado con A-S2-006 APPROVED: RPC self boolean sin AAL y guard
Auth SDK separado; /platform negocios sólo lectura. private no expuesto.
2F COMPLETADA/APROBADA por validación manual del usuario declarada en el prompt 2H.
Sin economía ni hosted; ninguna autoridad inferida de MFA, metadata o frontend.

Task 02 construye sobre esta base una Carta Digital pública presentable, exclusivamente de bebidas. Las categorías iniciales son Cervezas, Tragos, Vinos / Espumantes y Sin alcohol. El catálogo y los precios siguen siendo ilustrativos; Valhalla actualmente no ofrece comida. La Carta no exige login y permite descubrir Valhalla Points mediante un enlace a la vista de muestra de puntos.

## MVP Valhalla

El MVP incluirá menú público, cuentas, ledger de puntos, administración de compras, recompensas, vouchers y auditoría. La gamificación y la interacción musical tienen etapas propias y solo entrarán al piloto cuando sus reglas estén aprobadas.

## Fuera del MVP

Pedidos, carrito, procesamiento de pagos, Mercado Pago, reservas, stock, marketplace, IA e interfaz multi-business.

## Preparación SaaS

El modelo real de Sprint 2 ya incluye business_id, FK tenant, settings por negocio y permisos RLS aislados por membresía. Tema configurable/onboarding comercial SaaS siguen futuros: la UI actual exclusivamente Valhalla no muestra selector de negocio ni onboarding multi-business.
