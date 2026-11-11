/* Reportes HYS v294: lectura y validación de archivos por módulo.
 * Política pura: no autoriza RLS ni realiza escrituras remotas.
 */
(function(root){
 'use strict';
 function validateRemoteRow(item,id,module,validatePack){
  if(!item||typeof item!=='object'||Array.isArray(item)||
     !id||typeof id!=='string'||item.id!==id||
     !['APR','OTROS'].includes(module)||item.modulo!==module||
     !Number.isSafeInteger(item.revision)||item.revision<1||
     typeof item.creador_id!=='string'||!item.creador_id||
     !item.payload||typeof item.payload!=='object'||Array.isArray(item.payload)||
     item.payload.reportId!==id||
     !['En edición','Finalizado'].includes(item.payload.status))
   throw Error('El servidor devolvió un informe incompleto o perteneciente a otra tarjeta.');
  if(typeof validatePack==='function')validatePack(item.payload,module);
  return item;
 }
 function validatePdfPayload(archive,id){
  if(!archive||archive.pdf==null)return false;
  if(typeof archive.pdf!=='string'||!archive.pdf.startsWith('JVBERi0')||
    archive.pdf.length%4!==0||
    (archive.metadata?.reportId!==undefined&&archive.metadata.reportId!==id))
   throw Error('El PDF recuperado está incompleto o no corresponde al informe solicitado.');
  return true;
 }
 function chooseArchiveSource(local,remoteAllowed){
  // Los PDF creados y guardados exclusivamente en el navegador nunca se
  // convierten en "remotos" al habilitar la conexión de otros informes.
  return remoteAllowed===true&&(!local||local.remote===true||local.remoteUpdateAvailable===true)
   ?'remote':'local';
 }
 function readableHistory(item){
  return Array.isArray(item?.archivo?.metadata?.history)
   ?item.archivo.metadata.history
   :Array.isArray(item?.payload?.history)?item.payload.history:[];
 }
 const api=Object.freeze({validateRemoteRow,validatePdfPayload,chooseArchiveSource,readableHistory});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.Hys294RemoteArchive=api;
})(typeof window==='object'?window:globalThis);
