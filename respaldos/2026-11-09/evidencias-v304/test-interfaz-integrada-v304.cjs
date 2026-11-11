/* HYS v304: navegación en interfaz real, revisión sin cuentas reales, 528 regresiones. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const base=path.resolve(__dirname,'../v304-review'),prior=path.resolve(__dirname,'../v303-review');
const get=n=>fs.readFileSync(path.join(base,n),'utf8');
const html=get('index.html'),js=get('pilares-indicadores-v285.js'),css=get('pilares-indicadores-v285.css'),config=get('config-v242.js');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const mk=(review=false,role='administrador_global')=>{
 const dom=new JSDOM(html,{url:'https://revision.hys.local/v304-review/index.html'+(review?'?revision=pilares':''),
  runScripts:'outside-only'});
 const w=dom.window;let remoteCalls=0;
 w.HYS242_ENABLE_CENTRAL=false;w.HYS242_DEPLOYMENT_READY=false;w.HYS292_REMOTE_WRITE_AUTHORIZED=false;
 w.document.body.classList.add('module-choice');
 // La aplicación real monta este contenedor mediante operaciones-v242.js.
 // En revisión visual probamos explícitamente que el panel funciona sin él.
 if(!review&&!w.document.getElementById('hysToolsOptions')){
  const nav=w.document.createElement('nav');nav.id='hysToolsOptions';w.document.body.append(nav);
 }
 w.__REPORTES_HYS_ACCESS__={userId:'admin',profile:{rol:role,activo:true},selectedModule:null,modules:['APR','OTROS']};
 w.reportesHysSupabase={rpc:async()=>{remoteCalls++;throw Error('No se permite RPC en pruebas')},from:()=>{remoteCalls++;throw Error('Acceso no permitido en pruebas')}};
 w.eval(js);
 const api=w.Hys285Pillars;
 const el=id=>w.document.getElementById(id);
 const click=id=>{const node=el(id);assert.ok(node,'ausente '+id);node.click();return node};
 const choose=val=>{el('hys285Period').value=val;el('hys285Period').dispatchEvent(new w.Event('change',{bubbles:true}))};
 const input=(id,val)=>{el(id).value=val;el(id).dispatchEvent(new w.Event('change',{bubbles:true}))};
 return {dom,w,api,el,click,choose,input,calls:()=>remoteCalls,close:()=>dom.window.close()};
};
let passed=0;async function check(title,fn){await fn();passed++;console.log('OK '+String(passed).padStart(2,'0')+' · '+title)}
(async()=>{
 await check('Los 96 archivos de la v303 original siguen presentes en la v304',()=>{
  const old=fs.readdirSync(prior).filter(n=>fs.statSync(path.join(prior,n)).isFile());
  const newer=fs.readdirSync(base).filter(n=>fs.statSync(path.join(base,n)).isFile());
  assert.equal(old.length,96);assert.equal(newer.length,97);assert.ok(old.every(n=>newer.includes(n)));
 });
 await check('91 archivos de otros módulos conservan contenido idéntico',()=>{
  const edited=new Set(['pilares-indicadores-v285.js','pilares-indicadores-v285.css','index.html','appearance-v242.js','MANIFIESTO.json']);
  const old=fs.readdirSync(prior).filter(n=>fs.statSync(path.join(prior,n)).isFile()&&!edited.has(n));
  assert.equal(old.length,91);
  for(const n of old)assert.equal(hash(path.join(prior,n)),hash(path.join(base,n)),n);
 });
 await check('Todos los JavaScript de v304 tienen sintaxis válida',()=>{
  const all=fs.readdirSync(base).filter(n=>n.endsWith('.js'));
  assert.ok(all.length>=48);
  for(const n of all)new vm.Script(get(n),{filename:n});
 });
 await check('El HTML conserva scripts embebidos sin errores sintácticos',()=>{
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
   .filter(x=>!/\bsrc\s*=/.test(x[1])&&!/application\/json/i.test(x[1]));
  assert.ok(scripts.length>=5);scripts.forEach((s,i)=>new vm.Script(s[2],{filename:'embebido-'+i+'.js'}));
 });
 await check('La interfaz principal referencia el mismo script del panel actualizado',()=>{
  assert.match(html,/src="pilares-indicadores-v285\.js\?build=v304-panel-integrado"/);
  assert.match(html,/href="pilares-indicadores-v285\.css\?build=v304-panel-integrado"/);
 });
 await check('Los recursos locales incluyen el cache-bust v304',()=>{
  const urls=[...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)]
   .map(x=>x[1]).filter(x=>!/^https?:|^\/\//.test(x)&&/\.(?:js|css)\?/.test(x));
  assert.ok(urls.length>=63);assert.ok(urls.every(x=>x.endsWith('?build=v304-panel-integrado')));
 });
 await check('No se activó escritura central',()=>{
  for(const flag of ['HYS242_ENABLE_CENTRAL=false','HYS242_DEPLOYMENT_READY=false','HYS292_REMOTE_WRITE_AUTHORIZED=false'])
   assert.ok(config.includes(flag),flag);
 });
 await check('No cambian el módulo de usuarios, PDF ni informes',()=>{
  for(const name of ['gestion-usuarios-v265.js','cloud-v242.js','sync-core-v242.js','storage-v242.js',
    'notifications-f251.js','risk-catalog-v243.js','read-gate-v298.js','remote-archive-v294.js'])
   assert.equal(hash(path.join(prior,name)),hash(path.join(base,name)),name);
 });
 await check('La única versión visible sigue estando en selector de tarjetas',()=>{
  assert.match(html,/Reportes H y S · v304 · Revisión/);
  assert.match(get('appearance-v242.js'),/c\.text\.company\+' · v304 · Revisión'/);
  assert.ok(!html.includes('id="devVersion242"'));
 });
 const visual=mk(true);
 try{
  await check('El modo visual se abre dentro de index.html, no otra página',()=>{
   assert.equal(visual.api.visualReview,true);
   assert.equal(visual.api.integratedInApp,true);
   assert.equal(visual.el('hys285PillarsPanel').hidden,false);
  });
  await check('El aviso de revisión es visible en la misma interfaz',()=>{
   assert.equal(visual.el('hys304VisualReviewNotice').hidden,false);
   assert.match(visual.el('hys304VisualReviewNotice').textContent,/Sin sesión ni datos reales/);
  });
  await check('La revisión visual no realiza solicitudes de área ni RPC',()=>{
   assert.equal(visual.calls(),0);
   assert.equal(visual.el('hys285Area').disabled,true);
  });
  await check('Cuatro controles de navegación integrados y en el orden correcto',()=>{
   const labels=[...visual.el('hys304Navigation').querySelectorAll('button')].map(x=>x.textContent);
   assert.deepEqual(labels,['Resumen','Alertas','Tendencias','Seis pilares']);
  });
  await check('Resumen comienza como sección activa al abrir',()=>{
   const curr=visual.el('hys304Navigation').querySelector('button[aria-current="true"]');
   assert.equal(curr.dataset.hys304Target,'hys285Home');
  });
  await check('El botón Alertas navega a su sección y actualiza aria-current',()=>{
   const b=visual.el('hys304Navigation').querySelector('[data-hys304-target="hys303AlertsTitle"]');
   b.click();
   assert.equal(b.getAttribute('aria-current'),'true');
   assert.equal(visual.el('hys285Home').hidden,false);
  });
  await check('El botón Tendencias navega sin modificar los filtros',()=>{
   visual.choose('semester');
   const b=visual.el('hys304Navigation').querySelector('[data-hys304-target="hys303AnalysisTitle"]');
   b.click();
   assert.equal(b.getAttribute('aria-current'),'true');
   assert.equal(visual.el('hys285Period').value,'semester');
  });
  await check('El botón Seis pilares navega directamente a tarjetas',()=>{
   const b=visual.el('hys304Navigation').querySelector('[data-hys304-target="hys304PillarsTitle"]');
   b.click();assert.equal(b.getAttribute('aria-current'),'true');
  });
  await check('No se puede navegar a IDs arbitrarios',()=>{
   assert.equal(visual.api.navigateSection('supabase-admin-usuarios'),false);
  });
  await check('El botón Resumen permite regresar a la primera sección',()=>{
   visual.el('hys304Navigation').querySelector('[data-hys304-target="hys285Home"]').click();
   assert.equal(visual.el('hys304Navigation').querySelector('[aria-current="true"]').dataset.hys304Target,'hys285Home');
  });
  await check('Ocho períodos siguen disponibles en la aplicación real',()=>{
   assert.deepEqual([...visual.el('hys285Period').options].map(x=>x.value),
    ['month','quarter','semester','year','twoYears','currentYear','previousYear','custom']);
  });
  await check('Personalizado muestra calendario real de inicio y término',()=>{
   visual.choose('custom');
   assert.equal(visual.el('hys303CustomDates').hidden,false);
   assert.equal(visual.el('hys303DateFrom').type,'date');
   assert.equal(visual.el('hys303DateTo').type,'date');
  });
  await check('El rango personalizado no acepta fechas invertidas',()=>{
   visual.input('hys303DateFrom','2026-09-20');
   visual.input('hys303DateTo','2026-09-19');
   assert.equal(visual.el('hys303DateError').hidden,false);
  });
  await check('Restablecer filtros vuelve a Mes actual',()=>{
   visual.click('hys304ResetFilters');
   assert.equal(visual.el('hys285Period').value,'month');
   assert.equal(visual.el('hys303CustomDates').hidden,true);
   assert.equal(visual.el('hys303DateError').hidden,true);
  });
  await check('Restablecer filtros recupera ambas tarjetas',()=>{
   assert.equal(visual.el('hys285Module').value,'ALL');
  });
  await check('Restablecer filtros recupera Todas las áreas',()=>{
   assert.equal(visual.el('hys285Area').value,'');
  });
  await check('Cuatro alertas se muestran en la misma pantalla de la aplicación',()=>{
   assert.equal(visual.el('hys303AlertGrid').children.length,4);
  });
  await check('Cada alerta permite abrir su criterio de interpretación',()=>{
   const cards=[...visual.el('hys303AlertGrid').children];
   assert.ok(cards.every(x=>x.querySelector('details summary').textContent==='¿Qué se considera?'));
   cards[0].querySelector('details').open=true;
   assert.match(cards[0].textContent,/compromisos abiertos al corte/);
  });
  await check('Los compromisos vencidos incluyen condiciones originadas antes del período',()=>{
   const first=visual.el('hys303AlertGrid').children[0];
   assert.match(first.textContent,/antes del período/);
  });
  await check('La alerta de cierre no confunde ejecución con cierre verificado',()=>{
   const last=visual.el('hys303AlertGrid').children[3];
   assert.match(last.textContent,/verificación y respaldo/);
  });
  await check('Ninguna alerta presenta datos numéricos inventados',()=>{
   const vals=[...visual.el('hys303AlertGrid').querySelectorAll('.hys303-alert-value')];
   assert.equal(vals.length,4);assert.ok(vals.every(x=>x.textContent==='—'));
  });
  await check('El resumen mantiene sus cuatro tarjetas originales, sin cifras falsas',()=>{
   const stats=[...visual.el('hys285Stats').querySelectorAll('.hys285-stat-value')];
   assert.equal(stats.length,4);assert.ok(stats.every(x=>x.textContent==='—'));
  });
  await check('Los dos bloques de tendencias y prioridades permanecen en la misma pantalla',()=>{
   const sec=visual.el('hys303AnalysisTitle').closest('section');
   assert.match(sec.textContent,/Evolución mensual/);
   assert.match(sec.textContent,/Áreas y riesgos prioritarios/);
  });
  await check('El botón de ver registros reales permanece deshabilitado',()=>{
   assert.equal(visual.el('hys303AnalysisTitle').closest('section').querySelector('.hys303-drilldown').disabled,true);
  });
  await check('Los seis pilares permanecen completos y sus detalles abren',()=>{
   assert.equal(visual.el('hys285Grid').children.length,6);
   visual.el('hys285Grid').querySelector('button').click();
   assert.equal(visual.el('hys285Detail').hidden,false);
   assert.equal(visual.el('hys285Metrics').children.length,3);
  });
  await check('Desde detalle, navegar a Alertas regresa al resumen principal',()=>{
   visual.el('hys304Navigation').querySelector('[data-hys304-target="hys303AlertsTitle"]').click();
   assert.equal(visual.el('hys285Detail').hidden,true);
   assert.equal(visual.el('hys285Home').hidden,false);
  });
  await check('Cerrar el panel visual no deja permisos administrativos concedidos',()=>{
   visual.api.close();
   assert.equal(visual.el('hys285PillarsPanel').hidden,true);
   assert.equal(visual.calls(),0);
  });
  await check('El panel se puede abrir de nuevo sin duplicar las tarjetas',()=>{
   visual.api.open();
   assert.equal(visual.el('hys285Grid').children.length,6);
   assert.equal(visual.el('hys303AlertGrid').children.length,4);
  });
  await check('Una revisión visual no conecta registros al cambiar de tarjeta',()=>{
   visual.el('hys285Module').value='APR';
   visual.el('hys285Module').dispatchEvent(new visual.w.Event('change',{bubbles:true}));
   assert.equal(visual.calls(),0);
  });
 }finally{visual.close()}
 const normal=mk(false,'administrador_global');
 try{
  await check('En la aplicación normal, el panel se muestra en el menú administrativo autorizado',()=>{
   assert.equal(normal.api.visualReview,false);
   assert.equal(normal.el('hys285OpenPillars').hidden,false);
   assert.equal(normal.el('hys285PillarsPanel').hidden,true);
  });
  await check('El Administrador General puede abrir la misma interfaz con el botón real',()=>{
   normal.click('hys285OpenPillars');
   assert.equal(normal.el('hys285PillarsPanel').hidden,false);
   assert.equal(normal.el('hys304VisualReviewNotice').hidden,true);
  });
  await check('La navegación funcional también sirve en modo administrador normal',()=>{
   const b=normal.el('hys304Navigation').querySelector('[data-hys304-target="hys303AnalysisTitle"]');
   b.click();assert.equal(b.getAttribute('aria-current'),'true');
  });
  await check('La navegación de pilar en modo normal sigue funcionando',()=>{
   normal.el('hys285Grid').querySelector('button[data-pillar="mejora"]').click();
   assert.equal(normal.el('hys285Detail').hidden,false);
  });
  await check('La opción Volver a los pilares funciona desde detalle',()=>{
   normal.el('hys285Back').click();
   assert.equal(normal.el('hys285Detail').hidden,true);
  });
 }finally{normal.close()}
 const unauthorized=mk(false,'usuario');
 try{
  await check('Un usuario sin cargo administrativo no puede abrir Pilares e Indicadores',()=>{
   assert.equal(unauthorized.el('hys285OpenPillars').hidden,true);
   assert.equal(unauthorized.api.open(),false);
  });
  await check('La navegación no concede acceso administrativo al usuario común',()=>{
   assert.equal(unauthorized.api.navigateSection('hys303AlertsTitle'),false);
   assert.equal(unauthorized.api.resetAllFilters(),false);
  });
 }finally{unauthorized.close()}
 await check('No se añadieron instrucciones de escritura ni actualización de Supabase',()=>{
  assert.ok(!/\.rpc\(|\.insert\(|\.upsert\(|\.delete\(|\.update\(/.test(js));
 });
 await check('La CSS tiene navegación y cuatro alertas responsive',()=>{
  assert.match(css,/hys304-section-nav/);
  assert.match(css,/hys304-alert-criteria/);
  assert.match(css,/@media\(max-width:700px\)/);
 });
 console.log('PASS · '+passed+' pruebas v304 de interfaz integrada y protección de regresiones.');
})().catch(e=>{console.error(e);process.exitCode=1});
