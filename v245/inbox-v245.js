/* Reportes HYS v245 — F01: Campana y bandeja de pendientes.
 * SOLO lectura de planificación local, SIN envío de notificaciones.
 * Nunca simula entrega, lectura, aceptación, ejecución, verificación ni cierre.
 * No consultar ni guardar información de otros proyectos o módulos.
 */
(function(root){
 'use strict';
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const MODES=new Set(['APR','OTROS']);
 const ACTIVE=new Set(['pending','in_progress','submitted','rejected']);
 const safeId=x=>typeof x==='string'&&UUID.test(x)?x.toLowerCase():'';
 const safeText=(x,n=300)=>String(x??'').trim().slice(0,n);
 const safeDay=x=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(x??'')))return '';
  const d=new Date(x+'T12:00:00Z');
  return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===x?x:'';
 };
 const validMode=(m)=>MODES.has(m);
 const verified=(a)=>a?.status==='verified'&&safeId(a.verifiedBy)&&
  Array.isArray(a.evidenceIds)&&a.evidenceIds.length>0&&a.evidenceIds.every(safeId)&&
  typeof a.verifiedAt==='string'&&!Number.isNaN(Date.parse(a.verifiedAt));
 const priority=(item,today)=>{
  if(!item.dueDate)return 3;
  if(item.dueDate<today)return 0;
  if(item.dueDate===today)return 1;
  return 2;
 };
 function collect(report,module,{today=new Date().toISOString().slice(0,10)}={}){
  if(!validMode(module)||!report||typeof report!=='object'||report.module!==module)
   return {items:[],warnings:[],invalidModule:true};
  const data=report.data||{},items=[],warnings=[],seen=new Set();
  const dueRef=safeDay(today)||new Date().toISOString().slice(0,10);
  const add=item=>{
   if(seen.has(item.key)){warnings.push('Una tarea tiene identificador duplicado y requiere revisión.');return;}
   seen.add(item.key);items.push({...item,dueStatus:item.dueDate?(item.dueDate<dueRef?'overdue':item.dueDate===dueRef?'today':'upcoming'):'undated'});
  };
  const findings=Array.isArray(data.findings)?data.findings:[];
  findings.forEach((record,index)=>{
   if(!Array.isArray(record))return;
   const metadata=record[6];
   const findingId=safeId(metadata?.findingId);
   const actions=metadata?.actions;
   if(!Array.isArray(actions))return;
   const members=Array.isArray(metadata.assignees)?metadata.assignees:[];
   const validPeople=new Set(members.filter(p=>p?.modulo===module&&safeId(p.user_id)).map(p=>safeId(p.user_id)));
   for(const a of actions){
    if(!a||typeof a!=='object'||!safeId(a.actionId)||!safeId(a.assigneeId)||!findingId){
     warnings.push('Hay una acción de hallazgo con identificadores pendientes de revisión.');continue;
    }
    if(!validPeople.has(safeId(a.assigneeId))){
     warnings.push('Existe una acción sin responsable válido para este módulo.');continue;
    }
    if(a.status==='verified'&&verified(a))continue;
    if(a.status!=='verified'&&!ACTIVE.has(a.status)){
     warnings.push('Existe una acción con estado no reconocido.');continue;
    }
    const type=a.status==='verified'?'Revisión de verificación':a.status==='submitted'?'En revisión de ejecución':'Acción individual';
    add({key:'accion:'+safeId(a.actionId),kind:'finding',sourceId:findingId,
     title:safeText(record[0],180)||'Hallazgo N.º '+(index+1),
     description:safeText(a.description,500)||'Descripción pendiente de revisar',
     assignedId:safeId(a.assigneeId),assignedName:safeText(a.assigneeName,160)||'Responsable registrado',
     dueDate:safeDay(metadata?.dueDate),status:a.status==='verified'?'unverified':a.status,
     required:a.required===true,type,module});
   }
  });
  if(module==='APR'){
   for(const kind of ['activities','inspections']){
    const rows=Array.isArray(data[kind])?data[kind]:[];
    rows.forEach((record,index)=>{
     if(!Array.isArray(record))return;
     const m=record[5];
     if(!m||m.activityType!=='assigned')return;
     const id=safeId(m.activityId);
     if(!id){warnings.push('Hay una tarea APR sin identificador estable.');return;}
     const identity=m.identity;
     if(identity&&(identity.modulo!=='APR'||!safeId(identity.user_id))){
      warnings.push('Una tarea APR tiene un responsable vinculado incorrecto.');return;
     }
     add({key:'actividad:'+kind+':'+id,kind,sourceId:id,
       title:safeText(record[kind==='activities'?2:1],180)||'Actividad N.º '+(index+1),
       description:safeText(record[kind==='activities'?0:2],240),
       assignedId:safeId(identity?.user_id),assignedName:safeText(identity?.nombre,160)||'Sin cuenta vinculada',
       dueDate:safeDay(m.dueDate),status:'planning',required:null,
       type:kind==='activities'?'Actividad HYS':'Actividad por área',module});
    });
   }
  }
  items.sort((a,b)=>priority(a,dueRef)-priority(b,dueRef)||(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||a.title.localeCompare(b.title,'es'));
  return {items,warnings,invalidModule:false};
 }
 function mineOnly(items,userId){
  const id=safeId(userId);
  return id?items.filter(x=>x.assignedId===id):[];
 }
 function node(tag,text,cls){
  const element=root.document.createElement(tag);
  if(text!==undefined&&text!==null)element.textContent=String(text);
  if(cls)element.className=cls;
  return element;
 }
 let demoDirectory=null,instance=null;
 function setDemoDirectory(rows){
  if(root.HYS245_REVIEW_ONLY!==true)throw Error('No se puede habilitar un selector ficticio fuera de la demostración.');
  if(!Array.isArray(rows))throw Error('El catálogo ficticio debe ser una lista.');
  demoDirectory=rows.filter(p=>safeId(p.user_id)&&validMode(p.modulo)&&safeText(p.nombre)).map(p=>({
   userId:safeId(p.user_id),name:safeText(p.nombre,160),module:p.modulo
  }));
 }
 function mount({header,module,reportReader,userIdReader,onNavigate}={}){
  if(!root.document||!header||!validMode(module)||typeof reportReader!=='function'||typeof userIdReader!=='function')
   throw Error('La bandeja requiere un contexto de módulo válido.');
  if(instance?.host?.isConnected)instance.host.remove();
  const isPreview=root.HYS245_REVIEW_ONLY===true;
  const host=node('div',null,'hys245-inbox');
  const bell=node('button','🔔 Pendientes','hys245-bell');bell.type='button';
  bell.setAttribute('aria-label','Abrir bandeja de pendientes de planificación');
  bell.setAttribute('aria-expanded','false');
  const badge=node('span','0','hys245-bell-count');badge.setAttribute('aria-label','Cantidad de tareas planificadas');bell.append(badge);
  const panel=node('section',null,'hys245-inbox-panel');panel.hidden=true;
  panel.setAttribute('role','region');panel.setAttribute('aria-label','Bandeja de tareas pendientes');
  const heading=node('h3','Mis pendientes · F01');
  const safeNote=node('p','Esta bandeja resume tareas planificadas en este informe local. No son avisos entregados ni confirmaciones de lectura.','hys245-inbox-note');
  const chooserLabel=node('label','Vista de prueba · solo filtra datos ficticios');
  const chooser=node('select');chooser.setAttribute('aria-label','Filtro de pendientes ficticios');
  chooserLabel.append(chooser);chooserLabel.hidden=!isPreview;
  const status=node('p',null,'hys245-inbox-status');status.setAttribute('role','status');
  const list=node('div',null,'hys245-inbox-list');
  const buttons=node('div',null,'hys245-inbox-buttons');
  const reload=node('button','Actualizar lista');reload.type='button';
  const close=node('button','Cerrar');close.type='button';
  buttons.append(reload,close);
  panel.append(heading,safeNote,chooserLabel,status,list,buttons);
  host.append(bell,panel);header.append(host);
  let lastReport=null;
  const getChoice=()=>chooser.value;
  const render=()=>{
   list.replaceChildren();
   const report=reportReader();
   if(report?.module!==module){
    status.textContent='No se encontró un informe del módulo '+module+'. No se muestra información cruzada.';
    badge.textContent='0';lastReport=null;return;
   }
   lastReport=report;
   const result=collect(report,module);
   const userId=userIdReader();
   const selected=isPreview?getChoice():'mine';
   const visible=selected==='team'?result.items:selected.startsWith('person:')?mineOnly(result.items,selected.slice(7)):mineOnly(result.items,userId);
   badge.textContent=String(visible.length);
   status.textContent=visible.length+' tarea(s) de planificación '+(isPreview?(selected==='team'?'del módulo ficticio':'del filtro ficticio'):'asignadas a esta cuenta')+'.'+
     (result.warnings.length?' '+result.warnings.length+' registro(s) necesitan revisión de datos.':'');
   if(!visible.length){
    list.append(node('p','No hay tareas planificadas para este filtro. No equivale a una confirmación de cumplimiento.','hys245-inbox-empty'));return;
   }
   for(const item of visible){
    const article=node('article',null,'hys245-inbox-item');
    const type=node('strong',item.type);
    const title=node('p',item.title,'hys245-inbox-title');
    const desc=node('p',item.description,'hys245-inbox-description');
    const meta=node('small',(item.assignedName||'Sin responsable')+' · '+(item.dueDate?'Compromiso: '+item.dueDate:'Sin fecha asociada')+' · '+
      (item.dueStatus==='overdue'?'Plazo vencido':item.dueStatus==='today'?'Vence hoy':'Planificación sin verificación'),'hys245-inbox-meta');
    const action=node('button','Ver en Informe Diario');action.type='button';
    action.addEventListener('click',()=>{panel.hidden=true;bell.setAttribute('aria-expanded','false');if(typeof onNavigate==='function')onNavigate(item);});
    article.append(type,title,desc,meta,action);list.append(article);
   }
  };
  function redrawChoices(){
   if(!isPreview)return;
   const previous=chooser.value;
   chooser.replaceChildren(new Option('Todas las tareas ficticias de '+module,'team'));
   for(const p of (demoDirectory||[]).filter(p=>p.module===module))
    chooser.add(new Option('Pendientes de '+p.name+' (solo filtro)', 'person:'+p.userId));
   chooser.add(new Option('Mi usuario de demostración (puede estar vacío)','mine'));
   chooser.value=[...chooser.options].some(x=>x.value===previous)?previous:'team';
  }
  const open=()=>{
   panel.hidden=!panel.hidden;bell.setAttribute('aria-expanded',panel.hidden?'false':'true');
   if(!panel.hidden)render();
  };
  bell.addEventListener('click',open);
  reload.addEventListener('click',render);
  close.addEventListener('click',()=>{panel.hidden=true;bell.setAttribute('aria-expanded','false');});
  chooser.addEventListener('change',render);
  redrawChoices();
  instance={host,render,redrawChoices,module};
  render();
  return host;
 }
 function refresh(){if(instance?.host?.isConnected)instance.render();}
 const api={collect,mineOnly,mount,refresh,setDemoDirectory,safeDay};
 root.Hys245Inbox=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
