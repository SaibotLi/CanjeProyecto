# Decisions — Architecture Decision Log

Las decisiones `CLOSED` no cambian sin una propuesta documentada y aprobación. `PROVISIONAL` identifica elecciones de Foundation que requieren validación. `OPEN` no debe resolverse por accidente en código.

## CLOSED

| ID | Decisión |
| --- | --- |
| D-001 | React + Vite + TypeScript para el frontend. |
| D-002 | Tailwind convive con design tokens CSS semánticos. |
| D-003 | PWA como formato instalable del producto. |
| D-004 | Supabase/PostgreSQL/Auth/RLS como backend previsto. |
| D-005 | Valhalla Space es el piloto y único negocio visible del MVP. |
| D-006 | Arquitectura de datos preparada para múltiples negocios. |
| D-007 | Roles iniciales `customer` y `admin`; no existe `staff`. |
| D-008 | Admin pertenece a `business_memberships`, no a `profiles.role`. |
| D-009 | `point_transactions` será un ledger inmutable y fuente de verdad. |
| D-010 | Reversiones mediante transacciones compensatorias. |
| D-011 | Operaciones económicas sin autoridad frontend. |
| D-012 | Menú público sin carrito, pedidos ni pagos. |
| D-013 | Experiencia customer mobile-first. |
| D-014 | Inter Variable como tipografía actual de body/UI. |
| D-015 | Identidad Valhalla basada en amarillo intenso y negro azulado. |
| D-016 | Regla inicial prevista: 1 punto por cada 1.000 ARS usando `floor`. |
| D-017 | Carta actual de Valhalla exclusivamente de bebidas, pública y sin Auth. |
| D-018 | Categorías iniciales: Cervezas, Tragos, Vinos / Espumantes, Sin alcohol. |
| D-019 | Categorías e items se ordenan mediante displayOrder; los componentes reciben props. |
| D-020 | Task 02 deriva puntos como preview no autoritativo, sin persistir puntos en productos. |
| D-021 | Featured e isAvailable son estados de presentación; agotados permanecen visibles. |
| D-022 | Categorías sticky con scroll a secciones y seguimiento de la categoría activa. Búsqueda fuera de Task 02. |
| D-023 | Task 02B cambia el lenguaje de Carta a app móvil: sin numeración editorial ni hero, pills compactas y productos en una columna mobile. |
| D-024 | Imagen opcional pequeña para productos normales; featured con imagen protagonista. Placeholders locales seguros mientras no existan assets reales autorizados. Sin carrito ni nueva lógica económica. |

## PROVISIONAL

| ID | Elección pendiente de validación |
| --- | --- |
| P-001 | Oswald Variable como `current display candidate`. |
| P-002 | Valores exactos de algunos tokens de color, radios y espaciado. |
| P-003 | Asset raster suministrado para header; favicon/PWA sigue siendo placeholder. |
| P-004 | Composición y copy de los skeletons actuales. |
| P-005 | Catálogo, precios y disponibilidad mock de Carta, hasta recibir información del negocio. |
| P-006 | Copia WebP lossless para headers; master conservado. Favicon/app icon continúa pendiente. |
| P-007 | Composición Task 02B: thumbnails 72 px, cards compactas, featured 16:9 mobile, onboarding breve y bottom nav. Inspección del deployment superada el 30/09/2026; refinamientos con catálogo real/negocio siguen posibles. |
| P-008 | Siete ilustraciones SVG locales originales y fallback neutro; no son fotos ni imágenes oficiales del catálogo. Reemplazo por assets definitivos pendiente. |

## OPEN

| ID | Tema |
| --- | --- |
| A-001 | Método de login: email, teléfono/OTP o combinación. |
| A-002 | Comportamiento al revertir una compra si el cliente ya gastó puntos. |
| A-003 | Expiración de puntos y vouchers. |
| A-004 | Referencia obligatoria de una compra acreditada. |
| A-005 | Quién puede otorgar/revocar membresías admin y por qué canal. |
| A-006 | Token QR firmado o aleatorio con hash persistido. |
| A-007 | Datos mínimos, consentimiento y retención. |
| A-008 | Reglas y efectos de gamificación y votaciones. |
| A-009 | Modelo de URL, onboarding y tema para el segundo negocio. |

## Protocolo

Todo cambio de una decisión cerrada incluye problema, alternativas, impacto en UI/datos/seguridad y actualización de los documentos afectados antes de implementarse.

## Task 02B — cambio visual autorizado y estado

La dirección tipográfica de Task 02 se sustituye, a pedido del usuario, por una Carta app-first con apoyo visual. El baseline público fue inspeccionado en 390/360/430/1280 px el 30/09/2026; no sirve para validar los cambios locales posteriores. Oswald continúa provisional y se usa con moderación, sin cambiar Inter ni la paleta aprobada. Los contratos MenuCategory/MenuItem/MenuData, displayOrder, mocks económicos y hook de categorías se conservan. Se elimina únicamente la prop visual `number` de MenuSection, porque deja de existir esa numeración.

Task 02B CERRADA el 30/09/2026 tras validar el deployment publicado por el usuario en 390/360/430/768/1280 px, con capturas reales, navegación, teclado/foco, estados y consola sin errores/warnings. No se requirieron correcciones de código ni otro deployment. Safe areas no nulas y ciclo de actualización de PWA instalada quedan como comprobaciones de producción; Oswald y recursos de muestra continúan provisionales. No se realizaron commit, push, deployment propio ni cambios de backend en Task 02B.
