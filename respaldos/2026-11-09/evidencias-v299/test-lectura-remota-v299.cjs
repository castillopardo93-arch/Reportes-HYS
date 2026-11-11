/* HYS v299: lectura central, aislamiento y paginación; sin usuarios ni datos reales. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const dir=path.resolve(__dirname,'../v299-review');
const policy=require(path.join(dir,'read-policy-v299.js'));
const cloud=fs.readFileSync(path.join(dir,'cloud-v242.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const config=fs.readFileSync(path.join(dir,'config-v242.js'),'utf8');
const base=(id='v242-qa-read-1')=>({id,modulo:'APR',creador_id:'qa-usr',
 revision:3,actualizado_en:'2026-11-09T12:30:00Z',owner:'Responsable QA',date:'2026-11-09',
 dateFrom:'2026-11-09',dateTo:'2026-11-09',shift:'Día/Propio',project:'Proyecto de prueba',
 area:'VA4',status:'Finalizado',hasPdf:true,revision_estado:null,revision_flujo:null});
function clone(v){return JSON.parse(JSON.stringify(v))}
let passed=0;
async function check(name,fn){await fn();passed++;console.log('OK '+String(passed).padStart(2,'0')+' · '+name)}
function mockCloud({rows=[base()],onRpc,cache,render,initialPage=0}={}){
 const a=cloud.indexOf('async function refreshReports(');
 const b=cloud.indexOf(' async function fetchReport(',a);
 assert.ok(a>=0&&b>a);
 const snippet=cloud.slice(a,b);
 const calls=[],cached=[],messages=[],els=new Map();
 const history={append(node){els.set(node.id,node)}};
 els.set('historial',history);
 let session=1,allowed=true,module='APR';
 const data={calls,cached,messages,els,rows:clone(rows),initialPage,onRpc,cache,render};
 const create=new Function('cfg','snippet','policy',`
 let generation=1,reportPage=cfg.initialPage,reportsFlight=null;
 let current={selectedModule:'APR'};
 let permission=true;
 const canReadCentral=()=>permission;
 const window={
  reportesHysSupabase:{rpc:async(name,args)=>{
   cfg.calls.push({name,args});
   if(cfg.onRpc)await cfg.onRpc(name,args);
   return {data:cfg.rows,error:null};
  }},
  Hys255Guard:{capture:()=>({}),assert:()=>{}},
  Hys299ReadPolicy:policy
 };
 const B={cacheSummary:async(x)=>{cfg.cached.push(x);if(cfg.cache)await cfg.cache(x)},
 renderArchivedReports:async()=>{cfg.renderCalls++;if(cfg.render)await cfg.render()}};
 const document={createElement:()=>({id:null,hidden:false,disabled:false,type:'',textContent:'',className:'',onclick:null})};
 const $=id=>cfg.els.get(id)||null;
 const message=s=>cfg.messages.push(s);
 ${snippet}
 return {refreshReports,readState:()=>({page:reportPage,inFlight:!!reportsFlight,session:generation,module:current.selectedModule,allowed:permission,renderCalls:cfg.renderCalls}),changeScope:m=>{generation++;current.selectedModule=m;reportPage=0;reportsFlight=null;permission=true},deny:()=>{permission=false}};
 `);
 data.renderCalls=0;
 return {...create(data,snippet,policy),data};
}
(async()=>{
 await check('Acepta resumen real válido de APR',()=>{
  const r=policy.validatePage([base()],'APR',0);assert.equal(r.length,1);assert.equal(r[0].id,base().id);
 });
 await check('Acepta resumen válido de OTROS',()=>{
  const r=policy.validatePage([{...base(),modulo:'OTROS'}],'OTROS',0);assert.equal(r[0].modulo,'OTROS');
 });
 await check('La página vacía es válida',()=>assert.deepEqual(policy.validatePage([],'APR',0),[]));
 await check('Rechaza módulo desconocido',()=>assert.throws(()=>policy.validatePage([base()],'ADMIN',0),/página/));
 await check('Rechaza página negativa',()=>assert.throws(()=>policy.validatePage([base()],'APR',-1),/página/));
 await check('Rechaza número de página no entero',()=>assert.throws(()=>policy.validatePage([base()],'APR',1.5),/página/));
 await check('Rechaza respuesta de listado como objeto',()=>assert.throws(()=>policy.validatePage({reports:[base()]},'APR',0),/página/));
 await check('Rechaza más de 20 registros en una página',()=>assert.throws(()=>policy.validatePage(Array.from({length:21},(_,i)=>base('v242-qa-'+i)),'APR',0),/página/));
 await check('Rechaza fila de otra tarjeta',()=>assert.throws(()=>policy.validatePage([{...base(),modulo:'OTROS'}],'APR',0),/tarjeta/));
 await check('Rechaza fila duplicada',()=>assert.throws(()=>policy.validatePage([base(),base()],'APR',0),/repetido/));
 await check('Rechaza ID sin prefijo válido',()=>assert.throws(()=>policy.validatePage([base('invalido')],'APR',0),/incompleto/));
 await check('Rechaza ID ausente',()=>assert.throws(()=>policy.validatePage([{...base(),id:null}],'APR',0),/incompleto/));
 await check('Rechaza creador ausente',()=>assert.throws(()=>policy.validatePage([{...base(),creador_id:null}],'APR',0),/incompleto/));
 await check('Rechaza revisión nula o cero',()=>{
  assert.throws(()=>policy.validatePage([{...base(),revision:0}],'APR',0),/incompleto/);
  assert.throws(()=>policy.validatePage([{...base(),revision:null}],'APR',0),/incompleto/);
 });
 await check('Rechaza estado no permitido',()=>assert.throws(()=>policy.validatePage([{...base(),status:'Aprobado'}],'APR',0),/incompleto/));
 await check('Rechaza indicador PDF sin booleano',()=>assert.throws(()=>policy.validatePage([{...base(),hasPdf:'true'}],'APR',0),/incompleto/));
 await check('Los datos y fotos arbitrarios no ingresan al resumen',()=>{
  const r=policy.validatePage([{...base(),reportData:{secret:'dato privado'},pdfBlob:{bytes:10},extra:'no'}],'APR',0)[0];
  assert.ok(!Object.hasOwn(r,'reportData'));assert.ok(!Object.hasOwn(r,'pdfBlob'));assert.ok(!Object.hasOwn(r,'extra'));
 });
 await check('Rechaza metadatos complejos',()=>assert.throws(()=>policy.validatePage([{...base(),owner:{id:'qa'}}],'APR',0),/metadatos/));
 await check('Permite consultar PDF y datos solo en modo remoto lectura',()=>{
  assert.equal(policy.canEditArchived({hasReportData:true,remote:true},false),false);
  assert.equal(policy.canEditArchived({hasReportData:true,remote:true},true),true);
 });
 await check('Permite editar exclusivamente un informe local si existen datos',()=>{
  assert.equal(policy.canEditArchived({hasReportData:true,remote:false},false),true);
  assert.equal(policy.canEditArchived({hasReportData:false,remote:false},false),false);
 });
 await check('El HTML deshabilita edición cuando el informe procede de Supabase',()=>{
  assert.match(html,/function archiveEditAvailable\(r\)/);
  assert.match(html,/Hys299ReadPolicy\.canEditArchived/);
  assert.match(html,/\(!archiveEditAvailable\(r\)\?'disabled/);
  assert.match(html,/Solo lectura \(Supabase\)/);
 });
 await check('El editor rechaza una respuesta remota cuando las escrituras están desactivadas',async()=>{
  const start=cloud.indexOf('async function loadReport('),end=cloud.indexOf(' async function recoverDraft(',start);
  assert.ok(start>0&&end>start);
  const body=cloud.slice(start,end);
  const m=[];
  const load=new Function('messages',`
   const canWrite=()=>true,queue={},central=()=>false;
   const message=s=>messages.push(s);
   ${body}
   return loadReport;
  `)(m);
  assert.equal(await load({remote:true}),false);
  assert.match(m.join(' '),/solo para consulta/);
 });
 await check('El código carga las políticas antes de consultar',()=>{
  assert.ok(html.indexOf('read-policy-v299.js')>0);
  assert.ok(html.indexOf('read-policy-v299.js')<html.indexOf('cloud-v242.js'));
 });
 await check('Consulta remota valida registros antes de guardarlos',async()=>{
  const f=mockCloud({rows:[{...base(),modulo:'OTROS'}]});
  await assert.rejects(()=>f.refreshReports(),/tarjeta/);
  assert.equal(f.data.cached.length,0);assert.equal(f.readState().page,0);
 });
 await check('Consulta válida guarda resúmenes ya saneados',async()=>{
  const f=mockCloud({rows:[{...base(),reportData:{secret:'no'},pdfBlob:'contenido'}]});
  const r=await f.refreshReports();
  assert.equal(r.length,1);assert.equal(f.data.cached.length,1);
  assert.ok(!Object.hasOwn(f.data.cached[0],'reportData'));
  assert.ok(!Object.hasOwn(f.data.cached[0],'pdfBlob'));
  assert.equal(f.data.cached[0].remote,true);
 });
 await check('Consulta simultánea de primera página se realiza una sola vez',async()=>{
  let resume;const gate=new Promise(ok=>resume=ok);
  const f=mockCloud({onRpc:()=>gate});
  const x=f.refreshReports(1,false),y=f.refreshReports(1,false);
  assert.equal(f.data.calls.length,1);resume();await Promise.all([x,y]);
  assert.equal(f.readState().page,0);assert.equal(f.data.cached.length,1);
 });
 await check('Dos pulsaciones seguidas de Cargar más no saltan páginas',async()=>{
  const f=mockCloud({rows:[base(),...Array.from({length:19},(_,i)=>base('v242-page-'+i))]});
  await f.refreshReports(1,false);
  let resume;const gate=new Promise(ok=>resume=ok);
  f.data.render=()=>gate;
  const x=f.refreshReports(1,true),y=f.refreshReports(1,true);
  assert.equal(f.data.calls.length,2);
  assert.equal(f.data.calls[1].args.p_pagina,1);
  resume();await Promise.all([x,y]);
  assert.equal(f.readState().page,1);
 });
 await check('Un error al guardar una página no incrementa el número',async()=>{
  const f=mockCloud({cache:()=>{throw Error('falló IndexedDB')}});
  await assert.rejects(()=>f.refreshReports(),/IndexedDB/);
  assert.equal(f.readState().page,0);
  assert.equal(f.readState().inFlight,false);
 });
 await check('El botón Más se crea con el resultado de 20 filas',async()=>{
  const f=mockCloud({rows:Array.from({length:20},(_,i)=>base('v242-20-'+i))});
  await f.refreshReports();
  assert.equal(f.data.els.get('reportsMore242').hidden,false);
 });
 await check('El botón Más queda oculto en página parcial',async()=>{
  const f=mockCloud({rows:[base()]});await f.refreshReports();
  assert.equal(f.data.els.get('reportsMore242').hidden,true);
 });
 await check('Si se cambia de sesión durante RPC no se escribe el caché local',async()=>{
  let f;f=mockCloud({onRpc:()=>f.changeScope('OTROS')});
  const r=await f.refreshReports();assert.deepEqual(r,[]);
  assert.equal(f.data.cached.length,0);
 });
 await check('Si se revoca la lectura durante RPC no se escribe resumen',async()=>{
  let f;f=mockCloud({onRpc:()=>f.deny()});
  const r=await f.refreshReports();assert.deepEqual(r,[]);
  assert.equal(f.data.cached.length,0);
 });
 await check('Al iniciar otra tarjeta se limpia paginación y estado del botón de conexión',()=>{
  assert.match(cloud,/reportPage=0;reportsFlight=null/);
  assert.match(cloud,/readStatus\)readStatus\.textContent=''/);
  assert.match(cloud,/moreButton\)\{moreButton\.hidden=true/);
 });
 await check('Nuevo build en JS y CSS local',()=>{
  const urls=[...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/ig)]
    .map(m=>m[1]).filter(x=>!/^https?:|^\/\//.test(x)&&/\.(?:js|css)\?/.test(x));
  assert.ok(urls.length>=63);
  assert.ok(urls.every(x=>x.endsWith('?build=v299-central-read-09nov')));
 });
 await check('Los scripts embebidos no presentan errores sintácticos',()=>{
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(x=>!/\bsrc\s*=/.test(x[1])&&!/application\/json/i.test(x[1]));
  assert.ok(scripts.length>=5);scripts.forEach((x,i)=>new vm.Script(x[2],{filename:'embedded-'+i+'.js'}));
 });
 await check('No se han habilitado escrituras centrales ni administrador',()=>{
  for(const t of ['HYS242_ENABLE_CENTRAL=false','HYS242_DEPLOYMENT_READY=false','HYS292_REMOTE_WRITE_AUTHORIZED=false','HYS257_ENABLE_USER_MANAGEMENT=false'])assert.ok(config.includes(t));
 });
 console.log('PASS · '+passed+' pruebas de lectura central segura v299; sin conexión a datos reales.');
})().catch(e=>{console.error(e);process.exitCode=1});
