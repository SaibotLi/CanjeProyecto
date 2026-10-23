# SaaS multi-comercio — 3E / 3F / 3G LOCAL

Actualización 23/10/2026: rollout a main/Hosted/producción autorizado por el usuario;
séptima migration aplicada sin diferencias en datos/permisos previos.
Ver [release Hosted](SAAS_HOSTED_ROLLOUT.md). El texto fechado 22/10 siguiente conserva
la evidencia y los límites de la etapa exclusivamente LOCAL.

22/10/2026. **COMPLETADA Y VALIDADA LOCAL.** Rama `codex/saas-multi-business`,
desde Sprint 3D `3229af3`. Backend `c47bd50`; frontend `1fb5aa5`.
Una aplicación y un Supabase. **No aplicar ni publicar en Hosted sin autorización.**
Hosted conserva Sprint 3D y sus seis migrations; no se alteraron sus datos, Auth, DNS o Vercel.

## Resultado funcional

- Raíz de plataforma independiente, preparada para marca definitiva. Sin marketplace ni
  listado público transversal: cada carta se abre por su enlace/QR o nombre exacto.
- `/:businessSlug` resuelve el comercio real. `/:businessSlug/profile`, `/points`, `/operar`
  y `/admin` conservan ese contexto; Admin reutiliza categorías/productos e incorpora
  `/admin/settings` y `/admin/share`.
- Login, registro, callback/recovery/MFA y `/platform` son globales. La identidad y el código
  del cliente son únicos; memberships, saldos, permisos e historial siguen por business_id.
- El perfil global muestra los comercios propios y sus accesos. Cambiar de comercio remonta
  su workspace: no arrastra formularios, resultados tardíos ni autoridad del anterior.
- Solo Carta: catálogo público sin cuenta, puntos estimados, registro, premios ni Staff
  operativo en la navegación. El dueño mantiene catálogo/apariencia/contacto/QR.
- Carta + Fidelización: mantiene Sprint 3. Sin pagos, recompensas/canjes ni gestión de empleados.
- Tres estilos reutilizables, cuatro acentos con variantes claras/oscuras y campos públicos
  de identidad/contacto. Imágenes y logos reutilizan Storage y sus restricciones existentes.

`/profile` sigue siendo cuenta global; las rutas antiguas `/admin`, `/admin/categories`,
`/admin/products`, `/points` y `/operar` redirigen al slug original `valhalla-space`.
El antiguo mock `/rewards` conduce a puntos hasta implementar canjes en su encargo propio.
La raíz ahora es plataforma; los enlaces impresos que apunten a `/` deben revisarse antes
del rollout. No se renombra el slug existente ni se copian UUIDs reales o seed a Hosted.

## Contrato mínimo de datos y seguridad

Nueva migration forward-only: `20261021120000_saas_business_foundation.sql`.
Las seis anteriores permanecen intactas.

| Propiedad | Autoridad / escritura |
|---|---|
| `business_entitlements.loyalty_enabled` | Capacidad comercial; sólo canal privilegiado de plataforma |
| `loyalty_settings.points_enabled` y divisor | Configuración operativa existente, nunca concede la capacidad comercial |
| `business_presentation` | SELECT público del negocio activo; UPDATE de columnas permitidas por Admin propio/activo |
| Nombre del negocio | UPDATE existente por Admin propio/activo |
| Slug, moneda, timezone, activación y memberships | Sin nuevas escrituras browser; provisioning/canal privilegiado |
| Ledger / RPC | Contratos Sprint 3 preservados, sin INSERT/UPDATE/DELETE directo |
| Platform | Fila vigente + MFA/AAL2 para lectura global; ninguna escritura global nueva |

Backfill conserva Fidelización en negocios existentes para no cambiar Sprint 3 por accidente.
Todo negocio nuevo recibe presentación completa y entitlement **false** por defecto.
Anon/authenticated/service_role no pueden editar entitlements ni ejecutar provisioning.
No hay precios, facturación o proveedor SMTP dentro del modelo de permisos.

Nuevos créditos y nuevas reversas requieren entitlement vigente. El lock de su fila
serializa operaciones contra una revocación concurrente. `points_enabled=false` conserva
la semántica anterior: impide nuevos créditos, permite correcciones Admin si el módulo
continúa contratado. Recuperar el mismo request confirmado funciona con módulo desactivado;
no escribe otro movimiento. Siempre exige membership vigente y payload idéntico.

Desactivar el módulo no borra saldo, códigos o ledger. RPC de historial propio/operativo
siguen disponibles bajo sus permisos anteriores. La UI permite archivo personal cuando
hay movimientos anteriores; no presenta un programa nuevo a clientes de Solo Carta.

## Alta controlada, preparada para automatizar

`private.provision_business` es una operación atómica **owner-only**, fuera de Data API.
Exige una cuenta confirmada y no suspendida; valida timezone y slug reservado/único;
crea negocio, defaults, regla inicial y membership Admin independiente en una transacción.
No crea Auth, no autoconfirma emails ni otorga Platform.

Ejemplo para el canal de confianza, primero LOCAL y con UUID de una cuenta confirmada:

```sql
select private.provision_business(
  '<UUID confirmado>'::uuid, 'Nombre comercial', 'nombre-comercial',
  false, 'America/Argentina/Cordoba'
);
-- false: Carta Digital; true: Carta + Fidelización.
```

Una futura alta automática deberá derivar el propietario de la identidad verificada en
el servidor y llamar esta misma primitiva. No aceptar un owner_user_id arbitrario del
formulario ni conceder EXECUTE a authenticated para facilitar onboarding.
La contratación manual modifica únicamente el entitlement por el canal privilegiado;
no se añadió una pantalla Platform de escritura ni gestión de empleados.

## Marca, país y dominio futuro

Marca de plataforma en `apps/web/src/config/platform.ts`; manifest la reutiliza. Revisar
también título/description estáticos e iconos al elegir marca definitiva. El logo Valhalla
se conserva sólo como fallback de compatibilidad; no determina tenant, permisos o precios.
Datos/tema/logo propios vienen de DB. No HTML, CSS o código arbitrario por comercio.
Nuevos autenticadores usan la marca de plataforma; no se renombran ni invalidan factores
existentes. La clave local de intentos económicos mantiene su prefijo histórico para no
perder la recuperación de operaciones pendientes; incluye endpoint/usuario/negocio.

País/ciudad/región son configurables; timezone ya pertenece al negocio y se usa al mostrar
movimientos. **Moneda económica sigue siendo ARS**, según constraints Sprint 3. Otros países
no implican conversión, impuestos, traducción o soporte multimoneda implementados.

El QR se genera en el navegador, sin enviar URL a un proveedor externo. Contiene sólo
origen actual + ruta pública del comercio, nunca identidad ni permisos. Un dominio premium
necesitará registro/resolución de hosts de confianza en un encargo futuro; no DNS ahora.
Auth mantiene dos callbacks globales exactos. El returnTo sólo admite rutas internas
conocidas. Un hint opcional de ruta ayuda a confirmar en el mismo navegador; en otro
dispositivo se abre el perfil global, sin perder identidad ni conceder autoridad.

## Reproducción segura

Trabajar en un clon LOCAL sin link Hosted; no quitar el link de un checkout de producción
para eludir guards. Node/pnpm fijados en package.json y Docker Linux.

```sh
pnpm install --frozen-lockfile
pnpm supabase:start
# En un stack LOCAL existente: aplicar las pendientes con migration up --local.
# Nunca resetear datos humanos para probar.
pnpm dev:saas:local
pnpm test:saas
pnpm lint
pnpm typecheck
pnpm build
pnpm test:qa
pnpm supabase:audit:secrets
```

La app deriva URL/key públicas del runtime LOCAL en memoria. No copiar credenciales Hosted.
Registrar/confirmar el dueño por Auth normal (Mailpit LOCAL), luego provisioning controlado.
El seed sólo crea Valhalla ficticio LOCAL y jamás se usa en Hosted. Repetirlo no sobrescribe
entitlements/presentación del negocio ya existente.

Integración exclusiva sobre un stack LOCAL disposable sin cuentas/datos humanos:

```sh
node supabase/scripts/database-tests.mjs 07_loyalty_contract.test.sql 08_saas_contract.test.sql
pnpm supabase:test:saas
```

La matriz deja un manifiesto exacto de fixtures. El ledger ficticio tampoco se borra por
DELETE/TRUNCATE: el cleanup explícito reconstruye sólo el schema LOCAL cuando comprueba
que todos los datos pertenecen al manifiesto. No correr suites exclusivas sobre la demo
manual activa ni sobre Hosted. Ver `supabase/scripts/loyalty-fixture-cleanup.mjs`.

## Validación final LOCAL — 22/10/2026

- Lint, typecheck, build LOCAL, auditoría de secretos y generación de tipos sin drift: PASS.
- 79 checks frontend: Auth/MFA y destinos seguros, ciclo del catálogo, roles, rutas,
  payloads de apariencia, Solo Carta, puntos, PWA y configuración pública.
- 1.671 aserciones SQL relevantes: estructura/ACL/policies actuales y contratos económicos
  y comerciales. Se actualizaron los inventarios exactos 01/04; no se relajaron policies.
- 11 tests REST con Auth/JWT reales LOCAL: provisioning y rollback, aislamiento A/B,
  Staff/Admin, Platform AAL1/AAL2 read-only, privacidad, revocación SAME JWT,
  idempotencia concurrente y revocación comercial concurrente con crédito pendiente.
- Navegador móvil (390 px): identidad/contacto guardados; edición del precio mantenida
  durante espera y revalidación, guardado confirmado y precio público ARS 2.800,50.
  Admin→Staff deniega catálogo y mantiene sólo operación; el otro negocio no cambia.
  Rol restaurado al finalizar, con la misma sesión.
- Acceso directo y reload a configuración, puntos y MFA; selección por enlace exacto,
  comercio inexistente, perfil con ambos negocios y QR PNG local: PASS. Consola sin
  warnings/errores en la comprobación final. No se afirma escaneo físico del QR.

Demo retenida para revisión, **todos sus datos e identidades son ficticios LOCAL**:
`http://127.0.0.1:5173/valhalla-space` (Fidelización) y
`http://127.0.0.1:5173/cafe-demo` (Solo Carta). El segundo conserva points_enabled=true
intencionalmente: el entitlement false impide concederse economía. Los dos movimientos
ficticios de integración son crédito/reversa de neto cero; no hubo economía real Hosted.
El dueño ficticio tiene ambos accesos en `/profile`; la demo quedó abierta en el navegador.
No se incorporan cuentas/contraseñas demo al repositorio.

Los harness históricos de integración se adaptaron al scoping global y a limpiar sólo
las dos filas nuevas de configuración de sus negocios fixture antes de borrarlos.
Se verificaron lint/sintaxis; no se reejecutaron las auditorías históricas completas ni
se destruyó la demo para repetirlas. La evidencia de integración nueva es la matriz SaaS.

Límites conservados: moneda económica ARS; alta/contratación por canal de confianza;
sin autoservicio de suscripción; reemplazos de imágenes sin borrado de archivos anteriores.
Nombre y presentación se guardan mediante dos requests RLS: ante fallo parcial se informa
que el nombre puede haberse guardado y se reutiliza el archivo subido al reintentar.

## Preparación del rollout, pendiente de autorización

1. Revisar diff/commits, respaldo y preflight Hosted read-only: seis versiones exactas,
   slugs reservados sin conflictos, reglas existentes e inventario de negocios.
2. Pedir autorización específica para la séptima migration y su backfill comercial.
3. Aplicar sólo esa migration, verificar RLS/grants/defaults y que no se creó economía.
4. Autorizar aparte la publicación del frontend y revisar legacy/root, Auth y HTTPS.
5. Alta de otro comercio real, cambio de modalidad o datos reales requieren el alcance
   humano correspondiente. El comercio Café Demo LOCAL no se exporta.

SMTP custom + dominio autenticado siguen siendo HARD GATE antes de usuarios externos.
No se inició SMTP, Google OAuth, facturación, onboarding automático ni Sprint 4.
