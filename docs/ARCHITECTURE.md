# Architecture — CanjeProyect

## Estado implementado

El frontend vive en `apps/web` y usa React, Vite, TypeScript, Tailwind, React Router, ESLint y una PWA básica con `vite-plugin-pwa`. Las fuentes se sirven localmente. Las rutas usan layouts diferenciados para customer y admin.

```text
src/
  app/                 bootstrap y router
  assets/brand/        assets originales organizados por negocio
  components/          UI compartida
  features/preview/    datos mock de Foundation
  features/menu/       contratos, fuente mock, presentación y componentes de Carta
  layouts/             customer y admin
  lib/                 límite futuro de integraciones
  pages/               skeletons de rutas
  styles/              tokens de tema y estilos globales
  types/               contratos de presentación
```

No se mantienen carpetas vacías. `packages/domain` queda reservado para reglas puras y contratos cuando aparezca dominio real.

## Carta Digital — Task 02

```text
features/menu/data.ts (fuente de muestra)
  → MenuPage (ordena por displayOrder y compone secciones)
    → CategoryNavigation (navegación sticky)
    → MenuSection (props: categoría e items)
      → MenuItemCard (props: item y regla de preview)
    → PointsOnboarding (enlace público a /points)
```

Los componentes de presentación no importan mocks. `MenuPage` es el punto que recibe la fuente actual; un adaptador Supabase de lectura podrá reemplazarla sin reconstruir las cards.

`MenuCategory` contiene id, name, slug y displayOrder. `MenuItem` contiene id, businessId, categoryId, name, descripción e imagen opcionales, price en pesos ARS enteros, isAvailable, isFeatured y displayOrder. No contiene puntos persistidos.

`presentation.ts` formatea ARS y deriva puntos visuales por floor usando `previewCurrencyPerPoint=1000`. Esa función pertenece al módulo de presentación y jamás debe importarse en un flujo económico como autoridad.

`useActiveCategory` lee posiciones de las secciones durante scroll mediante un listener pasivo y requestAnimationFrame; no instala una librería de animaciones. La selección respeta reduced motion y el carril horizontal mueve únicamente su propio scroll.

La Carta es pública, solo bebidas y sin búsqueda. Featured modifica la presentación del mismo producto; availability mantiene agotados visibles. Todos los estados y precios de Task 02 son de muestra.

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

La PWA actual genera manifest, service worker y un icono provisional. El cache solo cubre el shell estático. Las futuras acciones autenticadas o económicas requerirán conexión y no se considerarán completas desde una cola local.

## Multi-business

Valhalla está fijo como contexto visual del piloto. El futuro aislamiento se resolverá en datos, RLS y membresías. El frontend recibirá configuración temática por negocio en vez de repetir colores dentro de componentes.

## Integraciones pendientes

Supabase, Auth, tipos generados, migraciones, políticas RLS y funciones económicas no existen todavía. `.env.example` es únicamente una reserva de nombres.
