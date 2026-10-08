# Sprint 2 + Hosted — cierre definitivo

08/10/2026 (America/Buenos_Aires). **SPRINT 2 + HOSTED FOUNDATION CLOSED.**
**SPRINT 3 READY TO PLAN. External Pilot Ready: NO.**

La foundation H1/H2/H3 aprobada se conserva. El bug temporal de Admin detectado después
del smoke H3 está corregido y publicado: edición de casi siete minutos, revalidación,
guardado real después de tres minutos, persistencia y restauración PASS. El commit
funcional ca71f52 tiene deployment Git Production READY y activo.
[Causa raíz y regresión](ADMIN_CATALOG_LIFECYCLE_FIX.md).
No se inició Sprint3; su planificación requiere un nuevo encargo.

Este documento reemplaza el estado exclusivamente LOCAL del cierre original. La evidencia
histórica de 2H y sus 1.257 comprobaciones permanece en
[TASK_2H_WALKTHROUGH.md](TASK_2H_WALKTHROUGH.md) y el commit de referencia `8042780`.
No se repitió esa matriz ni se reabrieron decisiones aprobadas.

## Estado consolidado

| Entrega | Estado y evidencia sanitizada |
| --- | --- |
| Sprint 2 | LOCAL READY; DB/Auth/RLS/Storage/frontend/Admin/Platform y QA completos |
| H1 | HOSTED FOUNDATION VERIFIED; [foundation/exposición/JWT/revocación/cleanup](HOSTED_FOUNDATION_WALKTHROUGH.md) |
| H2 | AUTH + VALHALLA BOOTSTRAP COMPLETED; [Auth y capacidades reales](H2_HOSTED_BOOTSTRAP_WALKTHROUGH.md) |
| H3 | HOSTED FRONTEND CONNECTED; [configuración y smoke HTTPS](H3_VERCEL_HOSTED_SMOKE_WALKTHROUGH.md) |

Frontend: **https://valhallapp.vercel.app**. Supabase Hosted aprobado:
`liojmtsopplgzderrrqi`, https://liojmtsopplgzderrrqi.supabase.co.
El dominio anterior de A-H2-001 fue corregido expresamente durante H3; no usarlo.

## Implementación y datos persistentes

- Cinco migrations aprobadas aplicadas; constraints/FKs, 27 policies, RLS, grants app,
  helpers y RPC correctos. Ninguna migration ni autorización modificada en este cierre.
- Data API private/storage no expuestos; graphql_public sólo stub administrado,
  pg_graphql deshabilitado y sin SQL arbitrario. Managed Storage ACLs inventariadas
  conforme A-H1-001; no REVOKE, DDL administrado o migration de paridad.
- Auth email/password y confirmation, implicit y TOTP operativos. Operador interno creado
  por flujo humano normal; profile trigger verificado. Identidad personal fuera de Git.
- Valhalla Space / valhalla-space / ARS / America/Argentina/Cordoba / activo.
  Loyalty settings1000.00/true sólo preview; membership Business Admin independiente
  de Platform. Platform exige fila actual + MFA/AAL2 para global READ, sin global writes.
- Catálogo observado durante la validación final: categoría Vinos existente, sin productos;
  Carta vacía controlada. El cambio reversible de orden usado para validar se restauró.
  No productos, precios o imágenes ficticios, seed Hosted ni economía real.
- Storage menu-images PUBLIC, límites/policies aprobados; app DELETE/overwrite/move/copy
  DENY. Orphans posibles aceptados; GC futuro coordinado, no cleanup automático.

Los datos reales de H2 se conservan; no fixtures para limpiar ni provisioning que repetir.
No reset remoto, nuevas tablas, Edge Functions, roles o interfaces económicas.

## Configuración desplegable versionada

Vercel proyecto valhalla, scope saibotlis-projects; repo SaibotLi/CanjeProyecto, rama main,
root apps/web, Vite, Node24.x. Sin override de build/install/output ni dependencia nueva.
Production recibe exclusivamente VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY públicas
del target. Ningún service_role, secret key, password DB, JWT o access token en frontend.

`apps/web/vercel.json` conserva el rewrite `/(.*)` → `/index.html` probado en H3.
Site URL https://valhallapp.vercel.app; allowlist exacta HTTPS /auth/callback y
/auth/recovery. Sólo loopback5173 callback/recovery permanece para desarrollo aprobado;
no wildcard ni backend Supabase localhost configurado en Production.

Copy histórica corregida sin rediseño: Carta de Valhalla/puntos estimativos, cuenta real,
Admin sin LOCAL y Auth sin Mailpit. /platform ya no hereda aviso de datos mock. /points y
/rewards siguen demos explícitas; no se ocultan límites ni se prometen saldos/acreditaciones.

## Validación de consolidación

Lint, typecheck, build con env Production públicas, tests Auth SSR/unit/env/QA estática y
guard de ownership Storage **PASS**. Auditoría redacted de fuente/bundle y diff staged,
sin valores de credenciales publicados; revisión no equivale a certificación universal.
Checks backend protegidos sin diff. No suite pgTAP/fixtures/reset o matriz Hosted nueva.

H3 mantiene evidencia válida: ocho rutas HTTP200, Carta Hosted vacía, login/reload/profile,
Admin Valhalla, Platform AAL1 gate/AAL2 read-only; consola sin errores/warnings.
Callback/recovery sin token dan estado controlado; no prueba nueva de entrega productiva.
El push autorizado exige revisar el nuevo deployment y repetir smoke breve de Carta,
login/Admin/Platform contra HTTPS, sin asumir que el deployment H3 anterior siga activo.
La evidencia final de ese deployment y sincronización queda en el entregable del cierre,
fuera de Git; no logs privados, temporales, env o capturas de identidad en el repo.

Consolidación por stage explícito de archivos pertinentes, commit único y push normal a
origin/main. Sin force push ni historia reescrita; comprobar upstream y revisar avance ajeno
antes de publicar. Este commit elimina la deuda de versionar el rewrite del deployment H3.

## Pendientes operativos antes de external pilot

- **A-H2-SMTP HARD GATE:** custom SMTP + dominio autenticado antes de registro externo,
  clientes Valhalla o lanzamiento. Default SMTP sólo bootstrap interno autorizado.
  Revisar sender/templates/cuotas y probar entrega/confirmation/recovery reales.
  Resend es preferencia futura, sin proveedor hardcoded ni cuenta/dominio creado ahora.
- Catálogo, precios e imágenes reales aprobados, publicación y assets/licencias.
- Validación operativa final: runbook MFA/recovery y custodios, backups/rollback,
  capacitación/privacidad/monitoring, smoke antes de invitaciones y PWA física/update.
- Google OAuth opcional requiere tarea propia; no gate de email/password funcional.

Estas deudas no son fallos de Sprint 2 ni reabren H1/H2/H3. No se declara production ready
o External Pilot Ready por disponer de foundation Hosted. No avance automático a SMTP/OAuth.

## Sprint 3 — alcance inicial listo para planificar

Registro de consumos efectivamente pagados. Regla inicial: **ARS 1.000 pagados = 1 punto**,
calculado sobre el total de transacción, no sumando badges visuales de cada producto.
Definir redondeo y snapshot de regla en el contrato económico antes de implementar.
Ledger inmutable; operaciones autorizadas desde backend, atomicidad, idempotencia,
reversas compensatorias enlazadas, aislamiento por negocio y auditoría suficiente.
Clientes consultan historial y saldo derivado; ningún saldo o acreditación autoritativos
desde UI. Resolver la política de reversas con saldo insuficiente al planificar.

**Premios, vouchers y canje QR pertenecen a Sprint 4.** No tablas, migrations, Edge Functions
o UI de compras en este cierre; Sprint 3 requiere un siguiente pedido explícito.
