/* HYS v306 — verificación de Flash/Final Report conforme a hojas HSS-RGT-007. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const base=path.resolve(__dirname,'../v306-review'),prev=path.resolve(__dirname,'../v305-review');
const read=n=>fs.readFileSync(path.join(base,n),'utf8');
const html=read('index.html'),src=read('investigacion-accidentes-v305.js'),
 css=read('investigacion-accidentes-v305.css'),config=read('config-v242.js');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function fixture({review='accidentes',role='administrador_global',active=true,module=null,nav=true}={}){
 const url='https://hys.local/v306-review/index.html'+(review?'?revision='+review:'');
 const dom=new JSDOM(html,{url,runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 d.body.classList.add('module-choice','hys-global-chooser');
 if(nav){
  const el=d.createElement('nav');el.id='hysToolsOptions';d.body.append(el);
 }
 let serverCalls=0;
 w.reportesHysSupabase={
  rpc:()=>{serverCalls++;throw Error('No se puede acceder a Supabase')},
  from:()=>{serverCalls++;throw Error('No se puede acceder a Supabase')}
 };
 w.__REPORTES_HYS_ACCESS__={userId:'global',profile:{rol,activo},selectedModule:module,modules:['APR','OTROS']};
 w.confirm=()=>true;
 w.Hys285Pillars={close:()=>true};
 w.eval(src);
 const api=w.Hys305Investigation;
 const get=id=>d.getElementById(id);
 const named=(kind,name)=>get('hys306'+(kind==='flash'?'Flash':'Final')+'Form').querySelector('[name="'+name+'"]');
 const click=id=>{const x=get(id);assert.ok(x,id+' absent');x.click();return x};
 const set=(kind,name,value)=>{
  const e=named(kind,name);assert.ok(e,'Missing '+kind+':'+name);
  e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}));return e;
 };
 return {dom,w,d,api,get,named,click,set,calls:()=>serverCalls,close:()=>dom.window.close()};
}
let passed=0;
async function check(title,fn){await fn();passed++;console.log('OK '+String(passed).padStart(2,'0')+' · '+title)}
(async()=>{
 await check('v305 se conserva como copia aislada',()=>{
  const old=fs.readdirSync(prev).filter(n=>fs.statSync(path.join(prev,n)).isFile());
  const current=fs.readdirSync(base).filter(n=>fs.statSync(path.join(base,n)).isFile());
  assert.equal(old.length,100);assert.equal(current.length,101);
  assert.ok(old.every(n=>current.includes(n)));
 });
 await check('95 archivos ajenos a formularios permanecen byte a byte',()=>{
  const modified=new Set(['MANIFIESTO.json','appearance-v242.js','index.html',
   'investigacion-accidentes-v305.js','investigacion-accidentes-v305.css']);
  const list=fs.readdirSync(prev).filter(n=>fs.statSync(path.join(prev,n)).isFile()&&!modified.has(n));
  assert.equal(list.length,95);
  for(const f of list)assert.equal(sha(path.join(prev,f)),sha(path.join(base,f)),f);
 });
 await check('Todos los archivos JavaScript tienen sintaxis válida',()=>{
  const js=fs.readdirSync(base).filter(n=>n.endsWith('.js'));assert.ok(js.length>=48);
  js.forEach(n=>new vm.Script(read(n),{filename:n}));
 });
 await check('Los scripts embebidos del index conservan sintaxis válida',()=>{
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
   .filter(m=>!/\bsrc\s*=/.test(m[1])&&!/application\/json/i.test(m[1]));
  assert.ok(scripts.length>=5);
  scripts.forEach((m,i)=>new vm.Script(m[2],{filename:'inline-'+i+'.js'}));
 });
 await check('El HTML real apunta al mismo formulario de v306',()=>{
  assert.match(html,/src="investigacion-accidentes-v305\.js\?build=v306-flash-final"/);
  assert.match(html,/href="investigacion-accidentes-v305\.css\?build=v306-flash-final"/);
 });
 await check('La app no habilitó escrituras centrales',()=>{
  ['HYS242_ENABLE_CENTRAL=false','HYS242_DEPLOYMENT_READY=false','HYS292_REMOTE_WRITE_AUTHORIZED=false'].forEach(x=>assert.ok(config.includes(x)));
 });
 await check('Único número de versión visible en selector de tarjetas',()=>{
  assert.match(html,/Reportes H y S · v306 · Revisión/);
  assert.match(read('appearance-v242.js'),/c\.text\.company\+' · v306 · Revisión'/);
  assert.doesNotMatch(src,/REPORTES HYS · v306 ·/);
 });
 await check('La CSS contiene rótulo completo de menú sin truncar',()=>{
  assert.match(css,/#hysToolsRail #hys305OpenAccidents \.tools-option-label/);
  assert.match(css,/white-space:normal!important/);
 });
 await check('Módulos de usuarios, riesgos, fotos, PDF y guardado permanecen intactos',()=>{
  for(const n of ['gestion-usuarios-v265.js','cloud-v242.js','risk-catalog-v243.js',
   'sync-core-v242.js','storage-v242.js','notifications-f251.js','read-policy-v299.js'])
   assert.equal(sha(path.join(base,n)),sha(path.join(prev,n)),n);
 });
 const f=fixture();
 try{
  await check('La vista de revisión abre la pantalla de dos tarjetas dentro de la app',()=>{
   assert.equal(f.get('hys305Investigation').hidden,false);
   assert.equal(f.get('hys306Cards').hidden,false);
   assert.equal(f.get('hys306Workspace').hidden,true);
  });
  await check('El menú dice exactamente Investigación de accidente',()=>{
   assert.equal(f.get('hys305OpenAccidents').getAttribute('aria-label'),'Investigación de accidente');
   assert.equal(f.get('hys305OpenAccidents').querySelector('.tools-option-label').textContent,'Investigación de accidente');
  });
  await check('Hay exactamente dos tarjetas independientes',()=>{
   assert.equal(f.get('hys306Cards').querySelectorAll('.hys306-choice').length,2);
  });
  await check('Los nombres de tarjetas son Flash Report y Final Report',()=>{
   assert.equal(f.get('hys306OpenFlash').querySelector('strong').textContent,'Flash Report');
   assert.equal(f.get('hys306OpenFinal').querySelector('strong').textContent,'Final Report');
  });
  await check('Los formularios se crean por separado y ocultos inicialmente',()=>{
   assert.ok(f.get('hys306FlashForm')&&f.get('hys306FinalForm'));
   assert.equal(f.get('hys306FlashForm').hidden,true);
   assert.equal(f.get('hys306FinalForm').hidden,true);
  });
  await check('Flash abre su propio formulario desde la primera tarjeta',()=>{
   f.click('hys306OpenFlash');
   assert.equal(f.get('hys306Cards').hidden,true);
   assert.equal(f.get('hys306FlashForm').hidden,false);
   assert.equal(f.get('hys306FinalForm').hidden,true);
   assert.match(f.get('hys306FlashForm').textContent,/FLASH REPORT/);
  });
  await check('Flash contiene tipo de incidente, probabilidad, hora y fecha',()=>{
   for(const n of ['tipo_incidente','probabilidad','hora','fecha_ocurrencia'])assert.ok(f.named('flash',n),n);
  });
  await check('Flash contiene área, ubicación, involucrado, cargo y RUT',()=>{
   for(const n of ['area_proyecto','ubicacion','involucrado','cargo','rut'])assert.ok(f.named('flash',n),n);
  });
  await check('Flash contiene seis responsabilidades del área',()=>{
   for(const n of ['capataz','superintendente','supervisor','site_manager','departamento','gerente'])assert.ok(f.named('flash',n),n);
  });
  await check('Flash contiene primeros auxilios, ambulancia, hospital y médicos',()=>{
   for(const n of ['primeros_auxilios','ambulancia','hospital','paramedico','director_medico'])assert.ok(f.named('flash',n),n);
  });
  await check('Flash contiene tres testigos con cargo y contacto',()=>{
   for(let i=1;i<=3;i++)for(const n of ['nombre','cargo','telefono'])assert.ok(f.named('flash','registro_'+i+'_'+n));
   assert.ok(f.named('flash','existen_testigos'));
  });
  await check('Flash contiene fotos, hechos conocidos, causas aparentes y acciones inmediatas',()=>{
   for(const n of ['fotografias','hechos','causas_aparentes','acciones_inmediatas'])assert.ok(f.named('flash',n),n);
   assert.equal(f.named('flash','fotografias').type,'file');
  });
  await check('Flash contiene reportado por y preparado por con cargos y contactos',()=>{
   for(const n of ['reportado_por','cargo_reporta','contacto_reporta','preparado_por','cargo_prepara','contacto_prepara'])
    assert.ok(f.named('flash',n),n);
  });
  await check('La lista de tipo de incidente contiene las 7 opciones de Lista',()=>{
   assert.equal(f.named('flash','tipo_incidente').options.length-1,7);
   assert.ok([...f.named('flash','tipo_incidente').options].some(o=>o.value==='Cuasi Accidente'));
  });
  await check('La lista de probabilidad contiene 4 valores',()=>assert.equal(f.named('flash','probabilidad').options.length-1,4));
  await check('El área es sugerida por catálogo, no impuesta como valor fijo',()=>{
   assert.equal(f.named('flash','area_proyecto').getAttribute('list'),'hys306AreasList');
   assert.equal(f.get('hys306AreasList').querySelectorAll('option').length,42);
  });
  await check('El Flash admite escritura en campos reales',()=>{
   f.set('flash','involucrado','Ejemplo de prueba');
   assert.equal(f.named('flash','involucrado').value,'Ejemplo de prueba');
  });
  await check('Al volver se ven otra vez las dos tarjetas',()=>{
   f.click('hys306BackCards');
   assert.equal(f.get('hys306Cards').hidden,false);
  });
  await check('Final abre su formulario independiente',()=>{
   f.click('hys306OpenFinal');
   assert.equal(f.get('hys306FinalForm').hidden,false);
   assert.equal(f.get('hys306FlashForm').hidden,true);
   assert.match(f.get('hys306FinalForm').textContent,/INFORME DE INVESTIGACIÓN DE INCIDENTE/);
  });
  await check('Final incluye los datos generales del Excel',()=>{
   for(const n of ['proyecto','involucrados','fecha_incidente','rut','cargo','tipo_incidente','tipo_perdida',
    'tratamiento_medico','supervisor_area','lugar_incidente','capataz','ubicacion','departamento'])
    assert.ok(f.named('final',n),n);
  });
  await check('Final tiene 18 opciones del tipo de pérdida',()=>{
   assert.equal(f.named('final','tipo_perdida').options.length-1,18);
  });
  await check('Final incluye las 7 preguntas de antecedentes adicionales',()=>{
   for(const n of ['equipos','dificultades','actividad','ast','cantidad','similares','informacion_adicional'])
    assert.ok(f.named('final',n),n);
  });
  await check('Final contiene tres declaraciones completas y resúmenes',()=>{
   for(let i=1;i<=3;i++)for(const n of ['nombre','cargo','telefono','resumen'])
    assert.ok(f.named('final','registro_'+i+'_'+n));
  });
  await check('Final contiene descripción, fotos, procedimientos, matriz y capacitaciones',()=>{
   for(const n of ['descripcion','fotografias','procedimientos','documentos','matriz','matriz_archivo','capacitaciones','capacitaciones_archivo'])
    assert.ok(f.named('final',n),n);
  });
  await check('Final conserva las 5 categorías del análisis de causas',()=>{
   for(const n of ['condiciones_subestandar','acciones_subestandar','factores_trabajo','factores_personales','requerimientos_sistema'])
    assert.ok(f.named('final',n),n);
  });
  await check('Final incluye tres planes de acción iniciales',()=>{
   assert.equal(f.get('hys306ActionRows').children.length,3);
   for(let i=1;i<=3;i++)for(const n of ['codigo','descripcion','fecha','responsable'])
    assert.ok(f.named('final','action_'+i+'_'+n),i+':'+n);
  });
  await check('Agregar plan genera una fila adicional y sus campos',()=>{
   f.click('hys306AddAction');
   assert.equal(f.get('hys306ActionRows').children.length,4);
   assert.ok(f.named('final','action_4_responsable'));
  });
  await check('Final conserva equipo investigador y aprobaciones',()=>{
   for(const n of ['equipo_investigador','supervisor_directo','fecha_supervisor','aprobador','fecha_aprobacion','revisado_hys','fecha_hys'])
    assert.ok(f.named('final',n),n);
  });
  await check('La lista de códigos de causas queda expresamente pendiente de enlazar',()=>{
   assert.match(f.get('hys306FinalForm').textContent,/hoja Tabla/);
  });
  await check('Los datos del Flash se conservan separados al cambiar de tarjeta',()=>{
   f.click('hys306BackCards');f.click('hys306OpenFlash');
   assert.equal(f.named('flash','involucrado').value,'Ejemplo de prueba');
   assert.equal(f.named('final','involucrados').value,'');
  });
  await check('El botón de guardar está desactivado en ambos reportes',()=>{
   const btns=[...f.d.querySelectorAll('.hys306-pending')];
   assert.equal(btns.length,2);assert.ok(btns.every(b=>b.disabled));
  });
  await check('Al cerrar se borran los datos sensibles temporales',()=>{
   f.click('hys305Close');
   assert.equal(f.get('hys305Investigation').hidden,true);
   assert.equal(f.named('flash','involucrado').value,'');
   assert.equal(f.get('hys306ActionRows').children.length,3);
  });
  await check('Al reabrir se muestran de nuevo las dos tarjetas',()=>{
   assert.equal(f.api.open(),true);
   assert.equal(f.get('hys306Cards').hidden,false);
  });
  await check('No se ejecutó ningún acceso a Supabase al navegar',()=>assert.equal(f.calls(),0));
 }finally{f.close()}
 const directFlash=fixture({review:'flash',nav:false});
 try{
  await check('Enlace de revisión Flash abre directamente ese formulario',()=>{
   assert.equal(directFlash.get('hys306FlashForm').hidden,false);
   assert.equal(directFlash.get('hys306FinalForm').hidden,true);
  });
 }finally{directFlash.close()}
 const directFinal=fixture({review:'final',nav:false});
 try{
  await check('Enlace de revisión Final abre directamente ese formulario',()=>{
   assert.equal(directFinal.get('hys306FinalForm').hidden,false);
   assert.equal(directFinal.get('hys306FlashForm').hidden,true);
  });
 }finally{directFinal.close()}
 const admin=fixture({review:'',role:'administrador_global'});
 try{
  await check('Admin General puede abrir las tarjetas desde el botón lateral real',()=>{
   assert.equal(admin.get('hys305OpenAccidents').hidden,false);
   assert.equal(admin.api.open(),true);
   assert.equal(admin.get('hys306Cards').hidden,false);
  });
  await check('Cambio de sesión elimina todo borrador temporal',()=>{
   admin.click('hys306OpenFlash');admin.set('flash','rut','TEST-RUT');
   admin.w.dispatchEvent(new admin.w.Event('reportes-hys-access-changing'));
   assert.equal(admin.get('hys305Investigation').hidden,true);
   assert.equal(admin.named('flash','rut').value,'');
  });
 }finally{admin.close()}
 const basic=fixture({review:'',role:'usuario'});
 try{
  await check('Usuario sin facultad global no puede abrir Investigaciones',()=>{
   assert.equal(basic.get('hys305OpenAccidents').hidden,true);
   assert.equal(basic.api.open(),false);
  });
 }finally{basic.close()}
 const supervisor=fixture({review:'',role:'supervisor'});
 try{
  await check('Supervisor sin facultad global no puede abrir Investigaciones',()=>{
   assert.equal(supervisor.get('hys305OpenAccidents').hidden,true);
  });
 }finally{supervisor.close()}
 await check('No existe escritura de formularios en Supabase ni localStorage',()=>{
  assert.doesNotMatch(src,/\.rpc\(|\.insert\(|\.update\(|\.upsert\(|localStorage\.setItem|fetch\(/);
 });
 await check('Los recursos locales apuntan a compilación v306 sin enlaces rotos',()=>{
  const urls=[...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)]
   .map(x=>x[1]).filter(x=>!/^https?:|^\/\//.test(x)&&/\.(js|css)\?/.test(x));
  assert.ok(urls.length>=63);
  assert.ok(urls.every(u=>u.endsWith('?build=v306-flash-final')));
  urls.forEach(u=>assert.ok(fs.existsSync(path.join(base,u.split('?')[0])),u));
 });
 console.log('PASS · '+passed+' pruebas v306: dos tarjetas, formularios Excel, seguridad y ausencia de regresiones.');
})().catch(e=>{console.error(e);process.exitCode=1});
