# CanjeProyect

Fundación frontend de una futura plataforma SaaS de fidelización para comercios. **Valhalla Space**, de Villaguay, Entre Ríos, es el piloto y el único negocio visible durante el MVP.

> **Antes de implementar una feature, leer `/docs`.**

## Estado actual

Task 01/01B entrega una aplicación ejecutable de demostración con React, Vite, TypeScript, Tailwind, React Router y PWA. Incluye rutas skeleton, navegación responsive, design tokens de Valhalla y datos mock explícitos. No existe todavía backend, Auth, base de datos ni operación económica real.

Task 02 transforma la entrada pública en una Carta Digital de bebidas: cuatro categorías sticky, 16 productos de muestra, recomendado, agotados y onboarding Valhalla Points. Los puntos se derivan del precio exclusivamente para la demo. Las demás rutas siguen siendo skeletons.

## Ejecutar localmente

Requisitos: Node.js 22.12 o posterior y pnpm 11.

```bash
pnpm install
pnpm dev
```

Validaciones: `pnpm lint`, `pnpm typecheck` y `pnpm build`.

Para probar desde un teléfono en el mismo Wi‑Fi:

```bash
pnpm --filter @canjeproyect/web dev --host 0.0.0.0 --port 5173 --strictPort
```

Abrir en el teléfono la URL Network que imprime Vite. Es una vista de desarrollo local; no constituye hosting público y deja de estar disponible cuando se detiene el servidor. El acceso depende de la red local y del firewall. No cambiar automáticamente reglas del sistema.

## Rutas de demostración

- `/`: Carta Digital pública de bebidas con datos ilustrativos.
- `/points`: saldo e historial mock.
- `/rewards`: recompensas mock, sin canje.
- `/profile`: perfil y QR placeholder no funcional.
- `/admin`: layout conceptual sin permisos ni operaciones.

## Estructura

```text
apps/web/                Frontend React/Vite/PWA
  src/assets/brand/      Assets originales por negocio
  src/app/               Bootstrap y rutas
  src/components/        Componentes compartidos
  src/features/preview/  Datos mock de Task 01
  src/features/menu/     Tipos, fuente mock y componentes de la Carta Digital
  src/layouts/           Layouts customer/admin
  src/pages/             Skeletons de rutas
  src/styles/            Tokens y CSS global
packages/domain/         Reserva para contratos y reglas puras futuras
supabase/                Reserva documental; sin migraciones ni funciones
docs/                    Fuente de verdad del producto y la arquitectura
```

## Reglas de contribución

- Mantener los datos mock separados de la lógica futura.
- No colocar secretos en el repositorio. `.env.example` contiene solo nombres de variables previstas.
- No implementar decisiones abiertas sin registrarlas en `docs/DECISIONS.md`.
- Ningún componente frontend tendrá autoridad sobre puntos, canjes o vouchers.
- El logo suministrado se conserva sin redibujarlo ni generar variantes artificiales.

Git está inicializado localmente sobre `main`. No hay remote ni push. Supabase está previsto para una etapa posterior y todavía no está conectado.
