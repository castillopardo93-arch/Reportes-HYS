/* Reportes HYS v265: ficha laboral, reglas puras, sin operaciones remotas. */
(function(root){
'use strict';
const text=(v,n=160)=>String(v??'').trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,n);
const roles=['usuario','supervisor','administrador_area'];
const modules=['APR','OTROS'];
const fields=['nombre','rut','pais_documento','tipo_documento','cargo','gerencia','supervisor_id','celular','correo_personal','correo_corporativo','empresa','proyecto','fecha_ingreso','estado_laboral','codigo_trabajador','turno','preferencia_contacto'];
const documentTypes=['rut','ci','dni','pasaporte','otro'];
const contactPreferences=['corporativo','personal','celular','todas'];
const rutParts=v=>{
 const raw=text(v,24).toUpperCase().replace(/[.\s-]/g,'');
 if(!/^\d{7,8}[0-9K]$/.test(raw))return null;
 const body=raw.slice(0,-1),dv=raw.slice(-1);
 let sum=0,mult=2;
 for(let i=body.length-1;i>=0;i--){sum+=Number(body[i])*mult;mult=mult===7?2:mult+1}
 const mod=11-(sum%11),expected=mod===11?'0':mod===10?'K':String(mod);
 return {body,dv,valid:dv===expected,normalized:body+'-'+dv,display:body.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+'-'+dv};
};
const validRut=v=>rutParts(v)?.valid===true;
function normalizeDocument(value,pais,tipo){
 const raw=text(value,50).toUpperCase();
 if(tipo==='rut'&&pais==='Chile')return rutParts(raw)?.normalized||raw;
 return raw.replace(/\s+/g,' ').trim();
}
function validDocument(value,pais,tipo){
 if(!text(pais,80)||!documentTypes.includes(tipo))return false;
 if(tipo==='rut')return pais==='Chile'&&validRut(value);
 const id=normalizeDocument(value,pais,tipo);
 return id.length>=3&&id.length<=40&&/^[A-Z0-9][A-Z0-9 .\/-]*$/.test(id)&&/[A-Z0-9]/.test(id);
}
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(v,254));
const safeEmail=v=>text(v,254).toLowerCase();
function sanitize(input){
 const x={};
 for(const k of fields)x[k]=text(input?.[k],k.startsWith('correo')?254:k==='nombre'?150:k==='celular'?25:160);
 // El país se escribe libremente; no se presupone nacionalidad alguna.
 x.tipo_documento=x.tipo_documento||'rut';
 x.rut=normalizeDocument(x.rut,x.pais_documento,x.tipo_documento);
 x.correo_personal=safeEmail(x.correo_personal);x.correo_corporativo=safeEmail(x.correo_corporativo);
 x.codigo_trabajador=x.codigo_trabajador||x.rut;
 x.estado_laboral=x.estado_laboral||'activo';
 x.preferencia_contacto=x.preferencia_contacto||'todas';
 return x;
}
function validate(input,users=[],currentId='',options={}){
 const w=sanitize(input),errors=[];
 const required=[['nombre','Nombre completo'],['rut','Número de documento'],['pais_documento','País del documento'],['tipo_documento','Tipo de documento'],['cargo','Cargo'],['gerencia','Gerencia'],['empresa','Empresa empleadora'],['proyecto','Proyecto']];
 if(!options.allowNoSupervisor)required.push(['supervisor_id','Supervisor responsable']);
 for(const [key,label]of required)if(!w[key])errors.push(label+' es obligatorio');
 if(w.nombre&&w.nombre.length<5)errors.push('Ingresa nombre completo y apellidos');
 if(w.rut&&!validDocument(w.rut,w.pais_documento,w.tipo_documento))
  errors.push(w.tipo_documento==='rut'?'RUT chileno inválido: revisa el dígito verificador':'Documento inválido para el tipo y país indicados');
 if(w.celular&&!/^\+?[0-9][0-9\s()-]{5,24}$/.test(w.celular))errors.push('Celular inválido');
 if(w.correo_personal&&!validEmail(w.correo_personal))errors.push('Correo personal inválido');
 if(w.correo_corporativo&&!validEmail(w.correo_corporativo))errors.push('Correo corporativo inválido');
 if(!w.correo_corporativo&&!w.correo_personal)errors.push('Registra al menos un correo corporativo o personal');
 if(!contactPreferences.includes(w.preferencia_contacto))errors.push('Preferencia de contacto inválida');
 if(w.preferencia_contacto==='corporativo'&&!w.correo_corporativo)errors.push('La preferencia corporativa requiere correo corporativo');
 if(w.preferencia_contacto==='personal'&&!w.correo_personal)errors.push('La preferencia personal requiere correo personal');
 if(w.preferencia_contacto==='celular'&&!w.celular)errors.push('La preferencia de celular requiere un número registrado');
 if(!['activo','suspendido','desvinculado'].includes(w.estado_laboral))errors.push('Estado laboral inválido');
 if(w.fecha_ingreso){
  const validDate=/^\d{4}-\d{2}-\d{2}$/.test(w.fecha_ingreso)
   &&!Number.isNaN(Date.parse(w.fecha_ingreso+'T12:00:00Z'))
   &&new Date(w.fecha_ingreso+'T12:00:00Z').toISOString().slice(0,10)===w.fecha_ingreso;
  if(!validDate)errors.push('Fecha de ingreso inválida');
 }
 if(Array.isArray(options.turnos)&&options.turnos.length&&w.turno&&!options.turnos.includes(w.turno))
  errors.push('Selecciona un turno habilitado en Áreas y opciones');
 if(w.supervisor_id===currentId&&currentId)errors.push('Una persona no puede supervisarse a sí misma');
 if(w.supervisor_id&&!users.some(u=>u.usuario_id===w.supervisor_id&&u.usuario_id!==currentId&&u.activo!==false))
  errors.push('Selecciona un supervisor responsable registrado y activo');
 const byId=new Map(users.map(u=>[u.usuario_id,u]));let next=w.supervisor_id;
 const visited=new Set();
 while(next){
  if(next===currentId&&currentId){errors.push('El supervisor elegido generaría un ciclo en el organigrama');break}
  if(visited.has(next)){errors.push('La cadena de supervisión ya contiene un ciclo');break}
  if(!byId.has(next))break;
  visited.add(next);next=byId.get(next)?.trabajador?.supervisor_id||'';
 }
 for(const u of users){
  if(u.usuario_id===currentId)continue;
  const other=sanitize(u.trabajador||{});
  if(other.rut&&other.pais_documento===w.pais_documento&&other.rut===w.rut)
   errors.push('Ya existe una persona con ese documento y país');
  const emails=[other.correo_corporativo,other.correo_personal,u.email].filter(Boolean).map(safeEmail);
  if(w.correo_corporativo&&emails.includes(w.correo_corporativo)||w.correo_personal&&emails.includes(w.correo_personal))
   errors.push('El correo ya está vinculado a otra cuenta');
 }
 return {ok:errors.length===0,errors,worker:w};
}
function validateAccount(account,worker,existing=false){
  const errors=[];
  const method=account?.metodo||'invitacion';
  const source=account?.correo_ingreso||'corporativo';
  const chosen=source==='personal'?worker?.correo_personal:worker?.correo_corporativo;
  const email=safeEmail(chosen);
  if(!['invitacion','automatica','manual'].includes(method))errors.push('Selecciona un método válido para la cuenta');
  if(!['corporativo','personal'].includes(source))errors.push('Selecciona un correo de ingreso permitido');
  if(!validEmail(email))errors.push('Selecciona un correo válido en la ficha del trabajador para crear su cuenta');
  // Nunca aceptar campos de contraseña en el modelo persistente.
  // Los secretos transitorios se validan separadamente y jamás se serializan.
  const previous=safeEmail(account?.email||'');
  const estado=existing
    ?(previous&&previous!==email?'cambio_correo_pendiente':account?.estado||'sin_cambios')
    :(method==='invitacion'?'pendiente_invitacion':'alta_temporal_simulada');
  return {ok:!errors.length,errors,cuenta:{correo_ingreso:source,metodo:method,email,estado}};
}
function validConfiguration(role,ambitos,grants,areas){
 const errors=[];
 if(!roles.includes(role))errors.push('Rol no permitido');
 if(!modules.some(m=>ambitos?.[m]?.ver===true))errors.push('Habilita al menos una tarjeta');
 for(const m of modules){
  const a=ambitos?.[m];if(a?.ver!==true)continue;
  if(!Array.isArray(a.areas)||!a.areas.length)errors.push('Selecciona áreas en '+m);
  for(const id of a.areas||[])if(!areas.some(x=>x.modulo===m&&x.id===id&&x.activa!==false))errors.push('Área no disponible en '+m);
  if(a.editar!==true&&a.editar!==false)errors.push('Indica acceso de edición en '+m);
 }
 if(role!=='administrador_area'&&modules.some(m=>Object.values(grants?.[m]?.facultades||{}).some(Boolean)))errors.push('Los roles no administradores no tienen facultades especiales');
 const requireView=['pdf','review','approve','close','editOthers'];
 const allowedRights=new Set(['view',...requireView,'areas','users','activation','audit']);
 for(const m of modules){
  const entry=grants?.[m],scope=entry?.facultades||{},selected=entry?.areas_ids||[];
  if(!Array.isArray(selected))errors.push('Las áreas asignadas a facultades deben ser una lista en '+m);
  if(!scope||typeof scope!=='object'||Array.isArray(scope))errors.push('Formato de facultades inválido en '+m);
  else for(const [name,value] of Object.entries(scope)){
   if(!allowedRights.has(name)||typeof value!=='boolean')errors.push('Facultad no reconocida o no booleana: '+name);
  }
  if(ambitos?.[m]?.ver!==true&&Object.values(scope||{}).some(Boolean))errors.push('No puedes conceder facultades de una tarjeta deshabilitada');
  if(requireView.some(k=>scope?.[k]===true)&&scope?.view!==true)errors.push('Las facultades de revisar, cerrar y editar informes requieren Consultar informes');
  if(Array.isArray(selected)){
   if(selected.length!==new Set(selected).size)errors.push('Hay áreas duplicadas en las facultades de '+m);
   for(const id of selected)if(!ambitos?.[m]?.areas?.includes(id))errors.push('Facultad fuera del ámbito '+m);
  }
  if(Object.values(scope||{}).some(v=>v===true)&&(!Array.isArray(selected)||!selected.length))
   errors.push('Las facultades requieren al menos un área explícita en '+m);
 }
 return {ok:!errors.length,errors};
}
const auditSafe=w=>{const x=sanitize(w);return {
 nombre:x.nombre,cargo:x.cargo,gerencia:x.gerencia,empresa:x.empresa,proyecto:x.proyecto,
 supervisor_id:x.supervisor_id,estado_laboral:x.estado_laboral,fecha_ingreso:x.fecha_ingreso,
 turno:x.turno,documento_registrado:Boolean(x.rut),pais_documento:x.pais_documento,tipo_documento:x.tipo_documento,codigo_interno_registrado:Boolean(x.codigo_trabajador),preferencia_contacto:x.preferencia_contacto,
 rut_registrado:Boolean(x.rut),celular_registrado:Boolean(x.celular),
 correo_personal_registrado:Boolean(x.correo_personal),correo_corporativo_registrado:Boolean(x.correo_corporativo)
};};
function redactAudit(data){
 const scrub=v=>String(v)
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[correo protegido]')
  .replace(/\b(?:\d{1,2}\.)?\d{3}\.\d{3}-[0-9Kk]\b|\b\d{7,8}-[0-9Kk]\b/g,'[RUT protegido]')
  .replace(/\+?56[\s-]?9(?:[\s-]?\d){8}/g,'[teléfono protegido]');
 const forbidden=/rut|documento|identificacion|identificación|codigo_trabajador|código_interno|correo|email|celular|telefono|teléfono|phone|movil|móvil|password|token|secret|clave/i;
 const seen=new WeakSet();
 function walk(value){
  if(Array.isArray(value))return value.map(walk);
  if(value&&typeof value==='object'){
   if(seen.has(value))return '[referencia circular]';
   seen.add(value);
   return Object.fromEntries(Object.entries(value).map(([key,v])=>
    [key,forbidden.test(key)?'[dato protegido]':walk(v)]));
  }
  return typeof value==='string'?scrub(value):value;
 }
 return walk(data);
}
const identityEmail=w=>safeEmail(w.correo_corporativo||w.correo_personal);
const blankGrants=(ambitos)=>Object.fromEntries(modules.map(m=>[m,{areas_ids:ambitos?.[m]?.ver===true?[...(ambitos[m].areas||[])]:[],facultades:{}}]));
function transition(oldRole,nextRole,grantDraft,ambitos){
 return oldRole===nextRole?grantDraft:blankGrants(ambitos);
}
const api={text,roles,modules,fields,documentTypes,contactPreferences,rutParts,validRut,validDocument,normalizeDocument,validEmail,sanitize,validate,validateAccount,validConfiguration,auditSafe,redactAudit,identityEmail,blankGrants,transition};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.Hys265WorkerModel=api;
})(typeof window==='object'?window:globalThis);
