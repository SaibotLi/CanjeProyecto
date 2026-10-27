import { platformBrand } from '../config/platform'
// Public commercial configuration. No credentials, tenant authority or billing rules.
export const marketing = {
  brand: platformBrand.name,
  origin: 'https://valhallapp.vercel.app',
  indexable: false, // Enable only for the approved public domain at publication.
  whatsapp: '5493455436036',
  email: '',
  prices: { menu: 15000, loyalty: 35000 },
  associated: [
    {
      name: 'Valhalla Space',
      path: '/valhalla-space',
      label: 'Comercio en la plataforma',
    },
  ],
} as const

export const commercialPaths = [
  '/',
  '/planes/carta-digital',
  '/planes/fidelizacion',
  '/contacto',
  '/privacidad',
] as const
export type CommercialPath = (typeof commercialPaths)[number]
export type Plan = 'menu' | 'loyalty' | 'demo'
export function commercialPath(path: string): CommercialPath | null {
  const clean = path.replace(/\/$/, '') || '/'
  return commercialPaths.find((value) => value === clean) ?? null
}
export function contactLink(
  plan: Plan,
  config: { whatsapp: string; email: string } = marketing,
): string | null {
  const topic =
    plan === 'menu'
      ? 'Carta Digital'
      : plan === 'loyalty'
        ? 'Carta + Fidelización'
        : 'una demostración'
  const message = `Hola, me interesa ${topic}. Mi comercio es ____, de ____. ¿Podemos coordinar una demo?`
  if (/^[1-9][0-9]{7,14}$/.test(config.whatsapp))
    return `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`
  if (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(config.email))
    return `mailto:${config.email}?subject=${encodeURIComponent(`Consulta ${topic}`)}&body=${encodeURIComponent(message)}`
  return null
}
export const money = (amount: number) =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(amount)

export function pageMetadata(path: CommercialPath) {
  const data = {
    '/': [
      'Carta digital QR y puntos para tu comercio',
      'Actualizá productos y precios desde el celular. Carta con QR y puntos por consumos como opción. Conocé las modalidades y coordiná una demo.',
    ],
    '/planes/carta-digital': [
      'Carta digital QR para bares y cafeterías',
      'Tu carta con productos, fotos, precios y QR propio. Administración desde el celular y acceso sin registro para tus clientes. Alta asistida.',
    ],
    '/planes/fidelizacion': [
      'Puntos por consumos para tu comercio',
      'Sumá puntos por consumos a tu carta digital: operadores autorizados, código de cliente, saldo e historial. Sin integrar tu caja. Canjes aún no disponibles.',
    ],
    '/contacto': [
      'Coordiná una demostración',
      'Contanos qué comercio tenés y de qué localidad sos. Conocé la carta digital y la modalidad con puntos en una demostración remota.',
    ],
    '/privacidad': [
      'Privacidad de la web comercial',
      'Qué datos utiliza esta web comercial y cómo funciona el contacto por WhatsApp. Sin seguimiento publicitario ni formularios que guarden consultas.',
    ],
  }[path]
  return { title: `${data[0]} · ${marketing.brand}`, description: data[1] }
}
