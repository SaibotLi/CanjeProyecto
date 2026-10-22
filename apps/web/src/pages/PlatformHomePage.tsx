import {useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {businessPath,isBusinessSlug} from '../features/business/businessRoutes'
import {platformBrand} from '../config/platform'
export function PlatformHomePage(){
  const [name,setName]=useState(''),[error,setError]=useState(false),navigate=useNavigate()
  return <div className="platform-home"><section className="platform-intro"><p className="eyebrow">{platformBrand.name}</p><h1>Tu carta, siempre a mano.</h1><p>Una carta digital propia para cada comercio. Abierta desde el celular, sin instalar nada.</p><Link className="button-secondary" to="/profile">Administrar mi comercio</Link></section>
    <section className="admin-grid"><article className="admin-card"><h2>Carta Digital</h2><p>Productos, fotos y precios. Una carta con la identidad de tu comercio, abierta para todos.</p></article><article className="admin-card"><h2>Carta + Fidelización</h2><p>Sumá clientes identificados, consumos y puntos separados para tu comercio.</p></article></section>
    <section><h2>¿Buscás una carta?</h2><p className="muted">Abrí el enlace o QR del comercio. Si conocés su nombre en el enlace, podés escribirlo acá.</p><form className="auth-form" onSubmit={event=>{event.preventDefault();const slug=name.trim().toLowerCase();if(!isBusinessSlug(slug)){setError(true);return}navigate(businessPath(slug))}}><label htmlFor="business-link-name">Nombre en el enlace</label><input id="business-link-name" autoCapitalize="none" autoComplete="off" maxLength={80} placeholder="mi-comercio" value={name} onChange={event=>{setName(event.target.value);setError(false)}}/>{error&&<p role="alert">Revisá el nombre: usá letras minúsculas, números y guiones.</p>}<button className="button-primary" type="submit">Abrir carta</button></form></section>
  </div>
}
