/** Contratos de lectura del menú. price se expresa en pesos ARS enteros. */
export interface MenuCategory {
  id: string
  name: string
  slug: string
  displayOrder: number
}
export interface MenuItem {
  id: string
  businessId: string
  categoryId: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  imageAlt?: string
  /** Recorte transparente de producto: muestra el envase completo sobre la card. */
  imagePresentation?: 'cutout'
  isAvailable: boolean
  isFeatured: boolean
  displayOrder: number
}
export interface MenuData {
  categories: MenuCategory[]
  items: MenuItem[]
  /** Regla exclusiva de la vista demo; no concede puntos ni autoriza operaciones. */
  previewCurrencyPerPoint: number
}
