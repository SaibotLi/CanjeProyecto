import { useState } from 'react'
import type { CommercialPath, Plan } from './config'
import { marketing, money, contactLink } from './config'
import { measureCommercial } from './measurement'
import './marketing.css'

function Mark() {
  return (
    <span className="m-mark" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}
function Action({
  children = 'Coordinar una demo',
  plan = 'demo',
  placement = 'hero',
}: {
  children?: string
  plan?: Plan
  placement?: 'hero' | 'plan' | 'footer'
}) {
  return (
    <a
      className="m-button"
      href={`/contacto?plan=${plan}`}
      onClick={() =>
        measureCommercial({ action: 'demo_view', placement, plan })
      }
    >
      {children}
      <span aria-hidden="true">↗</span>
    </a>
  )
}
const faq = [
  [
    '¿Mis clientes tienen que registrarse para ver la carta?',
    'No. Abren tu enlace o escanean el QR y consultan productos y precios desde el navegador. Para tener una cuenta de puntos sí necesitan registrarse.',
  ],
  [
    '¿Necesito cambiar mi sistema de caja?',
    'No. La carta funciona por su cuenta. En la modalidad con puntos, un operador autorizado ingresa el importe efectivamente pagado; no hay integración con caja ni procesamiento de pagos.',
  ],
  [
    '¿Puedo cambiar los precios desde el celular?',
    'Sí. Con tu cuenta de administración podés editar productos, categorías, precios, fotos y la apariencia del comercio.',
  ],
  [
    '¿Los puntos ya se pueden canjear por premios?',
    'Todavía no. Hoy están disponibles la acreditación por consumos, el saldo, el historial y las reversas administrativas. Los premios y canjes son una etapa futura, sin fecha comprometida.',
  ],
  [
    '¿Cómo se contrata? ¿Hay prueba gratis?',
    'Coordinamos una demostración y te acompañamos en la configuración. Antes de contratar confirmamos el alcance y los precios. La contratación se acuerda con el equipo; actualmente no ofrecemos una prueba gratuita.',
  ],
  [
    '¿Puedo usarlo si estoy en otra ciudad?',
    'Podemos mostrarte el producto y coordinar la configuración de forma remota. Primero revisamos juntos si lo disponible cubre la forma de trabajar de tu comercio.',
  ],
  [
    '¿Puedo sumar puntos más adelante?',
    'Sí. Podés mantener tu carta y coordinar con el equipo la incorporación de puntos. Antes de sumar clientes externos, debemos completar la configuración necesaria para sus correos de acceso.',
  ],
]
function Plans() {
  return (
    <section id="planes" className="m-section m-plans">
      <div className="m-section-head">
        <p className="m-kicker">CARTA DIGITAL Y FIDELIZACIÓN</p>
        <h2>Una plataforma que acompaña el crecimiento de tu comercio.</h2>
        <p className="m-plan-subtitle">
          Presentá tus productos. Fortalecé la relación con tus clientes.
        </p>
        <p>
          Elegí las herramientas que mejor se adapten a tu negocio: comenzá con
          una carta digital profesional y ampliá las posibilidades de
          fidelización cuando estés listo.
        </p>
      </div>
      <div className="m-plan-grid">
        <article className="m-plan">
          <p className="m-kicker">01 / PRESENTÁ TUS PRODUCTOS</p>
          <h3>Carta Digital</h3>
          <p>
            Presentá tus productos con una carta profesional y fácil de actualizar.
          </p>
          <p className="m-price">
            <span>ARS</span> {money(marketing.prices.menu)}
            <small>/mes</small>
          </p>
          <p className="m-fine">
            Precio orientativo · A confirmar antes de contratar.
          </p>
          <ul>
            <li>Productos, categorías, precios y fotos</li>
            <li>Identidad y apariencia de tu comercio</li>
            <li>Enlace y QR propio para compartir</li>
            <li>Administración desde el celular</li>
            <li>Consulta de la carta sin registro</li>
          </ul>
          <Action plan="menu" placement="plan">
            Consultar por Carta Digital
          </Action>
          <a className="m-text-link" href="/planes/carta-digital">
            Conocer la modalidad →
          </a>
        </article>
        <article className="m-plan m-plan-dark">
          <p className="m-kicker">02 / CONECTÁ CON TUS CLIENTES</p>
          <h3>Carta + Fidelización</h3>
          <p>
            Sumá puntos por consumos y ofrecé a tus clientes un espacio para
            consultar su actividad.
          </p>
          <p className="m-price">
            <span>ARS</span> {money(marketing.prices.loyalty)}
            <small>/mes</small>
          </p>
          <p className="m-fine">
            Precio orientativo · A confirmar antes de contratar.
          </p>
          <ul>
            <li>Todo lo de Carta Digital</li>
            <li>Puntos según el importe de cada consumo</li>
            <li>Operadores con acceso autorizado</li>
            <li>Código personal, saldo e historial para cada cliente</li>
            <li>Reversión completa de consumos por administrador</li>
          </ul>
          <Action plan="loyalty" placement="plan">
            Consultar por Carta + Fidelización
          </Action>
          <a className="m-text-link" href="/planes/fidelizacion">
            Ver cómo funcionan los puntos →
          </a>
          <p className="m-plan-note">
            Premios y canjes todavía no disponibles. Antes de incorporar
            clientes externos, debemos completar la configuración de sus correos
            de acceso.
          </p>
        </article>
      </div>
      <p className="m-plan-foot">
        Configuración guiada, dominio personalizado y asistencia adicional:
        alcance y presupuesto por separado. No se incluyen pagos online, pedidos ni
        sistema de caja.
      </p>
    </section>
  )
}
function ProductDemo() {
  return (
    <section className="m-section m-demo" id="producto">
      <div>
        <p className="m-kicker">TU CARTA, TU IDENTIDAD</p>
        <h2>Conocé cómo puede verse tu carta digital.</h2>
        <p>
          Una carta propia, con categorías claras y precios a mano. Vos decidís
          qué mostrar y lo actualizás desde tu cuenta.
        </p>
        <a
          className="m-text-link"
          href="/marketing/menu-real-local.jpg"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ampliar vista de ejemplo ↗
        </a>
        <div className="m-demo-detail">
          <span>01</span>
          <div>
            <h3>Cambiá una vez. Compartí el mismo QR.</h3>
            <p>
              Editar la carta no requiere reimprimir el código que apunta a tu
              enlace.
            </p>
          </div>
        </div>
        <div className="m-demo-detail">
          <span>02</span>
          <div>
            <h3>Tu identidad, sin encargar otra web.</h3>
            <p>
              Personalizá el logo, los datos y la apariencia de tu carta desde
              tu cuenta.
            </p>
          </div>
        </div>
      </div>
      <figure>
        <img
          src="/marketing/menu-real-local.jpg"
          width="390"
          height="844"
          loading="lazy"
          decoding="async"
          alt="Ejemplo ilustrativo de una carta digital en un celular, con categorías, foto de producto y precio."
        />
        <figcaption>Vista ilustrativa de la plataforma.</figcaption>
      </figure>
    </section>
  )
}
function Home() {
  return (
    <>
      <section className="m-hero">
        <div className="m-hero-copy">
          <p className="m-kicker">CARTA DIGITAL + FIDELIZACIÓN</p>
          <h1>Cartas digitales para comercios.</h1>
          <p>
            Mostrá tus productos con fotos, precios y un QR propio. Administrá tu
            carta fácilmente y sumá herramientas para fortalecer la relación con
            tus clientes.
          </p>
          <div className="m-hero-actions">
            <Action />
            <a className="m-quiet-link" href="#producto">
              Ver una carta de ejemplo <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className="m-hero-note">
            Demostración personalizada · Configuración guiada · Sin reemplazar
            tu sistema de cobro
          </p>
        </div>
        <div
          className="m-hero-art"
          aria-label="Vista ilustrativa de la carta digital"
        >
          <span className="m-art-caption">TU CARTA. TU IDENTIDAD.</span>
          <div className="m-phone">
            <span className="m-phone-speaker" />
            <img
              src="/marketing/menu-real-local.jpg"
              width="390"
              height="844"
              fetchPriority="high"
              alt="Vista ilustrativa de la plataforma con una carta digital de ejemplo."
            />
          </div>
          <div className="m-paper">
            <span aria-hidden="true">↗</span>
            <strong>
              Actualizá.
              <br />
              Compartí.
              <br />
              Listo.
            </strong>
            <small>Sin volver a imprimir tu carta.</small>
          </div>
        </div>
      </section>
      <div className="m-audience">
        <span>HECHO PARA EL DÍA A DÍA DE</span>
        <p>
          Bares <i>✳</i> Cafeterías <i>✳</i> Restaurantes <i>✳</i> Heladerías
        </p>
      </div>
      <ProductDemo />
      <section className="m-section m-process">
        <div className="m-section-head">
          <p className="m-kicker">DEL PRIMER CONTACTO A TU CARTA</p>
          <h2>Empezar puede ser simple.</h2>
        </div>
        <ol>
          <li>
            <span>01</span>
            <h3>Conocemos tu comercio</h3>
            <p>
              Nos contás sobre tu negocio y sus necesidades. Te presentamos una
              demostración personalizada para que conozcas las posibilidades de
              la plataforma.
            </p>
          </li>
          <li>
            <span>02</span>
            <h3>Configuramos tu espacio</h3>
            <p>
              Definimos la apariencia, las funcionalidades y la modalidad de
              implementación. Si necesitás asistencia adicional, evaluamos su
              alcance y presupuesto.
            </p>
          </li>
          <li>
            <span>03</span>
            <h3>Tu carta, lista para compartir</h3>
            <p>
              Accedés a tu carta digital mediante un enlace y un código QR.
              Luego podés administrar tus productos y mantener la información
              actualizada.
            </p>
          </li>
        </ol>
      </section>
      <Plans />
      <section className="m-section m-associated">
        <p className="m-kicker">EN LA PLATAFORMA</p>
        <h2>Una carta propia para cada comercio.</h2>
        {marketing.associated.map((b) => (
          <a key={b.path} href={b.path}>
            <span>
              <small>{b.label}</small>
              <strong>{b.name}</strong>
            </span>
            <span>Ver carta real ↗</span>
          </a>
        ))}
        <p className="m-fine">
          Enlace publicado con autorización. No implica testimonio ni condición
          de cliente pago.
        </p>
      </section>
      <Faq />
      <section className="m-section m-about">
        <p className="m-kicker">QUIÉNES ESTAMOS DETRÁS</p>
        <h2>
          Software cercano
          <br />
          al trabajo de tu comercio.
        </h2>
        <p>
          Somos el equipo que desarrolla {marketing.brand}: cartas digitales y
          herramientas de fidelización para comercios. Te acompañamos desde la
          demostración hasta la configuración de tu espacio, para que puedas
          administrar tu carta con confianza.
        </p>
      </section>
      <Closing />
    </>
  )
}
function Faq() {
  return (
    <section className="m-section m-faq" id="preguntas">
      <div>
        <p className="m-kicker">ANTES DE ESCRIBIRNOS</p>
        <h2>
          Preguntas claras.
          <br />
          Respuestas también.
        </h2>
      </div>
      <div>
        {faq.map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
function Closing() {
  return (
    <section className="m-section m-closing">
      <p className="m-kicker">VEAMOS SI ES PARA TU COMERCIO</p>
      <h2>
        Tu próxima carta
        <br />
        empieza con una charla.
      </h2>
      <Action placement="footer">Coordinar una demostración</Action>
      <p>
        Coordinamos una demostración y respondemos tus consultas antes de contratar.
      </p>
    </section>
  )
}
function Detail({ loyalty }: { loyalty: boolean }) {
  return (
    <>
      <section className="m-detail-hero m-section">
        <a className="m-text-link" href="/">
          ← Volver al inicio
        </a>
        <p className="m-kicker">
          {loyalty ? 'CARTA + FIDELIZACIÓN' : 'CARTA DIGITAL'}
        </p>
        <h1>
          {loyalty ? (
            <>
              Cada consumo,
              <br />
              <em>bien registrado.</em>
            </>
          ) : (
            <>
              Tu carta al día.
              <br />
              <em>En cada mesa.</em>
            </>
          )}
        </h1>
        <p>
          {loyalty
            ? 'Identificá al cliente por su código, ingresá el importe efectivamente pagado y confirmá. El sistema calcula los puntos y el cliente consulta su saldo e historial.'
            : 'Productos, fotos y precios bajo la identidad de tu comercio. Tus clientes abren el QR sin registrarse y vos actualizás el catálogo desde el celular.'}
        </p>
        <Action plan={loyalty ? 'loyalty' : 'menu'}>
          Coordinar una demo de esta modalidad
        </Action>
      </section>
      {loyalty ? (
        <section className="m-section m-loyalty-explain">
          <p className="m-kicker">UN EJEMPLO, SIN LETRA CHICA</p>
          <h2>
            ARS 6.500 de consumo.
            <br />6 puntos registrados.
          </h2>
          <p>
            Ejemplo con una regla de 1 punto entero por cada ARS 1.000 de una
            misma transacción. Los sobrantes de compras distintas no se
            acumulan. La regla aplicable se acuerda al configurar el comercio.
          </p>
          <ol>
            <li>
              El cliente muestra su código público. El código identifica; no
              autoriza operaciones.
            </li>
            <li>
              Un Admin u operador Staff autorizado ingresa el monto y confirma.
            </li>
            <li>
              El cliente consulta su propio saldo e historial. Sólo un Admin
              puede revertir un consumo completo.
            </li>
          </ol>
          <p className="m-callout">
            No incluye premios ni canjes, campañas automáticas ni pagos. La
            preparación del correo del servicio debe completarse antes de
            incorporar clientes externos.
          </p>
        </section>
      ) : (
        <ProductDemo />
      )}
      <Plans />
      <Faq />
      <Closing />
    </>
  )
}
function Contact() {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const whatsapp = contactLink('demo')?.startsWith('https://wa.me/')
  const address = whatsapp ? `+${marketing.whatsapp}` : marketing.email
  return (
    <section className="m-section m-contact">
      <p className="m-kicker">HABLEMOS DE TU COMERCIO</p>
      <h1>
        Primero una demo.
        <br />
        <em>Después decidís.</em>
      </h1>
      <p>
        Contanos el nombre de tu comercio, la localidad y si te interesa la
        carta sola o también los puntos. Podemos coordinar una demostración
        remota.
      </p>
      <div className="m-contact-options">
        {(['demo', 'menu', 'loyalty'] as const).map((plan) => {
          const href = contactLink(plan)
          return href ? (
            <a
              key={plan}
              className="m-button"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                measureCommercial({
                  action: 'contact_open',
                  placement: 'contact',
                  plan,
                })
              }
            >
              {plan === 'demo'
                ? whatsapp
                  ? 'Consultar por WhatsApp'
                  : 'Consultar por email'
                : plan === 'menu'
                  ? 'Me interesa Carta Digital'
                  : 'Me interesa Carta + Puntos'}
              <span aria-hidden="true">↗</span>
            </a>
          ) : null
        })}
      </div>
      {contactLink('demo') ? (
        <>
          <p className="m-contact-note">
            Se abre {whatsapp ? 'WhatsApp' : 'tu aplicación de correo'} con un
            mensaje que podés editar. No se envía nada automáticamente. No
            compartas contraseñas ni datos de tus clientes.
          </p>
          <p>
            {whatsapp ? 'WhatsApp' : 'Email'}: <strong>{address}</strong>
          </p>
          <button
            className="m-copy"
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(address)
                setCopied(true)
                setCopyFailed(false)
              } catch {
                setCopied(false)
                setCopyFailed(true)
              }
            }}
          >
            {copied
              ? 'Contacto copiado'
              : whatsapp
                ? 'Copiar número'
                : 'Copiar email'}
          </button>
          <span role="status">
            {copied
              ? ' Listo para pegar en tus contactos.'
              : copyFailed
                ? ' No pudimos copiarlo. Podés seleccionar el contacto que aparece arriba.'
                : ''}
          </span>
        </>
      ) : (
        <p>
          Estamos preparando el canal comercial. Todavía no recibimos consultas
          desde esta web.
        </p>
      )}
      <div className="m-contact-next">
        <h2>¿Qué vamos a ver?</h2>
        <p>
          Tu carta en el celular, cómo se modifica un producto, cómo se comparte
          el QR y, si te interesa, cómo se registra un consumo. Confirmamos el
          alcance y el precio antes del alta.
        </p>
      </div>
      <a className="m-text-link" href="/privacidad">
        Cómo tratamos los datos de esta consulta →
      </a>
    </section>
  )
}
function Privacy() {
  return (
    <section className="m-section m-privacy">
      <p className="m-kicker">WEB COMERCIAL · 27/10/2026</p>
      <h1>Privacidad, sin vueltas.</h1>
      <h2>Contacto voluntario</h2>
      <p>
        Esta landing no guarda consultas en una base de datos. Al elegir
        WhatsApp, salís a un servicio de Meta: el mensaje se envía sólo cuando
        vos lo confirmás, bajo las condiciones de ese servicio. El equipo recibe
        los datos que decidas compartir para responder tu consulta y coordinar
        una demo. Podés pedir que eliminemos esa conversación por el mismo
        canal.
      </p>
      <h2>Medición</h2>
      <p>
        No instalamos píxeles de anuncios, analítica de terceros ni cookies de
        marketing. No recopilamos tu ubicación ni tus contactos. El alojamiento
        puede procesar información técnica necesaria para servir la web, como
        dirección IP y registros de solicitudes.
      </p>
      <h2>Tu cuenta en un comercio</h2>
      <p>
        Esta información describe la landing comercial. Las cuentas de la
        plataforma conservan su propia sesión al entrar y los accesos dependen
        de sus permisos. No uses el canal comercial para enviar contraseñas ni
        datos personales de clientes. Antes de abrir el servicio a clientes
        externos se completarán las condiciones y avisos aplicables al programa.
      </p>
      <a className="m-text-link" href="/contacto">
        Contactar al equipo →
      </a>
    </section>
  )
}
export function MarketingPage({ path = '/' }: { path?: CommercialPath }) {
  return (
    <div className={`marketing${path === '/' ? ' marketing-home' : ''}`}>
      <a className="m-skip" href="#commercial-main">
        Saltar al contenido
      </a>
      <header className="m-header">
        <a
          className="m-brand"
          href="/"
          aria-label={`${marketing.brand}, inicio`}
        >
          <Mark />
          {marketing.brand}
        </a>
        <nav aria-label="Navegación comercial">
          <a href="/#producto">Producto</a>
          <a href="/#planes">Planes</a>
          <a href="/#preguntas">Preguntas</a>
          <a className="m-account" href="/profile">
            Mi comercio ↗
          </a>
        </nav>
      </header>
      <main id="commercial-main">
        {path === '/' ? (
          <Home />
        ) : path === '/contacto' ? (
          <Contact />
        ) : path === '/privacidad' ? (
          <Privacy />
        ) : (
          <Detail loyalty={path === '/planes/fidelizacion'} />
        )}
      </main>
      <footer className="m-footer">
        <a className="m-brand" href="/">
          <Mark />
          {marketing.brand}
        </a>
        <p>Tu carta, siempre a mano.</p>
        <div>
          <a href="/planes/carta-digital">Carta Digital</a>
          <a href="/planes/fidelizacion">Carta + Puntos</a>
          <a href="/contacto">Contacto</a>
          <a href="/privacidad">Privacidad</a>
          <a href="/profile">Ingresar a mi cuenta</a>
        </div>
        <small>
          Contratación asistida · Precios en pesos argentinos · Sin canjes por
          el momento.
        </small>
      </footer>
    </div>
  )
}
