/* Reportes HYS F02-F07 · v251 — planificador local, sin envíos reales.
 * Este módulo NO envía correos, NO crea notificaciones remotas, NO confirma
 * lectura/entrega/ejecución/cierre y NO concede permisos adicionales.
 * Avisos 'preparados' no equivalen a estados operativos del servidor.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODULES=new Set(['APR','OTROS']);
const id=x=>typeof x==='string'&&UUID.test(x)?x.toLowerCase():'';
const safe=(v,max=500)=>String(v??'').trim().slice(0,max);
const isoDay=(v)=>{const s=safe(v,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return '';const d=new Date(s+'T12:00:00Z');return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===s?s:'';};
const reportKey=(r,m)=>MODULES.has(m)&&r?.module===m&&/^[a-zA-Z0-9:_-]{5,100}$/.test(safe(r.reportId,100))?m+'|'+r.reportId:'';
const verified=a=>a?.status==='verified'&&id(a.verifiedBy)&&Array.isArray(a.evidenceIds)&&a.evidenceIds.length>0&&a.evidenceIds.every(id)&&typeof a.verifiedAt==='string'&&!Number.isNaN(Date.parse(a.verifiedAt));
const dayOf=(date=new Date())=>date instanceof Date&&!Number.isNaN(+date)?[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-'):'';
const nextDay=(s,days)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
const stable=x=>[x.modulo,x.reportId,x.recordId,x.actionId,x.recipientId,x.type,x.revision,x.channel].map(p=>encodeURIComponent(safe(p,128))).join('|');
function tasks(report,module){
 const key=reportKey(report,module);if(!key)return [];
 const list=[],findings=Array.isArray(report.data?.findings)?report.data.findings:[];
 for(const finding of findings){
  if(!Array.isArray(finding))continue;
  const meta=finding[6],source=id(meta?.findingId),actions=meta?.actions;
  if(!source)continue; // Los registros sin UUID estable requieren normalización.
  const members=Array.isArray(meta?.assignees)?meta.assignees.filter(a=>a?.modulo===module&&id(a.user_id)):[];
  const people=new Map(members.map(p=>[id(p.user_id),p]));
  const status=safe(finding[4],60).toLowerCase();
  const dueDate=isoDay(meta?.dueDate);
  if(Array.isArray(actions)&&actions.length){
   for(const action of actions){
    const act=id(action?.actionId),recipient=id(action?.assigneeId);
    if(!act||!recipient||!people.has(recipient))continue;
    const isClosed=verified(action);
    list.push({modulo:module,reportId:report.reportId,recordId:source,actionId:act,recipientId:recipient,
      title:safe(finding[0],160)||'Hallazgo',detail:safe(action.description,300)||safe(finding[2],300),
      dueDate,status:isClosed?'verified':safe(action.status,50),closed:isClosed,kind:'finding'});
   }
  }else if((!Array.isArray(actions)||actions.length===0)&&people.size===1){
   const recipient=[...people.keys()][0];
   list.push({modulo:module,reportId:report.reportId,recordId:source,actionId:'hallazgo',recipientId:recipient,
    title:safe(finding[0],160)||'Hallazgo',detail:safe(finding[2],300),dueDate,
    status,closed:['cerrado','completado'].includes(status),kind:'finding'});
  }
 }
 if(module==='APR'){
  for(const kind of ['activities','inspections']){
   const rows=Array.isArray(report.data?.[kind])?report.data[kind]:[];
   for(const row of rows){
    if(!Array.isArray(row)||row[5]?.activityType!=='assigned')continue;
    const record=id(row[5].activityId),identity=row[5].identity,recipient=id(identity?.user_id);
    if(!record||!recipient||identity?.modulo!=='APR')continue;
    list.push({modulo:module,reportId:report.reportId,recordId:record,actionId:kind,recipientId:recipient,
     title:safe(row[kind==='activities'?2:1],160)||'Actividad asignada',
     detail:safe(row[kind==='activities'?0:2],300),dueDate:isoDay(row[5].dueDate),
     status:'planning',closed:false,kind});
   }
  }
 }
 return list;
}
const targetKey=t=>[t.modulo,t.reportId,t.recordId,t.actionId,t.recipientId].join('|');
const workKey=t=>[t.modulo,t.reportId,t.recordId,t.actionId].join('|');
function diff(previous,current,{date=dayOf(),reminders=true,revision=null}={}){
 const old=Array.isArray(previous)?previous:[],next=Array.isArray(current)?current:[];
 const oldMap=new Map(old.map(x=>[targetKey(x),x])),newMap=new Map(next.map(x=>[targetKey(x),x]));
 const events=[],oldGroups=new Map(),newGroups=new Map();
 const group=(list,dest)=>{for(const t of list){const key=workKey(t);if(!dest.has(key))dest.set(key,[]);dest.get(key).push(t)}};
 group(old,oldGroups);group(next,newGroups);
 const add=(type,t,marker)=>events.push({modulo:t.modulo,reportId:t.reportId,recordId:t.recordId,actionId:t.actionId,
  recipientId:t.recipientId,type,revision:safe(type==='recordatorio'||revision===null?marker:String(revision)+':'+marker,128),title:t.title,dueDate:t.dueDate,kind:t.kind,channel:'interno',state:'preparada'});
 for(const t of next){
  const p=oldMap.get(targetKey(t)),previousForWork=oldGroups.get(workKey(t))||[];
  if(!p){
   add(previousForWork.length?'reasignacion':'asignacion',t,t.recipientId);
  }else{
   if(!p.closed&&t.closed)add('cierre',t,t.status);
   if(p.closed&&!t.closed)add('reapertura',t,t.status);
   if(p.dueDate!==t.dueDate&&t.dueDate)add('cambio_plazo',t,t.dueDate);
  }
  if(reminders&&date&&t.dueDate&&!t.closed){
   const reminder=t.dueDate<date?'vencido':t.dueDate>=date&&t.dueDate<=nextDay(date,3)?'proximo':null;
   if(reminder)add('recordatorio',t,reminder+':'+date);
  }
 }
 for(const t of old){
  if(newMap.has(targetKey(t)))continue;
  const still=(newGroups.get(workKey(t))||[]);
  if(still.length)add('reasignacion_anterior',t,still.map(x=>x.recipientId).sort().join(','));
 }
 const byKey=new Map();
 for(const event of events){event.key=stable(event);byKey.set(event.key,event);}
 return [...byKey.values()];
}
function merge(existing,events,at=new Date().toISOString()){
 const records=Array.isArray(existing)?existing.map(x=>({...x})):[];
 const index=new Set(records.map(x=>x.key));
 let added=0;
 for(const event of events){
  if(!event||event.state!=='preparada'||!event.key||index.has(event.key))continue;
  records.push({...event,createdAt:at,attempts:0,error:null,deliveryAt:null,viewedAt:null,confirmedAt:null});
  index.add(event.key);added++;
 }
 return {records,added};
}
function retryPolicy(attempt,{max=5,baseSeconds=60}={}){
 const n=Number(attempt);
 if(!Number.isInteger(n)||n<0||n>=max)return {retry:false,delaySeconds:0,deadLetter:n>=max};
 const seconds=Math.min(86400,baseSeconds*Math.pow(2,n));
 return {retry:true,delaySeconds:seconds,deadLetter:false};
}
function emailTemplate(event,{project='Proyecto Hidroeléctrico Alto Maipo'}={}){
 return {subject:safe('Reportes HYS · '+({asignacion:'Nueva asignación',reasignacion:'Reasignación',cierre:'Cierre',reapertura:'Reapertura',recordatorio:'Recordatorio'}[event?.type]||'Actualización de seguimiento'),150),
  text:['Proyecto: '+safe(project,180),'Módulo: '+safe(event?.modulo,16),'Tipo: '+safe(event?.type,50),
   'Actividad o hallazgo: '+safe(event?.title,180),'Fecha compromiso: '+(isoDay(event?.dueDate)||'No indicada'),
   'Consulta el detalle en tu cuenta autorizada de Reportes HYS.'].join('\n')};
}
function serverStatus(row){
 if(!row||row.origin!=='servidor_autorizado')return 'No confirmado';
 return ({pending:'Pendiente',sent:'Enviado',failed:'Fallido',viewed:'Visto',confirmed:'Confirmado'})[row.state]||'Estado desconocido';
}
function annexRows(report,visible,ledger,{includePrepared=true}={}){
 const key=reportKey(report,report?.module);
 const authorized=new Set((visible||[]).map(t=>targetKey(t)));
 return (ledger||[]).filter(e=>e.modulo===report?.module&&e.reportId===report?.reportId
   &&authorized.has(targetKey(e))&&(includePrepared||e.origin==='servidor_autorizado'))
  .map(e=>({hallazgo:e.title,tipo:e.type,canal:e.channel,
   estado:e.origin==='servidor_autorizado'?serverStatus(e):'Preparada (sin envío)',
   fecha:e.createdAt||'',fechaEntrega:e.origin==='servidor_autorizado'?e.deliveryAt||'':'',
   fechaLectura:e.origin==='servidor_autorizado'?e.viewedAt||'':'',
   fechaConfirmacion:e.origin==='servidor_autorizado'?e.confirmedAt||'':''}));
}
let active=null;
function mount({module,reportReader,userIdReader,readVisible}={}){
 if(!MODULES.has(module)||typeof reportReader!=='function'||typeof userIdReader!=='function'||typeof readVisible!=='function')return null;
 if(active?.stop)active.stop();
 const owner=id(userIdReader());
 if(!owner)return null;
 const storage=root.HysStorage242?.capture?.()||root.localStorage;
 const STORAGE='hys251-planificacion-v1::'+module;
 let snapshot=null,ledger=[],lastReport='',enabled=true,stopped=false,revisionCounter=0,reports={};
 const valid=()=>!stopped&&id(userIdReader())===owner&&(!storage?.valid||storage.valid())&&
  (!Object.prototype.hasOwnProperty.call(root,'__REPORTES_HYS_ACCESS__')||
   id(root.__REPORTES_HYS_ACCESS__?.userId)===owner&&root.__REPORTES_HYS_ACCESS__?.profile?.activo===true&&root.__REPORTES_HYS_ACCESS__?.selectedModule===module);
 const stop=()=>{if(stopped)return;stopped=true;ledger=[];snapshot=null;reports={};lastReport='';root.removeEventListener?.('reportes-hys-data-saved',saveHandler);};
 try{const raw=JSON.parse(storage.getItem(STORAGE)||'null');if(raw?.module===module&&raw.owner===owner){
  ledger=Array.isArray(raw.ledger)?raw.ledger.slice(-1500).filter(x=>x.modulo===module&&x.state==='preparada'):[];
  snapshot=Array.isArray(raw.snapshot)?raw.snapshot:[];lastReport=raw.reportKey||'';
  revisionCounter=Number.isSafeInteger(raw.revisionCounter)&&raw.revisionCounter>=0?raw.revisionCounter:0;
  if(raw.reports&&typeof raw.reports==='object'&&!Array.isArray(raw.reports)){
   for(const [key,value] of Object.entries(raw.reports).slice(-100))if(Array.isArray(value?.snapshot)&&Number.isSafeInteger(value.revision))reports[key]=value;
  }
 }}catch{enabled=false;}
 let storageConfirmed=false;const persist=()=>{if(!enabled||!valid()){storageConfirmed=false;return false;}try{storage.setItem(STORAGE,JSON.stringify({owner,module,ledger:ledger.slice(-1500),snapshot,reportKey:lastReport,revisionCounter,reports}));storageConfirmed=true;return true;}catch{storageConfirmed=false;return false;}};
 const sync=()=>{
  if(!valid()){stop();return {added:0,reason:'La sesión cambió; no se guardaron avisos.'};}
  const r=reportReader(),key=reportKey(r,module);
  if(!key)return {added:0,reason:'Informe o módulo no válido'};
  const current=tasks(r,module),previous=reports[key],old=previous?.snapshot||[];
  const changed=JSON.stringify(old)!==JSON.stringify(current);
  if(changed)revisionCounter++;
  const revision=changed?revisionCounter:(previous?.revision||revisionCounter);
  const result=merge(ledger,diff(old,current,{date:dayOf(),revision}));
  ledger=result.records.slice(-1500);snapshot=current;lastReport=key;
  reports[key]={snapshot:current,revision};
  const keys=Object.keys(reports);for(const stale of keys.slice(0,Math.max(0,keys.length-100)))delete reports[stale];
  const persisted=persist();
  return {added:result.added,persisted,reason:persisted?'Propuestas registradas localmente, sin envío.':'Propuestas solo en memoria: no se confirmó el guardado local. No se envió nada.'};
 };
 const saveHandler=()=>{sync();root.Hys250Dashboard?.refresh?.();};
 root.addEventListener?.('reportes-hys-data-saved',saveHandler);
 function forItem(item,visible){
  if(!valid()){stop();return [];}
  const report=reportReader(),key=reportKey(report,module);
  if(!key||!item||!Array.isArray(visible)||!visible.some(t=>t.key===item.key))return [];
  const authorized=tasks(report,module).filter(t=>t.recordId===item.sourceId&&
    (item.assignedId===t.recipientId||item.kind==='finding'&&t.actionId==='hallazgo'&&item.assignedId===t.recipientId));
  const allowed=new Set(authorized.map(targetKey));
  return ledger.filter(e=>e.modulo===module&&e.reportId===report.reportId&&allowed.has(targetKey(e)));
 }
 function renderInPanel(host,{item,visible,report}={}){
  if(!root.document||!host)return;
  const rows=forItem(item,visible);
  const h=(tag,t,cls)=>{const e=root.document.createElement(tag);if(t!==undefined)e.textContent=t;if(cls)e.className=cls;return e;};
  const intro=h('div',null,'hys251-intro');
  intro.append(h('h4','Historial de notificaciones'),h('p','Preparación local de avisos. No se han enviado mensajes, correos ni confirmaciones de lectura.','hys251-muted'));
  if(!storageConfirmed&&ledger.length)intro.append(h('p','No se confirmó el guardado local de los avisos. Conserva una copia antes de cerrar.','hys251-muted'));
  host.append(intro);
  if(!rows.length){host.append(h('p','No existen avisos preparados para esta tarea. Se generan al guardar cambios del informe de prueba.','hys251-muted'));return;}
  const table=h('div',null,'hys251-events');
  for(const r of rows.slice(-20).reverse()){
   const article=h('article',null,'hys251-event');
   article.append(h('strong',({asignacion:'Asignación',reasignacion:'Reasignación',reasignacion_anterior:'Reasignación anterior',cierre:'Cierre',reapertura:'Reapertura',cambio_plazo:'Cambio de plazo',recordatorio:'Recordatorio'}[r.type]||r.type),'hys251-event-title'),
    h('span','Preparada · '+new Date(r.createdAt).toLocaleString('es-CL'),'hys251-chip'),
    h('small','Canal: interno · Entrega: no iniciada · Lectura: no confirmada'));
   table.append(article);
  }
  host.append(table);
 }
 function exportAnnex({item,visible}={}){
  if(!valid()){stop();return false;}
  const report=reportReader(),rows=annexRows(report,tasks(report,module).filter(t=>item?.sourceId===t.recordId&&item?.assignedId===t.recipientId),ledger);
  if(!visible?.some(x=>x.key===item?.key)||!rows.length)return false;
  const jsPDF=root.jspdf?.jsPDF;if(typeof jsPDF!=='function')return false;
  const doc=new jsPDF({unit:'mm',format:'a4'}),maxY=278,margin=17;
  let y=20;
  const line=(txt,lines=11)=>{const paragraphs=doc.splitTextToSize(String(txt),174);for(const p of paragraphs){if(y>maxY){doc.addPage();y=18;}doc.text(p,margin,y);y+=5;}y+=Math.max(0,lines-5);};
  doc.setFontSize(16);line('Anexo de planificación de avisos',10);
  doc.setFontSize(9);line('DOCUMENTO DE DESARROLLO: NO ACREDITA ENVÍO, ENTREGA, LECTURA NI CONFIRMACIÓN.',9);
  line('Módulo '+module+' · Informe '+safe(report.reportId,80)+' · '+dayOf(),8);
  for(const row of rows){line(row.tipo+' · '+row.estado,7);line(row.hallazgo,7);line('Canal '+row.canal+' · Preparación '+row.fecha,8);}
  doc.save('Anexo_Notificaciones_'+module+'_'+dayOf()+'.pdf');return true;
 }
 active={module,owner,sync,forItem,renderInPanel,exportAnnex,stop,getLedger:()=>{if(!valid()){stop();return [];}return ledger.map(x=>({...x}));}};
 return active;
}
const api={tasks,diff,merge,retryPolicy,emailTemplate,serverStatus,annexRows,mount,
 stop:()=>{active?.stop();active=null;},
 forItem:(...args)=>active?.forItem(...args)||[],
 renderInPanel:(...args)=>active?.renderInPanel(...args),
 exportAnnex:(...args)=>active?.exportAnnex(...args)||false,
 getLedger:()=>active?.getLedger()||[]};
root.Hys251Notifications=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
