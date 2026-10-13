# Sprint 3D — backend Hosted aplicado; validación económica pendiente

13/10/2026. Objetivo confirmado: preparar/aplicar 3B en Hosted con autorización específica,
publicar 3C y validar Hosted/Vercel. **A-S3D-001 APPLIED / SCHEMA VERIFIED; 3D IN PROGRESS.**
No reset remoto, seed, SMTP, OAuth, POS, recompensas ni escrituras globales Platform.
External pilot sigue bloqueado por custom SMTP + dominio autenticado.

## Integración preservada

`codex/sprint-3` incorpora `origin/main` mediante merge local `bd10e70`, sin rebase ni
reescritura. Conserva `0a269db` (cierre Sprint 2), `f39a263` (3B) y `d20d18b` (3C).
Único conflicto: roadmap, resuelto conservando el cierre Hosted y el estado 3B/3C LOCAL.
Frontend/backend económicos coinciden con `d20d18b`; cinco migrations previas, config y
seed coinciden con `origin/main`. Sin push Sprint 3 ni frontend económico en Production.

## Preflight read-only

Hosted `liojmtsopplgzderrrqi`: cinco versiones aprobadas exactas; ledger, customer_code
y cinco RPC nuevas todavía ausentes. Un perfil confirmado, profile trigger sin huecos,
una membership Admin. Valhalla activo, ARS, America/Argentina/Cordoba, divisor1000.00,
points_enabled=true; una categoría y cero productos. No se registran identidades ni claves.

Dry-run oficial `db push --linked --dry-run` completado, con la migration prevista pendiente.
Lint/typecheck/build con variables públicas Production PASS; 53 regresiones económicas,
Auth/Admin/menu y 10 checks QA/PWA/env PASS; auditoría de secretos PASS.
Evidencia 3B/3C de PostgreSQL/JWT/concurrencia/replay/cleanup sigue válida: código sin cambios.
No se reinicia Sprint 3 ni la auditoría completa de Sprint 2.

## A-S3D-001 — AUTORIZADA, aplicada y verificada

Se aplicó exclusivamente `20261010120000_sprint3_loyalty.sql` al proyecto Hosted indicado.
SHA256: `2f5a4342de35f1c83311c09084a8fc73fff299dec23c3a482069ead69c6112be`.

Efectos: admitir Staff, policy READ de su negocio, customer_code inmutable con generación
y backfill del perfil existente, ledger vacío e inmutable con FKs RESTRICT, cinco RPC
scoped y sus helpers/grants. No asigna Staff ni cambia memberships, settings, catálogo,
Auth o Storage. No crea créditos/reversas ni bootstrap de clientes.

Antes de ejecutar: comprobar target, branch, hash, historia remota y lista exacta pendiente.
Usar CLI oficial sin include-all/include-seed; STOP ante otra migration pendiente, drift
no explicado, target distinto o fallo de aplicación. No repair ni reset como recuperación.

Resultado: historia de seis versiones, constraints/RLS/grants/RPC y backfill correctos.
25 checks de catálogo PASS; único perfil con código válido, no nulo y único; constraints
UNIQUE/CHECK e inmutabilidad habilitadas. Ledger vacío; cuatro requests reales PASS:
private/storage HTTP406, ledger y RPC de lectura anon HTTP401/42501. Sin calls económicas.

Preflight completo coincidió antes de aplicar; dry-run confirmó una única migration.
Digests read-only antes/después: datos comerciales/settings/memberships, campos previos
del perfil, identidades Auth/MFA/Platform, Storage/buckets/objects/ACLs/policies y policies
app previas sin diferencias. No nueva membership, cuenta ni movimiento económico.

La comparación textual inicial de tipos generados activó STOP de verificación. Diagnóstico
read-only: nombres quoted/unquoted, metadata/utilidades del generador y Args `never` versus
`Record<PropertyKey, never>` en tres funciones sin argumentos. El AST de schema coincide
en todos los otros campos/tablas/relaciones/RPC; PostgreSQL confirmó cero argumentos y
retornos iguales en esos tres casos. Sin drift de schema, edición de tipos LOCAL ni
correcciones backend. No se oculta la diferencia textual entre generadores.

Pendiente: integrar en main por avance seguro,
push normal y esperar deployment Git READY/activo con SHA exacto; no force push.

Publicar schema antes del frontend evita desplegar /operar y /points contra RPC ausentes.
Si falla el frontend, puede restaurarse el deployment Sprint 2 conservando la migration;
no bajar schema ni borrar ledger, especialmente después de movimientos.

## Validación posterior y gate económico separado

Smoke HTTPS de rutas, reload, console/network, URL/public key Hosted y ausencia de secretos.
Login humano normal; /points código/saldo/historial, Admin/operar y Platform AAL1/MFA/AAL2
read-only. No passwords, sesiones ni códigos MFA por chat o logs.

**A-S3D-002 pendiente: toda acreditación/reversa Hosted exige autorización previa propia.** No usar el operador
como cliente de su propia acreditación. Con el único perfil actual, la prueba de escritura
requiere definir una segunda identidad interna y el negocio/consumo de prueba autorizados.
No registrar clientes externos con SMTP default ni crear fixtures aprovechando el permiso H1.

El ledger conserva créditos y reversas compensatorias. Una reversa deja saldo neto cero,
pero no elimina el historial ni permite borrar perfiles/negocios referenciados (FK RESTRICT).
La prueba Hosted y la permanencia auditada de sus registros deben aprobarse explícitamente;
no prometer cleanup completo, ejecutar DELETE/TRUNCATE ni desactivar triggers de inmutabilidad.
3D no se declara VERIFIED hasta completar la validación autorizada y documentar sus límites.
