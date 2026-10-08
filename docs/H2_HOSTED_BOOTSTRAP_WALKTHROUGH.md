# H2 — Auth Hosted + Real Bootstrap

> Registro histórico H2. Estado consolidado y dominio actual en
> [SPRINT_2_CLOSEOUT.md](SPRINT_2_CLOSEOUT.md). Identificadores de identidad humana
> omitidos en esta versión repo; la autorización exacta se conserva fuera de Git.

07/10/2026 (America/Buenos_Aires). **Estado: COMPLETADA / APROBADA.**
**HOSTED AUTH + INTERNAL REAL BOOTSTRAP VERIFIED.**
El usuario confirmó el reingreso personal y la validación visual/manual final correctos,
la Carta funcionando y el problema visual anterior resuelto. No queda blocker real de H2
interno. Este cierre actualiza únicamente documentación/evidencia; no nuevos cambios
funcionales, operaciones Hosted ni corridas de tests.
H1 permanece cerrada como **HOSTED FOUNDATION VERIFIED**. A-H2-001 sustituye el STOP
SMTP inicial exclusivamente para el bootstrap interno de una cuenta operadora autorizada.
No se habilitó el piloto externo. No iniciar H3 automáticamente.

Target exclusivo: Canje Proyecto / `liojmtsopplgzderrrqi`.
URL pública: https://liojmtsopplgzderrrqi.supabase.co.
Repo `main`, HEAD `80427801bc1a38c1b637d7565a5aa6782e12da28`.
Sin stage, commit ni push. Cambios H1 locales preservados.

Corrección posterior durante H3: el usuario precisó **https://valhallapp.vercel.app**
(doble l antes de app). Las URLs anteriores de este documento son el snapshot histórico
de A-H2-001; Site URL/redirects fueron sustituidos por los del dominio correcto como
ajuste de configuración H3. H2 permanece cerrada. Estado actual en
[Walkthrough H3](H3_VERCEL_HOSTED_SMOKE_WALKTHROUGH.md).

## Auth: antes y después

Inventario oficial read-only antes/después; publicación con CLI Supabase 2.119.0 y
config scratch que declara **sólo** Site URL y redirects. Plan revisado antes del write,
diff posterior sin cambios pendientes en esos dos campos. No se publicó config LOCAL.

| Campo | Antes H2 | Después A-H2-001 |
| --- | --- | --- |
| Site URL | http://localhost:3000 | https://valhalapp.vercel.app |
| Redirects | [] | Cuatro URLs exactas enumeradas abajo |
| Email/password / signup | Enabled / enabled | Sin cambio |
| Email confirmation | Enabled | Sin cambio; cuenta operadora confirmada por flujo normal |
| Flow | Implicit, browser-only | Sin cambio |
| TOTP enroll / verify | Enabled / enabled | Sin cambio |
| Custom SMTP | Disabled | Diferido para bootstrap interno |
| Google OAuth | Disabled | Sin cambio |
| Email frequency / OTP length | 1min / 8 | Sin cambio |
| Templates | Subjects visibles; cuerpos UNKNOWN | Sin modificación |
| Cuota email exacta del proyecto | UNKNOWN | Sin modificación ni cuota inferida |

Redirects aprobados/aplicados:

- https://valhalapp.vercel.app/auth/callback
- https://valhalapp.vercel.app/auth/recovery
- http://127.0.0.1:5173/auth/callback
- http://127.0.0.1:5173/auth/recovery

Los dos loopback se necesitan para verificar la SPA local contra Hosted antes de conectar
Vercel. Sólo puerto5173 y rutas exactas; no localhost adicional, wildcard ni previews.
Los límites observados permanecen: SMS30/h; anonymous30/h/IP; refresh150/5min/IP;
sign-in/signup30/5min/IP y verification30/5min/IP. No se redujo ninguna protección.

Confirmation y recovery conservan subjects “Confirm your email address” y “Reset your
password”. Los cuerpos completos no fueron accesibles de manera fiable con este tooling:
**UNKNOWN; revisar al configurar correo para piloto externo**. No se inventaron bodies,
URLs manuales ni tokens. Confirmation real recibida/completada por el operador; recovery
email no enviado durante este bootstrap. H2 interno no certifica delivery productiva.

## A-H2-SMTP — hard gate para piloto externo

**Custom SMTP + dominio autenticado requeridos antes de external pilot.** Bloquea registro
de usuarios externos, clientes reales de Valhalla y lanzamiento público. Resend es la
preferencia arquitectónica futura; no se creó cuenta, dominio, proveedor ni credencial,
y el código de app no depende de un proveedor. No se eludió la restricción del default,
se autoconfirmó vía SQL ni se deshabilitó confirmation.

El default de Supabase se autorizó sólo para esta cuenta interna, con email de miembro
autorizado del proyecto/organización. El usuario informó “Cuenta confirmada y perfil visible”.
La DB confirma email confirmado; no se consultó ni publicó el email completo.
[Restricciones oficiales del SMTP default](https://supabase.com/docs/guides/auth/auth-smtp).
La cuota publicada del servicio no equivale a una medición de la cuota exacta del proyecto.

## Identidad real y Platform

Identidad operadora confirmada por UUID y autorización exacta conservados fuera del repo;
sin identificador personal publicado ni hardcoded en frontend. Una sola identidad Auth real,
confirmada mediante signup/email/password normal. El trigger creó exactamente un profile.

Antes de escribir se verificaron identidad confirmada, profile y ausencia de Platform.
El usuario autorizó explícitamente la fila para este UUID inmediatamente antes del INSERT.
La transacción insertó únicamente `private.platform_admins(user_id)` y la lectura posterior
confirmó una fila y cero memberships. Sin metadata/roles en profiles, GRANT, DDL o upsert.
La capacidad Platform no crea Business Admin. Las policies globales siguen exigiendo AAL2.

La UI real, con la sesión Hosted, mostró `Sesión: aal1` y pidió segundo factor al abrir
Platform. Esto comprueba el gate de la app; no se presenta como una nueva prueba directa
del endpoint global RLS. La matriz JWT H1 y sus policies exactas permanecen como evidencia
del backend. El operador completó MFA/TOTP personalmente; Auth confirma un solo factor
verificado y cero factores pendientes. La pestaña real mostró Negocios, Platform sólo
lectura y luego Valhalla Space; una recarga completa restauró la sesión AAL2 y esa vista.
Una pestaña intermedia había mostrado AAL1 y fue verificada nuevamente antes de provisionar.
No se desactivó MFA ni se agregó un segundo factor.

## Valhalla y catálogo

Bootstrap ejecutado después de MFA y verificación Platform:

| Dato | Valor aprobado |
| --- | --- |
| name / slug | Valhalla Space / valhalla-space |
| currency / timezone | ARS / America/Argentina/Cordoba |
| is_active | true |
| currency_per_point / points_enabled | 1000.00 / true |
| Business UUID | 8c4f35a1-fd7d-4975-a94a-297706dcdad9, generado por DB Hosted |
| Membership | Operator UUID confirmado, role admin; capacidad independiente |

La zona Cordoba existe en el catálogo PostgreSQL. Se creó un único business, settings
y membership role admin en una transacción, con guardas de identidad/factor verificado
y ausencia previa de negocios/memberships/catálogo. Lectura posterior confirmó los valores
exactos y UUID generado. Sin schema change ni sobrescritura silenciosa.
Loyalty configura preview visual únicamente, sin ledger/balance/acreditación/economía.

No hay datos comerciales aprobados. **Catálogo e imágenes permanecen vacíos.** No crear
categorías/productos/precios ficticios, subir imágenes demo ni ejecutar seed.sql. Pruebas
de edición/upload/Carta con producto real se posponen hasta contar con datos y assets
aprobados. La Carta vacía se verificó como estado controlado. El último inventario Hosted
confirmó cero categorías, productos y objetos Storage; no se informó carga comercial nueva.

## Evidencia y verificación

Preparación: ocho documentos contractuales leídos; target/branch/HEAD correctos; cinco
migrations en history; preflight sin fixtures H1 residuales. No reset/pull/repair remoto.
Migrations, config LOCAL, seed, packages y lockfile intactos. No nuevas fixtures H2.

SPA local en http://127.0.0.1:5173 conectada al target Hosted mediante URL/publicable key
en entorno del proceso. No .env ni key en docs/logs. Únicas correcciones de producto:
texto de confirmation neutral respecto al proveedor de correo y etiqueta de cuenta.
Compiler TypeScript instalado: PASS. No arquitectura/Auth flow modificado.

| Journey real H2 | Estado |
| --- | --- |
| Signup / email confirmation / profile | PASS: intervención humana y verificación DB |
| Platform row | PASS: autorización exacta, INSERT único, lectura posterior |
| Platform AAL1 gate UI | PASS: exige segundo factor |
| MFA real / Platform AAL2 | PASS: un factor verificado, vista global real read-only |
| Login / logout / restore | PASS: logout/restore observados por agente; reingreso final confirmado personalmente por usuario |
| Valhalla / loyalty / membership | PASS: una fila de cada tipo, valores exactos |
| /admin y Carta vacía Hosted | PASS: 0 categorías/0 productos; «La carta se está preparando» |
| Global Platform writes | PASS estructural: policies/grants exactos; ninguna policy global de escritura |
| Customer AAL2 sin Platform / revocación same JWT | PASS H1 histórico; no repetir sobre cuenta humana |
| Catálogo / imágenes reales | Vacíos por ausencia de datos comerciales aprobados |
| Validación visual/manual final | PASS declarado por usuario: Carta correcta y problema visual anterior resuelto |

No passwords, JWT, refresh tokens, TOTP secret/QR, service role, secret keys ni DB password
en chat/repo/docs/logs. Las credenciales de usuario permanecen en el flujo normal del SDK.
No cleanup de la cuenta real ni revocación experimental de su autoridad.

Revalidación final Hosted read-only: **PASS, diez checks**. Las 27 policies, 168 checks
de ACL de tabla y 552 de columna coinciden con H1; cero drift crítico, cero grants de app
inesperados. Helpers/RPC, constraints, indexes, triggers, bucket/RLS y cinco migrations
coinciden. Cero Edge Functions desplegadas. Diferencias de ACL Storage managed inventariadas,
sin modificarlas ni tratarlas como drift de aplicación. Requests reales con publishable key:
private GET406, storage GET406, Valhalla público200/1 fila y menu_items200/0 filas.
Esto complementa la matriz JWT real H1 sin reejecutarla ni fingir nuevos actores.
TypeScript --noEmit PASS con acceso a dependencias locales; guard de Storage PASS1/0.
La tanda concurrente inicial de CLI fue interrumpida por espera; revalidación secuencial
acotada completó sin writes. No error de seguridad ni bootstrap repetido.

## Cierre y siguiente fase

H2 **COMPLETADA / APROBADA** por evidencia técnica PASS y confirmación humana final.
Auth Hosted funciona para el operador interno; Valhalla real, loyalty settings y Business
Admin membership independiente están persistidos. Platform global READ funciona con
MFA/AAL2 y no concede global writes. Admin, perfil, sesión y Carta vacía/controlada pasan.
No se requiere otra intervención humana ni configuración SMTP para cerrar este alcance
interno. No reabrir H1 por diferencias managed que no alteran sus garantías.

Persistencia mínima verificada: una identidad Auth confirmada, un profile, una fila Platform,
un business Valhalla, un loyalty settings, una membership admin y un factor TOTP verificado;
cero factores pendientes, categorías, productos y objetos Storage. Son datos reales
autorizados que se conservan, no fixtures para limpiar. Cero nuevas fixtures H2.

**A-H2-SMTP sigue HARD GATE antes de usuarios externos/clientes/lanzamiento público.**
Custom SMTP/dominio autenticado, templates finales, cuota efectiva y delivery/recovery
productivos deben resolverse antes de external pilot. UNKNOWN de cuota/cuerpos y recovery
no enviado limitan esa certificación futura, sin bloquear el bootstrap interno aprobado.
Google OAuth permanece pendiente de una tarea explícita; economía/Sprint 3 fuera de scope.

Fuente de verdad: DB Hosted (Carta/profile), Storage Hosted (assets aprobados futuros),
memberships/private.platform_admins (autoridad), Auth Hosted (email/AAL). Sin mock fallback.
No Google OAuth, economía, seed demo, global Platform writes, secrets de servidor en browser
ni configuración Vercel.

Siguiente paso recomendado: **H3 — VERCEL CONNECTION & HOSTED SMOKE**, en una tarea
explícitamente autorizada. Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`
del target aprobado, redeploy de https://valhalapp.vercel.app y smoke HTTPS de Carta,
Auth/callback/profile, Admin y Platform MFA/read-only. Revisar recovery/redirect sin
wildcards ni credenciales de servidor. Vercel aún no está conectado a este Hosted: H2
no configuró env ni ejecutó redeploy/smoke HTTPS. No iniciar H3 en este cierre, ni habilitar
usuarios externos hasta resolver A-H2-SMTP.

Evidencia actual: outputs/H2_HOSTED_BOOTSTRAP_EVIDENCE.json y capturas Platform/Admin/Carta
sin datos personales. H2_PREPARATION_EVIDENCE.json es el snapshot histórico de STOP SMTP
anterior a A-H2-001; queda supersedido por la evidencia actual, no describe el estado vigente.
