# Roadmap — CanjeProyect

La numeración es única y expresa dependencias, no fechas.

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

Ledger inmutable, acreditación de compras, reversiones compensatorias, idempotencia, auditoría y consola admin autorizada.

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
- Hosted/pilot posterior a Sprint 2 LOCAL: runbooks admins/MFA, SMTP/dominio y configuración manual autorizada. No blockers del cierre local; flujo Auth cerrado en D-035.
- Sprint 3: política de reversión con saldo insuficiente.
- Sprint 4: vencimiento y formato de token QR.
- Sprint 5/6: reglas de gamificación, votación y abuso.
