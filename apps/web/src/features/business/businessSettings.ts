import type {AuthStore} from '../auth/sessionStore'
import type {AuthorityStore} from '../authority/authorityStore'
import type {Presentation} from './businessData'
import {AdminError,uploadMenuImage,type UploadedAsset} from '../admin/adminData'

export type PresentationDraft=Pick<Presentation,'tagline'|'description'|'city'|'region'|'country_code'|'address'|'contact_phone'|'instagram_handle'|'website_url'|'template'|'accent'> & {name:string}
export function presentationPayload(draft:PresentationDraft){
  const data={tagline:draft.tagline.trim(),description:draft.description.trim(),city:draft.city.trim(),region:draft.region.trim(),country_code:draft.country_code.trim().toUpperCase(),address:draft.address.trim(),contact_phone:draft.contact_phone.trim(),instagram_handle:draft.instagram_handle.trim().replace(/^@/,''),website_url:draft.website_url.trim(),template:draft.template,accent:draft.accent}
  const name=draft.name.trim()
  if(!name||name.length>120||data.tagline.length>160||data.description.length>1000||data.city.length>100||data.region.length>100||data.address.length>240||!/^\p{Lu}{2}$/u.test(data.country_code)||!/^[A-Z]{2}$/.test(data.country_code)||!/^[+0-9() .-]{0,40}$/.test(data.contact_phone)||!/^[A-Za-z0-9._]{0,30}$/.test(data.instagram_handle)||!['night','light','warm'].includes(data.template)||!['amber','teal','rose','blue'].includes(data.accent))throw new AdminError('Revisá los datos y los límites del formulario.','validation')
  if(data.website_url){let url:URL;try{url=new URL(data.website_url)}catch{throw new AdminError('Ingresá un sitio web válido que comience con https://.','validation')}
    if(url.protocol!=='https:'||url.username||url.password||/\s/.test(data.website_url)||data.website_url.length>2048)throw new AdminError('El sitio debe usar https:// y no contener credenciales.','validation')}
  return {name,data}
}
export async function savePresentation(auth:AuthStore,authority:AuthorityStore,businessId:string,draft:PresentationDraft,logoPath:string|null,file:File|null,uploaded:UploadedAsset|null){
  const payload=presentationPayload(draft),snapshot=auth.getSnapshot(),session=snapshot.session
  if(!session||snapshot.signingOut||snapshot.logoutError)throw new AdminError('Ingresá para continuar.','session')
  const current=()=>auth.getSnapshot().session?.user.id===session.user.id&&auth.getSnapshot().epoch===snapshot.epoch&&!auth.getSnapshot().signingOut
  const permissions=await authority.reload()
  if(!current()||!permissions?.adminBusinesses.some(b=>b.id===businessId&&b.isActive))throw new AdminError('No pudimos comprobar tu permiso actual para editar este comercio.','authority')
  if(uploaded&&(uploaded.businessId!==businessId||uploaded.userId!==session.user.id))throw new AdminError('Seleccioná nuevamente el logo para este comercio.','session')
  const client=auth.getClient();let asset=uploaded
  try{
    if(file&&!asset)asset=await uploadMenuImage(client,businessId,session.user.id,file)
    if(!current())throw new AdminError('La sesión cambió antes de guardar.','session')
    const nameResult=await client.from('businesses').update({name:payload.name}).eq('id',businessId).select('id').setHeader('Authorization',`Bearer ${session.access_token}`).abortSignal(AbortSignal.timeout(15000)).single()
    if(nameResult.error||nameResult.data?.id!==businessId||!current())throw new Error('Name not confirmed')
    const result=await client.from('business_presentation').update({...payload.data,logo_path:asset?.path??logoPath}).eq('business_id',businessId).select('business_id').setHeader('Authorization',`Bearer ${session.access_token}`).abortSignal(AbortSignal.timeout(15000)).single()
    if(result.error||result.data?.business_id!==businessId||!current())throw new Error('Presentation not confirmed')
  }catch{
    throw new AdminError('No se confirmaron todos los cambios. Revisá la carta y reintentá; el nombre puede haberse guardado. Una imagen ya subida se reutiliza y no se elimina.','image-save',asset??undefined)
  }finally{await authority.reload()}
}
