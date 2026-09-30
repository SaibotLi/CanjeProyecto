const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', maximumFractionDigits: 0, minimumFractionDigits: 0,
})
export function formatMenuPrice(price: number): string {
  return arsFormatter.format(price)
}
/** DEMO DE PRESENTACIÓN. No usar para acreditar saldo, ledger o canjes. */
export function previewMenuPoints(price: number, currencyPerPoint: number): number {
  return Number.isFinite(price) && price >= 0 && Number.isFinite(currencyPerPoint) && currencyPerPoint > 0
    ? Math.floor(price / currencyPerPoint) : 0
}
