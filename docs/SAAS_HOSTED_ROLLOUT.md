# SaaS 3E/3F/3G — release 23/10/2026

El usuario autoriza integrar `codex/saas-multi-business` en `main`, aplicar migrations
a `liojmtsopplgzderrrqi` y publicar en Vercel. Orden obligatorio: DB antes del frontend.
No autoriza reset, seed ni alterar puntos/datos existentes para facilitar el smoke.

## Base aplicada y comprobada

- Única migration pendiente/aplicada: `20261021120000_saas_business_foundation.sql`.
  Las seis anteriores permanecen intactas; siete versiones exactas verificadas.
- SHA256: `62f70ea3354d031aa928a6de93650f45c74476ffbe5f31c42ebb70b03ea4a594`.
- Comparación antes/después sin diferencias en negocios, settings, memberships, categorías,
  productos, perfiles/códigos, Auth/MFA, Platform, ledger, objetos/bucket y ACL/policies previos.
- Valhalla conserva modalidad Fidelización, regla ARS1000/true y dos movimientos de smoke
  previamente autorizados, neto cero. No nuevos movimientos por este rollout.
- Nuevos defaults/RLS/grants/helpers privados/gate económico verificados. La Data API real
  devuelve el contexto SaaS de Valhalla; private y Storage siguen406, ledger anon401 y
  provisioning privado404. Sin nuevas claves ni cambios Auth/Storage administrado.
- Frontend con variables públicas Hosted: lint/typecheck/build, 69 regresiones y10 QA/env
  PASS; auditoría de secretos sin hallazgos. Evidencia LOCAL previa:1.671 assertions SQL y
 11 tests REST con JWT reales, incluidos concurrencia y revocación SAME JWT.

## Publicación y operación

Proyecto Vercel `valhalla`, scope `saibotlis-projects`, raíz `apps/web`, dominio
`https://valhallapp.vercel.app`. Production conserva únicamente VITE_SUPABASE_URL y
VITE_SUPABASE_PUBLISHABLE_KEY como variables Vite; key comparada sin imprimir su valor.
La publicación procede del SHA de main; en cada deploy confirmar READY y alias activo
para ese SHA, sin sustituirlo por una release anterior de CLI.

La raíz es la plataforma; Carta de Valhalla está en `/valhalla-space`. `/admin`,
`/points`, `/operar` y rutas Admin antiguas redirigen al mismo comercio. Perfil y Auth
siguen globales. No cambiar slug ni UUID para acortar el enlace.

Comprobar HTTPS y refresh de rutas; ambas modalidades; sesión/profile/Admin/Staff y
Platform MFA read-only; ausencia de localhost, errores críticos y secrets en el bundle.
Validaciones económicas de esta release son de lectura/no escritura: no crear créditos
o reversas adicionales en Valhalla para el smoke. No exportar el seed ni Café Demo LOCAL.

La raíz nueva requiere revisar enlaces/QR antiguos impresos que apunten sólo a `/`.
Altas comerciales/contrataciones siguen por canal de confianza; no onboarding automático,
facturación, Google OAuth, canjes o Sprint4. **External pilot sigue bloqueado por custom
SMTP + dominio autenticado.** No habilitar usuarios externos por el hecho de desplegar.
