/* C08 — Acciones individuales por responsable.
 * Planificación estructural local; evidencias y confirmación NO habilitadas sin servidor independiente.
 * Nunca se concede estado verified desde el navegador.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES=new Set(['pending','in_progress','submitted','verified','rejected']);
const LABELS={pending:'Pendiente',in_progress:'En proceso',submitted:'Enviada a verificación',verified:'Verificada',rejected:'Devuelta'};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uuid=x=>typeof x==='string'&&UUID.test(x);
const canonical=x=>typeof x==='string'?x.toLowerCase():'';
const eligibleAssignees=items=>Array.isArray(items)?items.filter(x=>uuid(x?.user_id)&&['APR','OTROS'].includes(x?.modulo)):[];
const actionArray=record=>record?.[6]?.actions;
function validAction(a){
 return !!(a&&typeof a==='object'&&!Array.isArray(a)&&uuid(a.actionId)&&uuid(a.assigneeId)&&
 typeof a.assigneeName==='string'&&a.assigneeName.trim()&&typeof a.description==='string'&&
 a.description.trim().length>=10&&a.description.trim().length<=500&&typeof a.required==='boolean'&&STATUSES.has(a.status));
}
function verified(a){
 return validAction(a)&&a.status==='verified'&&uuid(a.verifiedBy)&&
 typeof a.verifiedAt==='string'&&!Number.isNaN(Date.parse(a.verifiedAt))&&
 Array.isArray(a.evidenceIds)&&a.evidenceIds.length>0&&a.evidenceIds.every(uuid);
}
function allRequiredVerified(record){
 const assignments=record?.[6]?.assignees||[];
 const members=Array.isArray(assignments)?assignments.filter(x=>uuid(x?.user_id)):[];
 const actions=actionArray(record);
 if(actions===undefined||actions===null)return members.length===1; // Compatibilidad con un solo responsable
 if(!Array.isArray(actions)||!actions.every(validAction))return false;
 const seen=new Set();
 for(const item of actions){
  if(seen.has(canonical(item.actionId)))return false;
  seen.add(canonical(item.actionId));
  if(!members.some(x=>canonical(x.user_id)===canonical(item.assigneeId)))return false;
 }
 if(members.length>1){
  // En equipos, cada persona necesita al menos una acción obligatoria verificada.
  for(const member of members){
   const own=actions.filter(x=>canonical(x.assigneeId)===canonical(member.user_id)&&x.required);
   if(!own.length||!own.every(verified))return false;
  }
 }
 return actions.every(a=>!a.required||verified(a));
}
function validateActionList(input,members){
 if(!Array.isArray(input))throw Error('Las acciones deben guardarse como un listado.');
 if(input.length>100)throw Error('El hallazgo supera el máximo de 100 acciones.');
 const ids=new Set(),assigned=new Set(eligibleAssignees(members).map(a=>canonical(a.user_id)));
 for(const item of input){
  if(!validAction(item))throw Error('Hay una acción con datos o estado incorrectos. Se conservará el registro anterior.');
  const id=canonical(item.actionId);
  if(ids.has(id))throw Error('Hay identificadores de acciones duplicados.');
  if(!assigned.has(canonical(item.assigneeId)))throw Error('Una acción pertenece a un responsable que no está asignado. Corrige la asignación antes de guardar.');
  ids.add(id);
 }
 return input;
}
function makeDraft({assignee,description,required=true},uuidGenerator){
 if(!uuid(assignee?.user_id)||!['APR','OTROS'].includes(assignee?.modulo)||!String(assignee?.nombre||'').trim())throw Error('Seleccione un responsable registrado para esta tarea.');
 const text=String(description??'').trim();
 if(text.length<10||text.length>500)throw Error('Describe la tarea entre 10 y 500 caracteres.');
 if(typeof required!=='boolean')throw Error('La obligatoriedad debe indicarse.');
 const id=uuidGenerator?.();
 if(!uuid(id))throw Error('No se pudo identificar la nueva tarea.');
 return {actionId:canonical(id),assigneeId:canonical(assignee.user_id),
  assigneeName:String(assignee.nombre??'').trim().slice(0,160),description:text,
  required,status:'pending'};
}
function actorMaySubmit(action,context,record){
 if(!validAction(action)||!uuid(context?.actorId)||context?.canWrite!==true||context?.profile?.activo!==true||!['APR','OTROS'].includes(context.module))return false;
 if(!uuid(record?.[6]?.findingId)||!record?.[6]?.assignees?.some?.(a=>canonical(a.user_id)===canonical(context.actorId)&&a.modulo===context.module))return false;
 return canonical(action.assigneeId)===canonical(context.actorId)&&['pending','in_progress','rejected'].includes(action.status);
}
let activeEditor=null,provider=null,contextProvider=null;
function mount(host,{existing=[],getAssignees}={}){
 if(!host||!root.document||typeof getAssignees!=='function')throw Error('Formulario de acciones no disponible.');
 if(existing!==undefined&&existing!==null&&!Array.isArray(existing))throw Error('Las acciones históricas requieren revisión: su formato no es un listado.');
 const initial=Array.isArray(existing)?existing:[];const newItems=[];
 const wrap=root.document.createElement('section');wrap.className='hys243-actions-editor';
 const title=root.document.createElement('strong');title.textContent='Acciones individuales por responsable';
 const note=root.document.createElement('p');note.textContent='Planifica tareas con responsables asignados. Las acciones nuevas se guardan como pendientes. Los estados verificados solo pueden provenir del servidor autorizado.';
 const list=root.document.createElement('div');list.className='hys243-action-list';
 const label=root.document.createElement('label');label.textContent='Responsable de la acción';
 const select=root.document.createElement('select');select.setAttribute('aria-label','Responsable de la acción');label.append(select);
 const description=root.document.createElement('textarea');description.rows=2;description.maxLength=500;description.placeholder='Descripción de la tarea individual (mínimo 10 caracteres)';description.setAttribute('aria-label','Descripción de la acción');
 const minHelp=root.document.createElement('small');minHelp.className='hys243-action-minimum';minHelp.textContent='Para añadir una acción, escribe una descripción de al menos 10 caracteres (máximo 500).';
 const requiredLabel=root.document.createElement('label');
 const required=root.document.createElement('input');required.type='checkbox';required.checked=true;requiredLabel.append(required,root.document.createTextNode(' Acción obligatoria'));
 const add=root.document.createElement('button');add.type='button';add.className='btn';add.textContent='Añadir acción pendiente';
 const status=root.document.createElement('p');status.className='hys243-action-editor-status';status.setAttribute('role','status');
 const currentMembers=()=>eligibleAssignees(getAssignees());
 const render=()=>{
  list.replaceChildren();
  const combined=[...initial,...newItems];
  if(!combined.length){const p=root.document.createElement('p');p.textContent='Aún no hay acciones individuales asignadas.';list.append(p);}
  for(const item of combined){
   const row=root.document.createElement('div');row.className='hys243-action-editor-row';
   const desc=root.document.createElement('span');
   desc.textContent=(item.assigneeName||'Sin responsable')+' · '+(item.description||'Acción sin descripción')+' · '+(LABELS[item.status]||'Estado no reconocido')+(item.required?' · Obligatoria':' · Opcional');
   row.append(desc);
   if(newItems.includes(item)){
    const remove=root.document.createElement('button');remove.type='button';remove.textContent='Quitar borrador';remove.className='btn';
    remove.addEventListener('click',()=>{const i=newItems.indexOf(item);if(i!==-1)newItems.splice(i,1);render()});
    row.append(remove);
   }
   list.append(row);
  }
 };
 const refreshAssignees=()=>{
  const current=select.value;
  select.replaceChildren();
  const empty=root.document.createElement('option');empty.value='';empty.textContent='Seleccione un responsable asignado';select.append(empty);
  const members=currentMembers();
  for(const item of members){
   const opt=root.document.createElement('option');opt.value=item.user_id;opt.textContent=item.nombre||item.user_id;select.append(opt);
  }
  if(members.some(x=>x.user_id===current))select.value=current;
  add.disabled=!members.length;
 };
 select.addEventListener('focus',refreshAssignees);
 add.addEventListener('click',()=>{
  try{
   refreshAssignees();
   const selected=currentMembers().find(item=>canonical(item.user_id)===canonical(select.value));
   if(!selected)throw Error('Selecciona el responsable antes de añadir la acción.');
   const draft=makeDraft({assignee:selected,description:description.value,required:required.checked},()=>root.crypto?.randomUUID?.());
   if(initial.length+newItems.length>=100)throw Error('Se alcanzó el máximo de 100 acciones.');
   newItems.push(draft);description.value='';status.textContent='Acción pendiente añadida al formulario. Debes guardar el hallazgo.';render();
  }catch(error){status.textContent=String(error.message||'No se pudo añadir la tarea.');}
 });
 wrap.append(title,note,list,label,description,minHelp,requiredLabel,add,status);
 host.append(wrap);refreshAssignees();render();
 activeEditor={wrap,read(members){
   if(!wrap.isConnected)throw Error('El editor de acciones ya no está abierto.');
   const combined=[...initial,...newItems];
   validateActionList(combined,members);
   return combined.map(x=>({...x})); // nunca fabricamos verified ni alteramos acciones anteriores
  }};
 return wrap;
}
function read(members){
 if(!activeEditor)throw Error('Editor de acciones no disponible.');
 return activeEditor.read(members);
}
function listMarkup(record,context){
 const raw=actionArray(record);
 if(raw!==undefined&&!Array.isArray(raw))return '<p class="hys243-action-warning">Hay acciones históricas en un formato no reconocido. Se bloquea el cierre hasta revisarlas.</p>';
 const items=Array.isArray(raw)?raw:[];
 if(!items.length)return '<p class="hys243-action-empty">No se han definido acciones individuales para este hallazgo.</p>';
 let html='<section class="hys243-action-tracker"><h4>Acciones individuales · '+items.length+'</h4><ol>';
 for(const item of items){
  const valid=validAction(item);
  const who=valid?item.assigneeName||item.assigneeId:'Responsable no validado';
  const status=valid?LABELS[item.status]:'Datos por revisar';
  const canSubmit=valid&&enabled()&&actorMaySubmit(item,context,record);
  html+='<li><div><strong>'+esc(who)+'</strong> · '+esc(status)+(valid&&item.required?' · Obligatoria':'')+'</div>'+
  '<p>'+esc(valid?item.description:'Esta acción requiere revisión de datos')+'</p>';
  if(valid&&verified(item))html+='<small>Verificada con evidencia registrada por el servidor.</small>';
  else if(valid&&item.status==='verified')html+='<small class="hys243-action-warning">Estado declarado como verificado sin metadatos suficientes. Revisar antes del cierre.</small>';
  if(valid&&['pending','in_progress','rejected'].includes(item.status)){
   html+='<form data-hys243-action-submit="'+esc(item.actionId)+'" data-finding-id="'+esc(record?.[6]?.findingId||'')+'">'+
   '<label>Informe de ejecución<textarea name="description" minlength="15" maxlength="2000" required'+(canSubmit?'':' disabled')+'></textarea></label>'+
   '<label>Evidencia fotográfica<input name="evidence" type="file" accept="image/jpeg,image/png,image/webp" multiple required'+(canSubmit?'':' disabled')+'></label>'+
   '<button type="submit"'+(canSubmit?'':' disabled')+'>Enviar tarea a verificación</button>'+
   '<p class="hys243-action-response" role="status" aria-live="polite"></p></form>';
  }
  html+='</li>';
 }
 html+='</ol><p class="hys243-action-status"><strong>Cierre global: </strong>'+
 (allRequiredVerified(record)?'Acciones obligatorias verificadas (el servidor debe revalidar).':'Bloqueado: hay acciones obligatorias pendientes, incompletas o sin verificación válida.')+
 '</p></section>';
 return html;
}
function setProvider(value){
 if(value!==null&&(!value||typeof value.submit!=='function'||typeof value.reload!=='function'))throw Error('El proveedor requiere submit y reload.');
 provider=value;
}
function setContextProvider(value){if(value!==null&&typeof value!=='function')throw Error('El contexto debe ser una función.');contextProvider=value;}
function enabled(){return root.HYS243_TASKS_ENABLED===true&&root.HYS243_TASKS_ISOLATED===true&&provider&&typeof provider.submit==='function'&&typeof provider.reload==='function'}
async function onSubmit(event){
 const form=event.target?.closest?.('[data-hys243-action-submit]');
 if(!form)return;
 event.preventDefault();
 const say=x=>{const p=form.querySelector('.hys243-action-response');if(p)p.textContent=x};
 if(!enabled()){say('No se envió nada: servidor aislado no disponible.');return;}
 const context=contextProvider?.(),findingId=form.dataset.findingId,actionId=form.dataset.hys243ActionSubmit;
 const record=context?.records?.find?.(x=>x?.[6]?.findingId===findingId);
 const action=record?.[6]?.actions?.find?.(x=>canonical(x?.actionId)===canonical(actionId));
 if(!action||!actorMaySubmit(action,context,record)||!context?.reportId){say('Tarea no autorizada, desactualizada o ajena a este usuario.');return;}
 const text=String(form.querySelector('[name="description"]')?.value||'').trim();
 if(text.length<15||text.length>2000){say('Describe la ejecución entre 15 y 2000 caracteres.');return;}
 let evidence;
 try{evidence=root.Hys243Corrections?.validateEvidence(form.querySelector('[name="evidence"]')?.files)}
 catch(error){say(error.message||'Evidencia no válida.');return;}
 if(!evidence){say('La validación de evidencias no está disponible.');return;}
 const submitButton=form.querySelector('button[type="submit"]');
 if(submitButton)submitButton.disabled=true;
 try{
  let id=form.dataset.idempotencyKey;
  if(!uuid(id)){id=root.crypto?.randomUUID?.();if(!uuid(id))throw Error('No se pudo generar el identificador de solicitud.');form.dataset.idempotencyKey=id;}
  const request={module:context.module,reportId:context.reportId,findingId,actionId,
    description:text,expectedRevision:Number.isInteger(record?.[6]?.revision)?record[6].revision:null,idempotencyKey:id};
  const receipt=await provider.submit(request,evidence);
  if(!receipt||receipt.stored!==true||receipt.verified!==true||!uuid(receipt.eventId)||
     receipt.reportId!==context.reportId||receipt.findingId!==findingId||receipt.actionId!==actionId||
     !Number.isInteger(receipt.revision)||receipt.revision<1||
     (Number.isInteger(record[6]?.revision)&&receipt.revision<=record[6].revision))throw Error('El servidor no confirmó una tarea verificable.');
  const fresh=await provider.reload({module:context.module,reportId:context.reportId,findingId,actionId});
  if(!fresh||fresh.verified!==true||fresh.reportId!==context.reportId||fresh.findingId!==findingId||
      fresh.actionId!==actionId||fresh.eventId!==receipt.eventId||fresh.revision!==receipt.revision)
   throw Error('La acción pudo recibirse, pero no se verificó la nueva versión. Consulta el historial antes de reintentar.');
  form.dataset.idempotencyKey='';
  say('Ejecución recibida por el servidor. Pendiente de verificación; recarga el informe actualizado.');
 }catch(error){say(String(error.message||'Error al enviar la acción. Revisa el historial antes de reintentar.'))}
}
if(root.document)root.document.addEventListener('submit',onSubmit);
const api={validAction,verified,allRequiredVerified,validateActionList,makeDraft,actorMaySubmit,
 reset(){activeEditor=null;},mount,read,listMarkup,setProvider,setContextProvider,context:()=>contextProvider?.()||null,enabled,onSubmit};
root.Hys243Actions=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
