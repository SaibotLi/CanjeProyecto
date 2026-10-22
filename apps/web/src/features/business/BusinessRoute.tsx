import {useCallback,useEffect,useState,type ReactNode} from 'react'
import {Link,Outlet,useLocation,useParams} from 'react-router-dom'
import {useAuth} from '../auth/authContext'
import {AuthStatus} from '../auth/components/AuthStatus'
import {readBusiness,type Business} from './businessData'
import {BusinessContext} from './businessContext'
import {isBusinessSlug} from './businessRoutes'
import './business.css'

export function BusinessRoute(){const {businessSlug=''}=useParams();return <BusinessBoundary key={businessSlug} slug={businessSlug}><Outlet/></BusinessBoundary>}
function BusinessBoundary({slug,children}:{slug:string;children:ReactNode}){
  const auth=useAuth(),location=useLocation()
  const [state,setState]=useState<{business:Business|null;status:'loading'|'ready'|'missing'|'error';checking:boolean}>({business:null,status:'loading',checking:true})
  const [version,setVersion]=useState(0)
  const reload=useCallback(()=>setVersion(v=>v+1),[])
  useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible')reload()};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)}},[reload])
  useEffect(()=>{
    if(auth.initializing)return
    const controller=new AbortController()
    void Promise.resolve().then(async()=>{
      setState(s=>({...s,checking:true}))
      try{
        const data=await readBusiness(auth.store.getClient(),slug,AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]))
        if(!controller.signal.aborted)setState({business:data,status:data?'ready':'missing',checking:false})
      }catch{if(!controller.signal.aborted)setState(s=>({...s,status:'error',checking:false}))}
    })
    return()=>controller.abort()
  },[auth.store,auth.initializing,auth.revision,slug,version])
  if(!isBusinessSlug(slug)||state.status==='missing')return <section className="auth-panel"><h1>Comercio no disponible</h1><p>Revisá el enlace. El comercio puede estar inactivo.</p><Link to="/">Volver al inicio</Link></section>
  if(!state.business)return <section className="auth-panel">{state.status==='error'?<><AuthStatus error message="No pudimos cargar el comercio. Revisá tu conexión."/><button className="button-secondary" onClick={reload}>Reintentar</button></>:<AuthStatus message="Abriendo el comercio…"/>}</section>
  const business=state.business
  const privateView=location.pathname.startsWith(`/${slug}/admin`)||location.pathname===`/${slug}/operar`||location.pathname===`/${slug}/points`
  if(!business.isActive&&!privateView)return <section className="auth-panel"><h1>Comercio no disponible</h1><p>La carta no está publicada en este momento.</p><Link to="/">Volver al inicio</Link></section>
  return <BusinessContext.Provider value={{business,checking:state.checking,refreshError:state.status==='error',reload}}>
    <div className="business-theme" data-template={business.presentation.template} data-accent={business.presentation.accent}>
      {state.status==='error'&&<p className="business-warning" role="alert">No pudimos actualizar el comercio. Se muestra la última información confirmada. <button onClick={reload}>Reintentar</button></p>}
      {children}
    </div>
  </BusinessContext.Provider>
}
