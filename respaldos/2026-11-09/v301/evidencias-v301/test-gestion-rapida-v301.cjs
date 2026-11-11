/* HYS v301: nueva pestaña rápida y ausencia total de escrituras reales. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const base=path.resolve(__dirname,'../v301-review');
const src=n=>fs.readFileSync(path.join(base,n),'utf8');
const app=src('gestion-usuarios-v265.js'),css=src('gestion-usuarios-v265.css'),
 html=src('index.html'),appearance=src('appearance-v242.js'),config=src('config-v242.js');
const modules=['APR','OTROS'];
const areas=[{id:'a1',modulo:'APR',nombre:'Área APR',activa:true},{id:'a2',modulo:'APR',nombre:'Área B',activa:true},{id:'o1',modulo:'OTROS',nombre:'Área OTROS',activa:true}];
const enabled={APR:{ver:true,editar:true,areas:['a1']},OTROS:{ver:false,editar:false,areas:[]}};
const admin={usuario_id:'admin',nombre:'Administrador General',rol:'administrador_global',activo:true,revision:1,ambitos:structuredClone(enabled)};
const worker={usuario_id:'usr',nombre:'Usuario de pruebas',rol:'usuario',activo:true,revision:3,ambitos:structuredClone(enabled),trabajador:{cargo:'Operador',nombre:'Usuario de pruebas'}};
const supervisor={usuario_id:'sup',nombre:'Supervisor de pruebas',rol:'supervisor',activo:true,revision:2,ambitos:structuredClone(enabled)};
const manager={usuario_id:'mgr',nombre:'Administrador de pruebas',rol:'administrador_area',activo:true,revision:2,ambitos:structuredClone(enabled)};
const users=[admin,worker,supervisor,manager];
let count=0;
async function check(title,fn){await fn();count++;console.log('OK '+String(count).padStart(2,'0')+' · '+title)}
function fixture(role='administrador_global'){
 const dom=new JSDOM('<html><head></head><body class="module-choice"><aside id="hysToolsRail" hidden></aside><nav id="hysToolsOptions"></nav><div id="moduleChooser"></div></body></html>',{url:'https://prueba.local/v301-review/index.html',runScripts:'outside-only'});
 const w=dom.window;
 const calls=[];
 w.__REPORTES_HYS_ACCESS__={userId:'admin',profile:{usuario_id:'admin',rol:role,activo:true},selectedModule:null,modules:['APR','OTROS'],permissions:[]};
 w.Hys274Credentials={validate:()=>({ok:true})};
 w.Hys278AccessControl={validTarget:()=>true};
 w.Hys279Backend={shifts:async()=>[]};
 w.HysAppearance242={mount(){}};
 w.reportesHysSupabase={
  rpc:async name=>{calls.push(name);if(name==='hys242_listar_usuarios')return {data:users,error:null};throw Error('RPC no autorizada en v301')},
  from:table=>{
   calls.push('from:'+table);
   const q={select(){return q},in(){return q},order(){return Promise.resolve({data:table==='areas_trabajo_v242'?areas:[],error:null})},
   then(resolve,reject){return Promise.resolve({data:table==='facultades_v242'?[]:areas,error:null}).then(resolve,reject)}};
   return q;
  }
 };
 w.eval(src('worker-model-v265.js'));
 w.eval(app);
 const d=w.document;
 const open=()=>w.Hys265UserManagement.open('directory');
 const tab=()=>d.querySelector('[data-hys265-tab="quick"]');
 const click=(selector)=>{const b=d.querySelector(selector);assert.ok(b,selector+' unavailable');b.click();return b};
 const close=()=>dom.window.close();
 return {dom,w,d,open,tab,click,calls,close};
}
(async()=>{
 await check('Quinta pestaña presente después de las cuatro opciones originales',()=>{
  const d=new JSDOM('<div>'+app.match(/panel\.innerHTML='([\s\S]*?)';/)[1]+'</div>').window.document;
  const tabs=[...d.querySelectorAll('[data-hys265-tab]')].map(b=>b.textContent);
  assert.deepEqual(tabs,['Crear usuario','Usuarios registrados','Historial','Mis datos laborales','Permisos y facultades']);
 });
 await check('La quinta opción pertenece al mismo nav, no al menú lateral',()=>{
  assert.match(app,/data-hys265-tab="self"[^>]*>Mis datos laborales<\/button><button data-hys265-tab="quick"/);
  assert.ok(!app.includes("newButton('hys301"));
 });
 await check('Las cinco pestañas permanecen contiguas con desplazamiento en pantalla estrecha',()=>{
  assert.match(css,/\.hys265-tabs\{flex-wrap:nowrap;overflow-x:auto/);
  assert.match(css,/\.hys265-tabs button\{white-space:nowrap/);
 });
 await check('La versión visible solo se conserva en el selector de tarjetas',()=>{
  assert.match(html,/Reportes H y S · v301 · Revisión/);
  assert.match(appearance,/c\.text\.company\+' · v301 · Revisión'/);
  assert.ok(!html.includes('id="devVersion242"'));
 });
 await check('Se conservan las cuatro pestañas anteriores sin cambiar su identidad',()=>{
  for(const id of ['create','directory','history','self'])assert.match(app,new RegExp('data-hys265-tab="'+id+'"'));
 });
 await check('El editor rápido reutiliza controles existentes de rol y facultades',()=>{
  assert.match(app,/stepRoles\(roles,true\)/);
  assert.match(app,/stepSpecial\(facultades,true\)/);
  assert.match(app,/function stepRoles\(p,quick=false\)/);
  assert.match(app,/function stepSpecial\(p,quick=false\)/);
 });
 await check('La pestaña rápida tiene buscador de usuarios existentes',()=>{
  assert.match(app,/id='hys301Search'/);
  assert.match(app,/Nombre, correo, cargo o rol/);
 });
 await check('La pestaña rápida no presenta datos laborales ni contraseñas editables',()=>{
  const p=app.slice(app.indexOf('function renderQuickPermissions('),app.indexOf('function renderDirectory('));
  assert.ok(!p.includes('stepWorker('));
  assert.ok(!p.includes('stepAccount('));
  assert.ok(!p.includes('credentialSecret'));
 });
 await check('Guardar permisos permanece claramente bloqueado',()=>{
  assert.match(app,/Guardar permisos \(pendiente\)/);
  assert.match(app,/save\.disabled=true/);
  assert.ok(!app.includes('async function saveQuickToSupabase'));
 });
 await check('No se activó escritura real de Supabase',()=>{
  for(const k of ['HYS242_ENABLE_CENTRAL=false','HYS242_DEPLOYMENT_READY=false','HYS292_REMOTE_WRITE_AUTHORIZED=false'])assert.match(config,new RegExp(k));
 });
 await check('Los JS de nueva versión son válidos',()=>{
  for(const n of ['gestion-usuarios-v265.js','worker-model-v265.js','appearance-v242.js'])new vm.Script(src(n));
 });
 await check('HTML conserva scripts embebidos sintácticamente válidos',()=>{
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
   .filter(x=>!/\bsrc\s*=/.test(x[1])&&!/application\/json/i.test(x[1]));
  assert.ok(scripts.length>=5);scripts.forEach((x,i)=>new vm.Script(x[2],{filename:'embedded-'+i}));
 });
 await check('Los recursos JS/CSS locales usan etiqueta v301',()=>{
  const urls=[...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)].map(x=>x[1])
  .filter(x=>!/^https?:|^\/\//.test(x)&&/\.(?:js|css)\?/.test(x));
  assert.ok(urls.length>62);assert.ok(urls.every(u=>u.endsWith('?build=v301-quick')));
 });
 const f=fixture();
 try{
  await check('Administrador General puede abrir la Gestión de usuarios',async()=>{
   await f.open();assert.equal(f.d.getElementById('hys265UsersPanel').hidden,false);
  });
  await check('Cinco pestañas se muestran en la misma ventana abierta',()=>{
   assert.equal(f.d.querySelectorAll('[data-hys265-tab]').length,5);
  });
  await check('La nueva pestaña abre sin asistente de cinco pasos',()=>{
   f.tab().click();assert.ok(f.d.querySelector('#hys301Search'));
   assert.equal(f.d.querySelector('#hys265StepContent'),null);
  });
  await check('Se muestran solo usuarios administrables, excluyendo Administrador General',()=>{
   assert.match(f.d.getElementById('hys301Count').textContent,/3 de 3/);
   assert.equal(f.d.querySelectorAll('#hys301Rows .hys301-person').length,3);
  });
  await check('Filtro de texto responde sin pasar por Creación',()=>{
   const input=f.d.getElementById('hys301Search');input.value='Supervisor';input.dispatchEvent(new f.w.Event('input'));
   assert.match(f.d.getElementById('hys301Count').textContent,/1 de 3/);
   assert.ok(!f.d.querySelector('#hys265StepContent'));
  });
  await check('Elegir supervisor abre su editor directo de autorizaciones',()=>{
   f.click('#hys301Rows button');assert.match(f.d.getElementById('hys265Content').textContent,/Supervisor de pruebas/);
   assert.match(f.d.getElementById('hys265Content').textContent,/Rol y tarjetas permitidas/);
  });
  await check('Las secciones de áreas y facultades aparecen inmediatamente',()=>{
   assert.match(f.d.getElementById('hys265Content').textContent,/Áreas y facultades especiales/);
   assert.equal(f.d.querySelector('#hys265StepContent'),null);
  });
  await check('El botón de guardar Supabase está desactivado también tras seleccionar persona',()=>{
   const b=[...f.d.querySelectorAll('#hys265Content button')].find(b=>/Guardar permisos/.test(b.textContent));
   assert.ok(b);assert.equal(b.disabled,true);
  });
  await check('La pestaña conserva motivo obligatorio sin modificar otras fichas',()=>{
   assert.ok(f.d.getElementById('hys301Reason'));assert.equal(f.d.querySelector('#authPassword'),null);
  });
  await check('Revisar sin motivo no permite confirmar propuesta',()=>{
   f.click('#hys265Content button.primary');
   assert.match(f.d.getElementById('hys301Summary').textContent,/motivo|Revisa|No existen/);
  });
  await check('Cambiar rol actualiza controles sin volver a los cinco pasos',()=>{
   const select=f.d.querySelector('#hys265Content select');
   assert.ok(select);select.value='administrador_area';select.dispatchEvent(new f.w.Event('change',{bubbles:true}));
   assert.match(f.d.getElementById('hys265Content').textContent,/Facultades de Administrador/);
   assert.equal(f.d.querySelector('#hys265StepContent'),null);
  });
  await check('La propuesta exige un motivo extenso',()=>{
   const reason=f.d.getElementById('hys301Reason');reason.value='Cambio';reason.dispatchEvent(new f.w.Event('input'));
   f.click('#hys265Content button.primary');
   assert.match(f.d.getElementById('hys301Summary').textContent,/10 caracteres/);
  });
  await check('Ningún botón de previsualización escribe en Supabase',()=>{
   assert.deepEqual(f.calls.filter(x=>/guardar|update|insert|delete|crear/i.test(x)),[]);
  });
  await check('Elegir otra persona devuelve al buscador',()=>{
   f.w.confirm=()=>true;
   const button=[...f.d.querySelectorAll('#hys265Content button')].find(b=>b.textContent==='Elegir otro usuario');
   assert.ok(button);button.click();assert.ok(f.d.querySelector('#hys301Search'));
  });
  await check('El historial y creación siguen disponibles después de utilizar la quinta opción',()=>{
   assert.ok(f.d.querySelector('[data-hys265-tab="history"]'));
   f.click('[data-hys265-tab="create"]');assert.match(f.d.getElementById('hys265Content').textContent,/Paso 1 de 5/);
  });
 }finally{f.close()}
 const unauthorized=fixture('usuario');
 try{
  await check('Usuario normal no puede abrir Gestión de usuarios ni pestaña rápida',async()=>{
   await unauthorized.open();assert.equal(unauthorized.d.getElementById('hys265UsersPanel').hidden,true);
   assert.equal(unauthorized.calls.length,0);
  });
 }finally{unauthorized.close()}
 console.log('PASS · '+count+' pruebas v301 de gestión rápida, sin escrituras reales.');
})().catch(e=>{console.error(e);process.exitCode=1});
