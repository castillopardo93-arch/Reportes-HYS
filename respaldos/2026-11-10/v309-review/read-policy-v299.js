/* v299: normalización de resultados de lectura central, sin operaciones de red.
 * Supabase aplica RLS; estas funciones nunca conceden autorización.
 */
(function(root){
 'use strict';
 const MODULES=Object.freeze(['APR','OTROS']);
 const KEYS=Object.freeze(['id','modulo','creador_id','revision','actualizado_en',
  'owner','date','dateFrom','dateTo','shift','project','area','status','hasPdf',
  'revision_estado','revision_flujo']);
 function validatePage(rows,module,page){
  if(!MODULES.includes(module)||!Number.isSafeInteger(page)||page<0||
     !Array.isArray(rows)||rows.length>20)
   throw Error('La consulta devolvió una página de informes inválida.');
  const seen=new Set();
  return rows.map(row=>{
   if(!row||typeof row!=='object'||Array.isArray(row)||
      typeof row.id!=='string'||!row.id.startsWith('v242-')||
      row.modulo!==module||typeof row.creador_id!=='string'||!row.creador_id||
      !Number.isSafeInteger(row.revision)||row.revision<1||
      typeof row.hasPdf!=='boolean'||
      !['En edición','Finalizado'].includes(row.status)||
      seen.has(row.id))
    throw Error('Supabase devolvió un informe incompleto, repetido o perteneciente a otra tarjeta.');
   seen.add(row.id);
   // No transferir archivos, datos editables ni propiedades arbitrarias
   // mediante un resumen de la RPC hys242_consultar_informes.
   const result={};
   for(const key of KEYS)if(Object.hasOwn(row,key)){
    const value=row[key];
    if(value!=null&&typeof value==='object')
     throw Error('La consulta devolvió metadatos no compatibles.');
    result[key]=value;
   }
   return result;
  });
 }
 function canEditArchived(entry,canWriteCentral){
  // Una consulta remota nunca se interpreta como autorización a editar
  // un informe compartido mientras las escrituras centrales están apagadas.
  return !!entry?.hasReportData&&!(entry.remote===true&&canWriteCentral!==true);
 }
 const api=Object.freeze({validatePage,canEditArchived});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.Hys299ReadPolicy=api;
})(typeof window==='object'?window:globalThis);
