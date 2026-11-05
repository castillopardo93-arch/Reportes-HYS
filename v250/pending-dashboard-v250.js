/* Reportes HYS v250: bandeja ejecutiva de pendientes y revisión jerárquica.
 * No crea privilegios: todas las vistas ajenas dependen de contexto autenticado
 * y, para relaciones jerárquicas, de autorización validada por RPC en Supabase.
 * No permite editar, aprobar, cerrar, enviar notificaciones ni alterar informes.
 */
(function(root){
'use strict';
const LABELS={pending:'Pendiente',in_progress:'En proceso',submitted:'En revisión',rejected:'Devuelta',unverified:'Por verificar',planning:'Planificada',needs_classification:'Por clasificar'};
const TYPES={activities:'Actividad HYS',inspections:'Actividad por área',finding:'Hallazgo'};
const txt=(x,n=500)=>String(x??'').trim().slice(0,n);
const normal=x=>txt(x,200).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/\s+/g,' ').trim();
const el=(tag,text,cls)=>{const n=root.document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=String(text);if(cls)n.className=cls;return n;};
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const week=()=>{const d=new Date();d.setDate(d.getDate()+7);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const dateText=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):'Sin fecha';
const isReview=item=>['submitted','unverified'].includes(item.status);
const isOverdue=item=>!!item.dueDate&&item.dueDate<today();
const isSoon=item=>!!item.dueDate&&item.dueDate>=today()&&item.dueDate<=week();
const state=item=>isOverdue(item)?'Vencido':isSoon(item)?'Por vencer':LABELS[item.status]||'Por revisar';
const urgency=item=>isOverdue(item)?0:isSoon(item)?1:isReview(item)?2:item.status==='in_progress'?3:4;
function sourceRow(report,item){
 const rows=report?.data?.[item.kind==='finding'?'findings':item.kind]||[];
 if(item.kind==='finding'){
  const index=item.sourceId?rows.findIndex(r=>Array.isArray(r)&&r[6]?.findingId===item.sourceId):-1;
  if(index>=0)return rows[index];
  const local=item.key.match(/^hallazgo:local-(\d+)$/);
  return local?rows[Number(local[1])]||null:null;
 }
 return rows.find(r=>Array.isArray(r)&&r[5]?.activityId===item.sourceId)||null;
}
function areaName(report,item){
 const r=sourceRow(report,item);
 return txt(item.kind==='activities'?r?.[1]:item.kind==='inspections'?r?.[0]:report?.area,100)||'Sin área informada';
}
function priority(report,item){
 const r=sourceRow(report,item);
 return item.kind==='finding'?txt(r?.[1],60)||'No informada':'No aplica';
}
function readAllowed(report,module,userId,context,areas,hierarchy,preview=false){
 if(!report||report.module!==module||!root.Hys245Inbox)return {items:[],invalid:true,role:'usuario'};
 const full=root.Hys245Inbox.collect(report,module);
 const profile=context?.profile||{},role=profile.rol||'usuario';
 if(preview===true)return {items:full.items,role:'demostracion',invalid:false,notice:'Vista de demostración. Los datos ficticios no otorgan permisos.'};
 const own=root.Hys245Inbox.mineOnly(full.items,userId);
 if(!profile.activo||context?.userId!==userId)return {items:[],role,invalid:false,notice:'Sin sesión autorizada.'};
 if(role==='administrador_global')return {items:full.items,role,invalid:false,notice:'Vista global del informe abierto. No incluye pendientes de otros informes.'};
 if(root.HYS242_DEPLOYMENT_READY!==true)return {items:own,role,invalid:false,notice:'La revisión de otras personas requiere validación central. Solo se muestran los pendientes propios.'};
 // Administrador de área: facultad de revisión y áreas nominadas recuperadas del servidor.
 if(role==='administrador_area'){
  const f=(context.facultades||[]).find(v=>v?.modulo===module);
  const granted=f?.facultades?.review===true&&f?.facultades?.view===true;
  if(granted&&areas.size){
   return {items:full.items.filter(item=>item.assignedId===userId||areas.has(normal(areaName(report,item)))),role,invalid:false,notice:'Revisión limitada a las áreas autorizadas del informe abierto.'};
  }
  return {items:own,role,invalid:false,notice:'Solo pendientes propios hasta validar facultades y áreas.'};
 }
 // Supervisores: personal directamente a cargo, con asociación por área confirmada.
 if(role==='supervisor'&&hierarchy.length){
  return {items:full.items.filter(item=>item.assignedId===userId||hierarchy.some(h=>h.subordinado_id===item.assignedId&&normal(h.area_nombre)===normal(areaName(report,item)))),role,invalid:false,notice:'Personal a cargo: solo relaciones directas validadas en Supabase.'};
 }
 return {items:own,role,invalid:false,notice:'Se muestran únicamente los pendientes asignados a tu cuenta.'};
}
let instance=null;
function mount({panel,module,reportReader,userIdReader}={}){
 if(!panel||!['APR','OTROS'].includes(module)||typeof reportReader!=='function'||typeof userIdReader!=='function')return null;
 if(instance?.view?.isConnected)instance.view.remove();
 panel.classList.add('hys250-active');
 const view=el('div',null,'hys250-dashboard');
 const heading=el('div',null,'hys250-heading');
 const headingLeft=el('div');headingLeft.append(el('div','CENTRO DE SEGUIMIENTO','hys250-eyebrow'),el('h2','Pendientes','hys250-title'),el('p','Actividades y hallazgos del informe abierto · '+module,'hys250-subtitle'));
 const scope=el('div','Verificando alcance…','hys250-role');
 heading.append(headingLeft,scope);
 const summary=el('div',null,'hys250-metrics');
 const filters=el('div',null,'hys250-filters');
 const search=el('input');search.type='search';search.placeholder='Buscar pendiente, responsable o área';search.setAttribute('aria-label','Buscar pendiente por descripción, área o responsable');
 const status=el('select');status.setAttribute('aria-label','Filtrar por estado');
 const opts=[['all','Todos los estados'],['overdue','Vencidos'],['soon','Por vencer'],['process','En proceso'],['review','En revisión'],['pending','Pendientes']];
 for(const [value,label] of opts)status.add(new Option(label,value));
 const type=el('select');type.setAttribute('aria-label','Filtrar por tipo');
 for(const [value,label] of [['all','Todas las categorías'],['finding','Hallazgos'],['activities','Actividades HYS'],['inspections','Actividades por área']])type.add(new Option(label,value));
 const refreshButton=el('button','Actualizar','hys250-refresh');refreshButton.type='button';
 filters.append(search,status,type,refreshButton);
 const info=el('p','','hys250-info');info.setAttribute('role','status');
 const body=el('div',null,'hys250-body');
 const listings=el('section',null,'hys250-listings');listings.append(el('h3','Listado priorizado','hys250-section-title'));
 const cards=el('div',null,'hys250-cards');listings.append(cards);
 const detail=el('article',null,'hys250-detail');detail.setAttribute('aria-label','Ficha de seguimiento seleccionada');
 body.append(listings,detail);
 const orgPanel=el('section',null,'hys250-org');orgPanel.hidden=true;
 view.append(heading,summary,filters,info,body,orgPanel);
 panel.prepend(view);
 let chosen='',allowedAreas=new Set(),hierarchy=[],lastScope='',busy=false;
 let orgLoaded=false,orgLoading=false,orgData=[],orgUsers=[],orgAreas=[],orgError='';
 const context=()=>root.__REPORTES_HYS_ACCESS__||null;
 const role=()=>context()?.profile?.rol||'usuario';
 async function validateScopes(){
  if(busy)return;
  const c=context(),uid=userIdReader();
  if(!c||!uid)return;
  const idScope=[uid,module,role(),root.HYS242_DEPLOYMENT_READY===true].join(':');
  if(lastScope===idScope)return;
  lastScope=idScope;allowedAreas=new Set();hierarchy=[];
  if(root.HYS242_DEPLOYMENT_READY!==true||!root.reportesHysSupabase)return;
  busy=true;
  try{
   if(role()==='administrador_area'){
    const f=(c.facultades||[]).find(p=>p?.modulo===module);
    if(f?.facultades?.review===true&&f?.facultades?.view===true&&Array.isArray(f.areas_ids)&&f.areas_ids.length){
     const response=await root.reportesHysSupabase.from('areas_trabajo_v242').select('id,nombre,modulo').eq('modulo',module).in('id',f.areas_ids);
     if(!response.error){const valid=new Set(f.areas_ids);allowedAreas=new Set((response.data||[]).filter(a=>valid.has(a.id)).map(a=>normal(a.nombre)));}
    }
   } else if(role()==='supervisor'){
    const response=await root.reportesHysSupabase.rpc('hys250_equipo_autorizado',{p_modulo:module});
    if(!response.error&&Array.isArray(response.data)){
     hierarchy=response.data.filter(p=>p.supervisor_id===uid&&p.modulo===module&&p.area_nombre&&p.subordinado_id);
    }
   }
  }catch{/* Sin confirmación de servidor: acceso propio solamente. */}
  finally{busy=false;render();}
 }
 function makeMetric(label,n,group){
  const div=el('div',null,'hys250-metric hys250-metric-'+group);
  div.append(el('strong',String(n),'hys250-metric-number'),el('span',label,'hys250-metric-label'));return div;
 }
 function renderDetail(report,item){
  detail.replaceChildren();
  if(!item){detail.append(el('h3','Selecciona un pendiente'),el('p','Aquí aparecerá su ficha individual de seguimiento.','hys250-muted'));return;}
  const title=el('div',null,'hys250-detail-head');
  const left=el('div');left.append(el('span',TYPES[item.kind]||'Pendiente','hys250-eyebrow'),el('h3',txt(item.title,180)||'Pendiente'));
  title.append(left,el('span',state(item),'hys250-tag '+(isOverdue(item)?'danger':isSoon(item)?'warning':'muted')));
  detail.append(title);
  const tabs=el('div',null,'hys250-tabs');
  const content=el('div',null,'hys250-content');
  const choices=[['Seguimiento','followup'],['Notificaciones','notifications'],['Historial','history']];
  let activeTab='followup';
  const draw=()=>{
   content.replaceChildren();
   for(const btn of tabs.querySelectorAll('button')){const active=btn.dataset.tab===activeTab;btn.classList.toggle('selected',active);btn.setAttribute('aria-selected',String(active));}
   if(activeTab==='notifications'){
    content.append(el('h4','Notificaciones del pendiente'),el('p','No hay confirmación de avisos enviados. Los recordatorios y notificaciones reales requieren un servicio autorizado.','hys250-muted'));
    return;
   }
   if(activeTab==='history'){
    content.append(el('h4','Historial de seguimiento'),el('p','Los cambios de estado, responsables y evidencias solo se considerarán confirmados cuando exista auditoría respaldada por el servidor.','hys250-muted'));
    return;
   }
   const fields=el('dl',null,'hys250-fields');
   const f=(label,value)=>{const row=el('div',null,'hys250-field');row.append(el('dt',label),el('dd',value));fields.append(row);};
   f('Responsable',txt(item.assignedName,160)||'Sin asignar');
   f('Área',areaName(report,item));
   f('Fecha compromiso',dateText(item.dueDate));
   f('Estado',LABELS[item.status]||'Por revisar');
   f('Prioridad',priority(report,item));
   f('Situación de plazo',state(item));
   content.append(fields,el('h4','Medida propuesta / Actividad'),el('p',txt(item.description,650)||'No se registró una descripción.','hys250-description'));
   const evidence=el('div',null,'hys250-evidence');
   evidence.append(el('h4','Evidencia fotográfica'),el('p','Las fotografías registradas permanecen vinculadas al informe original. No se permiten nuevas cargas desde esta vista de consulta.','hys250-muted'));
   content.append(evidence);
   if(item.kind==='finding'&&role()==='administrador_global'&&root.Hys243FindingDetail?.detailRow){
    const rows=report?.data?.findings||[];
    const i=item.sourceId?rows.findIndex(r=>Array.isArray(r)&&r[6]?.findingId===item.sourceId):-1;
    const index=i>=0?i:(item.key.startsWith('hallazgo:local-')?Number(item.key.slice(15)):-1);
    if(Number.isInteger(index)&&index>=0&&Array.isArray(rows[index])){
      const details=el('details',null,'hys250-original');
      details.append(el('summary','Ver detalle original y acciones registradas'));
      const table=el('table',null,'hys246-embedded-followup');
      const tbody=el('tbody');tbody.innerHTML=root.Hys243FindingDetail.detailRow(rows[index],index,1);
      table.append(tbody);details.append(table);content.append(details);
    }
   }
   content.append(el('p','Vista de consulta. No ejecuta, aprueba ni cierra pendientes sin autorización y auditoría verificadas en Supabase.','hys250-caution'));
  };
  for(const [label,key] of choices){const btn=el('button',label);btn.type='button';btn.dataset.tab=key;btn.setAttribute('role','tab');btn.addEventListener('click',()=>{activeTab=key;draw();});tabs.append(btn);}
  tabs.setAttribute('role','tablist');detail.append(tabs,content);draw();
 }

 async function loadOrg(){
  if(orgLoading||orgLoaded)return;
  const c=context();
  if(c?.profile?.rol!=='administrador_global'||c.profile.activo!==true||
     root.HYS242_DEPLOYMENT_READY!==true||!root.reportesHysSupabase)return;
  orgLoading=true;orgError='';
  try{
   const api=root.reportesHysSupabase;
   const [u,a,h]=await Promise.all([
    api.rpc('hys242_listar_usuarios'),
    api.from('areas_trabajo_v242').select('id,nombre,modulo,activa').eq('modulo',module).eq('activa',true).order('nombre'),
    api.rpc('hys250_equipo_autorizado',{p_modulo:module})
   ]);
   if(u.error||a.error||h.error)throw u.error||a.error||h.error;
   if(!Array.isArray(u.data)||!Array.isArray(a.data)||!Array.isArray(h.data))throw Error('El servidor no devolvió un directorio válido');
   orgUsers=u.data.filter(p=>p.activo===true&&p.usuario_id&&p.nombre);
   orgAreas=a.data;orgData=h.data;orgLoaded=true;
  }catch(error){orgError='El organigrama todavía no está habilitado o autorizado en Supabase.';orgLoaded=false;}
  finally{orgLoading=false;paint();}
 }
 function renderOrg(scope){
  orgPanel.replaceChildren();orgPanel.hidden=scope.role!=='administrador_global';
  if(orgPanel.hidden)return;
  const head=el('div',null,'hys250-org-head');
  head.append(el('h3','Organigrama y personal a cargo'),el('span','Solo administrador general','hys250-org-label'));
  orgPanel.append(head,el('p','La jerarquía define qué personal puede revisar cada supervisor por módulo y área. La relación es directa: el supervisor eléctrico no podrá revisar trabajadores asignados a otros supervisores.','hys250-muted'));
  const tree=el('div',null,'hys250-org-tree');
  tree.append(el('div','Administrador general','hys250-org-node'),
   el('div','Administradores autorizados por área','hys250-org-node'),
   el('div','Supervisor → Personal directo','hys250-org-node'));
  orgPanel.append(tree);
  const ready=root.HYS242_DEPLOYMENT_READY===true&&orgLoaded&&
    context()?.profile?.rol==='administrador_global';
  if(root.HYS242_DEPLOYMENT_READY===true&&!orgLoading&&!orgLoaded&&!orgError)void loadOrg();
  const label=el('p',ready?'Relaciones vigentes y administración auditada.':orgLoading?'Consultando directorio y relaciones autorizadas…':orgError||'Configuración pendiente: falta habilitar la integración aislada de organigrama en Supabase.','hys250-muted');
  orgPanel.append(label);
  const form=el('form',null,'hys250-org-form');form.setAttribute('aria-label','Vincular supervisor con personal a cargo');
  const control=(title,choices)=>{
   const wrapper=el('label',title,'hys250-org-field');
   const select=el('select');select.required=true;select.disabled=!ready;
   select.add(new Option('Seleccione…',''));
   for(const option of choices)select.add(new Option(option.label,option.value));
   wrapper.append(select);form.append(wrapper);return select;
  };
  const area=control('Área de trabajo',orgAreas.map(a=>({value:a.id,label:a.nombre})));
  const leaders=orgUsers.filter(p=>['supervisor','administrador_area'].includes(p.rol));
  const supervisor=control('Supervisor responsable',leaders.map(p=>({value:p.usuario_id,label:p.nombre})));
  const worker=control('Personal a cargo',orgUsers.map(p=>({value:p.usuario_id,label:p.nombre+' · '+p.rol})));
  const action=control('Acción',[{value:'assign',label:'Asignar o actualizar'},{value:'disable',label:'Desactivar relación'}]);
  const motiveLabel=el('label','Motivo obligatorio','hys250-org-field');
  const reason=el('input');reason.type='text';reason.maxLength=500;reason.minLength=5;reason.required=true;reason.disabled=!ready;
  reason.placeholder='Motivo de asignación o cambio';
  motiveLabel.append(reason);form.append(motiveLabel);
  const submit=el('button','Guardar relación auditada','hys250-org-save');submit.type='submit';submit.disabled=!ready;form.append(submit);
  const feedback=el('p','No se generan asignaciones sin confirmación del servidor.','hys250-muted');feedback.setAttribute('role','status');form.append(feedback);
  form.addEventListener('submit',async event=>{
   event.preventDefault();
   if(!ready||context()?.profile?.rol!=='administrador_global'||!root.reportesHysSupabase)return;
   if(!area.value||!supervisor.value||!worker.value||supervisor.value===worker.value||reason.value.trim().length<5){feedback.textContent='Selecciona un área, dos personas distintas y un motivo válido.';return;}
   submit.disabled=true;
   try{
    const r=await root.reportesHysSupabase.rpc('hys250_asignar_supervision',{
     p_modulo:module,p_area_id:area.value,p_supervisor_id:supervisor.value,
     p_subordinado_id:worker.value,p_activo:action.value==='assign',p_motivo:reason.value.trim()
    });
    if(r.error||r.data!==true)throw r.error||Error('Confirmación ausente');
    feedback.textContent='Relación confirmada y auditada por el servidor.';
    orgLoaded=false;orgError='';void loadOrg();
   }catch{feedback.textContent='No se aplicó ningún cambio: la autorización o validación del servidor no fue confirmada.';}
   finally{submit.disabled=false;}
  });
  orgPanel.append(form);
  if(orgData.length){
   const list=el('div',null,'hys250-org-records');
   list.append(el('h4','Relaciones directas autorizadas · '+module));
   for(const r of orgData.slice(0,100)){
    const name=uid=>orgUsers.find(p=>p.usuario_id===uid)?.nombre||'Persona autorizada';
    list.append(el('p',name(r.supervisor_id)+' → '+name(r.subordinado_id)+' · '+(r.area_nombre||''),'hys250-org-record'));
   }
   orgPanel.append(list);
  }
 }
 function paint(){
  if(!view.isConnected)return;
  const report=reportReader(),c=context(),uid=userIdReader();
  const scope=readAllowed(report,module,uid,c,allowedAreas,hierarchy,root.HYS245_REVIEW_ONLY===true);
  const all=scope.items.slice().sort((a,b)=>urgency(a)-urgency(b)||(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
  scopeRole(scope);
  summary.replaceChildren(
   makeMetric('Vencidos',all.filter(isOverdue).length,'danger'),
   makeMetric('Por vencer',all.filter(isSoon).length,'warning'),
   makeMetric('En curso',all.filter(x=>x.status==='in_progress').length,'blue'),
   makeMetric('En revisión',all.filter(isReview).length,'slate')
  );
  const q=normal(search.value);
  const visible=all.filter(item=>{
   if(type.value!=='all'&&item.kind!==type.value)return false;
   if(status.value==='overdue'&&!isOverdue(item))return false;
   if(status.value==='soon'&&!isSoon(item))return false;
   if(status.value==='process'&&item.status!=='in_progress')return false;
   if(status.value==='review'&&!isReview(item))return false;
   if(status.value==='pending'&&!['planning','pending','needs_classification','rejected'].includes(item.status))return false;
   return !q||normal([item.title,item.description,item.assignedName,areaName(report,item),TYPES[item.kind]].join(' ')).includes(q);
  });
  info.textContent=visible.length+' de '+all.length+' pendientes del alcance autorizado. '+(scope.notice||'');
  cards.replaceChildren();
  if(!visible.length){cards.append(el('p',all.length?'No hay pendientes con estos filtros.':'No hay pendientes visibles para tu cuenta y ámbito autorizado.','hys250-muted'));chosen='';renderDetail(report,null);renderOrg(scope);return;}
  if(!visible.some(x=>x.key===chosen))chosen=visible[0].key;
  for(const item of visible){
   const button=el('button',null,'hys250-card'+(chosen===item.key?' selected':''));button.type='button';
   button.setAttribute('aria-pressed',chosen===item.key?'true':'false');
   const header=el('div',null,'hys250-card-header');
   header.append(el('span',TYPES[item.kind]||'Pendiente','hys250-card-kind'),el('span',state(item),'hys250-tag '+(isOverdue(item)?'danger':isSoon(item)?'warning':'muted')));
   button.append(header,el('strong',txt(item.title,160),'hys250-card-title'));
   const meta=el('div',null,'hys250-card-meta');
   meta.append(el('span','Área: '+areaName(report,item)),el('span','Responsable: '+(item.assignedName||'Sin asignar')),el('span','Compromiso: '+dateText(item.dueDate)));
   button.append(meta,el('span','Ver detalle y seguimiento ›','hys250-card-link'));
   button.addEventListener('click',()=>{chosen=item.key;paint();detail.querySelector('h3')?.focus?.();});
   cards.append(button);
  }
  renderDetail(report,visible.find(x=>x.key===chosen));
  renderOrg(scope);
 }
 function scopeRole(scope){
  scope.role=scope.role||role();
  const names={administrador_global:'Administrador general · Vista global',administrador_area:'Administrador de área · Ámbito autorizado',supervisor:'Supervisor · Personal a cargo',usuario:'Pendientes personales',demostracion:'Vista de demostración'};
  documentRole.textContent=names[scope.role]||'Consulta personal';
 }
 const documentRole=scope;
 const handler=()=>paint();
 search.addEventListener('input',handler);status.addEventListener('change',handler);type.addEventListener('change',handler);
 refreshButton.addEventListener('click',()=>{lastScope='';void validateScopes().then(paint);});
 const previousOpen=root.Hys246PendingDetail?.open;
 if(typeof previousOpen==='function')root.Hys246PendingDetail.open=item=>open(item);
 function open(item){
  const report=reportReader(),c=context(),uid=userIdReader();
  const scope=readAllowed(report,module,uid,c,allowedAreas,hierarchy,root.HYS245_REVIEW_ONLY===true);
  if(!item||!scope.items.some(x=>x.key===item.key))return false;
  chosen=item.key;root.Hys242Bridge?.showTab?.('pendientes');paint();
  view.scrollIntoView?.({behavior:'smooth',block:'start'});return true;
 }
 const previousRefresh=root.Hys246PendingDetail?.refresh;
 if(typeof previousRefresh==='function')root.Hys246PendingDetail.refresh=()=>{previousRefresh();paint();void validateScopes();};
 root.document.addEventListener('click',e=>{if(e.target?.closest?.('.nav[data-tab="pendientes"]')){void validateScopes();paint();}});
 root.addEventListener('reportes-hys-data-saved',paint);
 instance={view,paint,open,validateScopes,module};paint();void validateScopes();
 return view;
}
const api={mount,readAllowed,refresh:()=>instance?.paint(),open:item=>instance?.open(item)===true};
root.Hys250Dashboard=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
