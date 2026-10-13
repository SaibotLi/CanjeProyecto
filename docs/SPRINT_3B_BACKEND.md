# Sprint 3B — backend LOCAL y contrato para 3C

> Registro de la fase LOCAL. Posteriormente A-S3D-001 autorizó y aplicó la sexta migration
> Hosted sin movimientos económicos; [estado actual y límites](SPRINT_3D_HOSTED_ROLLOUT.md).

Implementado 10/10/2026; verificado con Supabase LOCAL/PostgreSQL17.11 el 13/10/2026.
**BACKEND LOCAL VERIFIED.** Hosted conserva Sprint 2 y sus cinco migrations; ninguna
migration remota, deployment, commit/push ni implementación operativa de 3C.

PASS: 328 assertions pgTAP focalizadas (01/03/07), 10 escenarios HTTP con JWT reales
(11 tests Node incluido el contenedor), 12 créditos y 8 reversas concurrentes,
backfill de un perfil creado antes de aplicar la migration, reset/replay de las seis
migrations y tipos oficiales sin drift después del reset. Cero fixtures residuales:
Auth users/MFA/profiles/memberships/Platform/ledger/Storage/negocios temporales.
El seed LOCAL previo de Sprint 2 se conserva sin movimientos económicos.
Lint/typecheck/build con esos tipos, 20 tests de autoridad/editor y el guard de Docker
LOCAL PASS; auditoría de fuente/build sin secretos. Stack detenido con volúmenes conservados.

## Cambios mínimos

Migration forward-only `20261010120000_sprint3_loyalty.sql`; las cinco anteriores intactas.
Memberships admiten admin/staff. Staff sólo agrega READ de su negocio (incluido inactivo),
sin ampliar is_business_admin, Carta, settings, Storage, membresías o Platform.
Authority distingue operatorBusinesses/operatorTenant de adminBusinesses/tenant;
los guards/actions Admin existentes siguen usando exclusivamente la capacidad Admin.
El mapper de perfil conserva su proyección actual mediante Pick de columnas; no se
añade todavía UI de código/QR ni se cambia el flujo Auth. Profiles conserva su RLS
self + Platform AAL2 previamente aprobado, sin policy nueva de enumeración para operadores.

profiles.customer_code: 10 caracteres aleatorios de alfabeto legible de 32 símbolos,
50 bits tomados de UUID criptográfico DB, sin dígitos 0/1 ni letras I/O. Se acepta formato
XXXX-XXXX-XX o compacto, case-insensitive, sólo coincidencia exacta. UNIQUE + lock por
candidato garantizan unicidad con retry; default asigna códigos también a nuevos perfiles
sin editar el trigger Auth existente. Backfill de existentes; código inmutable.
Resolver sólo devuelve código/nombre, de cuenta confirmada y no suspendida; sin email.
El código nunca autoriza, ni necesita membership Customer. QR futuro sólo identifica.

point_transactions registra consumo y delta en una fila: negocio, cliente, código,
actor/rol histórico, tipo, ARS, monto, divisor, delta BIGINT, request_id, referencia,
fecha DB y reversa/motivo. Sin tablas purchase_credits, saldos, POS o audit_events duplicadas.
FK tenant/original compuesta, una reversa por original y ningún borrado económico CASCADE.
No FK a membership revocable. UPDATE/DELETE/TRUNCATE bloqueados incluso para owner normal;
trigger adicional valida que reversa copie exactamente el crédito, nunca otra reversa.

## Superficie API: cinco RPC públicas

Las RPC devuelven JSON; cantidades/puntos/saldo vienen como **strings exactos**.
Wrappers INVOKER → funciones DEFINER privadas de SQL fijo/search_path vacío, owner postgres.
EXECUTE sólo authenticated; internos/trigger/generador no son RPC ni ejecutables por app.
private continúa sin Data API. Ledger tiene RLS enabled y **ningún grant directo, incluso
SELECT**: lecturas por RPC con filtros internos y respuestas mínimas. Esto reduce exposición
respecto de lecturas de filas crudas, sin conceder autoridad a Platform.

| RPC | Parámetros | Resultado/permisos |
| --- | --- | --- |
| lookup_loyalty_customer | business_id UUID, customer_code text | Código/nombre exactos; Admin/Staff actuales, negocio activo. |
| credit_points | business_id UUID, customer_code text, paid_amount JSON string, request_id UUID, reference? text | Receipt inmutable. Admin/Staff, negocio activo, settings habilitados, cliente confirmado/no suspendido; autoacreditación DENY. |
| reverse_credit | business_id UUID, original_id UUID, reason text, request_id UUID | Receipt compensatorio completo. Admin vigente, negocio activo; motivo 1–240. No chequeo de saldo insuficiente. |
| get_my_loyalty | business_id UUID, before_time? timestamptz, before_id? UUID, page_size? integer=50 | balance SUM completo + history paginado; cliente exclusivamente auth.uid(), sin parámetro user/customer. |
| get_loyalty_history | mismos parámetros de paginación | Admin: negocio completo, con actor/rol para auditoría. Staff: sus operaciones y reversas de sus créditos; sin UUID de otros clientes/actores. |

Receipt: id, business_id, customer_code, entry_type, currency_code, paid_amount,
currency_per_point, points_delta, request_id, reference, reverses_id, reason, created_at.
Self history no devuelve actor_id/customer_id/email. Historial Staff no ofrece saldo global.
Paginación por (created_at,id) descendente, 1–100 filas; cursor requiere ambos campos.
El saldo no depende del tamaño de página; lectura self usa un snapshot SQL estable.
Lecturas históricas siguen disponibles con programa/negocio inactivo.

## Dinero, reintentos y concurrencia

Ejemplo de entrada 3C: `paid_amount: "1999.99"`. El argumento SQL es JSONB deliberadamente:
primero exige JSON string; después regex ASCII de decimal canónico (punto, máximo 2
decimales, hasta 12 dígitos enteros); **recién entonces** convierte a NUMERIC sin typmod.
Rechaza números JSON, exponentes, coma/miles, whitespace, NaN/infinity, cero y negativos.
Rango >0 hasta 999999999999.99. Ledger NUMERIC sin typmod + CHECK scale<=2 evita redondeo
silencioso incluso en inserciones privilegiadas fuera de la RPC.

floor(total/currency_per_point) usa exclusivamente NUMERIC PG. Divisor viene de settings
del negocio y se conserva por operación; Valhalla1000.00. Consumos <divisor crean crédito
con cero puntos; jamás acumulan sobrantes entre transacciones. Reversa usa el snapshot
original, aun si cambia el divisor o points_enabled=false. No gastos/canjes en Sprint3.

Cada nuevo intento usa UUID distinto. Conservar request_id y contenido pendiente por
identidad/negocio para recuperar después de timeout/reload; abort HTTP no prueba rollback.
UNIQUE(business_id,request_id) y ON CONFLICT DO NOTHING: misma identidad/contenido normalizado
recupera el receipt original; cualquier cambio de cliente/monto/referencia/tipo/actor da409.
El retry nunca UPDATEa ni recalcula la operación con settings nuevos.
Recuperar un intent ya confirmado no crea movimiento y puede funcionar con programa/negocio
inactivo; **siempre** exige la membership actual. Reversa replay exige Admin actual.
Reversas concurrentes bloquean el original y revalidan el request tras el lock;
otra clave para un crédito ya revertido devuelve409, no crea nueva compensación.
Membership/business/settings se bloquean durante escrituras para ordenar cambios de
autoridad/configuración respecto del commit. Revocación SAME JWT afecta nuevas llamadas.

Errores estables: PT400 entrada/paginación inválida; PT401 sin identidad;
PT403 permisos/estado/self-credit; PT404 cliente/crédito no disponible;
PT409 idempotency_conflict / credit_already_reversed / retry_same_request.
La UI no debe interpretar una red ambigua como éxito o crear otra clave automáticamente.
Referencia opcional 1–120 tras trim; no demuestra pago ni deduplica un consumo con otra clave.

## Reproducción y alcance de pruebas

Usar un checkout/copia **sin supabase/.temp/project-ref**, Docker Linux, pnpm11.19.0 y
Supabase2.119.0 del repo. No quitar el link del checkout Hosted para saltar guards.
Los runners comprueban project_id/canjeproyect, Docker local por IPC (no SSH/TCP),
Docker label y endpoints loopback; nunca registran direcciones/credenciales de contextos.

1. Stack LOCAL disposable, sin cuentas/datos humanos. `pnpm supabase:start`.
2. Aplicar sólo LOCAL (`supabase migration up --local`); generar/checkear tipos con los scripts existentes.
3. `node supabase/scripts/database-tests.mjs 01_schema.test.sql 03_auth_seed.test.sql 07_loyalty_contract.test.sql`.
4. `pnpm supabase:test:loyalty`: JWT reales/confirmación Mailpit, dinero, 12 créditos concurrentes,
   pérdida de receipt HTTP, 8 reversas concurrentes, aislamiento, Staff/Admin, SAME JWT,
   privacidad, settings/inactivo y grants directos. No JWT fabricados como evidencia API.
5. `pnpm supabase:test:loyalty:cleanup`: verifica manifest de fixtures propios y ejecuta
   reset **LOCAL** explícito del esquema disposable. No DELETE/TRUNCATE ni bypass del ledger.
6. Generación/drift de tipos, lint/typecheck/build y test:admin. `pnpm supabase:stop` conserva volúmenes.

Las suites 01/03/04 se ajustan sólo a los cambios intencionales (campo, CHECK, policy Staff,
ledger cerrado y nombres de las nuevas funciones); sus invariantes anteriores se conservan.
La suite real comprueba requests válidas y estado persistido. El acceso directo a columnas
sin grants puede ser rechazado por PostgREST con PGRST204/400 antes del permiso SQL;
no se acepta un 400 genérico como evidencia de seguridad. Staff UPDATE usa filtros de
tenant, representación vacía y comparación de datos antes/después. Upload usa PNG válido
y comprueba denegación de autoridad y ausencia de objetos nuevos.
No se repite la auditoría masiva Sprint2 por defecto. En esta notebook se usa copia LOCAL
aislada mientras el checkout principal conserva su link Hosted intacto.

No frontend operativo 3C, Hosted, datos reales, seed económico, SMTP, OAuth, POS, pagos,
rewards, empleados o QR de canje. Piloto externo sigue bloqueado por A-H2-SMTP.
