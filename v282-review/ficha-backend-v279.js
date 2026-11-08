/* v279 — servicio REAL de datos laborales y listas. No hay almacenamiento ficticio.
 * No activa producción: hasta que se instale el backend auditado, solo permite lectura
 * de datos existentes y bloquea todas las operaciones nuevas de escritura.
 */
(function(root){
'use strict';
let pending=null,known=null;
const client=()=>root.reportesHysSupabase;
async function available(force=false){
 if(known&&!force)return known;
 if(pending&&!force)return pending;
 pending=(async()=>{
  const c=client();
  if(!c?.rpc)return {ready:false,reason:'Debes iniciar sesión en Reportes HYS.'};
  try{
   const {data,error}=await c.rpc('hys279_capacidades');
   if(error)throw error;
   return {ready:data?.fichas===true&&data?.turnos===true,reason:'',data};
  }catch(e){
   const missing=e?.code==='PGRST202'||e?.code==='42883'||/not found|could not find/i.test(e?.message||'');
   return {ready:false,reason:missing
    ?'La integración real de la ficha laboral v279 todavía no está instalada en Supabase. No se guardarán cambios.'
    :'No fue posible comprobar la conexión de la ficha v279. No se guardarán cambios.'};
  }
 })();
 try{return known=await pending}finally{pending=null}
}
async function read(userId){
 const cap=await available();
 if(!cap.ready)throw Error(cap.reason);
 const {data,error}=await client().rpc('hys279_obtener_ficha',{p_usuario:userId});
 if(error)throw Error('No se pudo consultar la ficha laboral: '+error.message);
 if(!data||data.usuario_id!==userId)throw Error('El servidor no devolvió la ficha solicitada.');
 return data;
}
async function save(userId,worker,revision,reason){
 const cap=await available();
 if(!cap.ready)throw Error(cap.reason);
 const {data,error}=await client().rpc('hys279_guardar_ficha',
  {p_usuario:userId,p_datos:worker,p_revision:revision,p_motivo:String(reason||'').trim()});
 if(error)throw Error('No se pudo guardar la ficha: '+error.message);
 if(!data||data.usuario_id!==userId)throw Error('El servidor no confirmó la ficha guardada.');
 return data;
}
/* El régimen 5x2/4x3/... NO usa listas_v242.shift de informes diarios. */
async function regimesReady(){
 const c=client();
 if(!c?.rpc)return {ready:false,reason:'Debes iniciar sesión.'};
 const {data,error}=await c.rpc('hys281_capacidades');
 if(error||data?.regimenes!==true)return {ready:false,reason:'El catálogo independiente de regímenes laborales aún no está habilitado en Supabase.'};
 return {ready:true};
}
async function shifts(){
 const ready=await regimesReady();
 if(!ready.ready)throw Error(ready.reason);
 const {data,error}=await client().from('regimenes_laborales_v281')
  .select('codigo').eq('activo',true).order('codigo');
 if(error)throw Error('No se pudieron consultar los regímenes laborales: '+error.message);
 return [...new Set((data||[]).map(x=>String(x.codigo||'').trim()).filter(Boolean))];
}
async function regimes(){
 const ready=await regimesReady();
 if(!ready.ready)throw Error(ready.reason);
 const {data,error}=await client().from('regimenes_laborales_v281').select('id,codigo,activo,revision,actualizado_en').order('codigo');
 if(error)throw Error('No se pudo consultar el catálogo de regímenes laborales: '+error.message);
 return data||[];
}
async function saveRegime({id,codigo,activo,revision,motivo}){
 const ready=await regimesReady();
 if(!ready.ready)throw Error(ready.reason);
 const value=String(codigo||'').toUpperCase().replace(/\s+/g,'');
 if(!/^[1-9][0-9]{0,2}X[1-9][0-9]{0,2}$/.test(value))
  throw Error('Utiliza un régimen válido como 5x2, 4x3, 10x5 o 7x7.');
 const reason=String(motivo||'').trim();
 if(reason.length<10||reason.length>400)throw Error('El motivo debe contener entre 10 y 400 caracteres.');
 const {data,error}=await client().rpc('hys281_guardar_regimen',{
  p_id:id||null,p_codigo:value,p_activo:activo!==false,
  p_revision:id?revision:null,p_motivo:reason
 });
 if(error)throw Error('No se pudo guardar el régimen laboral: '+error.message);
 if(!data?.id)throw Error('El servidor no confirmó la operación.');
 return data;
}
async function saveOption({modulo,campo,id,valor,activa,esperado,motivo}){
 const cap=await available();
 if(!cap.ready)throw Error(cap.reason);
 const args={
  p_modulo:modulo,p_campo:campo,p_id:id||null,p_valor:String(valor||'').trim(),
  p_activa:activa!==false,p_esperado:esperado||null,p_motivo:String(motivo||'').trim()
 };
 const {data,error}=await client().rpc('hys279_guardar_opcion',args);
 if(error)throw Error('No se pudo guardar la opción: '+error.message);
 if(!data?.id)throw Error('El servidor no confirmó el cambio de opción.');
 return data;
}
root.Hys279Backend=Object.freeze({available,read,save,shifts,regimes,regimesReady,saveRegime,saveOption});
})(window);
