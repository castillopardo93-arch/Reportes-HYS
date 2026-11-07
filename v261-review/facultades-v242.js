/* Reportes HYS v261 — Directorio de usuarios y ficha única de facultades.
 * APR y OTROS son identificadores internos; los nombres visibles vienen de Apariencia.
 * Sin efectos sobre usuarios al abrir, consultar, seleccionar o previsualizar.
 */
(function(){
'use strict';
if(window.__REPORTES_HYS_OTROS_EMBEDDED__||!document.getElementById('hysToolsOptions'))return;
const $=id=>document.getElementById(id);
const C=window.Hys259Access, A=window.Hys256Access, F=window.Hys261FacultyModel, M=C.modules;
const caps={view:'Consultar informes de otros usuarios',pdf:'Descargar PDF de otros usuarios',review:'Revisar y devolver informes',approve:'Aprobar informes',close:'Cerrar informes',editOthers:'Modificar informes ajenos con motivo',áreas:'Administrar areas de trabajo',users:'Administrar usuarios y supervisores',activation:'Activar o desactivar cuentas',audit:'Consultar auditoria'};
const dependent=['pdf','review','approve','close','editOthers'];
const access=()=>window.__REPORTES_HYS_ACCESS__;
const isGlobal=()=>access()?.profile?.activo===true&&access()?.profile?.rol==='administrador_global';
const canManage=()=>access()?.profile?.activo===true&&(isGlobal()||M.some(m=>A.can(access(),'users',m)));
const canEditModule=m=>isGlobal()||A.can(access(),'users',m);
const canArea=(m,id)=>C.canAssignArea(access(),m,id);
const el=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x};
const roleLabel=r=>({administrador_global:'Administrador general',administrador_area:'Administrador',supervisor:'Supervisor',usuario:'Usuario'}[r]||r||'Sin rol');
const panel=el('section');panel.id='facultadesPanel242';panel.hidden=true;
panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','facultadesTitle242');
panel.innerHTML='<div class="management-shell faculty-shell259"><header class="management-head"><div><h1 id="facultadesTitle242">Facultades de acceso</h1><p>Una persona, dos tarjetas y una sola ficha para todas las autorizaciones.</p></div><button class="btn" type="button" id="facultadesClose242">Cerrar</button></header><p id="facultadesStatus242" role="status" aria-live="polite"></p><section id="facultyDirectory261"><div class="faculty-directory-head261"><div><h2>Usuarios autorizados</h2><p>Selecciona una cuenta para configurar sus tarjetas, areas y atribuciones.</p></div><button type="button" class="btn" id="facultyRefresh261">Actualizar</button></div><div class="faculty-directory-filters261"><label>Buscar persona<input type="search" id="facultySearch261" placeholder="Nombre o rol…"></label><label>Acceso actual<select id="facultyFilter261"><option value="">Todas las cuentas</option><option value="APR">Prevencionista de riesgos</option><option value="OTROS">Supervisores, capataces y otros</option><option value="BOTH">Ambas tarjetas</option><option value="NONE">Sin tarjetas</option></select></label></div><p id="facultyDirectoryCount261" class="faculty-directory-count261"></p><div id="facultyDirectoryRows261"></div></section><section id="facultyDetail261" hidden><div class="faculty-detail-head261"><button id="facultyBack261" class="btn" type="button">Volver a usuarios</button><div><h2 id="facultyAccountName261"></h2><p id="facultyAccountRole261"></p></div></div><form id="facultadesForm242"><section class="faculty-card259"><h2>1. Tarjetas y áreas permitidas</h2><p>Cada tarjeta se configura de forma independiente. Todas las áreas incluye solo las áreas activas autorizadas actualmente.</p><div id="facultyCards261"></div></section><section class="faculty-card259" id="facultySpecial261" hidden><h2>2. Facultades especiales del Administrador</h2><p>Estas atribuciones se asignan por tarjeta y solo dentro de las áreas permitidas. No se duplican en Usuarios.</p><div id="facultySpecialCards261"></div></section><section class="faculty-card259"><h2 id="facultySummaryTitle261">Resumen antes de guardar</h2><div id="facultySummary261" aria-live="polite"></div><label>Motivo del cambio<input id="facultadesReason242" maxlength="500" required placeholder="Describe la razón de esta autorización…"></label><div class="faculty-actions259"><button class="btn primary" id="facultadesSave242" type="submit">Guardar facultades</button><button class="btn" type="button" id="facultyReset261">Descartar cambios</button></div><p id="facultySafety261">Los cambios deben confirmarse por el servidor y registrarse en auditoria. Esta copia de desarrollo no modifica produccion.</p></section></form></section></div>';
document.body.append(panel);
const button=el('button','hys-admin-open');button.type='button';button.hidden=true;button.title='Facultades de acceso';
button.innerHTML='<span class="tools-option-icon" aria-hidden="true">⚿</span><span class="tools-option-label">Facultades</span><span class="tools-option-full">Facultades de acceso</span>';
$('hysToolsOptions').append(button);
let seq=0,busy=false,users=[],account=null,areaRows=[],originalFac={},draftFac={},draftAccess={},baseline='',areaMode={},searchAreas={};
const status=msg=>{$('facultadesStatus242').textContent=msg};
const signature=()=>C.stable({a:draftAccess,f:draftFac});
const discard=()=>!account||baseline===signature()||confirm('Hay facultades sin guardar. ¿Deseas descartarlas?');
const isAdminTarget=()=>isGlobal()&&account?.rol==='administrador_area';
function enabled(m){return draftAccess[m]?.ver===true}
function currentAreas(m){return F.unique(draftAccess[m]?.areas)}
function allowedAreas(m){return F.availableAreas(areaRows,m,canArea)}
function scopeSpecial(m){return F.unique(draftFac[m]?.areas_ids)}
function updateScope(m,ids){
 const selection=F.unique(ids);
 if(!draftAccess[m])draftAccess[m]={ver:true,editar:false,áreas:[]};
 draftAccess[m].areas=selection;
 if(isAdminTarget()){if(!draftFac[m])draftFac[m]={areas_ids:[],facultades:{}};draftFac[m].areas_ids=[...selection]}
}
function makeCheckbox(labelText,checked,disabled,fn,className){
 const label=el('label',className||'faculty-check259'),input=el('input');input.type='checkbox';input.checked=checked;input.disabled=disabled;input.onchange=()=>fn(input.checked);
 label.append(input,document.createTextNode(labelText));return label;
}
function setBusy(on){busy=on;panel.querySelectorAll('button,input,select').forEach(node=>{node.disabled=on});if(!on)paintControls()}
function paintControls(){if(!account)return;const save=$('facultadesSave242');save.disabled=busy||!M.some(canEditModule);$('facultyReset261').disabled=busy}
function selectedMode(m){return areaMode[m]==='all'?'all':'selected'}
function renderAreaSelector(m,host){
 const ids=currentAreas(m),eligible=allowedAreas(m),mode=selectedMode(m);
 const control=el('fieldset','faculty-area-mode261');control.append(el('legend',null,'Áreas autorizadas'));
 for(const [key,labelText]of [['all','Todas las áreas activas'],['selected','Seleccionar áreas']]){
  const row=el('label','faculty-radio261'),input=el('input');input.type='radio';input.name='facultyAreaMode261_'+m;input.value=key;input.checked=mode===key;input.disabled=busy||!canEditModule(m);
  input.onchange=()=>{areaMode[m]=key;if(key==='all')updateScope(m,eligible.map(a=>a.id));renderCards();renderSpecial();renderSummary();};
  row.append(input,document.createTextNode(labelText));control.append(row);
 }
 host.append(control);
 const count=el('p','faculty-areas-count261',ids.length+' áreas seleccionadas'+(mode==='all'?' · todas las activas autorizadas':''));
 host.append(count);
 if(mode!=='selected')return;
 const chooser=el('div','faculty-picker261');
 const tools=el('div','faculty-picker-tools261');
 const input=el('input');input.type='search';input.placeholder='Buscar área por nombre…';input.setAttribute('aria-label','Buscar areas de '+C.label(m));input.value=searchAreas[m]||'';
 const copyBtn=el('button','btn','Copiar áreas de la otra tarjeta');copyBtn.type='button';copyBtn.disabled=busy||!canEditModule(m)||!M.some(other=>other!==m&&enabled(other));copyBtn.onclick=()=>{
  const source=M.find(x=>x!==m&&enabled(x));if(!source)return;
  const result=F.copyAreasByName(currentAreas(source),areaRows.filter(a=>a.modulo===source),areaRows.filter(a=>a.modulo===m),canArea,m);
  if(!result.ids.length){status('No existen áreas equivalentes y autorizadas en esta tarjeta.');return}
  if(!confirm('¿Copiar '+result.ids.length+' áreas coincidentes desde '+C.label(source)+'?'+(result.notFound.length?' Otras '+result.notFound.length+' no existen aqui.':'')))return;
  updateScope(m,result.ids);renderCards();renderSpecial();renderSummary();status('Áreas equivalentes copiadas por nombre; revisa la seleccion antes de guardar.');
 };
 tools.append(input,copyBtn);
 const list=el('div','faculty-areas-grid261');
 const paintList=()=>{
  list.replaceChildren();
  const search=F.canonical(searchAreas[m]||'');
  const entries=areaRows.filter(a=>a.modulo===m&&(a.activa||ids.includes(a.id))).filter(a=>F.canonical(a.nombre).includes(search));
  for(const a of entries){
   const wasSelected=currentAreas(m).includes(a.id);
   const check=makeCheckbox(a.nombre+(a.activa?'':' · inactiva'),wasSelected,busy||!canEditModule(m)||!canArea(m,a.id)||(!a.activa&&!wasSelected),on=>{
    updateScope(m,on?[...currentAreas(m),a.id]:currentAreas(m).filter(id=>id!==a.id));
    renderCards();renderSpecial();renderSummary();
   },'faculty-check259');
   list.append(check);
  }
  if(!entries.length)list.append(el('p',null,'No hay áreas coincidentes.'));
 };
 input.oninput=()=>{searchAreas[m]=input.value;paintList()};
 chooser.append(tools,list);host.append(chooser);paintList();
}
function renderCards(){
 const host=$('facultyCards261');host.replaceChildren();if(!account)return;
 for(const m of M){
  const card=el('article','faculty-module261'+(enabled(m)?' faculty-module-enabled261':''));
  const header=el('div','faculty-module-header261');
  const left=el('div'),title=makeCheckbox(C.label(m),enabled(m),busy||!canEditModule(m),on=>{
   if(on){if(!draftAccess[m])draftAccess[m]={ver:true,editar:false,áreas:[]};draftAccess[m].ver=true;areaMode[m]='selected'}
   else{delete draftAccess[m];if(isAdminTarget())draftFac[m]={areas_ids:[],facultades:{}}}
   renderCards();renderSpecial();renderSummary();
  },'faculty-module-title261');
  left.append(title,el('p',null,enabled(m)?'Tarjeta habilitada':'Tarjeta sin acceso'));header.append(left);
  const tag=el('span','faculty-state261',enabled(m)?'Autorizada':'Deshabilitada');header.append(tag);card.append(header);
  if(enabled(m)){
   card.append(makeCheckbox('Registrar y editar informes propios',draftAccess[m]?.editar===true,busy||!canEditModule(m)||!C.canGrantEdit(access(),m),on=>{
    if(draftAccess[m])draftAccess[m].editar=on;renderSummary();
   }));
   renderAreaSelector(m,card);
  }else{
   card.append(el('p','faculty-disabled-note261','Activa esta tarjeta para definir sus areas y permisos.'));
  }
  host.append(card);
 }
}
function renderSpecial(){
 const section=$('facultySpecial261'),host=$('facultySpecialCards261');host.replaceChildren();section.hidden=!isAdminTarget();if(section.hidden)return;
 for(const m of M){
  const details=el('details','faculty-special-module261');details.open=enabled(m);
  const title=el('summary',null,C.label(m)+(enabled(m)?'':' · sin acceso'));details.append(title);
  if(!enabled(m)){details.append(el('p',null,'Habilita primero esta tarjeta.'));host.append(details);continue}
  const grid=el('div','faculty-cap-grid261');
  for(const [key,label]of Object.entries(caps)){
   const on=draftFac[m]?.facultades?.[key]===true;
   grid.append(makeCheckbox(label,on,busy||!canEditModule(m),checked=>{
    if(!draftFac[m])draftFac[m]={areas_ids:currentAreas(m),facultades:{}};
    draftFac[m].facultades[key]=checked;
    if(checked&&dependent.includes(key))draftFac[m].facultades.view=true;
    if(key==='view'&&!checked)for(const dep of dependent)draftFac[m].facultades[dep]=false;
    renderSpecial();renderSummary();
   }));
  }
  details.append(grid);host.append(details);
 }
}
function renderSummary(){
 const host=$('facultySummary261');host.replaceChildren();if(!account)return;
 const summaries=F.summarize(draftAccess,draftFac,areaRows,C.label,canArea,areaMode);
 for(const item of summaries){
  const line=el('div','faculty-summary-line261');
  const label=el('div');label.append(el('strong',null,item.title));
  label.append(el('small',null,!item.enabled?'Sin acceso':(item.all?'Todas las áreas activas':'Areas: '+item.areaCount)+(item.edit?' · edición propia':' · solo consulta')));
  if(item.capabilities.length)label.append(el('small',null,item.capabilities.length+' facultades especiales'));
  line.append(label,el('span','faculty-summary-state261',item.enabled?'Habilitada':'Sin acceso'));host.append(line);
 }
 const steps=C.plan(account,draftAccess,originalFac,draftFac,isAdminTarget());
 const changed=steps.length>0;
 const msg=el('p','faculty-summary-result261',changed?steps.length+' operación(es) pendientes de confirmar con el servidor.':'Sin cambios respecto de la configuracion cargada.');
 host.append(msg);
 const special=$('facultySpecial261');$('facultySummaryTitle261').textContent=isAdminTarget()?'3. Revisar y guardar':'2. Revisar y guardar';
 $('facultySafety261').textContent=window.HYS261_ATOMIC_FACULTIES_READY===true?'Los cambios se enviaran al servicio transaccional cuando se habilite la gestion real.':'Modo de revision: las operaciones multiples esperan un servicio transaccional para impedir permisos parciales; no se escriben datos desde esta copia.';
 paintControls();
}
function renderDirectory(){
 const host=$('facultyDirectoryRows261');host.replaceChildren();
 const search=F.canonical($('facultySearch261').value),filter=$('facultyFilter261').value;
 const rows=users.filter(u=>{
  const active=M.filter(m=>u.ambitos?.[m]?.ver===true);
  if(filter==='BOTH'&&active.length!==2)return false;
  if(filter==='NONE'&&active.length!==0)return false;
  if(M.includes(filter)&&!active.includes(filter))return false;
  return !search||F.canonical([u.nombre,roleLabel(u.rol),...active.map(C.label)].join(' ')).includes(search);
 });
 $('facultyDirectoryCount261').textContent=rows.length+' de '+users.length+' usuarios';
 if(!rows.length){host.append(el('p',null,'No hay usuarios coincidentes.'));return}
 for(const u of rows){
  const card=el('article','faculty-person261');
  const main=el('div','faculty-person-info261');main.append(el('strong',null,u.nombre));
  main.append(el('small',null,roleLabel(u.rol)+(u.activo?' · Activo':' · Inactivo')));
  const accessLine=el('div','faculty-person-modules261');
  for(const m of M){
   const active=u.ambitos?.[m]?.ver===true,ids=F.unique(u.ambitos?.[m]?.areas);
   accessLine.append(el('span',active?'faculty-person-on261':'faculty-person-off261',C.label(m)+': '+(active?ids.length+' areas':'Sin acceso')));
  }
  main.append(accessLine);const go=el('button','btn','Configurar facultades');go.type='button';go.onclick=async()=>{if(!discard())return;await loadAccount(u.usuario_id)};
  card.append(main,go);host.append(card);
 }
}
async function loadDirectory(openUid){
 const n=++seq,actor=access()?.userId;
 status('Consultando las cuentas autorizadas…');setBusy(true);
 try{
  if(!canManage())throw Error('No tienes facultades de gestion');
  const r=await window.reportesHysSupabase.rpc('hys242_listar_usuarios');
  if(r.error)throw r.error;
  if(n!==seq||actor!==access()?.userId||!canManage())return;
  users=(r.data||[]).filter(u=>u.usuario_id!==actor&&u.rol!=='administrador_global');
  renderDirectory();
  if(openUid&&users.some(u=>u.usuario_id===openUid))await loadAccount(openUid);
  else{showDirectory();status('Selecciona el usuario que deseas configurar.')}
 }catch(e){if(n===seq){showDirectory();status('No se pudo consultar: '+e.message)}}finally{if(n===seq)setBusy(false)}
}
function showDirectory(){
 account=null;baseline='';$('facultyDirectory261').hidden=false;$('facultyDetail261').hidden=true;
}
async function loadAccount(uid){
 const n=++seq,actor=access()?.userId;
 if(!canManage()||!uid)return;setBusy(true);status('Consultando facultades actuales…');
 try{
  const r=await window.reportesHysSupabase.rpc('hys242_listar_usuarios');
  if(r.error)throw r.error;
  if(n!==seq||actor!==access()?.userId||!canManage())return;
  users=(r.data||[]).filter(u=>u.usuario_id!==actor&&u.rol!=='administrador_global');
  const u=users.find(x=>x.usuario_id===uid);if(!u)throw Error('La cuenta esta protegida o ya no pertenece a tu ámbito');
  const queries=[window.reportesHysSupabase.from('areas_trabajo_v242').select('id,nombre,activa,modulo').in('modulo',M).order('nombre')];
  if(isGlobal()&&u.rol==='administrador_area')queries.push(window.reportesHysSupabase.from('facultades_v242').select('*').eq('usuario_id',uid));
  const result=await Promise.all(queries);if(result.some(x=>x.error))throw result.find(x=>x.error).error;
  if(n!==seq||actor!==access()?.userId||!canManage())return;
  account=u;areaRows=result[0].data||[];originalFac=Object.fromEntries((result[1]?.data||[]).map(f=>[f.modulo,f]));
  draftAccess=C.clone(u.ambitos||{});draftFac={};
  for(const m of M){
   const fac=originalFac[m];
   draftFac[m]=fac?C.clone(fac):{areas_ids:F.unique(draftAccess[m]?.areas),facultades:{}};
  }
  areaMode={};searchAreas={};
  for(const m of M){const all=F.availableAreas(areaRows,m,canArea).map(a=>a.id);areaMode[m]=F.isAllSelected(draftAccess[m]?.areas,all)?'all':'selected'}
  baseline=signature();
  $('facultyAccountName261').textContent=u.nombre;
  $('facultyAccountRole261').textContent=roleLabel(u.rol)+' · '+(u.activo?'Cuenta activa':'Cuenta inactiva');
  $('facultadesReason242').value='';
  $('facultyDirectory261').hidden=true;$('facultyDetail261').hidden=false;
  renderCards();renderSpecial();renderSummary();
  status('Facultades cargadas. Ambas tarjetas pueden configurarse desde esta ficha.');
 }catch(e){if(n===seq){showDirectory();status('No se pudo abrir la ficha: '+e.message)}}finally{if(n===seq){setBusy(false);if(account){renderCards();renderSpecial();renderSummary()}}}
}
async function openFor(uid){
 if(!canManage())return;
 panel.hidden=false;$('facultySearch261').value='';$('facultyFilter261').value='';await loadDirectory(uid);
}
button.onclick=()=>openFor();window.Hys242Facultades={openFor};
$('facultySearch261').oninput=renderDirectory;$('facultyFilter261').onchange=renderDirectory;
$('facultyRefresh261').onclick=()=>loadDirectory();
$('facultyBack261').onclick=()=>{if(!discard())return;showDirectory();renderDirectory();status('Selecciona otro usuario para administrar sus facultades.')};
$('facultyReset261').onclick=()=>{if(!account||!discard())return;loadAccount(account.usuario_id)};
$('facultadesClose242').onclick=()=>{
 if(busy||!discard())return;
 seq++;panel.hidden=true;showDirectory();users=[];areaRows=[];draftAccess={};draftFac={};originalFac={};button.focus();
};
$('facultadesForm242').onsubmit=async event=>{
 event.preventDefault();
 if(!account||busy||!canManage())return;
 const actor=access()?.userId,uid=account.usuario_id,reason=$('facultadesReason242').value.trim();
 if(!reason){status('Indica el motivo del cambio.');$('facultadesReason242').focus();return}
 if(!M.some(enabled)){status('Habilita al menos una tarjeta. Para suspender una cuenta utiliza Usuarios.');return}
 const valid=F.validateAreas(draftAccess,areaRows,canArea,canEditModule);
 if(!valid.ok){status(C.label(valid.module)+': '+valid.error);return}
 for(const m of M){
  if(!canEditModule(m)&&C.stable(account.ambitos?.[m]||{})!==C.stable(draftAccess[m]||{})){status('No tienes atribuciones para modificar '+C.label(m));return}
  if(enabled(m)&&draftAccess[m]?.editar===true&&!C.canGrantEdit(access(),m)){status('No puedes conceder edición en '+C.label(m));return}
 }
 if(isAdminTarget())for(const m of M){
  if(!canEditModule(m)&&C.stable(C.normalizedScope(originalFac[m]))!==C.stable(C.normalizedScope(draftFac[m]))){
   status('No tienes atribuciones para modificar facultades especiales de '+C.label(m));return;
  }
 }
 const steps=C.plan(account,draftAccess,originalFac,draftFac,isAdminTarget());
 if(!steps.length){status('No hay cambios que guardar.');return}
 if(!A.userManagementEnabled()){status('Vista de revision: la gestión remota de usuarios sigue deshabilitada. Ningun permiso fue modificado.');return}
 if(steps.length>1&&window.HYS261_ATOMIC_FACULTIES_READY!==true){
  status('Guardado protegido: estas facultades requieren varias operaciones. No se ejecuta ningun cambio hasta habilitar una operacion transaccional unica en Supabase.');return;
 }
 if(!confirm('¿Confirmar '+steps.length+' cambio(s) de facultades para '+account.nombre+'? Esta accion quedara auditada.'))return;
 const n=++seq;setBusy(true);
 try{
  let result;
  if(steps.length>1){
   const revs=Object.fromEntries(M.map(m=>[m,originalFac[m]?.revision||0]));
   result=await window.reportesHysSupabase.rpc('hys261_guardar_facultades_atomico',{
    p_usuario:uid,p_ambitos:draftAccess,p_facultades:Object.fromEntries(M.map(m=>[m,C.normalizedScope(draftFac[m])])),p_revision_usuario:account.revision||0,p_revisiones_facultades:revs,p_motivo:reason
   });
  }else{
   const step=steps[0];
   result=step.kind==='access'
     ?await window.reportesHysSupabase.rpc('hys242_guardar_usuario',{p_usuario:uid,p_datos:step.datos,p_revision:step.revision,p_motivo:reason})
     :await window.reportesHysSupabase.rpc('hys242_asignar_facultades',{p_usuario:uid,p_modulo:step.module,p_áreas:step.scope.areas_ids,p_facultades:step.scope.facultades,p_revision:step.revision,p_motivo:reason});
  }
  if(result.error)throw result.error;
  if(n!==seq||actor!==access()?.userId||!canManage())return;
  status('Cambios confirmados por el servidor. Actualizando facultades…');
  await loadAccount(uid);
  if(actor===access()?.userId&&canManage())status('Facultades guardadas. El servidor confirmo las operaciones; el historial mantiene su registro.');
 }catch(e){if(n===seq&&actor===access()?.userId&&canManage()){status('No se confirmó el guardado: '+e.message+'. Consulta nuevamente el estado antes de reintentar.');await loadAccount(uid)}}finally{if(n===seq){setBusy(false);if(account)renderSummary()}}
};
const previousSync=window.reportesHysAdminSync;
window.reportesHysAdminSync=()=>{
 previousSync?.();
 const a=access(),visible=canManage()&&!a?.selectedModule&&document.body.classList.contains('module-choice');
 button.hidden=!visible;
 if(visible){$('hysToolsRail').hidden=false;document.body.classList.add('hys-tools-visible')}
 if(!canManage()){seq++;panel.hidden=true;showDirectory();users=[];areaRows=[];draftAccess={};draftFac={};originalFac={}}
};
window.reportesHysAdminSync();
})();
