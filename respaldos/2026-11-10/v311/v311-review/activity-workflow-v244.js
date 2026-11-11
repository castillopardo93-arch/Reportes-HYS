/* Reportes HYS v244 — bloque D02-D06: actividades APR.
 * Contrato estable: actividades e inspecciones [0..3], fotos en [4],
 * nuevo metadato independiente en [5]. No conecta usuarios ni envía avisos.
 * El directorio real exige proveedor aislado; nunca simular permisos del servidor.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES=new Set(['informative','assigned']);
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[ch]));
const asId=x=>typeof x==='string'&&UUID.test(x)?x.toLowerCase():'';
const plain=x=>String(x??'').trim();
function dateOK(x){
 if(!x)return true;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
 const d=new Date(x+'T12:00:00Z');
 return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===x;
}
function findingChoices(records){
 if(!Array.isArray(records))return [];
 return records.map((r,i)=>({id:asId(r?.[6]?.findingId),number:i+1,label:plain(r?.[0]).slice(0,100)})).filter(x=>x.id);
}
function snapshot(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const user_id=asId(input.user_id);
 const nombre=plain(input.nombre).slice(0,160);
 if(!user_id||!nombre||input.modulo!=='APR')return null;
 return {user_id,nombre,modulo:'APR'};
}
function normalize(record){
 const old=record?.[5];
 if(old===undefined||old===null)return {};
 if(!old||typeof old!=='object'||Array.isArray(old))throw Error('Los metadatos de la actividad requieren revisión antes de editar.');
 return {...old};
}
function validate(meta,kind,findings){
 if(!['activities','inspections'].includes(kind)||!meta||typeof meta!=='object'||Array.isArray(meta))
  throw Error('Tipo de actividad incorrecto.');
 if(!asId(meta.activityId))throw Error('Falta el identificador estable de la actividad.');
 if(!TYPES.has(meta.activityType))throw Error('Elige si es informativa o una tarea asignada.');
 if(!dateOK(meta.dueDate||''))throw Error('La fecha compromiso no es válida.');
 if(meta.activityType==='assigned'&&!meta.dueDate)throw Error('Una tarea asignada necesita fecha compromiso.');
 if(meta.identity!==null&&meta.identity!==undefined&&!snapshot(meta.identity))
  throw Error('La cuenta vinculada no tiene un identificador de APR válido.');
 if(meta.linkedFindingId){
  const choices=findingChoices(findings);
  if(!choices.some(x=>x.id===asId(meta.linkedFindingId)))
   throw Error('El hallazgo vinculado no existe en este informe; revísalo o desvincúlalo.');
 }
 return meta;
}
function formatFields(record,kind,findings){
 if(!['activities','inspections'].includes(kind))return [];
 let m;try{m=normalize(record)}catch{return [{label:'Seguimiento',value:'Datos de actividad por revisar'}];}
 const out=[];
 if(m.activityType)out.push({label:'Tipo de actividad',value:m.activityType==='assigned'?'Tarea asignada (planificación)':'Informativa'});
 const identity=snapshot(m.identity);
 if(identity)out.push({label:kind==='activities'?'Ejecutor vinculado':'Responsable vinculado',value:identity.nombre});
 if(m.dueDate)out.push({label:'Fecha compromiso',value:m.dueDate});
 if(m.linkedFindingId){
  const found=findingChoices(findings).find(x=>x.id===asId(m.linkedFindingId));
  out.push({label:'Hallazgo relacionado',value:found?'N.º '+found.number+' — '+found.label:'Vínculo histórico sin hallazgo disponible'});
 }
 return out;
}
function detailRow(record,kind,colspan=6,findings=[]){
 const fields=formatFields(record,kind,findings);
 if(!fields.length)return '';
 const items=fields.map(f=>'<span><strong>'+esc(f.label)+': </strong>'+esc(f.value)+'</span>').join('');
 const note=record?.[5]?.activityType==='assigned'?'<small>Planificación local; ejecución, verificación y notificaciones requieren servidor autorizado.</small>':'';
 return '<tr class="hys244-activity-extra"><td colspan="'+Math.max(1,Math.min(20,Number(colspan)||6))+'"><div class="hys244-activity-summary">'+items+note+'</div></td></tr>';
}
let provider=null,active=null,nonce=0;
function setDirectoryProvider(fn){
 if(fn!==null&&typeof fn!=='function')throw Error('El directorio requiere una función de lectura.');
 provider=fn;
}
function enabled(){return root.HYS244_APR_DIRECTORY_ENABLED===true&&root.HYS244_APR_DIRECTORY_ISOLATED===true&&typeof provider==='function';}
function mount(host,{kind,record=[],findings=[],module='APR'}={}){
 if(!root.document||!host||module!=='APR'||!['activities','inspections'].includes(kind))throw Error('Formulario de actividad APR no disponible.');
 const previous=normalize(record),chosen=snapshot(previous.identity);
 const current=++nonce;
 const section=root.document.createElement('section');section.className='hys244-activity-editor';
 const heading=root.document.createElement('strong');heading.textContent='Planificación y seguimiento de la actividad';
 const hint=root.document.createElement('p');hint.textContent='Estos datos complementan el registro y sus fotografías. Las notificaciones y verificaciones reales quedan deshabilitadas hasta conectar el servidor.';
 const typeLabel=root.document.createElement('label');typeLabel.textContent='Clasificación';
 const type=root.document.createElement('select');type.setAttribute('aria-label','Clasificación de actividad');
 for(const [value,label] of [['informative','Actividad informativa'],['assigned','Tarea asignada con seguimiento']])type.add(new Option(label,value));
 type.value=TYPES.has(previous.activityType)?previous.activityType:'informative';typeLabel.append(type);
 const identityLabel=root.document.createElement('label');identityLabel.textContent=kind==='activities'?'Ejecutor registrado (vínculo opcional)':'Responsable registrado (vínculo opcional)';
 const identity=root.document.createElement('select');identity.setAttribute('aria-label',kind==='activities'?'Ejecutor registrado':'Responsable registrado');
 identity.add(new Option('Sin vincular cuenta registrada',''));
 if(chosen)identity.add(new Option(chosen.nombre+' (histórico)',chosen.user_id));
 identity.value=chosen?.user_id||'';identity.disabled=true;identityLabel.append(identity);
 const directoryStatus=root.document.createElement('small');
 directoryStatus.textContent='Directorio autorizado no conectado. Los nombres existentes permanecen en los campos originales.';
 const findingLabel=root.document.createElement('label');findingLabel.textContent='Hallazgo relacionado (opcional)';
 const finding=root.document.createElement('select');finding.setAttribute('aria-label','Hallazgo relacionado');
 finding.add(new Option('Sin vincular hallazgo',''));
 const available=findingChoices(findings);
 for(const one of available)finding.add(new Option('Hallazgo N.º '+one.number+' · '+one.label,one.id));
 if(previous.linkedFindingId&&!available.some(f=>f.id===asId(previous.linkedFindingId)))
  finding.add(new Option('Hallazgo anterior no disponible: desvincular antes de guardar',asId(previous.linkedFindingId)||'INVALID'));
 finding.value=asId(previous.linkedFindingId)||'';findingLabel.append(finding);
 const dateLabel=root.document.createElement('label');dateLabel.textContent='Fecha compromiso';
 const date=root.document.createElement('input');date.type='date';date.value=dateOK(previous.dueDate||'')?(previous.dueDate||''):'';
 dateLabel.append(date);
 const help=root.document.createElement('small');help.className='hys244-activity-help';
 const note=root.document.createElement('p');note.className='hys244-activity-editor-status';note.setAttribute('role','status');
 const update=()=>{
  const assigned=type.value==='assigned';
  dateLabel.hidden=!assigned;
  help.textContent=assigned?'Para tareas asignadas, indica la fecha compromiso. La cuenta registrada es opcional durante las pruebas; el envío de tareas reales estará bloqueado.':'Actividad informativa: no genera una obligación individual ni una notificación.';
 };
 type.addEventListener('change',update);
 section.append(heading,hint,typeLabel,identityLabel,directoryStatus,findingLabel,dateLabel,help,note);
 host.append(section);update();
 let directory=[],ready=false;
 if(enabled()){
  directoryStatus.textContent='Consultando directorio aislado de APR…';
  Promise.resolve().then(()=>provider('APR')).then(rows=>{
   if(nonce!==current||!section.isConnected)return;
   directory=root.Hys243Assignees?.normalizedDirectory?.(rows,'APR')||[];
   identity.replaceChildren(new Option('Sin vincular cuenta registrada',''));
   for(const item of directory)identity.add(new Option(item.nombre,item.user_id));
   if(chosen&&!directory.some(d=>d.user_id===chosen.user_id))identity.add(new Option(chosen.nombre+' (histórico)',chosen.user_id));
   identity.value=chosen?.user_id||'';ready=true;identity.disabled=false;
   directoryStatus.textContent='Usuarios de APR disponibles: '+directory.length+' · Selección solo para esta copia de desarrollo.';
  }).catch(()=>{
   if(nonce!==current||!section.isConnected)return;
   directoryStatus.textContent='No se pudo cargar el directorio. Se conserva el responsable histórico; no se permite vincular otro usuario.';
  });
 }
 active={section,kind,module,previous,type,identity,finding,date,findings,chosen,getDirectory:()=>directory,isReady:()=>ready,note};
 return section;
}
function read({kind,record,findings,module='APR'}={}){
 const a=active;
 if(!a||!a.section.isConnected||a.kind!==kind||module!=='APR')throw Error('El formulario de planificación no está disponible.');
 const prior=normalize(record);
 const activityId=asId(prior.activityId)||asId(root.crypto?.randomUUID?.());
 if(!activityId)throw Error('No se pudo crear el identificador único de la actividad.');
 const selected=asId(a.identity.value);
 let identity=null;
 if(selected){
  if(a.chosen?.user_id===selected)identity=a.chosen;
  else{
   if(!a.isReady())throw Error('No es posible vincular un usuario sin consultar el directorio autorizado.');
   identity=a.getDirectory().find(x=>x.user_id===selected)||null;
   if(!identity)throw Error('El usuario elegido ya no está disponible para APR.');
  }
 }
 const meta={...prior,activityId,activityType:a.type.value,identity,linkedFindingId:asId(a.finding.value)||null,dueDate:a.type.value==='assigned'?a.date.value:''};
 return validate(meta,kind,findings);
}
const api={reset(){nonce++;active=null;},setDirectoryProvider,enabled,findingChoices,snapshot,normalize,validate,formatFields,detailRow,mount,read,dateOK};
root.Hys244Activity=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
