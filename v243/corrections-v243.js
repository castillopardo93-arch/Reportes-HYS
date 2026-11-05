/* C07 — Propuestas de corrección y cierre por responsable asignado.
 * FAIL CLOSED. Ninguna petición se envía si no hay un backend aislado y autorizado.
 * El navegador NO confirma permisos ni escribe cierres: siempre debe validarlos el servidor.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS=['correct','close'];
const MAX_IMAGE_BYTES=8*1024*1024,MAX_TOTAL_BYTES=24*1024*1024,MAX_FILES=8;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeId=v=>typeof v==='string'&&UUID.test(v);
let provider=null,contextProvider=null,installed=false;
function ensureFindingId(existing){
 if(safeId(existing))return existing.toLowerCase();
 const id=root.crypto?.randomUUID?.();
 if(!safeId(id))throw Error('No se pudo generar un identificador seguro para el hallazgo.');
 return id.toLowerCase();
}
function assignments(record,module){
 const list=record?.[6]?.assignees;
 return Array.isArray(list)?list.filter(item=>safeId(item?.user_id)&&item?.modulo===module):[];
}
function eligible(record,context){
 if(!Array.isArray(record)||!context||!['APR','OTROS'].includes(context.module)||!safeId(context.actorId))return false;
 if(context.canWrite!==true||context.profile?.activo!==true)return false;
 return assignments(record,context.module).some(item=>item.user_id.toLowerCase()===context.actorId.toLowerCase());
}
function requiredActionsComplete(record){
 const items=record?.[6]?.actions;
 if(items===undefined||items===null)return true; // En C08 el servidor deberá consultar acciones definitivas.
 if(!Array.isArray(items))return false;
 return items.every(item=>item&&item.required===false||item?.status==='completed'||item?.status==='verified');
}
function mayRequestClose(record,context){
 return eligible(record,context)&&assignments(record,context.module).length===1&&requiredActionsComplete(record)&&record?.[6]?.closure?.status!=='closed';
}
function validateEvidence(files){
 const list=Array.from(files||[]);
 if(list.length<1||list.length>MAX_FILES)throw Error('Adjunta entre 1 y 8 fotografías de evidencia.');
 let total=0;
 for(const file of list){
  const type=String(file?.type||'');
  if(!['image/jpeg','image/png','image/webp'].includes(type))throw Error('Solo se aceptan fotografías JPG, PNG o WebP.');
  if(!Number.isFinite(file.size)||file.size<=0||file.size>MAX_IMAGE_BYTES)throw Error('Una fotografía supera el máximo de 8 MB o está vacía.');
  total+=file.size;
 }
 if(total>MAX_TOTAL_BYTES)throw Error('Las fotografías superan el límite total de 24 MB.');
 return list;
}
function validateRequest({record,context,action,comment,files}){
 if(!ACTIONS.includes(action))throw Error('Acción desconocida.');
 if(!safeId(record?.[6]?.findingId))throw Error('El hallazgo aún no tiene identificador persistente.');
 if(!eligible(record,context))throw Error('La persona no está autorizada para este hallazgo.');
 if(action==='close'&&!mayRequestClose(record,context))throw Error('Cierre no permitido: revisa responsables y acciones obligatorias.');
 const text=String(comment??'').trim();
 if(text.length<15||text.length>2000)throw Error('Describe la corrección con 15 a 2000 caracteres.');
 const images=validateEvidence(files);
 if(typeof context.reportId!=='string'||!context.reportId.trim())throw Error('Guarda primero el informe para obtener su identificador.');
 return {description:text,files:images};
}
function setProvider(value){
 if(value!==null&&(!value||typeof value.submit!=='function'||typeof value.reload!=='function'))throw Error('El proveedor debe implementar submit y reload, o ser null.');
 provider=value;
}
function setContextProvider(value){
 if(value!==null&&typeof value!=='function')throw Error('El contexto debe obtenerse con una función.');
 contextProvider=value;
}
function enabled(){
 return root.HYS243_ACTIONS_ENABLED===true&&root.HYS243_ACTIONS_ISOLATED===true&&
 !!provider&&typeof provider.submit==='function'&&typeof provider.reload==='function';
}
function context(){try{return contextProvider?.()||null}catch{return null}}
function panel(record,index){
 if(!Array.isArray(record)||!Number.isInteger(index)||index<0)return '';
 const ctx=context();
 const available=enabled()&&eligible(record,ctx)&&safeId(record?.[6]?.findingId)&&Boolean(ctx?.reportId);
 const canClose=available&&mayRequestClose(record,ctx);
 const reason=!enabled()?'Acciones deshabilitadas: falta un servidor de pruebas aislado con permisos y auditoría verificados.':
  !eligible(record,ctx)?'Acciones no habilitadas para este usuario: requiere asignación vigente y permiso de edición.':
  !safeId(record?.[6]?.findingId)?'Guarda primero el hallazgo para asignarle un identificador único.':
  !ctx?.reportId?'Guarda primero el informe.':'El servidor volverá a comprobar el permiso al recibir la solicitud.';
 const disabled=available?'':' disabled';
 const closeDisabled=canClose?'':' disabled';
 return '<section class="hys243-correction-box">'+
  '<h4>Corrección y cierre · C07</h4><p class="hys243-correction-status">'+esc(reason)+'</p>'+
  '<form data-hys243-correction-form="'+index+'" data-finding-id="'+esc(record?.[6]?.findingId||'')+'">'+
  '<label>Descripción de la corrección<textarea name="description" rows="3" minlength="15" maxlength="2000" required'+disabled+' placeholder="Explica qué se corrigió y cómo se verificó."></textarea></label>'+
  '<label>Fotografías de evidencia (JPG, PNG o WebP; máximo 8)<input type="file" name="evidence" accept="image/jpeg,image/png,image/webp" multiple required'+disabled+'></label>'+
  '<div class="hys243-correction-buttons">'+
  '<button type="submit" name="action" value="correct"'+disabled+'>Registrar corrección</button>'+
  '<button type="submit" name="action" value="close"'+closeDisabled+'>Cerrar hallazgo</button>'+
  '</div><p class="hys243-correction-result" role="status" aria-live="polite"></p></form>'+
  '<small>El cierre no altera datos hasta recibir una respuesta y recargar el estado verificado del servidor. Para varios responsables, C08 definirá acciones obligatorias por persona.</small>'+
 '</section>';
}
async function onSubmit(event){
 const form=event.target?.closest?.('[data-hys243-correction-form]');
 if(!form)return;
 event.preventDefault();
 const button=event.submitter;
 const action=button?.value;
 const result=form.querySelector('.hys243-correction-result');
 const say=message=>{if(result)result.textContent=message};
 if(!enabled()){say('No se envió nada: servidor aislado no disponible.');return;}
 const ctx=context(),index=Number(form.dataset.hys243CorrectionForm);
 const record=ctx?.records?.[index];
 if(!Number.isInteger(index)||index<0||!record||record?.[6]?.findingId!==form.dataset.findingId){
  say('El hallazgo cambió de posición o de identidad. Recarga el informe.');return;
 }
 const input=form.querySelector('[name="evidence"]');
 const comment=form.querySelector('[name="description"]')?.value||'';
 let checked;
 try{checked=validateRequest({record,context:ctx,action,comment,files:input?.files});}
 catch(error){say(error.message||'Datos de corrección inválidos.');return;}
 const buttons=[...form.querySelectorAll('button[type="submit"]')];
 buttons.forEach(item=>{item.disabled=true});
 let succeeded=false;
 try{
  let id=form.dataset.idempotencyKey;
  if(form.dataset.pendingAction!==action){id='';form.dataset.pendingAction=action;}
  if(!safeId(id)){id=ensureFindingId(null);form.dataset.idempotencyKey=id;}
  const request={module:ctx.module,reportId:ctx.reportId,findingId:record[6].findingId,
    action,description:checked.description,expectedRevision:Number.isInteger(record[6]?.revision)?record[6].revision:null,
    idempotencyKey:id};
  // Los archivos se entregan al proveedor de staging por separado: el backend controla el almacenamiento.
  const receipt=await provider.submit(request,checked.files);
  if(!receipt||receipt.stored!==true||receipt.verified!==true||!safeId(receipt.eventId)||
      receipt.findingId!==record[6].findingId||receipt.action!==action||receipt.reportId!==ctx.reportId||
      !Number.isInteger(receipt.revision)||receipt.revision<1||
      (Number.isInteger(record[6]?.revision)&&receipt.revision<=record[6].revision))
   throw Error('El servidor no confirmó una operación verificable.');
  const reloaded=await provider.reload({module:ctx.module,reportId:ctx.reportId,findingId:record[6].findingId});
  if(!reloaded||reloaded.verified!==true||reloaded.findingId!==record[6].findingId||
      reloaded.reportId!==ctx.reportId||reloaded.eventId!==receipt.eventId||
      reloaded.action!==action||reloaded.revision!==receipt.revision)
   throw Error('Operación recibida, pero aún no fue posible verificar el estado actualizado. No repitas la solicitud sin consultar el historial.');
  succeeded=true;
  form.dataset.idempotencyKey='';
  say(action==='close'?'Cierre confirmado por servidor. Actualiza el informe para visualizarlo.':'Corrección confirmada por servidor. Actualiza el informe para visualizarla.');
 }catch(error){
  say(String(error?.message||'Error al registrar la solicitud. Revisa el historial antes de reintentar.'));
 }finally{
  // Una operación confirmada requiere refrescar la vista; la interfaz no altera el estado por su cuenta.
  if(!succeeded)buttons.forEach(item=>{item.disabled=!enabled()||(item.value==='close'&&!mayRequestClose(record,ctx));});
 }
}
if(root.document&&!installed){root.document.addEventListener('submit',onSubmit);installed=true;}
const api={ensureFindingId,eligible,requiredActionsComplete,mayRequestClose,validateEvidence,validateRequest,setProvider,setContextProvider,enabled,panel,onSubmit};
root.Hys243Corrections=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
