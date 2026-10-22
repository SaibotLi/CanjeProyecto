# Sprint 3D — VERIFIED HOSTED / COMPLETADA

21/10/2026. Objetivo completado: aplicar 3B en Hosted con autorización específica,
publicar 3C y validar Hosted/Vercel. **A-S3D-001 APPLIED / SCHEMA VERIFIED;
A-S3D-002 ECONOMIC SMOKE PASS.**
No reset remoto, seed, SMTP, OAuth, POS, recompensas ni escrituras globales Platform.
External pilot sigue bloqueado por custom SMTP + dominio autenticado.

## Cierre — 21/10/2026

Identidad receptora interna creada/confirmada por flujo normal, presentada y aprobada
expresamente por el usuario antes de operar. Sin membership ni Platform; distinta del
Business Admin emisor. No usuarios externos ni autoacreditación.

Smoke `S3D-SMOKE-20261013`: un crédito ARS 6.500,00 / divisor 1.000,00 = **+6 puntos**;
una reversa completa **−6**, vinculada al crédito y con motivo obligatorio ingresado por
el usuario. Ambos clics económicos finales fueron humanos: la revisión automática
exigió ese traspaso; no se intentó ejecutar las operaciones por otra vía.

El usuario verificó saldo e historial del receptor tras el crédito y la reversa.
Observación PostgreSQL exclusivamente read-only confirma **dos movimientos permanentes,
saldo neto cero**, request IDs distintos, un crédito y una reversa, vínculo correcto,
actor Admin autorizado y **cero movimientos sobre otras cuentas**. Ninguna compensación
adicional, limpieza económica, nueva migration o cambio de permisos/configuración.
Las seis versiones de migrations permanecen exactas. El ledger ya no debe estar vacío:
sus dos registros auditables son el resultado autorizado, no drift ni fixtures borrables.

Frontend de cierre: nombre visible/apodo máximo20 en UI (DB80 conservado); login habitual
con nombre configurado a Inicio, primera confirmación/sin nombre a Perfil, destinos
protegidos y MFA conservados. Lint, typecheck, build con env públicas Hosted,
**56 regresiones + 10 checks QA/PWA/env**, y auditoría de secretos PASS. No se repitieron
suites destructivas LOCAL ni la auditoría completa de Sprint 2 para estos ajustes.

Production ya estaba conectada y READY en `2878e0d` antes de estos ajustes; la publicación
final se verifica por SHA exacto, READY/alias y smoke HTTPS después del push. Evidencia
sanitizada de deployment, doce rutas directas/reload, consola/network y capturas queda
en el workspace de la tarea, fuera del repositorio. No se afirma una nueva prueba manual
de contraseña para la mejora de navegación; su contrato tiene regresión automatizada.

**No se declara External Pilot Ready.** Pendientes: custom SMTP + dominio autenticado,
catálogo real aprobado y preparación operativa. Google OAuth opcional, recompensas/canjes,
pagos/POS y gestión de empleados fuera de este cierre. No avance automático.

## Historia: publicación retomada — 19/10/2026

El usuario solicita publicar el trabajo pendiente y verificar Vercel. `origin/main`
permanece en `0a269db`, sin commits ajenos para sobrescribir. Esta entrega integra
3B/3C y los registros de autorización; preserva la rama Sprint 3 en remoto y actualiza
main por avance seguro, sin force push ni migrations remotas nuevas.

Revalidación read-only: 25 checks de schema, cuatro requests Data API y diagnóstico
semántico de tipos PASS. Hosted mantiene un perfil y ledger vacío; la cuenta receptora
todavía no existe. A-S3D-002 sigue condicionada a presentar y confirmar su identidad.
No se ejecuta crédito/reversa para completar la publicación ni se declara 3D VERIFIED.
El deployment se comprueba después del push por SHA exacto/READY/alias y smoke HTTPS;
la evidencia sanitizada queda fuera del repo. Guía compartida en
[DEVELOPMENT_QUICKSTART.md](DEVELOPMENT_QUICKSTART.md).

## Integración preservada

`codex/sprint-3` incorpora `origin/main` mediante merge local `bd10e70`, sin rebase ni
reescritura. Conserva `0a269db` (cierre Sprint 2), `f39a263` (3B) y `d20d18b` (3C).
Único conflicto: roadmap, resuelto conservando el cierre Hosted y el estado 3B/3C LOCAL.
Frontend/backend económicos coinciden con `d20d18b`; cinco migrations previas, config y
seed coinciden con `origin/main`. Al checkpoint del 13/10 no había push Sprint 3 ni
frontend económico en Production; la publicación del 19/10 retoma ese pendiente.

## Historia: preflight read-only anterior a la migration

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

Plan de publicación: integrar en main por avance seguro,
push normal y esperar deployment Git READY/activo con SHA exacto; no force push.

Publicar schema antes del frontend evita desplegar /operar y /points contra RPC ausentes.
Si falla el frontend, puede restaurarse el deployment Sprint 2 conservando la migration;
no bajar schema ni borrar ledger, especialmente después de movimientos.

## Validación posterior y autorización económica separada

Smoke HTTPS de rutas, reload, console/network, URL/public key Hosted y ausencia de secretos.
Login humano normal; /points código/saldo/historial, Admin/operar y Platform AAL1/MFA/AAL2
read-only. No passwords, sesiones ni códigos MFA por chat o logs.

**A-S3D-002 AUTORIZADA CON CONDICIONES; ejecutada y verificada el 21/10.** Se autorizó un único
crédito ARS6500 → 6 puntos y su reversa total, ambos identificados S3D-SMOKE-20261013.
Se cumplió la confirmación expresa de identidad antes de ejecutar. Saldo/historial receptor,
dos movimientos persistentes, saldo final cero, ausencia de duplicaciones y de cambios
económicos en otras cuentas PASS. La autorización quedó consumida por ese par de operaciones;
no autoriza nuevos créditos/reversas, clientes externos ni fixtures bajo el permiso H1.

El ledger conserva créditos y reversas compensatorias. Una reversa deja saldo neto cero,
pero no elimina el historial ni permite borrar perfiles/negocios referenciados (FK RESTRICT).
La permanencia auditada de esos dos registros queda aprobada por A-S3D-002;
no prometer cleanup completo, ejecutar DELETE/TRUNCATE ni desactivar triggers de inmutabilidad.
La validación autorizada y sus límites quedaron documentados arriba: 3D VERIFIED HOSTED.
