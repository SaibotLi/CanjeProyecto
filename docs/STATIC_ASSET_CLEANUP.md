# Limpieza de recursos estáticos — 03/11/2026

Se retira `apps/web/src/features/menu/data.ts`, catálogo mock histórico sin imports
desde la aplicación ni las pruebas, junto con sus ocho imágenes comerciales raster:

- `brahma-cutout.png`, `brahma-lata.webp`
- `budweiser-cutout.png`, `budweiser.webp`
- `cocacola-cutout.png`, `cocacola.webp`
- `fernet-cutout.png`, `fernet.webp`

Todas estaban en `apps/web/src/features/menu/assets/`. Total retirado: 2.625.720 bytes
de imágenes del repositorio. Ya no formaban parte del bundle activo; no se atribuye
a esta limpieza una mejora de descarga de producción.

Se conservan los siete SVG genéricos de esa carpeta (bottle, can, cocktail, lemon,
special, water y wine), el placeholder SVG inline de MenuItemCard,
los iconos compartidos y `public/icons/app.svg`.

Se conservan los tres logos originales/derivados de Valhalla. BusinessBrand todavía
usa `valhalla-logo-header.webp` cuando el primer comercio no tiene logo en Storage;
el PNG master y el WebP anterior están documentados como fuentes de marca. Retirar
ese respaldo requiere acordar una modificación de la identidad visual existente.

Se conservan `public/marketing/menu-real-local.jpg` (captura LOCAL identificada como
demostración y utilizada por la landing) y `public/marketing/social.png` (imagen social).
No alimentan el catálogo público ni sustituyen imágenes de productos. La landing conserva
sus funcionalidades y recursos; estos archivos no son registros comerciales del catálogo.

La carta usa usePublicMenu → readPublicMenu → publicMenuQuery → mapPublicMenu.
Las imágenes de producto derivan exclusivamente de `menu_items.image_path` mediante
`storage.from('menu-images').getPublicUrl(path)`. Null o error de imagen conservan
el placeholder inline. Una respuesta vacía o un error no incorpora productos mock.
Los datos de preview históricos restantes para otras pantallas no participan de ese flujo.

Las referencias a `features/menu/data.ts` en documentos de sprints anteriores son
históricas; este registro documenta su eliminación. No se modifica Supabase ni Storage.
