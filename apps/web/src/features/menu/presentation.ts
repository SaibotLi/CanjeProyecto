const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', maximumFractionDigits: 0, minimumFractionDigits: 0,
})
const arsDecimalFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', maximumFractionDigits: 2, minimumFractionDigits: 2,
})
export function formatMenuPrice(price: number): string {
  return (Number.isInteger(price) ? arsFormatter : arsDecimalFormatter).format(price)
}
/** ESTIMACIÓN POR PRODUCTO. No usar para acreditar saldo, ledger o canjes.
 * La suma de badges no equivale al floor de un futuro consumo total.
 */
export function previewMenuPoints(price: number, currencyPerPoint: number): number {
  return Number.isFinite(price) && price >= 0 && Number.isFinite(currencyPerPoint) && currencyPerPoint > 0
    ? Math.floor(price / currencyPerPoint) : 0
}
