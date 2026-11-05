// Endpoint independiente v242. Requiere orígenes/retorno autorizados en servidor.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
Deno.serve(async req=>{
 const origin=req.headers.get('Origin')||'',allowed=(Deno.env.get('HYS242_ALLOWED_ORIGINS')||'').split(',').map(x=>x.trim()).filter(x=>{try{const u=new URL(x);return u.protocol==='https:'&&u.origin===x}catch{return false}});
 const headers={'Access-Control-Allow-Origin':allowed.includes(origin)?origin:'null','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(!allowed.includes(origin))return reply({error:'Origen no autorizado para v242'},403);
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply({error:'Método inválido'},405);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!secret)return reply({error:'Servidor sin configurar'},503);
 const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return reply({error:'Sesión requerida'},401);
 const client=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}}),service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const identity=await client.auth.getUser(token);if(identity.error||!identity.data.user)return reply({error:'Sesión inválida'},401);
 let reserved=null,providerStarted=false,authId=null;
 const row=data=>Array.isArray(data)?data[0]:data;
 const result=async(state,id,detail)=>{const r=await service.rpc('hys242_resultado_invitacion',{p_id:reserved.id,p_revision:reserved.revision,p_estado:state,p_auth_usuario:id,p_detalle:detail});if(r.error)throw Error('Resultado pendiente de conciliación');return row(r.data)};
 try{
  const body=await req.json();if(body.action!=='invite'||typeof body.email!=='string'||typeof body.solicitud!=='string')return reply({error:'Solo invitación explícita'},400);
  const configured=Deno.env.get('HYS242_INVITE_REDIRECT');if(!configured)return reply({error:'Retorno de invitación pendiente de configurar'},503);
  const redirect=new URL(configured);if(!allowed.includes(redirect.origin)||redirect.username||redirect.password)return reply({error:'Retorno no autorizado'},503);
  redirect.hash='';redirect.searchParams.set('recuperar','1');redirect.searchParams.set('activar','1');
  const prepared=await client.rpc('hys242_preparar_invitacion',{p_email:body.email,p_datos:body.datos,p_solicitud:body.solicitud});if(prepared.error)return reply({error:prepared.error.message},403);
  const foundJob=await service.from('invitaciones_v242').select('*').eq('id',prepared.data).single();let job=foundJob.data;
  if(foundJob.error||!job||job.actor_id!==identity.data.user.id)return reply({error:'Solicitud no disponible'},403);
  authId=job.auth_usuario;
  if(!authId){
   if(!['preparada','fallida'].includes(job.estado))return reply({error:'Solicitud en envío o con resultado incierto. Consulta Administrar invitaciones; no se reenvía automáticamente.',estado:job.estado},409);
   const claim=await service.rpc('hys242_reservar_invitacion',{p_id:job.id,p_revision:job.revision});if(claim.error)return reply({error:'La solicitud ya está en proceso o cambió; actualiza su estado'},409);reserved=row(claim.data);
   for(let page=1;page<=1000;page++){
    const list=await service.auth.admin.listUsers({page,perPage:100});if(list.error)throw Error('Directorio no disponible');
    if(list.data.users.some(u=>u.email?.toLowerCase()===job.email)){await result('fallida',null,'La cuenta ya existe; no se altera');reserved=null;return reply({error:'La cuenta ya existe. No se modifica ni reenvía su acceso.'},409)}
    if(list.data.users.length<100)break;if(page===1000)throw Error('Directorio demasiado extenso');
   }
   providerStarted=true;
   const invited=await service.auth.admin.inviteUserByEmail(job.email,{redirectTo:redirect.href,data:{version:'v242'}});
   if(invited.error){const uncertain=!invited.error.status||invited.error.status>=500||invited.error.name==='AuthRetryableFetchError';await result(uncertain?'incierta':'fallida',null,uncertain?'Resultado del proveedor desconocido; requiere revisión':'El proveedor rechazó el envío sin crear cuenta');reserved=null;return reply({error:uncertain?'Resultado incierto: revisa la solicitud antes de repetir':'No se envió. Puedes corregir o reintentar desde Invitaciones.'},503)}
   if(!invited.data?.user?.id)throw Error('Respuesta sin identidad confirmada');authId=invited.data.user.id;
   job=await result('auth_creada',authId,'Identidad de cuenta nueva confirmada por proveedor');reserved=null;
  }
  const completed=await client.rpc('hys242_completar_invitacion',{p_id:job.id});if(completed.error)return reply({error:'Cuenta conservada; acceso pendiente de conciliación. '+completed.error.message,estado:'auth_creada'},409);
  return reply({message:'Invitación registrada y acceso v242 configurado.',usuario_id:completed.data});
 }catch{
  if(reserved){try{await result(providerStarted?'incierta':'fallida',authId,providerStarted?'Resultado no confirmado; no reenviar automáticamente':'Fallo anterior al envío; se permite corregir o reintentar')}catch{}}
  return reply({error:'No se confirmó la operación. No se eliminó ninguna cuenta. Consulta el estado de la invitación antes de reintentar.'},503);
 }
});
