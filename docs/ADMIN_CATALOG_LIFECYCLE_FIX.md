# Admin — corrección del ciclo de vida del catálogo

08/10/2026. **CORRECCIÓN VERIFICADA EN HOSTED.** Edición prolongada, revalidación,
guardado real, persistencia y restauración comprobados. Commit funcional: ca71f52.

## Causa raíz reproducida

El hook original useAdminCatalog combinaba el AbortController de cleanup con
AbortSignal.timeout(15000), e instalaba un listener abort que hacía setResult(error).
Después de una lectura exitosa no retiraba ese listener ni cancelaba el deadline.
Por eso una carga HTTP200/ready se convertía en error a los 15 segundos, aunque ya no
hubiera una request pendiente. AdminCatalogPage renderizaba el editor únicamente en
ready: el cambio a error desmontaba el formulario y perdía el borrador.

Reproducción real en valhallapp.vercel.app: formulario de categoría con borrador no
guardado; la observación posterior mostró «No pudimos cargar el catálogo. No se habilitó
edición.» y el formulario ausente. No se crearon registros ficticios para reproducirlo.
La matriz/smoke inicial de H3 no cubría una edición prolongada; no era un defecto RLS.

Había un segundo problema de lifecycle: la clave de resultados incluía auth.revision y
el effect dependía del objeto session. TOKEN_REFRESHED/reanuncios de sesión invalidaban
inmediatamente datos válidos y rendereaban loading, desmontando el editor durante el refetch.
Un fallo de catálogo reemplazaba también los datos previos por error sin recuperación.

## Cambio y límites de seguridad

- AdminCatalogStore delimita el deadline a la request pendiente y lo limpia en finally.
  Generación + AbortController descartan respuestas canceladas/superadas.
- La propiedad de datos usa identidad/negocio. Revision/refresh/focus disparan lecturas
  nuevas, manteniendo ready y datos anteriores mientras se actualiza el mismo contexto.
- Initial loading/error se distingue de background refresh/error recuperable. Un fallo
  de actualización muestra aviso y reintento, conservando formulario/datos; no anuncia
  lectura exitosa nueva. Contexto/identidad distintos no ven el catálogo anterior.
- Un fallo al comprobar permisos conserva sólo datos de display del mismo dueño y el
  formulario montado, con operaciones pausadas. businessGate sigue error; Platform no
  muestra global READ con autoridad desconocida. Revocación confirmada devuelve forbidden,
  y logout/cambio de identidad limpia el contexto inmediatamente.
- Guardar revalida membership/business en DB. Un error de conexión se describe como
  imposibilidad de comprobar permisos; una respuesta válida sin membership sí deniega
  acceso. Payloads, RLS, representation/zero-row checks y ausencia de global writes siguen.

No cambios en schema, migrations, RLS, grants, helpers/RPC, Auth architecture o Storage.
El cache de display no es una decisión positiva de autorización ni habilita operaciones.

## Regresión y validación

Tests nuevos con reloj controlado reproducen 180 segundos tras carga exitosa, timeout
en background, error de red, dos refetches concurrentes, cambio de dueño/cancelación,
permiso desconocido y revocación real de membership. Se ejecutan con test:admin existente.
Admin/authority:19 PASS. Con Auth/env/QA estática:40 PASS, Storage ownership:1 PASS.
Lint/typecheck/build Production y auditoría redacted de fuente/bundle PASS.

El candidato corregido quedó READY en Production con alias valhallapp.vercel.app.
Smoke de ocho rutas HTTPS y bundle Hosted correcto PASS, sin endpoint Supabase loopback
ni patrones de secretos de servidor. Se comprobó que el navegador cargaba el bundle nuevo;
una pestaña anterior todavía usaba la versión precacheada por la PWA. Cerrar las pestañas
antiguas y abrir nuevamente permitió activar la actualización, sin cambiar la PWA.

Edición prolongada real: después de 419.896 ms (casi siete minutos), el formulario seguía
montado, el borrador intacto, el fieldset habilitado y sin el error inicial. También
conservó el borrador durante «Actualizar datos y permisos»; las operaciones se pausaron
sólo mientras se comprobaba acceso. El borrador de diagnóstico no fue guardado.

Al inicio no había registros visibles; luego apareció una categoría existente, Vinos.
Sobre ese registro se dejó un cambio de orden 0 → 1 durante 182.197 ms, incluyendo
revalidación manual. Guardado confirmado, recarga completa y orden 1 persistido PASS.
Se restauró 1 → 0 y otra recarga confirmó el valor original. No se creó ninguna categoría,
producto o imagen ficticia; el borrador de diagnóstico anterior fue descartado.

El push de ca71f52 generó automáticamente un deployment Git Production READY y activo
en valhallapp.vercel.app, comprobando SHA y URL del deployment detrás del alias. Su código
frontend coincide con los 14 archivos del candidato validado. Ocho rutas HTTPS/bundle
PASS; consola de la pestaña: cero errores/advertencias. Platform sigue mostrando sólo
READ global protegido. No se amplió autoridad ni se modificó backend.

La evidencia final incluye capturas antes/después, tiempos reales y comprobaciones de
persistencia/restauración. Catálogo actual: categoría Vinos, sin productos observados;
Carta vacía controlada. Sprint3 no se inició; SMTP mantiene el gate para usuarios externos.
