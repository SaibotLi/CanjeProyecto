# Task 2C — Grants, RLS & Authorization Tests

Fecha: 02/10/2026. **COMPLETADA exclusivamente LOCAL**, pendiente revisión/aprobación humana
del diff. No inicio automático de otra task. Repo: CanjeProyect. CLI Supabase 2.119.0,
PostgreSQL 17.11, Node 24.16.0/pnpm 11.19.0. Sin cambios de versiones/dependencias en esta task.

## Corrección de revisión — negocio activo obligatorio

La primera entrega divergía de Architecture V2 al permitir INSERT/UPDATE del menú en negocio
inactivo. Se corrige exclusivamente esa divergencia mediante nueva migración forward-only
`20261002140000_sprint2_active_business_menu_writes.sql`; las dos anteriores permanecen intactas.
ALTER POLICY sobre business_admin_insert/update de menu_categories/menu_items: membership
vigente + EXISTS del business_id correspondiente con businesses.is_active=true. INSERT WITH
CHECK; UPDATE USING y WITH CHECK. Admin READ propio en inactivo conservado, helper sin lookup
businesses, grants/constraints/Platform read-only intactos. App no puede reactivar is_active:
sólo un canal privilegiado futuro, sin endpoint ni implementación nueva en esta corrección.

Pruebas post-reset: **1.027 pgTAP PASS**, **30 escenarios REST/Auth + padre = 31/31 PASS**,
smoke **6/6**, env **6/6**, lint/typecheck/build y types drift/strict checks PASS. Cada actor
Admin Valhalla/B y Admin Both en A/B usa MISMO JWT en activo→inactivo→reactivado por setup
privilegiado de fixtures. Activo: category/item INSERT/UPDATE permitidos. Inactivo: business,
categorías/items propios legibles; category/item INSERT/UPDATE, business name/settings UPDATE
y app reactivation denegados, sin cambios persistidos. Admin Both conserva writes del otro
negocio activo. También se prueba negocio C inicialmente inactivo. Platform tests sin cambios.

Los apartados siguientes reflejan el contrato corregido. Rebuild aplica 2B→2C→corrección→seed.
No Storage/frontend/Auth UI/hosted/economía/commit/push/stage; no avanzar a Task 2G.
Referencia sintáctica: [PostgreSQL 17 ALTER POLICY](https://www.postgresql.org/docs/17/sql-alterpolicy.html).

## 1. Executive summary

Frontera backend real: grants explícitos por columna, 24 policies específicas, helpers
privados INVOKER y autoridad global read-only con MFA/AAL2. Customer implícito, Business
Admin por membership actual, Platform por fila privada actual + JWT verificado AAL2.
Pruebas contra API/Auth local real, no UI ni tokens fabricados. Regresión completa tras reset.

Preparación: README y todos los docs, migración 2B completa, tests/fixtures/tooling/tipos
leídos; catálogo real inspeccionado antes de aplicar seguridad. Confirmó siete tablas con
RLS, cero policies/grants app, dos triggers seguros, cero identidades/buckets; sin contradicción.
[Plan anterior a aplicación](TASK_2C_AUTHORIZATION_PLAN.md) conserva matriz/interpretaciones.

## 2. Migration creada

`supabase/migrations/20261002130000_sprint2_authorization.sql`: BEGIN/COMMIT, helpers,
grants, policies y comment private actualizado. Aditiva, sin fixtures/economía/Storage.
2B intacta SHA256:
`66D1E13EBAF032050AC62C584187465FB6365791DEF4344794AD8DED14523103`.
Corrección en `supabase/migrations/20261002140000_sprint2_active_business_menu_writes.sql`.
2C original SHA256 `479144A2F47959B9DE7663BD42B7B03D5612439EC03395A9888322B8C3BE5EC3` intacta.
Registro local tiene 20261002120000, 20261002130000 y 20261002140000.

## 3. Helpers implementados

private.is_business_admin(target_business_id uuid): EXISTS membership propio usuario,
target business y role admin; nunca consulta businesses/metadata. private.is_platform_admin():
EXISTS su propia fila privada, sin parámetro de identidad. Ambos RETURNS boolean, language SQL,
STABLE, SECURITY INVOKER, owner postgres, search_path vacío, SQL estático/calificado.
private self_read directa auth.uid(); no recursión ni nuevo SECURITY DEFINER.

## 4. Grants finales

anon SELECT cuatro recursos publicados. authenticated SELECT seis públicas bajo RLS,
USAGE private, SELECT(user_id) propia fila, EXECUTE dos helpers. INSERT/UPDATE sólo por columna
donde corresponde. PUBLIC sin table/function grants; service_role sin permisos propios.
Sin DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN/CREATE app ni grant options. No GRANT ALL.

## 5. Policies por tabla

Todas PERMISSIVE, específicas por operación; OR deliberado. public_read sin helpers,
admin/global TO authenticated; cada global SELECT incluye fila vigente + AAL2.

| Tabla | Policies | Total |
| --- | --- | --- |
| private.platform_admins | self_read | 1 |
| business_memberships | self_read, platform_admin_read | 2 |
| profiles | self_read, self_update, platform_admin_read | 3 |
| businesses | public_read, business_admin_read/update, platform_admin_read | 4 |
| loyalty_settings | public_read, business_admin_read/update, platform_admin_read | 4 |
| menu_categories | public_read, business_admin_read/insert/update, platform_admin_read | 5 |
| menu_items | public_read, business_admin_read/insert/update, platform_admin_read | 5 |

No FOR ALL/delete/platform write/anon write policies. Expresiones exactas en 04_authorization_inventory.test.sql.

## 6. Matriz final de permisos

Contrato completo vigente en [SECURITY: matriz real](SECURITY.md). Público requiere negocio
activo, categoría/item activo correspondiente; agotados e imageless visibles. Self profiles
display_name únicamente. Admin lee propios borradores/negocio inactivo. TODA escritura
business-scoped (menú/name/settings) requiere membership actual + negocio activo explícito
en policies. Sólo canal privilegiado futuro puede reactivar is_active; no app.
Platform AAL2 sólo SELECT global de las seis públicas, no acceso REST a private.

## 7. Column-level privileges

businesses UPDATE name; profiles UPDATE display_name; settings UPDATE currency_per_point,
points_enabled. categories INSERT business_id/name/slug/display_order/is_active; UPDATE las
mismas sin business_id. items INSERT business_id + columnas funcionales; UPDATE category_id,
name/description/price_amount/image_path/image_alt/image_presentation/is_available/is_featured/
is_active/display_order. Ningún ID/created_at/updated_at libre, no re-home. USING+WITH CHECK
en todos los updates; membership y negocio activo en policies de escritura, no en helper.
FK y CHECK complementan ACL/RLS. Inventario cada columna/operación.

## 8. Private schema status

API schemas=public; extra_search_path=public,extensions, efectivo verificado. private nunca
agregado. GET Accept-Profile/POST Content-Profile →406 para anon y todos los actores, incluso
Platform AAL2 (también PATCH/DELETE). No wrapper public RPC de helpers (404). SQL private
SELECT user_id sólo self; created_at/INSERT/UPDATE/DELETE rechazados como authenticated.

## 9. MFA/AAL2 implementación

Config LOCAL habilita TOTP enrol/verify (defaults antes false). GoTrue real: signup→enrolment→
challenge→verify; código inválido 422, válido 200, emite JWT firmado aal2 con amr totp. AAL1
original retenido, no tokens firmados/custom claims fabricados. RLS usa auth.jwt()->>'aal'
después de verificación PostgREST. Customer AAL2 sin fila no global; fila + AAL1 no global.
Sin MFA obligatorio customer/admin. MFA UI/recovery/flujo final/hosted pendientes 2E.
[MFA oficial](https://supabase.com/docs/guides/auth/auth-mfa),
[config local](https://supabase.com/docs/guides/local-development/cli/config),
[REST oficial](https://github.com/supabase/auth-js/blob/master/src/GoTrueClient.ts).

## 10. Test identities

Siete cuentas reales ficticias: Customer A/B, Admin Valhalla/B/Both, Platform, Customer MFA.
Anon sin cuenta. Platform AAL1/AAL2 mismo user con JWTs genuinos distintos; Customer MFA
eleva a AAL2 sin platform row. UUIDs/emails/passwords generados en ejecución, nunca seed.
Credenciales/TOTP secrets/JWT en memoria, cuerpos/tokens no impresos. Setup provisiona sólo
memberships/registry previstas; assertions REST con publishable key + JWT real, no service_role.

## 11. pgTAP results

**4 archivos, 1.027 assertions PASS**, post-reset. 230 estructurales 2B + 797 inventario 2C.
04 verifica policies exactas (sólo whitespace ignorado), roles/mode/command/USING/WITH CHECK,
tabla/columna ACL efectiva, grantees/grant options, schema, cuatro funciones/cuerpos estáticos,
least-privilege SQL private, auth.uid() ausente fail-closed y denegación anon.

## 12. REST results

**30 escenarios + test padre: Node 31/31 PASS**, sin skips. Métodos GET/POST/PATCH/DELETE
con UUIDs ajenos conocidos. Auth signup/PUT metadata y MFA reales. Cada write exitoso valida
status, una representación/row count y estado persistido. Denegaciones verifican estado sin
cambio mediante JWT observador Platform AAL2 (al final, permisos locales/public restantes).
PATCH 200/[] reconocido como denegación, no éxito. Ninguna assertion REST ejecutada como owner.

## 13. Anon matrix

PASS: negocios activos A/B, settings activos, categorías publicadas, items activos,
agotados/imageless. DENY negocio C inactivo/settings/catálogo C, categoría B inactiva, item B
inactivo, item activo bajo categoría B inactiva; profiles/memberships 401/42501; I/U/D denegados,
private 406. Publishable key pública no genera confianza.

## 14. Customer matrix

A/B y Customer AAL2 simétricos: SELECT profile propio/UPDATE display_name permitidos, profile ajeno
oculto y UPDATE cero filas; INSERT/DELETE/id/timestamps prohibidos. Sin membership/admin/
platform authority, menú/business/settings writes rechazados, registros de autoridad IUD 403.

## 15. Business Admin matrix

Valhalla/B simétricos: own categories/items I/U, draft read, todos los campos funcionales,
name/settings permitidos propios activos; otro negocio writes denied. Registro de autoridad
IUD 403; perfiles ajenos no concedidos; columnas protegidas/DELETE prohibidos. Inactivo propio leído;
menú/name/settings sin escrituras cuando inactivo: INSERT 403, UPDATE 200/[] sin cambios.
App reactivation 403. Mismo JWT antes/después del cambio de estado para Valhalla/B.

## 16. Admin Both matrix

INSERT/UPDATE A y B independientemente PASS. UPDATE business_id de categoría/item 403/42501;
categoría cross-business PATCH/POST 409/23503 aunque posee ambas memberships. No re-home ni bypass FK.
Al desactivar A o B con el mismo JWT, sólo ese tenant pierde escrituras; READ propios
permanece y el otro tenant activo sigue administrable. Reactivación app denegada.

## 17. Platform matrix

AAL2+fila: SELECT global businesses/profiles/memberships/settings/categories/items incl.
inactivos. AAL1+fila y Customer AAL2 sin fila sin global. AAL2+fila no global I/U/D, no registry
writes, no UPDATE de profiles ajenos. Self display_name permitido. Membership local adicional
permite own writes sólo por membership + negocio activo; otro tenant sigue denegado.

## 18. Revocation same-JWT

Admin Valhalla: write OK → DELETE exacto membership por setup → mismo JWT write 200/[] e
INSERT 403, memberships propias vacías. Platform AAL2: añadir membership A permite write A; quitarla
conservando fila platform mantiene global SELECT y pierde write A. Reañadir membership A y
quitar platform row elimina global SELECT (profiles self/borradores B ocultos/negocio C oculto)
pero permite write A local. Token original retenido, sin refresh/login. Sólo siguientes requests,
no consultas en curso ni datos previamente descargados.

## 19. Metadata attacks

Signup y PUT user_metadata role=admin/platform_admin=true/business_id=A/aal2/app_metadata anidado
no conceden autorización ni copian display_name. PUT app_metadata de cliente rechazado 403
por Auth; GET confirma no promoción. Continúan denegados writes/elevaciones después del ataque.

## 20. Cross-business results

INSERT ajenos conocidos denegados 403; UPDATE ajenos 200/[] sin cambio. Tenant protegido 403; FK
compuesta categoría cruzada 409/23503; image_path ajeno 400/23514; precio negativo 400/23514.
Admin Both no evade ninguno de estos límites. No validación frontend como mecanismo.

## 21. Function security inventory

Dos helpers SQL INVOKER/STABLE y dos triggers existentes: updated_at INVOKER/VOLATILE;
profile DEFINER/VOLATILE mínimo. Todos owner postgres/search_path vacío/cuerpos estáticos
exactos/firmas y return verificados. EXECUTE sólo helpers para authenticated, triggers sin
app/Auth EXECUTE ni PUBLIC EXECUTE. Signup/fallo atómico GoTrue conserva funcionamiento.

## 22. Policy/ACL inventory y performance

04 SQL mantenido independientemente compara 24 policies y privilegios tabla/columna de anon,
authenticated/service_role, PUBLIC/grantees extra/grant options. No FOR ALL ni global write.
EXPLAIN bajo authenticated: business_memberships_user_business_idx y platform_admins_pkey elegibles
para predicados de helpers (enable_seqscan=off diagnóstico transaccional, no tuning persistente).
Lectura anon natural: SeqScan de pequeño catálogo de 5 filas, hash de negocios activos y lookup por
menu_categories_business_id_key. Sin join cíclico ni auth cache/Redis/materialización. No benchmark
de carga ni afirmación que índices siempre ganan para tablas pequeñas.

## 23. Foundation regression

Constraints, campos/defaults, PK/FK/actions, imagepaths, dinero/especiales, timestamps,
trigger de perfil mínimo, atomicidad de fallos, cascades y seed intactos. Sólo 16 assertions históricas
deny-all de 01 cambiadas por nuevo inventario de 797; ninguna invariante de integridad eliminada.
Smoke público esperado ahora 200, private 406 como antes. **5 escenarios + padre: Node 6/6 PASS**.

## 24. Reset/rebuild y limpieza

Guard configurado project_id=canjeproyect/sin hosted link, Docker label, API 127.0.0.1:54321,
DB loopback 54322; antes reset cero identidades/buckets y sólo Valhalla demo. Fingerprint original
`5bc80b32792095fb6cf02694de9626a1`. Reset --local reconstruyó 2B→2C→corrección→seed; regresión repetida.
Cleanup exactas identidades propias (sesiones/factores cascades), filas generadas y fixtures B/C,
valores seed restaurados/timestamps DB-owned. Fingerprint final igual; cero usuarios/perfiles/
memberships/platform rows/buckets y cinco productos seed. Stack detenido conservando volúmenes;
logs propios temporales retirados sin borrar trabajo útil. No reset de datos reales.

## 25. lint/typecheck/build/env/types

PASS lint sin warnings, frontend typecheck, **6/6 env tests**, TypeScript strict independiente de database.types,
tipos generados/local sin drift. Build PASS, 74 módulos; PWA 14 entradas precache, sin cambios UI/Carta.
No instalar nuevas dependencias. git diff --check sin errores de whitespace; warnings Git CRLF
existentes no se resolvieron cambiando configuración compartida.

## 26. Docs modificados

SECURITY, DATABASE, ARCHITECTURE, DECISIONS, SUPABASE_WORKFLOW, ROADMAP,
SPRINT_2_ARCHITECTURE; nuevos plan y walkthrough 2C. README raíz/Supabase/tests/fixtures
actualizados. Walkthrough 2B histórico conservado, su deny-all supersedido claramente por 2C.
Storage/Auth frontend/hosted/production NO marcados completos.

## 27. Warnings y límites

Datos/usuarios sólo ficticios locales. Docker publica puertos: red confiable y detener stack
tras pruebas. Suites exclusivas, no concurrir con Auth/dev; terminación abrupta requiere inspección
de constraints/fixtures/identidades, no reset ciego. Tabla owner/BYPASSRLS y secretos filtrados
fuera de frontera app. Platform SELECT expone campos mínimos de profiles por API; considerar
privacidad/runbook antes piloto. AAL2 no bloquea datos ya descargados; recovery/pilot pendientes.
Tipos no ACL ni CHECK, path CHECK no Storage security. Sin prueba de carga/producción.

Se corrigieron únicamente errores del harness durante iteración: comparación pgTAP de
collations pasó a JSONB, assertions de funciones una por fila TAP, anon PATCH/DELETE con WHERE,
ataques user_metadata 200 separados de app_metadata 403 real. No se debilitaron grants/RLS/MFA
para hacer pasar tests. Resultados finales registrados después del rebuild: todos PASS.

## 28. Diff summary

Nueva migración 2C, auth-test-runtime, suite REST, inventario SQL, security-catalog y actores fixture.
Adaptaciones intencionales de 01_schema/local-smoke/database-tests, script raíz authz/config TOTP,
tipos regenerados (sólo firmas helper nuevas), documentación. No fuente frontend/lockfile/
migración foundation/seed modificados en esta task. Worktree ya contenía cambios aprobados 2A/2B;
el diff global mezcla ese trabajo previo: no atribuirlo íntegro a 2C. Sin stage automático.

Diff exclusivo de la corrección: una migración nueva que altera sólo cuatro policies,
inventario SQL/REST suite y docs que registraban la interpretación errónea. Comprobación
SHA256 antes/después de 64 archivos protegidos: frontend, migraciones originales 2B/2C,
seed/config/tipos/Auth test runtime/package/lockfile sin cambios. No nuevo helper/grant.

## 29. Confirmación de scope

NO hosted/login/link/Vercel/deployment. NO Storage bucket/objects policies/uploads.
NO frontend client/AuthProvider/login/register/MFA UI/route guards/Carta DB/admin UI.
NO ledger/compras/balance/reversals/rewards/vouchers/QR/auditoría económica.
NO global Platform writes, service_role assertions, SECURITY DEFINER de autorización,
private API exposure, commit/push/stage. Sólo LOCAL y revisión siguiente del usuario.

## 30. Recomendación exacta Task 2G

Próximo pedido: **"Task 2G — Supabase Storage menu-images & tenant authorization (LOCAL)"**.
Antes implementar, releer V2/SECURITY/DATABASE/2C y revisar contrato public/private del bucket
y comportamiento de archivos públicos/de borrado/revocación; documentar decisión explícita.
Implementar exclusivamente frontera Storage del menú: bucket/permisos, MIME/extensiones/
tamaño, path canónico `<business_uuid>/<asset_uuid>`, ownership/operaciones por business membership
vigente y lectura de metadata Platform read-only con AAL2 donde corresponda al diseño aprobado.
Private fuera de API; no global Storage writes/economía/UI/hosted/commit/push. Probar anon/customer/
Admin A/B/Both/Platform AAL1/AAL2, paths conocidos/cross-business/update path/revocación same-JWT,
lectura/upload/update/delete y reset/rebuild. No confundir public object URL con metadata RLS,
ni prometer revocación retroactiva de archivos públicos/cacheados. Reportar gaps/STOP si
requiere rediseño. Realizar sólo tras nuevo prompt y aprobación del alcance/diff 2C.
