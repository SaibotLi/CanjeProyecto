# Refinamiento comercial de la landing — 04/11/2026

Implementado sobre `main` en `ba9b0c6042bccb4d6bbd47cb40b1b06a0a1bba30`.
Rama local: `codex/landing-commercial-polish`. Sin push, merge ni despliegue.

## Cambios

- Hero con el título y la descripción definitivos, sin punto ornamental.
- Header blanco y verde, sin Beta; Mi comercio conserva `/profile`.
- CTA principal verde oscuro y secundario blanco con borde verde reconocible.
- Feedback de 200 ms y escala 0.98 al presionar; foco visible de 3 px.
- Eliminado el bloque redundante «Menos vueltas, más claridad»: no tenía ancla
  propia y sus ventajas se conservan en los detalles del producto.
- Presentación de la carta con el título aprobado; misma imagen existente,
  rotulada «Vista ilustrativa de la plataforma». Sin nuevos recursos comerciales.
- Pasos comerciales con los textos aprobados, tarjetas blancas y números con
  espacio propio. Se apilan desde tablet para evitar columnas apretadas.
- Carta y fidelización presentadas como herramientas complementarias; precios,
  enlaces, funcionalidades y condiciones comerciales conservados.
- FAQ y presentación del equipo con lenguaje comercial más claro y voseo.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `apps/web/src/marketing/MarketingPage.tsx` | Textos, estructura y clase exclusiva del inicio |
| `apps/web/src/marketing/marketing.css` | Paleta, superficies, interacción y responsive |
| `apps/web/tests/marketing.test.mjs` | Actualización de la aclaración ilustrativa esperada |
| `docs/LANDING_COMMERCIAL_POLISH.md` | Alcance, validación y pendientes |

Se reutilizan componentes comerciales en las páginas de modalidades; su contenido
compartido refleja las mismas aclaraciones. El tratamiento claro del hero y las
secciones se limita al inicio mediante `.marketing-home`. Header, botones y foco
mantienen coherencia en las cinco rutas comerciales. No cambia ninguna ruta de
la aplicación ni su CSS, configuración o lógica.

## Textos comerciales

**Título:** Cartas digitales para comercios.

**Descripción exacta:** Mostrá tus productos con fotos, precios y un QR propio.
Administrá tu carta fácilmente y sumá herramientas para fortalecer la relación
con tus clientes.

**Presentación:** Conocé cómo puede verse tu carta digital.

**Plataforma:** Una plataforma que acompaña el crecimiento de tu comercio.

**Subtítulo:** Presentá tus productos. Fortalecé la relación con tus clientes.

**Descripción de plataforma:** Elegí las herramientas que mejor se adapten a tu
negocio: comenzá con una carta digital profesional y ampliá las posibilidades de
fidelización cuando estés listo.

**Pasos:** Conocemos tu comercio; Configuramos tu espacio; Tu carta, lista para compartir.

**CTA:** Coordinar una demo; Ver una carta de ejemplo.

**Mensaje secundario:** Demostración personalizada · Configuración guiada ·
Sin reemplazar tu sistema de cobro.

## Colores y continuidad

| Uso | Color |
| --- | --- |
| Fondo principal | `#ffffff` |
| Verde principal, CTA y título del hero | `#176347` |
| Verde hover | `#104d36` |
| Verde suave, proceso y fidelización | `#eef6ef` |
| Gris claro, rubros y FAQ | `#f4f6f5` |
| Texto principal | `#18221e` |
| Bordes | `#d8e1dc` |
| Acento claro en superficies oscuras | `#dcf2d6` |

El CSS original tenía superficies sólidas y dos linear-gradient usados para una
cuadrícula decorativa del hero, no varios gradientes de sección. Se eliminó esa
cuadrícula. El resultado no utiliza gradientes. Se conserva el cierre oscuro.

## Verificación

- TypeScript y build de producción: PASS.
- ESLint sin advertencias: PASS.
- 85/85 pruebas frontend: marketing, entorno, Auth, Admin/catálogo, autoridad,
  SaaS, fidelización, carta y QA/PWA. Sin DB ni operaciones remotas.
- Comparación SSR del antes y después: mismos destinos de enlaces en las cinco
  rutas comerciales, anclas locales existentes y textos definitivos exactos.
- Revisión visual en Chromium usando iframes de 375, 430, 768 y 1440 px:
  sin desbordamiento horizontal de la página. El scrollbar del navegador ocupa
  15 px dentro de cada marco; no se simula un dispositivo físico.
- Revisados hero, botones, presentación del producto, pasos y planes; apilado
  móvil y separación de las superficies. Las descripciones de planes reservan
  el mismo espacio en columnas para alinear los precios.
- Contraste calculado desde estilos del DOM: 123 elementos con texto visible,
  sin fallos AA; mínimo observado 4.73:1. No equivale a una certificación integral
  de accesibilidad ni incluye el texto dentro de la imagen ilustrativa.
- Teclado: recorrido Tab por navegación, Mi comercio y CTAs; foco verde de 3 px
  con separación de 5 px; Enter en el enlace al producto y en una FAQ.
- Movimiento reducido: reglas CSS revisadas; desactivan transiciones,
  animaciones y escala de pulsación. El navegador disponible no expone emulación
  de esa preferencia: no se afirma una prueba de emulación.
- Consola: los mensajes observados correspondían a la extensión del navegador;
  no se identificaron errores de la aplicación en la revisión.
- Comparación visual antes/después disponible en la copia estática de revisión.
  No se exportaron capturas PNG.

La vista previa usa el build estático porque el servicio de preview no pudo
arrancar los scripts del monorepo. Esta adaptación no modifica el proyecto.

## Funcionalidades verificadas y pendientes

La documentación de Sprint 3D y `loyaltyData.ts` respaldan puntos por consumos,
saldo, historial y reversión completa por administrador. Se mantiene la
aclaración de premios y canjes aún no disponibles, sin prometer aumentos de
ventas o retención ni un programa de recompensas completo.

Pendientes fuera de alcance:

1. Carga y publicación del catálogo real, a cargo del responsable de backend.
2. Sustitución futura de la imagen ilustrativa por una vista real aprobada.
3. Preparación del correo de acceso antes de incorporar clientes externos.
4. Premios, canjes, personalización avanzada y agente IA en otros sprints.

No se modificaron Supabase, autenticación, RLS, migraciones, permisos, contratos
de datos, lógica de puntos, catálogo público, dependencias ni lockfile.
