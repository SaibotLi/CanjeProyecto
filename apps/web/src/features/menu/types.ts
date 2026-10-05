/** Contratos de lectura del menú. price se expresa en pesos ARS, con centavos. */
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
  /** Estimación visual con la regla del negocio; nunca concede puntos. */
  previewCurrencyPerPoint: number
  pointsEnabled?: boolean
}
