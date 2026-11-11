/* v262: reglas sin efectos secundarios para unificar cambio de rol y facultades. */
(function(root){
 'use strict';
 const roles=Object.freeze([
  {value:'usuario',label:'Usuario'},
  {value:'supervisor',label:'Supervisor'},
  {value:'administrador_area',label:'Administrador'}
 ]);
 const validRole=value=>roles.some(r=>r.value===value);
 const mayChangeRole=(actor,target)=>{
  return actor?.profile?.activo===true&&actor.profile.rol==='administrador_global'
   &&target?.usuario_id!==actor.userId&&target?.rol!=='administrador_global';
 };
 const roleChanged=(target,next)=>Boolean(target)&&target.rol!==next;
 function roleSummary(target,next){
  if(!validRole(next))return {valid:false,changed:false,requiresAtomic:false,label:'Rol no permitido'};
  const changed=roleChanged(target,next);
  return {valid:true,changed,requiresAtomic:changed,previous:roles.find(r=>r.value===target?.rol)?.label||'Rol anterior',label:roles.find(r=>r.value===next)?.label};
 }
 // Cambio de rol: nunca conservar automáticamente facultades administrativas.
 // Los permisos de las tarjetas (áreas/edición propia) son independientes y no se borran.
 function blankSpecials(modules,ambitos){
  return Object.fromEntries((Array.isArray(modules)?modules:[]).map(m=>[
   m,{areas_ids:[...new Set(ambitos?.[m]?.ver===true&&Array.isArray(ambitos[m].areas)?ambitos[m].areas:[])],facultades:{}}
  ]));
 }
 function roleTransitionSpecials(previousRole,nextRole,draftFac,modules,ambitos){
  if(previousRole===nextRole)return draftFac;
  // Tanto al retirar Administrador como al entrar/reingresar a Administrador.
  return blankSpecials(modules,ambitos);
 }
 function safeSpecials(role,faculties,modules){
  if(role!=='administrador_area')return {};
  const result={};
  for(const m of modules){
   const entry=faculties?.[m];
   const selected={};
   for(const [name,value] of Object.entries(entry?.facultades||{}))if(value===true)selected[name]=true;
   result[m]={areas_ids:[...new Set(entry?.areas_ids||[])],facultades:selected};
  }
  return result;
 }
 const api={roles,validRole,mayChangeRole,roleChanged,roleSummary,blankSpecials,roleTransitionSpecials,safeSpecials};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.Hys262Roles=api;
})(typeof window==='object'?window:globalThis);
