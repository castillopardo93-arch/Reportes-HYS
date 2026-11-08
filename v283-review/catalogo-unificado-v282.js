/* Reportes HYS v282 — Panel ÚNICO de Áreas y opciones.
 * Catálogos reales: áreas_trabajo_v242, listas_v242, regimenes_laborales_v281.
 * No carga usuarios ficticios, no guarda en el navegador, no modifica informes
 * ni envía datos antes de una confirmación expresa y una RPC autorizada.
 */
(function(root){
'use strict';
const SELECTORS=Object.freeze([
 {id:'shift',title:'Turno del informe diario',source:'lista'},
 {id:'project',title:'Proyecto',source:'lista'},
 {id:'Resultado',title:'Resultado',source:'lista'},
 {id:'Prioridad',title:'Prioridad',source:'lista'},
 {id:'Estado',title:'Estado',source:'lista'},
 {id:'owner',title:'Responsables del informe',source:'lista'},
 {id:'otherCategory',title:'Tipo de actividad',source:'lista'},
 {id:'otherStatus',title:'Estado alternativo',source:'lista'},
 {id:'regimen_laboral',title:'Régimen de turno',source:'regimen'}
]);
const byId=Object.freeze(Object.fromEntries(SELECTORS.map(x=>[x.id,x])));
const REGIMENES_INICIALES_283=Object.freeze(['5X2','4X3','10X5','7X7']);
const PROYECTO_VIGENTE_283='Proyecto Hidroeléctrico Alto Maipo';
const PROYECTOS_ANTIGUOS_283=new Set(['PHAM 1','PHAM 2']);
const $=id=>root.document.getElementById(id);
const client=()=>root.reportesHysSupabase;
const general=a=>a?.profile?.activo===true&&a.profile.rol==='administrador_global'&&!!a.userId;
const areaGranted=(a,m)=>general(a)||!!(a?.profile?.activo===true&&(
 a?.profile?.rol==='supervisor'&&a.permissions?.some(p=>p.modulo===m&&p.puede_ver&&p.puede_editar)
 ||a.facultades?.some(f=>f.modulo===m&&f.facultades?.areas===true)
));
const normalizedValue=(source,value)=>{
 let s=String(value??'').trim().replace(/\s+/g,' ');
 if(source==='regimen')s=s.toUpperCase().replace(/\s+/g,'');
 return s;
};
function validateValue(source,value){
 const v=normalizedValue(source,value);
 if(source==='regimen'){
  if(!/^[1-9][0-9]{0,2}X[1-9][0-9]{0,2}$/.test(v))
   throw Error('Utiliza el formato de régimen laboral 5x2, 4x3, 10x5 o 7x7.');
 }else if(v.length<1||v.length>150)throw Error('Ingresa un nombre de 1 a 150 caracteres.');
 return v;
}
async function capability(){
 if(!client()?.rpc)return {ready:false,reason:'Inicia sesión para consultar los catálogos.'};
 try{
  const {data,error}=await client().rpc('hys282_catalogo_capacidades');
  if(error||data?.version!==282||data?.gestion!==true)
   throw Error('El servicio de gestión de catálogos no está instalado.');
  return {ready:true,reason:''};
 }catch(e){
  return {ready:false,reason:'Consulta disponible; para agregar, editar o desactivar se debe habilitar primero el servicio de administración auditada de catálogos en Supabase.'};
 }
}
async function list(tab,modulo,selector){
 const c=client();
 if(!c?.from)throw Error('No hay conexión autenticada con Supabase.');
 if(tab==='areas'){
  const r=await c.from('areas_trabajo_v242').select('id,modulo,nombre,activa,actualizado_en').eq('modulo',modulo).order('nombre');
  if(r.error)throw Error('No se pudieron consultar áreas: '+r.error.message);
  return r.data||[];
 }
 const selected=byId[selector];
 if(!selected)throw Error('Selector inexistente.');
 if(selected.source==='regimen'){
  const r=await c.from('regimenes_laborales_v281').select('id,codigo,activo,revision,actualizado_en').order('codigo');
  if(r.error)throw Error('Los turnos habituales todavía requieren su catálogo independiente en Supabase.');
  return r.data||[];
 }
 const r=await c.from('listas_v242').select('id,modulo,campo,valor,activa,actualizado_en').eq('modulo',modulo).eq('campo',selector).order('valor');
 if(r.error)throw Error('No se pudieron consultar las opciones: '+r.error.message);
 return r.data||[];
}
async function audit(modulo){
 const c=client(),events=[];
 if(!c?.from)throw Error('No hay sesión.');
 const [a,b]=await Promise.all([
  c.from('auditoria_areas_v242').select('fecha,accion,usuario_nombre,modulo,anterior,nuevo').eq('modulo',modulo).order('fecha',{ascending:false}).limit(50),
  c.from('eventos_v242').select('fecha,accion,actor_nombre,modulo,entidad,motivo,anterior,nuevo').in('accion',['CATALOGO_V282','REGIMEN_LABORAL_V281','LISTA_V279']).order('fecha',{ascending:false}).limit(70)
 ]);
 if(!a.error)for(const e of a.data||[])events.push({...e,actor:e.usuario_nombre||'Administrador'});
 if(!b.error)for(const e of b.data||[])events.push({...e,actor:e.actor_nombre||'Administrador'});
 if(a.error&&b.error)throw Error('El servidor no permitió consultar el historial.');
 return events.sort((x,y)=>String(y.fecha).localeCompare(String(x.fecha))).slice(0,80);
}
async function mutate({tab,modulo,selector,item,value,active,reason}){
 const c=client();
 if(!c?.rpc)throw Error('No hay conexión con Supabase.');
 const cap=await capability();
 if(!cap.ready)throw Error(cap.reason);
 const kind=tab==='areas'?'area':byId[selector]?.source;
 if(!['area','lista','regimen'].includes(kind))throw Error('Selector no autorizado.');
 const next=validateValue(kind,value);
 const motive=String(reason||'').trim();
 if(motive.length<10||motive.length>400)throw Error('El motivo debe tener entre 10 y 400 caracteres.');
 const {data,error}=await c.rpc('hys282_catalogo_mutar',{
  p_tipo:kind,
  p_modulo:kind==='regimen'?null:modulo,
  p_selector:kind==='lista'?selector:null,
  p_id:item?.id||null,
  p_valor:next,
  p_activo:active!==false,
  p_revision:item?kind==='regimen'?String(item.revision):String(item.actualizado_en):null,
  p_motivo:motive
 });
 if(error)throw Error('El servidor rechazó el cambio: '+(error.message||'No autorizado.'));
 if(!data?.id)throw Error('No se pudo confirmar el cambio en Supabase.');
 return data;
}
const backend=Object.freeze({SELECTORS,byId,general,areaGranted,normalizedValue,validateValue,capability,list,audit,mutate});
root.Hys282CatalogBackend=backend;

function create({getAccess,moduleLabel,refreshCatalog}){
 const panel=root.document.createElement('section');
 panel.id='management242';panel.hidden=true;panel.setAttribute('role','dialog');
 panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','managementTitle242');
 panel.innerHTML='<div class="management-shell hys282-shell">'
 +'<header class="management-head"><div><h1 id="managementTitle242">Áreas y opciones</h1><p class="smallnote">Administración de listas de formularios y áreas de trabajo.</p></div><button type="button" class="btn" id="manageClose242">Cerrar</button></header>'
 +'<p id="manageMessage242" role="status" aria-live="polite"></p>'
 +'<label id="manageModuleLabel242" class="hys282-module-label">Módulo <select id="manageModule242"></select></label>'
 +'<div class="btnrow hys282-tabs" role="tablist" aria-label="Áreas y opciones">'
 +'<button type="button" class="btn" id="manageAreas242" role="tab">Áreas de trabajo</button>'
 +'<button type="button" class="btn" id="manageLists242" role="tab">Opciones de formularios</button>'
 +'<button type="button" class="btn" id="manageAudit242" role="tab">Historial</button></div>'
 +'<form id="manageForm242" class="hys282-form">'
 +'<label id="catalogFieldLabel242">Selector <select id="catalogField242"></select></label>'
 +'<label id="manageNameLabel242">Nombre <input id="manageName242" maxlength="150" required autocomplete="off"></label>'
 +'<button type="submit" class="btn primary" id="hys282Create">Crear</button></form>'
 +'<div id="hys282Context" class="smallnote" aria-live="polite"></div>'
 +'<div id="manageRows242"></div>'
 +'<div class="hys282-footer"><button type="button" class="btn" id="hys282Refresh">Actualizar</button>'
 +'<p class="smallnote">Desactivar conserva la trazabilidad y los registros históricos. Las operaciones se auditan en Supabase.</p></div></div>';
 root.document.body.append(panel);
 const button=root.document.createElement('button');
 button.id='manageOpen242';button.type='button';button.className='hys-admin-open';
 button.title='Áreas y opciones';button.setAttribute('aria-label','Áreas y opciones');
 button.innerHTML='<span class="tools-option-icon" aria-hidden="true">▦</span>'
  +'<span class="tools-option-label">Áreas y opciones</span><span class="tools-option-full">Áreas y opciones</span>';
 button.hidden=true;
 // Disponibilidad temprana para la barra lateral de Administración de usuarios.
 const initialRail=$('hysToolsOptions');if(initialRail)initialRail.append(button);
 const nodes={};for(const id of ['manageMessage242','manageModule242','manageModuleLabel242',
 'manageAreas242','manageLists242','manageAudit242','catalogField242','catalogFieldLabel242',
 'manageName242','manageNameLabel242','manageForm242','manageRows242','hys282Create','hys282Context']){
  nodes[id]=panel.querySelector('#'+id);
 }
 let tab='lists',seq=0,editing=false,permission=null,loaded=[],reason='';
 const activeUser=()=>getAccess();
 const global=()=>general(activeUser());
 const module=()=>nodes.manageModule242.value;
 const sel=()=>nodes.catalogField242.value;
 const config=()=>byId[sel()]||SELECTORS[0];
 const status=(msg,err=false)=>{nodes.manageMessage242.textContent=msg||'';nodes.manageMessage242.dataset.warning=err?'true':'false'};
 const canRead=()=>{const a=activeUser();return a?.profile?.activo===true&&(global()||a.modules?.length>0)};
 const canEdit=()=>global()||tab==='areas'&&areaGranted(activeUser(),module());
 function sync(){
  const a=activeUser(),chooser=$('moduleChooser');
  const visible=!!(a?.profile?.activo===true&&!a.selectedModule
    &&root.document.body.classList.contains('module-choice')
    &&(general(a)||['supervisor','administrador_area'].includes(a.profile.rol)));
  button.hidden=!visible;
  nodes.manageLists242.hidden=!general(a);
  if(tab==='lists'&&!general(a)&&!panel.hidden){tab='areas';switchTab('areas');}
  if(visible){
   $('hysToolsRail')?.removeAttribute('hidden');
  }
  if(!canRead()){panel.hidden=true;seq++;nodes.manageRows242.replaceChildren();}
  return visible;
 }
 function mount(){
  const rail=$('hysToolsOptions');
  if(rail&&button.parentElement!==rail)rail.append(button);
  sync();
 }
 function switchTab(next){
  if(!['areas','lists','audit'].includes(next)||editing)return;
  tab=next;
  const choice=nodes.catalogField242;
  nodes.catalogFieldLabel242.hidden=tab!=='lists';
  nodes.manageForm242.hidden=tab==='audit';
  nodes.manageName242.value='';
  nodes.manageNameLabel242.firstChild.textContent=tab==='areas'?'Nombre del área ':'Nombre ';
  for(const [id,v] of [['manageAreas242','areas'],['manageLists242','lists'],['manageAudit242','audit']]){
   const b=nodes[id];const chosen=v===tab;
   b.classList.toggle('active',chosen);b.setAttribute('aria-selected',String(chosen));
  }
  nodes.manageRows242.replaceChildren();
  load();
 }
 function setSelectors(){
  const prev=sel();nodes.catalogField242.replaceChildren();
  for(const item of SELECTORS)nodes.catalogField242.add(new Option(item.title,item.id));
  nodes.catalogField242.value=byId[prev]?prev:'shift';
 }
 function setModules(){
  const a=activeUser();
  const prev=module();
  const options=general(a)?['APR','OTROS']:(a?.modules||[]).filter(x=>['APR','OTROS'].includes(x));
  nodes.manageModule242.replaceChildren(...options.map(m=>new Option(moduleLabel(m),m)));
  if(options.includes(prev))nodes.manageModule242.value=prev;
  else nodes.manageModule242.value=options[0]||'';
 }
 async function load(){
  const ticket=++seq,a=activeUser();
  if(panel.hidden||!canRead())return;
  const special=tab==='lists'&&config().source==='regimen';
  nodes.manageModuleLabel242.hidden=special;
  nodes.manageRows242.replaceChildren();
  nodes.manageName242.value='';
  nodes.manageName242.placeholder=special?'Ej. 5x2':'';
  nodes.manageName242.maxLength=special?7:150;
  const mode=tab==='areas'?'area':special?'regimen':'lista';
  const editable=canEdit();
  nodes.manageForm242.hidden=tab==='audit';
  nodes.manageNameLabel242.hidden=tab==='audit';
  nodes.hys282Context.textContent=mode==='regimen'
    ?'Régimen de turno del trabajador. Los valores 5x2, 4x3, 10x5 y 7x7 son opciones independientes y editables una a una cuando el catálogo esté habilitado.'
    :tab==='areas'?'Áreas de trabajo autorizadas para '+moduleLabel(module())+'.'
    :tab==='lists'?'Opciones para '+moduleLabel(module())+' · '+config().title+'.'
    :'Historial de cambios realizados por usuarios autorizados.';
  if(tab==='audit'){
   nodes.manageForm242.hidden=true;
   status('Consultando historial real…');
   try{
    const events=await backend.audit(module());
    if(ticket!==seq||panel.hidden)return;
    if(!events.length)nodes.manageRows242.append(paragraph('No hay modificaciones registradas.'));
    for(const e of events){
     const entry=root.document.createElement('article');entry.className='manage-row';
     const head=root.document.createElement('strong');
     head.textContent=(e.accion||'Cambio')+' · '+(e.actor||'Administrador')+' · '+new Date(e.fecha).toLocaleString('es-CL');
     entry.append(head);if(e.motivo)entry.append(paragraph('Motivo: '+e.motivo));
     nodes.manageRows242.append(entry);
    }
    status('Historial consultado.');
   }catch(e){if(ticket===seq)status(e.message,true)}
   return;
  }
  status('Consultando opciones reales de Supabase…');
  try{
   const [cap,result]=await Promise.all([
    backend.capability(),
    backend.list(tab,module(),sel()).then(rows=>({rows,error:null})).catch(error=>({rows:[],error}))
   ]);
   if(ticket!==seq||panel.hidden)return;
   if(result.error&&!special)throw result.error;
   permission={ready:cap.ready&&!result.error};
   loaded=result.rows;
   nodes.hys282Create.disabled=!permission.ready||!editable;
   const isProject=tab==='lists'&&sel()==='project';
   const existing=result.rows;
   const historical=isProject?existing.filter(x=>PROYECTOS_ANTIGUOS_283.has(x.valor)):[];
   const activeRows=isProject?existing.filter(x=>!PROYECTOS_ANTIGUOS_283.has(x.valor)):existing;
   const pending=[];
   if(special){
    for(const code of REGIMENES_INICIALES_283){
     if(!existing.some(x=>x.codigo===code))pending.push({
      id:null,codigo:code,activo:false,_pending283:true
     });
    }
   }
   if(isProject&&!activeRows.some(x=>x.valor===PROYECTO_VIGENTE_283)){
    pending.push({id:null,valor:PROYECTO_VIGENTE_283,activa:false,_pending283:true});
   }
   const shown=[...pending,...activeRows];
   if(!shown.length)nodes.manageRows242.append(paragraph('No hay registros para este selector.'));
   function createRow(item,where,isOld=false){
    const entry=root.document.createElement('article');entry.className='manage-row';
    if(item._pending283)entry.classList.add('hys283-pending');
    if(isOld)entry.classList.add('hys283-old');
    const name=mode==='area'?item.nombre:mode==='regimen'?item.codigo:item.valor;
    const enabled=mode==='regimen'?item.activo:item.activa;
    const h=root.document.createElement('strong');
    h.textContent=String(mode==='regimen'?name.toLowerCase():name)+(
     item._pending283?' · pendiente de registrar en Supabase':
     isOld?' · registro anterior en Supabase':
     enabled?' · Activo':' · Desactivado'
    );
    entry.append(h);
    const edit=root.document.createElement('button');edit.type='button';edit.className='btn';
    edit.textContent=mode==='regimen'?'Editar régimen':'Editar nombre';
    edit.disabled=!!item._pending283||!permission.ready||!editable||isOld&&!enabled;
    edit.onclick=()=>{
     const value=root.prompt(mode==='regimen'?'Modificar régimen de turno (ej. 5x2)':'Nuevo nombre',name);
     if(value!==null)submit({item,value,active:enabled})
    };
    const toggle=root.document.createElement('button');toggle.type='button';toggle.className='btn';
    toggle.textContent=enabled?'Desactivar':'Reactivar';
    toggle.disabled=!!item._pending283||!permission.ready||!editable||isOld&&!enabled;
    toggle.onclick=()=>submit({item,value:name,active:!enabled});
    entry.append(edit,toggle);where.append(entry);
   }
   for(const item of shown)createRow(item,nodes.manageRows242);
   if(historical.length){
    const old=root.document.createElement('details');old.className='hys283-old-group';
    const heading=root.document.createElement('summary');
    heading.textContent='Valores anteriores en Supabase ('+historical.length+'). Revisar para desactivar.';
    old.append(heading);
    for(const item of historical)createRow(item,old,true);
    nodes.manageRows242.append(old);
   }
   if(special&&(result.error||pending.length)){
    status(result.error
     ?'Régimen de turno: opciones iniciales definidas, pero el catálogo independiente aún no existe en Supabase. Los registros se muestran por separado, pendientes de instalación.'
     :'Los regímenes pendientes de alta aparecen por separado. Los valores guardados en Supabase sí pueden modificarse cuando el servidor esté autorizado.',true);
   }else if(isProject&&historical.length){
    status('El proyecto vigente es «'+PROYECTO_VIGENTE_283+'». Supabase aún contiene '+historical.length+' valores antiguos ('+historical.map(x=>x.valor).join(', ')+'). Deben desactivarse y registrar el vigente al autorizar la sincronización.',true);
   }else{
    status(permission.ready
      ?editable?'Lista actualizada. Puedes crear, editar o desactivar opciones.':'Consulta autorizada. Tu rol no permite modificar este selector.'
      :cap.reason,!permission.ready);
   }
  }catch(e){
   if(ticket!==seq||panel.hidden)return;
   nodes.hys282Create.disabled=true;permission={ready:false};
   status(e.message,true);
  }
 }
 function paragraph(t){const e=root.document.createElement('p');e.textContent=t;e.className='smallnote';return e}
 async function submit({item=null,value,active=true}){
  if(editing||!canEdit()||!permission?.ready)return;
  const mode=tab==='areas'?'area':config().source;
  let name;
  try{name=validateValue(mode,value)}catch(e){status(e.message,true);return}
  const reason=root.prompt('Motivo del cambio (obligatorio, mínimo 10 caracteres):');
  if(reason===null)return;
  if(reason.trim().length<10||reason.trim().length>400){status('Escribe un motivo de entre 10 y 400 caracteres.',true);return}
  const label=item?'actualizar':'crear';
  if(!root.confirm('¿Confirmas '+label+' «'+name+'» en Supabase? Esta acción quedará registrada en auditoría.'))return;
  editing=true;nodes.hys282Create.disabled=true;status('Guardando y verificando la modificación en Supabase…');
  const previousTab=tab,previousMod=module(),previousSel=sel();
  try{
   const response=await backend.mutate({tab,modulo:module(),selector:sel(),item,value:name,active,reason});
   if(!response?.id)throw Error('Sin confirmación de Supabase.');
   if(panel.hidden||previousTab!==tab||previousMod!==module()||previousSel!==sel())return;
   editing=false;await load();
   status('Cambio guardado, confirmado y auditado por Supabase.');
   if(previousTab==='areas'||config().source==='lista')refreshCatalog?.().catch?.(()=>{});
   if(config().source==='regimen')root.dispatchEvent(new CustomEvent('reportes-hys-regimenes-updated'));
  }catch(e){status('No se guardó el cambio: '+e.message,true)}
  finally{editing=false;nodes.hys282Create.disabled=!permission?.ready||!canEdit()}
 }
 function open(){
  if(!canRead())return;
  panel.hidden=false;setModules();setSelectors();tab=global()?'lists':'areas';switchTab(tab);
 }
 button.addEventListener('click',open);
 panel.querySelector('#manageClose242').addEventListener('click',()=>{panel.hidden=true;seq++});
 panel.querySelector('#hys282Refresh').addEventListener('click',load);
 nodes.manageModule242.addEventListener('change',load);
 nodes.catalogField242.addEventListener('change',load);
 nodes.manageAreas242.addEventListener('click',()=>switchTab('areas'));
 nodes.manageLists242.addEventListener('click',()=>switchTab('lists'));
 nodes.manageAudit242.addEventListener('click',()=>switchTab('audit'));
 nodes.manageForm242.addEventListener('submit',e=>{e.preventDefault();if(!nodes.hys282Create.disabled)submit({value:nodes.manageName242.value})});
 return Object.freeze({mount,sync,open,load,panel,button});
}
root.Hys282CatalogManager=Object.freeze({create});
})(window);
