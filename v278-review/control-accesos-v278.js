/* Reportes HYS v278: control REAL de acceso a cuentas existentes.
 * Solo llama a RPC protegida de Supabase después de confirmación explícita.
 * No crea cuentas, elimina identidades ni almacena credenciales.
 */
(function(root){
 'use strict';
 const tags=Object.freeze({
  suspend:{code:'SUSPENSION_ACCESO',label:'Suspender acceso',active:false},
  terminate:{code:'DESVINCULACION_BAJA',label:'Desvincular y dar de baja',active:false},
  reactivate:{code:'REACTIVACION_ACCESO',label:'Reactivar acceso',active:true}
 });
 const safeText=(s,max=500)=>String(s??'').trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max);
 function allowedActor(access){
  return access?.profile?.activo===true
   &&access.profile.rol==='administrador_global'
   &&access.userId===access.profile.usuario_id;
 }
 function validTarget(target,actorId){
  return target&&typeof target.usuario_id==='string'&&/^[a-f0-9-]{36}$/i.test(target.usuario_id)
   &&target.usuario_id!==actorId&&target.rol!=='administrador_global'
   &&['usuario','supervisor','administrador_area'].includes(target.rol)
   &&typeof target.nombre==='string'&&target.nombre.trim().length>0
   &&typeof target.activo==='boolean'&&Number.isInteger(target.revision)&&target.revision>=0
   &&target.ambitos&&typeof target.ambitos==='object'&&!Array.isArray(target.ambitos)
   &&Object.keys(target.ambitos).length>0;
 }
 function validate({access,target,operation,reason,confirmName}){
  if(!allowedActor(access))return 'Solo el Administrador general autorizado puede gestionar accesos.';
  if(!validTarget(target,access.userId))return 'Cuenta no autorizada, protegida o sin datos de ámbitos válidos.';
  if(!tags[operation])return 'Selecciona una operación válida.';
  const desired=tags[operation].active;
  if(operation==='suspend'&&!target.activo)return 'La cuenta ya está inactiva. Puedes registrar una desvinculación o reactivarla.';
  if(operation==='reactivate'&&target.activo)return 'La cuenta ya está activa.';
  const motivo=safeText(reason);
  if(motivo.length<15)return 'Indica un motivo de al menos 15 caracteres.';
  if(motivo.length>450)return 'El motivo no debe superar 450 caracteres.';
  if(safeText(confirmName,180).toLocaleLowerCase('es')!==target.nombre.trim().toLocaleLowerCase('es'))
   return 'Confirma la operación escribiendo exactamente el nombre completo del trabajador.';
  return '';
 }
 function labelFromHistory(events,active){
  if(active)return 'Activo';
  for(const e of events||[]){
   const m=String(e?.motivo||'');
   if(m.startsWith('DESVINCULACION_BAJA |'))return 'Desvinculado · acceso bloqueado';
   if(m.startsWith('SUSPENSION_ACCESO |'))return 'Suspendido · acceso bloqueado';
   if(m.startsWith('REACTIVACION_ACCESO |'))return 'Inactivo · requiere revisión';
  }
  return 'Inactivo · sin clasificación registrada';
 }
 async function list(client){
  if(!client||typeof client.rpc!=='function')throw Error('No está disponible la conexión de usuarios.');
  const r=await client.rpc('hys242_listar_usuarios');
  if(r.error)throw Error('No fue posible verificar el directorio de usuarios: '+(r.error.message||'error de permisos'));
  if(!Array.isArray(r.data))throw Error('El directorio devolvió un formato inesperado.');
  return r.data;
 }
 async function history(client,uid){
  if(!client?.from)return [];
  const r=await client.from('eventos_v242').select('fecha,accion,motivo,actor_nombre,entidad')
   .eq('entidad',uid).order('fecha',{ascending:false}).limit(30);
  if(r.error)throw Error('No fue posible consultar la auditoría de este usuario.');
  return (r.data||[]).filter(e=>/^(SUSPENSION_ACCESO|REACTIVACION_ACCESO|DESVINCULACION_BAJA) \| /.test(e.motivo||''));
 }
 async function apply({client,access,target,operation,reason,confirmName}){
  const error=validate({access,target,operation,reason,confirmName});
  if(error)throw Error(error);
  if(root.HYS263_SANDBOX===true||root.HYS265_LAB_MODE===true||root.HYS265_PREVIEW_ONLY===true)
   throw Error('No se permiten cambios de acceso desde un laboratorio.');
  const verified=await list(client);
  const current=verified.find(u=>u.usuario_id===target.usuario_id);
  if(!validTarget(current,access.userId))throw Error('La cuenta ya no está disponible para esta operación.');
  if(current.revision!==target.revision||current.activo!==target.activo||
     current.rol!==target.rol||JSON.stringify(current.ambitos)!==JSON.stringify(target.ambitos))
   throw Error('La cuenta cambió desde que abriste esta ficha. Actualiza antes de intentar modificar el acceso.');
  const check=validate({access,target:current,operation,reason,confirmName});
  if(check)throw Error(check);
  // La operación registra motivo, autor y antes/después en eventos_v242,
  // mediante la función del servidor. No escribir perfiles desde el navegador.
  const payload={
   p_usuario:current.usuario_id,
   p_revision:current.revision,
   p_datos:{nombre:current.nombre,rol:current.rol,activo:tags[operation].active,ambitos:current.ambitos},
   p_motivo:tags[operation].code+' | '+safeText(reason,450)
  };
  const res=await client.rpc('hys242_guardar_usuario',payload);
  if(res.error)throw Error('No se pudo cambiar el acceso. '+(res.error.message||'Comprueba tus facultades.'));
  const after=await list(client);
  const latest=after.find(u=>u.usuario_id===current.usuario_id);
  if(!latest||latest.activo!==tags[operation].active)
   throw Error('El servidor respondió, pero no se pudo verificar el estado final. Actualiza el directorio antes de repetir la acción.');
  return {user:latest,operation,logCode:tags[operation].code};
 }
 const api=Object.freeze({tags,allowedActor,validTarget,validate,labelFromHistory,list,history,apply});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.Hys278AccessControl=api;
})(typeof window==='object'?window:globalThis);
