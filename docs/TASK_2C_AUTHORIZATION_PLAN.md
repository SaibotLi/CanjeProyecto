# Task 2C — contrato de autorización (corregido para respetar V2)

Definido antes de aplicar seguridad, 2026-10-02. Sólo LOCAL. La inspección real
confirmó el baseline 2B: siete tablas con RLS, cero policies/grants de aplicación,
dos triggers endurecidos, cero identidades y buckets. No contradicción material.

| Recurso | Público anon/authenticated | Propio authenticated | Business admin | Platform row + AAL2 |
| --- | --- | --- | --- | --- |
| businesses | SELECT activo | — | SELECT propio incluso inactivo; UPDATE name propio activo | SELECT global |
| profiles | No | SELECT propio; UPDATE display_name propio | Sin acceso extra | SELECT global mínimo |
| business_memberships | No | SELECT propias | Sin escrituras ni acceso extra | SELECT global |
| private.platform_admins | Nunca REST | SELECT(user_id) SQL propia fila | Sin acceso extra | Sin escrituras ni SELECT global |
| loyalty_settings | SELECT de negocio activo | — | SELECT propio; UPDATE currency_per_point/points_enabled con negocio activo | SELECT global |
| menu_categories | SELECT activa y negocio activo | — | SELECT propias incl. borradores/inactivo; INSERT/UPDATE propias con negocio activo | SELECT global |
| menu_items | SELECT activo + categoría activa + negocio activo; agotados visibles | — | SELECT propios incl. borradores/inactivo; INSERT/UPDATE propios con negocio activo | SELECT global |

No DELETE/TRUNCATE/REFERENCES/TRIGGER/CREATE desde aplicación. INSERT de menú sólo
columnas funcionales + business_id; IDs/timestamps los genera PostgreSQL. UPDATE
no incluye PK, tenant o timestamps. UPDATE administrativo verifica USING y WITH
CHECK. FK compuesta e image_path CHECK siguen protegiendo referencias tenant.
Corrección solicitada tras revisar 2C: la interpretación anterior permitía erróneamente
escrituras de menú con negocio inactivo. V2 requiere negocio activo para TODAS las escrituras
business-scoped. Nueva migración 20261002140000 restablece el contrato, sin reescribir 2B/2C.
Lecturas propias en inactivo continúan autorizadas. is_business_admin sigue únicamente
membership; lookup de business activo explícito en INSERT/UPDATE (USING/WITH CHECK), no
dentro del helper. Sólo canal privilegiado futuro reactiva negocio; ningún grant app is_active.

Policies permisivas, separadas por operación, combinadas OR. Platform SELECT no
concede writes ni reemplaza membership. AAL2 no restringe lectura pública/self ni
Business Admin. Carta pública futura (2D) debe filtrar publicación explícitamente:
una sesión admin puede ver borradores por otras policies.

Cadena sin recursión: businesses → is_business_admin → memberships →
is_platform_admin → private.platform_admins → auth.uid(). El helper business nunca
consulta businesses; la policy private nunca llama su propio helper. Helpers SQL
estáticos, INVOKER, STABLE, search_path vacío, owner postgres. authenticated recibe
USAGE private, SELECT(user_id) propio por RLS y EXECUTE sólo los dos helpers. anon
no recibe privilegios private. Ningún wrapper RPC público; private fuera de
schemas/search path de Data API. AAL2 se exige dentro de cada policy global con
auth.jwt()->>'aal', claim verificado por PostgREST, no metadata.

Pruebas: inventario esperado exacto de policies/ACL/funciones; regresión estructural
2B; REST real de todos los actores; TOTP enrolment/challenge/verify real en GoTrue
local; comprobar estados y filas afectadas, incluida denegación 200/[]; revocar
membership/platform row con MISMO JWT. Setup/revocación/cleanup privilegiados y
aserciones de operaciones vía JWT real. No service_role en assertions. Full reset
local/rebuild/retest. No Storage, frontend, economía, hosted, stage/commit/push.

Fuentes consultadas: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[column privileges](https://supabase.com/docs/guides/database/postgres/column-level-security),
[MFA](https://supabase.com/docs/guides/auth/auth-mfa),
[local TOTP flags](https://supabase.com/docs/guides/local-development/cli/config),
[Auth REST client source](https://github.com/supabase/auth-js/blob/master/src/GoTrueClient.ts),
[RFC 6238](https://www.rfc-editor.org/rfc/rfc6238).
