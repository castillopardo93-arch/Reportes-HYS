/* Reportes HYS v308 — circuito de revisión experimental SIN persistencia real.
   Acceso de elaboración a perfiles activos. No hay escrituras a Supabase, localStorage,
   IndexedDB, cookies ni exportación de datos de accidentes en esta versión. */
(function(root){
 'use strict';
 const d=root.document,host=root.Hys305Investigation;
 if(!d||!host||new URLSearchParams(root.location.search).get('embedded')==='otros')return;
 const $=id=>d.getElementById(id);
 const demo=root.HYS308_DEMO_PAGE===true;
 const fakeUsers=[
  {id:'demo-autor',name:'Elaborador de prueba',role:'usuario',reviewer:false},
  {id:'demo-supervisor',name:'Supervisor de prueba',role:'supervisor',reviewer:true,canCloseFlash:false,canCloseFinal:false},
  {id:'demo-hys',name:'Revisor HYS de prueba',role:'supervisor',reviewer:true,canCloseFlash:true,canCloseFinal:false},
  {id:'demo-admin',name:'Administrador de prueba',role:'administrador',reviewer:true,canCloseFlash:true,canCloseFinal:true}
 ];
 let fakeId='demo-autor',serial=0,selectedId=null,selectedKind=null,baseline='',search='',filter='todos';
 let cases=[];
 const el=(tag,cls,value)=>{
  const e=d.createElement(tag);
  if(cls)e.className=cls;
  if(value!==undefined)e.textContent=String(value);
  return e;
 };
 const actor=()=>{
  if(demo)return fakeUsers.find(x=>x.id===fakeId);
  const a=root.__REPORTES_HYS_ACCESS__;
  if(!a?.userId||a.profile?.activo!==true)return null;
  return {id:a.userId,name:a.profile.nombre||'Usuario registrado',role:a.profile.rol,reviewer:false};
 };
 const active=()=>!!actor();
 // Las facultades se administran en la lista existente de Administradores.
 // No hay panel paralelo de autorizaciones en esta versión.
 const eligibleReviewers=()=>demo?fakeUsers.filter(x=>x.reviewer):[];
 const canReview=who=>who?.reviewer===true;
 const findCase=id=>cases.find(x=>x.id===id);
 const formFor=kind=>$(kind==='flash'?'hys306FlashForm':'hys306FinalForm');
 const nameOf=id=>fakeUsers.find(x=>x.id===id)?.name||(cases.find(x=>x.creatorId===id)?.creatorName)||'Sin asignar';
 const statusName={no_iniciado:'Sin iniciar',borrador:'Borrador',en_revision:'En revisión',correccion:'Corrección solicitada',aprobado:'Aprobado'};
 // Los cierres simulados no otorgan ni modifican permisos de usuarios reales.
 const canActorClose=(who,kind)=>!!(demo&&who&&(kind==='flash'?who.canCloseFlash===true:who.canCloseFinal===true));
 // Reglas mínimas de prueba: contrastar las obligatoriedades con HSS-RGT-007
 // antes de convertir este catálogo en validación oficial de producción.
 const flashRequired=[
  {key:'tipo_incidente',label:'Tipo de incidente'},
  {key:'probabilidad',label:'Probabilidad de lesión con tiempo perdido'},
  {key:'fecha_ocurrencia',label:'Fecha de ocurrencia'},
  {key:'hora',label:'Hora del incidente'},
  {key:'area_proyecto',label:'Área del proyecto'},
  {key:'ubicacion',label:'Ubicación específica',min:5},
  {key:'involucrado',label:'Nombre del involucrado',min:3},
  {key:'cargo',label:'Cargo del involucrado',min:2},
  {key:'primeros_auxilios',label:'¿Se dieron primeros auxilios?'},
  {key:'ambulancia',label:'¿Se llamó a la ambulancia?'},
  {key:'hospital',label:'¿Necesita tratamiento en hospital?'},
  {key:'existen_testigos',label:'¿Existen testigos?'},
  {key:'hechos',label:'Descripción de los hechos conocidos',min:15},
  {key:'causas_aparentes',label:'Causas aparentes inmediatas',min:10},
  {key:'acciones_inmediatas',label:'Acciones tomadas inmediatamente',min:10},
  {key:'reportado_por',label:'Incidente reportado por',min:3},
  {key:'preparado_por',label:'Informe preparado por',min:3}
 ];
 // Reglas mínimas PROVISIONALES para investigar en este laboratorio.
 // El catálogo oficial de obligatoriedades requerirá aprobación antes de producción.
 const finalRequired=[
  {key:'involucrados',label:'Nombre de los involucrados',min:3},
  {key:'fecha_incidente',label:'Fecha del incidente'},
  {key:'tipo_incidente',label:'Tipo de incidente'},
  {key:'lugar_incidente',label:'Lugar o área del incidente',min:2},
  {key:'descripcion',label:'Descripción detallada del evento',min:20},
  {key:'equipo_investigador',label:'Equipo investigador — nombres y cargos',min:5}
 ];
 const dateKeys=new Set(['fecha_ocurrencia','fecha_incidente']);
 function validIsoCalendar(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const parsed=new Date(value+'T12:00:00Z');
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
 }
 function formIssues(kind,data){
  if(kind!=='flash'&&kind!=='final')return [];
  const required=kind==='flash'?flashRequired:finalRequired;
  const issues=required.flatMap(rule=>{
   const value=String(data?.[rule.key]??'').trim();
   if(!value)return [{...rule,reason:'Obligatorio'}];
   if(rule.min&&value.length<rule.min)return [{...rule,reason:'Mínimo '+rule.min+' caracteres'}];
   if(dateKeys.has(rule.key)&&!validIsoCalendar(value))
    return [{...rule,reason:'Fecha de calendario no válida'}];
   return [];
  });
  if(kind==='final'){
   const causeKeys=['condiciones_subestandar','acciones_subestandar','factores_trabajo','factores_personales','requerimientos_sistema'];
   if(!causeKeys.some(key=>String(data?.[key]??'').trim()))
    issues.push({key:'condiciones_subestandar',label:'Punto 9 — análisis de causas',
     reason:'Registra al menos una causa en las cinco categorías'});
   const plans=Object.keys(data||{}).filter(key=>/^action_\d+_descripcion$/.test(key));
   if(!plans.some(key=>String(data[key]??'').trim().length>=10))
    issues.push({key:'action_1_descripcion',label:'Punto 10 — plan de acción recomendado',
     reason:'Describe al menos un plan (mínimo 10 caracteres)'});
  }
  return issues;
 }
 const submittedFlash=c=>!!c?.flash?.submittedAt &&
  ['en_revision','correccion','aprobado'].includes(c.flash.status);
 function clearIssueView(form){
  form.querySelector('.hys308-required-summary')?.remove();
  form.querySelectorAll('[aria-invalid="true"]').forEach(node=>node.removeAttribute('aria-invalid'));
  form.querySelectorAll('.hys308-required-field').forEach(node=>{
   node.classList.remove('hys308-required-field');
   node.querySelector('.hys308-error-detail')?.remove();
  });
  form.querySelectorAll('[aria-describedby^="hys308-error-"]').forEach(node=>node.removeAttribute('aria-describedby'));
  form.querySelector('.hys308-required-complete')?.remove();
  delete form.dataset.hys308Validate;
 }
 function showIssues(kind,issues,focus=true){
  const form=formFor(kind);
  const previouslyInvalid=!!form.dataset.hys308Validate;
  // Validación en vivo: mantener rojo hasta corregir; no ocultar avisos
  // solo porque el usuario escribió un carácter o cambió un selector.
  const oldSummary=form.querySelector('.hys308-required-summary');
  oldSummary?.remove();
  form.querySelectorAll('[aria-invalid="true"]').forEach(node=>node.removeAttribute('aria-invalid'));
  form.querySelectorAll('.hys308-required-field').forEach(node=>{
   node.classList.remove('hys308-required-field');
   node.querySelector('.hys308-error-detail')?.remove();
  });
  form.querySelectorAll('[aria-describedby^="hys308-error-"]').forEach(node=>node.removeAttribute('aria-describedby'));
  form.dataset.hys308Validate='true';
  if(!issues.length){
   delete form.dataset.hys308Validate;
   if(previouslyInvalid&&!focus){
    const ok=el('p','hys308-required-complete','Todos los antecedentes obligatorios están completos. Puedes enviar a revisión.');
    form.prepend(ok);
   }
   return;
  }
  form.querySelector('.hys308-required-complete')?.remove();
  const summary=el('div','hys308-required-summary');
  summary.setAttribute('role','alert');summary.setAttribute('aria-live',focus?'assertive':'polite');
  summary.append(el('strong',null,'Faltan '+issues.length+' antecedentes para enviar '+(kind==='flash'?'Flash Report':'Final Report')+'.'));
  summary.append(el('p',null,'Los campos pendientes están marcados en rojo. Puedes guardar un borrador y completarlos después.'));
  const list=el('ul');
  for(const issue of issues){
   const line=el('li',null,issue.label+' — '+issue.reason);
   list.append(line);
   const control=[...form.querySelectorAll('[name]')].find(node=>node.name===issue.key);
   if(control){
    control.setAttribute('aria-invalid','true');
    const holder=control.closest('.hys306-field');
    holder?.classList.add('hys308-required-field');
    if(holder){
     const error=el('small','hys308-error-detail','⚠ '+issue.reason);
     error.id='hys308-error-'+kind+'-'+issue.key;
     holder.append(error);
     control.setAttribute('aria-describedby',error.id);
    }
   }
  }
  summary.append(list);
  const banner=form.querySelector('.hys306-report-banner');
  if(banner)banner.insertAdjacentElement('afterend',summary);else form.prepend(summary);
  if(focus){
   summary.scrollIntoView?.({block:'start',behavior:'smooth'});
   form.querySelector('[aria-invalid="true"]')?.focus?.({preventScroll:true});
  }
 }
 function tellBlockedFinal(){
  root.alert?.('Final Report se habilita cuando el Flash Report tiene los antecedentes mínimos completos y fue enviado a revisión. Puedes guardar un borrador incompleto y continuar después.');
 }
 const panel=$('hys305Investigation');
 const cards=$('hys306Cards'),grid=cards?.querySelector('.hys306-choice-grid');
 const workspace=$('hys306Workspace'),main=panel?.querySelector('.hys305-content');
 const fForm=formFor('flash'),nForm=formFor('final');
 if(!panel||!cards||!grid||!workspace||!main||!fForm||!nForm)return;
 const note=panel.querySelector('.hys306-notice p');
 if(note)note.textContent='DESARROLLO v309: puedes probar borradores, envío, revisiones y seguimiento con datos ficticios. Los informes solo permanecen en memoria hasta recargar la página. NO ingreses datos reales. No se envían mensajes ni se guardan en Supabase.';
 const finalDescription=cards.querySelector('#hys306OpenFinal .hys306-choice-desc');
 if(finalDescription)finalDescription.textContent='Se inicia desde Seguimiento Flash, cuando el Flash Report tiene los antecedentes obligatorios y ya fue enviado a revisión. No requiere esperar su aprobación.';
 const card=el('button','hys306-choice');
 card.id='hys308OpenTracking';card.type='button';
 card.append(el('span','hys306-choice-icon','03'),el('strong',null,'Seguimiento Flash'),el('span','hys306-choice-desc','Consulta expedientes, responsable actual, revisiones, correcciones e historial de Flash y Final Report.'),el('span','hys306-choice-link','Abrir seguimiento'));
 grid.append(card);
 const tracking=el('section','hys308-tracking');tracking.id='hys308Tracking';tracking.hidden=true;
 const top=el('div','hys308-track-top');
 const back=el('button','hys306-back','← Volver a las tarjetas');back.type='button';back.id='hys308Back';
 const title=el('div');
 title.append(el('h2',null,'Seguimiento Flash'),el('p',null,'Investigaciones de prueba y revisiones pendientes; ninguna notificación es real.'));
 top.append(title,back);
 const controls=el('div','hys308-track-controls');
 const q=el('input');q.type='search';q.id='hys308Search';q.placeholder='Buscar número o responsable';q.autocomplete='off';
 const pickStatus=el('select');pickStatus.id='hys308Filter';
 for(const [value,label] of [['todos','Todos los estados'],['en_revision','En revisión'],['correccion','Corrección solicitada'],['borrador','Borradores'],['aprobado','Aprobados']]){
  const opt=el('option',null,label);opt.value=value;pickStatus.append(opt);
 }
 controls.append(q,pickStatus);
 const listing=el('div','hys308-list');listing.id='hys308List';
 tracking.append(top,controls,listing);main.append(tracking);
 q.addEventListener('input',()=>{search=q.value.trim().toLowerCase();renderTracking()});
 pickStatus.addEventListener('change',()=>{filter=pickStatus.value;renderTracking()});
 back.addEventListener('click',showCards);
 const workspaceTools=el('div','hys308-workspace-tools');
 workspaceTools.id='hys308WorkspaceTools';
 const caseLabel=el('p','hys308-case-label','Nuevo Flash Report de prueba');
 const begin=el('button','hys306-secondary','+ Nuevo Flash Report');
 begin.type='button';begin.id='hys308New';begin.addEventListener('click',()=>openNew('flash'));
 const goTracking=el('button','hys306-secondary','Seguimiento Flash');
 goTracking.type='button';goTracking.id='hys308Track';goTracking.addEventListener('click',showTracking);
 workspaceTools.append(caseLabel,begin,goTracking);
 workspace.insertBefore(workspaceTools,workspace.querySelector('.hys306-form-container'));
 const demoBar=el('div','hys308-demo-bar');demoBar.id='hys308DemoBar';
 if(demo){
  const lbl=el('label',null,'Simular sesión (solo laboratorio): ');
  const sel=el('select');sel.id='hys308DemoActor';
  fakeUsers.forEach(u=>{const opt=el('option',null,u.name+' · '+u.role);opt.value=u.id;sel.append(opt)});
  sel.addEventListener('change',()=>{
   if(!canLeave()){sel.value=fakeId;return}
   fakeId=sel.value;selectedId=null;selectedKind=null;baseline='';
   showTracking(true);
  });
  lbl.append(sel);demoBar.append(lbl);
 }else demoBar.append(el('p',null,'Etapa de pruebas: envío y guardado central pendientes de habilitación. No introducir datos personales ni antecedentes reales.'));
 main.insertBefore(demoBar,cards);
 const launch=el('button','hys308-launch','Investigación de accidente');
 launch.type='button';launch.id='hys308Launcher';
 launch.addEventListener('click',()=>{if(!active())return;host.open();showCards(true)});
 d.body.append(launch);
 function syncLauncher(){
  const a=root.__REPORTES_HYS_ACCESS__;
  const show=active()&&(demo||a?.profile?.rol!=='administrador_global'||!!a?.selectedModule);
  launch.hidden=!show;launch.style.display=show?'':'none';
  if(!active()&&!demo){cases=[];selectedId=null;selectedKind=null;baseline='';tracking.hidden=true}
 }
 function valueMap(form){
  const out={};
  for(const node of form.querySelectorAll('[name]')){
   if(node.type==='file')continue;
   out[node.name]=node.type==='checkbox'?!!node.checked:node.value;
  }
  return out;
 }
 function cleanForm(kind){
  const f=formFor(kind);
  clearIssueView(f);
  f.reset();f.querySelectorAll('textarea').forEach(t=>t.style.height='');
  f.querySelectorAll('.hys306-file-status').forEach(t=>t.textContent='Sin archivos adjuntos');
  if(kind==='final'){
   const rows=$('hys306ActionRows');
   if(rows){for(const row of [...rows.children].slice(3))row.remove()}
  }
 }
 function assignForm(kind,data){
  cleanForm(kind);
  const form=formFor(kind);
  if(kind==='final'){
   const rows=$('hys306ActionRows'),n=Math.max(3,...Object.keys(data||{}).map(k=>Number(/^action_(\d+)_/.exec(k)?.[1]||0)));
   while(rows?.children.length<n&&rows.children.length<40)$('hys306AddAction')?.click();
  }
  for(const control of form.querySelectorAll('[name]')){
   if(control.type==='file')continue;
   const value=data?.[control.name];
   if(value===undefined)continue;
   if(control.type==='checkbox')control.checked=!!value;
   else control.value=String(value);
  }
 }
 function stamp(){return new Date().toISOString()}
 function audit(c,kind,event,note,changes=[]){
  const who=actor();c.history.push({at:stamp(),kind,event,note:note||'',by:who?.name||'Sistema',byId:who?.id||null,changes});
  c.updatedAt=stamp();
 }
 function model(kind){return {status:kind==='flash'?'borrador':'no_iniciado',revision:0,data:{},reviewerId:null,reviewerName:null,sourceFlashRevision:0,submittedAt:null}}
 function createCase(){
  const who=actor();if(!who)throw Error('Debes iniciar sesión con una cuenta activa.');
  serial++;
  const id='SIM-'+stamp().slice(0,10).replaceAll('-','')+'-'+String(serial).padStart(4,'0');
  const c={id,creatorId:who.id,creatorName:who.name,createdAt:stamp(),updatedAt:stamp(),flash:model('flash'),final:model('final'),history:[]};
  cases.push(c);audit(c,'flash','Creación de investigación','Expediente de laboratorio; número no oficial');
  return c;
 }
 function currentCase(){return findCase(selectedId)}
 function canEdit(c,kind){
  const who=actor(),doc=c?.[kind];
  return !!who&&!!c&&who.id===c.creatorId&&['no_iniciado','borrador','correccion'].includes(doc.status);
 }
 function diff(before,after,form){
  const changes=[];
  const keys=new Set([...Object.keys(before||{}),...Object.keys(after||{})]);
  keys.forEach(k=>{
   if((before||{})[k]===(after||{})[k])return;
   const node=[...form.querySelectorAll('[name]')].find(x=>x.name===k);
   const label=node?.closest('.hys306-field')?.querySelector('.hys306-field-name')?.textContent||k;
   changes.push({field:label,name:k,before:before?.[k]??'',after:after?.[k]??''});
  });
  return changes;
 }
 function canLeave(){
  if(!selectedKind)return true;
  const now=JSON.stringify(valueMap(formFor(selectedKind)));
  if(now===baseline)return true;
  return typeof root.confirm==='function'?root.confirm('Hay cambios sin guardar en este formulario de prueba. ¿Salir y descartarlos?'):false;
 }
 function showCards(skipPrompt=false){
  if(!skipPrompt&&!canLeave())return false;
  selectedKind=null;selectedId=null;baseline='';
  tracking.hidden=true;host.showCards();return true;
 }
 function showTracking(skipPrompt=false){
  if(!skipPrompt&&!canLeave())return false;
  selectedKind=null;selectedId=null;baseline='';
  cards.hidden=true;workspace.hidden=true;tracking.hidden=false;
  renderTracking();tracking.scrollIntoView?.({block:'start'});
  return true;
 }
 function openNew(kind){
  if(!canLeave())return false;
  if(kind!=='flash'){showTracking(true);return false}
  selectedId=null;selectedKind='flash';
  cleanForm('flash');tracking.hidden=true;host.selectReport('flash');
  baseline=JSON.stringify(valueMap(fForm));syncEditor();
  return true;
 }
 function prefills(c){
  const f=c.flash.data||{};
  return {
   tipo_incidente:f.tipo_incidente||'',
   fecha_incidente:f.fecha_ocurrencia||'',
   involucrados:f.involucrado||'',
   rut:f.rut||'',cargo:f.cargo||'',
   lugar_incidente:f.area_proyecto||'',
   ubicacion:f.ubicacion||''
  };
 }
 function openCase(id,kind){
  const c=findCase(id),who=actor();
  if(!c||!who)return false;
  if(kind==='final'&&!submittedFlash(c)){tellBlockedFinal();return false}
  if(!demo&&c.creatorId!==who.id&&c[kind]?.reviewerId!==who.id)return false;
  if(!canLeave())return false;
  selectedId=id;selectedKind=kind;
  const doc=c[kind],data=kind==='final'&&doc.status==='no_iniciado'?prefills(c):doc.data;
  assignForm(kind,data);
  tracking.hidden=true;host.selectReport(kind);
  baseline=JSON.stringify(valueMap(formFor(kind)));
  syncEditor();
  return true;
 }
 function saveDraft(kind){
  if(!active()||selectedKind!==kind)return false;
  let c=currentCase();
  if(kind==='flash'&&!c){c=createCase();selectedId=c.id}
  if(kind==='final'&&!submittedFlash(c)){tellBlockedFinal();return false}
  if(!c||!canEdit(c,kind))return false;
  const doc=c[kind],next=valueMap(formFor(kind)),changes=diff(doc.data,next,formFor(kind));
  const first=doc.revision===0;
  if(first||changes.length){
   doc.revision++;
   doc.data=next;
   if(doc.status==='no_iniciado')doc.status='borrador';
   if(kind==='final')doc.sourceFlashRevision=c.flash.revision;
   audit(c,kind,first?'Primer borrador guardado':'Corrección de borrador',
     'Versión '+doc.revision+' guardada temporalmente en memoria',changes);
  }
  baseline=JSON.stringify(next);syncEditor();
  return true;
 }
 function send(kind){
  if(kind==='flash'||kind==='final'){
   const issues=formIssues(kind,valueMap(formFor(kind)));
   if(issues.length){showIssues(kind,issues);return false}
   clearIssueView(formFor(kind));
  }
  if(kind==='final'&&!submittedFlash(currentCase())){tellBlockedFinal();return false}
  const selected=$('hys308Reviewer'+(kind==='flash'?'Flash':'Final'));
  const reviewer=eligibleReviewers().find(x=>x.id===selected?.value);
  if(!reviewer){
   root.alert?.('No hay un revisor autorizado disponible en este entorno. Las asignaciones reales necesitan el servicio de permisos de Supabase.');
   return false;
  }
  if(!saveDraft(kind))return false;
  const c=currentCase(),doc=c?.[kind];
  if(!c||!canEdit(c,kind))return false;
  doc.status='en_revision';doc.reviewerId=reviewer.id;doc.reviewerName=reviewer.name;
  if(kind==='flash'&&!doc.submittedAt)doc.submittedAt=stamp();
  audit(c,kind,'Enviado a revisión','Asignado a '+reviewer.name);
  syncEditor();showTracking(true);return true;
 }
 function decide(id,kind,action,note='',nextReviewer=''){
  const c=findCase(id),doc=c?.[kind],who=actor();
  if(!c||!doc||doc.status!=='en_revision'||!canReview(who,kind)||who.id!==doc.reviewerId)return false;
  if(action==='return'){
   if(String(note).trim().length<10){root.alert?.('Indica una observación de al menos 10 caracteres.');return false}
   doc.status='correccion';doc.reviewerId=c.creatorId;doc.reviewerName=c.creatorName;
   audit(c,kind,'Devuelto para corrección',String(note).trim());
  }else if(action==='approve'){
   const next=eligibleReviewers().find(x=>x.id===nextReviewer&&x.id!==who.id);
   if(!next&&who.id===c.creatorId){
    root.alert?.('El elaborador no puede aprobar definitivamente su propio informe. Asigna un aprobador independiente.');
    return false;
   }
   if(kind==='final'&&c.flash.status!=='aprobado'&&!next){
    root.alert?.('Final Report no puede aprobarse definitivamente sin Flash Report aprobado.');
    return false;
   }
   if(kind==='final'&&!next&&doc.sourceFlashRevision!==c.flash.revision){
    root.alert?.('Final Report contiene antecedentes de una revisión anterior del Flash. Devuelve Final para corregirlo, reconciliar los cambios y reenviarlo antes de aprobar.');
    return false;
   }
   if(!next&&!canActorClose(who,kind)){
    root.alert?.('La revisión no otorga facultad de cierre. Debes enviar el informe a una persona autorizada para aprobarlo definitivamente.');
    return false;
   }
   if(next){
    doc.reviewerId=next.id;doc.reviewerName=next.name;
    audit(c,kind,'Revisión conforme y reasignación','Aprobación de '+who.name+'; siguiente revisor: '+next.name+'. '+String(note).trim());
   }else{
    doc.status='aprobado';doc.reviewerId=null;doc.reviewerName=null;
    audit(c,kind,'Aprobación del informe',String(note).trim()||'Revisor aprobó el documento');
   }
  }else return false;
  renderTracking();return true;
 }
 function syncEditor(){
  const c=currentCase(),kind=selectedKind;
  if(!kind)return;
  const who=actor(),doc=c?.[kind];
  const editing=kind==='flash'&&!c?!!who:canEdit(c,kind);
  caseLabel.textContent=c
    ?c.id+' · '+(kind==='flash'?'Flash Report':'Final Report')+' · '+statusName[doc.status]+' · Rev. '+doc.revision
    :'Nuevo Flash Report · aún sin número de prueba';
  for(const k of ['flash','final']){
   const form=formFor(k);
   const activeForm=kind===k,editable=activeForm&&editing;
   form.querySelectorAll('input,select,textarea').forEach(node=>{
    const codeSelector=node.matches('.hys306-cause-select');
    node.disabled=!editable||(codeSelector&&!root.Hys308CausaCatalogo?.ready);
   });
   const clr=form.querySelector('[data-clear-form]');if(clr)clr.disabled=!editable;
   if(k==='final'){$('hys306AddAction').disabled=!editable}
   const s=$('hys308Save'+(k==='flash'?'Flash':'Final'));
   const t=$('hys308Send'+(k==='flash'?'Flash':'Final'));
   const p=$('hys308Reviewer'+(k==='flash'?'Flash':'Final'));
   if(s)s.disabled=!editable;
   if(t)t.disabled=!editable||!eligibleReviewers().length;
   if(p)p.disabled=!editable||!eligibleReviewers().length;
  }
  begin.disabled=!who;
 }
 function statusTag(s){const e=el('span','hys308-state hys308-state-'+s,statusName[s]||s);return e}
 function renderTracking(){
  listing.replaceChildren();
  const who=actor();
  let view=cases.filter(c=>demo||c.creatorId===who?.id||c.flash.reviewerId===who?.id||c.final.reviewerId===who?.id);
  view=view.filter(c=>(filter==='todos'||c.flash.status===filter||c.final.status===filter)&&
   (c.id+' '+c.creatorName+' '+(c.flash.reviewerName||'')+' '+(c.final.reviewerName||'')).toLowerCase().includes(search));
  if(!view.length){listing.append(el('p','hys308-empty','No hay investigaciones que coincidan. Guarda un Flash Report de prueba para comenzar.'));return}
  view.slice().reverse().forEach(c=>{
   const item=el('article','hys308-item');const header=el('div','hys308-item-head');
   header.append(el('h3',null,c.id),el('small',null,'Elaborado por '+c.creatorName));
   item.append(header);
   const states=el('div','hys308-doc-states');
   for(const kind of ['flash','final']){
    const doc=c[kind],box=el('div','hys308-doc');
    box.append(el('strong',null,kind==='flash'?'Flash Report':'Final Report'),statusTag(doc.status));
    box.append(el('p',null,'Revisión '+doc.revision+' · En poder de: '+(doc.reviewerName||(doc.status==='aprobado'?'Cerrado':c.creatorName))));
    if(kind==='flash'&&doc.status==='borrador'){
     const missing=formIssues('flash',doc.data);
     box.append(el('p','hys308-warning',missing.length
      ?'Faltan '+missing.length+' campos obligatorios para enviar a revisión.'
      :'Antecedentes mínimos completos. Selecciona revisor y envía el Flash.'));
    }
    if(kind==='final'&&doc.status!=='no_iniciado'&&doc.sourceFlashRevision<c.flash.revision){
     box.append(el('p','hys308-warning','Flash Report cambió desde la última precarga; comparar antecedentes.'));
    }
    const open=el('button','hys306-secondary',kind==='flash'?'Abrir Flash':'Abrir Final');
    open.type='button';open.addEventListener('click',()=>openCase(c.id,kind));
    if(kind==='final'&&!submittedFlash(c)){
     box.append(el('p','hys308-warning','Bloqueado: completa el Flash y envíalo a revisión.'));
     open.disabled=true;
    }
    if(!demo&&c.creatorId!==who?.id&&doc.reviewerId!==who?.id)open.disabled=true;
    box.append(open);
    if(demo&&canReview(who,kind)&&doc.status==='en_revision'&&doc.reviewerId===who.id){
     const reviewerBox=el('div','hys308-review-actions');
     const observation=el('textarea');observation.placeholder='Observaciones y motivos de revisión';observation.rows=2;
     const next=el('select');next.append(el('option',null,'Aprobación final de este documento'));
     next.firstChild.value='';
     eligibleReviewers().filter(u=>u.id!==who.id).forEach(u=>{const opt=el('option',null,'Conforme y enviar a '+u.name);opt.value=u.id;next.append(opt)});
     const approve=el('button','hys306-secondary','Conformidad / siguiente revisor');
     approve.type='button';
     const updateApprove=()=>{
      const canClose=canActorClose(who,kind);
      approve.textContent=next.value?'Validar y derivar al siguiente revisor':
       canClose?'Aprobar y cerrar '+(kind==='flash'?'Flash Report':'Final Report'):
       'Selecciona el próximo revisor o aprobador';
      approve.disabled=!next.value&&!canClose;
     };
     next.addEventListener('change',updateApprove);updateApprove();
     approve.addEventListener('click',()=>decide(c.id,kind,'approve',observation.value,next.value));
     const ret=el('button','hys306-secondary','Devolver para corregir');
     ret.type='button';ret.addEventListener('click',()=>decide(c.id,kind,'return',observation.value));
     reviewerBox.append(observation,next,approve,ret);box.append(reviewerBox);
    }
    states.append(box);
   }
   item.append(states);
   const history=el('details','hys308-history');const summary=el('summary',null,'Historial de elaboración, revisiones y correcciones ('+c.history.length+')');
   history.append(summary);
   c.history.forEach(evt=>{
    const block=el('div','hys308-history-event');
    block.append(el('strong',null,evt.event+' · '+(evt.kind==='flash'?'Flash':'Final')),
      el('p',null,evt.by+' · '+new Date(evt.at).toLocaleString('es-CL')),
      el('p',null,evt.note||'Sin observaciones'));
    if(evt.changes?.length){
     const sub=el('details');sub.append(el('summary',null,'Cambios de campos ('+evt.changes.length+')'));
     evt.changes.forEach(change=>sub.append(el('p',null,change.field+': '+String(change.before||'—')+' → '+String(change.after||'—'))));
     block.append(sub);
    }
    history.append(block);
   });
   item.append(history);listing.append(item);
  });
 }
 for(const kind of ['flash','final']){
  const form=formFor(kind),footer=form.querySelector('.hys306-form-footer');
  footer.querySelector('.hys306-pending')?.remove();
  const suffix=kind==='flash'?'Flash':'Final';
  const save=el('button','hys306-secondary','Guardar borrador (prueba)');
  save.type='button';save.id='hys308Save'+suffix;save.addEventListener('click',()=>saveDraft(kind));
  const updateRequiredFeedback=()=>{
   if(form.dataset.hys308Validate==='true')
    showIssues(kind,formIssues(kind,valueMap(form)),false);
  };
  form.addEventListener('input',updateRequiredFeedback);
  form.addEventListener('change',updateRequiredFeedback);
  const lbl=el('div','hys308-assign');
  const select=el('select');select.id='hys308Reviewer'+suffix;
  const empty=el('option',null,demo?'Selecciona a quién enviar':'Revisores reales: integración pendiente');
  empty.value='';select.append(empty);
  eligibleReviewers().forEach(x=>{const option=el('option',null,x.name);option.value=x.id;select.append(option)});
  lbl.append(select);
  const sendBtn=el('button','hys306-secondary','Enviar a revisión (prueba)');
  sendBtn.type='button';sendBtn.id='hys308Send'+suffix;sendBtn.addEventListener('click',()=>send(kind));
  footer.append(save,lbl,sendBtn);
 }
 $('hys306OpenFlash').onclick=()=>openNew('flash');
 $('hys306OpenFinal').onclick=()=>showTracking();
 card.addEventListener('click',()=>showTracking());
 $('hys306BackCards').onclick=()=>showCards();
 root.addEventListener('reportes-hys-access-changing',()=>{
  if(demo)return;
  cases=[];selectedId=null;selectedKind=null;baseline='';
  tracking.hidden=true;
 });
 root.addEventListener('reportes-hys-access-changed',syncLauncher);
 root.Hys308Workflow={
  canLeave,showTracking,showCards,openNew,openCase,saveDraft,send,decide,formIssues,
  onClosed:()=>{selectedId=null;selectedKind=null;baseline='';tracking.hidden=true},
  sync:syncLauncher,isDemo:demo,serverStorageEnabled:false,
  state:()=>({cases:JSON.parse(JSON.stringify(cases)),selectedId,selectedKind,actor:actor()?.id||null})
 };
 syncLauncher();
 if(demo){
  host.open();
  showCards(true);
 }
})(window);
