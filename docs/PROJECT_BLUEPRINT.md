# Project Blueprint — CanjeProyect

## Problema y producto

CanjeProyect busca aumentar la recurrencia de clientes mediante una experiencia simple de menú, puntos, recompensas y vouchers verificables. El primer caso real es Valhalla Space; el producto deberá poder convertirse después en un SaaS para distintos comercios.

## Piloto Valhalla

Valhalla es el único negocio visible durante el MVP. Su experiencia inicial es mobile-first porque el acceso habitual será QR → celular → aplicación. La identidad vigente usa amarillo intenso, negro y fondos negros azulados, con una estética nocturna, underground e industrial.

## Usuarios y roles

- `customer`: consulta menú, cuenta, puntos, recompensas y vouchers propios cuando existan.
- `admin`: opera exclusivamente dentro de un negocio autorizado.

No existe rol `staff`. La futura autorización admin vivirá en `business_memberships`, no como rol global en `profiles`.

## Núcleo futuro

- Menú público sin carrito, pedidos ni pagos.
- Regla inicial prevista: `floor(monto_ars / 1000)` puntos enteros.
- Ledger `point_transactions` inmutable como fuente de verdad.
- Reversiones mediante transacciones compensatorias auditables.
- Recompensas y canjes con voucher QR de un uso.
- Operaciones económicas autorizadas y calculadas en backend.
- Gamificación, logros y votaciones musicales en etapas posteriores.

## Alcance actual: Foundation

La aplicación actual permite validar routing, layout, responsive, navegación e identidad visual. Las pantallas `/`, `/points`, `/rewards`, `/profile` y `/admin` usan datos mock y no ejecutan operaciones reales. Existe una PWA básica, pero no hay backend ni sesión.

Task 02 construye sobre esta base una Carta Digital pública presentable, exclusivamente de bebidas. Las categorías iniciales son Cervezas, Tragos, Vinos / Espumantes y Sin alcohol. El catálogo y los precios siguen siendo ilustrativos; Valhalla actualmente no ofrece comida. La Carta no exige login y permite descubrir Valhalla Points mediante un enlace a la vista de muestra de puntos.

## MVP Valhalla

El MVP incluirá menú público, cuentas, ledger de puntos, administración de compras, recompensas, vouchers y auditoría. La gamificación y la interacción musical tienen etapas propias y solo entrarán al piloto cuando sus reglas estén aprobadas.

## Fuera del MVP

Pedidos, carrito, procesamiento de pagos, Mercado Pago, reservas, stock, marketplace, IA e interfaz multi-business.

## Preparación SaaS

El futuro modelo de datos incluirá `business_id` donde corresponda, configuración y tema por negocio, y permisos aislados por membresía. Esta preparación es arquitectónica: la UI actual no muestra selector de negocio ni onboarding SaaS.
