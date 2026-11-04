// Nuevo endpoint: no sustituye funciones protegidas. Requiere instalación aprobada.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
Deno.serve(async req => {
 const origin=req.headers.get('Origin')||'',allowed=(Deno.env.get('HYS241_ALLOWED_ORIGINS')||'').split(',').map(x=>x.trim()).filter(x=>{try{const u=new URL(x);return u.protocol==='https:'&&u.origin===x}catch{return false}});
 const headers={'Access-Control-Allow-Origin':allowed.includes(origin)?origin:'null','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(!allowed.includes(origin))return reply({error:'Origen no autorizado para v241'},403);
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply({error:'Método inválido'},405);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!secret)return reply({error:'Servidor v241 sin configurar'},503);
 const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return reply({error:'Sesión requerida'},401);
 const client=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const identity=await client.auth.getUser(token);if(identity.error||!identity.data.user)return reply({error:'Sesión inválida'},401);
 try{
  const body=await req.json();if(body.action!=='invite'||typeof body.email!=='string'||typeof body.solicitud!=='string')return reply({error:'Solo invitación explícita; sin eliminación ni contraseñas temporales'},400);
  const prepared=await client.rpc('hys241_preparar_invitacion',{p_email:body.email,p_datos:body.datos,p_solicitud:body.solicitud});if(prepared.error)return reply({error:prepared.error.message},403);
  const jobResult=await service.from('invitaciones_v241').select('*').eq('id',prepared.data).single();const job=jobResult.data;if(jobResult.error||!job||job.actor_id!==identity.data.user.id)return reply({error:'Solicitud no disponible'},403);
  let authId=job.auth_usuario;const redirect=Deno.env.get('HYS241_INVITE_REDIRECT');if(!redirect||!allowed.includes(new URL(redirect).origin))return reply({error:'Destino de invitación v241 no configurado'},503);
  if(!authId){
   // Reintentos seguros: una cuenta existente ajena a esta operación nunca se altera.
   for(let page=1;page<=1000;page++){
    const list=await service.auth.admin.listUsers({page,perPage:100});if(list.error)throw Error('Directorio no disponible');
    const found=list.data.users.find(u=>u.email?.toLowerCase()===job.email);
    if(found){if(found.app_metadata?.hys241_invitation!==job.id)return reply({error:'La cuenta ya existe. Usa la edición autorizada; no se reenvía ni modifica su acceso.'},409);authId=found.id;break}
    if(list.data.users.length<100)break;if(page===1000)throw Error('Directorio demasiado extenso para esta consulta');
   }
   if(!authId){const invited=await service.auth.admin.inviteUserByEmail(job.email,{redirectTo:redirect,data:{version:'v241'}});if(invited.error||!invited.data.user)throw Error('No se pudo completar la invitación');authId=invited.data.user.id;const marked=await service.auth.admin.updateUserById(authId,{app_metadata:{hys241_invitation:job.id}});if(marked.error)throw Error('Cuenta nueva conservada; requiere conciliación de la invitación')}
   const saved=await service.from('invitaciones_v241').update({auth_usuario:authId,estado:'auth_creada'}).eq('id',job.id).is('auth_usuario',null).select('auth_usuario').maybeSingle();
   if(saved.error)throw Error('Cuenta conservada; confirmación pendiente');
   if(!saved.data){const prior=await service.from('invitaciones_v241').select('auth_usuario').eq('id',job.id).single();if(prior.error||prior.data.auth_usuario!==authId)throw Error('Conflicto de invitación; no se modifica ninguna cuenta')}
  }
  const completed=await client.rpc('hys241_completar_invitacion',{p_id:job.id});
  if(completed.error)return reply({error:'La invitación se conserva, pero el acceso aún no está habilitado. '+completed.error.message,solicitud:body.solicitud,estado:'pendiente'},409);
  return reply({message:'Invitación registrada y acceso v241 configurado.',usuario_id:completed.data,solicitud:body.solicitud});
 }catch{return reply({error:'No se confirmó la operación. No se eliminó ninguna cuenta. Reintenta con la misma solicitud para recuperar su estado.'},503)}
});
