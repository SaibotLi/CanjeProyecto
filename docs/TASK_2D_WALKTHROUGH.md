# Task 2D — Public Menu Data Integration

Implementación: 03/10/2026. **TASK 2D COMPLETADA/APROBADA por el usuario el 05/10/2026.**

## Cierre visual/manual aportado por el usuario

El prompt de Task 2E confirma expresamente que el usuario validó en navegador real:
Carta renderiza correctamente, responsive/diseño aprobado conservado, datos Supabase
visibles y ningún problema visual bloqueante. Se registra esa aprobación humana, no
capturas ni inspección de consola realizadas por el agente. El gate de avance a 2E queda
cerrado por dicha autorización. Las pruebas técnicas anteriores siguen vigentes.

Los apartados inferiores conservan la evidencia histórica del 03/10, incluidos bloqueo
de Browser Use y checklist que entonces estaba pendiente; no atribuyen al usuario pruebas
individuales adicionales ni garantizan PWA instalada/notch físico. No se usó Vercel ni se
eludió la política del navegador. La validación visual de Auth 2E es un gate independiente.

## 1. Executive summary

Carta reemplaza su fuente mock por Supabase LOCAL → consulta pública tipada → mapper → contratos → componentes React existentes. Se mantiene el lenguaje visual aprobado, con adaptaciones funcionales mínimas para carga/error/vacío y centavos. Seed demo real de DB, cinco bebidas, no catálogo comercial confirmado. Sin cambios backend/seguridad ni autoridad económica frontend.

Preparación: attachment Task 2D, README y TODOS los documentos de /docs leídos antes de modificar; contratos/componentes/routing/hooks/env/tipos/seed inspeccionados. Worktree ya tenía cambios de 2A/B/C/G: preservados, sin staging.

## 2. Archivos nuevos/modificados por 2D

Nuevos:

- apps/web/src/lib/supabase.ts
- apps/web/src/features/menu/publicMenuQuery.ts
- apps/web/src/features/menu/menuMapper.ts
- apps/web/src/features/menu/publicMenu.ts
- apps/web/src/features/menu/menuState.ts
- apps/web/src/features/menu/usePublicMenu.ts
- apps/web/src/features/menu/components/MenuLoadState.tsx
- apps/web/tests/menu-data.test.mjs
- apps/web/tests/menu-local.test.mjs
- apps/web/tests/register-typescript.mjs
- apps/web/tests/typescript-loader.mjs
- docs/TASK_2D_WALKTHROUGH.md

Modificados:

- package.json, apps/web/package.json, pnpm-lock.yaml: SDK oficial y scripts de pruebas.
- src/pages/MenuPage.tsx: hook/datos reales, estados y copy estimativo.
- features/menu/types.ts, presentation.ts: contrato centavos/flag y formato ARS.
- features/menu/components/MenuItemCard.tsx, MenuSection.tsx, PointsOnboarding.tsx: puntos deshabilitables, alt real, copy sin promesa de acreditación.
- features/menu/menu.css: sólo estados funcionales; reglas previas de diseño conservadas.
- features/menu/data.ts: comentario de referencia histórica; catálogo/assets no borrados.
- components/PreviewNotice.tsx, layouts/CustomerLayout.tsx: aviso de Carta conectada; los otros avisos no cambian.
- lib/env.ts: únicamente comentario, validación existente intacta.
- README raíz/web/lib; docs ARCHITECTURE, DATABASE, PROJECT_BLUEPRINT, ROADMAP, SUPABASE_WORKFLOW, SECURITY, DECISIONS, UI_GUIDE.

Rutas relativas de frontend anteriores referidas a apps/web/src. La lista no atribuye a 2D los cambios preexistentes (CLI/config/env/tests backend anteriores, etc.).

## 3. Supabase client

@supabase/supabase-js **2.117.2**, exacta, fijada en manifest y lockfile. Un singleton browser lazy tipado Database, creado sólo después de readSupabaseEnvironment. Usa exclusivamente VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY. No secreto/service_role/password/privileged JWT en frontend.

Carga dinámica del módulo desde hook: SDK en chunk separado, sin silenciar el umbral de warnings Vite. Auth persistSession/autoRefreshToken/detectSessionInUrl=false en 2D; no provider/login/session UI. 2E configurará deliberadamente esas opciones según el flujo aprobado. Clientes aislados de tests reciben JWT reales para verificar publicación independiente de autoridad.

## 4. Data access architecture

publicMenuQuery conoce tablas/relaciones y filtros; menuMapper realiza snake_case → contrato explícito; publicMenu orquesta lectura/URL y resultados sin exponer diagnósticos; usePublicMenu administra carga/cancelación/reintento; MenuPage compone UI. Cards reciben MenuItem, nunca rows DB, SDK ni consultas. Tipos generados usados sólo por la capa de datos; ninguna edición manual de database.types.ts, ningún any.

## 5. Query real

Una consulta PostgREST a businesses, maybeSingle por slug **valhalla-space**, sin UUID de desarrollo:

```text
businesses(id,is_active)
  loyalty_settings(currency_per_point,points_enabled)
  menu_categories!menu_categories_business_fkey(id,name,slug,display_order,is_active)
    menu_items!menu_items_business_category_fkey(
      id,business_id,category_id,name,description,price_amount,
      image_path,image_alt,image_presentation,is_active,
      is_available,is_featured,display_order)
```

Los embeddings usan FK tenant existentes; no necesitan nueva vista/RPC/policy. Una sentencia/snapshot para el catálogo: no se combinan lecturas separadas de business antes/después de cambiar publicación. Embeddings left conservan el negocio activo sin productos; mapper oculta categorías vacías. Catálogo pequeño probado (seed 5); no se reivindica validación de paginación/catálogo masivo ni carga productiva.

## 6. Mapper DB → frontend

Mapeo explícito de todos los campos solicitados. Null description/image_alt → undefined. price_amount conserva number con centavos para presentación. photo → cover por default; cutout → presentación cutout existente. is_available/is_featured/display_order conservados. Categorías/items ordenados displayOrder/id sin mutar rows. Defensa adicional para publicación, relaciones tenant y precio/settings/presentación inválidos; falla controlada, no inventa datos.

## 7. Public filtering / session independence

Filtros SIEMPRE en la consulta:

```text
slug = valhalla-space
is_active = true
menu_categories.is_active = true
menu_categories.menu_items.is_active = true
menu_categories.order = display_order.asc,id.asc
menu_categories.menu_items.order = display_order.asc,id.asc
```

Anon, customer, Admin A, Admin B, Admin Both, Platform AAL1 y Platform AAL2 ven resultados idénticos para la Carta de Valhalla. Se probaron item/category/business inactivos bajo todos esos clientes. Ningún draft visible a través de mayor autoridad. Tenant B de fixture no aparece en Carta A. Sin cambios RLS/helpers/grants.

## 8. Money handling

DB conserva NUMERIC(14,2). JS number se limita a presentación. Intl es-AR/ARS: enteros mantienen $ 4.000; fracciones muestran $ 6.500,50 y $ 4.321,25, sin eliminar centavos. Tests cubren ,01, ,50 y límite 999999999999.99. No cálculo económico autoritativo, sumas de compras, escritura de saldos ni persistencia de importes desde UI.

## 9. Loyalty preview

floor(price / currency_per_point real), sólo estimación por producto. points_enabled=false oculta badges y onboarding. Sin fallback a 1000 si falta settings. Tests divisor 1500.50/flag y guards. Dos bebidas 6500 muestran +6 cada una; consumo futuro total 13000 podría dar 13. Copy/aria-label/endnote distinguen estimación de saldo o acreditación; /points continúa demo.

## 10. Storage URL

image_path → client.storage.from('menu-images').getPublicUrl(path).data.publicUrl. Derivación pura, sin HTTP/listing/metadata/signed URL. Se comprobó cero requests al generar URL y luego descarga pública real del PNG propio sin key/JWT. PUBLIC bucket ≠ public administrative listing sigue vigente. Sin datos confidenciales en path/metadata ni nuevas escrituras en aplicación.

## 11. Fallback behavior

Null path no genera URL: card conserva vaso SVG neutral existente. onError del img conserva fallback existente, sin recurrir a imágenes mock. Alt usa image_alt o nombre real, ya no dice “ilustración de muestra” para un asset DB. Assets históricos y marca se preservan; no se importan por fallback. Null/markup y URL/binary real probados. **Error de carga de img en browser pendiente**, no demostrado mediante SSR.

## 12. Loading / empty / error / not-found

- Loading: texto claro, aria-busy/aria-live, tres placeholders estáticos y reserva de altura 28rem; sin animación/redefinir diseño.
- Success: categorías/cards existentes con datos mapeados.
- Empty: negocio activo sin bebidas publicadas, categorías vacías ocultas, mensaje y reintento.
- Not-found: negocio inexistente/inactivo, no presenta Carta ni datos demo.
- Error: red/DB/settings/env inválidos visibles y controlados, reintento; no diagnostics/config/key ni mocks.

Abort al desmontar/cambiar request (StrictMode incluido), timeout 15s y reintento desde botón nativo. Los estados tienen pruebas markup SSR y reader; **CLS/interacción/foco real pendientes**. No se atribuye a placeholders garantía de cero layout shift.

## 13. Mocks status

features/menu/data.ts queda referencia histórica explícita, no importado por runtime de Carta ni fallback de failure. No dos fuentes autoritativas. Otras rutas conservan mocks/skeletons Foundation, señalados como vista de prueba. Seed Supabase sigue DEV demo no comercial: lectura real de DB ≠ datos reales de clientes/productos confirmados.

## 14. Tests nuevos

`pnpm test:menu`: **10 PASS**. Ejecuta source real con loader TypeScript existente, sin copiar implementación ni instalar framework de tests. Mapper, centavos, null/imageUrl, flags, orden/id, categorías vacías/inactivas, settings/relación inválida, preview, card SSR, estados accesibles SSR, builder/filtros/order, missing/empty/error. SDK/fetch de red simulada sólo para unit tests controlados; no reemplaza integración.

Loader usa node:module.register compatible con engines existente (>=22.13); ejecución efectiva aquí Node24.16.0/pnpm11.19.0. Typecheck valida fuente productiva; JS tests no sustituyen checks TS.

## 15. Integración LOCAL real

`pnpm test:menu:local`: **11 PASS** (10 subtests + contenedor). Cliente oficial sobre PostgREST real, publishable key y JWT Auth reales. Cinco identidades ficticias, MFA enrollment/challenge/verify real para Platform AAL2, siete variantes de lectura incl. anon. Tenant B/categoría vacía propios, upload PNG por Admin A real; GET binario público sin credentials.

Guards target/config/link/Docker/endpoints + checksum seed aprobado y cero users; no reset automático. Snapshot original y restauración en finally; tenant/identidades/objeto propios retirados. Server-only fixture credential encapsulada del tooling aprobado sólo cleanup, nunca assertions ni browser. Proceso abortado requiere inspección antes de repetir. No suite concurrente con desarrollo modificando datos.

## 16. DB mutation checks y validación manual pendiente

Comprobados mediante **mutaciones DEV y lecturas HTTP/SDK reales automatizadas**, no afirmados como recargas manuales browser:

| Comprobación | Resultado técnico |
| --- | --- |
| Seed | 4 categorías / 5 items, centavos y featured/agotado reales |
| Nombre/precio | Nueva lectura refleja “Task 2D renamed”, 4321.25 |
| Item inactive | Desaparece para siete variantes de acceso |
| Category inactive | Categoría y todos sus items desaparecen para siete variantes |
| Business inactive | Not-found bajo todos los clientes |
| is_available false | Producto publicado sigue visible como agotado |
| display_order | Cambian orden de categorías/items; id desempate |
| image_path null | Sin URL; markup del vaso neutral |
| Path/objeto real | URL menu-images devuelve bytes PNG exactos sin JWT/key |
| Settings | Divisor real 1500.50 y points_enabled=false reflejados |
| Empty | Sin items publicados devuelve menú vacío válido |

Final: checksum lógico **5bc80b32792095fb6cf02694de9626a1**, mismo que antes; cero Auth users/profiles/memberships/platform rows/Storage objects. Timestamps administrados por DB, no restituidos artificialmente. No datos útiles preexistentes borrados.

**Bloqueo browser real:** al intentar abrir http://127.0.0.1:5173/ la herramienta respondió:

> Browser Use rejected this action due to browser security policy. Reason: A saved user permission setting blocks this action. Browser use cannot access http://127.0.0.1:5173 because the user has a saved preference that blocks it.

No se cambiaron permisos/configuración ni usó workaround/otro navegador/raw CDP/Playwright/hosted para superar el bloqueo. Se notificó al usuario y pidió habilitar el acceso local si quiere continuar. **Cero capturas nuevas, consola browser no inspeccionada.** El servidor Vite pudo iniciarse con URL/publishable key LOCAL sólo en memoria; no se creó/sobrescribió .env.local.

Para cerrar: con navegador permitido + stack/config local, inspeccionar 390×844 primero y 360/430/768/1280; seed real, agotado/centavos, featured, fallback null/broken y PNG real, sticky/pills, bottom nav, overflow, safe areas, teclado/foco, loading lento/error/retry/empty/not-found, cancelación/unmount y consola. Repetir cambios DEV y **recarga real**, restaurando inmediatamente fixtures como en la suite. No validar mediante deployment viejo/hosted. Si requiere corrección local, documentar y verificar antes de cierre.

## 17. Validaciones ejecutadas

| Validación final | Resultado |
| --- | --- |
| pnpm lint | PASS, cero warnings |
| pnpm typecheck | PASS |
| pnpm build | PASS; manifest/service worker generado; sin warning chunk >500kB final |
| web test:env | 6 PASS |
| pnpm supabase:types:check | PASS, zero drift |
| pnpm test:menu | 10 PASS |
| pnpm test:menu:local | 11 PASS |
| supabase:test:db | 1.092 pgTAP PASS, cinco suites incl. inventarios 2C/2G |
| supabase:test:authz | 31 PASS, JWT/TOTP y same-JWT reales |
| supabase:test:storage | 24 PASS, DELETE app DENY incluido |
| supabase:test:smoke | 6 PASS |
| git diff --check | PASS; sólo aviso normal LF→CRLF, sin modificar config Git |
| Hashes 22 archivos backend previos | Cero cambios |
| Estado DB final | Seed restaurado; 24 policies app + 3 Storage, cero fixtures |
| Browser visual/manual | Bloqueado para el agente el 03/10; aprobado por validación del usuario el 05/10 |

No db reset en 2D: se reutilizó stack local con seed limpio verificado. Orphan-probe histórico NO ejecutado; no policies temporales de DELETE. Build final JS main 336.09kB / gzip107.30kB, SDK chunk224.38kB / gzip58.80kB; no elevar límite para ocultar warning. API cache/PWA config intactos.

Final operativo: Vite detenido y Supabase stop normal completado; volúmenes/datos preservados. Para retomar visual se necesita iniciar nuevamente stack + dev con las dos variables públicas locales; no configuración persistida ni hosted por esta ejecución.

## 18. Documentación

README raíz/web/lib y ARCHITECTURE/DATABASE/PROJECT_BLUEPRINT/ROADMAP/SUPABASE_WORKFLOW sincronizados con lectura real, mapper/filtros/URL/fallback/estados/mocks. SECURITY/DECISIONS/UI_GUIDE actualizan sólo contrato existente y su realización, no nuevas decisiones sensibles. Walkthroughs previos conservan evidencia histórica; 2D no reescribe aprobación 2B/2C/2G. Auth/Admin/hosted/economía no marcados completos. README aclara que frontend Wi-Fi solo ya no conecta API loopback desde teléfono, sin abrir firewall/reducir env guard.

## 19. Warnings / límites

Gate visual/manual pendiente es real, no aprobación automática por tests/build/SSR. Contenido/brand/iconos definitivos y carga comercial siguen pendientes. Browser Auth disabled deliberadamente en 2D; transición sesión/invalidation/callback pendiente 2E. Sin realtime de catálogo: próxima recarga/reintento obtiene publicación actual. Imagen null se ve fallback, no branding mock. URL pública no comprueba existencia; error de imagen debe resolver onError existente, aún pendiente de verificación browser.

SDK trae módulos Auth/Storage/Realtime como dependencia técnica, no implica esas UI/funcionalidades implementadas. JS numbers sólo presentación, nunca economía exacta. Catálogo masivo/paginación/carga no certificados. Tests exclusivos sobre seed limpio; snapshots restauran contenido lógico, timestamps DB siguen avanzando. No env persistido por esta ejecución; desarrollo posterior necesita sus dos variables públicas locales. Docker puertos publicados requieren red confiable y stop normal al terminar, conforme workflow.

## 20. Diff summary

Cambios nuevos limitados a dependencia cliente/tests, lectura/mapper/hook/estados/copy/format de Carta y documentación. Sin rediseño: reglas previas de cards/header/navigation/spacing/color/fonts permanecen. Único CSS añadido para estados. Branding/assets/routing/useActiveCategory/PWA config/economía sin modificación. Cuatro migrations/config/seed/tipos/backend tests/helpers anteriores conservan hashes (22 archivos protegidos), no drift. El diff Git completo incluye cambios anteriores no atribuibles a esta Task; ningún stage.

## 21. Confirmación de scope

- NO Auth UI/login/register/provider ni session feature.
- NO Admin/Platform funcional ni upload/delete UI.
- NO hosted Supabase, login/link/db push, Vercel o deployment.
- NO tablas/RPC/migrations/schema/RLS/grants/helpers modificados.
- NO ledger, saldo real, compras, rewards/vouchers/QR o economía.
- NO commit/push/stage. Trabajo preexistente preservado.
- NO reset automático, cleanup productivo/lifecycle ni DELETE app policy.

## 22. Recomendación exacta para 2E

Gate 2D cerrado por aprobación visual/manual del usuario el 05/10/2026; ese mismo prompt
autoriza exclusivamente Task 2E LOCAL. Ver TASK_2E_WALKTHROUGH.md para su ejecución y
gate visual separado. No ampliar RLS, roles globales ni autoridad metadata. Mantener
global platform read-only y aprovisionamiento privilegiado fuera de UI. Admin/economía/
hosted sólo cuando su Task/autorización lo habilite.
