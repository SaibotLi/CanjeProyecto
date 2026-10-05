# Task 2E — Auth Frontend, Session Lifecycle & MFA

05/10/2026. **TASK 2E COMPLETADA/APROBADA por el usuario en el prompt de Task 2F.**

Nota posterior 2H: se corrigió la discrepancia UX max100 de display_name a max80 para
respetar el CHECK DB ya existente. Min8 refiere password; no se cambió su contrato.
Las pruebas y límites de la entrega original abajo se conservan como historia.
Implementación y pruebas exclusivamente LOCAL. No aprobación visual inferida de SDK/SSR.

## Cierre visual/manual aportado por el usuario

El prompt 2F confirma validación humana real de login, register, profile, recovery,
navegación, responsive, tabs/rutas y comportamiento visual general, todo correcto.
Se registra esa evidencia y autorización de 2F, no capturas del agente ni comprobaciones
individuales de QR/MFA, consola, PWA instalada o dispositivos que el usuario no declaró.
Los apartados siguientes conservan la historia de la entrega, incluido el bloqueo anterior.
PWA física, cross-device y hardening siguen gates de 2H. Google OAuth no es blocker.

## 1. Executive summary

Auth email/password real, confirmation Mailpit, login/logout local, restore/refresh/cambio
de cuenta, perfil DB propio/display_name, recovery y TOTP opcional integrados con branding.
Cliente único y session store/provider; ninguna autoridad de negocio/platform en UI.
Cuatro migrations/seed/tipos intactos; config Auth LOCAL cambia sólo confirmation/redirects.
GoTrue/PostgREST/Mailpit reales y regresiones PASS; Browser Use sigue denegando loopback.
Se dejan Supabase/Vite activos para revisión humana, sin hosted/Vercel/Git writes.

Preparación: README/TODOS docs, source/client/env/routing/layouts/PWA/config, trigger/profile
RLS y SDK fijado revisados antes de editar; documentación oficial actual contrastada con
source SDK 2.117.2. Worktree previo preservado. No delegación ni nueva conversación.

## 2. Auth flow elegido y evidencia

**ADR IMPLICIT CLOSED** para React/Vite SPA/PWA browser-only, sin SSR ni backend web de sesión.
Oficialmente soportado; SDK procesa fragment/persistencia. PKCE necesita verifier del
contexto original, innecesario para esta arquitectura. Antes de implementar UI se habilitó
config LOCAL y se probó realmente GoTrue + mail + SDK: confirmation/recovery con storage
previo y limpio, sesión correcta, evento PASSWORD_RECOVERY y fragment final limpio.
Prueba repetida después con opciones productivas y callback app. Nunca tokens fabricados.

Los contextos se modelan con adapter de URL/window en Node, **no navegador real**. No cierra
gates físicos PWA/otro dispositivo/hosted, ni promete storage compartido entre PWA y browser.
Si aparece SSR o una exigencia servidor, reabrir ADR antes de cambiar flow.
[Implicit](https://supabase.com/docs/guides/auth/sessions/implicit-flow),
[PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

## 3. Supabase client final

Un singleton lazy getSupabaseClient, SDK oficial **2.117.2** fijado, tipado Database.
browserAuthOptions explícitas: flowType implicit, persistSession true, autoRefreshToken true,
detectSessionInUrl true, debug false. Env validado antes de createClient; sólo URL/public key.
SDK chunk separado iniciado en bootstrap antes de consumers. Error de env → cuentas no
disponibles/Carta error controlado, nunca secreto ni mock. Sin nueva dependencia.

## 4. Session lifecycle

createAuthStore es la única fuente, AuthProvider/useSyncExternalStore expone sesión/user
(session.user), profile, inicialización, assurance y store.signOut/reload. SDK subscription
antes de consumidores, cleanup al desmontar/StrictMode. INITIAL_SESSION único snapshot
inicial, sin getSession competidor. Eventos SIGNED_IN/OUT, TOKEN_REFRESHED, USER_UPDATED,
PASSWORD_RECOVERY y MFA_CHALLENGE_VERIFIED actualizan estado.
Callbacks síncronos; profile/AAL diferidos fuera del callback. Timers boot/reload separados.
epoch+request generation descartan respuestas antiguas de A tras logout/B; AAL anterior
se limpia al reemplazar sesión. Tests incluyen demora artificial y logout fallido.
[Eventos oficiales](https://supabase.com/docs/reference/javascript/auth-onauthstatechange).

## 5. Routes

| Ruta | Contrato |
| --- | --- |
| /login | Email/password; link registro/recovery |
| /register | Signup sin metadata; confirmación requerida |
| /profile | Guard de sesión, self profile DB, display_name, logout |
| /auth/callback | SDK confirmation; inválido/usado/malformed/directo controlado |
| /auth/forgot-password | Request público, respuesta genérica anti-enumeración |
| /auth/recovery | PASSWORD_RECOVERY + sesión; nueva contraseña |
| /auth/mfa | Guard de sesión; TOTP/assurance/gestión mínima |

Carta sigue pública; points/rewards mocks explícitos. /admin conserva placeholder público
sin permisos/operaciones. No /platform funcional, membership UI ni authority guard de 2F.

## 6. Signup

email/password/confirm password, labels/autocomplete, min8 UI, submit único/deshabilitado.
signUp sólo options.emailRedirectTo; nada de role/business/platform/display_name metadata.
GoTrue crea user + trigger profile id-only ya aprobado; session null hasta confirmación.
Mensaje genérico “si corresponde recibirás correo”, sin enumeración de cuentas. Password
no fuera del form/SDK, sin log ni persistencia. Backend minimum sigue config existente;
min8 es validación UX, no nuevo contrato backend.

## 7. Email confirmation

auth.email.enable_confirmations=true reproducible; correo real capturado por Mailpit LOCAL.
Link GoTrue verify redirige a /auth/callback, SDK obtiene usuario/sesión y limpia fragment.
Callback app distingue éxito SDK de directo/malformed que no debe reutilizar login previo.
Links usados/expirados producen estado humano seguro, sin mostrar error_description crudo.
Confirmación pendiente rechaza login con email_not_confirmed. Mailpit no envía a Internet.
[Email/password y Mailpit](https://supabase.com/docs/guides/auth/passwords).

## 8. Login

signInWithPassword real. Idle/submitting/success/invalid credentials/confirmation pendiente/
red-server con mensajes allowlist; nunca raw diagnostics. Sin doble submit/password-manager
blocking. Después de login se consulta assurance oficial: verified factor pendiente lleva
a /auth/mfa; sin MFA a /profile. No infiere rol por email/metadata/constante.

## 9. Logout

SDK signOut({scope:local}); no cierra otras sesiones. Estado React/profile/assurance/recovery
ocultos antes del request. SIGNED_OUT limpia; fracaso se reporta y exige reintento antes de
otro login. SDK eventos de refresh no resucitan identidad oculta mientras failure/reintento.
No localStorage.clear ni copia custom de JWT. Tests A→logout→B: ninguna snapshot de B con
perfil A; Carta idéntica anon/B. Revocación de refresh no invalida JWT ya emitido hasta expiry.
[Scope y límites](https://supabase.com/docs/reference/javascript/auth-signout).

## 10. Profile

authData readProfile: select id,display_name,created_at,updated_at + eq(id,current user),
single, mapper explícito guardando owner. También con Platform AAL2 global READ sigue self.
Email desde Auth, no public.profiles. updateDisplayName payload sólo display_name trim/null
y id propio; max100 UX. Nunca INSERT/id/timestamps/roles/puntos editable. Loading/error/retry/
save status. Form keyed por identidad impide drafts de A en B. Sin ampliar RLS.

## 11. Recovery/password reset

resetPasswordForEmail → correo → /auth/recovery → SDK PASSWORD_RECOVERY → form →
updateUser({password}) → confirmación/sesión iniciada. Sesión normal o ruta directa no basta.
Evento efímero; recargar form después de consumir fragment requiere nuevo enlace (no token
custom persistido). Cuenta con factor verified solicita challenge legítimo antes de update.
Tests reales: new password accepted, old rejected, used/expired/malformed/direct sin form.
Expiry de confirmation viable por sent_at de fixture propia; no bajar timeout global.
Formulario recovery permanece efímero hasta salir a profile, que consume el contexto.

## 12. Redirect/callback behavior

Site URL http://127.0.0.1:5173. Lista exacta:

- http://127.0.0.1:5173/auth/callback
- http://127.0.0.1:5173/auth/recovery
- http://localhost:5173/auth/callback
- http://localhost:5173/auth/recovery

App construye path fijo desde origin actual, sin returnTo externo/open redirect. Puerto 5173
estricto. Tokens procesados por SDK, no parser access_token/refresh_token app. Después de
initialize se limpia URL Auth por history.replaceState; no query/hash sensibles en UI/logs.
No prometer eliminación de historial previo del browser ni links seguros para compartir.
[Redirects](https://supabase.com/docs/guides/auth/redirect-urls).

## 13. PWA auth behavior

Retirada sólo regex /auth/ de navigateFallbackDenylist. /api/ sigue excluido; runtimeCaching=[]
y precache sólo archivos shell. Callback/recovery pueden obtener SPA fallback, no se cachea
API Auth/profile/email/token ni se habilitan operaciones offline. Build/SW y HTTP directo
verificados técnicamente; no afirmar prueba de instalación, reload offline o upgrade PWA.
El host futuro debe configurar rewrite SPA. SMTP, HTTPS, dominio y pruebas de PWA instalada
quedan pendientes para 2H.

## 14. Session persistence/refresh

SDK persistence real con adapter de storage: login → dispose/recrear cliente → INITIAL_SESSION/
profile; refreshSession contra GoTrue → TOKEN_REFRESHED → estado actualizado/Carta igual.
No prueba visual de cerrar/reabrir pestaña. Opción autoRefreshToken true, ticker foreground
gestionado por SDK; prueba ejecuta refresh real explícito, no espera un TTL de una hora.
Para expired/invalid fixture se revocan sólo sesiones propias y se adelanta Date.now de test:
SDK descarta sesión expirada al fallar refresh, profile null. JWT nunca editado/fabricado.
SDK2.117.2 preserva access token aún vigente cuando falla refresh anticipado; se documenta
este comportamiento, no se presenta una revocación retroactiva garantizada.

## 15. Cross-browser/context tests

A/B confirmation y C/D recovery PASS del contrato GoTrue/SDK: context storage previo y
vacío. Reciben link real, no verifier/copias manuales; sesión del destinatario correcto.
Adapter sdkWindow/memoryStorage no automatiza UI ni elude Browser Use.
E instalación PWA→browser normal y dispositivos físicos NO probados; loopback es local al
dispositivo. Pendientes revisión humana local y entorno hosted explícitamente autorizado en 2H.
Link establece sesión donde se abre; no garantiza trasladar sesión al storage de otra app.

## 16. MFA enrollment

TOTP oficial opcional: listFactors.all incluye verified/unverified. enroll retorna QR/secret,
mostrados sólo durante configuración; el SVG del SDK se codifica para que los colores con
`#` no trunquen la URL del QR.
No asset/secret persistido ni captura de documentación. Cancelar retira factor unverified;
salir abandona configuración local y deja pending visible para retiro/reinicio. Nunca reenroll
automático al montar ni efectos StrictMode crean factores duplicados.
[TOTP oficial](https://supabase.com/docs/guides/auth/auth-mfa/totp).

## 17. MFA challenge/verify

verifyTotp valida seis dígitos → mfa.challenge → mfa.verify. Un código incorrecto no eleva
la sesión; uno correcto produce AAL2 genuino y el evento del SDK. En el siguiente login
AAL1, se ofrece verificar el factor si el nivel siguiente es AAL2.
Pendiente validar manualmente la app y el QR. Retirar un factor verificado requiere AAL2,
confirmación explícita y refreshSession para bajar inmediatamente el nivel de la sesión.
No se implementó recuperación de emergencia.
[Unenroll y refresh](https://supabase.com/docs/guides/auth/auth-mfa#add-unenroll-flow).

## 18. AAL1/AAL2 behavior

Sólo getAuthenticatorAssuranceLevel oficial, nunca decode JWT frontend. Niveles no roles.
Customer AAL2 sigue sin global; Platform fixture actual+AAL1 no global; misma identidad+AAL2
SELECT global permitido. readProfile app conserva self filter. Quitar fila platform con el
mismo JWT AAL2 niega siguiente global; ningún global write. DB autoridad vigente intacta.
Runbook privilegiado de MFA perdido/recuperación/reautenticación requerido antes del piloto.

## 19. Carta bajo sesiones

Hook escucha revisión Auth y aborta lectura previa al cambiar/refresh/logout; misma query
publicada con business/category/item is_active explícitos. No mock/API cache, imagen URL/
preview/centavos sin cambio. Suites 2D bajo anon/customer/Admin A/B/Both/Platform AAL1/AAL2
repetidas con JWT reales, mutaciones DEV restauradas. Auth suite también compara Carta antes/
después de login, logout, refresh, Customer AAL2, Platform AAL2, revocación y refresh inválido.
Transiciones visuales/loading/foco/sticky en navegador aún no observadas.

## 20. Security audit

Fuente/bundle: sin secreto real/service_role credential/DB password/Auth Admin API/role UI/
custom JWT storage/autoridad metadata. Backend cuatro migrations/seed/tipos hashes intactos.
Signup metadata vacía en fuente y DB; profile sólo columnas existentes; email sólo Auth.
SDK debug off y errores allowlist; contraseñas/TOTP efímeros en los formularios, sin cache
de respuestas privadas en el service worker.
No XSS/CSP/hosted/SMTP/endpoint-compromise audit productivo implícito. MFA2 ≠ Platform.
Browser Use bloqueado se respeta; ninguna acción UI auth/password automatizada.

## 21. Automated Auth tests

test:auth: **11 PASS**, fuente real TypeScript con loader ya existente, sin framework nuevo.
Cubre reducer/store, carga inicial, guard y eventos; respuestas tardías de A al cambiar a B;
logout fallido/reintento; mapper y UPDATE del perfil propio; signup sin metadata; redirects
de recovery; contrato challenge/verify; codificación del QR; mensajes seguros y formularios
SSR con labels/autocomplete. Incluye callback malformado con sesión previa y reconexión
StrictMode después de limpiar la URL, que debe seguir rechazado.
SSR/state tests no prueban foco ni interacción real de React/forms en navegador.

## 22. Real LOCAL Auth integration

test:auth:local: **13 PASS** (3 de flow proof + 10 de lifecycle, incluidos dos tests contenedores),
sin skips/todo. Usa cliente oficial, GoTrue/PostgREST/Mailpit y el store/data/query de la app.
Cubre signup y confirmación; trigger mínimo de perfil y metadata; login válido/inválido;
UPDATE propio; restore/refresh; logout y cambio a B; recovery/cambio de contraseña con rechazo
de la anterior; enlaces válidos, usados, expirados, malformados y acceso directo; cancelación
de enrollment no verificado; TOTP/AAL2; challenge en login; retiro de factor y refresh;
revocación de autoridad global con el mismo JWT.
El reloj de test fuerza expiry sin modificar JWT. SQL privilegiado se limita a guards,
provisión/revocación/limpieza de fixtures; assertions con publishable key y JWT firmado real.
Se eliminaron sólo los emails e IDs de correo propios. Sin reset automático ni cuentas reales;
seed lógico restaurado.

## 23. Backend regressions

Reejecutadas sobre LOCAL exclusivo, con email confirmations habilitadas:

| Suite | Resultado |
| --- | --- |
| pgTAP estructura/inventario 2B/2C/2G | 1.092 PASS, 5 archivos |
| Authorization REST/Auth 2C | 31 PASS |
| Storage 2G | 24 PASS, DELETE DENY definitivo |
| Smoke | 6 PASS |
| Menu LOCAL 2D | 11 PASS, siete variantes de acceso |

Legacy signup helper adapta confirmación real Mailpit/GoTrue, no SQL auto-confirm, sin cambiar
assertions/autoridad. Smoke retira su email propio. No orphan-probe/policies temporales.
No db reset requerido/ejecutado en 2E; restart conserva volúmenes/datos. Tests estructurales
usan su transacción habitual y smoke su fixture de fallo ya aprobada, sin schema nuevo persistido.

## 24. lint/typecheck/build/etc.

lint con cero warnings; typecheck; build/PWA; test:env (6); test:menu (10); test:auth (11);
test:auth:local (13); types check sin drift y todas las regresiones anteriores: **PASS**.
Las regresiones backend se repitieron al cerrar, nuevamente sin fallos.
Build: 124 módulos; JS principal 358,27 kB (gzip 113,66 kB), chunk SDK 224,44 kB
(gzip 58,82 kB), CSS 24,47 kB. PWA: 11 archivos estáticos precache, 679,87 KiB;
ninguna advertencia de chunk mayor a 500 kB.
git diff --check y hashes de alcance verificados. Bundle sin credenciales sensibles;
sólo configuración pública LOCAL inyectada en memoria. No cambio de versiones/lockfile por 2E.
Los checks HTTP 200 de las rutas comprueban disponibilidad, no aprobación visual.

## 25. Visual/manual state — evidencia histórica previa al cierre humano

**PENDIENTE/BLOQUEADA para el agente**. Se leyó skill computer-use y guidance; Browser Use
reintentó únicamente la pestaña IAB existente. Respuesta literal:

> Browser Use rejected this action due to browser security policy. Reason: A saved user permission setting blocks this action. Browser use cannot access http://127.0.0.1:5173 because the user has a saved preference that blocks it.

Cero capturas nuevas y consola del navegador no inspeccionada. Sin cambiar permisos ni usar
otro navegador, CDP/Playwright, control nativo, workaround o hosted. Las pruebas SDK Node
NO sustituyen esa inspección.

Revisión solicitada al usuario: 390×844 primero, luego 360/430/768/1280 px. Recorrer
login/register/recovery/profile/MFA; labels, autofill, teclado, foco/Tab, errores, loading,
submit deshabilitado, doble submit, emails largos, overflow, bottom navigation y safe areas.
Comprobar QR escaneable, cancelación/challenge, cambio de cuenta/reload y consola, sin
compartir tokens, secretos ni contraseñas. Recorrer Carta durante Auth y verificar que no
quedan drafts privados ni regresiones de layout.
Mails: http://127.0.0.1:54324. URL app: http://127.0.0.1:5173. No tests exclusivos mientras
se crean/usan cuentas manuales; datos humanos no se eliminan por suites.

## 26. Docs modified

README raíz/web/lib; ARCHITECTURE, SECURITY, DECISIONS, SUPABASE_WORKFLOW, ROADMAP,
PROJECT_BLUEPRINT, SPRINT_2_ARCHITECTURE; DATABASE/UI_GUIDE sincronizados; este walkthrough.
TASK_2D_WALKTHROUGH registra cierre humano conservando historia del bloqueo. 2A/B/C/G
walkthroughs históricos intactos. No marcar Admin/Platform UI/hosted/economía completos.

## 27. Warnings/limitations

La entrega original tenía visual Auth pendiente; cerrado después por el usuario al pedir 2F.
PWA instalada, enlaces externos, dispositivos físicos, SMTP, CSP
y hosting quedan para 2H. El adapter Node del SDK modela URLs, no un navegador ni un
workaround de permisos. Flow proof recrea clientes con la misma storage key dentro del
mismo proceso para representar recargas: SDK puede advertir “Multiple GoTrueClient instances”.
Es una advertencia del harness, no una certificación de la consola del navegador. Productivo
usa singleton; no se silenció el warning ni se modificaron internals del SDK.
Eventos Auth, upgrade de PWA, presentación y autofill deben revisarse humanamente.
Min8/max100 son validaciones UX. Al abandonar enrollment queda un factor pendiente visible,
sin secreto recuperable; cancelar explícitamente sí lo retira.
Un refresh inválido anticipado no garantiza logout inmediato mientras el access token sea
vigente; SDK elimina la sesión al expiry. Revocar la fila platform niega autoridad global
en el siguiente request, incluso con el mismo JWT AAL2.
No recuperación de emergencia MFA ni guards de autoridad. Las cuentas manuales bloquearán
las suites exclusivas: preservarlas y no hacer reset ciego. Docker publica puertos: usar
sólo red confiable y detener los servicios cuando termine la revisión.

## 28. Diff summary

Nuevos features/auth store/provider/context/guard/data/status/CSS; AuthPage/Callback/Recovery/
MfaPage y ProfilePage real. Bootstrap/router/client y aviso del layout ajustados sólo para Auth.
usePublicMenu revalida ante eventos Auth; Vite permite fallback de /auth. Scripts unitarios y
locales de Auth en raíz/web; tests de fuente, SSR, adapter SDK e integración LOCAL real.
Config de confirmation/redirects; helper de correo fixture; confirmación de signup legacy y
cleanup de smoke. Docs sincronizados, sin nuevos assets del menú.
El worktree ya tenía 2A/B/C/G/D: no atribuir el diff global completo a 2E.
Nada stageado ni commiteado.

## 29. Confirmación de scope

NO Admin UI, Platform console, provisión de memberships por UI ni usuario Platform real.
NO hosted/Vercel, OAuth, magic link como feature, phone ni anonymous Auth.
NO autoridad frontend/metadata, Auth Admin API ni secreto de backend en browser.
NO migrations, RLS, schema, grants, helpers ni triggers nuevos o editados: no se necesitaron.
NO upload/delete de imágenes UI, arreglo de imágenes seed ni lifecycle/cleanup.
NO economía, ledger, compras, balance, rewards, vouchers ni QR customer; sólo QR TOTP requerido.
NO commit/push/stage. Fixtures backend existentes y reloj de test son diagnóstico LOCAL,
no cambios productivos.

## 30. Recomendación exacta para Task 2F

El usuario cerró el gate visual/manual y autorizó 2F mediante su nuevo prompt. La siguiente
recomendación conserva el alcance propuesto, no inicia tareas automáticamente.
Próximo alcance sugerido: “Task 2F LOCAL — experiencia autorizada por autoridad DB actual:
guards Business Admin por membership del tenant y Platform por fila vigente + AAL2;
estados sin permisos, MFA requerido y revocación. Mantener private fuera de REST; diseñar
acceso UI sin secreto, RPC privilegiada ni autoridad de metadata. Revisar V2/SECURITY/2C/2G/
2D/2E; respetar negocio activo para writes y READ propio en negocios inactivos.
Cero hosted/economía/global writes/commit/push. Documentar y
STOP si necesita grants/RLS/helper/schema/endpoint no aprobado.” Administración funcional
y uploads sólo si el futuro prompt lo incluye explícitamente; 2E no los implementa.

## Estado operativo final

Supabase LOCAL + Vite puerto 5173 permanecen activos para revisión del usuario. Config
Auth aplicada con stop/start normal, sin reset ni eliminación de datos humanos. Vite usa
URL/publishable key LOCAL sólo en memoria del proceso; no archivo .env.local creado o
sobrescrito por 2E. Users/profiles/memberships/platform/objetos Storage de fixture: cero al terminar;
seed checksum 5bc80b32792095fb6cf02694de9626a1. Sin policies temporales ni acceso remoto.

Comprobación final: bucket `menu-images` PUBLIC, límite 5.242.880 bytes, cero DELETE policies
en `storage.objects`. Los hashes SHA-256 de las cuatro migrations, seed y tipos coinciden
con el estado previo a 2E. App y todas las rutas Auth responden HTTP 200; Mailpit responde
200 y quedó sin correos de fixture. Estos checks de disponibilidad no son evidencia visual.
