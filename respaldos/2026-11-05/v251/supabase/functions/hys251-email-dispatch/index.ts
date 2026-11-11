/* Reportes HYS F03/F07 · Worker de correo (FUENTE, NO DESPLEGADO).
 * NO ejecutar hasta aprobar migración y validar seguridad y cuenta de Resend.
 * Requiere job privado, HYS251_DISPATCH_SECRET, RESEND_API_KEY,
 * HYS251_EMAIL_FROM y credenciales secretas de Supabase en Edge Functions.
 */
import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const json=(status:number,data:unknown)=>new Response(JSON.stringify(data),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const safe=(x:unknown,n=200)=>String(x??"").trim().slice(0,n);
const now=()=>new Date().toISOString();

type OutboxRow={
 id:string;modulo:"APR"|"OTROS";informe_id:string;destinatario_id:string;
 tipo:string;asunto:string;mensaje:string;estado:"pending"|"failed";
 intentos:number;reservado_hasta:string|null;
};
function nextRetry(attempts:number){
 if(attempts>=5)return null;
 const seconds=Math.min(86400,60*2**Math.max(0,attempts-1));
 return new Date(Date.now()+seconds*1000).toISOString();
}
Deno.serve(async req=>{
 if(req.method!=="POST")return json(405,{error:"Método no permitido"});
 const expected=Deno.env.get("HYS251_DISPATCH_SECRET");
 const auth=req.headers.get("authorization");
 // No aceptar peticiones de usuarios finales ni llaves publicables.
 if(!expected||expected.length<32||auth!==("Bearer "+expected))return json(401,{error:"No autorizado"});
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const resend=Deno.env.get("RESEND_API_KEY"),sender=Deno.env.get("HYS251_EMAIL_FROM");
 if(!url||!key||!resend||!sender)return json(503,{error:"Servicio de correo no configurado"});
 const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const claim=await sb.rpc("hys251_reservar_correo",{p_limite:20});
 if(claim.error)return json(503,{error:"No se pudo reservar la cola"});
 const rows=(Array.isArray(claim.data)?claim.data:[]) as OutboxRow[];
 let sent=0,failed=0,skipped=0;
 for(const row of rows){
  if(!["APR","OTROS"].includes(row.modulo)||row.estado==="sent"||!row.reservado_hasta)continue;
  let errorCode="",providerId="";
  try{
   // El responsable debe seguir activo y haber autorizado el canal de correo.
   const [account,consent]=await Promise.all([
    sb.from("perfiles").select("usuario_id,activo").eq("usuario_id",row.destinatario_id).maybeSingle(),
    sb.from("hys251_preferencias_aviso").select("correo_habilitado").eq("usuario_id",row.destinatario_id)
      .eq("modulo",row.modulo).maybeSingle()
   ]);
   if(account.error||consent.error||account.data?.activo!==true||consent.data?.correo_habilitado!==true){
    errorCode="canal_no_habilitado";skipped++;throw Error(errorCode);
   }
   const person=await sb.auth.admin.getUserById(row.destinatario_id);
   if(person.error||!person.data.user?.email||!person.data.user.email_confirmed_at){
    errorCode="correo_no_confirmado";skipped++;throw Error(errorCode);
   }
   const resp=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{
      "authorization":"Bearer "+resend,
      "content-type":"application/json",
      "idempotency-key":"hys251/"+row.id
    },
    body:JSON.stringify({
      from:sender,
      to:[person.data.user.email],
      subject:safe(row.asunto,180),
      text:safe(row.mensaje,2000)
    })
   });
   if(!resp.ok){errorCode="provider_http_"+resp.status;throw Error(errorCode);}
   const payload=await resp.json().catch(()=>null);
   if(typeof payload?.id!=="string"||!payload.id){errorCode="sin_confirmacion_proveedor";throw Error(errorCode);}
   providerId=payload.id;
   const update=await sb.from("hys251_avisos").update({
    estado:"sent",proveedor_id:providerId,error_codigo:null,
    enviado_en:now(),reservado_hasta:null,siguiente_intento:null,actualizado_en:now()
   }).eq("id",row.id).eq("reservado_hasta",row.reservado_hasta);
   if(update.error)throw update.error;
   sent++;
  }catch(error){
   failed++;
   const code=safe(errorCode||"error_temporal",80);
   // La clave Idempotency-Key permanece igual en todos los reintentos.
   // La respuesta incierta del proveedor debe revisarse antes de reintentar
   // después de la ventana de idempotencia del proveedor.
   await sb.from("hys251_avisos").update({
    estado:"failed",error_codigo:code,siguiente_intento:nextRetry(row.intentos),
    reservado_hasta:null,actualizado_en:now()
   }).eq("id",row.id).eq("reservado_hasta",row.reservado_hasta);
  }
 }
 return json(200,{processed:rows.length,sent,failed,skipped,
  note:"Enviado significa aceptado por el proveedor; no equivale a leído ni confirmado."});
});
