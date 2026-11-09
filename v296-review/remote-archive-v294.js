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
  const invalid=()=>{throw Error('El PDF recuperado está incompleto, dañado o no corresponde al informe solicitado.');};
  const b64=archive.pdf;
  if(typeof id!=='string'||!id||typeof b64!=='string'||b64.length>140*1024*1024||
   b64.length%4!==0||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b64)||
   !archive.metadata||archive.metadata.reportId!==id)invalid();
  let binary;
  try{binary=atob(b64)}catch{invalid()}
  if(binary.length<50||binary.slice(0,5)!=='%PDF-')invalid();
  // Comprobación estructural mínima. No equivale al parseo de un PDF completo.
  const match=binary.slice(-8192).match(/startxref\s+(\d+)\s+%%EOF[\x00-\x20]*$/);
  if(!match)invalid();
  const offset=Number(match[1]);
  if(!Number.isSafeInteger(offset)||offset<9||offset>=binary.length)invalid();
  const at=binary.slice(offset,offset+72);
  if(!/^(?:xref(?:\r|\n|\s)|\d+\s+\d+\s+obj\b)/.test(at))invalid();
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
