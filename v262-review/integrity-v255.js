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
 function validatePack(obj,module){
  if(!obj||typeof obj!=='object'||Array.isArray(obj)||!obj.data||typeof obj.data!=='object')throw Error('Copia no válida');
  if(obj.module&&obj.module!==module)throw Error('El informe corresponde a otro módulo. No se mezclaron los datos de APR y OTROS.');
  for(const [kind,count,photoIndex,metaIndex] of [['activities',4,4,5],['inspections',4,4,5],['findings',5,5,6]]){
   if(!Array.isArray(obj.data[kind]))throw Error('Copia no válida: falta '+kind);
   for(const record of obj.data[kind]){
    if(!Array.isArray(record)||record.length<count)throw Error('Registro incompleto en '+kind);
    if(record.slice(0,count).some(v=>v!==null&&typeof v==='object'))throw Error('Campo de texto inválido en '+kind);
    const photos=record[photoIndex];if(photos!==undefined&&!Array.isArray(photos))throw Error('Fotografías inválidas en '+kind);
    for(const photo of photos||[])if(!photo||typeof photo!=='object'||Array.isArray(photo)||typeof photo.data!=='string'||!/^data:[a-z0-9.+/-]+(?:;[a-z0-9=._-]+)*;base64,[a-z0-9+/=\s]*$/i.test(photo.data))throw Error('Adjunto no válido. Se requieren archivos incorporados a la copia.');
    const meta=record[metaIndex];if(meta!==undefined&&meta!==null&&(typeof meta!=='object'||Array.isArray(meta)))throw Error('Metadatos inválidos en '+kind);
    if(meta?.actions!==undefined&&!Array.isArray(meta.actions))throw Error('Acciones inválidas');
    if(meta?.risks!==undefined&&!Array.isArray(meta.risks))throw Error('Riesgos inválidos');
    if(meta?.assignees!==undefined&&!Array.isArray(meta.assignees))throw Error('Responsables inválidos');
   }
  }
  if(obj.history!==undefined&&(!Array.isArray(obj.history)||obj.history.some(h=>!h||typeof h!=='object'||h.changes!==undefined&&!Array.isArray(h.changes))))throw Error('Historial inválido');
  return obj;
 }
 const api={capture,valid,assert,resetViews,watch,onInvalidate:fn=>invalidators.add(fn),validatePack};root.Hys255Guard=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
