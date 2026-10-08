# @canjeproyect/web

Frontend React/Vite/TypeScript, React Router, Tailwind, CSS tokens y PWA; Carta Task 02B aprobada.

Production https://valhallapp.vercel.app conecta al Supabase Hosted aprobado con únicamente
VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY públicas. Vercel root apps/web, Vite/Node24.x;
vercel.json conserva fallback SPA a index.html. Auth/Admin/Platform MFA read-only operativos.
Catálogo vacío, puntos estimativos y puntos/premios demo; external pilot bloqueado por SMTP
custom/dominio autenticado. [Cierre actual](../../docs/SPRINT_2_CLOSEOUT.md).

Desde la raíz: `pnpm install`, Docker operativo, `pnpm supabase:start`, completar únicamente URL/publishable key LOCAL en apps/web/.env.local y `pnpm dev`. La Carta necesita backend; configuración ausente/fallo muestra error, no mock. El build no inicializa el cliente ni requiere env.

Carta lee Supabase → query → mapper → contratos → cards; sin mocks ante fallo.
Task 2D aprobada visualmente por el usuario. Task 2E agrega /login, /register, /profile
privado, /auth/callback, /auth/forgot-password, /auth/recovery y /auth/mfa.
AuthProvider/sessionStore es la única fuente de sesión; cliente oficial 2.117.2 compartido,
implicit/persist/refresh/detectURL explícitos. Env local aquí; puerto 5173 estricto.
2E COMPLETADA/APROBADA por revisión humana declarada en prompt 2F. Puntos/rewards siguen mocks.
2F habilita /admin, /admin/categories y /admin/products por membership actual de Valhalla:
create/update catálogo, precios con centavos y upload nuevo, sin DELETE. Inactivo readonly.
AuthorityProvider separado, refetch por boundaries/antes de writes; PostgreSQL sigue autoridad.
Platform implementado bajo A-S2-006 APPROVED: RPC sin parámetros devuelve boolean self,
sin AAL; /platform combina con AAL SDK y muestra negocios sólo lectura. AAL1 pide MFA.
private sigue fuera de REST; 2F COMPLETADA/APROBADA por el usuario en el prompt 2H.
Ver ../../docs/TASK_2F_WALKTHROUGH.md y ../../docs/SUPABASE_WORKFLOW.md para revisión manual.

Pruebas: test:menu, test:auth y test:admin (fuente real/SSR); test:menu:local, test:auth:local y test:admin:local
(SDK/GoTrue/REST/Mailpit reales). Tests de URL usan adapter Node, no navegador visual.
Suites LOCAL exclusivas/secuenciales, cero cuentas ajenas, cleanup propio; nunca hosted.
2H cierra QA LOCAL: ver ../../docs/TASK_2H_WALKTHROUGH.md y ../../docs/SPRINT_2_CLOSEOUT.md.
test:qa se ejecuta después de build (SSR/PWA estática), no sustituye browser físico.
Las suites anteriores siguen LOCAL exclusivamente; Hosted conserva el operador/bootstrap
real de H2. No reset ni suites de fixtures LOCAL sobre Production; no avance automático a economía.
