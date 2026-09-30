# Security — principios previstos

Foundation no contiene Auth, políticas RLS, base de datos ni operaciones económicas. Las pantallas y datos son demostrativos.

## Frontera de confianza futura

El navegador será un cliente no confiable. Importes, puntos, negocio, costo de recompensa y estado de voucher se resolverán y validarán nuevamente en backend.

## Reglas cerradas

- RLS en toda tabla expuesta.
- Mínimo privilegio y aislamiento por `business_id`.
- Admin autorizado mediante `business_memberships` del mismo negocio.
- Clave pública/publishable solamente en frontend; jamás `service_role` o secret key.
- Escritura económica únicamente mediante funciones seguras.
- Ledger inmutable y auditable.
- Voucher de un uso consumido de forma atómica.
- Idempotencia para impedir duplicaciones por reintentos.

## Matriz conceptual

| Acción | Público | Customer | Admin del negocio |
| --- | --- | --- | --- |
| Leer menú activo | Sí | Sí | Sí |
| Leer cuenta/ledger propio | No | Sí | Solo alcance operativo definido |
| Administrar catálogo | No | No | Sí |
| Acreditar o revertir | No | No | Solo RPC segura |
| Emitir canje | No | Para sí, vía RPC | Flujo futuro explícito |
| Consumir voucher | No | No | Solo RPC segura |

## Pruebas futuras obligatorias

Pruebas allow/deny entre clientes y negocios, escrituras directas al ledger, concurrencia de canjes, doble validación de voucher, idempotencia y reversión con saldo insuficiente.

## Estado de secretos

Solo existe `.env.example` vacío. No se detecta integración Supabase ni credencial real dentro del frontend. Los tokens QR, JWT y secretos nunca deberán registrarse en logs.

