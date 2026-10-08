# Database tests

Task 2B: `pnpm supabase:test:db` (official Supabase pgTAP runner) on a freshly reset LOCAL
stack, followed by `pnpm supabase:test:smoke` (genuine HTTP Auth / Data API).
No hosted targets, real identities or secrets in source. Node >=22.13.

- 01_schema.test.sql: exact seven tables/fields, PK/FK/actions, defaults/indexes/CHECKs,
  RLS flags and hardened trigger functions. Historical absent app ACL checks
  superseded by the exact 2C inventory, without dropping structure/integrity checks.
- 02_integrity.test.sql: tenant/status fixtures, uniqueness/text bounds, money/special values,
  privileged cross-business rejection, image paths, delete restrictions and timestamp behavior.
- 03_auth_seed.test.sql: deterministic seed shape, minimal profile trigger, membership checks,
  identity cascades, forced profile failure inside a rollback-only transaction.
- local-smoke.test.mjs: real GoTrue signup/metadata neutrality/atomic failure, private GET/POST
  denial, seed rerun and UPDATE timestamps across transactions. Random fake credentials only
  in memory, cleanup only test identity. Rejects a DB with preexisting identities.

Every pgTAP file rolls back. The CLI mounts only its test directory, so database-tests.mjs
inlines the canonical fixture into an ignored temporary suite before invoking the CLI, then
removes only its own generated files. Do not run the unprocessed files directly through the
CLI (sibling fixture is not mounted). No duplicate fixture maintained in version control.
The CLI postgres role cannot SET ROLE supabase_auth_admin; genuine Auth context is tested
through GoTrue, without adding role memberships to make tests pass.

Smoke tests intentionally inject a temporary failing profile CHECK. Run exclusively on LOCAL
test data; no simultaneous Auth/dev activity. finally removes it, but abrupt process termination
requires checking test constraint/identity or rebuilding this disposable DB after approval.

Task 2C adds 04_authorization_inventory.test.sql: independently maintained exact policy
expressions/roles/commands/mode, effective table/column ACLs, schema/functions/security
inventory and least-privilege private SQL assertions as authenticated. SQL claims here
test SQL grants only, never replace genuine AAL proof.

`pnpm supabase:test:authz` executes authorization-rest.test.mjs with seven genuine local
Auth identities + signed JWTs. Real TOTP enrolment/challenge/verify, AAL1 vs AAL2,
metadata attacks (editable user metadata and rejected app_metadata promotion), symmetric
tenant writes, Admin Both no re-home, platform read-only, same-JWT membership/platform
revocation. Every write checks status + representation/affected rows + persisted state
through real JWT; zero-row200 is denial. No service_role assertions. SQL owner only guards,
setup/provision/revocation/cleanup. Credentials/TOTP secrets only in memory. Guard rejects
hosted/link/ambiguous target/preexisting identidades/objects/tenants; after 2G expects exactly
the menu-images bucket. Cleanup exact created
identities/rows/B/C fixtures, restores original seed logical values (not DB-owned timestamps).
Do not run suites concurrently or during Auth/dev activity. Abrupt termination requires
inspection and authorized disposable-local reset if appropriate. A-S2-004 APPROVED/DEFERRED:
all application DELETE is correctly DENIED in Sprint 2; no incomplete DELETE feature or STOP.

Active-business correction adds SAME JWT active→inactive→privileged fixture reactivation
for Admin Valhalla/B and Admin Both in A/B: own READ persists, all tenant writes denied
when inactive, other active tenant remains writable. App activation denied; no new endpoint.

Task 2G originally added 05_storage_inventory.test.sql with 65 assertions; historical
full pgTAP was 1,092 assertions in five files. A-H1-001 (07/10/2026) removes the 48
fixed managed-ACL expectations from PASS/FAIL and emits their observed values as diagnostics.
The 17 remaining assertions preserve exact bucket/policies/roles/RLS, no UPDATE/DELETE/ALL/
bucket/anon policy, managed delete-protection triggers and native helper semantics.
Direct grantor/grantee/grant-option metadata is inventoried; app roles must not issue ACLs.
`node --test supabase/tests/storage-ownership-contract.test.mjs` additionally checks app
migration provenance: no managed Storage grants/default ACL/role grant/DDL edits.
Managed Storage ACL may differ between local Supabase distribution and Hosted;
CanjeProyecto owns policies/application grants, not Supabase-managed schema ACL.
These SQL files and fixture suites remain LOCAL only. Hosted requires read-only catalog
checks plus effective Data API/Storage requests with real authorized identities; no SQL
claim simulation substitutes for JWT/AAL proof and no destructive TRUNCATE is permitted.

H1-only exception A-H1-003 (07/10/2026): a separate target-pinned runner may create at
most four fictitious Hosted identities and two temporary tenants, use real JWT/TOTP,
test SAME-JWT revocation and perform exact fixture cleanup. Existing LOCAL runners
retain their Hosted guards. This exception does not authorize remote app DELETE,
Storage overwrite/move/copy, TRUNCATE, production bootstrap or seed.sql. A-H1-002 accepts
only the managed disabled GraphQL stub; A-H1-004 treats inaccessible Auth inventory fields
as `UNKNOWN / TO CONFIGURE IN H2`, with no Auth configuration in H1.

`pnpm supabase:test:storage`: 24 tests including parent, seven genuine Auth identities,
real AAL1/AAL2, standard uploads and public byte equality/info, tenant listing/management,
5 MiB boundary, empty binary/multipart custom metadata, declared MIME-extension pairing,
malformed real names, gateway normalization, no overwrite/move/copy, signed-upload denial,
inactive tenants, Platform menu-images-only/no bucket admin, same-JWT revocation and DB
image_path interoperability, new-UUID replacement retaining the old orphan, and DELETE DENY
for every actor against referenced A/orphan A/B, plus Platform with local membership.
HTTP200/[] is denial; inspect retained bytes/state as well. No final expected DELETE allow.
Service credential used only narrowly encapsulated fixture setup/cleanup, never assertions.
All new object paths tracked; cleanup via Storage API, never direct DELETE SQL metadata.

`pnpm supabase:test:storage:orphan-probe`: OPTIONAL HISTORICAL LOCAL diagnostic, NOT final
acceptance/regression requirements or expected application behavior. Not rerun for this closure.
It uses one scoped temporary DELETE
policy, removed in finally. Sequential NOT EXISTS works, but genuine REST DELETE can remove
the file after a concurrent genuine PATCH commits a menu reference. SQL owner holds ONLY
the fictitious object-row lock to reproduce ordering; assertions are JWT/API operations.
4/4 PASS means the unsafe race was proven, NOT that orphan-delete is safe or approved.
Production migration deliberately has no DELETE policy. Abrupt termination requires checking
task2g_orphan_probe, owned fixtures and locks; run exclusively on disposable local test data.

Reset reconstructs metadata but does not clear physical Storage payloads: measured with an
owned 68-byte canary and exact-file cleanup after reset. No general filesystem cleanup recipe.
See ../../docs/TASK_2G_WALKTHROUGH.md for evidence, APPROVED/DEFERRED decision and final results.
Orphans are accepted operational debt, not a leak/corruption by themselves. Future A-S2-005 GC
must cover concurrency/grace/revalidation/audit/DB-Storage failures; no automatic cleanup now.
