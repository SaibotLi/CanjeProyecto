import type { MenuData } from './types'

// Carta de demostración: no representa productos, precios o disponibilidad reales.
// Solo bebidas. Sustituir esta fuente por un adaptador de lectura en una futura task.
const businessId = 'preview-valhalla'
export const mockMenu: MenuData = {
  previewCurrencyPerPoint: 1000,
  categories: [
    { id: 'beer', name: 'Cervezas', slug: 'cervezas', displayOrder: 10 },
    { id: 'cocktail', name: 'Tragos', slug: 'tragos', displayOrder: 20 },
    { id: 'wine', name: 'Vinos / Espumantes', slug: 'vinos-espumantes', displayOrder: 30 },
    { id: 'soft', name: 'Sin alcohol', slug: 'sin-alcohol', displayOrder: 40 },
  ],
  items: [
    { id: 'bud', businessId, categoryId: 'beer', name: 'Budweiser', description: 'Lata · 473 ml', price: 6000, isAvailable: true, isFeatured: false, displayOrder: 10 },
    { id: 'brahma', businessId, categoryId: 'beer', name: 'Brahma', description: 'Lata · 473 ml', price: 4000, isAvailable: true, isFeatured: false, displayOrder: 20 },
    { id: 'heineken', businessId, categoryId: 'beer', name: 'Heineken', description: 'Botella · 330 ml', price: 7000, isAvailable: true, isFeatured: false, displayOrder: 30 },
    { id: 'stella', businessId, categoryId: 'beer', name: 'Stella Artois', description: 'Lata · 473 ml', price: 6500, isAvailable: true, isFeatured: false, displayOrder: 40 },
    { id: 'patagonia', businessId, categoryId: 'beer', name: 'Patagonia Amber Lager', description: 'Botella · 730 ml · para compartir', price: 9500, isAvailable: false, isFeatured: false, displayOrder: 50 },
    { id: 'special', businessId, categoryId: 'cocktail', name: 'Valhalla Special', description: 'Gin, cítricos y un toque de jengibre. Un trago de muestra con espíritu de la casa.', price: 12000, isAvailable: true, isFeatured: true, displayOrder: 10 },
    { id: 'gin', businessId, categoryId: 'cocktail', name: 'Gin Tonic', description: 'Gin, tónica y un toque cítrico', price: 10000, isAvailable: true, isFeatured: false, displayOrder: 20 },
    { id: 'fernet', businessId, categoryId: 'cocktail', name: 'Fernet con cola', description: 'El clásico de la noche', price: 8500, isAvailable: true, isFeatured: false, displayOrder: 30 },
    { id: 'aperol', businessId, categoryId: 'cocktail', name: 'Aperol Spritz', description: 'Aperol, espumante y soda', price: 11000, isAvailable: true, isFeatured: false, displayOrder: 40 },
    { id: 'negroni', businessId, categoryId: 'cocktail', name: 'Negroni', price: 11500, isAvailable: true, isFeatured: false, displayOrder: 50 },
    { id: 'malbec', businessId, categoryId: 'wine', name: 'Malbec', description: 'Copa · selección de muestra', price: 5500, isAvailable: true, isFeatured: false, displayOrder: 10 },
    { id: 'white', businessId, categoryId: 'wine', name: 'Sauvignon Blanc', description: 'Copa · selección de muestra', price: 5500, isAvailable: true, isFeatured: false, displayOrder: 20 },
    { id: 'sparkling', businessId, categoryId: 'wine', name: 'Espumante Extra Brut', description: 'Botella · 750 ml · para compartir', price: 22000, isAvailable: false, isFeatured: false, displayOrder: 30 },
    { id: 'cola', businessId, categoryId: 'soft', name: 'Gaseosa', description: 'Línea cola · 350 ml', price: 3000, isAvailable: true, isFeatured: false, displayOrder: 10 },
    { id: 'water', businessId, categoryId: 'soft', name: 'Agua mineral', description: 'Con o sin gas · 500 ml', price: 2500, isAvailable: true, isFeatured: false, displayOrder: 20 },
    { id: 'lemon', businessId, categoryId: 'soft', name: 'Limonada de menta y jengibre', description: 'Vaso · refrescante y sin alcohol', price: 4500, isAvailable: true, isFeatured: false, displayOrder: 30 },
  ],
}
