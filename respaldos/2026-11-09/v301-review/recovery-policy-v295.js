/* Reportes HYS v295 — copia segura de operaciones en conflicto.
 * Conserva el original íntegro como recuperación. NO reutiliza el PDF anterior.
 * Sin operaciones de red o autenticación; son reglas puras.
 */
(function(root){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v));
 function planConflictCopies(rows,config){
  if(!Array.isArray(rows)||!rows.length)throw Error('No hay cambios pendientes para recuperar.');
  const {uid,module,currentDraftId,isGlobal,ownerName,newId,now}=config||{};
  if(typeof uid!=='string'||!uid||!['APR','OTROS'].includes(module)||
     typeof newId!=='function'||typeof now!=='function')
   throw Error('No se confirmó el contexto del usuario y la tarjeta.');
  if(!isGlobal&&(!ownerName||typeof ownerName!=='string'))
   throw Error('Se requiere el responsable registrado.');
  const ops=[],seen=new Set(),issued=new Set(),timestamp=now();
  let currentId=null,pdfsToRegenerate=0;
  for(const item of rows){
   if(!item||typeof item.id!=='string'||!item.id.startsWith('v242-')||
      item.uid!==uid||item.module!==module||
      !item.payload||typeof item.payload!=='object'||Array.isArray(item.payload)||
      item.payload.reportId!==item.id||typeof item.token!=='string'||!item.token||
      seen.has(item.id))
    throw Error('Hay operaciones de otra sesión, duplicadas o incompletas. No se alteró la cola.');
   seen.add(item.id);
   const id='v242-'+newId(),token=newId(),recoveryId='recovery-'+newId();
   if(id===item.id||seen.has(id)||issued.has(id)||issued.has(token)||issued.has(recoveryId))
    throw Error('No se pudo asignar una identidad única a la recuperación.');
   issued.add(id);issued.add(token);issued.add(recoveryId);
   const needsPdf=!!item.archive||item.payload.status==='Finalizado';
   const payload={...clone(item.payload),reportId:id,...(needsPdf?{status:'En edición'}:{}),...(!isGlobal?{owner:ownerName}:{})};
   const original=clone(item);
   if(needsPdf)pdfsToRegenerate++;
   ops.push({store:'draft',value:{id:recoveryId,payload:clone(item.payload),
     draftId:item.id,operation:original,updatedAt:timestamp}});
   ops.push({store:'pending',value:{...original,id,payload,
     archive:null,revision:0,token,at:timestamp,requiresPdfRegeneration:needsPdf}});
   ops.push({store:'pending',id:item.id,remove:true});
   if(item.id===currentDraftId){
    currentId=id;
    ops.push({store:'draft',value:{id:'current',payload,draftId:id,
     preserveOwner:false,updatedAt:timestamp}});
   }
  }
  return {ops,currentId,pdfsToRegenerate,originalCount:rows.length};
 }
 const api=Object.freeze({planConflictCopies});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.Hys295Recovery=api;
})(typeof window==='object'?window:globalThis);
