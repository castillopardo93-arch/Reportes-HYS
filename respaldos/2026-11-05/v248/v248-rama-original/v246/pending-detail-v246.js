/* Reportes HYS v246 — F01b · pantalla separada de consulta de pendientes.
 * Datos del informe actualmente abierto, lectura solamente.
 * No habilita edición de informes, carga de evidencias, cierre, verificación,
 * permisos ni notificaciones reales. El filtro de equipo solo existe en la demo.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const MODES=new Set(['APR','OTROS']);
const id=x=>typeof x==='string'&&UUID.test(x)?x.toLowerCase():'';
const text=(value,max=700)=>String(value??'').trim().slice(0,max);
const LABELS={
  pending:'Pendiente',in_progress:'En proceso',submitted:'Ejecución enviada a revisión',
  rejected:'Devuelta para corrección',unverified:'Verificación por revisar',
  planning:'Planificación registrada',needs_classification:'Pendiente de clasificar y asignar'
};
const SOURCE={
  activities:'Tarjeta 1 · Actividades HYS',
  inspections:'Tarjeta 2 · Actividades por área',
  finding:'Tarjeta 3 · Hallazgos'
};
function readScope(report,module,userId,preview=false){
 if(!MODES.has(module)||!report||report.module!==module||!root.Hys245Inbox)
  return {items:[],report:null,warning:'No se puede consultar un informe ajeno a este módulo.'};
 const found=root.Hys245Inbox.collect(report,module);
 if(found.invalidModule)return {items:[],report:null,warning:'El módulo del informe no coincide.'};
 const items=preview===true?found.items:root.Hys245Inbox.mineOnly(found.items,userId);
 return {items,report,warning:found.warnings.length?found.warnings.length+' registro(s) del informe requieren revisión.':''};
}
function findSelected(items,key){
 return Array.isArray(items)?items.find(p=>p.key===key)||null:null;
}
function node(tag,textValue,cls){
 const el=root.document.createElement(tag);
 if(textValue!==undefined&&textValue!==null)el.textContent=String(textValue);
 if(cls)el.className=cls;
 return el;
}
let active=null;
function mount({head,module,reportReader,userIdReader,onTabChange}={}){
 if(!root.document||!head||!MODES.has(module)||typeof reportReader!=='function'||typeof userIdReader!=='function'||typeof onTabChange!=='function')
  throw Error('La ficha requiere un módulo y lectores de informe válidos.');
 if(active?.panel?.isConnected)active.panel.remove();
 const preview=root.HYS245_REVIEW_ONLY===true;
 const panel=node('section',null,'panel hys246-pending-panel');
 panel.id='pendingDetailPanel';
 panel.style.display='none';
 panel.setAttribute('aria-label','Pantalla de consulta y seguimiento de pendientes');
 const intro=node('div',null,'hys246-pending-intro');
 const name=node('h2','Mis pendientes · Seguimiento');
 const note=node('p','Consulta independiente del Informe Diario. Seleccionar un pendiente no abre el formulario editable.','hys246-pending-note');
 const demoNote=node('p',preview?'Vista de demostración: se muestran tareas del equipo ficticio para comprobar el diseño. No concede acceso a datos de otras personas.':'Solo se consultan pendientes vinculados al usuario actual. El servidor deberá confirmar sus permisos.','hys246-safety');
 const state=node('p',null,'hys246-view-status');state.setAttribute('role','status');
 intro.append(name,note,demoNote,state);
 const body=node('div',null,'hys246-pending-grid');
 const left=node('div',null,'hys246-pending-left');
 const listTitle=node('h3','Pendientes del informe abierto');
 const list=node('div',null,'hys246-pending-list');
 list.setAttribute('aria-label','Listado de pendientes');
 left.append(listTitle,list);
 const right=node('article',null,'hys246-pending-detail');
 right.setAttribute('aria-live','polite');
 body.append(left,right);
 const footer=node('div',null,'hys246-view-footer');
 const back=node('button','Volver al Informe Diario');back.type='button';back.className='btn';
 back.addEventListener('click',()=>onTabChange('informe'));
 footer.append(back);
 panel.append(intro,body,footer);
 head.insertAdjacentElement('afterend',panel);
 let selectedKey=null;
 function render(){
  const report=reportReader();
  const scoped=readScope(report,module,userIdReader(),preview);
  list.replaceChildren();
  right.replaceChildren();
  state.textContent=(scoped.report?scoped.items.length+' pendiente(s) visibles en el informe actualmente abierto. ':'')+
   (scoped.warning||'')+
   ' No se han enviado notificaciones.';
  if(!scoped.report){
   const msg=node('p','No hay un informe válido de '+module+' para consultar. Regresa al Informe Diario.','hys246-empty');
   left.append(msg);return;
  }
  const summary=node('p','Proyecto: '+(text(scoped.report.project,180)||'No indicado')+' · Informe: '+(text(scoped.report.status,90)||'En edición')+' · Módulo: '+module,'hys246-summary');
  if(!intro.querySelector('.hys246-summary'))intro.insertBefore(summary,state);
  else intro.querySelector('.hys246-summary').replaceWith(summary);
  if(!scoped.items.length){
    list.append(node('p','No hay tareas pendientes visibles en este informe. Esto no certifica que los hallazgos estén cerrados.','hys246-empty'));
    right.append(node('h3','Sin pendiente seleccionado'),node('p','Aquí aparecerá la ficha de seguimiento cuando existan registros asignados o pendientes de clasificar.'));
    return;
  }
  if(selectedKey&&!findSelected(scoped.items,selectedKey))selectedKey=null;
  if(!selectedKey)selectedKey=scoped.items[0].key;
  for(const item of scoped.items){
    const button=node('button',null,'hys246-task'+(item.key===selectedKey?' selected':''));
    button.type='button';
    button.setAttribute('aria-pressed',item.key===selectedKey?'true':'false');
    button.append(node('span',SOURCE[item.kind]||'Pendiente','hys246-task-kind'),
      node('strong',text(item.title,180)||'Pendiente'),
      node('small',text(item.assignedName,180)||'Sin cuenta vinculada'));
    button.addEventListener('click',()=>{selectedKey=item.key;render();right.querySelector('h3')?.focus?.();});
    list.append(button);
  }
  const item=findSelected(scoped.items,selectedKey);
  if(!item)return;
  const h=node('h3',text(item.title,180)||'Detalle del pendiente');
  h.tabIndex=-1;
  const tag=node('p',SOURCE[item.kind]||'Seguimiento','hys246-detail-origin');
  const fields=node('dl',null,'hys246-fields');
  const field=(label,value)=>{
    const row=node('div',null,'hys246-field');
    row.append(node('dt',label),node('dd',value||'No informado'));
    fields.append(row);
  };
  field('Tipo de registro',text(item.type,180));
  field('Estado de seguimiento',LABELS[item.status]||'Requiere revisión');
  field('Responsable vinculado',text(item.assignedName,180)||'Sin persona vinculada');
  field('Fecha compromiso',item.dueDate||'Sin fecha registrada');
  field('Situación de plazo',item.dueStatus==='overdue'?'Fecha compromiso vencida':
    item.dueStatus==='today'?'Compromiso de hoy':item.dueStatus==='upcoming'?'Fecha próxima':'Sin plazo válido');
  const description=node('section',null,'hys246-description');
  description.append(node('h4',item.kind==='finding'?'Medida propuesta / Acción':'Detalle de actividad'),
    node('p',text(item.description,500)||'No se ha consignado un detalle.'));
  const caution=node('div',null,'hys246-readonly');
  caution.append(node('strong','Seguimiento independiente · solo consulta'),
    node('p','Esta ficha no modifica el Informe Diario original. La ejecución, evidencias, reasignación, verificación y cierre requerirán permisos y auditoría en un servidor autorizado.'));
  const next=node('section',null,'hys246-next');
  next.append(node('h4','Próximas funciones del seguimiento'),
   node('p','Avance de la tarea · Evidencia fotográfica · Revisión del supervisor o administrador · Historial auditado de cambios.'));
  right.append(tag,h,fields,description,caution,next);
 }
 function open(item){
  if(!item||typeof item.key!=='string')return false;
  const report=reportReader();
  const found=readScope(report,module,userIdReader(),preview);
  if(!findSelected(found.items,item.key))return false;
  selectedKey=item.key;
  onTabChange('pendientes');
  render();
  panel.scrollIntoView?.({behavior:'smooth',block:'start'});
  right.querySelector('h3')?.focus?.();
  return true;
 }
 function refresh(){if(panel.isConnected&&panel.style.display!=='none')render();}
 active={panel,render,open,refresh,module};
 return panel;
}
function open(item){return active?.open(item)===true;}
function refresh(){active?.refresh();}
const api={readScope,findSelected,mount,open,refresh};
root.Hys246PendingDetail=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
