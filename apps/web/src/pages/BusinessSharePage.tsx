import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {useBusiness} from '../features/business/businessContext'
import {businessPath,publicBusinessUrl} from '../features/business/businessRoutes'
export function BusinessSharePage(){
  const {business}=useBusiness(),url=publicBusinessUrl(business.slug,window.location.origin)
  const [qr,setQr]=useState(''),[error,setError]=useState(false),[copied,setCopied]=useState(false)
  const copy=async()=>{try{await navigator.clipboard.writeText(url);setCopied(true)}catch{setError(true)}}
  useEffect(()=>{let active=true;void import('qrcode').then(m=>m.default.toDataURL(url,{width:640,margin:4,errorCorrectionLevel:'M',color:{dark:'#000000',light:'#ffffff'}})).then(data=>{if(active)setQr(data)}).catch(()=>{if(active)setError(true)});return()=>{active=false}},[url])
  return <section className="admin-workspace"><h1>Compartí tu carta</h1><p>Este enlace y su QR abren la carta pública de {business.name}. Tus clientes no necesitan instalar una app.</p>
    {!business.isActive&&<p role="status">El comercio está inactivo: la carta pública todavía no está disponible.</p>}
    <p className="business-link"><a className="text-link" href={url} target="_blank" rel="noopener noreferrer">{url}</a></p><button className="button-secondary" onClick={()=>{void copy()}}>{copied?'Enlace copiado':'Copiar enlace'}</button>
    {qr?<><img className="share-qr" src={qr} alt={`QR para abrir la carta de ${business.name}`} width="320" height="320"/><a className="button-primary" href={qr} download={`${business.slug}-carta-qr.png`}>Descargar QR</a></>:<p role="status">{error?'No pudimos generar el QR. Podés usar el enlace.':'Generando QR…'}</p>}
    {error&&<p role="alert">Si no pudiste copiar o descargar, seleccioná el enlace y compartilo.</p>}<p className="context-note">Para imprimirlo, conservá el borde blanco y probalo con un celular antes de distribuirlo.</p><Link className="text-link" to={businessPath(business.slug)}>Ver carta pública</Link>
  </section>
}
