/* Contexto y validación local. No autentica ni concede permisos de servidor. */
(function(root){'use strict';
 const physical=()=>root.__REPORTES_HYS_OTROS_EMBEDDED__===true?'OTROS':'APR';
 const signature=()=>{const a=root.__REPORTES_HYS_ACCESS__;return JSON.stringify([a?.userId,a?.selectedModule,a?.profile?.rol,a?.profile?.activo,a?.modules,a?.permissions,a?.facultades,root.Hys242?.sessionKey?.()]);};
 const invalidators=new Set(),views=new Map();
 function capture({report=false}={}){return {signature:signature(),owner:root.__REPORTES_HYS_ACCESS__?.userId,module:physical(),storage:root.HysStorage242?.capture?.(),reportId:report?root.Hys242?.reportId?.():undefined};}
 function valid(t,{write=false}={}){const a=root.__REPORTES_HYS_ACCESS__;return !!(t?.owner&&a?.userId===t.owner&&a.profile?.activo===true&&a.selectedModule===t.module&&t.signature===signature()&&(!t.storage?.valid||t.storage.valid())&&(t.reportId===undefined||t.reportId===root.Hys242?.reportId?.())&&(!write||root.Hys242?.canWrite?.()===true));}
 function assert(t,options){if(!valid(t,options)){const e=Error('La sesión, los permisos o el informe cambiaron. No se aplicó la operación.');e.code='HYS_SESSION_CHANGED';throw e;}}
 function resetViews(){for(const [node,close] of views){try{close()}catch{node.remove?.()}}views.clear();const d=root.document;d?.getElementById('changeHistoryModal')?.remove();const viewer=d?.getElementById('photoViewer');viewer?.classList.remove('open');const image=d?.getElementById('photoViewerImage');if(image)image.removeAttribute('src');if(d?.body)d.body.style.overflow='';for(const fn of invalidators)fn();}
 function watch(node,token,close=()=>node.remove()){views.set(node,close);return ()=>views.delete(node);}
 let previous=signature();
 root.addEventListener?.('reportes-hys-access-changing',()=>{resetViews();previous=signature();});
 root.addEventListener?.('reportes-hys-access-changed',()=>{const next=signature();if(next!==previous)resetViews();previous=next;});
 function validatePack(obj,module,policy=root.Hys293ArchivePolicy){
  if(!obj||typeof obj!=='object'||Array.isArray(obj)||!obj.data||typeof obj.data!=='object')throw Error('Copia no válida');
  if(obj.module&&obj.module!==module)throw Error('El informe corresponde a otro módulo. No se mezclaron los datos de APR y OTROS.');
  if(module==='OTROS'&&((Array.isArray(obj.data.activities)&&obj.data.activities.length>0)||
     (Array.isArray(obj.data.inspections)&&obj.data.inspections.length>0)))
   throw Error('La tarjeta Supervisores/Capataces solo admite hallazgos. No se mezclaron datos de Prevencionistas.');
  for(const [kind,count,photoIndex,metaIndex] of [['activities',4,4,5],['inspections',4,4,5],['findings',5,5,6]]){
   if(!Array.isArray(obj.data[kind]))throw Error('Copia no válida: falta '+kind);
   for(const record of obj.data[kind]){
    if(!Array.isArray(record)||record.length<count)throw Error('Registro incompleto en '+kind);
    if(record.slice(0,count).some(v=>v!==null&&typeof v==='object'))throw Error('Campo de texto inválido en '+kind);
    const photos=record[photoIndex];if(photos!==undefined&&!Array.isArray(photos))throw Error('Fotografías inválidas en '+kind);
    for(const photo of photos||[])policy.validatePhoto(photo);
    const meta=record[metaIndex];if(meta!==undefined&&meta!==null&&(typeof meta!=='object'||Array.isArray(meta)))throw Error('Metadatos inválidos en '+kind);
    if(meta?.actions!==undefined&&!Array.isArray(meta.actions))throw Error('Acciones inválidas');
    if(meta?.risks!==undefined&&!Array.isArray(meta.risks))throw Error('Riesgos inválidos');
    if(meta?.assignees!==undefined&&!Array.isArray(meta.assignees))throw Error('Responsables inválidos');
   }
  }
  if(obj.history!==undefined&&(!Array.isArray(obj.history)||obj.history.some(h=>!h||typeof h!=='object'||h.changes!==undefined&&!Array.isArray(h.changes))))throw Error('Historial inválido');
  return obj;
 }
 const reportFields=[
  ['dateFrom','Fecha desde'],['dateTo','Fecha hasta'],['date','Fecha del informe'],
  ['owner','Responsable'],['shift','Turno'],['project','Proyecto'],['area','Área']
 ];
 function validDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.startsWith('0000-'))return false;
  const date=new Date(value+'T00:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
 }
 function validateReportStart(payload){
  const missing=reportFields.filter(([key])=>typeof payload[key]!=='string'||!payload[key].trim());
  if(missing.length)return {field:missing[0][0],message:'Completa en Inicio: '+missing.map(([,label])=>label).join(', ')+'.'};
  for(const [key,label] of reportFields.slice(0,3)){
   if(!validDate(payload[key]))return {field:key,message:label+': ingresa una fecha válida.'};
  }
  if(payload.dateFrom>payload.dateTo)return {field:'dateFrom',message:'La fecha desde no puede ser posterior a la fecha hasta.'};
  if(payload.date<payload.dateFrom||payload.date>payload.dateTo){
   return {field:'date',message:'La fecha del informe debe estar dentro del período del turno.'};
  }
  return null;
 }
 const api={capture,valid,assert,resetViews,watch,onInvalidate:fn=>invalidators.add(fn),validatePack,validateReportStart};root.Hys255Guard=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
