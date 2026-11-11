/* Reportes HYS v265 — Gestión de usuarios centralizada.
 * Alta/edición secuencial, historial y acceso por Administrador general.
 * Solo el laboratorio FICTICIO tiene guardado. Producción no recibe nuevas escrituras.
 */
(function(root){
'use strict';
if(new URLSearchParams(location.search).get('embedded')==='otros')return;
const W=root.Hys265WorkerModel;
const nav=document.getElementById('hysToolsOptions');
if(!W||!nav)return;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=v=>JSON.parse(JSON.stringify(v));
const lab=root.HYS265_LAB_MODE===true&&!!root.Hys263Lab&&(/\/laboratorio-integral-v265\.html$/.test(location.pathname)||(root.HYS266_PREVIEW_ONLY===true&&/\/(?:v266-review|v267-review|v269-review|v270-review)\/index\.html$/.test(location.pathname)));
const labApi=lab?root.Hys263Lab:null;
const scopeNames={APR:'Prevencionistas',OTROS:'Supervisores, capataces y otros'};
const rights=[
 ['view','Consultar informes de otros usuarios'],
 ['pdf','Descargar PDF de otros usuarios'],
 ['review','Revisar y devolver informes'],
 ['approve','Aprobar informes'],
 ['close','Cerrar informes'],
 ['editOthers','Modificar informes de otros'],
 ['areas','Administrar áreas'],
 ['users','Administrar usuarios'],
 ['activation','Activar o desactivar cuentas'],
 ['audit','Consultar auditoría']
];
const employment=[
 ['nombre','Nombre completo','text',true],
 ['rut','RUT','text',true],
 ['cargo','Cargo','text',true],
 ['gerencia','Gerencia','text',true],
 ['empresa','Empresa empleadora / contratista','text',true],
 ['proyecto','Proyecto','text',true],
 ['celular','Celular','tel',false],
 ['correo_corporativo','Correo corporativo','email',false],
 ['correo_personal','Correo personal','email',false],
 ['fecha_ingreso','Fecha de ingreso','date',false],
 ['codigo_trabajador','Código interno del trabajador','text',false],
 ['unidad','Unidad organizacional','text',false]
];
const panel=document.createElement('section');
panel.id='hys265UsersPanel';
panel.hidden=true;
panel.setAttribute('role','dialog');
panel.setAttribute('aria-modal','true');
panel.setAttribute('aria-labelledby','hys265Title');
panel.innerHTML='<div class="hys265-shell"><header class="hys265-header"><div><p class="hys265-eyebrow">ADMINISTRADOR GENERAL</p><h1 id="hys265Title">Gestión de usuarios</h1><p>Ficha del trabajador, rol, tarjetas, áreas, facultades e historial en un solo lugar.</p></div><button id="hys265Close" type="button" class="btn">Cerrar</button></header><p class="hys265-notice" id="hys265Notice" role="status"></p><nav class="hys265-tabs" aria-label="Gestión de usuarios"><button data-hys265-tab="create" type="button">Crear usuario</button><button data-hys265-tab="directory" type="button">Usuarios registrados</button><button data-hys265-tab="roles" type="button">Crear y gestionar roles</button><button data-hys265-tab="history" type="button">Historial</button></nav><div id="hys265Content"></div></div>';
document.body.append(panel);
const state={tab:'directory',mode:'create',step:1,draft:null,selected:null,users:[],areas:[],faculties:[],history:[],filter:'',histFilter:'',dirty:false,loading:false,seq:0};
const notice=(msg,warning=false)=>{const e=$('hys265Notice');e.textContent=msg;e.dataset.warning=warning?'true':'false'};
const userName=id=>state.users.find(x=>x.usuario_id===id)?.nombre||id||'Sin registro';
function isGlobal(){const a=root.__REPORTES_HYS_ACCESS__;return a?.profile?.activo===true&&a.profile.rol==='administrador_global'}
function showInRail(){const a=root.__REPORTES_HYS_ACCESS__;return isGlobal()&&!a?.selectedModule&&document.body.classList.contains('module-choice')}
function newButton(id,icon,label,full){
 const b=document.createElement('button');b.id=id;b.type='button';b.className='hys-admin-open';b.hidden=!showInRail();
 b.innerHTML='<span class="tools-option-icon" aria-hidden="true">'+icon+'</span><span class="tools-option-label">'+label+'</span><span class="tools-option-full">'+full+'</span>';return b;
}
const usersButton=newButton('hys265OpenUsers','♙','Usuarios','Gestión de usuarios');
// Reutilizar exactamente la pestaña histórica de Áreas y opciones; no crear una copia.
const areasButton=$('manageOpen242');
const oldUsers=$('usersOpen258');
const oldButtons=[...nav.querySelectorAll('button.hys-admin-open')];
const follow=oldButtons.find(n=>n.textContent.includes('Seguimiento'));
const appearance=$('appearanceOpen242');
// Solo rótulos del menú: las ventanas originales, botones y funciones no cambian.
// Texto breve al contraer, nombre completo en una línea al expandir.
for(const [button,shortText,fullText] of [
 [areasButton,'Áreas','Áreas y opciones'],
 [follow,'Seguimiento','Seguimiento'],
 [appearance,'Apariencia','Apariencia']
]){
 if(!button)continue;
 const short=button.querySelector('.tools-option-label');
 const full=button.querySelector('.tools-option-full');
 if(short)short.textContent=shortText;
 if(full)full.textContent=fullText;
}
nav.append(usersButton);
if(areasButton)nav.append(areasButton);
if(follow)nav.append(follow);
if(appearance)nav.append(appearance);
if(oldUsers)oldUsers.hidden=true;
for(const b of oldButtons)if(b!==areasButton&&b!==follow&&b!==appearance)b.hidden=true;
// Cada herramienta abre solo su propio panel; no apilar Gestión de usuarios sobre Áreas.
// Se usa captura para mantener también los manejadores originales y los del laboratorio.
nav.addEventListener('click',event=>{
 const button=event.target.closest('button');
 if(!button||!nav.contains(button))return;
 const id=button.id;
 if(!['hys265OpenUsers','manageOpen242','operationsOpen242','appearanceOpen242'].includes(id)
    && button!==follow)return;
 if(id!=='hys265OpenUsers'&&!panel.hidden){
  if(!close()){event.preventDefault();event.stopImmediatePropagation();return}
 }
 if(id!=='manageOpen242'){
  const areasPanel=$('management242');
  if(areasPanel&&!areasPanel.hidden){
   const areaDraft=$('manageName242')?.value?.trim();
   if(areaDraft&&!confirm('Hay un nombre de área/opción sin guardar. ¿Descartarlo?')){
    event.preventDefault();event.stopImmediatePropagation();return;
   }
   areasPanel.hidden=true;
   const field=$('manageName242');if(field)field.value='';
  }
 }
 if(id!=='appearanceOpen242'){
  const appearancePanel=$('appearancePanel242');
  if(appearancePanel&&!appearancePanel.hidden){
   // Usar la función original de cierre, que protege cambios visuales no guardados.
   $('appearanceClose242')?.click();
   if(!appearancePanel.hidden){event.preventDefault();event.stopImmediatePropagation();return}
  }
 }
},true);
let inFlight=0;
async function readStore(){
 if(lab)return clone(labApi.get());
 const a=root.__REPORTES_HYS_ACCESS__;
 if(!isGlobal()||!root.reportesHysSupabase)throw Error('Se requiere iniciar sesión como Administrador general');
 const r=await root.reportesHysSupabase.rpc('hys242_listar_usuarios');
 if(r.error)throw r.error;
 const x=await root.reportesHysSupabase.from('areas_trabajo_v242').select('id,nombre,activa,modulo').in('modulo',W.modules).order('nombre');
 if(x.error)throw x.error;
 const faculty=await root.reportesHysSupabase.from('facultades_v242').select('usuario_id,modulo,revision,areas_ids,facultades');
 return {users:r.data||[],areas:x.data||[],faculties:faculty.error?[]:faculty.data||[],history:[]};
}
async function readHistory(){
 if(lab)return labApi.get().history;
 if(!isGlobal()||!root.reportesHysSupabase)return [];
 const r=await root.reportesHysSupabase.from('eventos_v242').select('id,fecha,actor_nombre,accion,motivo,anterior,nuevo,entidad').order('fecha',{ascending:false}).limit(60);
 const f=await root.reportesHysSupabase.from('auditoria_facultades_v242').select('fecha,actor_nombre,usuario_id,modulo,motivo,anterior,nuevo').order('fecha',{ascending:false}).limit(60);
 const data=[...(r.error?[]:r.data||[]),...(f.error?[]:(f.data||[]).map(x=>({...x,accion:'Facultades · '+scopeNames[x.modulo],usuario:x.usuario_id,actor:x.actor_nombre})))];
 return data.sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))).slice(0,100);
}
async function refresh(){
 const token=++inFlight;state.loading=true;notice('Consultando información…');
 try{
  const data=await readStore();if(token!==inFlight||panel.hidden)return;
  state.users=data.users||[];state.areas=data.areas||[];state.faculties=data.faculties||[];state.history=data.history||[];
  if(state.tab==='history')state.history=await readHistory();
  if(token!==inFlight||panel.hidden)return;
  notice(lab?'Laboratorio ficticio: las operaciones se guardan solo en este navegador.':'Vista de desarrollo: la ficha laboral y el guardado unificado requieren una migración segura en Supabase; no se realizan escrituras.',!lab);
  render();
 }catch(e){if(token===inFlight){notice('No se pudo consultar: '+e.message,true);render()}}
 finally{if(token===inFlight)state.loading=false}
}
function abandon(){return !state.dirty||confirm('Hay información sin guardar. ¿Descartarla?')}
function show(tab){
 if(!abandon())return;
 state.tab=tab;state.dirty=false;
 if(tab==='create')resetDraft();
 render();if(tab==='history')refresh();
}
function resetDraft(user=null){
 state.selected=user?.usuario_id||null;state.mode=user?'edit':'create';state.step=1;state.dirty=false;
 const worker={...Object.fromEntries(W.fields.map(k=>[k,''])),...(user?.trabajador||{}),nombre:user?.nombre||user?.trabajador?.nombre||'',estado_laboral:user?.trabajador?.estado_laboral||(user?.activo===false?'suspendido':'activo')};
 const ambitos=user?clone(user.ambitos||{}):{};
 const faculties={};
 for(const m of W.modules){
  if(!ambitos[m])ambitos[m]={ver:m==='APR',editar:false,areas:state.areas.filter(a=>a.modulo===m&&a.activa).slice(0,1).map(a=>a.id)};
  const fac=state.faculties.find(x=>x.usuario_id===user?.usuario_id&&x.modulo===m);
  faculties[m]=fac&&user?.rol==='administrador_area'?clone({areas_ids:fac.areas_ids||[],facultades:fac.facultades||{}}):{areas_ids:[],facultades:{}};
 }
 state.draft={worker,cuenta:user?.cuenta?clone(user.cuenta):{correo_ingreso:worker.correo_corporativo?'corporativo':'personal',metodo:'invitacion',estado:user?'sin_cambios':'pendiente_invitacion'},rol:user?.rol&&W.roles.includes(user.rol)?user.rol:'usuario',ambitos,facultades:faculties,motivo:''};
}
function setTabStyle(){
 panel.querySelectorAll('[data-hys265-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.hys265Tab===state.tab);b.setAttribute('aria-current',b.dataset.hys265Tab===state.tab?'page':'false')});
}
function render(){
 setTabStyle();
 const content=$('hys265Content');content.replaceChildren();
 if(state.tab==='directory')renderDirectory(content);
 else if(state.tab==='history')renderHistory(content);
 else if(state.tab==='roles'){
  const card=element('section',undefined,'hys265-card');
  card.append(element('h2','Crear y gestionar roles'),element('p','Define nombres, tarjetas y facultades en un catálogo de desarrollo. No modifica usuarios ni permisos reales.','hys265-muted'));
  content.append(card);
  if(!root.Hys267RoleCatalog?.mountInto(card))card.append(element('p','El catálogo de roles no está disponible en esta sesión.','hys265-muted'));
 }
 else renderWizard(content);
}
function element(tag,txt,cls){const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;if(cls)e.className=cls;return e}
function action(label,callback,cls='btn'){const e=element('button',label,cls);e.type='button';e.onclick=callback;return e}
function openEdit(u){
 if(!abandon())return;
 state.tab='create';resetDraft(u);render();
 notice('Editando la ficha de '+u.nombre+'. Se conserva el mismo flujo secuencial de creación.');
}
function renderDirectory(target){
 const card=element('section',undefined,'hys265-card');const header=element('div',undefined,'hys265-line');
 header.append(element('h2','Usuarios registrados'));
 const box=document.createElement('label');box.textContent='Buscar persona';
 const search=document.createElement('input');search.type='search';search.value=state.filter;search.placeholder='Nombre, cargo o rol…';search.oninput=()=>{state.filter=search.value;renderDirectoryRows()};
 box.append(search);card.append(header,box);
 const count=element('p','', 'hys265-muted');count.id='hys265Count';
 const list=element('div');list.id='hys265DirectoryRows';card.append(count,list);target.append(card);
 renderDirectoryRows();
}
function renderDirectoryRows(){
 const rows=$('hys265DirectoryRows');if(!rows)return;rows.replaceChildren();
 const q=state.filter.toLocaleLowerCase('es').trim();
 const filtered=state.users.filter(u=>([u.nombre,u.rol,u.trabajador?.cargo,u.trabajador?.gerencia,u.trabajador?.empresa].join(' ').toLocaleLowerCase('es').includes(q)));
 $('hys265Count').textContent=filtered.length+' de '+state.users.length+' usuarios';
 if(!filtered.length){rows.append(element('p','No hay cuentas coincidentes.'));return}
 for(const u of filtered){
  const r=element('article',undefined,'hys265-person');
  const name=element('div');name.append(element('strong',u.nombre),element('small',(u.trabajador?.cargo||'Cargo no registrado')+' · '+({usuario:'Usuario',supervisor:'Supervisor',administrador_area:'Administrador',administrador_global:'Administrador general'}[u.rol]||u.rol)+' · '+(u.activo===false?'Inactivo':'Trabajador activo')+(u.cuenta?.estado==='pendiente_invitacion'?' · Invitación simulada pendiente':'')));
  const mod=element('small',W.modules.map(m=>u.ambitos?.[m]?.ver===true?scopeNames[m]:'').filter(Boolean).join(' / ')||'Sin tarjetas asignadas');name.append(mod);
  r.append(name);
  const actions=element('div',undefined,'hys265-inline');
  const edit=action('Administrar',()=>openEdit(u));edit.disabled=u.rol==='administrador_global';
  actions.append(edit,action('Historial',()=>{state.histFilter=u.usuario_id;state.tab='history';state.dirty=false;render();refresh()}));
  r.append(actions);rows.append(r);
 }
}
function renderHistory(target){
 const card=element('section',undefined,'hys265-card');card.append(element('h2','Historial de gestión de usuarios'));
 card.append(element('p','Registra creaciones, modificaciones, roles, tarjetas, áreas y facultades, con fecha, responsable y motivo. No es editable.','hys265-muted'));
 const controls=element('div',undefined,'hys265-inline');
 const filter=document.createElement('select');filter.setAttribute('aria-label','Filtrar historial por usuario');filter.append(new Option('Todos los usuarios',''));
 for(const u of state.users)filter.add(new Option(u.nombre,u.usuario_id));filter.value=state.histFilter;
 filter.onchange=()=>{state.histFilter=filter.value;render()};
 controls.append(filter,action('Actualizar historial',()=>refresh()));card.append(controls);
 const results=element('div',undefined,'hys265-history');
 let events=state.history||[];
 if(state.histFilter)events=events.filter(x=>x.usuario===state.histFilter||x.entidad===state.histFilter||x.usuario_id===state.histFilter);
 if(!events.length)results.append(element('p','No hay acciones registradas para este filtro.'));
 for(const event of events.slice(0,100)){
  const item=element('article',undefined,'hys265-history-item');
  item.append(element('strong',event.accion||'Modificación de cuenta'));
  const who=event.usuario||event.usuario_id||event.entidad||'';
  item.append(element('p',(event.actor||event.actor_nombre||'Administrador general')+' · '+(event.fecha?new Date(event.fecha).toLocaleString('es-CL'):'Fecha no informada')+' · '+userName(who)));
  item.append(element('p','Motivo: '+(event.motivo||'No indicado')));
  const before=event.anterior,after=event.nuevo;
  if(before||after){
   const d=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Valores anteriores y nuevos';d.append(summary);
   const p=document.createElement('pre');p.textContent='Anterior:\n'+JSON.stringify(W.redactAudit(before||{}),null,2)+'\n\nNuevo:\n'+JSON.stringify(W.redactAudit(after||{}),null,2);d.append(p);item.append(d);
  }
  results.append(item);
 }
 card.append(results);target.append(card);
}
function renderWizard(target){
 if(!state.draft)resetDraft();
 const d=state.draft;
 const main=element('section',undefined,'hys265-card');
 const h=element('div',undefined,'hys265-line');
 h.append(element('h2',(state.mode==='edit'?'Modificar trabajador':'Crear trabajador')+' · Paso '+state.step+' de 5'));
 h.append(element('span',['','Ficha laboral','Crear cuenta','Rol y tarjetas','Áreas y facultades','Revisar y guardar'][state.step],'hys265-step'));
 main.append(h);
 const stages=element('div',undefined,'hys265-stages');
 for(let i=1;i<=5;i++){const e=element('span',i<=state.step?'●':'○');e.classList.toggle('current',i===state.step);stages.append(e)}main.append(stages);
 const pane=element('div');pane.id='hys265StepContent';main.append(pane);
 if(state.step===1)stepWorker(pane);
 if(state.step===2)stepAccount(pane);
 if(state.step===3)stepRoles(pane);
 if(state.step===4)stepSpecial(pane);
 if(state.step===5)stepReview(pane);
 const error=element('div',undefined,'hys265-inline-error');
 error.id='hys265InlineError';error.hidden=true;error.setAttribute('role','alert');
 main.append(error);
 const foot=element('div',undefined,'hys265-footer');
 foot.append(action('Descartar',()=>{if(!abandon())return;state.tab='directory';state.dirty=false;render()}));
 if(state.step>1)foot.append(action('Anterior',()=>{state.step--;render()}));
 if(state.step<5)foot.append(action('Continuar',()=>goNext(),'btn primary'));
 else foot.append(action(lab?'Guardar usuario y permisos de prueba':'Integración pendiente (sin guardar)',()=>save(),'btn primary'));
 main.append(foot);target.append(main);
}
function field(k,label,type,required){
 const holder=document.createElement('label');holder.textContent=label+(required?' *':'');
 const input=document.createElement('input');input.type=type;input.name=k;input.value=state.draft.worker[k]||'';input.required=required;
 if(k==='rut')input.placeholder='12.345.678-5';
 if(k==='celular')input.placeholder='+56 9 XXXX XXXX';
 input.maxLength=type==='email'?254:k==='nombre'?150:200;
 input.oninput=()=>{state.draft.worker[k]=input.value;state.dirty=true};
 holder.append(input);return holder;
}
function selectField(name,label,values){
 const holder=document.createElement('label');holder.textContent=label;
 const control=document.createElement('select');control.name=name;
 for(const [value,title]of values)control.append(new Option(title,value));
 control.value=state.draft.worker[name]||values[0]?.[0]||'';
 control.onchange=()=>{state.draft.worker[name]=control.value;state.dirty=true};
 holder.append(control);return holder;
}
function stepWorker(p){
 p.append(element('h3','1. Identificación, información laboral y contacto'));
 p.append(element('p','Los datos personales se utilizarán únicamente para la gestión autorizada. El historial no almacenará RUT, celular ni correos completos.','hys265-muted'));
 const grid=element('div',undefined,'hys265-grid');
 for(const [key,label,type,required]of employment)grid.append(field(key,label,type,required));
 const employees=state.users.filter(x=>x.activo!==false&&x.usuario_id!==state.selected);
 const supervisors=[['','Seleccione un supervisor responsable'],...employees.map(x=>[x.usuario_id,x.nombre+' · '+(x.trabajador?.cargo||x.rol)])];
 grid.append(selectField('supervisor_id','Supervisor responsable *',supervisors));
 grid.append(selectField('estado_laboral','Estado laboral',[['activo','Activo'],['suspendido','Suspendido'],['desvinculado','Desvinculado']]));
 grid.append(selectField('turno','Turno habitual',[['','Sin asignar'],['dia','Día'],['noche','Noche'],['rotativo','Rotativo']]));
 grid.append(selectField('preferencia_contacto','Preferencia de contacto',[['corporativo','Correo corporativo'],['personal','Correo personal'],['celular','Celular']]));
 p.append(grid);
 p.append(element('p','Se requerirá al menos un correo válido. El correo de inicio de sesión será preferentemente el corporativo.','hys265-muted'));
 if(lab){
  const quick=element('div',undefined,'hys265-test-fixture');
  quick.append(element('p','Para comprobar las cinco etapas sin completar todos los datos, puedes usar una ficha completamente ficticia.','hys265-muted'));
  quick.append(action('Completar con datos ficticios',()=>fillWorkerSample(),'btn'));
  p.prepend(quick);
 }
}
function fillWorkerSample(){
 if(!lab)return;
 const supervisor=state.users.find(u=>u.activo!==false&&u.usuario_id==='prueba-supervisor')||state.users.find(u=>u.activo!==false&&u.usuario_id!==state.selected);
 if(!supervisor){showInlineError('No hay un supervisor ficticio disponible para seleccionar.');return}
 const used=new Set(state.users.map(u=>W.rutParts(u.trabajador?.rut||'')?.normalized).filter(Boolean));
 let rut='';
 for(let n=90000000;n<90010000&&!rut;n++){
  for(const dv of '0123456789K'){
   const candidate=n+'-'+dv;
   if(W.validRut(candidate)&&!used.has(candidate)){rut=candidate;break}
  }
 }
 if(!rut){showInlineError('No hay RUT ficticio disponible para el ensayo.');return}
 const serial=(labApi?.get()?.rev||0)+1;
 Object.assign(state.draft.worker,{
  nombre:'Trabajador Ficticio de Prueba '+serial,
  rut,cargo:'Capataz de prueba',gerencia:'Gerencia ficticia',
  supervisor_id:supervisor.usuario_id,empresa:'Empresa de pruebas',proyecto:'Proyecto simulado',
  celular:'',correo_personal:'ficticio.personal'+serial+'@example.test',
  correo_corporativo:'ficticio.corporativo'+serial+'@example.test',
  estado_laboral:'activo'
 });
 state.draft.cuenta={correo_ingreso:'corporativo',metodo:'invitacion',estado:'pendiente_invitacion'};
 state.dirty=true;render();
 notice('Ficha de prueba completada. Ahora puedes pulsar Continuar.');
}
function stepAccount(p){
 p.append(element('h3','2. Creación de cuenta'));
 p.append(element('p','Primero se registra al trabajador; después se prepara su cuenta. La invitación y la activación real se confirmarán al finalizar todos los pasos. No se solicitan contraseñas personales.','hys265-muted'));
 const d=state.draft,account=d.cuenta;
 const emailOptions=[];
 if(d.worker.correo_corporativo?.trim())emailOptions.push(['corporativo','Corporativo · '+d.worker.correo_corporativo.trim()]);
 if(d.worker.correo_personal?.trim())emailOptions.push(['personal','Personal · '+d.worker.correo_personal.trim()]);
 if(!emailOptions.length){p.append(element('p','No hay correo válido para preparar la cuenta. Regresa a Ficha laboral.','hys265-muted'));return}
 if(!emailOptions.some(([value])=>value===account.correo_ingreso))account.correo_ingreso=emailOptions[0][0];
 const label=document.createElement('label');label.textContent='Correo que se utilizará para iniciar sesión *';
 const select=document.createElement('select');for(const [value,title] of emailOptions)select.append(new Option(title,value));
 select.value=account.correo_ingreso;
 select.onchange=()=>{account.correo_ingreso=select.value;state.dirty=true;render()};
 label.append(select);p.append(label);
 const method=document.createElement('label');method.textContent='Método de creación';
 const methodSelect=document.createElement('select');methodSelect.add(new Option('Invitación por correo (recomendado)','invitacion'));methodSelect.value='invitacion';methodSelect.disabled=true;method.append(methodSelect);p.append(method);
 const candidate=W.validateAccount(account,d.worker,state.mode==='edit');
 const meta=element('div',undefined,'hys265-module');
 meta.append(element('strong',state.mode==='edit'?'Cuenta existente: solo vista previa de datos de acceso':'Cuenta nueva: pendiente de completar y confirmar'));
 meta.append(element('p','Correo de acceso: '+(candidate.cuenta.email||'Sin correo válido'),'hys265-muted'));
 meta.append(element('p',state.mode==='edit'?'En esta revisión, los cambios de dirección de acceso se simulan; ninguna credencial real se modifica.':'Al guardar el laboratorio solo registrará una invitación ficticia. No se enviarán mensajes ni se crearán contraseñas.','hys265-muted'));
 p.append(meta);
}
function stepRoles(p){
 p.append(element('h3','3. Rol y tarjetas permitidas'));
 const label=document.createElement('label');label.textContent='Rol de la aplicación';
 const role=document.createElement('select');
 for(const [value,title]of [['usuario','Usuario'],['supervisor','Supervisor'],['administrador_area','Administrador']])role.append(new Option(title,value));
 role.value=state.draft.rol;role.onchange=()=>{
  const before=state.draft.rol;state.draft.facultades=W.transition(before,role.value,state.draft.facultades,state.draft.ambitos);
  state.draft.rol=role.value;state.dirty=true;render();
 };
 label.append(role);p.append(label);
 p.append(element('p','El cargo laboral y el rol de la aplicación son independientes. Al salir o entrar nuevamente al rol Administrador todas las facultades especiales comienzan desmarcadas.','hys265-muted'));
 for(const m of W.modules){
  const a=state.draft.ambitos[m];const card=element('section',undefined,'hys265-module');
  const header=document.createElement('label');header.className='hys265-checkline';
  const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=a.ver===true;
  enabled.onchange=()=>{a.ver=enabled.checked;if(enabled.checked&&!a.areas?.length)a.areas=available(m).slice(0,1).map(x=>x.id);if(!enabled.checked){a.editar=false;state.draft.facultades[m]={areas_ids:[],facultades:{}}}state.dirty=true;render()};
  header.append(enabled,document.createTextNode(scopeNames[m]));card.append(header);
  if(a.ver){
   const edit=document.createElement('label');edit.className='hys265-checkline';
   const check=document.createElement('input');check.type='checkbox';check.checked=a.editar===true;
   check.onchange=()=>{a.editar=check.checked;state.dirty=true};
   edit.append(check,document.createTextNode('Puede registrar y modificar sus propios informes'));card.append(edit);
   card.append(element('small','Seleccionar las áreas se realiza en el paso siguiente. Áreas actuales: '+(a.areas||[]).length));
  }else card.append(element('small','Sin acceso a esta tarjeta.'));
  p.append(card);
 }
}
function available(m){return state.areas.filter(a=>a.modulo===m&&a.activa!==false)}
function stepSpecial(p){
 p.append(element('h3','4. Áreas y facultades especiales'));
 for(const m of W.modules){
  const a=state.draft.ambitos[m],card=element('section',undefined,'hys265-module');
  card.append(element('h4',scopeNames[m]));
  if(!a?.ver){card.append(element('p','Tarjeta deshabilitada.'));p.append(card);continue}
  const ids=available(m).map(x=>x.id);
  const all=ids.length>0&&ids.every(id=>a.areas.includes(id));
  const options=element('div',undefined,'hys265-inline');
  for(const [key,title]of [['all','Todas las áreas activas'],['selected','Seleccionar áreas']]){
   const rd=document.createElement('label');rd.className='hys265-checkline';
   const input=document.createElement('input');input.type='radio';input.name='area-'+m;input.checked=(state.draft.areaModes?.[m]|| (all?'all':'selected'))===key;
   input.onchange=()=>{state.draft.areaModes={...state.draft.areaModes,[m]:key};
    if(key==='all')a.areas=[...ids];
    state.draft.facultades[m].areas_ids=[...(a.areas||[])];state.dirty=true;render();
   };
   rd.append(input,document.createTextNode(title));options.append(rd);
  }
  card.append(options);
  if((state.draft.areaModes?.[m]||(all?'all':'selected'))==='selected'){
   const grid=element('div',undefined,'hys265-checkgrid');
   for(const area of available(m)){
    const lbl=document.createElement('label');lbl.className='hys265-checkline';
    const ch=document.createElement('input');ch.type='checkbox';ch.checked=a.areas.includes(area.id);
    ch.onchange=()=>{a.areas=ch.checked?[...new Set([...a.areas,area.id])]:a.areas.filter(id=>id!==area.id);state.draft.facultades[m].areas_ids=[...a.areas];state.dirty=true};
    lbl.append(ch,document.createTextNode(area.nombre));grid.append(lbl);
   }card.append(grid);
  }
  if(state.draft.rol==='administrador_area'){
   card.append(element('h4','Facultades de Administrador (por tarjeta)'));
   card.append(element('small','No hay autorizaciones automáticas. Marca explícitamente cada facultad que deseas conceder.'));
   const grid=element('div',undefined,'hys265-checkgrid');
   for(const [key,title] of rights){
    const lbl=document.createElement('label');lbl.className='hys265-checkline';
    const ch=document.createElement('input');ch.type='checkbox';ch.checked=state.draft.facultades[m]?.facultades?.[key]===true;
    ch.onchange=()=>{
     const granted=state.draft.facultades[m].facultades;
     granted[key]=ch.checked;
     const dependent=['pdf','review','approve','close','editOthers'];
     if(ch.checked&&dependent.includes(key))granted.view=true;
     if(key==='view'&&!ch.checked)for(const dep of dependent)granted[dep]=false;
     state.draft.facultades[m].areas_ids=[...a.areas];state.dirty=true;render();
    };
    lbl.append(ch,document.createTextNode(title));grid.append(lbl);
   }
   card.append(grid);
  }else card.append(element('p','Este rol no recibe facultades administrativas.','hys265-muted'));
  p.append(card);
 }
}
function stepReview(p){
 const d=state.draft,w=d.worker;
 p.append(element('h3','5. Revisar y confirmar'));
 const summary=element('dl',undefined,'hys265-summary');
 const add=(k,v)=>{summary.append(element('dt',k),element('dd',v||'No indicado'))};
 add('Trabajador',w.nombre);add('RUT',W.validRut(w.rut)?'Registrado y validado':'Pendiente de validar');
 add('Cargo',w.cargo);add('Gerencia',w.gerencia);add('Empresa',w.empresa);add('Proyecto',w.proyecto);add('Supervisor responsable',userName(w.supervisor_id));
 add('Correo corporativo',w.correo_corporativo?'Registrado':'Sin correo corporativo');add('Correo personal',w.correo_personal?'Registrado':'Sin correo personal');
 const account=W.validateAccount(d.cuenta,w,state.mode==='edit');
 add('Cuenta de acceso',account.cuenta.email?'Configurada con correo '+account.cuenta.correo_ingreso:'Pendiente');add('Método de alta',state.mode==='edit'?'Cuenta existente':'Invitación por correo (no se envía en pruebas)');
 add('Rol',({administrador_area:'Administrador',supervisor:'Supervisor',usuario:'Usuario'}[d.rol]));
 for(const m of W.modules){
  const a=d.ambitos[m];add(scopeNames[m],a.ver?(a.areas||[]).length+' áreas; '+(a.editar?'edición propia':'solo consulta'):'Sin acceso');
  if(d.rol==='administrador_area'&&a.ver)add('Facultades de '+scopeNames[m],Object.values(d.facultades[m]?.facultades||{}).filter(Boolean).length+' seleccionadas');
 }
 p.append(summary);
 const label=document.createElement('label');label.textContent='Motivo obligatorio de creación o modificación *';
 const input=document.createElement('textarea');input.rows=3;input.maxLength=500;input.value=d.motivo;
 input.placeholder='Describe el motivo de esta creación o cambio (mínimo 10 caracteres)';
 input.oninput=()=>{d.motivo=input.value;state.dirty=true};
 label.append(input);p.append(label);
 p.append(element('p',lab?'Se guardará junto con roles, tarjetas, áreas y facultades en el laboratorio ficticio.':'El guardado real aún no está habilitado: falta crear y auditar la estructura de datos laborales y la operación transaccional en Supabase.','hys265-muted'));
}
function validateStep(step){
 const d=state.draft;
 if(step===1){const v=W.validate(d.worker,state.users,state.selected||'');if(!v.ok)return v.errors.join('. ');d.worker=v.worker}
 if(step===2){const a=W.validateAccount(d.cuenta,d.worker,state.mode==='edit');if(!a.ok)return a.errors.join('. ');d.cuenta=a.cuenta}
 if(step===3){if(!W.roles.includes(d.rol))return 'Selecciona un rol válido';if(!W.modules.some(m=>d.ambitos[m]?.ver))return 'Habilita al menos una tarjeta'}
 if(step===4){const r=W.validConfiguration(d.rol,d.ambitos,d.facultades,state.areas);if(!r.ok)return r.errors.join('. ')}
 return '';
}
function showInlineError(message){
 const el=$('hys265InlineError');
 if(el){
  el.hidden=false;el.replaceChildren();
  el.append(element('strong','Faltan datos para avanzar.'));
  el.append(element('p',message));
  el.scrollIntoView({behavior:'smooth',block:'nearest'});
 }
 notice('Revisa el aviso junto al botón Continuar: '+message,true);
 if(state.step===1){
  const w=state.draft.worker;
  const invalid={nombre:!w.nombre?.trim(),rut:!W.validRut(w.rut||''),cargo:!w.cargo?.trim(),gerencia:!w.gerencia?.trim(),
   empresa:!w.empresa?.trim(),proyecto:!w.proyecto?.trim(),supervisor_id:!w.supervisor_id,
   correo_corporativo:!w.correo_corporativo&&!w.correo_personal};
  for(const [name,flag]of Object.entries(invalid)){
   const input=$('hys265StepContent')?.querySelector('[name="'+name+'"]');
   if(input){input.classList.toggle('hys265-invalid',!!flag);input.setAttribute('aria-invalid',String(!!flag))}
  }
 }
}
function goNext(){
 const error=validateStep(state.step);
 if(error){showInlineError(error);return}
 state.step=Math.min(5,state.step+1);render();notice('Paso '+state.step+' de 5. Revisa los datos antes de continuar.');
}
async function save(){
 if(!lab){notice('Guardado bloqueado para usuarios reales. Falta migración Supabase, autorización transaccional y pruebas de auditoría; los cambios no se enviaron.',true);return}
 const errs=[1,2,3,4].map(validateStep).filter(Boolean);if(errs.length){notice(errs.join('. '),true);return}
 const d=state.draft;
 if(String(d.motivo).trim().length<10){notice('Describe el motivo del cambio con al menos 10 caracteres.',true);return}
 const payload=clone({...d,trabajador:d.worker,confirmar_facultades_nuevas:true});
 try{
  if(state.mode==='edit'){
   const u=state.users.find(x=>x.usuario_id===state.selected);
   if(!u)throw Error('La cuenta ya no está disponible');
   labApi.updateWorker(u.usuario_id,payload,u.revision);
  }else labApi.createWorker(payload);
  state.dirty=false;state.tab='directory';resetDraft();await refresh();
  notice('Cuenta FICTICIA guardada correctamente. Revisa la ficha en Usuarios registrados y el evento en Historial.');
 }catch(e){notice('No se pudo guardar: '+e.message,true)}
}
async function open(tab='directory',userId=null){
 if(!isGlobal())return;
 if(!panel.hidden&&!abandon())return;
 state.tab=tab;state.dirty=false;panel.hidden=false;
 await refresh();
 if(tab==='create')resetDraft();
 if(userId){const u=state.users.find(x=>x.usuario_id===userId);if(u)openEdit(u)}
 else render();
}
const close=()=>{if(!abandon())return false;panel.hidden=true;state.dirty=false;inFlight++;if(!usersButton.hidden)usersButton.focus();return true};
$('hys265Close').onclick=close;
panel.querySelectorAll('[data-hys265-tab]').forEach(b=>b.onclick=()=>show(b.dataset.hys265Tab));
usersButton.onclick=()=>open('directory');
// Áreas y opciones mantiene su controlador original de v264 (cloud-v242.js).
// No convertir nunca el menú Áreas y opciones en una entrada a Gestión de usuarios.
function sync(){
 const visible=showInRail();
 usersButton.hidden=!visible;
 // Montar el control REAL de Apariencia si la inicialización inicial ocurrió antes de crear la cinta.
 // Se conserva su mismo panel y sus opciones; nunca se crea un duplicado.
 if(visible)root.HysAppearance242?.mount?.();
 const appearanceNow=$('appearanceOpen242')||appearance;
 if(appearanceNow&&appearanceNow.parentElement!==nav)nav.append(appearanceNow);
 if(appearanceNow){
  appearanceNow.hidden=!visible;
  appearanceNow.style.removeProperty('display');
 }
 // Áreas y opciones utiliza su botón original (y su panel histórico).
 if(areasButton)areasButton.hidden=!visible;
 if(oldUsers){oldUsers.hidden=true;oldUsers.style.display='none'}
 for(const b of [...nav.querySelectorAll('.hys-admin-open')]){
  if(b===usersButton||b===areasButton||b===follow||b===appearanceNow)continue;
  b.hidden=true;b.style.display='none';
 }
 if(!isGlobal()&&!panel.hidden){state.dirty=false;panel.hidden=true;state.users=[];state.history=[]}
}
const previousSync=root.reportesHysAdminSync;
root.reportesHysAdminSync=()=>{previousSync?.();sync()};
sync();
root.Hys265UserManagement={open,close,refresh,isLab:lab};
})(window);
