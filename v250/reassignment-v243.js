/* C08/C09 — reasignación por salida/ausencia/traslado.
 * No escribe acciones, estado, usuarios ni historial en el navegador.
 * Requiere backend aislado que valide ámbito, firma de identidad y auditoría.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLES=new Set(['supervisor','administrador_area','administrador_global']);
const REASONS={renuncia:'Renuncia',desvinculacion:'Desvinculación',traslado:'Traslado de área o proyecto',ausencia:'Ausencia prolongada',otro:'Otro motivo documentado'};
const STATES=new Set(['pending','in_progress','rejected']);
const uuid=v=>typeof v==='string'&&UUID.test(v);
const canon=v=>typeof v==='string'?v.toLowerCase():'';
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let provider=null,contextProvider=null;
const context=()=>{try{return contextProvider?.()||root.Hys243Actions?.context?.()||null}catch{return null}};
function canManage(ctx){
 return !!ctx&&uuid(ctx.actorId)&&ctx.profile?.activo===true&&ctx.canWrite===true&&
 ['APR','OTROS'].includes(ctx.module)&&ROLES.has(ctx.profile?.rol);
}
function eligibleAction(record,actionId){
 if(!uuid(record?.[6]?.findingId)||!Array.isArray(record?.[6]?.actions))return null;
 const item=record[6].actions.find(x=>canon(x?.actionId)===canon(actionId));
 return item&&uuid(item.actionId)&&uuid(item.assigneeId)&&STATES.has(item.status)?item:null;
}
function normalizeCandidates(data,ctx,oldUserId){
 if(!Array.isArray(data)||!ctx||!['APR','OTROS'].includes(ctx.module))return [];
 const map=new Map();
 for(const item of data){
  const id=canon(item?.usuario_id??item?.user_id);
  const name=String(item?.nombre??item?.name??'').trim().slice(0,160);
  if(!uuid(id)||!name||id===canon(oldUserId)||item?.modulo!==ctx.module||item?.activo!==true||item?.puede_ver!==true)continue;
  if(!map.has(id))map.set(id,{user_id:id,nombre:name,modulo:ctx.module});
  if(map.size>=200)break;
 }
 return [...map.values()].sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
}
function validateRequest({record,actionId,context:ctx,newAssignee,reason,note,candidates}){
 if(!canManage(ctx))throw Error('No cuentas con un rol autorizado para reasignar en este ámbito.');
 const action=eligibleAction(record,actionId);
 if(!action)throw Error('Solo se pueden reasignar tareas pendientes, en proceso o devueltas.');
 if(!uuid(record?.[6]?.findingId)||typeof ctx.reportId!=='string'||!ctx.reportId.trim())
  throw Error('Guarda primero el informe y confirma el ID del hallazgo.');
 if(!Number.isInteger(record[6].revision)||record[6].revision<0)
  throw Error('No existe una revisión del servidor para evitar reasignaciones simultáneas.');
 const id=canon(newAssignee);
 if(!uuid(id)||id===canon(action.assigneeId)||!Array.isArray(candidates)||!candidates.some(x=>canon(x.user_id)===id))
  throw Error('Selecciona un reemplazo activo y autorizado, distinto del responsable actual.');
 if(!Object.hasOwn(REASONS,reason))throw Error('Selecciona el motivo de la reasignación.');
 const explanation=String(note??'').trim();
 if(explanation.length<20||explanation.length>1000)
  throw Error('Registra una justificación de entre 20 y 1000 caracteres.');
 return {module:ctx.module,reportId:ctx.reportId,findingId:record[6].findingId,actionId:action.actionId,
  oldAssigneeId:canon(action.assigneeId),newAssigneeId:id,reason,notes:explanation,
  expectedRevision:record[6].revision};
}
function setProvider(next){
 if(next!==null&&(!next||typeof next.listCandidates!=='function'||typeof next.submit!=='function'||typeof next.reload!=='function'))
  throw Error('Proveedor incompleto: se requiere listar candidatos, reasignar y releer.');
 provider=next;
}
function setContextProvider(next){
 if(next!==null&&typeof next!=='function')throw Error('El contexto debe ser una función.');
 contextProvider=next;
}
function enabled(){
 return root.HYS243_REASSIGNMENT_ENABLED===true&&root.HYS243_REASSIGNMENT_ISOLATED===true&&
 !!provider&&typeof provider.listCandidates==='function'&&typeof provider.submit==='function'&&typeof provider.reload==='function';
}
function panel(record){
 const actions=record?.[6]?.actions;
 if(!Array.isArray(actions)||!actions.length)return '';
 const ctx=context(),authorized=canManage(ctx),on=enabled()&&authorized;
 let html='<section class="hys243-reassign"><h4>Continuidad de obligaciones · Reasignación</h4>'+
 '<p>Renuncia, desvinculación, traslado o ausencia prolongada: el responsable original permanece en el historial. Ninguna tarea se marca cumplida automáticamente.</p>';
 if(!enabled())html+='<p class="hys243-reassign-notice">Reasignación no disponible hasta habilitar un servidor aislado con autorización y auditoría.</p>';
 else if(!authorized)html+='<p class="hys243-reassign-notice">Solo supervisores o administradores autorizados del ámbito pueden solicitar una reasignación.</p>';
 const eligible=actions.filter(x=>eligibleAction(record,x?.actionId));
 if(!eligible.length)return html+'<p>Este hallazgo no tiene tareas pendientes reasignables.</p></section>';
 for(const action of eligible){
  const canLoad=on&&Number.isInteger(record?.[6]?.revision)&&record[6].revision>=0;
  const disabled=canLoad?'':' disabled';
  const opt=Object.entries(REASONS).map(([key,label])=>'<option value="'+key+'">'+esc(label)+'</option>').join('');
  html+='<div class="hys243-reassign-item"><strong>'+esc(action.assigneeName||'Responsable anterior')+
   '</strong><p>'+esc(action.description||'Acción pendiente')+'</p>'+
   '<form data-hys243-reassign="'+esc(action.actionId)+'" data-finding-id="'+esc(record[6].findingId)+'">'+
   '<label>Nuevo responsable autorizado<select name="newAssignee" disabled><option value="">Consultar reemplazos autorizados</option></select></label>'+
   '<button type="button" data-hys243-load-candidates'+disabled+'>Consultar reemplazos</button>'+
   '<label>Motivo<select name="reason"'+disabled+'><option value="">Seleccione...</option>'+opt+'</select></label>'+
   '<label>Justificación de la reasignación<textarea name="notes" minlength="20" maxlength="1000" rows="2" required'+disabled+'></textarea></label>'+
   '<button type="submit" disabled>Solicitar reasignación</button>'+
   '<p class="hys243-reassign-result" role="status" aria-live="polite"></p></form></div>';
 }
 return html+'<small>Solo el servidor puede transferir la tarea, conservar responsable original, registrar fecha/hora y validar permisos de ambas personas.</small></section>';
}
async function onClick(event){
 const button=event.target?.closest?.('[data-hys243-load-candidates]');
 if(!button)return;
 const form=button.closest?.('[data-hys243-reassign]');
 if(!form)return;
 const status=form.querySelector('.hys243-reassign-result');
 const say=x=>{if(status)status.textContent=x};
 const ctx=context();
 if(!enabled()||!canManage(ctx)){say('No autorizado o falta un servidor aislado.');return;}
 const record=ctx?.records?.find?.(r=>r?.[6]?.findingId===form.dataset.findingId);
 const action=eligibleAction(record,form.dataset.hys243Reassign);
 if(!action||!Number.isInteger(record?.[6]?.revision)){say('Tarea desactualizada. Recarga el informe.');return;}
 button.disabled=true;say('Consultando candidatos elegibles del ámbito…');
 try{
  const data=await provider.listCandidates({module:ctx.module,reportId:ctx.reportId,
    findingId:record[6].findingId,actionId:action.actionId,expectedRevision:record[6].revision});
  const freshCtx=context();
  if(freshCtx?.actorId!==ctx.actorId||freshCtx?.module!==ctx.module||freshCtx?.reportId!==ctx.reportId||
     !canManage(freshCtx)||freshCtx?.records?.find?.(r=>r?.[6]?.findingId===record[6].findingId)?.[6]?.revision!==record[6].revision)
   throw Error('Cambió la sesión o el informe durante la consulta. Recarga antes de continuar.');
  const candidates=normalizeCandidates(data,ctx,action.assigneeId);
  form._hys243Candidates=candidates;
  const select=form.querySelector('[name="newAssignee"]');
  select.replaceChildren();
  const empty=root.document.createElement('option');empty.value='';empty.textContent='Seleccione un reemplazo';select.append(empty);
  for(const candidate of candidates){
   const option=root.document.createElement('option');option.value=candidate.user_id;option.textContent=candidate.nombre;select.append(option);
  }
  select.disabled=!candidates.length;
  const submit=form.querySelector('button[type="submit"]');
  if(submit)submit.disabled=!candidates.length;
  say(candidates.length?'Candidatos autorizados consultados. Debes justificar el cambio.':'No hay reemplazos elegibles en el ámbito de este hallazgo.');
 }catch(error){
  form._hys243Candidates=[];
  say(String(error?.message||'No se pudo consultar el directorio de reemplazos.'));
 }finally{button.disabled=false;}
}
async function onSubmit(event){
 const form=event.target?.closest?.('[data-hys243-reassign]');
 if(!form)return;
 event.preventDefault();
 const status=form.querySelector('.hys243-reassign-result');
 const say=x=>{if(status)status.textContent=x};
 const ctx=context();
 if(!enabled()||!canManage(ctx)){say('No autorizado o servidor de pruebas no disponible. No se reasignó ninguna tarea.');return;}
 const record=ctx?.records?.find?.(r=>r?.[6]?.findingId===form.dataset.findingId);
 let request;
 try{
  request=validateRequest({record,actionId:form.dataset.hys243Reassign,context:ctx,
   newAssignee:form.querySelector('[name="newAssignee"]')?.value,
   reason:form.querySelector('[name="reason"]')?.value,
   note:form.querySelector('[name="notes"]')?.value,
   candidates:form._hys243Candidates});
 }catch(error){say(String(error.message||'Solicitud de reasignación inválida.'));return;}
 const button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
 try{
  let key=form.dataset.idempotencyKey;
  if(!uuid(key)){key=root.crypto?.randomUUID?.();if(!uuid(key))throw Error('No se pudo crear una solicitud única.');form.dataset.idempotencyKey=key;}
  const current=context();
  if(current?.actorId!==ctx.actorId||current?.module!==ctx.module||current?.reportId!==ctx.reportId||!canManage(current))
   throw Error('La sesión o el ámbito cambiaron. No se envió la reasignación.');
  const receipt=await provider.submit({...request,idempotencyKey:key});
  if(!receipt||receipt.stored!==true||receipt.verified!==true||!uuid(receipt.eventId)||
   receipt.reportId!==request.reportId||receipt.findingId!==request.findingId||
   receipt.actionId!==request.actionId||canon(receipt.oldAssigneeId)!==request.oldAssigneeId||
   canon(receipt.newAssigneeId)!==request.newAssigneeId||
   !Number.isInteger(receipt.revision)||receipt.revision<=request.expectedRevision)
    throw Error('El servidor no confirmó una reasignación auditable.');
  const state=await provider.reload({module:request.module,reportId:request.reportId,findingId:request.findingId,actionId:request.actionId});
  if(!state||state.verified!==true||state.reportId!==request.reportId||
   state.findingId!==request.findingId||state.actionId!==request.actionId||
   canon(state.assigneeId)!==request.newAssigneeId||
   state.eventId!==receipt.eventId||state.revision!==receipt.revision||
   state.auditRecorded!==true)
    throw Error('El cambio pudo recibirse, pero no se verificó su auditoría. Consulta el historial antes de reintentar.');
  form.dataset.idempotencyKey='';
  say('Reasignación confirmada con auditoría. Recarga el informe para ver las obligaciones actualizadas.');
 }catch(error){say(String(error.message||'No se confirmó la reasignación. Consulta el historial antes de reintentar.'));}
 // Nunca se cambian responsable, estados, evidencia o historial de forma local.
}
if(root.document){root.document.addEventListener('click',onClick);root.document.addEventListener('submit',onSubmit);}
const api={canManage,eligibleAction,normalizeCandidates,validateRequest,setProvider,setContextProvider,enabled,panel,onClick,onSubmit,reasons:{...REASONS}};
root.Hys243Reassignment=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
