# Desarrollo compartido — empezar desde GitHub

Usar `main` para obtener el código integrado. Cada desarrollador trabaja en su clon y
Supabase LOCAL; no necesita acceso a credenciales Hosted para modificar/probar la app.

## Primera vez

Requisitos: Git, Node >=22.13, pnpm11.19.0 y Docker con contenedores Linux operativo.
Los permisos GitHub de lectura/escritura se administran por separado de los roles de la app.

```sh
git clone https://github.com/SaibotLi/CanjeProyecto.git
cd CanjeProyecto
pnpm install
pnpm supabase:start
pnpm dev:loyalty:local
```

El último comando deriva la URL y publishable key del runtime LOCAL verificado y las pasa
sólo al proceso frontend; no copiar `.env.local` ni credenciales de otra computadora.
App: http://127.0.0.1:5173. Correo LOCAL: http://127.0.0.1:54324 (Mailpit).
Crear/confirmar cuentas por el flujo normal. Registrarse no asigna Admin/Staff/Platform.
Para capacidades LOCAL ver [workflow y dos desarrolladores](SUPABASE_WORKFLOW.md).

Un clon nuevo no lleva `supabase/.temp/project-ref`. No ejecutar `supabase link` a Production
para desarrollar y no quitar el link de un checkout Hosted para eludir guards.
El seed es ficticio LOCAL; nunca ejecutarlo en Hosted.

## Obtener cambios y contribuir

Con el checkout limpio, `git pull --ff-only origin main` actualiza `main` sin reescribir
historia. Si hay cambios propios, conservarlos en una rama y revisar la integración;
no usar reset/force para borrar trabajo. Crear una rama propia y enviar PR a `main`.

Checks de frontend desde raíz:

```sh
pnpm lint
pnpm typecheck
pnpm test:auth
pnpm test:admin
pnpm test:loyalty
pnpm build
pnpm test:qa
pnpm supabase:audit:secrets
```

Las suites de integración requieren una DB LOCAL disposable, ownership y cleanup guardados;
leer [3B](SPRINT_3B_BACKEND.md) y [3C](SPRINT_3C_WALKTHROUGH.md) antes de ejecutarlas.
No correrlas sobre cuentas manuales/compartidas ni Hosted. `pnpm supabase:stop` conserva
volúmenes. Cambios remotos/schema/economía requieren autorización específica.

## Si no puede acceder

- Error al clonar/push: comprobar cuenta GitHub, invitación aceptada y permiso del repo.
  Acceso Admin en Valhalla no concede permisos GitHub ni Supabase/Vercel.
- La app no arranca: comprobar Node/pnpm/Docker y completar instalación en el clon propio.
- Puede iniciar sesión pero no entra a /admin u /operar: falta membership de ese entorno;
  es una capacidad distinta de poder colaborar en el código. No abrir el piloto externo.

No compartir passwords, tokens, service_role ni acceso a la cuenta personal del propietario.
