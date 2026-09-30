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

El customer se diseña primero para 360–430 px. La navegación inferior respeta `safe-area-inset-bottom`, los controles tienen un mínimo táctil de 44 px y el contenido usa gutters fluidos. A partir de 1024 px la navegación pasa al flujo superior y las grillas aprovechan tres columnas. El admin está preparado conceptualmente para móvil y desktop.

## Componentes actuales

Header de marca compacto, navegación customer, aviso de muestra, categorías sticky, secciones y filas tipográficas de bebidas, destacado, agotado y onboarding Valhalla Points. Puntos, premios, perfil/QR placeholder y admin conservan sus skeletons.

## Estados y accesibilidad

Hay foco visible, enlace “saltar al contenido”, nombres accesibles, categoría activa con `aria-current="location"`, controles deshabilitados donde no existe función y significados que no dependen solo del color. Los mensajes distinguen claramente mocks de datos reales.

## Carta Digital — comportamiento y contenido

Valhalla solo ofrece bebidas. Las cuatro categorías vienen de la fuente de datos: Cervezas, Tragos, Vinos / Espumantes y Sin alcohol. No hay buscador; reconsiderarlo únicamente si la cantidad real de productos justifica esa necesidad.

El header y título son compactos para llegar rápido a los precios. En móvil, las categorías forman un carril horizontal sticky con targets de al menos 44 px. Al tocar una categoría, el scroll coloca su sección debajo del carril; al desplazarse manualmente, se actualiza la categoría activa. Reduced motion desactiva scroll suave y transiciones.

El producto prioriza nombre, presentación y precio; el precio tiene mayor jerarquía que los puntos. El contenido es tipográfico. Imagen opcional con alt, dimensiones reservadas y lazy loading: el catálogo mock no incluye fotos. Desde 768 px se utilizan dos columnas por sección para evitar filas estiradas.

`isFeatured` muestra “RECOMENDADO · VALHALLA” y una superficie con borde amarillo. Funciona sin imagen. `isAvailable=false` conserva el producto con etiqueta AGOTADO y atenúa precio/puntos. No existe un botón de compra ni control de cantidad.

Los puntos se calculan visualmente por `floor(price / 1000)`, sin campo manual de puntos y sin acreditación. La pieza “Tu noche también suma” aparece después de Cervezas, informa la regla prevista y enlaza a /points. Su texto aclara que el programa está en vista previa.

Todos los productos, precios y disponibilidades actuales son ilustrativos. Oswald continúa como current display candidate.

## Theming futuro

Cada negocio podrá aportar valores de marca que se asignen a los tokens semánticos. Esto no implica una UI multi-business ni un constructor de temas durante el MVP.
