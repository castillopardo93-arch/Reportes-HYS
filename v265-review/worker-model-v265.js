/* Reportes HYS v265: ficha laboral, reglas puras, sin operaciones remotas. */
(function(root){
'use strict';
const text=(v,n=160)=>String(v??'').trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,n);
const roles=['usuario','supervisor','administrador_area'];
const modules=['APR','OTROS'];
const fields=['nombre','rut','cargo','gerencia','supervisor_id','celular','correo_personal','correo_corporativo','empresa','proyecto','fecha_ingreso','estado_laboral','codigo_trabajador','unidad','turno','preferencia_contacto'];
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
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(v,254));
const safeEmail=v=>text(v,254).toLowerCase();
function sanitize(input){
 const x={};
 for(const k of fields)x[k]=text(input?.[k],k.startsWith('correo')?254:k==='nombre'?150:k==='celular'?25:160);
 x.rut=rutParts(x.rut)?.normalized||x.rut;
 x.correo_personal=safeEmail(x.correo_personal);x.correo_corporativo=safeEmail(x.correo_corporativo);
 x.estado_laboral=x.estado_laboral||'activo';x.preferencia_contacto=x.preferencia_contacto||'corporativo';
 return x;
}
function validate(input,users=[],currentId=''){
 const w=sanitize(input),errors=[];
 for(const [name,label] of [['nombre','Nombre completo'],['rut','RUT'],['cargo','Cargo'],['gerencia','Gerencia'],['empresa','Empresa empleadora'],['proyecto','Proyecto'],['supervisor_id','Supervisor responsable']])if(!w[name])errors.push(label+' es obligatorio');
 if(w.nombre&&w.nombre.length<5)errors.push('Ingresa el nombre completo y apellidos');
 if(w.rut&&!validRut(w.rut))errors.push('RUT inválido: revisa el dígito verificador');
 if(w.celular&&!/^\+?[0-9][0-9\s-]{7,22}$/.test(w.celular))errors.push('Celular inválido');
 if(w.correo_personal&&!validEmail(w.correo_personal))errors.push('Correo personal inválido');
 if(w.correo_corporativo&&!validEmail(w.correo_corporativo))errors.push('Correo corporativo inválido');
 if(!w.correo_corporativo&&!w.correo_personal)errors.push('Indica al menos un correo para la invitación');
 if(!['activo','suspendido','desvinculado'].includes(w.estado_laboral))errors.push('Estado laboral inválido');
 if(w.fecha_ingreso){
  const validDate=/^\d{4}-\d{2}-\d{2}$/.test(w.fecha_ingreso)
   &&!Number.isNaN(Date.parse(w.fecha_ingreso+'T12:00:00Z'))
   &&new Date(w.fecha_ingreso+'T12:00:00Z').toISOString().slice(0,10)===w.fecha_ingreso;
  if(!validDate)errors.push('Fecha de ingreso inválida');
 }
 if(w.supervisor_id===currentId&&currentId)errors.push('Una persona no puede supervisarse a sí misma');
 if(!users.some(u=>u.usuario_id===w.supervisor_id&&u.usuario_id!==currentId&&u.activo!==false))errors.push('Selecciona un supervisor responsable registrado y activo');
 // Evitar ciclos en la futura jerarquía: A supervisa B y B no puede supervisar A.
 if(w.supervisor_id){
  const byId=new Map(users.map(u=>[u.usuario_id,u]));
  const visited=new Set();let next=w.supervisor_id;
  while(next){
   if(next===currentId&&currentId){errors.push('El supervisor elegido generaría un ciclo en el organigrama');break}
   if(visited.has(next)){errors.push('La cadena de supervisión elegida ya contiene un ciclo');break}
   if(!byId.has(next))break;
   visited.add(next);
   next=byId.get(next)?.trabajador?.supervisor_id||'';
  }
 }
 for(const u of users){
  if(u.usuario_id===currentId)continue;
  if(validRut(u.trabajador?.rut||'')&&rutParts(u.trabajador.rut)?.normalized===w.rut)errors.push('Ya existe otro trabajador con ese RUT');
  const emails=[u.trabajador?.correo_corporativo,u.trabajador?.correo_personal,u.email].filter(Boolean).map(safeEmail);
  if(w.correo_corporativo&&emails.includes(w.correo_corporativo)||w.correo_personal&&emails.includes(w.correo_personal))errors.push('El correo ya está vinculado a otra cuenta');
 }
 return {ok:errors.length===0,errors,worker:w};
}
function validateAccount(account,worker,existing=false){
 const errors=[];
 const method=account?.metodo||'invitacion';
 const source=account?.correo_ingreso||'corporativo';
 const chosen=source==='personal'?worker?.correo_personal:worker?.correo_corporativo;
 const email=safeEmail(chosen);
 if(!['invitacion'].includes(method))errors.push('El alta debe realizarse por invitación; no se generan contraseñas temporales');
 if(!['corporativo','personal'].includes(source))errors.push('Selecciona un correo de ingreso permitido');
 if(!validEmail(email))errors.push('Selecciona un correo válido en la ficha del trabajador para crear su cuenta');
 // La simulación no envía invitaciones ni crea credenciales de autenticación.
 const previous=safeEmail(account?.email||'');
 const estado=!existing?'pendiente_invitacion':previous&&previous!==email?'cambio_correo_pendiente':account?.estado==='pendiente_invitacion'?'pendiente_invitacion':'sin_cambios';
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
 unidad:x.unidad,turno:x.turno,codigo_trabajador:x.codigo_trabajador,
 rut_registrado:Boolean(x.rut),celular_registrado:Boolean(x.celular),
 correo_personal_registrado:Boolean(x.correo_personal),correo_corporativo_registrado:Boolean(x.correo_corporativo)
};};
function redactAudit(data){
 const forbidden=/rut|correo|email|celular|telefono|teléfono|phone|movil|móvil|password|token|secret|clave/i;
 const seen=new WeakSet();
 function walk(value){
  if(Array.isArray(value))return value.map(walk);
  if(value&&typeof value==='object'){
   if(seen.has(value))return '[referencia circular]';
   seen.add(value);
   return Object.fromEntries(Object.entries(value).map(([key,v])=>
    [key,forbidden.test(key)?'[dato protegido]':walk(v)]));
  }
  return value;
 }
 return walk(data);
}
const identityEmail=w=>safeEmail(w.correo_corporativo||w.correo_personal);
const blankGrants=(ambitos)=>Object.fromEntries(modules.map(m=>[m,{areas_ids:ambitos?.[m]?.ver===true?[...(ambitos[m].areas||[])]:[],facultades:{}}]));
function transition(oldRole,nextRole,grantDraft,ambitos){
 return oldRole===nextRole?grantDraft:blankGrants(ambitos);
}
const api={text,roles,modules,fields,rutParts,validRut,validEmail,sanitize,validate,validateAccount,validConfiguration,auditSafe,redactAudit,identityEmail,blankGrants,transition};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.Hys265WorkerModel=api;
})(typeof window==='object'?window:globalThis);
