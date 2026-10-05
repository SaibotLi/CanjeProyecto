# Supabase

Task 2A preparó config.toml. Task 2B implementa una migración local con seis tablas public
y private.platform_admins, constraints, triggers internos, seed demo, fixtures y pruebas.
Task 2C añade migración forward-only:24 policies, grants por columna y helpers privados
INVOKER. RLS enabled, MFA/REST real y revocación same-JWT exclusivamente LOCAL. Sin
Edge Functions/economía/frontend. Baseline 2B intacto, ahora autorizado por 2C.
2G añade cuarta migración: menu-images PUBLIC de 5 MiB/MIME y tres policies, uploads nuevos
tenant activo y metadata vacía. PUBLIC bucket ≠ public administrative listing (A-S2-003 APPROVED).
A-S2-004 APPROVED/DEFERRED: DELETE app DENY definitivo de Sprint 2, sin gate abierto.
Reemplazo con nuevo UUID/path + PATCH; orphans son deuda operacional aceptada, no leak/
corrupción por sí mismos. A-S2-005: GC coordinado futuro antes de cleanup significativo,
no implementación automática. ../docs/TASK_2G_WALKTHROUGH.md.
Los servicios internos de Supabase no equivalen a tablas de aplicación.
Task 2G COMPLETADA/CERRADA LOCAL y aprobable, DoD y regresiones post-reset PASS.

2D/2E completadas y aprobadas por usuario. 2F implementada LOCAL; visual/manual pendiente.
A-S2-006 APPROVED añade quinta migration forward-only: RPC pública
is_current_user_platform_admin() sin parámetros, boolean STABLE INVOKER/search_path vacío,
delegando helper privado vigente. EXECUTE sólo authenticated, sin grant option. SIN AAL en
resultado: frontend combina capability DB y nivel SDK para /platform read-only.
private sigue fuera de REST (406), global RLS fila+AAL2/no global writes intacta. Cuatro
migrations anteriores/Storage/seed preservados. Inventarios pgTAP 1.110 PASS/seis archivos,
Auth/REST 32 PASS, tipos regenerados sin drift. Sin reset en esta continuación. No iniciar 2H.

- `migrations/`: únicamente cambios aditivos, revisables y versionados.
- `functions/`: entradas seguras para operaciones que no deben autorizarse en el navegador.

Nunca poner claves de servicio en `apps/web/` ni en archivos versionados. Consultar primero `../docs/SECURITY.md`.

Desde la raíz: pnpm supabase:start / supabase:status / supabase:stop. No login/link requerido.
Leer ../docs/SUPABASE_WORKFLOW.md y ../docs/SPRINT_2_ARCHITECTURE.md. private nunca se
agrega a api.schemas ni extra_search_path. Reset --local SOLO después de verificar/aprobar
el target y pérdida de datos. Pruebas: pnpm supabase:test:db, supabase:test:smoke y supabase:test:authz;
tipos: pnpm supabase:types / supabase:types:check. 2G: supabase:test:storage y diagnóstico
histórico opcional supabase:test:storage:orphan-probe fuera de DoD (PASS demuestra fallo
del candidato, no comportamiento esperado de aplicación ni integridad).
Scripts no aceptan targets hosted. Suites secuenciales/exclusivas sin Auth/dev concurrente.
Reset DB no borra payloads del volumen; fixtures se limpian vía Storage API antes de reset.

- `seed.sql`: DEV-ONLY, no carta real ni cuentas personales. No-op por PK al repetir.
- `fixtures/`: catálogo de aislamiento y labels de identidades, no cargados por seed/config.
- `tests/`: pgTAP transaccional + smoke HTTP local con identidades efímeras.
- `scripts/`: wrappers locales guardados; resuelven fixtures para el runner oficial/generan tipos.
- `types/database.types.ts`: generado local; no editar ni importar en cards.

Esquema/FK/constraints detallados: ../docs/DATABASE.md. Evidencia: ../docs/TASK_2B_WALKTHROUGH.md.
