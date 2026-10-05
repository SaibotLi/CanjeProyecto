# Sprint 2 — LOCAL Closeout

05/10/2026. **SPRINT 2 LOCAL READY — LOCAL FOUNDATION COMPLETE.**
No production ready. Tasks 2A/B/C/G/D/E/F aprobadas por el usuario; 2H QA local completada.
Evidencia detallada: [TASK_2H_WALKTHROUGH.md](TASK_2H_WALKTHROUGH.md).

## Implementado

- React/Vite/TypeScript/PWA Valhalla, responsive/marca conservados.
- PostgreSQL17: seis tablas public + private.platform_admins, constraints/FK tenant,
  NUMERIC ARS/centavos, timestamps y perfil mínimo; cinco migrations forward-only.
- RLS/column grants/helpers INVOKER: customer self, Business Admin por membership DB,
  inactivo own-read/no writes, Platform row+AAL2 global read-only.
- Carta pública DB, publicación explícita independiente de identidad poderosa,
  real settings/orden/flags/centavos y assets por image_path/Storage, no fallback mock.
- Auth email/password/confirmación/Mailpit/recovery/session lifecycle, perfil self y TOTP.
- Admin categorías/items/create/update/upload nuevo; Platform mínimo lista negocios sin edición.
- menu-images PUBLIC5MiB/MIME/canonical namespaces, metadata vacía; listado protegido,
  no overwrite/move/copy/re-home/app DELETE.
- RPC is_current_user_platform_admin(): self boolean/no parámetros/sin AAL/INVOKER,
  private sigue 406, autoridad DB + assurance SDK separadas.
- QA reproducible/secret audit redacted y una corrección real: UX display_name 100→80
  conforme CHECK ya existente. No modificación DB ni cambio de permisos.

## Probado

Reset --local controlado sobre seed sin cuentas/objetos/datos humanos; cinco versions
reconstruidas y fingerprint restaurado. 1.110 assertions pgTAP + 147 casos Node reportados
incluyendo parents = **1.257 PASS, 0 FAIL/cancelled/skipped/todo** (última versión por suite).
Lint/typecheck/build/env PASS; types zero drift. Bundle/PWA estático inspeccionado, audit
sin hallazgos de patrones de credenciales. No certificación universal de ausencia de secretos.

Journeys SDK/API reales: anon Carta; signup/Mailpit/callback/login/profile/restore; customer
known-ID attack/perfil; admin password login/catalog/imagen→Carta; Platform AAL1/TOTP/AAL2;
same-JWT revoke/restore; A/B/Both; inactivos; API metadata/namespace/FK attacks y DB/bytes
posteriores. Business Admin AAL2 conserva sólo tenant, Customer AAL2 nunca global authority.
No fabricated JWT/service_role para assertions. Fixtures privilegiadas estrechas para setup/cleanup.

Usuario aprobó manualmente 2F: Admin/membership/catálogo/centavos/uploads, inactivo readonly,
customer bloqueado, Platform funciona/AAL1 MFA/AAL2 acceso/read-only. 2D/2E aprobados
anteriormente. No nuevas capturas/checks físicos del agente; pruebas SDK/SSR no equivalen a
certificación de todos los tamaños/teclado/consola/install/update/notch.
Checklist humano adicional en walkthrough 2H, no blocker inventado de foundation local.

## Estado operativo y limpieza

- App activa: http://127.0.0.1:5173/ (puerto estricto para Auth).
- API LOCAL: http://127.0.0.1:54321 ; Studio54323 ; Mailpit54324 ; DB54322.
- Cero users/profiles/memberships/platform rows/Storage metadata objects/fixture mail.
- Cero policies temporales/fault constraints; 27 policies =23public+1private+3Storage.
- Seed: un business/cuatro categorías/cinco bebidas ficticias, checksum
  5bc80b32792095fb6cf02694de9626a1. No datos comerciales reales ni admin preinstalado.
- Cleanup sólo de fixtures exactas por SQL/Storage API, no filesystem/prune/volúmenes.
- Si el usuario crea cuentas/catálogo manuales: preservar; no suites exclusivas/reset ciego.
  Provisioning fixture humano por Studio LOCAL y UUID elegido según SUPABASE_WORKFLOW.

## NO implementado

Hosted Supabase/Vercel integration, Google OAuth, economía, purchases/ledger/balances/
credits/reversals/rewards/vouchers/QR/redemption; roles nuevos, writes Platform globales,
membership management, Auth Admin/support, impersonation/exports, Storage app DELETE/GC.
No Auth offline. Puntos/rewards screens siguen demos explícitas, no saldo real.
No servicios remotos, login/link, deployment, stage/commit/push ejecutados.

## Riesgos y decisiones diferidas — no blockers LOCAL

| Tema | Contrato actual / gate posterior |
| --- | --- |
| A-S2-003 APPROVED | PUBLIC bucket ≠ public administrative listing; path conocido/info técnica/custom metadata públicos; sin datos confidenciales allí |
| A-S2-004 APPROVED/DEFERRED | Application DELETE for menu-images deferred beyond Sprint2; DENY es DoD correcto, no tarea incompleta |
| A-S2-005 FUTURA | GC/lifecycle coordinado antes de cleanup significativo: concurrencia, gracia, revalidación, auditoría, fallos DB/Storage |
| DB/Storage | Upload y PATCH no atómicos; retry receipt efímero, orphan aceptado; CHECK no asegura existencia; ningún cleanup best-effort vendido como seguro |
| Contenido imagen | MIME declarada/extensión/tamaño, no magic-byte certification/sanitizador; definir ingestión si el riesgo productivo lo requiere |
| A-S2-006 APPROVED | RPC sólo boolean self sin AAL; grants authenticated; global ops mantienen row+AAL2 en RLS |
| Google OAuth A-S2-007 | Post-foundation/hosted task explícita, no requisito de email/password LOCAL |
| Global writes/support | Auditoría append-only + autoridad DB/AAL2 + server-only + contrato nuevo antes de grants/UI/Auth Admin support |
| SMTP/hosted/Vercel/CSP | Configurar y probar privadamente en target autorizado, no cubierto por localhost |
| MFA emergency recovery | Runbook final de identidad/custodia/auditoría/acceso de emergencia antes del piloto; no bypass app ni eliminar factores improvisadamente |
| Catálogo/assets | Seed/ilustraciones ficticios, aprobar precios/imagenes/licencias comerciales definitivos |
| PWA física | Install/update/icon, browser externo/cross-device/notch/keyboard/console pendientes de entorno adecuado |
| Concurrencia/carga | Last-write-wins normal, sin optimistic locking/snapshot entre páginas ni load/performance certification |
| Economía | Sprint3 ledger/idempotencia/auditoría y futuras transacciones backend, nunca cliente |

## Hosted/pilot — checklist exacto, NO ejecutado

Cada paso exige autorización del usuario y target DEV/PILOT inequívoco. No usar fixtures
destructivas de suites LOCAL contra hosted. No pedir ni pegar passwords/tokens/secrets en chat.

1. **Propiedad/proyecto Supabase:** usuario elige organización propietaria, plan/billing,
   nombre DEV/PILOT y quién custodia accesos. Crear proyecto sólo en tarea autorizada;
   registrar ref/URL no secretos y comprobar target antes de cada acción.
2. **Región/version:** elegir región considerando Valhalla/latencia; verificar versión
   PostgreSQL compatible con17 y features locales. No asumir región/entorno por URL similar.
3. **DB password:** generar/guardar privadamente en gestor y permisos mínimos. No env VITE,
   repo/log/chat. Acordar recuperación/rotación y acceso de operadores.
4. **Migration apply:** revisar las cinco migrations en orden 2B→2C→active-fix→2G→RPC.
   Respaldar estado si hubiera datos, target-check y dry-review; aplicar forward-only,
   verificar versión/inventario/grants/constraints. Nunca db reset remoto.
5. **Seed strategy:** seed.sql es DEV-only, no importar automáticamente usuarios/UUIDs demo/
   catálogo ficticio al piloto. Definir importador/provisioning controlado, business Valhalla+
   loyalty settings 1:1 en transacción, slugs/categorías/precios comerciales aprobados.
6. **Frontend public config:** URL hosted y publishable key públicas de ese proyecto;
   secret/service_role sólo canales server/operación privilegiada si aprobados, nunca browser.
   Verificar que ninguna configuración siga apuntando a127.0.0.1.
7. **Auth Site URL:** fijar dominio HTTPS real y entorno correspondiente, no localhost ni
   dominio ajeno. Revisar settings de email/password/confirmación/rate limits para piloto.
8. **Redirect URLs exactas:** /auth/callback y /auth/recovery del dominio autorizado,
   añadir previews sólo si contractualmente aprobados, evitar wildcard indiscriminado.
   Probar link bueno/usado/expirado con implicit/browser y URL limpia.
9. **SMTP:** elegir proveedor/sender/domain, credenciales privadas, DNS/entregabilidad,
   templates/expiry/rate limits; confirmation/recovery reales con cuentas consentidas.
   Mailpit local no prueba delivery productivo.
10. **Google OAuth futuro:** tarea separada; cliente/consent screen/origins/callbacks exactos,
    secretos privados; no necesario para cerrar Sprint2 email/password.
11. **MFA:** confirmar TOTP enroll/verify y RLS AAL2 en target; probar operator AAL1→MFA→AAL2,
    customer/Business Admin AAL2 sin autoridad global. No persistir QR/secret ni usar capturas.
12. **Platform bootstrap:** usuario elige identidad operadora confirmada, cuenta normal Auth;
    canal privilegiado revisado agrega sólo fila private.platform_admins. Registrar autorización,
    custodios/revocación y MFA emergency runbook; ninguna cuenta/UUID personal hardcoded.
13. **Valhalla admin bootstrap:** identidad elegida/verificada + membership admin sólo de
    Valhalla por canal privilegiado aprobado. No metadata/role en profiles ni grant Platform
    implícito; asegurar caminos de revocación y activo/inactivo sin app reactivación.
14. **Storage migration:** confirmar bucket PUBLIC menu-images/tamaño5MiB/MIME/3policies;
    límites y path canónico contra businessUUID reales. Empty custom metadata; sin DELETE/
    overwrite/move/copy/cleanup. Política de costos/GC futura antes de crecimiento significativo.
15. **Vercel env vars:** sólo VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY del target
    apropiado en entorno autorizado; ningún secret/JWT/password. Nuevo build/deployment
    revisado, no confiar en antiguo deployment baseline. Scan bundle después del build.
16. **SPA rewrites:** fallback aindex.html para rutas customer/admin/platform/auth; assets/API
    tratados correctamente. Probar acceso directo/reload/callback/recovery/404 y no loops.
17. **Dominio/HTTPS/CSP:** dominio/certificados/origins elegidos, CSP/connect-src/img-src/fonts
    coherentes con Supabase/Storage/TOTP dataURI y assets locales, sin unsafe workaround.
    Headers/privacidad/logging sin tokens en URLs/errores; revisar actualización PWA.
18. **Security smoke no destructivo:** private406/RPCself/grants/inventario/AAL1 vsAAL2,
    customer own-only, Admin tenants, no global writes, listing/upload límites/inactivo/DELETE
    denied, knownUUID+persistedstate, revocation sameJWT; sólo fixtures consentidas/límites
    seguros y cleanup exacto aprobado. No copiar resets/fault constraints LOCAL a piloto.
19. **Pilot data import:** datos reales revisados con Valhalla, precios ARS/centavos, publicación/
    disponibilidad/orden/descripción/alt/licencias. Nuevas images por UUID, asociación DB,
    fallback y objetos faltantes. No créditos/saldos/ledger inventados ni seed comercial falso.
20. **Operación/manual acceptance:** backups/restore/monitoring/privacidad/admins/MFA custody/
    recovery runbook, capacitación y rollback. Revisar390×844/360/430/768/1280, teclado/
    safeareas/consola, install/update/cross-device con API alcanzableHTTPS. Certificación de
    carga posterior si operación lo necesita; no marcar production ready sólo por build.

## Diff acumulado — atribución por Task

El worktree NO está limpio ni corresponde íntegramente a2H. Cambios previos preservados.
La supresión del .env.example raíz/reemplazo apps/web/.env.example ya existía en el inicio.

| Task | Archivos/grupos del diff acumulado |
| --- | --- |
| 2A | CLI/config/ignores/env example relocation, root scripts/Node requirement/workspace allowBuilds, SDKenv safety tests/docs, lockfile CLI |
| 2B | 20261002120000 foundation, seed, catalog/identities fixtures, SQL01–03, smoke/local runtime/types tooling y tipos generados |
| 2C + fix | 20261002130000 authorization +20261002140000 active writes, SQL04/authorization-rest, auth-test-runtime/security fixtures y documentación |
| 2G | 20261002150000 Storage, SQL05/storage-rest/fixture runtime, diagnóstico histórico orphan-delete-probe y planes/walkthrough |
| 2D | SDK2.117.2/lockfile, lib/env+supabase, public query/mapper/hook/MenuLoadState, MenuPage/cards/presentation/notice+layouts, menu unit/local |
| 2E | features/auth/pagesAuth+Profile+MFA/router/main/PWAauthfallback, Auth CSS/tests/window adapter/mailruntime y ciclo SDK |
| 2F +A006 | features/authority/admin/AdminCatalog/Platform, admin pages/layout/router/providers/profile links/MFA continuation; 20261005160000 RPC, SQL06/SQL04 update/types generation, tests admin/authority |
| 2H | authData/ProfilePage max80; auth-state/auth-local/admin-local QA additions; nuevo sprint2-qa/secret-audit/root+web scripts; docs sync/closeout/walkthrough |

Shared root/package.json/apps/web/package.json/README/router/main/types/docs han evolucionado
en múltiples tasks. No atribuir cada archivo entero a la última task ni usar git diff --stat
tracked como inventario completo: migrations/tests/features/docs nuevos siguen untracked.
Snapshot inicial160 hashes distingue la corrección2H; cinco migrations/config/seed/types/
lockfile/CSS/client/router/stores quedan byte-for-byte sin cambios2H.

## Estrategia de commits posterior — recomendación, NO ejecución

Primero revisión humana del diff completo, datos privados/ignore/env y estas evidencias.
Preferir un commit coherente de foundation Sprint2 (2A–2H), con descripción separada por
Task: los archivos compartidos/inventarios finales dependen del conjunto y no representan
snapshots ejecutables de cada entrega histórica. Alternativa: foundation2A–2F/G +QA2H en
segundo commit mediante revisión de hunks/snapshot inicial, sólo si puede separarse sin
revertir trabajo útil ni inventar baselines históricos. No reescribir migrations ya aprobadas.
Tras staging autorizado, inspeccionar diff staged, ejecutar auditoría/tests pertinentes y
confirmar que no hay env/keys/runtime/temp/dist/fixtures privadas. Push sólo por autorización
separada y target remoto explícito; no actualizar Vercel por consecuencia accidental.
**No stage, commit o push se hicieron en esta task.**

## Próximo paso recomendado

Usuario revisa cierre/diff y, si acepta, define un prompt separado para commits y/o
preparación hosted/pilot con propiedad/proyecto/región/target explícitos y este checklist.
No crear hosted ni iniciar OAuth/economía automáticamente. Sprint3 requiere su propio
contrato de ledger/seguridad/idempotencia; la foundation local ya está lista para ese diseño.
