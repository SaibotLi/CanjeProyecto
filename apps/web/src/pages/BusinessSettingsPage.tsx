import {useRef,useState,type FormEvent} from 'react'
import {useAuth} from '../features/auth/authContext'
import {useAuthority} from '../features/authority/authorityContext'
import {useBusiness} from '../features/business/businessContext'
import {savePresentation,type PresentationDraft} from '../features/business/businessSettings'
import {AuthStatus} from '../features/auth/components/AuthStatus'
import {AdminError,adminMessage,imageExtension,type UploadedAsset} from '../features/admin/adminData'

export function BusinessSettingsPage(){const auth=useAuth(),{business}=useBusiness();return <SettingsForm key={`${business.id}:${auth.session?.user.id}`} />}
function SettingsForm(){
  const auth=useAuth(),authority=useAuthority(),context=useBusiness(),{business}=context
  const [draft,setDraft]=useState<PresentationDraft>({...business.presentation,name:business.name}),[file,setFile]=useState<File|null>(null),[asset,setAsset]=useState<UploadedAsset|null>(null),[removeLogo,setRemoveLogo]=useState(false)
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false),inFlight=useRef(false)
  const disabled=!business.isActive||authority.status!=='ready'||authority.checking||context.checking||context.refreshError
  const field=<K extends keyof PresentationDraft>(key:K,value:PresentationDraft[K])=>setDraft(d=>({...d,[key]:value}))
  async function submit(e:FormEvent){e.preventDefault();if(disabled||inFlight.current)return;inFlight.current=true;setBusy(true);setMessage('')
    try{await savePresentation(auth.store,authority.store,business.id,draft,removeLogo?null:business.presentation.logo_path,file,asset);setFailed(false);setMessage('Cambios guardados. Ya podés verlos en tu carta.');setFile(null);setAsset(null);context.reload()}
    catch(error){if(error instanceof AdminError&&error.asset)setAsset(error.asset);setFailed(true);setMessage(adminMessage(error))}finally{inFlight.current=false;setBusy(false)}}
  return <section className="admin-workspace"><p className="eyebrow">{business.name}</p><h1>Mi comercio</h1><p className="muted">Personalizá tu carta. Tus cambios se publican al guardarlos.</p>
    <p className="outline-tag">Servicio: {business.loyaltyEnabled?'Carta + Fidelización':'Carta Digital'}</p><p className="business-form-help">La plataforma gestiona el servicio contratado. Moneda {business.currency} · zona horaria {business.timezone}.</p>
    <form className="admin-form" onSubmit={submit} aria-busy={busy}><fieldset disabled={disabled||busy}><legend>Identidad y contacto</legend>
      <label htmlFor="business-name">Nombre del comercio</label><input id="business-name" required maxLength={120} value={draft.name} onChange={e=>field('name',e.target.value)}/>
      <label htmlFor="business-tagline">Frase breve</label><input id="business-tagline" maxLength={160} value={draft.tagline} onChange={e=>field('tagline',e.target.value)}/>
      <label htmlFor="business-description">Descripción</label><textarea id="business-description" maxLength={1000} value={draft.description} onChange={e=>field('description',e.target.value)}/>
      <label htmlFor="business-city">Ciudad</label><input id="business-city" maxLength={100} value={draft.city} onChange={e=>field('city',e.target.value)}/>
      <label htmlFor="business-region">Provincia o región</label><input id="business-region" maxLength={100} value={draft.region} onChange={e=>field('region',e.target.value)}/>
      <label htmlFor="business-country">País</label><select id="business-country" value={draft.country_code} onChange={e=>field('country_code',e.target.value)}>{[['AR','Argentina'],['UY','Uruguay'],['CL','Chile'],['BR','Brasil'],['PY','Paraguay'],['BO','Bolivia'],['PE','Perú'],['CO','Colombia'],['MX','México'],['ES','España'],['US','Estados Unidos']].map(([code,name])=><option key={code} value={code}>{name}</option>)}{!['AR','UY','CL','BR','PY','BO','PE','CO','MX','ES','US'].includes(draft.country_code)&&<option value={draft.country_code}>{draft.country_code}</option>}</select>
      <label htmlFor="business-address">Dirección</label><input id="business-address" maxLength={240} value={draft.address} onChange={e=>field('address',e.target.value)}/>
      <label htmlFor="business-phone">Teléfono público</label><input id="business-phone" type="tel" maxLength={40} value={draft.contact_phone} onChange={e=>field('contact_phone',e.target.value)}/>
      <label htmlFor="business-instagram">Instagram (usuario)</label><input id="business-instagram" maxLength={31} placeholder="mi.comercio" value={draft.instagram_handle} onChange={e=>field('instagram_handle',e.target.value)}/>
      <label htmlFor="business-website">Sitio web (opcional)</label><input id="business-website" type="url" maxLength={2048} placeholder="https://" value={draft.website_url} onChange={e=>field('website_url',e.target.value)}/>
    </fieldset><fieldset disabled={disabled||busy}><legend>Apariencia</legend>
      <label htmlFor="business-template">Estilo de carta</label><select id="business-template" value={draft.template} onChange={e=>field('template',e.target.value)}><option value="night">Noche · oscuro</option><option value="light">Claro · simple</option><option value="warm">Cálido · tierra</option></select>
      <label htmlFor="business-accent">Color de acento</label><select id="business-accent" value={draft.accent} onChange={e=>field('accent',e.target.value)}><option value="amber">Ámbar</option><option value="teal">Verde</option><option value="rose">Rosa</option><option value="blue">Azul</option></select>
      <label htmlFor="business-logo">Logo (opcional)</label><input id="business-logo" type="file" accept=".jpg,.jpeg,.png,.webp,.avif" onChange={e=>{setMessage('');setAsset(null);setFile(null);const chosen=e.target.files?.[0];if(chosen)try{imageExtension(chosen);setFile(chosen);setRemoveLogo(false)}catch(error){setFailed(true);setMessage(adminMessage(error))}}}/><small className="muted">Hasta 5 MiB. Usá una imagen pública. Se sube sólo al guardar y cada reemplazo crea un archivo nuevo.</small>
      {business.presentation.logo_path&&<label className="admin-check"><input type="checkbox" checked={removeLogo} onChange={e=>{setRemoveLogo(e.target.checked);setFile(null);setAsset(null)}}/>Quitar logo personalizado de la carta</label>}
      {asset&&<p role="status">Logo subido pendiente de confirmar. El reintento reutiliza ese archivo.</p>}
    </fieldset>{message&&<AuthStatus error={failed} message={message}/>}<button className="button-primary" type="submit" disabled={disabled||busy}>{busy?'Guardando…':'Guardar cambios'}</button></form>
  </section>
}
