# Roadmap — CanjeProyect

La numeración es única y expresa dependencias, no fechas.

## Sprint 0 — Foundation

React/Vite/TypeScript, Tailwind, routing, PWA, tokens, skeletons, Git local, documentación e integración inicial de marca. **Estado: Task 01 y Task 01B aprobadas.**

## Sprint 1 — Visual System / Digital Menu

Validar dirección visual con Valhalla, conseguir assets originales adecuados, definir contenido real y construir la Carta pública sin pedidos.

Task 02 implementa Carta con catálogo de bebidas mock, tipos reutilizables, categorías sticky, destacado, agotados y onboarding de puntos. Contenido real y revisión presencial siguen pendientes. No inicia el sprint de Supabase.

## Sprint 2 — Supabase + Auth

Proyecto y entornos, `businesses`, `profiles`, `business_memberships`, `loyalty_settings`, método de login y primeras políticas RLS.

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
- Sprint 2: método de login y administración de admins.
- Sprint 3: política de reversión con saldo insuficiente.
- Sprint 4: vencimiento y formato de token QR.
- Sprint 5/6: reglas de gamificación, votación y abuso.
