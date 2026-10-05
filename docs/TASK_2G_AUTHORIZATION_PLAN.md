# Task 2G — contrato definitivo y acceptance

02/10/2026, exclusivamente LOCAL. A-S2-003 APPROVED por pedido del usuario.
Task 2G COMPLETADA/CERRADA LOCAL, aprobable: DoD final validado tras reset y regresiones PASS.
**PUBLIC bucket ≠ public administrative listing.** Archivo, info técnica y cualquier
metadata del path conocido públicos; nunca datos confidenciales ni autoridad allí.

## Capacidad implementable sin ampliar el modelo

Bucket menu-images público, 5 MiB (5.242.880 bytes), MIME JPEG/PNG/WebP/AVIF exactos.
Path canónico original: business UUID/asset UUID.ext, lowercase y un solo slash.
Tres policies específicas en storage.objects, TO authenticated, PERMISSIVE:

- SELECT business: bucket + path canónico + membership actual, incluso tenant inactivo.
- SELECT platform: bucket + fila privada actual + JWT AAL2. Sin otros buckets.
- INSERT business: bucket + operación oficial object.upload + path canónico + membership
  actual + business activo. Custom metadata NULL/{} y MIME declarado coherente con extensión.

Nombre real del objeto es autoridad del namespace, no owner ni metadata. Extraer primer
segmento con storage.foldername, comparar con business.id::text sin cast de input y reutilizar
is_business_admin. Estado activo explícito en policy de escritura; helper original intacto.
Sin nuevas funciones, triggers, grants amplios ni alteraciones de internals Storage.
ACL gestionada de Storage se inventaría; autorización efectiva depende además de RLS.
API schemas public, private/storage nunca expuestos por Data API.

Sólo upload estándar nuevo de hasta5 MiB; no UPDATE/overwrite/replace/move/copy/signed upload/
TUS/S3 habilitados como capacidades de aplicación. No policy de buckets para administrar.
API x-upsert=true en path todavía inexistente puede hacer INSERT, comprobado realmente;
no significa overwrite habilitado. En path existente, ese mismo flag queda denegado por RLS.
El servicio utiliza preflight RLS y finalización privilegiada internos: comprobar metadata,
MIME y permisos con API real; revocación afecta siguientes requests, no uploads ya iniciados.
MIME/extensión no valida magic bytes ni identifica contenido; no antivirus/resize.

## DELETE — A-S2-004 APPROVED/DEFERRED

Application DELETE for menu-images deferred beyond Sprint 2. DELETE DENY es comportamiento
correcto y completo de Sprint 2, para todo actor, orphan y referenciado; sin policy DELETE.
Se reemplaza imagen subiendo nuevo asset UUID/path y luego actualizando menu_items.image_path.
El asset anterior puede quedar orphan: deuda operacional aceptada, no leak/corrupción por sí misma.
No diseñar ahora lifecycle/cleanup automático, NOT EXISTS DELETE policy, FK DB→Storage,
triggers gestionados o DEFINER para resolver la carrera. Migration aplicada permanece intacta;
comentario de STOP original es histórico y queda supersedido por esta decisión/documentación.

NOT EXISTS falló concurrencia real. orphan-delete-probe se conserva sin cambios sólo como
diagnóstico histórico opcional, NO suite de acceptance final ni comportamiento esperado
de aplicación. No se reejecuta para cerrar esta decisión ni se instala una policy temporal.
Evidencia anterior en [walkthrough](TASK_2G_WALKTHROUGH.md).

## DoD final de 2G

- Bucket reproducible PUBLIC/5 MiB/MIME, name canónico exacto y custom metadata vacía.
- Business READ propio incluso inactivo; upload propio sólo membership + business activo.
- Platform SELECT global sólo menu-images, fila actual + AAL2; ningún global write.
- UPDATE/overwrite/move/copy/re-home/DELETE DENY, aun orphan propio y negocio activo.
- Cero policies DELETE/UPDATE/ALL/bucket/anon/temporales; helpers/ACL originales intactos.
- Reemplazo nuevo UUID/path con old asset retenido; no garantía de existencia por CHECK.
- Reset local seguido de inventarios/estructura/REST/JWT/regresiones y checks de app/tipos PASS.
- Docs reflejan A-S2-003 APPROVED y A-S2-004 APPROVED/DEFERRED. Ningún avance a 2D.

## Deuda operacional futura — A-S2-005

Diseñar lifecycle/garbage collection coordinado antes de necesitar cleanup productivo
significativo. Contemplar concurrencia, período de gracia, revalidación, auditoría y fallos
DB/Storage, incluidos todos los escritores de image_path. No diseñar/implementar ahora;
no bloquea cierre de 2G ni habilita cleanup automático por esta documentación.

## Evidencia requerida

Inventario pgTAP independiente, regresión 2B/2C, actores reales Auth/MFA, Storage REST,
bytes/filas posteriores, anon/customer no listado, A/B/Both namespaces, inactivo read-only,
Platform AAL1/AAL2/global read-only y membership independiente, same-JWT revocación,
DB image_path interoperabilidad, full reset local y payloads. No service_role en assertions:
owner/setup key sólo fixtures/cleanup. Sin frontend/hosted/economía/stage/commit/push/2D.
