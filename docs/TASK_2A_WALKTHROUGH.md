# Task 2A — Supabase Environment, CLI & Project Foundation

Fecha: 02/10/2026. Arquitectura V2 aprobada por el usuario. **Estado: TASK 2A COMPLETADA.** Verificaciones frontend y smoke test local superados. Stack detenido al finalizar, con volúmenes conservados. No avanzar automáticamente a 2B.

Este documento conserva evidencia histórica de 2A. El prompt posterior 2B autorizó/alineó
Node >=22.13 y creó el esquema: estado vigente en [TASK_2B_WALKTHROUGH](TASK_2B_WALKTHROUGH.md).

## Resultado implementado

CLI oficial estable **2.119.0** como devDependency raíz exacta; lockfile actualizado. Scripts raíz: supabase:start, supabase:stop, supabase:status. Script web: test:env. No instalación global, cliente supabase-js, AuthProvider ni librería de validación nueva.

Docker Desktop 4.93.0 / motor 29.8.1 Linux comprobados. Node real 24.16.0 y pnpm 11.19.0. Acceso al daemon requirió ejecución autorizada fuera del sandbox, sin cambios de permisos/sistema.

```text
supabase/
  .gitignore
  config.toml
  README.md
  migrations/.gitkeep   (existente, cero migraciones SQL)
  seed.sql              (solo comentarios)
  tests/README.md
  fixtures/README.md
  functions/.gitkeep    (existente, ninguna función)
```

ID local canjeproyect, PostgreSQL 17, puertos 54321–54324; schemas REST public solamente, private excluido también del extra search path. auto_expose_new_tables=false exige grants explícitos posteriores. Sin buckets de aplicación. Edge runtime y analytics locales deshabilitados porque no se usan en esta tarea; no implica decisión de producto ni hosting.

## Archivos modificados / agregados

- Raíz: package.json, pnpm-lock.yaml, pnpm-workspace.yaml (allowBuilds supabase explícito), .gitignore, README.md. .env.example legacy raíz eliminado; no contiene trabajo útil ni valores reales.
- Frontend: apps/web/.env.example, src/lib/env.ts, tests/env.test.mjs, package.json (script de tests), eslint.config.js (globals Node para tests), README.md y src/lib/README.md.
- Supabase: config.toml, .gitignore generados/inicializados; seed.sql vacío, tests/README.md, fixtures/README.md y README.md. Se preservan placeholders existentes.
- Docs: SPRINT_2_ARCHITECTURE.md, SUPABASE_WORKFLOW.md y este walkthrough nuevos; sincronización focalizada de PROJECT_BLUEPRINT, ARCHITECTURE, DATABASE, SECURITY, ROADMAP y DECISIONS. UI_GUIDE y contenido del negocio preservados.

## Variables y auditoría

Único ejemplo en apps/web, con VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY vacías. Se retiró slug env no consumido. No .env.local creado, clave copiada, cuenta personal ni secreto introducido. readSupabaseEnvironment es lazy y se conectará al cliente en 2D; no cambia bootstrap ni Carta.

Se revisaron .gitignore, inventario Git, env/config/scripts/README y archivos textuales del árbol de trabajo (sin binarios, dependencias, dist, .git o estado local). Regex de posibles secretos/PAT/JWT/private keys/DB URLs con password sin hallazgos. Revisión de referencias token/password/service_role no mostró credenciales reales. No equivale a escaneo exhaustivo del historial Git ni a certificación automática.

git check-ignore confirmó .env.local en raíz/web, supabase/.temp y .branches, claves/dumps; .env.example web no está ignorado. git diff --check sin errores de whitespace (avisos CRLF normales de Windows). Logs start/status locales pueden contener credenciales: siempre ignorados, no imprimirlos sin redacción ni compartirlos.

## Validaciones finales realizadas

- pnpm install --offline --frozen-lockfile y pnpm install --frozen-lockfile normal: OK tras completar cache oficial y aprobación explícita de CLI.
- pnpm exec supabase --version: 2.119.0.
- pnpm lint: OK, cero warnings de ESLint.
- pnpm typecheck: OK.
- pnpm build: OK; 74 módulos, PWA generateSW y 14 entradas shell. No cambios de Carta, assets o configuración PWA.
- pnpm --filter @canjeproyect/web test:env: **6/6**. Presencia, URLs, rechazo de secretos/JWT sin exposición en errores, ejemplo vacío y envDir real de Vite en apps/web.
- Primera pasada encontró incompatibilidad TS del default ImportMetaEnv; corregida con selección explícita de las dos variables. Resultados anteriores fallidos no se presentan como aprobados.
- Smoke test start/status/stop: OK. Nueve servicios iniciados: DB, Kong, Auth, correo, Realtime, REST, Storage, Postgres Meta y Studio. Los servicios con healthcheck figuraron healthy; REST se comprobó por HTTP. Edge runtime/analytics intencionalmente deshabilitados, no un error.
- SQL local de solo lectura: application_tables=0 (las seis entidades previstas), private_schema=0, auth_users=0, storage_buckets=0. No pruebas de RLS de aplicación porque no hay policies/esquema propios todavía.
- Config efectiva PostgREST: PGRST_DB_SCHEMAS=public y PGRST_DB_EXTRA_SEARCH_PATH=public,extensions. GET REST público con publishable key: 200; mismo GET con Accept-Profile private: **406**. Repetir prueba tras crear private en 2B/C, y añadir casos de escritura allí.
- Auth health: 200 (sin registro/login); Studio 54323 y correo Mailpit 54324: 200. La publishable key generada localmente cumple la validación de env.ts; no se copió a frontend ni se mostró.
- Stop final: 0; ningún contenedor de este proyecto corriendo. Volúmenes supabase_db_canjeproyect y supabase_storage_canjeproyect conservados. Status con stack detenido devuelve 1 esperado; con stack completo dio 0. Para retomar: pnpm supabase:start.

## Incidencias y límites

1. La descarga npm del optionalDependency Windows falló con curl error 23 en este entorno. Se descargó el mismo tgz oficial con curl, se verificó SHA-512 exacto del lockfile y se importó al cache usando un servidor loopback transitorio. Sin cambiar versión, overrides, registro persistente, TLS, permisos del sistema ni account login. pnpm normal volvió a ejecutar scripts tras recuperar el cache. El tarball/servidor/logs son transitorios e ignorados, no parte del repo reproducible; otra máquina usa instalación estándar.
2. pnpm detectó el CLI como build pendiente; allowBuilds autoriza solo supabase y esbuild, no todos los paquetes. No se ejecutaron build scripts arbitrarios de otras dependencias.
3. Avisos de instalación: eslint@9.39.5 y glob@11.1.0 deprecated; sin actualización automática del stack aprobado. Aviso de versión nueva pnpm ignorado.
4. engines/README heredados indican Node >=22.12, pero el launcher pnpm 11.19.0 inspeccionado exige >=22.13. Usar Node 22.13+ (este entorno 24.16.0). Alinear engines en una tarea aprobada; no se cambia silenciosamente el contrato de versiones.
5. Config es local, no perfil productivo: Auth defaults/MFA no aprobados como producción, SMTP pendiente, hosted PG debe verificarse antes de vincular un proyecto. El servicio local de correo usa local_smtp en el template 2.119.0, pese a docs antiguas inbucket.
6. PWA `/auth/` excluida de navigation fallback en apps/web/vite.config.ts: documentado como acceptance de 2E, no corregido fuera de scope.
7. Primer pre-pull muy lento, principalmente la imagen PostgreSQL 17.11.0.002 (351 MiB comprimidos, una capa de 342.5 MiB). El CLI descarga todas las imágenes antes de crear contenedores ([código oficial](https://github.com/supabase/cli/blob/v2.119.0/apps/cli/src/command-internal/db-bootstrap/image-prepull.ts)). Se verificó espejo oficial GHCR con idéntico digest Linux/amd64 sha256:4bfbe2e6d7909bd386b1b774683899deb12efa04a3eebaa141f164ffd04ada1d; la descarga ECR terminó al preparar ese fallback y GHCR también quedó en cache. Sin cambio de registry persistente o versión.
8. Al interrumpir el primer arranque, ya se había levantado solo DB. start/status podían devolver 0 para ese estado parcial; por eso no se aprobó solo por exit code. Stop sin --no-backup y nuevo start restauraron el volumen y arrancaron el stack completo. Health checks HTTP/SQL posteriores, no esa ejecución parcial, fundamentan el cierre.
9. Docker publica por defecto API/DB/Studio/correo en 0.0.0.0 y [::]. No afirmar bind exclusivo loopback: usar únicamente una red local confiable y datos ficticios, sin port forwarding. No se tocó firewall, red ni permisos del sistema. Al finalizar se detuvo todo para no dejar puertos abiertos.
10. Servidor/tarball de recuperación y logs temporales de arranque/status se retiraron después de usarlos (pueden contener credenciales locales). Imágenes/cache de pnpm y volúmenes permanecen; ningún dato del usuario fue eliminado. No se realizó docker prune ni stop --no-backup.

## Pendiente manual / siguiente tarea

No proyecto hosted necesario todavía. No se hizo login/link, selección de región/billing/password, cambio Vercel, commit o push. Hosted/dev/pilot, SMTP, URLs Auth definitivas y MFA se configuran solo cuando una tarea aprobada lo requiera y con propiedad del usuario.

**NO se crearon tablas, schema private, migraciones de dominio, policies, grants de aplicación, helpers, triggers, buckets ni operaciones económicas.** El stack sí inicializa sus componentes internos de Supabase.

Siguiente prompt recomendado: “Comenzá Task 2B exclusivamente en local con Sprint 2 Architecture V2: esquema versionado de seis tablas públicas y private.platform_admins, constraints cross-business/image_path y seed ficticio. No implementar policies/helpers/grants (2C), cliente/Auth/UI, Storage bucket ni operaciones económicas. Preservar Carta y no hacer commit/push/acciones hosted.”
