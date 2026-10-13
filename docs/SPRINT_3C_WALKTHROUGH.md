# Sprint 3C — interfaz económica LOCAL

> Registro de la fase LOCAL. Backend Hosted aplicado después bajo A-S3D-001; frontend
> Production aún Sprint 2. [Estado actual y gates 3D](SPRINT_3D_HOSTED_ROLLOUT.md).

13/10/2026. Contrato backend: [Sprint 3B](SPRINT_3B_BACKEND.md). Las seis migrations,
RLS, grants, Auth y Storage permanecen intactos. Hosted conserva Sprint 2.
Rama `codex/sprint-3`; backend 3B resguardado primero en commit `f39a263`.
Sin push a main, deployment de producción ni inicio de 3D.
**SPRINT 3C VERIFIED LOCAL.** Fixtures limpiados y stack detenido con volúmenes conservados.

## Circuito entregado

`/points` requiere sesión: código personal legible/copiable, saldo completo por negocio
y movimientos reales paginados. Actualiza al entrar, recuperar foco o manualmente;
conserva la última lectura del mismo dueño durante errores recuperables. Ya no usa mocks.
El negocio se resuelve por slug desde DB; ningún UUID del seed está en la aplicación.

`/operar` requiere membership Admin/Staff de Valhalla. Código exacto → nombre/código
confirmados visualmente → importe pagado → vista previa → confirmación real PostgreSQL.
ARS con teclado decimal; coma/punto, sin miles/exponentes ni más de dos decimales.
Vista previa usa centavos/BigInt y floor, sin redondeo silencioso. Tras éxito, el formulario
queda vacío para el siguiente cliente y conserva el receipt confirmado.

Historial operativo: Staff sólo sus créditos y las reversas de éstos; Admin ve los
movimientos autorizados del negocio. Admin selecciona crédito, ingresa motivo y confirma
explícitamente una reversa completa. Staff/Customer no reciben controles de reversa.
La navegación administrativa permanece exclusiva de Admin.

## Recuperación y frontera de seguridad

sessionStorage guarda sólo borrador, intento y último receipt, por endpoint/cuenta/negocio.
No passwords/JWT/refresh tokens ni nombres/emails de clientes. Sobrevive recarga en la
misma pestaña y reingreso de la misma cuenta; no sincroniza intentos entre dispositivos.
Un consumo nuevo legítimo usa otra clave; no deduplica consumos independientes.

Antes del primer envío se persiste el request_id/contenido. Doble clic no crea otra
operación. Ante red, timeout, respuesta inválida o recarga con intento abierto, se bloquea
un consumo nuevo y se recupera el mismo request_id. No hay retry automático económico.
Una denegación posterior a una incertidumbre conserva ese intento, incluso si se revocó
la membresía. Sólo un rechazo definitivo del primer envío permite corrección explícita.
Si storage falla, no se inicia una operación sin poder conservar su clave; un estado
corrupto no se sobrescribe para habilitar escrituras.

Los borradores no son autoridad. Cada envío/recovery vuelve a comprobar identidad y
membership DB; la RPC mantiene todos los controles 3B. El request queda ligado al JWT
de la identidad verificada en memoria SDK; cambio de cuenta no presta el token de otra.
Logout/owner switch ocultan datos; TOKEN_REFRESHED/focus no destruyen el intento.
Los refetches retienen datos por dueño y alcance, descartan resultados supersedidos y no
resetean el formulario. Un downgrade Admin→Staff descarta inmediatamente el historial
amplio previo, incluso si falla la siguiente lectura. Platform no obtiene capacidad económica global.

## Verificación

PASS: lint/typecheck/build LOCAL; 53 regresiones relacionadas, incluidas 12 de economía;
4 checks QA/PWA; auditoría sin secretos. Prueba de navegador Edge headless 390×844,
con tres usuarios Auth ficticios confirmados por Mailpit y login normal en UI:

- Rodrigo presenta su código; Staff espera 125 segundos editando, recupera foco y acredita
  $6.500 → PostgreSQL devuelve 6; Rodrigo ve saldo 6 e historial real.
- Borrador sobrevive reload; nombre/código se vuelven a resolver antes de un consumo nuevo.
- Una segunda acreditación pierde su respuesta DESPUÉS del commit: reload recupera la
  misma clave y DB confirma exactamente una fila, sin segundo crédito.
- Quitar membership con la misma sesión bloquea recovery y conserva el intento;
  restaurar el fixture permite recuperar el receipt original sin duplicarlo.
- Staff no entra a `/admin` ni revierte; Customer no entra a `/operar`; Admin revierte
  completamente un crédito. Rodrigo ve la reversa y saldo final correcto.
- Admin→Staff con fallo de refetch no conserva filas del historial amplio; al recuperar
  conexión sólo aparece el historial autorizado del nuevo rol, sin relogin.
- Sin overflow horizontal, botón principal ≥44 px, cero excepciones JS y cero requests
  de aplicación a dominios externos/Hosted. La falla de red inyectada es intencional.

No se certificó teclado físico iOS/Android, QR/cámara ni PWA instalada. QR es opcional
y se difiere; no hay escáner, POS, pagos, carrito, rewards/canjes ni gestión de empleados.
No hay blockers funcionales LOCAL conocidos. Aplicación Hosted/producción y SMTP externo
pertenecen a fases posteriores autorizadas; A-H2-SMTP sigue HARD GATE del piloto externo.

## Repetir LOCAL

Usar checkout/copia de la rama **sin** `supabase/.temp/project-ref`; no quitar el link
del checkout Hosted. Docker Linux y dependencias del repo instaladas:

1. `pnpm supabase:start` (seis migrations y seed LOCAL previo, sin economía real).
2. `pnpm dev:loyalty:local` deriva URL/publishable LOCAL del runtime guardado y las pasa
   sólo al proceso Vite. No usar el `.env.local` Hosted del checkout principal.
3. `pnpm test:loyalty`; para navegador, proporcionar Playwright mediante
   `CANJE_PLAYWRIGHT_PACKAGE` si no está instalado en el runner. Edge es el canal default;
   `CANJE_BROWSER_CHANNEL` permite otro canal instalado. Frontend en127.0.0.1:5173.
4. `pnpm test:loyalty:local` requiere DB disposable vacía de usuarios/movimientos humanos.
   Crea cuentas por Auth normal; tooling owner sólo provisiona memberships de fixture.
5. `pnpm supabase:test:loyalty:cleanup` verifica manifest propio y resetea sólo LOCAL;
   no DELETE/TRUNCATE ni bypass de inmutabilidad. Detener el frontend y stack al terminar.

Docker Desktop requirió un reinicio oficial durante el cierre. Un reset posterior terminó
después del antiguo timeout de 60s: el runner permite180s sólo para reset LOCAL y puede
finalizar un manifest ya vacío sin repetir el reset. Ownership/endpoint guards intactos;
verificación final de seis migrations, tipos sin drift y cero residuos PASS.

El walkthrough usa cuentas ficticias; nunca reutilizar una cuenta personal ni compartir
salida CLI, passwords o sesiones para demostrarlo. No seed económico ni bootstrap real.
