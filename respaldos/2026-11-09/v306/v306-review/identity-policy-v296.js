/* v296 — Comprobación estricta de identidades para carga local.
 * No corrige datos históricos sin consentimiento ni concede permisos.
 */
(function(root){
 'use strict';
 function checkLoadIdentity(entry,module){
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||
   typeof entry.id!=='string'||!entry.id.trim()||
   !['APR','OTROS'].includes(module)||
   !entry.reportData||typeof entry.reportData!=='object'||Array.isArray(entry.reportData)||
   entry.reportData.reportId!==entry.id||
   (entry.reportId!==undefined&&entry.reportId!==entry.id)||
   (entry.module!==undefined&&entry.module!==module)||
   (entry.reportData.module!==undefined&&entry.reportData.module!==module))
    throw Error('El identificador o la tarjeta del informe no coincide con el respaldo. No se cargaron datos.');
  return entry.id;
 }
 const api=Object.freeze({checkLoadIdentity});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.Hys296Identity=api;
})(typeof window==='object'?window:globalThis);
