# UI Guide — Valhalla

## Dirección visual actual

La interfaz representa una noche de Valhalla: contraste alto, amarillo intenso, negro y superficies negro-azuladas. El lenguaje es moderno, underground e industrial. Se evitan clichés vikingos, fuego, calaveras y estética gamer.

El logo suministrado se conserva intacto en `apps/web/src/assets/brand/valhalla/valhalla-logo.png`. Task 02 utiliza en los headers una copia WebP lossless de igual resolución y sin diferencias en píxeles visibles: 578 KB frente a 1,54 MB del master. No se redibujó ni modificó la marca. El favicon/PWA mantiene el placeholder hasta recibir un asset apropiado para tamaño pequeño.

## Tokens

Los valores de marca `--valhalla-*` se mapean a tokens semánticos `--color-*`. Los componentes consumen los tokens semánticos para permitir otro tema futuro.

| Uso | Valor actual |
| --- | --- |
| Amarillo principal | `#F4C900` |
| Amarillo brillante | `#FFD719` |
| Negro base | `#06080B` |
| Fondo | `#090D12` |
| Superficie | `#10161D` |
| Superficie elevada | `#161E27` |
| Texto | `#F5F3EC` |
| Texto secundario | `#A3A8AE` |
| Texto deshabilitado | `#666D75` |
| Borde | `#252E38` |

Los valores exactos siguen provisionales hasta revisión visual con el negocio.

## Tipografía

- Inter Variable: tipografía actual de body/UI y decisión cerrada para esta etapa por legibilidad y performance.
- Oswald Variable: **current display candidate**, usada en títulos. Sigue provisional hasta compararla y aprobarla junto a la identidad real.
- El lettering del logo no se imita como tipografía general.

Las fuentes se sirven localmente desde paquetes Fontsource; la interfaz no depende de Google Fonts en runtime.

## Mobile-first y responsive

La Carta se diseña primero para 390 × 844 px y se comprueba a 360 y 430 px. La navegación inferior respeta `safe-area-inset-bottom`, los controles tienen un mínimo táctil de 44 px y el contenido usa gutters fluidos. La Carta mantiene una columna por debajo de 768 px, dos desde 768 px y navegación en el flujo superior desde 1024 px. Desktop adapta el mismo lenguaje de cards; no es una landing distinta. Los otros skeletons conservan su responsive anterior.

## Componentes actuales

Header de marca compacto “VALHALLA / Carta · Villaguay”, navegación customer, aviso de muestra, categorías sticky en pills, cards visuales de bebidas, destacado con imagen, agotado y onboarding compacto Valhalla Points. Puntos, premios, perfil/QR placeholder y admin conservan sus skeletons. Los ajustes al shell se limitan a la ruta Carta mediante `.menu-app`.

## Estados y accesibilidad

Hay foco visible, enlace “saltar al contenido”, nombres accesibles, categoría activa con `aria-current="location"`, controles deshabilitados donde no existe función y significados que no dependen solo del color. Los mensajes distinguen claramente mocks de datos reales.

## Carta Digital — comportamiento y contenido

Valhalla solo ofrece bebidas. Las cuatro categorías vienen de la fuente de datos: Cervezas, Tragos, Vinos / Espumantes y Sin alcohol. No hay buscador; reconsiderarlo únicamente si la cantidad real de productos justifica esa necesidad.

Task 02B elimina el hero visible “Carta Digital / Tu próximo brindis / Solo bebidas” y toda numeración editorial. Se conserva un h1 accesible, visualmente oculto, y headings de categorías sin números. El header concentra marca y contexto para llegar antes a las bebidas. Oswald se restringe al lockup, categorías y nombre destacado; productos normales y onboarding usan Inter.

En móvil, las categorías forman un carril horizontal sticky con pills de al menos 44 px y estado activo amarillo. No son controles de compra. Al tocar una categoría, el scroll coloca su sección debajo del carril; al desplazarse manualmente, se actualiza la categoría activa y se hace visible su pill. Reduced motion desactiva scroll suave y transiciones. La lógica existente de navegación no cambia.

El producto normal combina thumbnail de 72 × 72 px, nombre, descripción opcional, precio y puntos amarillos. El precio tiene mayor tamaño/peso que los puntos. Las cards no son botones ni enlaces de compra. Nombres largos y contenido sin descripción conservan su espacio natural sin truncamiento obligatorio. Los detalles permiten wrap si no caben.

Las imágenes son opcionales, locales, con alt que declara su carácter ilustrativo, dimensiones reservadas, `loading="lazy"` y `decoding="async"`. Task 02B incorpora siete SVG originales sin logotipos comerciales, fotos descargadas ni dependencias nuevas. Son placeholders visuales por formato de bebida, no fotografías ni imágenes oficiales de cada marca. Negroni queda sin imageUrl para ejercitar el fallback. Si falta una imagen o falla su carga, aparece un vaso neutro con nombre accesible. SVG es apropiado para estas ilustraciones vectoriales pequeñas; WebP/AVIF se considerará para futuros assets raster, con autorización y tamaños adecuados.

`isFeatured` usa imagen protagonista 16:9 en móvil, badge amarillo “★ RECOMENDADO” sobre la imagen y contenido debajo. Desde 768 px ocupa el ancho de la grilla con composición imagen/contenido lado a lado; no usa carrusel. Funciona también con el fallback sin imagen. `isAvailable=false` conserva el producto con etiqueta textual AGOTADO, thumbnail menos saturado y precio/puntos secundarios. La disponibilidad no se comunica solo mediante opacidad. No existe un botón de compra ni control de cantidad.

Los puntos se calculan visualmente por `floor(price / 1000)`, sin campo manual de puntos y sin acreditación. La pieza “Cada consumo suma” aparece después de Cervezas, explica brevemente el beneficio, conserva la regla marcada como preview y enlaza a /points. Sus márgenes y tipografía evitan una landing dentro de la Carta.

Todos los productos, precios y disponibilidades actuales son ilustrativos. Oswald continúa como current display candidate.

## Estado de validación — Task 02B

El baseline público previo al rediseño fue inspeccionado realmente el 30/09/2026 en 390 × 844, 360 × 844, 430 × 844 y 1280 × 900 px en https://valhalla-green.vercel.app/. Se confirmaron numeración editorial, introducción dominante, ausencia de imágenes y featured basado principalmente en borde/texto. Se preservan las fortalezas de jerarquía precio/puntos, sticky categories, estado agotado y bottom navigation.

Task 02B fue cerrada tras revisar el deployment nuevo el 30/09/2026: primero 390 × 844, luego 360/430, 768 × 1024 y 1280 × 900 px. Se verificó el build `index-J4-CB4a8.js` y se guardaron capturas reales de primera pantalla, featured, onboarding, agotados, fallback y foco. La composición app-first, densidad y jerarquía superaron la revisión del agente sin correcciones adicionales. No se detectó overflow horizontal de página en ningún tamaño ni errores/warnings de consola; sticky/active categories y activación con teclado funcionan.

Límites: navegador con safe-area efectiva 0; se verificaron viewport-fit y env() de nav/footer, no un notch/home indicator físico. Reduced motion se comprobó en código, no con una preferencia de navegador emulada. Recursos y Oswald siguen provisionales para producción. Inicialmente una pestaña cargó la versión anterior de la PWA; reabrir la pestaña permitió ver el nuevo build sin cambiar permisos. La experiencia de actualización de una instalación existente deberá revisarse antes de producción. Esta aprobación del prototipo no equivale a aprobación comercial de marca ni readiness de producción.

## Theming futuro

Cada negocio podrá aportar valores de marca que se asignen a los tokens semánticos. Esto no implica una UI multi-business ni un constructor de temas durante el MVP.
