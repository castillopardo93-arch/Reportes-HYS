/* HYS v303 — filtros temporales, prioridades y aislamiento de regresiones. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const base=path.resolve(__dirname,'../v303-review'),prior=path.resolve(__dirname,'../v302-review');
const get=n=>fs.readFileSync(path.join(base,n),'utf8');
const script=get('pilares-indicadores-v285.js'),css=get('pilares-indicadores-v285.css');
const html=get('index.html'),preview=get('pilares-indicadores-preview-v285.html'),config=get('config-v242.js');
function fixture(previewMode=true){
 const dom=new JSDOM(previewMode?preview:'<html><body class="module-choice"><nav id="hysToolsOptions"></nav></body></html>',{
  url:'https://hys.local/v303-review/'+(previewMode?'pilares-indicadores-preview-v285.html':'index.html'),
  runScripts:'outside-only'});
 const w=dom.window;w.HYS242_ENABLE_CENTRAL=false;w.HYS242_DEPLOYMENT_READY=false;
 if(!previewMode)w.__REPORTES_HYS_ACCESS__={userId:'admin',profile:{activo:true,rol:'administrador_global'},selectedModule:null,modules:['APR','OTROS']};
 w.eval(script);
 const api=w.Hys285Pillars;
 const el=id=>w.document.getElementById(id);
 const select=(value)=>{el('hys285Period').value=value;el('hys285Period').dispatchEvent(new w.Event('change',{bubbles:true}))};
 const change=(id,value)=>{el(id).value=value;el(id).dispatchEvent(new w.Event('change',{bubbles:true}))};
 return {dom,w,api,el,select,change,close:()=>{api.close();dom.window.close()}};
}
let n=0;async function check(title,fn){await fn();n++;console.log('OK '+String(n).padStart(2,'0')+' · '+title)}
(async()=>{
 await check('Se conservaron los 95 archivos de base v302 en la nueva v303',()=>{
  const a=fs.readdirSync(prior).filter(x=>fs.statSync(path.join(prior,x)).isFile());
  const b=fs.readdirSync(base).filter(x=>fs.statSync(path.join(base,x)).isFile());
  assert.equal(a.length,95);assert.equal(b.length,96);assert.ok(a.every(x=>b.includes(x)));
 });
 await check('89 archivos ajenos al panel se conservaron byte por byte',()=>{
  const changed=new Set(['MANIFIESTO.json','pilares-indicadores-v285.js','pilares-indicadores-v285.css',
    'pilares-indicadores-preview-v285.html','index.html','appearance-v242.js']);
  const files=fs.readdirSync(prior).filter(x=>fs.statSync(path.join(prior,x)).isFile()&&!changed.has(x));
  assert.equal(files.length,89);
  for(const name of files){
   const a=crypto.createHash('sha256').update(fs.readFileSync(path.join(prior,name))).digest('hex');
   const b=crypto.createHash('sha256').update(fs.readFileSync(path.join(base,name))).digest('hex');
   assert.equal(a,b,name);
  }
 });
 await check('Se conservan formularios, PDF, fotos, notificaciones y riesgos',()=>{
  for(const name of ['cloud-v242.js','gestion-usuarios-v265.js','worker-model-v265.js','storage-v242.js',
    'sync-core-v242.js','notifications-f251.js','risk-catalog-v243.js','pending-dashboard-v250.js','remote-archive-v294.js'])
   assert.deepEqual(fs.readFileSync(path.join(base,name)),fs.readFileSync(path.join(prior,name)),name);
 });
 await check('Todos los scripts JS de la aplicación son sintácticamente válidos',()=>{
  for(const name of fs.readdirSync(base).filter(x=>x.endsWith('.js')))new vm.Script(get(name),{filename:name});
 });
 await check('Scripts HTML embebidos son sintácticamente válidos',()=>{
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
   .filter(x=>!/\bsrc\s*=/.test(x[1])&&!/application\/json/i.test(x[1]));
  assert.ok(scripts.length>=5);
  scripts.forEach((x,i)=>new vm.Script(x[2],{filename:'inline-'+i}));
 });
 await check('Todos los recursos JS/CSS referidos por index existen',()=>{
  const urls=[...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)]
   .map(x=>x[1]).filter(x=>!/^https?:|^\/\//.test(x)&&/\.(?:js|css)(?:\?|$)/.test(x));
  assert.ok(urls.length>=63);for(const u of urls)assert.ok(fs.existsSync(path.join(base,u.split('?')[0])),u);
 });
 await check('Las etiquetas de caché de la aplicación corresponden a v303',()=>{
  const urls=[...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)]
  .map(x=>x[1]).filter(x=>!/^https?:|^\/\//.test(x)&&/\.(?:js|css)\?/.test(x));
  assert.ok(urls.length>=63);assert.ok(urls.every(x=>x.endsWith('?build=v303-panel-estrategico')));
 });
 await check('No cambian banderas de escritura centrales',()=>{
  for(const flag of ['HYS242_ENABLE_CENTRAL=false','HYS242_DEPLOYMENT_READY=false','HYS292_REMOTE_WRITE_AUTHORIZED=false'])
   assert.ok(config.includes(flag),flag);
 });
 await check('Solo el selector conserva un número de versión visible en la aplicación',()=>{
  assert.match(html,/Reportes H y S · v303 · Revisión/);
  assert.match(get('appearance-v242.js'),/c\.text\.company\+' · v303 · Revisión'/);
  assert.ok(!preview.includes('VISTA DE DISEÑO v285'));
  assert.ok(!preview.includes('Vista de diseño v285'));
 });
 await check('El CSS adapta el panel de alertas a escritorio, tableta y móvil',()=>{
  assert.match(css,/\.hys303-alert-grid\{display:grid;grid-template-columns:repeat\(4/);
  assert.match(css,/@media\(max-width:990px\).*?\.hys303-alert-grid\{grid-template-columns:repeat\(2/s);
  assert.match(css,/@media\(max-width:600px\).*?\.hys303-insights.*?grid-template-columns:1fr/s);
 });
 const f=fixture();
 try{
  await check('El panel puede abrirse en vista de diseño sin usar Supabase',()=>{
   assert.equal(f.el('hys285PillarsPanel').hidden,false);
   assert.equal(f.api.reviewOnly,true);assert.equal(f.api.integratedInApp,true);
  });
  await check('El selector ofrece exactamente ocho períodos',()=>{
   assert.deepEqual([...f.el('hys285Period').options].map(o=>o.value),
    ['month','quarter','semester','year','twoYears','currentYear','previousYear','custom']);
  });
  const fixed='2026-11-09',R=(key,a='',b='')=>f.api.resolveRange(key,fixed,a,b);
  await check('Mes actual equivale a inicio de noviembre hasta día de corte',()=>{
   assert.deepEqual([R('month').start,R('month').end],['2026-11-01','2026-11-09']);
  });
  await check('Mes actual compara mismo intervalo parcial del mes precedente',()=>{
   assert.deepEqual([R('month').compareFrom,R('month').compareTo],['2026-10-01','2026-10-09']);
  });
  await check('Últimos 3 meses consideran tres meses de calendario incluyendo mes actual',()=>{
   assert.deepEqual([R('quarter').start,R('quarter').end],['2026-09-01','2026-11-09']);
   assert.deepEqual([R('quarter').compareFrom,R('quarter').compareTo],['2026-06-01','2026-08-09']);
  });
  await check('Últimos 6 meses muestran ventana semestral',()=>{
   assert.deepEqual([R('semester').start,R('semester').end],['2026-06-01','2026-11-09']);
  });
  await check('Últimos 12 meses muestran ventana anual',()=>{
   assert.deepEqual([R('year').start,R('year').end],['2025-12-01','2026-11-09']);
  });
  await check('Últimos 24 meses muestran ventana bianual',()=>{
   assert.deepEqual([R('twoYears').start,R('twoYears').end],['2024-12-01','2026-11-09']);
  });
  await check('El año actual inicia en enero y termina en la fecha de corte',()=>{
   assert.deepEqual([R('currentYear').start,R('currentYear').end],['2026-01-01','2026-11-09']);
  });
  await check('El año actual se compara con enero al mismo día del año pasado',()=>{
   assert.deepEqual([R('currentYear').compareFrom,R('currentYear').compareTo],['2025-01-01','2025-11-09']);
  });
  await check('El año anterior es calendario completo',()=>{
   assert.deepEqual([R('previousYear').start,R('previousYear').end],['2025-01-01','2025-12-31']);
   assert.deepEqual([R('previousYear').compareFrom,R('previousYear').compareTo],['2024-01-01','2024-12-31']);
  });
  await check('Custom admite rango de 31 días y compara igual duración previa',()=>{
   const v=R('custom','2026-08-15','2026-09-14');
   assert.deepEqual([v.start,v.end,v.compareFrom,v.compareTo],['2026-08-15','2026-09-14','2026-07-15','2026-08-14']);
  });
  await check('Custom permite mismo día inicio y término',()=>{
   const v=R('custom','2026-09-14','2026-09-14');
   assert.deepEqual([v.compareFrom,v.compareTo],['2026-09-13','2026-09-13']);
  });
  await check('Custom permite varios años, sin límite artificial de 24 meses',()=>{
   assert.equal(R('custom','2020-01-01','2026-11-09').valid,true);
  });
  await check('Custom rechaza fecha final anterior a la inicial',()=>{
   assert.equal(R('custom','2026-11-09','2026-10-01').valid,false);
  });
  await check('Custom rechaza fechas posteriores al día de corte',()=>{
   assert.equal(R('custom','2026-09-01','2026-12-01').valid,false);
  });
  await check('Custom rechaza 31 de febrero y otros días inexistentes',()=>{
   assert.equal(R('custom','2026-02-31','2026-05-01').valid,false);
   assert.equal(f.api.validDay('2026-02-31'),false);
  });
  await check('Custom admite día bisiesto válido',()=>{
   assert.equal(f.api.validDay('2024-02-29'),true);
   assert.equal(f.api.validDay('2025-02-29'),false);
  });
  await check('Mes anterior comparable clampa día 31 a 29 de febrero cuando corresponde',()=>{
   const v=f.api.resolveRange('month','2024-03-31');
   assert.equal(v.compareTo,'2024-02-29');
  });
  await check('El corte del año bisiesto se compara con último día válido del año anterior',()=>{
   const v=f.api.resolveRange('currentYear','2024-02-29');
   assert.equal(v.compareTo,'2023-02-28');
  });
  await check('Períodos desconocidos se rechazan',()=>{
   assert.equal(R('marathon').valid,false);
  });
  await check('Custom requiere fecha de inicio y final completas',()=>{
   assert.equal(R('custom','','2026-09-01').valid,false);
  });
  await check('El formulario personalizado está oculto fuera de la opción personalizada',()=>{
   assert.equal(f.el('hys303CustomDates').hidden,true);
  });
  await check('Cambiar a personalizado despliega dos selectores de fecha',()=>{
   f.select('custom');
   assert.equal(f.el('hys303CustomDates').hidden,false);
   assert.equal(f.el('hys303DateFrom').type,'date');
   assert.equal(f.el('hys303DateTo').type,'date');
  });
  await check('El formulario inicializa fechas locales y límite hasta hoy',()=>{
   assert.equal(f.el('hys303DateTo').value,f.api.todayLocal());
   assert.equal(f.el('hys303DateFrom').max,f.api.todayLocal());
   assert.equal(f.el('hys303DateTo').max,f.api.todayLocal());
  });
  await check('El rango personalizado visible actualiza el texto de consulta y comparación',()=>{
   f.change('hys303DateFrom','2026-08-15');
   f.change('hys303DateTo','2026-09-14');
   assert.match(f.el('hys285Scope').textContent,/15\/08\/2026 al 14\/09\/2026/);
   assert.match(f.el('hys303Comparison').textContent,/15\/07\/2026 al 14\/08\/2026/);
  });
  await check('El formulario presenta error visible para fechas invertidas',()=>{
   f.change('hys303DateFrom','2026-10-15');
   f.change('hys303DateTo','2026-09-14');
   assert.equal(f.el('hys303DateError').hidden,false);
   assert.match(f.el('hys303DateError').textContent,/anterior o igual/);
  });
  await check('No mantiene comparación válida engañosa para fechas incorrectas',()=>{
   assert.match(f.el('hys303Comparison').textContent,/no disponible/i);
  });
  await check('Al volver a rango fijo desaparece el error personalizado',()=>{
   f.select('semester');assert.equal(f.el('hys303CustomDates').hidden,true);
   assert.equal(f.el('hys303DateError').hidden,true);
  });
  await check('El área y tarjeta permanecen como filtros independientes',()=>{
   assert.ok(f.el('hys285Module'));assert.ok(f.el('hys285Area'));
   f.el('hys285Module').value='APR';
   f.el('hys285Module').dispatchEvent(new f.w.Event('change',{bubbles:true}));
   assert.match(f.el('hys285Scope').textContent,/Prevencionistas/);
  });
  await check('Resumen de gestión conserva cuatro tarjetas existentes',()=>{
   assert.equal(f.el('hys285Stats').children.length,4);
  });
  await check('Se conservan exactamente seis pilares estratégicos',()=>{
   assert.equal(f.el('hys285Grid').children.length,6);
  });
  await check('Las cuatro alertas de gestión están incluidas',()=>{
   const names=[...f.el('hys303AlertGrid').querySelectorAll('.hys303-alert-name')].map(x=>x.textContent);
   assert.deepEqual(names,['Compromisos vencidos','Hallazgos de prioridad alta','Riesgos reincidentes','Cierres por verificar']);
  });
  await check('Todos los indicadores y alertas se mantienen sin cifras simuladas',()=>{
   assert.ok([...f.el('hys285Stats').querySelectorAll('.hys285-stat-value')].every(x=>x.textContent==='—'));
   assert.ok([...f.el('hys303AlertGrid').querySelectorAll('.hys303-alert-value')].every(x=>x.textContent==='—'));
  });
  await check('La evolución mensual indica falta de datos verificados en vez de dibujar estadísticas falsas',()=>{
   const text=f.el('hys303AnalysisTitle').closest('section').textContent;
   assert.match(text,/Evolución mensual/);
   assert.match(text,/Sin datos consolidados/);
  });
  await check('Las áreas y riesgos prioritarios exigen fuente con trazabilidad',()=>{
   const text=f.el('hys303AnalysisTitle').closest('section').textContent;
   assert.match(text,/Áreas y riesgos prioritarios/);
   assert.match(text,/actividad de origen/);
  });
  await check('El botón de consulta de respaldos permanece desactivado',()=>{
   const button=f.el('hys303AnalysisTitle').closest('section').querySelector('.hys303-drilldown');
   assert.ok(button);assert.equal(button.disabled,true);
  });
  await check('La definición de pendientes mantiene obligaciones anteriores a la ventana elegida',()=>{
   assert.match(f.el('hys303AnalysisTitle').closest('section').textContent,/aunque se hayan registrado antes/);
  });
  await check('Se documentan identificadores para futura compatibilidad con Power BI',()=>{
   assert.match(f.el('hys285PillarsPanel').textContent,/Power BI/);
   assert.match(f.el('hys285PillarsPanel').textContent,/ID único/);
  });
  await check('El detalle de los pilares sigue funcionando',()=>{
   f.el('hys285Grid').querySelector('button').click();
   assert.equal(f.el('hys285Detail').hidden,false);
   assert.equal(f.el('hys285Metrics').children.length,3);
   f.el('hys285Back').click();assert.equal(f.el('hys285Detail').hidden,true);
  });
  await check('Cerrar la vista de diseño elimina panel sin modificar otras pantallas',()=>{
   f.api.close();assert.equal(f.el('hys285PillarsPanel').hidden,true);
  });
  await check('La vista se puede reabrir sin duplicar elementos',()=>{
   f.api.open();assert.equal(f.el('hys285PillarsPanel').hidden,false);
   assert.equal(f.el('hys303AlertGrid').children.length,4);
  });
 }finally{f.close()}
 const locked=fixture(false);
 try{
  await check('El panel del Administrador General se muestra con perfil activo',()=>{
   assert.equal(locked.el('hys285OpenPillars').hidden,false);
  });
  await check('Los usuarios normales no tienen acceso a Pilares e Indicadores',()=>{
   locked.w.__REPORTES_HYS_ACCESS__.profile.rol='usuario';
   locked.api.sync();
   assert.equal(locked.el('hys285OpenPillars').hidden,true);
   assert.equal(locked.api.open(),false);
  });
  await check('La opción se oculta durante el uso de una tarjeta incluso siendo Administrador General',()=>{
   locked.w.__REPORTES_HYS_ACCESS__.profile.rol='administrador_global';
   locked.w.__REPORTES_HYS_ACCESS__.selectedModule='APR';
   locked.api.sync();assert.equal(locked.el('hys285OpenPillars').hidden,true);
  });
 }finally{locked.close()}
 await check('No se conectó ni ejecutó ninguna API de escritura nueva en Pilares e Indicadores',()=>{
  assert.ok(!/\.rpc\(|\.insert\(|\.upsert\(|\.delete\(|\.update\(/.test(script));
 });
 console.log('PASS · '+n+' pruebas v303 (fechas, UI, permisos, seis pilares, regresión y sin simulación).');
})().catch(e=>{console.error(e);process.exitCode=1});
