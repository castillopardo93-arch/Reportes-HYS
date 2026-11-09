/* Reportes HYS v305 — pestaña Investigación de accidentes en Admin General. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const dir=path.resolve(__dirname,'../v305-review'),prior=path.resolve(__dirname,'../v304-review');
const src=n=>fs.readFileSync(path.join(dir,n),'utf8');
const html=src('index.html'),script=src('investigacion-accidentes-v305.js'),css=src('investigacion-accidentes-v305.css');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fixture=({role='administrador_global',active=true,module=null,review=false,nav=true}={})=>{
 const dom=new JSDOM(html,{url:'https://hys.local/v305-review/index.html'+(review?'?revision=accidentes':''),
  runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 d.body.classList.add('module-choice','hys-global-chooser');
 if(nav){
  const n=d.createElement('nav');n.id='hysToolsOptions';
  const pillar=d.createElement('button');pillar.className='hys-admin-open';pillar.id='hys285OpenPillars';pillar.textContent='Pilares e Indicadores';
  const appear=d.createElement('button');appear.className='hys-admin-open';appear.id='appearanceOpen242';appear.textContent='Apariencia';
  n.append(pillar,appear);d.body.append(n);
 }
 w.__REPORTES_HYS_ACCESS__={userId:'global',profile:{usuario_id:'global',rol:role,activo:active},selectedModule:module,modules:['APR','OTROS']};
 let calls=0;
 w.reportesHysSupabase={rpc:()=>{calls++;throw Error('RPC prohibida')},from:()=>{calls++;throw Error('Acceso remoto prohibido')}};
 w.eval(script);
 const api=w.Hys305Investigation;
 return {w,d,api,el:id=>d.getElementById(id),calls:()=>calls,close:()=>dom.window.close()};
};
let n=0;async function check(title,fn){await fn();n++;console.log('OK '+String(n).padStart(2,'0')+' · '+title)}
(async()=>{
 await check('Los 97 archivos de v304 se preservaron en la nueva copia',()=>{
  const old=fs.readdirSync(prior).filter(n=>fs.statSync(path.join(prior,n)).isFile());
  const next=fs.readdirSync(dir).filter(n=>fs.statSync(path.join(dir,n)).isFile());
  assert.equal(old.length,97);assert.equal(next.length,100);
  assert.ok(old.every(name=>next.includes(name)));
 });
 await check('93 archivos ajenos a esta pestaña son idénticos a v304',()=>{
  const changed=new Set(['index.html','gestion-usuarios-v265.js','appearance-v242.js','MANIFIESTO.json']);
  const old=fs.readdirSync(prior).filter(n=>fs.statSync(path.join(prior,n)).isFile()&&!changed.has(n));
  assert.equal(old.length,93);
  for(const name of old)assert.equal(hash(path.join(prior,name)),hash(path.join(dir,name)),name);
 });
 await check('No se modificaron PDF, fotos, riesgos, notificaciones ni indicadores',()=>{
  for(const name of ['cloud-v242.js','storage-v242.js','sync-core-v242.js',
   'pilares-indicadores-v285.js','pilares-indicadores-v285.css','pending-dashboard-v250.js',
   'notifications-f251.js','risk-catalog-v243.js','read-gate-v298.js','remote-archive-v294.js'])
   assert.equal(hash(path.join(prior,name)),hash(path.join(dir,name)),name);
 });
 await check('Todos los scripts JS del proyecto son sintácticamente correctos',()=>{
  const scripts=fs.readdirSync(dir).filter(n=>n.endsWith('.js'));
  assert.ok(scripts.length>=49);
  for(const name of scripts)new vm.Script(src(name),{filename:name});
 });
 await check('Los scripts embebidos conservan su sintaxis',()=>{
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
   .filter(x=>!/\bsrc\s*=/.test(x[1])&&!/application\/json/i.test(x[1]));
  assert.ok(scripts.length>=5);
  scripts.forEach((s,i)=>new vm.Script(s[2],{filename:'inline-'+i}));
 });
 await check('Todos los archivos JS/CSS referidos por HTML están presentes',()=>{
  const links=[...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)]
   .map(x=>x[1]).filter(u=>!/^https?:|^\/\//.test(u)&&/\.(?:js|css)(?:\?|$)/.test(u));
  assert.ok(links.length>=65);
  for(const link of links)assert.ok(fs.existsSync(path.join(dir,link.split('?')[0])),link);
 });
 await check('Las dependencias están cargadas después de Pilares y Gestión de usuarios',()=>{
  assert.ok(html.indexOf('gestion-usuarios-v265.js?build')<html.indexOf('investigacion-accidentes-v305.js?build'));
  assert.ok(html.indexOf('pilares-indicadores-v285.js?build')<html.indexOf('investigacion-accidentes-v305.js?build'));
 });
 await check('Los recursos locales usan etiqueta de compilación v305',()=>{
  const links=[...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)]
   .map(x=>x[1]).filter(u=>!/^https?:|^\/\//.test(u)&&/\.(?:js|css)\?/.test(u));
  assert.ok(links.length>=65);
  assert.ok(links.every(u=>u.endsWith('?build=v305-accidentes')));
 });
 await check('Versión v305 aparece solo en selector y no dentro de investigaciones',()=>{
  assert.match(html,/Reportes H y S · v305 · Revisión/);
  assert.match(src('appearance-v242.js'),/c\.text\.company\+' · v305 · Revisión'/);
  assert.ok(!/v305|v304|v303/.test(script.replace(/\/\*[^]*?\*\//g,'')));
 });
 await check('Las banderas de escritura central permanecen desactivadas',()=>{
  const config=src('config-v242.js');
  for(const key of ['HYS242_ENABLE_CENTRAL=false','HYS242_DEPLOYMENT_READY=false','HYS292_REMOTE_WRITE_AUTHORIZED=false'])
   assert.ok(config.includes(key));
 });
 await check('El módulo nuevo no contiene RPC ni operaciones de escritura',()=>{
  assert.ok(!/\.rpc\(|\.from\(|\.insert\(|\.update\(|\.delete\(|\.upsert\(/.test(script));
 });
 await check('Gestión de usuarios reconoce el nuevo control y respeta confirmaciones',()=>{
  const users=src('gestion-usuarios-v265.js');
  assert.match(users,/hys305OpenAccidents/);
  assert.match(users,/if\(!close\(\)\)\{event\.preventDefault\(\);event\.stopImmediatePropagation\(\);return\}/);
 });
 await check('La UI mantiene botón de nueva investigación desactivado',()=>{
  assert.match(script,/Nueva investigación \(pendiente\)/);
  assert.match(script,/<button type="button" disabled/);
 });
 await check('El diseño sigue el formato de banda lateral y pantalla completa',()=>{
  assert.match(css,/#hys305Investigation\[hidden\]/);
  assert.match(css,/#hys305Investigation\{position:fixed/);
  assert.match(css,/@media\(max-width:650px\)/);
 });
 const f=fixture();
 try{
  await check('La nueva pestaña existe solo una vez',()=>assert.equal(f.d.querySelectorAll('#hys305OpenAccidents').length,1));
  await check('La pestaña se encuentra después de Pilares e Indicadores',()=>{
   const ids=[...f.el('hysToolsOptions').children].map(x=>x.id);
   assert.deepEqual(ids,['hys285OpenPillars','hys305OpenAccidents','appearanceOpen242']);
  });
  await check('La pestaña muestra nombre completo al expandir la banda',()=>{
   assert.equal(f.el('hys305OpenAccidents').querySelector('.tools-option-full').textContent,'Investigación de accidentes');
   assert.equal(f.el('hys305OpenAccidents').querySelector('.tools-option-label').textContent,'Accidentes');
  });
  await check('El nuevo control queda visible para Administrador General activo',()=>{
   assert.equal(f.el('hys305OpenAccidents').hidden,false);
   assert.equal(f.el('hys305Investigation').hidden,true);
  });
  await check('Al pulsar la pestaña se abre la pantalla correcta',()=>{
   f.el('hys305OpenAccidents').click();
   assert.equal(f.el('hys305Investigation').hidden,false);
   assert.equal(f.el('hys305Title').textContent,'Investigación de accidentes');
  });
  await check('La nueva pantalla permite cerrar con su propio botón',()=>{
   f.el('hys305Close').click();
   assert.equal(f.el('hys305Investigation').hidden,true);
  });
  await check('Abrir de nuevo no duplica la pantalla',()=>{
   f.api.open();
   assert.equal(f.d.querySelectorAll('#hys305Investigation').length,1);
  });
  await check('La nueva pantalla conserva cuatro indicadores vacíos, no ceros simulados',()=>{
   const rows=[...f.el('hys305Investigation').querySelectorAll('.hys305-overview article')];
   assert.equal(rows.length,4);
   assert.ok(rows.every(r=>r.querySelector('strong').textContent==='—'));
  });
  await check('La pantalla propone seis etapas sin habilitar formularios prematuramente',()=>{
   const stages=[...f.el('hys305Investigation').querySelectorAll('.hys305-grid article')];
   assert.equal(stages.length,6);
   assert.match(stages[0].textContent,/Antecedentes del evento/);
   assert.match(stages[5].textContent,/Verificación y cierre/);
  });
  await check('Los controles de creación no permiten enviar nada',()=>{
   const create=f.el('hys305Investigation').querySelector('.hys305-actions button');
   assert.equal(create.disabled,true);
  });
  await check('Pulsar Escape cierra la pantalla sin red',()=>{
   f.d.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   assert.equal(f.el('hys305Investigation').hidden,true);
   assert.equal(f.calls(),0);
  });
  await check('Navegar a otra opción cierra Investigación de accidentes',()=>{
   f.api.open();
   f.el('appearanceOpen242').click();
   assert.equal(f.el('hys305Investigation').hidden,true);
  });
  await check('Cambiar a una tarjeta desactiva acceso y cierra la pantalla',()=>{
   f.api.open();
   f.w.__REPORTES_HYS_ACCESS__.selectedModule='APR';
   f.w.dispatchEvent(new f.w.Event('reportes-hys-access-changed'));
   assert.equal(f.el('hys305OpenAccidents').hidden,true);
   assert.equal(f.el('hys305Investigation').hidden,true);
  });
  await check('Cerrar sesión revoca la interfaz de investigaciones',()=>{
   f.w.__REPORTES_HYS_ACCESS__.profile.activo=false;
   f.w.dispatchEvent(new f.w.Event('reportes-hys-access-changed'));
   assert.equal(f.api.open(),false);
  });
 }finally{f.close()}
 const ordinary=fixture({role:'usuario'});
 try{
  await check('Un usuario común no ve ni puede abrir Investigación de accidentes',()=>{
   assert.equal(ordinary.el('hys305OpenAccidents').hidden,true);
   assert.equal(ordinary.api.open(),false);
  });
 }finally{ordinary.close()}
 const supervisor=fixture({role:'supervisor'});
 try{
  await check('Un supervisor no puede abrir el panel nuevo',()=>{
   assert.equal(supervisor.api.open(),false);
  });
 }finally{supervisor.close()}
 const administrator=fixture({role:'administrador_area'});
 try{
  await check('Un administrador delegado no recibe acceso por defecto',()=>{
   assert.equal(administrator.el('hys305OpenAccidents').hidden,true);
   assert.equal(administrator.api.open(),false);
  });
 }finally{administrator.close()}
 const review=fixture({review:true,role:'usuario',nav:false});
 try{
  await check('La revisión visual abre el componente integrado dentro de index.html',()=>{
   assert.equal(review.api.isReview,true);
   assert.equal(review.el('hys305Investigation').hidden,false);
  });
  await check('La revisión visual no necesita menú administrativo ni credenciales reales',()=>{
   assert.equal(review.el('hysToolsOptions'),null);
   assert.equal(review.calls(),0);
  });
  await check('La revisión visual no habilita la creación de investigaciones',()=>{
   assert.equal(review.el('hys305Investigation').querySelector('.hys305-actions button').disabled,true);
  });
  await check('La revisión visual tampoco contiene cifras de accidentes ficticias',()=>{
   assert.ok([...review.el('hys305Investigation').querySelectorAll('.hys305-overview strong')]
    .every(v=>v.textContent==='—'));
  });
 }finally{review.close()}
 console.log('PASS · '+n+' pruebas v305: menú administrador, nueva pantalla, roles, seguridad y regresiones.');
})().catch(e=>{console.error(e);process.exitCode=1});
