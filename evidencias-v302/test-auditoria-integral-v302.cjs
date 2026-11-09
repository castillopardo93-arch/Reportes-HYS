/* HYS v302 — Auditoría integral de regresión v301; pruebas aisladas sin Supabase real. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const base=path.join(root,'v302-review'),prior=path.join(root,'v301-review');
const get=n=>fs.readFileSync(path.join(base,n),'utf8');
const app=get('gestion-usuarios-v265.js'),html=get('index.html'),css=get('gestion-usuarios-v265.css'),appearance=get('appearance-v242.js'),config=get('config-v242.js');
const modules=['APR','OTROS'];
const areas=[{id:'a1',modulo:'APR',nombre:'Área 1',activa:true},{id:'a2',modulo:'APR',nombre:'Área 2',activa:true},{id:'o1',modulo:'OTROS',nombre:'Área 3',activa:true}];
const rights={view:true,pdf:true,users:true};
const scope={APR:{ver:true,editar:true,areas:['a1']},OTROS:{ver:false,editar:false,areas:[]}};
const makeUser=(id,nombre,rol='usuario')=>({usuario_id:id,nombre,rol,activo:true,revision:2,ambitos:structuredClone(scope),trabajador:{nombre,cargo:'Operaciones'},cuenta:{email:id+'@invalid.local'}});
const admin=makeUser('global','Administrador general','administrador_global');
const worker=makeUser('usr1','Persona de prueba');
const supervisor=makeUser('usr2','Supervisor de prueba','supervisor');
const mgr=makeUser('mgr1','Administrador local','administrador_area');
const users=[admin,worker,supervisor,mgr];
const grants=[{usuario_id:mgr.usuario_id,modulo:'APR',revision:1,areas_ids:['a1'],facultades:{...rights}}];
const deep=x=>JSON.parse(JSON.stringify(x));
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
let checks=0;
async function check(name,fn){await fn();checks++;console.log('OK '+String(checks).padStart(2,'0')+' · '+name)}
function fixture(opts={}){
 const d=new JSDOM('<html><head></head><body class="module-choice"><div id="hysToolsRail"></div><nav id="hysToolsOptions"></nav></body></html>',
  {url:'https://revision.local/v302-review/index.html',runScripts:'outside-only'});
 const w=d.window,document=w.document;
 const calls=[], records=deep(opts.users||users),facultyData=deep(opts.faculties||grants);
 w.confirm=()=>opts.confirm!==false;
 w.__REPORTES_HYS_ACCESS__={userId:'global',profile:{usuario_id:'global',rol:opts.role||'administrador_global',activo:true},selectedModule:null,modules:modules.slice()};
 w.Hys274Credentials={validate:()=>({ok:true})};
 w.Hys278AccessControl={validTarget:()=>true};
 w.Hys279Backend={shifts:()=>opts.shiftsPromise||Promise.resolve([]),
   available:async()=>({ready:false,reason:'Entorno de pruebas sin ficha conectada'})};
 w.HysAppearance242={mount:()=>{}};
 w.reportesHysSupabase={
  rpc:async(name)=>{
   calls.push('rpc:'+name);
   if(name==='hys242_listar_usuarios')return opts.listPromise||opts.listReturn||{data:records,error:null};
   throw Error('RPC inesperado de datos centrales: '+name);
  },
  from:(table)=>{
   const query={
    select(){return query},in(){return query},order(){return query},limit(){return query},eq(){return query},
    then(fulfilled,rejected){
     calls.push('from:'+table);
     let value;
     if(opts.tableReturn&&Object.hasOwn(opts.tableReturn,table))value=opts.tableReturn[table];
     else if(table==='areas_trabajo_v242')value={data:areas,error:null};
     else if(table==='facultades_v242')value={data:facultyData,error:null};
     else if(table==='eventos_v242'||table==='auditoria_facultades_v242')value={data:[],error:null};
     else throw Error('Tabla no prevista: '+table);
     return Promise.resolve(value).then(fulfilled,rejected);
    }
   };
   return query;
  }
 };
 w.eval(get('worker-model-v265.js'));w.eval(app);
 const open=(tab='directory')=>w.Hys265UserManagement.open(tab);
 const quick=()=>document.querySelector('[data-hys265-tab="quick"]').click();
 const click=selector=>{const el=document.querySelector(selector);assert.ok(el,'Elemento ausente '+selector);el.click();return el};
 const getText=()=>document.getElementById('hys265Content').textContent;
 return {dom:d,w,doc:document,open,quick,click,getText,records,calls,close:()=>w.close()};
}
(async()=>{
 await check('94 archivos v301 se conservan en la copia auditada',()=>{
  const a=fs.readdirSync(prior).filter(n=>fs.statSync(path.join(prior,n)).isFile());
  assert.equal(a.length,94);
  assert.equal(fs.readdirSync(base).filter(n=>fs.statSync(path.join(base,n)).isFile()).length,95);
  assert.ok(a.every(n=>fs.existsSync(path.join(base,n))));
 });
 await check('90 archivos no intervenidos conservan sus bytes exactos',()=>{
  const exceptions=new Set(['MANIFIESTO.json','gestion-usuarios-v265.js','index.html','appearance-v242.js']);
  const a=fs.readdirSync(prior).filter(n=>fs.statSync(path.join(prior,n)).isFile());
  const stable=a.filter(n=>!exceptions.has(n));
  assert.equal(stable.length,90);
  for(const name of stable){const p=fs.readFileSync(path.join(prior,name)),q=fs.readFileSync(path.join(base,name));
   assert.equal(crypto.createHash('sha256').update(p).digest('hex'),crypto.createHash('sha256').update(q).digest('hex'),name)}
 });
 await check('Todos los JavaScript y CSS de la app están presentes',()=>{
  const refs=[...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)]
   .map(x=>x[1]).filter(x=>!/^https?:|^\/\//.test(x)&&/\.(?:js|css)(?:\?|$)/.test(x)).map(x=>x.split('?')[0]);
  assert.ok(refs.length>=63);
  for(const name of refs)assert.ok(fs.existsSync(path.join(base,name)),name);
 });
 await check('Todos los JS de la copia pasan análisis sintáctico',()=>{
  const jsFiles=fs.readdirSync(base).filter(n=>n.endsWith('.js'));
  assert.ok(jsFiles.length>=48);
  for(const name of jsFiles)new vm.Script(get(name),{filename:name});
 });
 await check('Scripts embebidos del informe siguen siendo sintácticamente válidos',()=>{
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(x=>!/\bsrc\s*=/.test(x[1])&&!/application\/json/.test(x[1]));
  assert.ok(scripts.length>=5);scripts.forEach((x,i)=>new vm.Script(x[2],{filename:'index-inline-'+i}));
 });
 await check('No hay IDs duplicados en el documento principal',()=>{
  const dom=new JSDOM(html);const ids=[...dom.window.document.querySelectorAll('[id]')].map(x=>x.id);
  assert.equal(ids.length,new Set(ids).size);dom.window.close();
 });
 await check('Bibliotecas PDF externas siguen vinculadas',()=>{
  assert.match(html,/html2canvas\/1\.4\.1\/html2canvas\.min\.js/);
  assert.match(html,/jspdf\/2\.5\.1\/jspdf\.umd\.min\.js/);
 });
 await check('Dependencias de gestión de usuarios se cargan antes del editor',()=>{
  const names=['worker-model-v265.js','credentials-v274.js','control-accesos-v278.js','ficha-backend-v279.js','gestion-usuarios-v265.js'];
  const locations=names.map(n=>html.indexOf('src="'+n));
  assert.ok(locations.every(n=>n>=0),JSON.stringify(locations));
  assert.ok(locations.slice(0,4).every(n=>n<locations[4]));
 });
 await check('Los módulos de PDF, foto, riesgos, notificaciones y seguimiento no fueron alterados',()=>{
  const unaffected=['storage-v242.js','sync-core-v242.js','cloud-v242.js',
   'risk-catalog-v243.js','risk-seed-v252.js','pending-dashboard-v250.js',
   'notifications-f251.js','archive-policy-v293.js','remote-archive-v294.js','integrity-v255.js',
   'read-gate-v298.js','read-policy-v299.js','operaciones-v242.js'];
  for(const name of unaffected)assert.deepEqual(fs.readFileSync(path.join(base,name)),fs.readFileSync(path.join(prior,name)),name);
 });
 await check('Escritura central de informes permanece explícitamente desactivada',()=>{
  for(const key of ['HYS242_ENABLE_CENTRAL=false','HYS242_DEPLOYMENT_READY=false','HYS292_REMOTE_WRITE_AUTHORIZED=false'])
   assert.ok(config.includes(key),key);
 });
 await check('La lectura central continúa independiente y sujeta a permisos',()=>{
  assert.match(config,/HYS298_ENABLE_REMOTE_READS=true/);
  assert.match(get('cloud-v242.js'),/function canReadCentral\(\)/);
 });
 await check('No existen migraciones ni cambios nuevos de Supabase en esta versión',()=>{
  assert.ok(!fs.readdirSync(base).some(n=>/\.sql$|\.env$/.test(n)));
  assert.doesNotMatch(app,/hys301_guardar|hys302_guardar/);
 });
 await check('La quinta pestaña permanece tras Mis datos laborales y en el mismo nav',()=>{
  const order=[...app.matchAll(/data-hys265-tab="([^"]+)"/g)].slice(0,5).map(x=>x[1]);
  assert.deepEqual(order,['create','directory','history','self','quick']);
 });
 await check('Las pestañas no agregan un segundo menú lateral',()=>{
  assert.equal((app.match(/id=['"]hys265UsersPanel['"]/g)||[]).length,1);
  assert.ok(!app.includes("newButton('hys301"));
 });
 await check('La quinta pestaña reutiliza validación oficial de ámbitos',()=>{
  assert.match(app,/const d=state\.draft,valid=W\.validConfiguration/);
  assert.match(app,/stepRoles\(roles,true\)/);assert.match(app,/stepSpecial\(facultades,true\)/);
 });
 await check('El editor rápido no modifica ficha, documento ni contraseña',()=>{
  const p=app.slice(app.indexOf('function renderQuickPermissions('),app.indexOf('function renderDirectory('));
  for(const prohibited of ['stepWorker(','stepAccount(','credentialSecret','B279.save('])
   assert.ok(!p.includes(prohibited),prohibited);
 });
 await check('El editor rápido no tiene operación de guardado remoto',()=>{
  assert.match(app,/Guardar permisos \(pendiente\)/);
  assert.match(app,/save\.disabled=true/);
  assert.doesNotMatch(app,/function saveQuickToSupabase/);
 });
 await check('El número de versión solo figura en el selector visual',()=>{
  const dom=new JSDOM(html),d=dom.window.document;
  assert.match(d.querySelector('#moduleChooser .chooser-kicker').textContent,/v302/);
  assert.equal(d.getElementById('devVersion242'),null);
  assert.match(appearance,/c\.text\.company\+' · v302 · Revisión'/);
  dom.window.close();
 });
 await check('Los scripts y CSS locales usan la nueva versión de caché',()=>{
  const urls=[...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)].map(x=>x[1])
  .filter(x=>!/^https?:|^\/\//.test(x)&&/\.(?:js|css)\?/.test(x));
  assert.ok(urls.length>=63);assert.ok(urls.every(x=>x.endsWith('?build=v302-auditoria')));
 });
 await check('La lista de facultades no admite un error de servidor como vacía',()=>{
  assert.match(app,/if\(faculty\.error\)throw faculty\.error;/);
  assert.doesNotMatch(app,/faculty\.error\?\[\]:/);
 });
 await check('Usuarios, áreas y facultades deben ser arreglos válidos',()=>{
  assert.match(app,/!Array\.isArray\(r\.data\)\|\|!Array\.isArray\(x\.data\)\|\|!Array\.isArray\(faculty\.data\)/);
 });
 await check('La carga post-asincrónica valida actor y rol',()=>{
  assert.match(app,/const authorized=\(\)=>token===inFlight&&!panel\.hidden&&isGlobal\(\)/);
  assert.match(app,/root\.__REPORTES_HYS_ACCESS__\?\.userId===actor/);
  assert.match(app,/await refresh\(\);\n \/\/ Una sesión revocada/);
 });
 await check('El historial no oculta errores de auditoría',()=>{
  assert.match(app,/if\(r\.error\)throw r\.error;\n if\(f\.error\)throw f\.error;/);
 });
 await check('Las operaciones de creación original y los pasos 1–5 permanecen',()=>{
  assert.match(app,/function renderWizard\(target\)/);
  assert.match(app,/function stepWorker\(/);
  assert.match(app,/function stepAccount\(/);
  assert.match(app,/function stepRoles\(p,quick=false\)/);
  assert.match(app,/function stepSpecial\(p,quick=false\)/);
  assert.match(app,/function stepReview\(/);
 });
 const f=fixture();
 try{
  await check('Administrador General sigue pudiendo abrir Gestión de usuarios',async()=>{await f.open();assert.equal(f.doc.getElementById('hys265UsersPanel').hidden,false)});
  await check('La pestaña Usuarios registrados sigue listando cuatro cuentas de prueba',()=>{
   assert.match(f.getText(),/4 de 4 usuarios/);
  });
  await check('Los botones Ficha laboral, Estado de acceso, Administrar e Historial siguen presentes',()=>{
   for(const label of ['Ficha laboral','Estado de acceso','Administrar','Historial'])assert.match(f.getText(),new RegExp(label));
  });
  await check('La quinta pestaña se abre en la misma ventana, sin asistente',()=>{
   f.quick();assert.ok(f.doc.querySelector('#hys301Search'));
   assert.equal(f.doc.getElementById('hys265StepContent'),null);
  });
  await check('El usuario global está protegido de edición rápida',()=>{
   assert.match(f.doc.getElementById('hys301Count').textContent,/3 de 3 usuarios/);
   assert.ok(!f.getText().includes('Administrador general'));
  });
  await check('El buscador filtra por correo sin cambiar los registros',()=>{
   const search=f.doc.getElementById('hys301Search');search.value='usr2@invalid.local';
   search.dispatchEvent(new f.w.Event('input',{bubbles:true}));
   assert.match(f.doc.getElementById('hys301Count').textContent,/1 de 3 usuarios/);
  });
  await check('Un supervisor existente abre directamente su editor de permisos',()=>{
   f.click('#hys301Rows button');
   assert.match(f.getText(),/Supervisor de prueba/);assert.match(f.getText(),/Áreas y facultades especiales/);
  });
  await check('No aparecen campos laborales ni de credenciales en permisos rápidos',()=>{
   assert.equal(f.doc.querySelector('[name="rut"]'),null);
   assert.equal(f.doc.querySelector('#hys265StepContent'),null);
   assert.ok(f.doc.getElementById('hys301Reason'));
  });
  await check('El botón de escritura en Supabase está efectivamente desactivado',()=>{
   const save=[...f.doc.querySelectorAll('#hys265Content button')].find(x=>x.textContent.includes('Guardar permisos'));
   assert.ok(save);assert.equal(save.disabled,true);
  });
  await check('Cambio de rol se aplica solo al borrador, sin escrituras de servidor',()=>{
   const role=f.doc.querySelector('.hys301-quick-section select');
   assert.ok(role);role.value='administrador_area';
   role.dispatchEvent(new f.w.Event('change',{bubbles:true}));
   assert.match(f.getText(),/Facultades de Administrador/);
   assert.equal(f.records.find(x=>x.usuario_id==='usr2').rol,'supervisor');
  });
  await check('La vista exige motivo y no confirma una propuesta vacía',()=>{
   f.click('#hys265Content button.primary');
   assert.match(f.doc.getElementById('hys301Summary').textContent,/10 caracteres/);
  });
  await check('Una propuesta con motivo válido se revisa sin aplicarse',()=>{
   const input=f.doc.getElementById('hys301Reason');input.value='Delegación temporal de acceso supervisado';input.dispatchEvent(new f.w.Event('input'));
   f.click('#hys265Content button.primary');
   assert.match(f.doc.getElementById('hys301Summary').textContent,/NO aplicada en Supabase/);
  });
  await check('No se ejecutan RPC de actualización al revisar o cambiar roles',()=>{
   assert.ok(f.calls.every(x=>!/(?:guardar|crear|actualizar|modificar|insert|update|delete)/i.test(x)),JSON.stringify(f.calls));
  });
  await check('Deshacer el permiso no altera la persona original',()=>{
   f.click('#hys265Content button'); // seleccionar 'Elegir otro usuario'
   assert.ok(f.doc.getElementById('hys301Search'));
   assert.equal(f.records.find(x=>x.usuario_id==='usr2').rol,'supervisor');
  });
  await check('La pestaña Crear usuario conserva el flujo de cinco pasos',()=>{
   f.click('[data-hys265-tab="create"]');
   assert.match(f.getText(),/Paso 1 de 5/);
   assert.match(f.getText(),/Identificación, información laboral/);
  });
  await check('El historial original continúa disponible',async()=>{
   f.click('[data-hys265-tab="directory"]');
   f.click('[data-hys265-tab="history"]');
   await f.w.Hys265UserManagement.refresh();
   await new Promise(resolve=>setImmediate(resolve));
   assert.match(f.getText(),/Historial de gestión de usuarios/);
  });
 }finally{f.close()}
 const one=fixture({role:'usuario'});
 try{
  await check('Usuario normal no puede abrir la pestaña administrativa',async()=>{
   await one.open();assert.equal(one.doc.getElementById('hys265UsersPanel').hidden,true);assert.equal(one.calls.length,0);
  });
 }finally{one.close()}
 const facultyFail=fixture({tableReturn:{facultades_v242:{data:null,error:{message:'RLS denegada'}}}});
 try{
  await check('Error RLS de facultades bloquea la carga y explica el problema',async()=>{
   await facultyFail.open();
   assert.match(facultyFail.doc.getElementById('hys265Notice').textContent,/RLS denegada/);
   assert.equal(facultyFail.doc.querySelectorAll('#hys265DirectoryRows .hys265-person').length,0);
  });
 }finally{facultyFail.close()}
 const facultyMalformed=fixture({tableReturn:{facultades_v242:{data:{rows:grants},error:null}}});
 try{
  await check('Respuesta malformada de facultades impide edición engañosa',async()=>{
   await facultyMalformed.open();assert.match(facultyMalformed.doc.getElementById('hys265Notice').textContent,/datos incompletos/);
   assert.equal(facultyMalformed.doc.querySelectorAll('#hys265DirectoryRows .hys265-person').length,0);
  });
 }finally{facultyMalformed.close()}
 const usersMalformed=fixture({listReturn:{data:{users},error:null}});
 try{
  await check('Respuesta malformada de usuarios no se procesa',async()=>{
   await usersMalformed.open();assert.match(usersMalformed.doc.getElementById('hys265Notice').textContent,/datos incompletos/);
  });
 }finally{usersMalformed.close()}
 const areaFail=fixture({tableReturn:{areas_trabajo_v242:{data:null,error:{message:'Falla de áreas'}}}});
 try{
  await check('Error de áreas bloquea el editor y muestra su motivo',async()=>{
   await areaFail.open();assert.match(areaFail.doc.getElementById('hys265Notice').textContent,/Falla de áreas/);
  });
 }finally{areaFail.close()}
 const histFail=fixture({tableReturn:{auditoria_facultades_v242:{data:null,error:{message:'Auditoría no disponible'}}}});
 try{
  await check('Error de historial no produce historial aparentemente completo',async()=>{
   await histFail.open('history');
   assert.match(histFail.doc.getElementById('hys265Notice').textContent,/Auditoría no disponible/);
   assert.ok(!histFail.getText().includes('Sin eventos pendientes de revisión.'));
  });
 }finally{histFail.close()}
 const revocation=defer(),sessionLost=fixture({listPromise:revocation.promise});
 try{
  await check('Revocación durante lectura de usuarios impide abrir el directorio',async()=>{
   const loading=sessionLost.open();
   sessionLost.w.__REPORTES_HYS_ACCESS__.profile.rol='usuario';
   revocation.resolve({data:deep(users),error:null});await loading;
   assert.equal(sessionLost.doc.querySelectorAll('#hys265DirectoryRows .hys265-person').length,0);
   assert.equal(sessionLost.doc.getElementById('hys265Content').children.length,0);
  });
 }finally{sessionLost.close()}
 const swap=defer(),actorLost=fixture({listPromise:swap.promise});
 try{
  await check('Cambio de identidad de administrador durante RPC impide mostrar datos ajenos',async()=>{
   const loading=actorLost.open();
   actorLost.w.__REPORTES_HYS_ACCESS__.userId='nuevo-admin';
   swap.resolve({data:deep(users),error:null});await loading;
   assert.equal(actorLost.doc.getElementById('hys265Content').children.length,0);
  });
 }finally{actorLost.close()}
 const shifts=defer(),late=fixture({shiftsPromise:shifts.promise});
 try{
  await check('Cambio de permisos durante consulta de turnos descarta todo el lote',async()=>{
   const loading=late.open();
   await new Promise(resolve=>setImmediate(resolve));
   late.w.__REPORTES_HYS_ACCESS__.profile.activo=false;
   shifts.resolve([]);await loading;
   assert.equal(late.doc.getElementById('hys265Content').children.length,0);
  });
 }finally{late.close()}
 await check('Las pruebas no usaron credenciales reales ni escribieron en servidores',()=>{
  assert.equal(/(?:https?:\/\/)[^"']*supabase\.co/.test(app),false);
 });
 console.log('PASS · '+checks+' pruebas de auditoría integral v302, sin credenciales ni escrituras reales.');
})().catch(e=>{console.error(e);process.exitCode=1});
