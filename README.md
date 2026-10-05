# CanjeProyect

Fundación frontend de una futura plataforma SaaS de fidelización para comercios. **Valhalla Space**, de Villaguay, Entre Ríos, es el piloto y el único negocio visible durante el MVP.

> **Antes de implementar una feature, leer `/docs`.**

## Estado actual

**SPRINT 2 LOCAL READY — Task 2H completada LOCAL.** 1.257 comprobaciones PASS,
0 FAIL/skipped; lint/typecheck/build/env/types y reconstrucción controlada superados.
Único ajuste QA de producto: display_name frontend alineado al límite80 existente en DB.
[Evidencia final](docs/TASK_2H_WALKTHROUGH.md) y [cierre/checklist hosted-pilot/Git](docs/SPRINT_2_CLOSEOUT.md).
No production ready: PWA física/hosted/SMTP/CSP/runbooks/economía siguen fuera de esta entrega.

Task 01/01B entregó React, Vite, TypeScript, Tailwind, React Router, PWA, tokens y skeletons.
2D conecta Carta pública a Supabase LOCAL y está COMPLETADA/APROBADA: el usuario validó
visualmente el resultado en navegador real (05/10/2026). 2E añade Auth real LOCAL,
perfil propio y TOTP; COMPLETADA/APROBADA por validación humana declarada en el prompt 2F.
2F COMPLETADA/APROBADA por el usuario en el prompt 2H: Business Admin LOCAL,
categorías/productos/upload y Platform mínimo read-only.
A-S2-006 APPROVED: RPC booleana self sin AAL; guard combina DB + MFA SDK. Puntos/recompensas
siguen mocks explícitos; ninguna economía real.

Task 02 creó originalmente la Carta de bebidas con 16 productos mock. Desde 2D la Carta usa
exclusivamente DB (seed LOCAL: cuatro categorías y cinco bebidas ficticias), con recomendado,
agotados y onboarding Valhalla Points. Los badges son estimaciones, no acreditaciones.

Task 02B aprobada visualmente; Sprint2 Architecture V2 aprobada. 2A prepara CLI/config y 2B
las siete tablas/integridad/triggers/seed. **2C implementa autorización LOCAL**:24 policies,
helpers INVOKER/grants por columna, Auth/TOTP/REST real y revocación same-JWT.
**2G COMPLETADA/CERRADA LOCAL, aprobable**: menu-images PUBLIC reproducible, 5 MiB/MIME, listado por tenant o
Platform AAL2, uploads nuevos sólo admin/negocio activo. A-S2-003 APPROVED: PUBLIC bucket
≠ public administrative listing. A-S2-004 APPROVED/DEFERRED: DELETE app DENY definitivo
en Sprint 2. Reemplazo siempre nuevo UUID/path y PATCH posterior; orphans como deuda
operacional aceptada. Lifecycle/GC futuro antes de cleanup significativo, no implementación
actual ni blocker de 2G.
**2A/2B/2C/2G/2D/2E/2F COMPLETADAS/APROBADAS por el usuario** en el contrato 2H.
Cliente único 2.117.2, implicit explícito, persistencia/refresh/URL habilitados, profile self
y MFA opcional sin autoridad frontend. Seed DEV demo de 5 bebidas, no carta comercial.
Admin de Carta y Platform read-only reales LOCAL; hosted pendiente. [Evidencia 2F](docs/TASK_2F_WALKTHROUGH.md),
[evidencia 2E](docs/TASK_2E_WALKTHROUGH.md),
[evidencia 2D](docs/TASK_2D_WALKTHROUGH.md), [evidencia 2G](docs/TASK_2G_WALKTHROUGH.md), [modelo](docs/DATABASE.md),
[seguridad](docs/SECURITY.md), [evidencia 2C](docs/TASK_2C_WALKTHROUGH.md).

## Ejecutar localmente

Requisitos: Node.js 22.13 o posterior y pnpm 11.19.0.

```bash
pnpm install
pnpm supabase:start
# Completar apps/web/.env.local con la URL y publishable key del stack LOCAL.
pnpm dev
```

Validaciones: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm --filter @canjeproyect/web test:env`,
`pnpm test:menu`, `pnpm test:auth` y `pnpm test:admin`. Tras build: `pnpm test:qa` y
`pnpm supabase:audit:secrets` (auditoría redacted de repo/env/logs/bundle). Integración real: `pnpm test:menu:local`,
`pnpm test:auth:local` y `pnpm test:admin:local`, secuenciales, sólo seed ficticio limpio/exclusivo, sin actividad
Auth/desarrollo concurrente; guardan/restauran fixtures, no reset automático.

Auth requiere puerto **5173 estricto**: `pnpm --filter @canjeproyect/web dev --port 5173 --strictPort` o ejecutar
Vite con esos argumentos en apps/web. Correo LOCAL: [Mailpit](http://127.0.0.1:54324).
Los correos no se envían a Internet. Registrar → abrir confirmación en Mailpit → perfil.
No iniciar suites exclusivas después de crear cuentas manuales sin preservarlas primero.

Para Supabase local se requiere Docker con contenedores Linux. Desde la raíz: `pnpm supabase:start`, `pnpm supabase:status`, `pnpm supabase:stop`. CLI de proyecto fijada (sin instalación global). Ver [workflow](docs/SUPABASE_WORKFLOW.md) para puertos, secretos, dos desarrolladores y targets local/dev/pilot. No se requiere cuenta ni proyecto hosted.

Pruebas sobre stack local recién reconstruido: `pnpm supabase:test:db`, `pnpm supabase:test:smoke`,
`pnpm supabase:test:authz`, `pnpm supabase:test:storage`, `pnpm supabase:types:check`.
Diagnóstico histórico **opcional**, fuera de DoD: `pnpm supabase:test:storage:orphan-probe`
reproduce el fallo del candidato DELETE, no el comportamiento esperado de aplicación ni una
policy permanente. Reset destructivo **sólo DB local**:
confirmar target/datos antes de `pnpm exec supabase db reset --local`. Sin reset/target remoto
automático. Reset no elimina payloads del volumen Storage. Suites exclusivas ficticias,
secuenciales, no ejecución simultánea con desarrollo/Auth; ver workflow antes de ejecutarlas.

El ejemplo público está en `apps/web/.env.example`; su copia privada es `apps/web/.env.local`. La Carta necesita URL y publishable key válidas y backend disponible; sin configuración muestra error controlado, **nunca mocks**. El build puede compilar sin env; eso no valida una conexión. Nunca usar secretos frontend.

La validación 2D se limita a loopback local. El antiguo comando Wi-Fi de frontend por sí solo **ya no conecta la Carta en un teléfono**: 127.0.0.1 sería el teléfono y env.ts rechaza HTTP no-loopback. No abrir firewall ni cambiar esa protección. Una prueba física con API accesible requiere un entorno autorizado posterior.

## Rutas de demostración

- `/`: Carta pública leída de Supabase; el seed LOCAL es ficticio/DEV-only.
- `/points`: saldo e historial mock.
- `/rewards`: recompensas mock, sin canje.
- `/login`, `/register`: ingreso/registro email+password LOCAL con confirmación email.
- `/profile`: sesión requerida, perfil DB propio y edición display_name, logout local.
- `/auth/callback`, `/auth/forgot-password`, `/auth/recovery`: confirmación y recuperación.
- `/auth/mfa`: TOTP opcional, QR sólo de enrollment, challenge y gestión mínima de factores.
- `/admin`: sesión + membership Valhalla actual; cliente sin membership ve Sin acceso.
- `/admin/categories`, `/admin/products`: catálogo propio activo/inactivo; create/update,
  precios ARS con centavos y nueva imagen Storage. Negocio inactivo sólo lectura. Sin DELETE.
- `/platform`: sesión + capacidad Platform actual + AAL2; AAL1 requiere /auth/mfa. Negocios globales sólo lectura.

## Estructura

```text
apps/web/                Frontend React/Vite/PWA
  src/assets/brand/      Assets originales por negocio
  src/app/               Bootstrap y rutas
  src/components/        Componentes compartidos
  src/features/preview/  Datos mock de Task 01
  src/features/menu/     Consulta pública, mapper, hook, contratos y cards
  src/features/auth/     Session store/provider, acceso self-profile, MFA y CSS de cuenta
  src/features/authority/ Memberships propias, RPC self, store/provider y guards Business/Platform
  src/features/admin/    Catálogo tipado, formularios, acciones y upload nuevo
  src/lib/               Env lazy y cliente browser compartido
  src/layouts/           Layouts customer/admin
  src/pages/             Skeletons de rutas
  src/styles/            Tokens y CSS global
packages/domain/         Reserva para contratos y reglas puras futuras
supabase/                Esquema local versionado, seed demo, pruebas, fixtures y tipos SQL
docs/                    Fuente de verdad del producto y la arquitectura
```

## Reglas de contribución

- Mantener los datos mock separados de la lógica futura.
- No colocar secretos en el repositorio. `.env.example` contiene solo nombres de variables previstas.
- No implementar decisiones abiertas sin registrarlas en `docs/DECISIONS.md`.
- Ningún componente frontend tendrá autoridad sobre puntos, canjes o vouchers.
- El logo suministrado se conserva sin redibujarlo ni generar variantes artificiales.

Git tiene remote `origin` y un deployment Vercel administrado por el usuario. 2H no lo
inspecciona/modifica ni hace commit, push o stage. Conexión LOCAL no equivale a hosted.
Admin/Platform aprobados manualmente por el usuario en el prompt 2H. No capturas nuevas
del agente ni certificación implícita de consola, teclado, viewports o PWA física.
Sin cuenta admin persistente preinstalada: provisionar membership LOCAL por canal privilegiado
según SUPABASE_WORKFLOW. A-S2-006 aprobada e implementada; ningún avance automático a hosted.
