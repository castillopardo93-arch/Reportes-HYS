/* QA automatizada v285, aislada de Supabase y sin cuentas reales. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../v289-review');
const get=n=>fs.readFileSync(path.join(root,n),'utf8');
const app=get('pilares-indicadores-v285.js');
const index=get('index.html');
const users=get('gestion-usuarios-v265.js');
const preview=get('pilares-indicadores-preview-v285.html');
const css=get('pilares-indicadores-v285.css');
let passed=0;
function ok(name,fn){fn();console.log('OK '+String(++passed).padStart(2,'0')+' · '+name)}
function make(html,url){
 const dom=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true});
 dom.window.eval(app);return dom;
}
ok('JavaScript sintácticamente válido',()=>new vm.Script(app));
ok('Vista previa y estilos vinculados',()=>{
 assert.match(preview,/pilares-indicadores-v285\.js/);
 assert.match(preview,/pilares-indicadores-v285\.css/);
});
ok('Integración en la aplicación v285',()=>{
 assert.match(index,/gestion-usuarios-v265\.js[^"]*"><\/script><link rel="stylesheet" href="pilares-indicadores-v285\.css/);
 assert.match(index,/pilares-indicadores-v285\.js\?build=v288-verificacion/);
});
ok('Protección de formularios de gestión existentes',()=>{
 assert.match(users,/hys285OpenPillars/);
 assert.match(users,/if\(id!=='hys265OpenUsers'&&!panel\.hidden\)/);
});
ok('Sin exportación ni métricas inventadas',()=>{
 assert.match(app,/Sin consolidación disponible/);
 assert.match(app,/id="hys285Export"[^>]*disabled/);
 assert.doesNotMatch(app,/HYS242_DEPLOYMENT_READY\s*=\s*true/);
});

ok('Administrador General respeta permisos explícitos de módulo',()=>{
 const match=index.match(/const moduleRows=permissions\.filter\(p=>\['APR','OTROS'\]\.includes\(p\.modulo\)\);[\s\S]*?:\[\.\.\.new Set\(moduleRows\.filter\(p=>p\.puede_ver===true\)\.map\(p=>p\.modulo\)\)\];/);
 assert.ok(match,'No se encontró el cálculo de módulos efectivos');
 const compute=new Function('profile','permissions',match[0]+'return modules;');
 const admin={rol:'administrador_global'};
 assert.deepEqual(compute(admin,[]),['APR','OTROS'],'La cuenta histórica sin asignaciones conserva dos tarjetas');
 assert.deepEqual(compute(admin,[{modulo:'APR',puede_ver:true}]),['APR'],'Una asignación limita al Administrador General a APR');
 assert.deepEqual(compute(admin,[{modulo:'APR',puede_ver:false},{modulo:'OTROS',puede_ver:true}]),['OTROS'],'Revocar APR oculta esa tarjeta');
 assert.deepEqual(compute({rol:'supervisor'},[{modulo:'APR',puede_ver:true}]),['APR'],'Otros perfiles mantienen sus asignaciones');
});
ok('El proyecto actual se conserva y los antiguos quedan solo para históricos',()=>{
 assert.match(index,/const PROJECT_NAME_245="Proyecto Hidroeléctrico Alto Maipo"/);
 assert.match(index,/const LEGACY_PROJECTS_283=new Set\(\["PHAM 1","PHAM 2"\]\)/);
 assert.match(index,/LEGACY_PROJECTS_283\.has\(v\)/);
});
ok('El formulario nuevo usa la fecha local calculada al abrirlo',()=>{
 assert.match(index,/const currentLocalDate242=\(\)=>/);
 assert.match(index,/blank\(\)\{const fechaActual=currentLocalDate242\(\)/);
 assert.match(index,/date:fechaActual,dateFrom:fechaActual,dateTo:fechaActual/);
});
const cloud=get('cloud-v242.js');
ok('El modo central exige ambas autorizaciones técnicas',()=>{
 assert.match(cloud,/function central\(\)\{return window\.HYS242_ENABLE_CENTRAL===true&&window\.HYS242_DEPLOYMENT_READY===true\}/);
});
ok('Los borradores recuperados no generan operaciones remotas por omisión',()=>{
 assert.match(cloud,/queue\.commitDraft\(central\(\)&&\$\('autosaveToggle'\)\?\.checked\?row\(B\.pack\(\)\):null,draft\(B\.pack\(\)\)\)/);
});
ok('El catálogo funciona aun si falla el caché local',()=>{
 assert.match(cloud,/try\{localStorage\.setItem\('catalogo-v242',JSON\.stringify\(c\)\)\}catch/);
 assert.match(cloud,/changeCatalog\(c\)/);
});
ok('La lista remota vacía o nula no rompe la paginación',()=>{
 assert.match(cloud,/const informes=Array\.isArray\(r\.data\)\?r\.data:\[\]/);
 assert.match(cloud,/moreButton\.hidden=informes\.length<20;return informes/);
});
ok('El historial local no exige la integración central inactiva',()=>{
 assert.match(index,/window\.HYS242_ENABLE_CENTRAL===true&&window\.HYS242_DEPLOYMENT_READY===true\)return window\.Hys242\.fetchReport/);
});
ok('Una sesión sin sessionStorage disponible no bloquea borradores',()=>{
 assert.match(cloud,/let tab=null;try\{tab=sessionStorage\.getItem\('reportes-hys-active-tab'\)\}catch\{\}/);
});
ok('El estado de la versión se muestra correctamente al usuario',()=>{
 assert.match(index,/Reportes H y S · v289 · Desarrollo para auditoría/);
 assert.match(index,/v289 · Desarrollo local · Guardado central pendiente de validación/);
 assert.match(cloud,/v289 · Desarrollo local/);
});
ok('Las banderas de producción permanecen desactivadas',()=>{
 const config=get('config-v242.js');
 assert.match(config,/HYS242_ENABLE_CENTRAL=false/);
 assert.match(config,/HYS242_DEPLOYMENT_READY=false/);
 assert.match(config,/HYS263_SANDBOX=false/);
});
ok('Los scripts locales del index.html existen y tienen sintaxis válida',()=>{
 const jsFiles=fs.readdirSync(root).filter(n=>n.endsWith('.js'));
 for(const file of jsFiles)new vm.Script(get(file),{filename:file});
 const srcs=[...index.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]);
 for(const src of srcs){
  if(/^(https?:)?\/\//.test(src))continue;
  const file=src.split('?')[0];
  assert.ok(fs.existsSync(path.join(root,file)),'Script local inexistente: '+file);
 }
});
ok('Se conservan las dos tarjetas operativas, sin tercera tarjeta artificial',()=>{
 assert.match(index,/id="aprModuleCard"/);
 assert.match(index,/id="otherModuleCard"/);
 assert.doesNotMatch(index,/id="thirdModuleCard"/);
});

const demo=make(preview,'https://example.test/v285-review/pilares-indicadores-preview-v285.html');
const dw=demo.window,dd=dw.document;
ok('Vista de diseño se abre automáticamente',()=>assert.equal(dd.getElementById('hys285PillarsPanel').hidden,false));
ok('Se muestran los seis pilares correctos',()=>{
 const titles=[...dd.querySelectorAll('.hys285-pillar-name')].map(x=>x.textContent);
 assert.deepEqual(titles,['Eficiencia en terreno','Gestión y cumplimiento','Indicadores de gestión','Gestión documental','Seguridad y trazabilidad','Mejora continua']);
});
ok('Menú lateral usa título completo Pilares e Indicadores',()=>{
 const entry=dd.getElementById('hys285OpenPillars');
 assert.equal(entry.querySelector('.tools-option-label').textContent,'Pilares e Indicadores');
 assert.equal(entry.querySelector('.tools-option-full').textContent,'Pilares e Indicadores');
 assert.equal(entry.getAttribute('aria-label'),'Pilares e Indicadores');
 assert.equal(entry.title,'Pilares e Indicadores');
});

ok('La aplicación real carga la revisión v287, no solamente la demo',()=>{
 assert.match(index,/pilares-indicadores-v285\.js\?build=v288-verificacion/);
 assert.match(index,/pilares-indicadores-v285\.css\?build=v288-verificacion/);
 assert.match(index,/gestion-usuarios-v265\.js\?build=v287-gestion-pilares-ui/);
});
ok('El menú mantiene el rótulo completo en escritorio y móvil',()=>{
 assert.match(css,/#hysToolsRail #hys285OpenPillars \.tools-option-label/);
 assert.match(css,/@media\(max-width:1024px\)/);
});
const page=new JSDOM(index,{url:'https://hys.test/v287-review/index.html',runScripts:'outside-only',pretendToBeVisual:true});
const pw=page.window,pd=pw.document;
pd.body.classList.add('module-choice');
pd.body.insertAdjacentHTML('beforeend',
 '<aside id="hysToolsRail"><nav id="hysToolsOptions">'+
 '<button type="button" id="hys265OpenUsers">Usuarios</button>'+
 '<button type="button" id="manageOpen242">Áreas y opciones</button>'+
 '<button type="button" id="operationsOpen242">Seguimiento</button>'+
 '<button type="button" id="appearanceOpen242">Apariencia</button>'+
 '</nav></aside>');
pw.__REPORTES_HYS_ACCESS__={userId:'admin-integration-test',profile:{rol:'administrador_global',activo:true},selectedModule:null};
pw.eval(app);
ok('Botón está en el menú del index.html real, antes de Apariencia',()=>{
 const nav=pd.getElementById('hysToolsOptions');
 const ids=[...nav.querySelectorAll('button')].map(b=>b.id);
 assert.equal(ids.indexOf('hys285OpenPillars'),ids.indexOf('appearanceOpen242')-1);
 assert.equal(pd.getElementById('hys285OpenPillars').hidden,false);
});
ok('En la app real, clic abre el panel de seis pilares',()=>{
 pd.getElementById('hys285OpenPillars').click();
 assert.equal(pd.getElementById('hys285PillarsPanel').hidden,false);
 assert.equal(pd.querySelectorAll('.hys285-pillar').length,6);
});
ok('En la app real, otra herramienta cierra el panel estratégico',()=>{
 pd.getElementById('appearanceOpen242').click();
 assert.equal(pd.getElementById('hys285PillarsPanel').hidden,true);
});
ok('Al entrar a un módulo operativo, Pilares deja de estar disponible',()=>{
 pw.__REPORTES_HYS_ACCESS__.selectedModule='APR';
 pd.body.classList.remove('module-choice');
 pw.reportesHysAdminSync();
 assert.equal(pd.getElementById('hys285OpenPillars').hidden,true);
 assert.equal(pw.Hys285Pillars.open(),false);
});
page.window.close();

ok('La metodología se titula Cómo se calcula y verifica',()=>{
 const heading=dd.querySelector('.hys285-method summary');
 assert.equal(heading.textContent,'Cómo se calcula y verifica');
 assert.doesNotMatch(dd.querySelector('.hys285-method').textContent,/Metodología y trazabilidad futura/);
});
ok('La metodología distingue cero de falta de datos',()=>{
 const text=dd.querySelector('.hys285-method').textContent;
 assert.match(text,/Sin datos verificados/);
 assert.match(text,/«No aplica»/);
});
ok('El estado del guardado central se declara sin inventar disponibilidad',()=>{
 const state=dd.getElementById('hys288Readiness');
 assert.match(state.textContent,/no está habilitado/);
 assert.match(state.textContent,/No hay consolidado verificable/);
});
ok('Cada uno de los 18 indicadores tiene condición verificable',()=>{
 for(const b of dd.querySelectorAll('.hys285-pillar')){
  b.click();
  const metrics=[...dd.querySelectorAll('.hys285-metric')];
  assert.equal(metrics.length,3);
  for(const m of metrics){
   assert.equal(m.querySelector('.hys288-rule summary').textContent,'¿Qué debe verificarse?');
   const rule=m.querySelector('.hys288-rule p').textContent;
   assert.ok(rule.length>28);
   assert.doesNotMatch(rule,/Revisar la fuente, el actor y los eventos/);
  }
  dd.getElementById('hys285Back').click();
 }
});
ok('No presenta cerrados como eficaces sin comprobación',()=>{
 const p=dd.querySelector('.hys285-method').textContent;
 assert.match(p,/Las acciones no verificadas no contarán como cierres eficaces|acciones no verificadas/i);
});
ok('El resumen presenta datos no disponibles, no cifras ficticias',()=>{
 assert.equal(dd.querySelectorAll('.hys285-stat').length,4);
 assert.ok([...dd.querySelectorAll('.hys285-stat-value')].every(x=>x.textContent==='—'));
});
ok('Abrir tarjeta muestra detalle y fórmulas',()=>{
 dd.querySelector('[data-pillar="cumplimiento"]').click();
 assert.equal(dd.getElementById('hys285Home').hidden,true);
 assert.equal(dd.getElementById('hys285Detail').hidden,false);
 assert.equal(dd.querySelectorAll('.hys285-metric').length,3);
 assert.match(dd.getElementById('hys285DetailTitle').textContent,/Gestión y cumplimiento/);
});
ok('Volver muestra las seis tarjetas',()=>{
 dd.getElementById('hys285Back').click();
 assert.equal(dd.getElementById('hys285Home').hidden,false);
 assert.equal(dd.getElementById('hys285Detail').hidden,true);
});
ok('Filtros cambian el alcance descrito',()=>{
 const period=dd.getElementById('hys285Period');
 const module=dd.getElementById('hys285Module');
 period.value='year';period.dispatchEvent(new dw.Event('change'));
 module.value='APR';module.dispatchEvent(new dw.Event('change'));
 assert.match(dd.getElementById('hys285Scope').textContent,/Últimos 12 meses/);
 assert.match(dd.getElementById('hys285Scope').textContent,/Prevencionistas/);
});
ok('Previsualización no habilita áreas simuladas',()=>assert.equal(dd.getElementById('hys285Area').disabled,true));
ok('Cerrar y reabrir funciona',()=>{
 dd.getElementById('hys285Close').click();
 assert.equal(dd.getElementById('hys285PillarsPanel').hidden,true);
 dd.getElementById('hys285OpenPillars').click();
 assert.equal(dd.getElementById('hys285PillarsPanel').hidden,false);
});
ok('Escape cierra el panel',()=>{
 dd.dispatchEvent(new dw.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(dd.getElementById('hys285PillarsPanel').hidden,true);
});
demo.window.close();
const realDoc='<!doctype html><html><body class="module-choice"><aside id="hysToolsOptions"></aside></body></html>';
const guest=make(realDoc,'https://example.test/v285-review/index.html');
ok('Acceso no administrador no expone la tarjeta',()=>{
 assert.equal(guest.window.document.getElementById('hys285OpenPillars').hidden,true);
 assert.equal(guest.window.Hys285Pillars.open(),false);
});
guest.window.close();
const adminDom=new JSDOM(realDoc,{url:'https://example.test/v285-review/index.html',runScripts:'outside-only'});
const aw=adminDom.window,ad=aw.document;
aw.__REPORTES_HYS_ACCESS__={userId:'test-user',profile:{activo:true,rol:'administrador_global'},selectedModule:null};
let reads=0,mutations=0;
aw.reportesHysSupabase={from(table){
 assert.equal(table,'areas_trabajo_v242');reads++;
 return {select(){return this},eq(){return this},order(){
  return Promise.resolve({data:[{id:'a1',nombre:'Área de prueba',modulo:'APR',activa:true}],error:null});
 },insert(){mutations++},update(){mutations++},delete(){mutations++}};
}};
aw.eval(app);
(async()=>{
 ok('Administrador General ve opción en pantalla principal',()=>assert.equal(ad.getElementById('hys285OpenPillars').hidden,false));
 ad.getElementById('hys285OpenPillars').click();
 await new Promise(r=>setImmediate(r));
 ok('Áreas reales solo se consultan con RLS, sin escribir',()=>{
  assert.equal(reads,1);assert.equal(mutations,0);
  const area=ad.getElementById('hys285Area');
  assert.equal(area.disabled,false);
  assert.equal(area.options.length,2);
 });
 ok('Cambio de rol retira acceso inmediatamente',()=>{
  aw.__REPORTES_HYS_ACCESS__.profile.rol='usuario';
  aw.dispatchEvent(new aw.Event('reportes-hys-access-changed'));
  assert.equal(ad.getElementById('hys285OpenPillars').hidden,true);
  assert.equal(ad.getElementById('hys285PillarsPanel').hidden,true);
 });
 adminDom.window.close();
 console.log('PASS · '+passed+' pruebas de integración DOM y seguridad básica, sin cambios reales de servidor.');
})().catch(e=>{console.error(e);process.exitCode=1;adminDom.window.close()});
