# Architecture — CanjeProyect

## Estado consolidado — 08/10/2026

Admin añade store de catálogo frontend con deadline por request y cache de display del
mismo dueño, separado de la autoridad vigente. Refresh/error recuperable conserva el
editor; permisos desconocidos pausan writes. [Regresión temporal](ADMIN_CATALOG_LIFECYCLE_FIX.md).

Sprint 2 + H1/H2/H3 completados. Frontend HTTPS https://valhallapp.vercel.app conectado a
Supabase Hosted liojmtsopplgzderrrqi. Mismo cliente browser y arquitectura aprobada;
Production sólo URL/publishable key, raíz Vercel apps/web, Vite/Node24.x y rewrite SPA
versionado en apps/web/vercel.json. Auth/profile/Admin/Platform MFA read-only operativos.
Catálogo real vacío; puntos por producto sólo estimativos y /points-/rewards demostrativos.
No economía, tablas nuevas o permisos nuevos. SMTP custom/dominio bloquean piloto externo.
[Cierre vigente](SPRINT_2_CLOSEOUT.md). Secciones de Tasks siguientes describen historia LOCAL.

## Estado de cierre LOCAL 2H

2A/B/C/G/D/E/F aprobadas por el usuario. 2H integra y revalida las capas existentes sin
nueva arquitectura: DB catálogo/perfiles/memberships/platform; Auth sesión/email/AAL;
Storage assets públicos. Única corrección de producto: límite frontend display_name 80
igual al CHECK existente. Cinco migrations intactas, sin nuevas tablas/roles/policies.
Evidencia completa y límites físicos en [TASK_2H_WALKTHROUGH](TASK_2H_WALKTHROUGH.md);
transición manual futura en [SPRINT_2_CLOSEOUT](SPRINT_2_CLOSEOUT.md).

## Estado implementado

El frontend vive en `apps/web` y usa React, Vite, TypeScript, Tailwind, React Router, ESLint y una PWA básica con `vite-plugin-pwa`. Las fuentes se sirven localmente. Las rutas usan layouts diferenciados para customer y admin.

```text
src/
  app/                 bootstrap y router
  assets/brand/        assets originales organizados por negocio
  components/          UI compartida
  features/preview/    datos mock de Foundation
  features/menu/       consulta pública, mapper, contratos, hook y cards
  features/auth/       sessionStore/provider, acceso profile, TOTP y CSS propio
  layouts/             customer y admin
  lib/                 env lazy y cliente browser Supabase compartido
  pages/               skeletons de rutas
  styles/              tokens de tema y estilos globales
  types/               contratos de presentación
```

No se mantienen carpetas vacías. `packages/domain` queda reservado para reglas puras y contratos cuando aparezca dominio real.

## Carta Digital — fuente actual Task 2D

```text
Supabase (Hosted en Production; LOCAL sólo desarrollo) / businesses.slug=valhalla-space
  → publicMenuQuery (publicación explícita, relaciones tenant, un snapshot SQL)
  → menuMapper (DB → MenuData, orden displayOrder/id, oculta categorías vacías)
  → usePublicMenu (loading / success / empty / error / not-found)
  → MenuPage (compone secciones sin consultas ni rows DB)
    → CategoryNavigation (navegación sticky)
    → MenuSection (props: categoría e items)
      → MenuItemCard (props: item y regla de preview)
    → PointsOnboarding (enlace público a /points)
```

Las cards no importan Supabase, DB types ni mocks. MenuPage usa hook/contratos de presentación.
data.ts histórico, nunca fallback. Puntos/rewards siguen mocks; profile es real desde 2E.
2D COMPLETADA/APROBADA por validación visual/manual del usuario el 05/10/2026, no por SSR.

`MenuCategory` y `MenuItem` conservan sus campos aprobados; price en ARS admite centavos. `MenuData` agrega pointsEnabled opcional para compatibilidad con referencias, siempre poblado desde settings reales en runtime. NUMERIC(14,2) se presenta sin redondear centavos: enteros sin ,00, fracciones con dos dígitos. No puntos persistidos ni aritmética autoritativa JS.

`presentation.ts` deriva floor(price/divisor) con loyalty_settings.currency_per_point real; points_enabled=false oculta badges/onboarding. Sólo estimación por producto: dos de 6500 muestran 6+6, mientras 13000 total podría producir 13. Nunca importar como autoridad económica.

`useActiveCategory` lee posiciones de las secciones durante scroll mediante un listener pasivo y requestAnimationFrame; no instala una librería de animaciones. La selección respeta reduced motion y el carril horizontal mueve únicamente su propio scroll.

La Carta es pública, solo bebidas, sin búsqueda/pedidos. Featured y agotados conservan presentación. El seed local es ficticio (cinco productos), no datos comerciales confirmados. La consulta filtra business/category/item is_active=true aun con sesión admin; left embeddings permiten empty sin confundirlo con business ausente/inactivo. Mapper defensivo, abort al desmontar y timeout 15s; error genérico/reintento sin diagnósticos privados ni datos mock. Loading reserva altura con placeholders estáticos sin modificar el sistema visual.

Cliente oficial 2.117.2 compartido en chunk separado; env.ts validado antes de createClient.
Auth deshabilitado en la entrega histórica 2D; 2E lo habilita con implicit explícito,
persistSession/autoRefreshToken/detectSessionInUrl=true y debug=false. Un único cliente
productivo, pruebas aisladas con JWT reales. SDK administra tokens; React no los decodifica.

image_path → storage.from('menu-images').getPublicUrl(path), sin red/listado/metadata/signed URL. Null y onError conservan vaso SVG neutral; ninguna imagen histórica suplanta datos DB. Foto cover o cutout según mapper. Sin cambios de bucket/RLS/schema.

## Auth frontend LOCAL — Task 2E

SPA/PWA cliente-only sin SSR: ADR implicit cerrado para esta arquitectura; no verifier
ligado al dispositivo de origen. Docs actuales + GoTrue/Mailpit/SDK reales prueban confirmación
y recovery en adapter con storage previo/vacío. **No equivale a prueba física browser/PWA**.

Bootstrap crea singleton/store y suscribe antes de renderizar consumers. AuthProvider usa
useSyncExternalStore y desconecta subscription al desmontarse (StrictMode soportado).
INITIAL_SESSION es la única fuente inicial, no getSession competidor. Callback SDK síncrono;
profile/AAL se cargan fuera de él. epoch+generation impiden aplicar respuestas A a B. Un AAL
anterior no se conserva al recibir otra sesión. Logout local oculta sesión/perfil de inmediato;
si falla, mensaje central y reintento, sin anunciar éxito ni borrar todo localStorage.

Rutas públicas /login, /register, /auth/forgot-password, /auth/callback, /auth/recovery;
/profile y /auth/mfa requieren sesión únicamente. Ningún guard admin/platform. Profile
select explícito id=user.id (incluso con global READ), mapper sin email/metadata; UPDATE
display_name sólo. Email desde Auth. Recovery requiere evento oficial PASSWORD_RECOVERY;
sesión normal/direct access no activa el form. SDK procesa fragment; después initialize
se limpia URL Auth sin imprimir valores. Callback directo/malformed no acepta login previo.

TOTP opcional: listFactors.all con verified/unverified, enroll → QR/secret efímeros →
challenge/verify → AAL2. Cancelación explícita retira unverified; abandono deja factor pendiente
visible para retiro, nunca vuelve a mostrar secret. Verified unenroll requiere AAL2 y se
refreshSession después para downgrade. AAL2 no es autoridad; PostgreSQL conserva fila actual
+ AAL2 para global READ, sin global writes. Recuperación privilegiada MFA antes del piloto.

Carta reconsulta al cambiar la revisión de Auth (incl. refresh/logout), aborta lectura anterior
y conserva filtros públicos. No cache privado ni cambio de schema/policies. Auth 2E
COMPLETADA/APROBADA por validación humana en prompt 2F; ciclo PWA físico pendiente antes del piloto.
[Evidencia técnica y cierre humano](TASK_2E_WALKTHROUGH.md).

## Asset de marca para web

El master PNG permanece intacto (1.542.107 bytes). Se creó `valhalla-logo-web.webp` lossless a la misma resolución (1536×1024, 578.398 bytes) para los headers, sin recorte ni redibujo. La comparación RGBA confirmó que no cambió ningún canal de píxeles visibles; WebP descarta RGB oculto de píxeles totalmente transparentes. El archivo maestro no se importa al bundle y se conserva como fuente.

## Capas futuras

```text
UI React
  ↓ expresa intención
Dominio y casos de uso
  ↓ usa adaptadores tipados
Supabase/PostgreSQL + Auth + RLS
  ↓ aplica autorización y atomicidad
Ledger, canjes, vouchers y auditoría
```

La UI puede validar entradas para mejorar la experiencia, pero nunca decide el resultado económico. Acreditar, revertir, canjear y consumir vouchers requerirá RPC SQL segura o Edge Function que delegue la transacción final a PostgreSQL.

## PWA

La PWA genera manifest, service worker e icono provisional. Sólo precache del shell estático,
runtimeCaching vacío. 2E retira /auth/ del navigation denylist: callbacks/recovery son rutas
SPA, no respuestas del API Auth. /api/ permanece excluido. No emails/tokens/respuestas privadas
en SW ni colas offline. HTTP directo y regla build comprobados; PWA instalada/refresh físico
pendientes de inspección física antes del piloto; no bloquean 2H LOCAL. Hosting futuro debe servir fallback SPA.

## Multi-business

Valhalla está fijo como contexto visual del piloto. El aislamiento de datos ya está implementado mediante business_id/FK/RLS/memberships de Sprint 2, con pruebas A/B/Both. El futuro frontend SaaS recibirá configuración temática por negocio sin repetir colores ni introducir selector/onboarding multi-business ahora.

## Integraciones pendientes

**2G COMPLETADA/CERRADA LOCAL (02/10/2026), aprobable**: A-S2-003 APPROVED. menu-images PUBLIC, 5 MiB/MIME
allowlist, tres policies tenant/platform/INSERT estándar. Archivo e info/custom metadata de
path conocido públicos; UUID no es confidencialidad. **PUBLIC bucket ≠ public administrative
listing.** Listado propio incluso tenant inactivo; global sólo Platform DB+AAL2/menu-images;
upload sólo membership actual + negocio activo, metadata vacía, name canónico aprobado.
Sin UPDATE/overwrite/move ni global writes. Helpers/ACL gestionadas intactos.

**A-S2-004 APPROVED/DEFERRED:** DELETE app DENY en Sprint 2 es correcto; STOP resuelto.
NOT EXISTS falló publicación concurrente y candidato fue retirado. Reemplazar con nuevo UUID/
path y PATCH posterior; objeto anterior orphan temporal es deuda operacional aceptada,
no leak/corrupción por sí mismo. Sin FK/lookup Storage, lifecycle/cleanup automático ni DEFINER.
A-S2-005 futura: GC coordinado antes de cleanup productivo significativo, con concurrencia,
gracia, revalidación, auditoría y fallos DB/Storage. [Evidencia](TASK_2G_WALKTHROUGH.md).
En 2G modelo image_path, seguridad 2C y frontend quedaron intactos; 2D se inició sólo por pedido posterior.

2A prepara CLI/config/env; 2B las siete tablas/constraints/triggers/tipos. Task 2C añade
migración forward-only con helpers INVOKER, 24 policies y grants por columna; pruebas reales
Auth/TOTP/REST y revocación same-JWT, exclusivamente LOCAL. 2D lectura pública completada/
aprobada por el usuario; [evidencia](TASK_2D_WALKTHROUGH.md). 2E Auth COMPLETADA/APROBADA.
2F Business Admin y Platform mínimo COMPLETADOS/APROBADOS por revisión humana declarada
en prompt 2H; A-S2-006 APPROVED. Lifecycle Storage, hosted y economía siguen futuros.
Consultar [esquema real](DATABASE.md), [seguridad](SECURITY.md), [V2](SPRINT_2_ARCHITECTURE.md)
y [workflow](SUPABASE_WORKFLOW.md); no inventar autoridad global ni exponer private.

El helper business consulta memberships sin pasar por businesses; el helper platform consulta
su fila private bajo policy directa auth.uid(). authenticated sólo tiene USAGE private,
SELECT(user_id) propio y EXECUTE de helpers. Cadena acíclica; no SECURITY DEFINER adicional.
Global SELECT exige simultáneamente fila DB vigente y JWT verificado AAL2; ninguna global
write. Membership independiente + negocio activo concede writes locales. Corrección
forward-only 20261002140000 agrega negocio activo a INSERT/UPDATE menú, no al helper.
READ propio sigue permitido en inactivo; reactivación sólo canal privilegiado futuro, no app.
Carta pública 2D aplica filtros explícitos de publicación incluso con sesión admin (policies PERMISSIVE se combinan OR), probado con JWT reales.

## Experiencia Business Admin — Task 2F LOCAL

AuthorityProvider/store separado del Auth store. Consulta paginada de business_memberships
con filtro user_id propio y embedding FK de businesses; mapper a adminBusinesses/tenant.
Tenant operativo por slug valhalla-space, nunca UUID DEV. Rutas /admin y catálogo guardadas
por sesión y membership vigente. A/B/Both soportados sin selector SaaS nuevo.
Refetch en eventos Auth, navegación, foco/visibilidad, actualización manual y antes/después
de writes. Identity switch/logout elimina estado inmediato; respuestas tardías descartadas.
Refresh de misma identidad conserva el draft, deshabilita writes y revalida. Error de lectura
fail-closed. Guards sólo UX: PostgreSQL aplica permisos en cada operación.

adminData mapea filas y construye payloads whitelist; adminActions reconsulta autoridad y
negocio activo antes de escribir. UPDATE filtra tenant + id; .select().single() exige fila.
Catálogo propio incluye inactivos. Precios text input ARS decimal, sin separador de miles.
Upload al Save: File → nuevo UUID/path → Storage estándar metadata vacía/upsert=false →
PATCH/INSERT producto. No atomicidad DB/Storage. Receipt efímero permite retry sin upload
duplicado si falla DB; cierre/cambio de cuenta pierde receipt y puede dejar orphan aceptado.
No DELETE/lifecycle ni frontend economía. Carta conserva filtros públicos y fallback.

**A-S2-006 APPROVED:** RPC `public.is_current_user_platform_admin()` sin parámetros,
boolean STABLE INVOKER/search_path vacío, delega al helper privado actual. No AAL en su
resultado ni exposición de private. La capa authority obtiene el booleano real self;
`platformGate` combina por separado nivel Auth SDK: false → Forbidden, true+AAL1 →
/auth/mfa, true+AAL2 → /platform, lista mínima read-only de negocios. Refetch oculta contenido
global mientras verifica; consultas globales comprueban capability+AAL antes/después y
descartan respuestas tras cambio de identidad/revisión. RLS exige fila vigente+AAL2 en
cada request; no global writes ni inferencia por counts/metadata. Sin persistencia durable
de capability ni Realtime. Business Admin sigue sin MFA obligatorio. [Walkthrough 2F](TASK_2F_WALKTHROUGH.md).
