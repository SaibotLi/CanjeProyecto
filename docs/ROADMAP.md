# Roadmap — CanjeProyect

La numeración es única y expresa dependencias, no fechas.

## Revalidación de main / Production — 13/10/2026

**SPRINT 2 + HOSTED FOUNDATION CLOSED. External Pilot Ready: NO.** Rewrite y cierre Hosted
ya versionados; nueva verificación de env públicas, build/regresiones y smoke HTTPS PASS.
Sólo actualización documental y sincronización Git; backend y frontend funcional intactos.
[Resultados y límites](SPRINT_2_CLOSEOUT.md).

Las secciones siguientes conservan el alcance histórico de `main` al cierre de Sprint 2.
Por encargos posteriores, 3A fue aprobada y 3B/3C están implementadas y probadas LOCAL en
la rama separada `codex/sprint-3`; no se incorporan ni se publican por este pedido.
Hosted/Production siguen sin economía real. Cualquier publicación de Sprint 3 requiere
un encargo separado; SMTP/dominio continúan bloqueando usuarios externos.

## Estado consolidado de la rama Sprint 3 — 13/10/2026

**Sprint 2 + Hosted Foundation: COMPLETADOS.**
**External Pilot Ready: NO.**

Sprint 2 LOCAL READY; H1 HOSTED FOUNDATION VERIFIED; H2 AUTH + VALHALLA BOOTSTRAP
COMPLETED; H3 HOSTED FRONTEND CONNECTED en https://valhallapp.vercel.app.
Auth, perfil, Business Admin y Platform read-only con MFA/AAL2 operativos. Catálogo Hosted
con categoría Vinos y sin productos; Carta vacía controlada. Sin economía real.
El cierre versiona rewrite SPA, decisiones/documentación Hosted
y copy correcta, sin cambiar las cinco migrations ni permisos.
[Cierre vigente](SPRINT_2_CLOSEOUT.md); las entregas por Task abajo son históricas.

Pendientes operativos antes de invitar externos, no fallos de Sprint 2:

- A-H2-SMTP: custom SMTP + dominio autenticado, entrega/confirmation/recovery y límites revisados.
- Catálogo, precios e imágenes reales de Valhalla aprobados.
- Validaciones finales de operación: runbook MFA/recovery, backups/rollback, PWA física y smoke final.
- Google OAuth opcional; requiere tarea propia y no es gate del email/password existente.

**SPRINT 3C VERIFIED LOCAL.** Staff, identificación por código, ledger,
acreditación/idempotencia/reversas y consultas seguras implementadas y probadas LOCAL.
3C conecta acreditación/recovery, reversas y puntos/historial reales con UX móvil.
3D integró el nuevo `main` y aplicó exclusivamente la sexta migration bajo A-S3D-001.
Backend Hosted: schema/backfill/grants verificados; ledger vacío. El 19/10 se retoma la
publicación del frontend 3C por pedido explícito. El smoke económico sigue condicionado
a presentar y confirmar la cuenta receptora. Nuevas migrations requieren autorización específica.
[Estado 3D y límites](SPRINT_3D_HOSTED_ROLLOUT.md).
[Walkthrough 3C](SPRINT_3C_WALKTHROUGH.md).
[Contrato y walkthrough](SPRINT_3B_BACKEND.md).
La regresión temporal de Admin quedó corregida y verificada:
edición prolongada, revalidación, guardado real y restauración PASS; deployment Git activo.
[Causa raíz y validación](ADMIN_CATALOG_LIFECYCLE_FIX.md).
Sin aplicación remota, publicación de Sprint 3, SMTP u otras fases por la sincronización.

## Sprint 0 — Foundation

React/Vite/TypeScript, Tailwind, routing, PWA, tokens, skeletons, Git local, documentación e integración inicial de marca. **Estado: Task 01 y Task 01B aprobadas.**

## Sprint 1 — Visual System / Digital Menu

Validar dirección visual con Valhalla, conseguir assets originales adecuados, definir contenido real y construir la Carta pública sin pedidos.

Task 02 implementa Carta con catálogo de bebidas mock, tipos reutilizables, categorías sticky, destacado, agotados y onboarding de puntos. Contenido real y revisión presencial siguen pendientes. No inicia el sprint de Supabase.

## Sprint 2 — Supabase + Auth

Architecture V2 aprobada; ver SPRINT_2_ARCHITECTURE.md. Secuencia: 2A entornos/CLI/config → 2B esquema/constraints → 2C RLS/helpers/grants/tests reales → 2G Storage + aislamiento de objetos → 2D cliente/adaptadores → 2E Auth → 2F experiencia autorizada → 2H hardening. Scope 2G actualizado por prompt 2C; no inicio automático.

**Task 2A completada el 02/10/2026**: CLI/config local, env públicos, auditoría, pruebas frontend y smoke test start/status/stop. Stack detenido con volúmenes conservados; 2B requiere nuevo prompt/aprobación, no comienza automáticamente.

**Task 2B completada exclusivamente LOCAL el 02/10/2026**: esquema versionado de seis
tablas public + private.platform_admins, constraints/FK/índices, timestamps, trigger de perfil,
seed demo/fixtures y tipos generados. RLS enabled como baseline cerrado, **sin autorización
funcional ni frontend conectado**. 246 comprobaciones pgTAP, smoke HTTP, dos resets y drift
superados; stack detenido/volúmenes conservados. Evidencia en TASK_2B_WALKTHROUGH.md.
El baseline sin autorización 2B queda supersedido por Task 2C; estructura/integridad intactas.

**Task 2C implementada LOCAL**: migración forward-only, helpers INVOKER, 24 policies/grants
por columna, lectura global exclusivamente fila DB + AAL2, tests Auth/TOTP/REST reales,
inventario y revocación same-JWT. Sin frontend, hosted, Storage o economía. Evidencia final
en TASK_2C_WALKTHROUGH.md. Próximo gate, sólo con nuevo prompt: **2G Storage**, bucket
menu-images/paths/metadata/uploads autorizados, tenants/MFA/revocación. Sin global writes
ni asumir que CHECK image_path asegura objetos. 2D filtrará publicación explícitamente
incluso con sesión administrativa.

Corrección de revisión 2C en migración adicional: todas las escrituras business-scoped
requieren negocio activo; READ propio en inactivo conservado. Helpers/grants intactos.
Regresión completa post-reset superada. No inicia Task 2G.

**Task 2G COMPLETADA/CERRADA LOCAL (02/10/2026), aprobable**: A-S2-003 APPROVED. menu-images PUBLIC
reproducible, 5 MiB/MIME exactos, tres policies y uploads nuevos canónicos con metadata vacía.
PUBLIC bucket ≠ public administrative listing. Actores/JWT/MFA reales, revocación same-JWT,
inactivos, aislamiento/cross-service, reset completo y regresión 2B/2C PASS.
A-S2-004 APPROVED/DEFERRED: DELETE app DENY es acceptance definitiva, no tarea incompleta.
Reemplazo probado con nuevo UUID/path + PATCH y old asset retenido. Orphans son deuda
operacional aceptada, no leak/corrupción por sí mismos. Inventarios/regresión final post-reset:
1.092 pgTAP, 31 Auth/REST, 24 Storage, 6 smoke; lint/typecheck/build/env/types PASS.
No lifecycle/cleanup ahora. A-S2-005 futura exige diseño coordinado antes de cleanup
productivo significativo: concurrencia, gracia, revalidación, auditoría, fallos DB/Storage.
Ver [walkthrough 2G](TASK_2G_WALKTHROUGH.md). Sin inicio automático de 2D ni integridad por CHECK.

**Task 2D COMPLETADA/APROBADA**: implementación/pruebas del 03/10 y validación visual/manual
del usuario confirmada en prompt 2E el 05/10/2026. Carta correcta, responsive aprobado,
datos DB visibles, sin bloqueantes. No capturas del agente ni aprobación inferida de SSR.
[Evidencia y cierre humano](TASK_2D_WALKTHROUGH.md).

**Task 2E COMPLETADA/APROBADA LOCAL (05/10)** por validación humana declarada en prompt 2F:
ADR implicit cerrado; signup/confirmation/Mailpit/login/logout, restore/refresh/account switch,
self profile/display_name, recovery y TOTP reales. Auth true explícito en singleton/store.
/auth/ habilitado en fallback shell; cero cache Auth/privado. Tests unit/SSR y GoTrue/SDK reales,
regresión 2B/2C/2G/2D PASS. Ninguna migration/schema/RLS/autoridad nueva. Browser Use sigue
bloqueado para el agente; usuario confirmó login/register/profile/recovery/navegación/responsive/
tabs/rutas y comportamiento general. No atribuir checks individuales QR/console no declarados.
Contextos storage probados con adapter SDK, no browser físico/PWA instalada; completar
esos gates físicos y SMTP/dominio/MFA recovery runbook antes del piloto, fuera del cierre LOCAL 2H.
[Walkthrough 2E](TASK_2E_WALKTHROUGH.md). El prompt 2F cerró ese gate y autorizó su ejecución.

**Task 2F COMPLETADA/APROBADA LOCAL** por validación manual declarada en el prompt 2H: Business Admin por memberships actuales,
panel Valhalla, categorías/productos create/update, ARS con centavos, upload nuevo Storage,
read-only inactivo y revocación same-JWT. A-S2-006 APPROVED: RPC self sin parámetros,
boolean sin AAL, INVOKER y EXECUTE authenticated. /platform mínimo read-only, guard combina
capability DB y AAL SDK; AAL1 pide MFA. Usuario aprobó Admin/Platform, catálogo, centavos,
uploads reales, inactivo read-only, customer bloqueado y Platform AAL1/MFA/AAL2 read-only;
backend global sigue read-only/fila actual+AAL2, private no expuesto. Sin otros permisos nuevos.
Google OAuth opcional futuro, no blocker. [Walkthrough 2F](TASK_2F_WALKTHROUGH.md).
El prompt 2H cierra ese gate y autoriza únicamente QA/integración LOCAL, no hosted.

**Task 2H COMPLETADA LOCAL — SPRINT 2 LOCAL READY (05/10/2026)**: reset controlado de
cinco migrations, matriz completa y journeys SDK/API reales; perfil UX alineado a 80.
Sin ampliación de autoridad ni nuevas features. 1.257 comprobaciones PASS, 0 FAIL/skipped;
lint/typecheck/build/env/types y auditoría sin hallazgos. Evidencia/alcance físico pendiente
en [walkthrough 2H](TASK_2H_WALKTHROUGH.md); deudas no bloqueantes, checklist de piloto y
estrategia Git en [closeout](SPRINT_2_CLOSEOUT.md). No hosted/commit/push automático.

## Sprint 3 — Loyalty Ledger + Admin Operations

3A aprobado; backend 3B e interfaz 3C implementados y verificados exclusivamente LOCAL:

- Registro de consumos efectivamente pagados, aislado por negocio.
- Regla inicial: ARS 1.000 efectivamente pagados = 1 punto; cálculo sobre total de transacción,
  no suma de badges estimativos por producto. floor por transacción y snapshot del divisor.
- Ledger inmutable; historial y saldo derivados para clientes.
- Operaciones económicas autorizadas desde backend; UI expresa intención y no acredita puntos.
- Idempotencia, reversas compensatorias y auditoría suficiente de operaciones sensibles.

Reversas completas y compensatorias, sólo Admin, sin bloquear por saldo insuficiente:
decisión aprobada en 3B; aún no hay canjes. Referencia opcional, autoacreditación prohibida,
código público exacto e idempotencia atómica PostgreSQL. Frontend operativo 3C probado con
cuentas ficticias y navegador móvil; sin nuevo servidor/Edge Function. Premios/vouchers/canje QR siguen Sprint 4.

## Sprint 4 — Rewards + Voucher Redemption

Catálogo de recompensas, débito atómico, voucher QR de un uso, validación y protección contra doble canje.

## Sprint 5 — Gamification

Logros y eventos separados del ledger. Cualquier recompensa en puntos requiere reglas y controles de abuso aprobados.

## Sprint 6 — Music Interaction

Votaciones musicales, reglas de moderación y límites de participación.

## Sprint 7 — Valhalla Pilot / Hardening

Carga real, capacitación, pruebas presenciales, accesibilidad, monitoreo, backups, privacidad, analytics y plan de recuperación.

## Post-MVP — Multi-business SaaS

Segundo negocio piloto, onboarding, tema/configuración por tenant, aislamiento validado y herramientas comerciales.

## Decisiones que bloquean etapas futuras

- Sprint 1: assets definitivos, contenido real y aprobación visual.
- Piloto externo después de foundation Hosted completada: SMTP/dominio, catálogo real y validación operativa final. No blockers de Sprint 2; flujo Auth cerrado en D-035.
- Sprint 3D: pruebas económicas Hosted con autorización separada y publicación/verificación frontend pendientes.
- Sprint 4: vencimiento y formato de token QR.
- Sprint 5/6: reglas de gamificación, votación y abuso.
