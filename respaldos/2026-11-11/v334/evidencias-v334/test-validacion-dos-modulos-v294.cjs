/* Reportes HYS v294: flujos de APR y OTROS simulados. Sin login ni escritura remota. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const dir=path.resolve(__dirname,'../v334-review');
const policy=require(path.join(dir,'remote-archive-v294.js'));
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const cloud=fs.readFileSync(path.join(dir,'cloud-v242.js'),'utf8');
const guardJs=fs.readFileSync(path.join(dir,'integrity-v255.js'),'utf8');
const photoJs=fs.readFileSync(path.join(dir,'archive-policy-v293.js'),'utf8');
function makePdf(){
 let s='%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n';
 const xref=s.length;
 s+='xref\n0 2\n0000000000 65535 f \n0000000009 00000 n \n';
 s+='trailer\n<< /Root 1 0 R /Size 2 >>\nstartxref\n'+xref+'\n%%EOF\n';
 return s;
}
const uri='data:image/jpeg;base64,/9j/2w==';
function pack(id,module){
 return {module,reportId:id,status:'En edición',owner:'Responsable QA',
  data:{activities:module==='APR'?[[1,'APR','VA4','Actividad QA',[{name:'evidencia.jpg',data:uri}],{}]]:[],
   inspections:[],findings:[[1,'Condición de prueba','Alta','Corregir','Pendiente',[{name:'evidencia.jpg',data:uri}],{}]]},
  history:[{at:'2026-11-09T10:00:00Z',action:'Creación',changes:[]}]};
}
function makeReport(module='APR',id='v242-test-1',pdf=false){
 const p=pack(id,module);
 return {id,modulo:module,creador_id:'qa-user',revision:2,payload:p,
  archivo:pdf?{metadata:{reportId:id,history:[{at:'2026-11-09T12:00:00Z',action:'PDF archivado',changes:[]}]},pdf:Buffer.from(makePdf()).toString('base64')}:null,
  revision_estado:null};
}
function guardWindow(module){
 const dom=new JSDOM('<html><body></body></html>',{url:'https://hys.local/',runScripts:'outside-only'});
 dom.window.eval(photoJs);dom.window.eval(guardJs);
 dom.window.__REPORTES_HYS_OTROS_EMBEDDED__=module==='OTROS';
 return dom;
}
function makeCloudFetch(module,returnRow,opts={}){
 const a=cloud.indexOf('async function fetchReport('),b=cloud.indexOf('async function loadReport(',a);
 assert.ok(a>0&&b>a,'Función real de recuperación remota disponible');
 const captured=cloud.slice(a,b);
 const cached=[];let calls=0,session=1;
 const browser=guardWindow(module),w=browser.window;
 w.Hys294RemoteArchive=policy;
 w.Hys255Guard.capture=()=>({ticket:session});
 w.Hys255Guard.assert=t=>{if(t.ticket!==session)throw Error('Sesión cambiada');};
 w.reportesHysSupabase={rpc:async(name,args)=>{calls++;if(opts.onRequest)opts.onRequest(args);return {data:typeof returnRow==='function'?returnRow(args):returnRow,error:null}}};
 const B={cacheArchive:async x=>{cached.push(x)}};
 const fn=new Function('window','B','current','canReadCentral','blobFromBase64','generation',
  captured+' return fetchReport;')(w,B,{selectedModule:module},()=>true,()=>({type:'application/pdf'}),1);
 return {fetch:fn,cached,getCalls:()=>calls,changeSession:()=>{session++},close:()=>browser.window.close()};
}
function makeArchiveChoice(local,allowed){
 const start=html.indexOf('async function getArchivedReport('),end=html.indexOf('function archiveMonthKey(',start);
 assert.ok(start>0&&end>start);
 const captured=html.slice(start,end),calls=[];
 const window={Hys255Guard:{capture:()=>({ok:true}),assert:()=>{}},
  Hys293ArchivePolicy:{canFetch:()=>allowed},Hys298ReadGate:{canReadRemote:()=>allowed},
  Hys294RemoteArchive:policy,
  Hys242:{fetchReport:async(id,need)=>{calls.push({id,need});return {id,remote:true}}},
  __REPORTES_HYS_ACCESS__:{userId:'qa-user'}};
 const fn=new Function('window','navigator','readLocalArchivedReport242',
  captured+' return getArchivedReport;')(window,{onLine:allowed},async()=>local);
 return {fn,calls};
}
let count=0;
async function ok(name,fn){await fn();count++;console.log('OK '+String(count).padStart(2,'0')+' · '+name)}
(async()=>{
 for(const module of ['APR','OTROS']){
  const id='v242-'+module+'-qa',data=makeReport(module,id,false);
  await ok(module+': acepta respuesta correcta sin PDF',()=>assert.equal(policy.validateRemoteRow(data,id,module).id,id));
  await ok(module+': rechazo de tarjeta contraria',()=>assert.throws(()=>policy.validateRemoteRow({...data,modulo:module==='APR'?'OTROS':'APR'},id,module),/otra tarjeta/));
  await ok(module+': rechazo de identificador equivocado',()=>assert.throws(()=>policy.validateRemoteRow({...data,id:'v242-otro'},id,module),/otra tarjeta/));
  await ok(module+': rechazo de reportId incompatible',()=>assert.throws(()=>policy.validateRemoteRow({...data,payload:{...data.payload,reportId:'v242-otro'}},id,module),/otra tarjeta/));
  await ok(module+': lectura sin PDF no sobrescribe historial local',async()=>{
   const t=makeCloudFetch(module,data);const out=await t.fetch(id,false);
   assert.equal(out.pdfBlob,null);assert.equal(t.cached.length,0);assert.equal(t.getCalls(),1);
   assert.equal(out.history[0].action,'Creación');t.close();
  });
  await ok(module+': recuperación con PDF válido se almacena',async()=>{
   const t=makeCloudFetch(module,makeReport(module,id,true));const out=await t.fetch(id,true);
   assert.equal(t.cached.length,1);assert.equal(out.hasPdf,true);
   assert.equal(out.history[0].action,'PDF archivado');t.close();
  });
  await ok(module+': servidor de módulo ajeno bloqueado antes de archivar',async()=>{
   const t=makeCloudFetch(module,{...data,modulo:'OTROS'===module?'APR':'OTROS'});
   await assert.rejects(()=>t.fetch(id,true),/otra tarjeta/);assert.equal(t.cached.length,0);t.close();
  });
 }
 await ok('Consulta local no deriva al servidor aunque esté conectado',async()=>{
  const {fn,calls}=makeArchiveChoice({id:'v242-local',pdfBlob:{size:42}},true);
  const x=await fn('v242-local',true);assert.equal(x.id,'v242-local');assert.equal(calls.length,0);
 });
 await ok('Resumen remoto usa servidor cuando está autorizado',async()=>{
  const {fn,calls}=makeArchiveChoice({id:'v242-remoto',remote:true,creador_id:'qa-user'},true);
  const x=await fn('v242-remoto',true);assert.equal(x.remote,true);assert.equal(calls.length,1);
 });
 await ok('Resumen remoto sin conexión conserva PDF del propietario',async()=>{
  const {fn,calls}=makeArchiveChoice({id:'v242-remoto',remote:true,creador_id:'qa-user',pdfBlob:{size:42}},false);
  const x=await fn('v242-remoto',true);assert.equal(x.id,'v242-remoto');assert.equal(calls.length,0);
 });
 await ok('No se exponen informes remotos ajenos sin conexión',async()=>{
  const {fn}=makeArchiveChoice({id:'v242-ajeno',remote:true,creador_id:'otro'},false);
  await assert.rejects(()=>fn('v242-ajeno',true),/permiso/);
 });
 await ok('Sin archivo local y sin servidor devuelve ausencia, no inventa PDF',async()=>{
  const {fn}=makeArchiveChoice(null,false);assert.equal(await fn('v242-noexiste'),null);
 });
 await ok('Sin archivo local y con servidor intenta recuperar',async()=>{
  const {fn,calls}=makeArchiveChoice(null,true);
  await fn('v242-remoto');assert.equal(calls.length,1);
 });
 await ok('PDF remoto incompleto bloqueado',()=>assert.throws(()=>policy.validatePdfPayload({pdf:'AA=='},'v242-1'),/PDF recuperado/));
 await ok('PDF remoto con metadata de otro informe bloqueado',()=>assert.throws(()=>policy.validatePdfPayload({pdf:Buffer.from(makePdf()).toString('base64'),metadata:{reportId:'v242-2'}},'v242-1'),/no corresponde/));
 await ok('PDF remoto ausente no se interpreta como archivo descargado',()=>assert.equal(policy.validatePdfPayload(null,'v242-1'),false));
 await ok('PDF válido con identificador correcto',()=>assert.equal(policy.validatePdfPayload({pdf:Buffer.from(makePdf()).toString('base64'),metadata:{reportId:'v242-1'}},'v242-1'),true));
 await ok('La tarjeta OTROS rechaza actividades de APR en respaldo',()=>{
  const dom=guardWindow('OTROS');const p=pack('v242-a','OTROS');
  p.data.activities=[[1,'APR','VA4','No debe verse',[],{}]];
  assert.throws(()=>dom.window.Hys255Guard.validatePack(p,'OTROS'),/solo admite hallazgos/);
  dom.window.close();
 });
 await ok('La tarjeta APR conserva actividades y fotografías',()=>{
  const dom=guardWindow('APR');const p=pack('v242-a','APR');
  assert.equal(dom.window.Hys255Guard.validatePack(p,'APR'),p);dom.window.close();
 });
 await ok('La tarjeta OTROS admite hallazgos y fotografías',()=>{
  const dom=guardWindow('OTROS');const p=pack('v242-a','OTROS');
  assert.equal(dom.window.Hys255Guard.validatePack(p,'OTROS'),p);dom.window.close();
 });
 await ok('No se modificó el selector de riesgos oficial v293',()=>assert.match(html,/risk-catalog-v243\.js/));
 await ok('Interfaz integra nueva validación antes de seguridad y conexión',()=>{
  assert.ok(html.indexOf('src="remote-archive-v294.js')<html.indexOf('src="integrity-v255.js'));
  assert.ok(html.includes('Hys294RemoteArchive.chooseArchiveSource(local,'));
 });
 await ok('Copia central mantiene desactivadas las escrituras',()=>{
  const flags=fs.readFileSync(path.join(dir,'config-v242.js'),'utf8');
  for(const rule of ['HYS242_ENABLE_CENTRAL=false','HYS242_DEPLOYMENT_READY=false','HYS292_REMOTE_WRITE_AUTHORIZED=false'])assert.ok(flags.includes(rule));
 });
 console.log('PASS · '+count+' pruebas v294 aisladas. Sin credenciales ni operaciones remotas.');
})().catch(e=>{console.error(e);process.exitCode=1});
