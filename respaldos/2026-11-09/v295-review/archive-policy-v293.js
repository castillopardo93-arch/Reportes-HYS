/* Reportes HYS v293 — custodia local de evidencias y disponibilidad efectiva.
 * No accede a red, usuarios, documentos ni Supabase. Funciones puras.
 */
(function(root){
 'use strict';
 const MAX_IMAGE_DATA_URI_CHARS=32*1024*1024;
 const imageHeader=/^data:image\/(?:jpeg|png|gif|webp|bmp);base64,$/i;
 function validatePhoto(photo){
  if(!photo||typeof photo!=='object'||Array.isArray(photo)||typeof photo.data!=='string')
   throw Error('Fotografía inválida. Se necesita una imagen incorporada al respaldo.');
  const data=photo.data,index=data.indexOf(',');
  if(index<0||!imageHeader.test(data.slice(0,index+1)))
   throw Error('Formato de fotografía no permitido: utiliza JPG, PNG, GIF, WEBP o BMP.');
  if(data.length>MAX_IMAGE_DATA_URI_CHARS)
   throw Error('Fotografía demasiado grande para recuperar con seguridad.');
  const payload=data.slice(index+1);
  if(!payload||payload.length%4!==0||!/^(?:[a-z0-9+/]{4})*(?:[a-z0-9+/]{2}==|[a-z0-9+/]{3}=)?$/i.test(payload))
   throw Error('Los datos de la fotografía están incompletos o dañados.');
  return true;
 }
 function remoteEnabled(flags){
  return !!(flags?.HYS292_REMOTE_WRITE_AUTHORIZED===true&&
    flags.HYS242_ENABLE_CENTRAL===true&&flags.HYS242_DEPLOYMENT_READY===true);
 }
 function canFetch(nav,flags){return nav?.onLine!==false&&remoteEnabled(flags)}
 function availability(entry,allowedRemote){
  const canUseRemote=allowedRemote===true&&entry?.remote===true;
  return {hasPdf:!!(entry?.pdfBlob||(canUseRemote&&entry?.hasPdf===true)),
          hasReportData:!!(entry?.reportData||(canUseRemote&&entry?.hasReportData===true))};
 }
 function mergeRemoteSummary(existing,summary){
  if(!summary||typeof summary.id!=='string'||!summary.id)throw Error('Resumen remoto inválido.');
  if(existing&&existing.id!==summary.id)throw Error('No se puede mezclar el historial de dos informes.');
  const latest=Number(summary.revision),old=Number(existing?.revision);
  if(existing&&Number.isSafeInteger(latest)&&Number.isSafeInteger(old)&&old>=latest)return null;
  if(existing&&(existing.pdfBlob||existing.reportData)){
   // Conservar el archivo íntegro de la revisión local. El resumen de una
   // revisión nueva NO contiene los bytes del PDF ni los datos editables.
   return {...existing,remote:true,remoteUpdateAvailable:true,
      latestRemoteRevision:Number.isSafeInteger(latest)?latest:summary.revision,
      latestRemoteUpdatedAt:summary.actualizado_en||null};
  }
  return {...summary,remote:true,pdfBlob:null,reportData:null,
     remoteUpdateAvailable:false};
 }
 const api=Object.freeze({validatePhoto,remoteEnabled,canFetch,availability,mergeRemoteSummary});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.Hys293ArchivePolicy=api;
})(typeof window==='object'?window:globalThis);
