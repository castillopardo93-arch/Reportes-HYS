/* Reportes HYS v263 — Backend FICTICIO y persistencia LOCAL para pruebas.
 * Solo debe cargarse desde demo-facultades.html con HYS263_SANDBOX=true.
 * Nunca importa, consulta ni escribe Supabase real. Datos totalmente ficticios.
 */
(function(root){
 'use strict';
 if(root.HYS263_SANDBOX!==true||!(/\/(?:demo-facultades|laboratorio-v263|laboratorio-integral-v265)\.html(?:$|\?)/.test(root.location.pathname+root.location.search)||(root.HYS265_PREVIEW_ONLY===true&&/\/v265-review\/index\.html$/.test(root.location.pathname))))return; // No inicializar el backend ficticio fuera de las rutas de pruebas autorizadas.
 const KEY='reportes-hys-v265-simulador-local-1';
 const store=root.HysStorage242?.sharedLabStorage||root.localStorage;
 const MODULES=['APR','OTROS'];
 const clone=x=>JSON.parse(JSON.stringify(x));
 const now=()=>new Date().toISOString();
 const labels={APR:'Prevencionista de riesgos',OTROS:'Supervisores, capataces y otros'};
 const ROLES=['usuario','supervisor','administrador_area'];
 const initial=()=>({
  rev:0,
  users:[
   {usuario_id:'prueba-admin',nombre:'Administrador de ejemplo',rol:'administrador_area',activo:true,revision:3,ambitos:{APR:{ver:true,editar:true,areas:['apr-va4','apr-v5']},OTROS:{ver:false,editar:false,areas:[]}}},
   {usuario_id:'prueba-supervisor',nombre:'Supervisor de ejemplo',rol:'supervisor',activo:true,revision:2,ambitos:{APR:{ver:true,editar:true,areas:['apr-va4']},OTROS:{ver:true,editar:false,areas:['otr-va4']}}},
   {usuario_id:'prueba-prevencionista',nombre:'Prevencionista de ejemplo',rol:'usuario',activo:true,revision:1,ambitos:{APR:{ver:true,editar:true,areas:['apr-au']}}},
   {usuario_id:'prueba-apoyo',nombre:'Apoyo de terreno',rol:'usuario',activo:true,revision:4,ambitos:{OTROS:{ver:true,editar:false,areas:['otr-v5','otr-au']}}}
  ],
  areas:[
   {id:'apr-va4',nombre:'VA4',activa:true,modulo:'APR'},{id:'apr-v5',nombre:'V5',activa:true,modulo:'APR'},
   {id:'apr-au',nombre:'AUCAYES',activa:true,modulo:'APR'},{id:'apr-mt',nombre:'MAITENES',activa:true,modulo:'APR'},
   {id:'otr-va4',nombre:'VA4',activa:true,modulo:'OTROS'},{id:'otr-v5',nombre:'V5',activa:true,modulo:'OTROS'},
   {id:'otr-au',nombre:'AUCAYES',activa:true,modulo:'OTROS'},{id:'otr-mt',nombre:'MAITENES',activa:true,modulo:'OTROS'}
  ],
  faculties:[
   {usuario_id:'prueba-admin',modulo:'APR',revision:1,areas_ids:['apr-va4','apr-v5'],facultades:{view:true,audit:true}},
   {usuario_id:'prueba-admin',modulo:'OTROS',revision:0,areas_ids:[],facultades:{}}
  ],
  lists:[
   ...['APR','OTROS'].flatMap(modulo=>[
    {modulo,campo:'shift',valor:'Día',activa:true},
    {modulo,campo:'shift',valor:'Noche',activa:true},
    {modulo,campo:'Resultado',valor:'Sin novedades',activa:true},
    {modulo,campo:'Resultado',valor:'Con observaciones',activa:true},
    {modulo,campo:'Prioridad',valor:'Alta',activa:true},
    {modulo,campo:'Prioridad',valor:'Media',activa:true},
    {modulo,campo:'Estado',valor:'Pendiente',activa:true},
    {modulo,campo:'Estado',valor:'Cerrado',activa:true}
   ].map((x,i)=>({...x,id:'test-list-'+modulo+'-'+i})))
  ],
  history:[]
 });
 function normalize(source){
  if(!source||!Array.isArray(source.users)||!Array.isArray(source.areas)||!Array.isArray(source.faculties)||!Array.isArray(source.history))return initial();
  if(!Array.isArray(source.lists))source.lists=initial().lists;
  return source;
 }
 let state;
 try{state=normalize(JSON.parse(store.getItem(KEY)||'null'))}catch{state=initial()}
 const get=()=>clone(state);
 function persist(next){state=clone(next);store.setItem(KEY,JSON.stringify(state));root.dispatchEvent(new CustomEvent('hys263-lab-changed',{detail:{revision:state.rev}}));}
 function write(action,target,apply,motivo){
  const next=get(),value=apply(next);next.rev=(next.rev||0)+1;
  next.history.unshift({id:'evento-'+next.rev,fecha:now(),actor:'Administrador general (simulado)',accion:action,usuario:target,motivo:String(motivo||'Prueba de laboratorio').slice(0,500),anterior:value?.audit?.anterior||null,nuevo:value?.audit?.nuevo||null});
  next.history=next.history.slice(0,250);persist(next);return clone(value);
 }
 const fail=msg=>{throw Error(msg)};
 const person=(s,id)=>s.users.find(u=>u.usuario_id===id)||fail('Usuario de prueba inexistente');
 const assertRole=role=>{if(!ROLES.includes(role))fail('Rol no permitido en el laboratorio')};
 function assertScopes(s,ambitos){
  if(!ambitos||typeof ambitos!=='object')fail('Ámbitos inválidos');
  let active=0;
  for(const m of MODULES){
   const a=ambitos[m];if(!a||a.ver!==true)continue;
   active++;
   if(!Array.isArray(a.areas)||a.areas.length===0)fail('La tarjeta '+labels[m]+' necesita áreas');
   for(const id of a.areas){const area=s.areas.find(x=>x.id===id&&x.modulo===m&&x.activa);if(!area)fail('Área inexistente o inactiva: '+id)}
  }
  if(!active)fail('La cuenta activa necesita al menos una tarjeta');
 }
 function assertRevision(value,expected){if(value!==(Number(expected)||0))fail('Conflicto de revisión. Actualiza la ficha antes de guardar')}
 function updateFaculties(s,id,role,faculties,revs){
  for(const m of MODULES){
   const old=s.faculties.find(x=>x.usuario_id===id&&x.modulo===m);
   const index=s.faculties.findIndex(x=>x.usuario_id===id&&x.modulo===m);
   if(revs&&Object.prototype.hasOwnProperty.call(revs,m))assertRevision(old?.revision||0,revs[m]);
   const f=role==='administrador_area'?faculties?.[m]:null;
   const entry={usuario_id:id,modulo:m,revision:(old?.revision||0)+1,areas_ids:[...new Set(f?.areas_ids||[])],facultades:Object.fromEntries(Object.entries(f?.facultades||{}).filter(([,on])=>on===true))};
   if(index<0)s.faculties.push(entry);else s.faculties[index]=entry;
  }
 }
 function atomic(id,role,ambitos,faculties,expected,revs,motivo,action){
  const s=get(),u=person(s,id);assertRole(role);assertRevision(u.revision,expected);assertScopes(s,ambitos);
  const checked=root.Hys265WorkerModel?.validConfiguration(role,ambitos,faculties,s.areas);
  if(checked&&!checked.ok)fail(checked.errors.join('. '));
  for(const m of MODULES)if(revs&&Object.prototype.hasOwnProperty.call(revs,m)){
   const rec=s.faculties.find(x=>x.usuario_id===id&&x.modulo===m);
   assertRevision(rec?.revision||0,revs[m]);
  }
  if(role==='administrador_area')for(const m of MODULES)for(const area of faculties?.[m]?.areas_ids||[]){
   if(!ambitos[m]?.ver||!ambitos[m]?.areas?.includes(area))fail('Facultad fuera del ámbito autorizado: '+area);
  }
  return write(action,id,next=>{
   const dest=person(next,id);
   dest.rol=role;dest.ambitos=clone(ambitos);dest.revision++;
   updateFaculties(next,id,role,faculties,null);
   return {usuario_id:id,revision:dest.revision};
  },motivo);
 }
 function assign(params){
  const s=get(),u=person(s,params.p_usuario),m=params.p_modulo;
  if(!MODULES.includes(m)||u.rol!=='administrador_area')fail('Facultades fuera de rol o módulo');
  const prior=s.faculties.find(x=>x.usuario_id===u.usuario_id&&x.modulo===m);
  assertRevision(prior?.revision||0,params.p_revision);
  for(const id of params.p_areas||[])if(!u.ambitos[m]?.areas?.includes(id))fail('Área fuera del ámbito actual');
  const all=Object.fromEntries(MODULES.map(module=>{
   const old=s.faculties.find(row=>row.usuario_id===u.usuario_id&&row.modulo===module);
   return [module,module===m?{areas_ids:params.p_areas||[],facultades:params.p_facultades||{}}:
    {areas_ids:old?.areas_ids||[],facultades:old?.facultades||{}}];
  }));
  const verdict=root.Hys265WorkerModel?.validConfiguration(u.rol,u.ambitos,all,s.areas);
  if(verdict&&!verdict.ok)fail(verdict.errors.join('. '));
  return write('Facultades: '+labels[m],u.usuario_id,next=>{
   const existing=next.faculties.find(x=>x.usuario_id===u.usuario_id&&x.modulo===m);
   const entry={usuario_id:u.usuario_id,modulo:m,revision:(existing?.revision||0)+1,areas_ids:[...new Set(params.p_areas||[])],facultades:clone(params.p_facultades||{})};
   if(existing)Object.assign(existing,entry);else next.faculties.push(entry);
   return {revision:entry.revision};
  },params.p_motivo);
 }
 function changeUser(params){
  const s=get(),u=person(s,params.p_usuario);assertRevision(u.revision,params.p_revision);
  const data=params.p_datos||{};
  assertRole(data.rol);assertScopes(s,data.ambitos);
  if(data.rol!==u.rol)fail('Cambio de rol exige guardar en el formulario unificado transaccional');
  if(!String(data.nombre||'').trim())fail('Nombre requerido');
  return write('Actualización de usuario',u.usuario_id,next=>{
   const user=person(next,u.usuario_id);
   user.nombre=String(data.nombre).trim().slice(0,150);user.activo=data.activo===true;
   user.ambitos=clone(data.ambitos);user.revision++;
   return {revision:user.revision};
  },params.p_motivo);
 }
 async function rpc(name,p={}){
  try{
   switch(name){
    case 'hys242_listar_usuarios':return {data:get().users,error:null};
    case 'hys242_guardar_usuario':return {data:changeUser(p),error:null};
    case 'hys242_asignar_facultades':return {data:assign(p),error:null};
    case 'hys261_guardar_facultades_atomico':{
     const u=person(get(),p.p_usuario);
     return {data:atomic(u.usuario_id,u.rol,p.p_ambitos,p.p_facultades,p.p_revision_usuario,p.p_revisiones_facultades,p.p_motivo,'Accesos y facultades (atómico simulado)'),error:null};
    }
    case 'hys262_guardar_rol_y_facultades_atomico':return {data:atomic(p.p_usuario,p.p_rol,p.p_ambitos,p.p_facultades,p.p_revision_usuario,p.p_revisiones_facultades,p.p_motivo,'Rol y facultades (atómico simulado)'),error:null};
    default:throw Error('RPC no simulada: '+name);
   }
  }catch(e){return {data:null,error:{message:e.message}}}
 }
 function from(table){
  if(table==='areas_trabajo_v242')return {select:()=>({in:(field,modules)=>({order:async()=>({data:get().areas.filter(x=>modules.includes(x.modulo)).sort((a,b)=>a.nombre.localeCompare(b.nombre)),error:null})})})};
  if(table==='facultades_v242')return {select:()=>({eq:async(field,id)=>({data:get().faculties.filter(x=>x.usuario_id===id),error:null})})};
  throw Error('Tabla no simulada: '+table);
 }
 function createUser(name){
  const clean=String(name||'').trim();if(clean.length<3||clean.length>150)fail('El nombre requiere entre 3 y 150 caracteres');
  if(get().users.some(x=>x.nombre.toLowerCase()===clean.toLowerCase()))fail('Ya existe una persona con ese nombre');
  return write('Crear usuario',clean,s=>{
   const id='prueba-'+(s.rev+1)+'-'+Math.random().toString(36).slice(2,7);
   const u={usuario_id:id,nombre:clean,rol:'usuario',activo:true,revision:1,ambitos:{APR:{ver:true,editar:false,areas:s.areas.filter(a=>a.modulo==='APR'&&a.activa).slice(0,1).map(a=>a.id)}}};
   s.users.push(u);return u;
  });
 }
 function updateUser(id,name,active){
  const clean=String(name||'').trim();if(clean.length<3||clean.length>150)fail('Nombre inválido');
  return write('Editar cuenta',id,s=>{
   const u=person(s,id);u.nombre=clean;u.activo=active===true;u.revision++;return u;
  });
 }
 function newArea(module,name){
  if(!MODULES.includes(module))fail('Tarjeta no válida');
  const clean=String(name||'').trim();if(clean.length<2||clean.length>100)fail('Nombre de área inválido');
  if(get().areas.some(a=>a.modulo===module&&a.nombre.toLocaleLowerCase('es')===clean.toLocaleLowerCase('es')))fail('Ya existe esta área en la tarjeta');
  return write('Crear área',module,s=>{
   const a={id:'lab-area-'+(s.rev+1)+'-'+module,nombre:clean,activa:true,modulo:module};s.areas.push(a);return a;
  });
 }
 function updateArea(id,name,active){
  const clean=String(name||'').trim();if(clean.length<2||clean.length>100)fail('Nombre de área inválido');
  const original=get().areas.find(a=>a.id===id)||fail('Área inexistente');
  if(get().areas.some(a=>a.id!==id&&a.modulo===original.modulo&&a.nombre.toLocaleLowerCase('es')===clean.toLocaleLowerCase('es')))fail('Nombre duplicado');
  return write('Editar área',id,s=>{const a=s.areas.find(x=>x.id===id);a.nombre=clean;a.activa=active===true;return a});
 }

 function createOption(module,field,value){
  if(!MODULES.includes(module))fail('Tarjeta no válida');
  const fields=['shift','project','Resultado','Prioridad','Estado','owner','otherCategory','otherStatus'];
  if(!fields.includes(field))fail('Selector de formulario no autorizado');
  const clean=String(value||'').trim().replace(/\s+/g,' ');
  if(clean.length<2||clean.length>150)fail('Nombre de opción inválido');
  if(get().lists.some(x=>x.modulo===module&&x.campo===field&&x.valor.toLocaleLowerCase('es')===clean.toLocaleLowerCase('es')))fail('La opción ya existe en esta lista');
  return write('Crear opción',module,s=>{
   const item={id:'test-list-'+module+'-'+(s.rev+1),modulo:module,campo:field,valor:clean,activa:true};
   s.lists.push(item);return item;
  });
 }
 function updateOption(id,value,active){
  const prev=get().lists.find(x=>x.id===id)||fail('Opción de laboratorio inexistente');
  const clean=String(value||'').trim().replace(/\s+/g,' ');
  if(clean.length<2||clean.length>150)fail('Nombre de opción inválido');
  if(get().lists.some(x=>x.id!==id&&x.modulo===prev.modulo&&x.campo===prev.campo&&x.valor.toLocaleLowerCase('es')===clean.toLocaleLowerCase('es')))fail('Esta opción ya existe');
  return write('Editar opción',id,s=>{
   const item=s.lists.find(x=>x.id===id);item.valor=clean;item.activa=active===true;return item;
  });
 }

 // v265: alta y edición conjunta de ficha laboral, tarjeta, rol y facultades.
 // Todos los datos pertenecen exclusivamente al laboratorio ficticio.
 function validateWorkerTransaction(payload,currentId=''){
  const W=root.Hys265WorkerModel;
  if(!W)fail('No se cargó el modelo v265');
  const s=get();
  const valid=W.validate(payload.trabajador,s.users,currentId);
  if(!valid.ok)fail(valid.errors.join('. '));
  const account=W.validateAccount(payload.cuenta,valid.worker,Boolean(currentId));
  if(!account.ok)fail(account.errors.join('. '));
  if(payload.cuenta?.email&&payload.cuenta.email!==account.cuenta.email)fail('Correo de acceso no coincide con la ficha laboral');
  if(!W.roles.includes(payload.rol))fail('Rol no válido');
  const config=W.validConfiguration(payload.rol,payload.ambitos,payload.facultades,s.areas);
  if(!config.ok)fail(config.errors.join('. '));
  if(String(payload.motivo||'').trim().length<10)fail('El motivo debe contener al menos 10 caracteres');
  if(payload.rol==='administrador_area'&&currentId){
   const previous=s.users.find(u=>u.usuario_id===currentId);
   if(previous?.rol!=='administrador_area'){
    const all=MODULES.some(m=>Object.values(payload.facultades?.[m]?.facultades||{}).some(Boolean));
    // Facultades nuevas se aceptan solo cuando están seleccionadas explícitamente en el formulario nuevo.
    if(all&&payload.confirmar_facultades_nuevas!==true)fail('Confirma expresamente las facultades nuevas');
   }
  }
  return {worker:valid.worker,cuenta:account.cuenta};
 }
 function createWorker(payload){
  const W=root.Hys265WorkerModel,{worker,cuenta}=validateWorkerTransaction(payload);
  const email=cuenta.email,roles=['usuario','supervisor','administrador_area'];
  if(!roles.includes(payload.rol))fail('Rol no válido');
  return write('Creación de usuario',worker.nombre,next=>{
   const id='prueba-v265-'+(next.rev+1)+'-'+Math.random().toString(36).slice(2,8);
   const u={usuario_id:id,nombre:worker.nombre,email,rol:payload.rol,activo:worker.estado_laboral==='activo',revision:1,ambitos:clone(payload.ambitos),trabajador:clone(worker),cuenta:clone(cuenta)};
   next.users.push(u);
   updateFaculties(next,id,payload.rol,payload.facultades,null);
   return {usuario_id:id,revision:1,audit:{anterior:null,nuevo:{trabajador:W.auditSafe(worker),cuenta:{estado:cuenta.estado,correo_ingreso:cuenta.correo_ingreso,metodo:cuenta.metodo},rol:u.rol,ambitos:clone(u.ambitos),facultades:payload.rol==='administrador_area'?clone(payload.facultades):{}}}};
  },payload.motivo);
 }
 function updateWorker(id,payload,revision){
  const W=root.Hys265WorkerModel,s=get(),u=person(s,id);
  assertRevision(u.revision,revision);
  if(u.rol==='administrador_global')fail('Cuenta protegida');
  const {worker,cuenta}=validateWorkerTransaction(payload,id);
  const original=clone(u);
  if(u.rol!=='administrador_area'&&payload.rol==='administrador_area'){
   // Si se había guardado una desdesignación, el backend garantiza que no se heredan permisos históricos.
   for(const m of MODULES)if(!Object.prototype.hasOwnProperty.call(payload.facultades?.[m]?.facultades||{},'view')&&Object.keys(payload.facultades?.[m]?.facultades||{}).length===0){
    // El conjunto vacío es seguro y se conserva.
   }
  }
  return write('Modificación de usuario',id,next=>{
   const dest=person(next,id);
   const originalRole=dest.rol;
   dest.nombre=worker.nombre;dest.email=cuenta.email;
   dest.trabajador=clone(worker);dest.cuenta=clone(cuenta);dest.rol=payload.rol;dest.activo=worker.estado_laboral==='activo';
   dest.ambitos=clone(payload.ambitos);dest.revision++;
   updateFaculties(next,id,payload.rol,payload.facultades,null);
   return {usuario_id:id,revision:dest.revision,audit:{
    anterior:{trabajador:W.auditSafe(original.trabajador||{}),cuenta:{estado:original.cuenta?.estado||'existente',correo_ingreso:original.cuenta?.correo_ingreso||'',metodo:original.cuenta?.metodo||''},rol:original.rol,ambitos:original.ambitos,facultades:originalRole==='administrador_area'?Object.fromEntries(MODULES.map(m=>[m,originalFacSnapshot(s,id,m)])):{}},
    nuevo:{trabajador:W.auditSafe(worker),cuenta:{estado:cuenta.estado,correo_ingreso:cuenta.correo_ingreso,metodo:cuenta.metodo},rol:dest.rol,ambitos:dest.ambitos,facultades:dest.rol==='administrador_area'?clone(payload.facultades):{}}
   }};
  },payload.motivo);
 }
 function originalFacSnapshot(s,id,module){
  const f=s.faculties.find(x=>x.usuario_id===id&&x.modulo===module);
  return {areas_ids:clone(f?.areas_ids||[]),facultades:clone(f?.facultades||{})};
 }

 function reset(){persist(initial());return get()}
 function report(){return {users:get().users,areas:get().areas,faculties:get().faculties,history:get().history}}
 root.Hys263Lab={get,reset,report,createUser,updateUser,createWorker,updateWorker,newArea,updateArea,createOption,updateOption,rpc,from,labels,key:KEY};
 root.reportesHysSupabase={rpc,from};
})(window);
