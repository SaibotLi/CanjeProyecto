export type CommercialEvent = {
  action: 'contact_open' | 'demo_view'
  placement: 'hero' | 'plan' | 'footer' | 'contact'
  plan: 'menu' | 'loyalty' | 'demo'
}
// Integration seam only: no vendor, cookies, identifiers, URL/query or network calls.
// An eventual adapter must obtain consent before enabling measurement.
let consent = false
export function setCommercialMeasurementConsent(value: boolean) {
  consent = value
}
export function measureCommercial(event: CommercialEvent) {
  if (consent && typeof window !== 'undefined')
    window.dispatchEvent(
      new CustomEvent('commercial:interaction', {
        detail: {
          action: event.action,
          placement: event.placement,
          plan: event.plan,
        },
      }),
    )
}
