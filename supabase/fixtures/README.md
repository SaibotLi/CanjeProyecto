# Fixtures

Task 2B / LOCAL only. catalog.sql is loaded inside rollback-only pgTAP transactions,
not config.toml/seed.sql. Synthetic stable IDs with alphabetic hex digits:

- Valhalla seed tenant: a11a0000-0000-4000-8000-000000000001.
- Business B: b22b0000-0000-4000-8000-000000000002.
- Inactive business: c33c0000-0000-4000-8000-000000000003.
- B category active/inactive and items inactive/unavailable/imageless.

identities.json describes Customer A/B, Admin Valhalla/B/Both, Platform and Customer MFA
without persistent accounts, UUIDs, emails, passwords or provisioned authority.
Customer is implicit, no membership. Task 2C REST setup creates genuine fake Auth users,
retains returned IDs/JWTs
in memory, provision only specified admin memberships with privileged LOCAL setup, then
tear down its own accounts. Do not infer customer-to-business ownership from labels.
Real actor authorization/MFA tests are implemented in tests/authorization-rest.test.mjs,
not in fixtures. TOTP secrets stay in process memory. security-catalog.sql adds an active
item under inactive category and a catalog under inactive business. REST setup checks that
B/C do not exist, commits only its synthetic fixtures, and finally removes exactly those
tenants, generated rows and identities. No fixture is referenced by seed/config.

The 2B Auth smoke test demonstrates real local signup with random in-memory password and
example.test address; both identity and injected failure constraint are cleaned afterward.
Business B belongs to tests, never normal Valhalla seed/pilot. No personal identifiers/secrets.
