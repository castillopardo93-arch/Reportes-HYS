/* Reportes HYS v261: modelo de seleccion y resumen, sin acceso a red ni escrituras. */
(function(root){
 'use strict';
 const MODULES=['APR','OTROS'];
 const canonical=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('es');
 const unique=a=>[...new Set((Array.isArray(a)?a:[]).filter(v=>typeof v==='string'&&v))];
 function availableAreas(rows,module,canAssign){
  return (Array.isArray(rows)?rows:[]).filter(a=>a.modulo===module&&a.activa===true&&canAssign(module,a.id));
 }
 function isAllSelected(selection,allIds){
  const ids=unique(selection),eligible=unique(allIds);
  return eligible.length>0&&ids.length===eligible.length&&eligible.every(id=>ids.includes(id));
 }
 function copyAreasByName(selectedIds,sourceRows,targetRows,canAssign,targetModule){
  const selected=new Set(unique(selectedIds));
  const names=new Set(sourceRows.filter(a=>selected.has(a.id)).map(a=>canonical(a.nombre)));
  const usable=availableAreas(targetRows,targetModule,canAssign);
  const matched=usable.filter(a=>names.has(canonical(a.nombre))).map(a=>a.id);
  const matchedNames=new Set(usable.filter(a=>matched.includes(a.id)).map(a=>canonical(a.nombre)));
  return {ids:unique(matched),notFound:[...names].filter(n=>!matchedNames.has(n))};
 }
 function summarize(access,fac,rows,labels,canAssign,areaMode){
  return MODULES.map(m=>{
   const entry=access?.[m],enabled=entry?.ver===true;
   const ids=unique(entry?.areas),eligible=availableAreas(rows,m,canAssign).map(a=>a.id);
   const capabilities=Object.entries(fac?.[m]?.facultades||{}).filter(([,v])=>v===true).map(([k])=>k);
   return {module:m,title:labels(m),enabled,areaCount:enabled?ids.length:0,all:enabled&&areaMode?.[m]==='all'&&isAllSelected(ids,eligible),edit:enabled&&entry?.editar===true,capabilities:enabled?capabilities:[]};
  });
 }
 function validateAreas(access,rows,canAssign,canEditModule){
  for(const m of MODULES){
   const a=access?.[m];if(a?.ver!==true||!canEditModule(m))continue;
   const ids=unique(a.areas);
   if(ids.length===0)return {ok:false,module:m,error:'Selecciona al menos un area para la tarjeta.'};
   for(const id of ids){
    const row=rows.find(x=>x.modulo===m&&x.id===id);
    if(!row)return {ok:false,module:m,error:'Se encontró un área que ya no existe en esta tarjeta.'};
    if(row.activa!==true)return {ok:false,module:m,error:'La selección contiene un área desactivada. Actualiza el listado antes de guardar.'};
    if(!canAssign(m,id))return {ok:false,module:m,error:'La selección contiene un área no autorizada.'};
   }
  }
  return {ok:true};
 }
 const api={MODULES,canonical,unique,availableAreas,isAllSelected,copyAreasByName,summarize,validateAreas};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.Hys261FacultyModel=api;
})(typeof window==='object'?window:globalThis);
