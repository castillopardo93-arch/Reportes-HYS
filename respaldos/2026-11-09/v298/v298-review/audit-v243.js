/* C09 — Auditoría verificable, cierre formal y reapertura.
 * Todos los actos son REMOTOS y están BLOQUEADOS por defecto. El cliente no altera estados.
 * El registro auditado solo se muestra tras una lectura autorizada, verificada y consistente.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES=new Set(['created','updated','assigned','reassigned','submitted','verified','rejected','closed','reopened','evidence_added','commented']);
const OPERATION=new Set(['close','reopen']);
const ADMIN=new Set(['supervisor','administrador_area','administrador_global']);
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const uuid=v=>typeof v==='string'&&UUID.test(v);
const low=v=>typeof v==='string'?v.toLowerCase():'';
const actorContext=()=>{try{return contextProvider?.()||root.Hys243Actions?.context?.()||null}catch{return null}};
const labels={created:'Creación',updated:'Edición',assigned:'Asignación',reassigned:'Reasignación',submitted:'Ejecución presentada',verified:'Verificación',rejected:'Corrección devuelta',closed:'Cierre formal',reopened:'Reapertura',evidence_added:'Evidencia añadida',commented:'Observación'};
let provider=null,contextProvider=null;
function canRead(ctx){
 return !!(ctx&&uuid(ctx.actorId)&&ctx.profile?.activo===true&&ctx.canWrite===true&&['APR','OTROS'].includes(ctx.module)&&typeof ctx.reportId==='string'&&ctx.reportId.trim());
}
function canManage(ctx){
 return canRead(ctx)&&ADMIN.has(ctx.profile.rol);
}
function verifiedTasks(record){
 const actions=record?.[6]?.actions;
 if(!Array.isArray(actions)||!actions.length||!root.Hys243Actions?.allRequiredVerified?.(record))return false;
 if(!actions.some(a=>a.required===true))return false;
 const verifierIsIndependent=actions.filter(a=>a.required===true).every(a=>
  root.Hys243Actions.verified(a) && low(a.verifiedBy)!==low(a.assigneeId));
 return verifierIsIndependent;
}
function canRequestClose(record,ctx){
 return canManage(ctx)&&uuid(record?.[6]?.findingId)&&Number.isInteger(record?.[6]?.revision)&&record[6].revision>=0&&
 record?.[6]?.closure?.status!=='closed'&&verifiedTasks(record);
}
function canRequestReopen(record,ctx){
 return canManage(ctx)&&uuid(record?.[6]?.findingId)&&Number.isInteger(record?.[6]?.revision)&&record[6].revision>=0&&
 record?.[6]?.closure?.status==='closed'&&uuid(record[6].closure.eventId);
}
function validateRequest({record,context:ctx,operation,reason}){
 if(!OPERATION.has(operation))throw Error('Operación de cierre no reconocida.');
 if(!canManage(ctx))throw Error('No tienes autorización para gestionar cierres de este ámbito.');
 if(!uuid(record?.[6]?.findingId)||!Number.isInteger(record?.[6]?.revision)||record[6].revision<0)
  throw Error('Este hallazgo no tiene identificador y revisión del servidor.');
 if(operation==='close'&&!canRequestClose(record,ctx))
  throw Error('Cierre bloqueado: faltan verificaciones independientes o acciones obligatorias.');
 if(operation==='reopen'&&!canRequestReopen(record,ctx))
  throw Error('Reapertura bloqueada: el cierre anterior no está confirmado por evento.');
 const explanation=typeof reason==='string'?reason.trim():'';
 if(explanation.length<20||explanation.length>1500)throw Error('Justifica la operación con 20 a 1500 caracteres.');
 return {module:ctx.module,reportId:ctx.reportId,findingId:record[6].findingId,
  operation,reason:explanation,expectedRevision:record[6].revision,
  previousClosureEventId:operation==='reopen'?record[6].closure.eventId:null};
}
function validateEventLog(envelope,expected){
 if(!envelope||envelope.verified!==true||envelope.source!=='server'||
    envelope.reportId!==expected?.reportId||envelope.findingId!==expected?.findingId||
    (expected?.module&&envelope.module!==expected.module)||
    !Number.isInteger(envelope.revision)||envelope.revision<0||!Array.isArray(envelope.events)||
    envelope.events.length>5000)throw Error('No existe una respuesta verificable de auditoría.');
 const used=new Set(),events=[];let last=null,revision=-1;
 for(const raw of envelope.events){
  if(!raw||!uuid(raw.eventId)||raw.reportId!==expected.reportId||
     raw.findingId!==expected.findingId||(expected?.module&&raw.module!==expected.module)||!TYPES.has(raw.eventType)||!uuid(raw.actorId)||
     typeof raw.actorName!=='string'||!raw.actorName.trim()||
     typeof raw.actorRole!=='string'||!raw.actorRole.trim()||
     (raw.evidenceIds!==undefined&&(!Array.isArray(raw.evidenceIds)||!raw.evidenceIds.every(uuid)))||
     !Number.isInteger(raw.revision)||
     raw.revision<=revision||raw.revision>envelope.revision||
     typeof raw.occurredAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(raw.occurredAt)||
     !Number.isFinite(Date.parse(raw.occurredAt))||used.has(low(raw.eventId))||
     (last!==null&&low(raw.previousEventId)!==low(last.eventId))||
     (last===null&&raw.previousEventId!==null))
   throw Error('La cadena de eventos de auditoría es incompleta o inconsistente.');
  used.add(low(raw.eventId));
  const item=Object.freeze({eventId:low(raw.eventId),eventType:raw.eventType,actorId:low(raw.actorId),
   actorName:raw.actorName.trim().slice(0,160),actorRole:String(raw.actorRole||'').slice(0,60),
   occurredAt:raw.occurredAt,revision:raw.revision,reason:String(raw.reason||'').slice(0,1500),
   previousEventId:raw.previousEventId?low(raw.previousEventId):null,
   oldAssigneeName:String(raw.oldAssigneeName||'').slice(0,160),
   newAssigneeName:String(raw.newAssigneeName||'').slice(0,160),
   evidenceIds:Object.freeze((raw.evidenceIds||[]).map(low)),
   beforeState:String(raw.beforeState||'').slice(0,100),afterState:String(raw.afterState||'').slice(0,100)});
  events.push(item);revision=item.revision;last=item;
 }
 if(envelope.events.length&&envelope.lastEventId!==last.eventId)
  throw Error('El último evento no coincide con la revisión recibida.');
 if(!envelope.events.length&&envelope.lastEventId!==null)
  throw Error('El servidor informó eventos inexistentes.');
 return Object.freeze(events);
}
function eventMarkup(events){
 if(!Array.isArray(events)||!events.length)return '<p>No hay eventos auditados disponibles en esta consulta.</p>';
 let out='<ol class="hys243-audit-log">';
 for(const item of events){
  const transfer=item.eventType==='reassigned'?' · De '+item.oldAssigneeName+' a '+item.newAssigneeName:'';
  out+='<li><strong>'+esc(labels[item.eventType]||item.eventType)+'</strong>'+
   ' <time datetime="'+esc(item.occurredAt)+'">'+esc(item.occurredAt)+'</time>'+
   '<p>'+esc(item.actorName)+' · '+esc(item.actorRole)+' · revisión '+item.revision+'</p>'+
   (transfer?'<p>'+esc(transfer.trim())+'</p>':'')+
   (item.reason?'<p>Motivo: '+esc(item.reason)+'</p>':'')+
   (item.beforeState||item.afterState?'<p>Estado: '+esc(item.beforeState||'—')+' → '+esc(item.afterState||'—')+'</p>':'')+
   (item.evidenceIds?.length?'<p>Evidencias referenciadas: '+item.evidenceIds.length+'</p>':'')+
   '<small>Evento '+esc(item.eventId)+'</small></li>';
 }
 return out+'</ol>';
}
function setProvider(next){
 if(next!==null&&(!next||typeof next.listEvents!=='function'||typeof next.submit!=='function'||typeof next.reload!=='function'))
  throw Error('El proveedor requiere listEvents, submit y reload.');
 provider=next;
}
function setContextProvider(next){
 if(next!==null&&typeof next!=='function')throw Error('El contexto debe ser una función.');
 contextProvider=next;
}
function enabled(){
 return root.HYS243_AUDIT_ENABLED===true&&root.HYS243_AUDIT_ISOLATED===true&&
 !!provider&&typeof provider.listEvents==='function'&&typeof provider.submit==='function'&&typeof provider.reload==='function';
}
function panel(record){
 if(!Array.isArray(record))return '';
 const ctx=actorContext(),viewable=enabled()&&canRead(ctx)&&uuid(record?.[6]?.findingId);
 const mayClose=viewable&&canRequestClose(record,ctx);
 const mayReopen=viewable&&canRequestReopen(record,ctx);
 const auditDisabled=viewable?'':' disabled';
 const closeDisabled=mayClose?'':' disabled';
 const reopenDisabled=mayReopen?'':' disabled';
 const status=!enabled()?'Auditoría no conectada. No se ha confirmado ningún evento de este hallazgo con el servidor.':
  !canRead(ctx)?'Tu cuenta no tiene acceso autorizado a este historial.':
  !uuid(record?.[6]?.findingId)?'Guarda el hallazgo antes de consultar su historial.':
  'El historial se consulta desde un servicio autorizado de solo lectura.';
 return '<section class="hys243-audit-panel"><h4>Auditoría, cierre y reapertura · C09</h4>'+
  '<p class="hys243-audit-notice">'+esc(status)+'</p>'+
  '<button type="button" data-hys243-audit-load="'+esc(record?.[6]?.findingId||'')+'"'+auditDisabled+'>Consultar historial auditado</button>'+
  '<div class="hys243-audit-events" role="region" aria-label="Eventos de auditoría"><p>No hay una consulta de auditoría verificada en esta sesión.</p></div>'+
  '<div class="hys243-audit-operations">'+
   '<form data-hys243-audit-submit="close" data-finding-id="'+esc(record?.[6]?.findingId||'')+'">'+
   '<label>Justificación de cierre formal<textarea name="reason" rows="3" minlength="20" maxlength="1500" required'+closeDisabled+'></textarea></label>'+
   '<button type="submit"'+closeDisabled+'>Solicitar cierre formal</button><p class="hys243-audit-feedback" role="status"></p></form>'+
   '<form data-hys243-audit-submit="reopen" data-finding-id="'+esc(record?.[6]?.findingId||'')+'">'+
   '<label>Motivo de reapertura<textarea name="reason" rows="3" minlength="20" maxlength="1500" required'+reopenDisabled+'></textarea></label>'+
   '<button type="submit"'+reopenDisabled+'>Solicitar reapertura</button><p class="hys243-audit-feedback" role="status"></p></form>'+
  '</div><small>El cierre requiere acciones obligatorias verificadas con evidencia y revisor independiente. La reapertura conserva el cierre previo en el historial. Ninguna acción modifica el informe local sin confirmación posterior del servidor.</small></section>';
}
async function onClick(event){
 const button=event.target?.closest?.('[data-hys243-audit-load]');if(!button)return;
 const section=button.closest?.('.hys243-audit-panel');
 const output=section?.querySelector?.('.hys243-audit-events');
 if(!output)return;
 const ctx=actorContext(),findingId=button.dataset.hys243AuditLoad;
 if(!enabled()||!canRead(ctx)||!uuid(findingId)){
  output.textContent='Consulta no autorizada o servidor aislado no disponible.';return;
 }
 const record=ctx.records?.find?.(x=>x?.[6]?.findingId===findingId);
 if(!record){output.textContent='El hallazgo ya no está presente. Recarga el informe.';return;}
 button.disabled=true;output.textContent='Consultando auditoría del servidor…';
 try{
  const envelope=await provider.listEvents({module:ctx.module,reportId:ctx.reportId,findingId});
  const freshCtx=actorContext(),fresh=freshCtx?.records?.find?.(x=>x?.[6]?.findingId===findingId);
  if(!fresh||freshCtx.actorId!==ctx.actorId||freshCtx.module!==ctx.module||
     freshCtx.reportId!==ctx.reportId||!canRead(freshCtx)||
     fresh?.[6]?.revision!==record?.[6]?.revision)throw Error('La sesión o el hallazgo cambiaron. Recarga antes de consultar.');
  const valid=validateEventLog(envelope,{module:ctx.module,reportId:ctx.reportId,findingId});
  output.innerHTML=eventMarkup(valid);
 }catch(error){output.textContent=String(error.message||'No se pudo verificar el historial.');}
 finally{button.disabled=false;}
}
async function onSubmit(event){
 const form=event.target?.closest?.('[data-hys243-audit-submit]');if(!form)return;
 event.preventDefault();
 const feedback=form.querySelector('.hys243-audit-feedback');
 const say=msg=>{if(feedback)feedback.textContent=msg};
 const ctx=actorContext(),findingId=form.dataset.findingId,operation=form.dataset.hys243AuditSubmit;
 if(!enabled()){say('No se envió nada. El servidor aislado no está disponible.');return;}
 const record=ctx?.records?.find?.(x=>x?.[6]?.findingId===findingId);
 let payload;try{
  payload=validateRequest({record,context:ctx,operation,reason:form.querySelector('[name="reason"]')?.value});
 }catch(error){say(String(error.message||'Operación no autorizada.'));return;}
 const submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
 let succeeded=false;
 try{
  const current=actorContext();
  if(!canManage(current)||current.actorId!==ctx.actorId||current.module!==ctx.module||current.reportId!==ctx.reportId)
   throw Error('La sesión cambió antes de enviar el cierre.');
  let key=form.dataset.idempotencyKey;
  if(!uuid(key)){key=root.crypto?.randomUUID?.();if(!uuid(key))throw Error('No se pudo generar una solicitud segura.');form.dataset.idempotencyKey=key;}
  const receipt=await provider.submit({...payload,idempotencyKey:key});
  const expectedStatus=operation==='close'?'closed':'reopened';
  if(!receipt||receipt.stored!==true||receipt.verified!==true||receipt.auditRecorded!==true||
     !uuid(receipt.eventId)||receipt.reportId!==payload.reportId||receipt.findingId!==payload.findingId||
     receipt.operation!==operation||receipt.closureStatus!==expectedStatus||
     !Number.isInteger(receipt.revision)||receipt.revision<=payload.expectedRevision)
   throw Error('El servidor no confirmó un cierre o reapertura auditado.');
  const state=await provider.reload({module:payload.module,reportId:payload.reportId,findingId:payload.findingId});
  if(!state||state.verified!==true||state.auditRecorded!==true||state.reportId!==payload.reportId||
     state.findingId!==payload.findingId||state.eventId!==receipt.eventId||
     state.revision!==receipt.revision||state.closureStatus!==expectedStatus)
   throw Error('La operación pudo registrarse, pero no se confirmó su estado y auditoría. Consulta el historial antes de reintentar.');
  succeeded=true;form.dataset.idempotencyKey='';
  say(operation==='close'?'Cierre formal confirmado y auditado por el servidor. Actualiza el informe.':'Reapertura confirmada y auditada por el servidor. Actualiza el informe.');
 }catch(error){say(String(error.message||'Operación no confirmada. Consulta la auditoría antes de reintentar.'));}
 finally{if(!succeeded&&submit)submit.disabled=!enabled()||!(operation==='close'?canRequestClose(record,ctx):canRequestReopen(record,ctx));}
}
if(root.document){root.document.addEventListener('click',onClick);root.document.addEventListener('submit',onSubmit);}
const api={canRead,canManage,verifiedTasks,canRequestClose,canRequestReopen,validateRequest,validateEventLog,eventMarkup,
 setProvider,setContextProvider,enabled,panel,onClick,onSubmit};
root.Hys243Audit=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
