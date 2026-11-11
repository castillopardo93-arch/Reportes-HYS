/* HYS v295: pruebas de recuperación segura, sin cuentas ni escrituras remotas. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const dir=path.resolve(__dirname,'../v334-review');
const {planConflictCopies}=require(path.join(dir,'recovery-policy-v295.js'));
const cloud=fs.readFileSync(path.join(dir,'cloud-v242.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const user='usuario-qa',scopeModule='APR',oldId='v242-original-qa';
const payload={reportId:oldId,owner:'Nombre previo',status:'Finalizado',
 data:{activities:[],inspections:[],findings:[]}};
const item=(opts={})=>({id:oldId,uid:user,module:scopeModule,revision:2,token:'token-original',
 payload,archive:{metadata:{reportId:oldId,reportData:payload},pdf:'JVBERi0='},at:1,...opts});
function plan(rows,currentDraftId=oldId,isGlobal=false){
 let n=0;return planConflictCopies(rows,{uid:user,module:scopeModule,currentDraftId,isGlobal,
 ownerName:'Responsable actualizado',newId:()=>String(++n).padStart(4,'0'),now:()=>1234});
}
let passed=0;
async function check(name,fn){await fn();passed++;console.log('OK '+String(passed).padStart(2,'0')+' · '+name)}
function mockStore(){
 const pending=new Map([[oldId,item()]]),draft=new Map(),meta=new Map();
 const maps={pending,draft,meta};
 return {maps,all:async n=>Array.from(maps[n].values()),get:async(n,id)=>maps[n].get(id),
  batch:async ops=>{for(const o of ops){if(o.remove)maps[o.store].delete(o.id);else maps[o.store].set(o.value.id,o.value)}}};
}
function loadedRecoverFixture(result,opts={}){
 const pos=cloud.indexOf('async function recoverDraft('),end=cloud.indexOf('function download(',pos);
 assert.ok(pos>=0&&end>pos);
 const source=cloud.slice(pos,end);
 let messages=[],saved=false,pendingCalls=0,loadCalls=0,confirmCalls=0,generation=1;
 const queue={store:{all:async()=>opts.pending||[]}};
 const window={reportesHysSupabase:{rpc:async()=>({data:{id:oldId,revision:2,payload},error:null})}};
 const fixture=new Function('queue','generation','current','canWrite','central','message','window','confirm','loadReport','pendingStatus','state',
 source.replace('localSaved=true','state.saved=true')+' return recoverDraft;')(
 queue,generation,{selectedModule:scopeModule},()=>true,()=>true,x=>messages.push(x),window,
 ()=>{confirmCalls++;return opts.confirm!==false},
 async()=>{loadCalls++;return result},async()=>{pendingCalls++},{});
 return {fn:fixture,calls:()=>({messages,loadCalls,pendingCalls,confirmCalls})};
}
function archiveFixture(opts={}){
 const pos=cloud.indexOf('async function onArchive('),end=cloud.indexOf('async function newConflictCopy(',pos);
 assert.ok(pos>=0&&end>pos);
 const body=cloud.slice(pos,end);
 const build=new Function('fixture',[
  'let generation=1,localSaved=false,draftId=fixture.id;',
  'let queue={commitDraft:async(...args)=>{fixture.writes.push(args);}};',
  'const canWrite=()=>fixture.canWrite!==false;',
  'const clone=v=>JSON.parse(JSON.stringify(v));',
  'const B={pack:()=>fixture.report};',
  'const window={Hys255Guard:{capture:()=>({reportId:fixture.id}),assert:()=>{}},HysFingerprint242:v=>JSON.stringify(v)};',
  'const central=()=>fixture.central!==false;',
  'const draft=(p,id)=>({payload:p,draftId:id});',
  'const row=(p,a,id)=>({id,payload:p,archive:a});',
  'const H={hasPending:false};',
  'const pendingStatus=async()=>{fixture.statusCalls++};',
  'const schedule=()=>{fixture.schedules++};',
  'const Blob=globalThis.Blob;',
  'class FileReader{readAsDataURL(blob){',
  ' if(fixture.switchSession)generation++;',
  ' this.result="data:application/pdf;base64,JVBERi0xLjQK";',
  ' queueMicrotask(()=>this.onload());',
  ' }}',
  body,
  'return {onArchive};'
 ].join("\n"));
 const fixture={id:oldId,report:{...payload},writes:[],statusCalls:0,schedules:0,...opts};
 const {onArchive}=build(fixture);
 return {archive:()=>onArchive({reportId:fixture.id,reportData:fixture.report,pdfBlob:new Blob(['%PDF-1.4 example'],{type:'application/pdf'})}),fixture,onArchive};
}
(async()=>{
 await check('Los PDF antiguos no se envían con una copia nueva',()=>{
  const r=plan([item()]);const created=r.ops.find(x=>x.store==='pending'&&x.value);
  assert.equal(created.value.archive,null);assert.notEqual(created.value.id,oldId);
 });
 await check('PDF original intacto en recuperación local',()=>{
  const r=plan([item()]);const recovered=r.ops.find(x=>x.store==='draft'&&x.value.id.startsWith('recovery-'));
  assert.equal(recovered.value.operation.archive.pdf,'JVBERi0=');
  assert.equal(recovered.value.operation.id,oldId);
 });
 await check('La copia nueva conserva hallazgos y cambia la identidad',()=>{
  const r=plan([item()]),p=r.ops.find(x=>x.store==='pending'&&x.value).value;
  assert.equal(p.payload.reportId,p.id);assert.equal(p.payload.owner,'Responsable actualizado');
  assert.equal(p.payload.status,'En edición');assert.equal(p.requiresPdfRegeneration,true);
 });
 await check('La copia nueva reinicia revisión y token',()=>{
  const r=plan([item()]),p=r.ops.find(x=>x.store==='pending'&&x.value).value;
  assert.equal(p.revision,0);assert.notEqual(p.token,'token-original');assert.equal(p.at,1234);
 });
 await check('El original no se elimina sin un respaldo local',()=>{
  const r=plan([item()]);
  const backup=r.ops.findIndex(x=>x.store==='draft'&&x.value.id.startsWith('recovery-'));
  const removal=r.ops.findIndex(x=>x.store==='pending'&&x.remove);
  assert.ok(backup>=0&&removal>backup);
 });
 await check('El borrador activo cambia solamente si corresponde',()=>{
  const yes=plan([item()],oldId),no=plan([item()],'v242-otra');
  assert.ok(yes.currentId&&yes.ops.some(x=>x.store==='draft'&&x.value.id==='current'));
  assert.equal(no.currentId,null);assert.ok(!no.ops.some(x=>x.value?.id==='current'));
 });
 await check('El propietario administrador se conserva cuando está autorizado',()=>{
  const r=plan([item()],oldId,true),p=r.ops.find(x=>x.store==='pending'&&x.value).value;
  assert.equal(p.payload.owner,'Nombre previo');
 });
 await check('Un usuario distinto no puede copiar operaciones de otra sesión',()=>{
  assert.throws(()=>plan([item({uid:'otro'})]),/otra sesión/);
 });
 await check('No se mezclan operaciones entre tarjetas',()=>{
  assert.throws(()=>plan([item({module:'OTROS'})]),/otra sesión/);
 });
 await check('Rechaza lista de operaciones vacía',()=>{
  assert.throws(()=>plan([]),/No hay cambios/);
 });
 await check('Rechaza operaciones duplicadas',()=>{
  assert.throws(()=>plan([item(),item()]),/duplicadas/);
 });
 await check('Rechaza operación cuya carga tiene identificador diferente',()=>{
  assert.throws(()=>plan([item({payload:{...payload,reportId:'v242-otro'}})]),/incompletas/);
 });
 await check('Rechaza operación sin token',()=>{
  assert.throws(()=>plan([item({token:''})]),/incompletas/);
 });
 await check('Los identificadores de copias son únicos',()=>{
  const other={...item({id:'v242-otra',payload:{...payload,reportId:'v242-otra'},token:'otro-token'}),archive:null};
  const r=plan([item(),other]);const fresh=r.ops.filter(x=>x.store==='pending'&&x.value).map(x=>x.value.id);
  assert.equal(new Set(fresh).size,2);assert.equal(r.originalCount,2);assert.equal(r.pdfsToRegenerate,2);
 });
 await check('La transacción conserva evidencia y genera copia nueva',async()=>{
  const s=mockStore(),r=plan(await s.all('pending'));await s.batch(r.ops);
  assert.ok(s.maps.draft.size>=2);assert.ok(!s.maps.pending.has(oldId));
  assert.ok([...s.maps.pending.values()].every(p=>p.archive===null));
 });
 await check('No se confirma borrador remoto cuando la carga falla',async()=>{
  const f=loadedRecoverFixture(false);await f.fn();
  assert.equal(f.calls().loadCalls,1);assert.equal(f.calls().pendingCalls,0);
 });
 await check('No se confirma borrador remoto si el usuario cancela',async()=>{
  const f=loadedRecoverFixture(true,{confirm:false});await f.fn();
  assert.equal(f.calls().loadCalls,0);assert.equal(f.calls().pendingCalls,0);
 });
 await check('Se actualiza estado solo al cargar correctamente el borrador',async()=>{
  const f=loadedRecoverFixture(true);await f.fn();
  assert.equal(f.calls().loadCalls,1);assert.equal(f.calls().pendingCalls,1);
 });
 await check('Las operaciones pendientes bloquean recuperación remota',async()=>{
  const f=loadedRecoverFixture(true,{pending:[item()]});await f.fn();
  assert.equal(f.calls().loadCalls,0);assert.match(f.calls().messages.join(' '),/pendientes/);
 });
 await check('PDF original se incorpora con el mismo ID y token de sesión',async()=>{
  const x=archiveFixture();await x.archive();
  assert.equal(x.fixture.writes.length,1);
  assert.equal(x.fixture.writes[0][0].id,oldId);
  assert.ok(x.fixture.writes[0][0].archive.pdf.startsWith('JVBERi'));
  assert.equal(x.fixture.statusCalls,1);assert.equal(x.fixture.schedules,1);
 });
 await check('Cambiar de usuario durante FileReader impide escritura remota',async()=>{
  const x=archiveFixture({switchSession:true});
  await assert.rejects(()=>x.archive(),/sesión, el informe o los permisos cambiaron/i);
  assert.equal(x.fixture.writes.length,0);assert.equal(x.fixture.schedules,0);
 });
 await check('PDF vacío no es aceptado por el archivo actual',async()=>{
  const x=archiveFixture();
  await assert.rejects(()=>x.onArchive({reportId:oldId,reportData:payload,
   pdfBlob:new Blob([''],{type:'application/pdf'})}),/vacío/);
  assert.equal(x.fixture.writes.length,0);
 });
 await check('PDF con tipo incorrecto se rechaza antes de guardarlo',async()=>{
  const x=archiveFixture();
  await assert.rejects(()=>x.onArchive({reportId:oldId,reportData:payload,
   pdfBlob:new Blob(['%PDF-1.4 example'],{type:'text/plain'})}),/PDF/);
  assert.equal(x.fixture.writes.length,0);
 });
 await check('El archivo PDF se valida y se verifica después de convertirlo',()=>{
  assert.match(cloud,/entry\.pdfBlob\.size<8/);
  assert.match(cloud,/entry\.pdfBlob\.type!=='application\/pdf'/);
  assert.match(cloud,/const base64=await new Promise/);
  assert.match(cloud,/verify\(\); \/\/ La conversión es asíncrona/);
  assert.match(cloud,/window\.Hys255Guard\.assert\(context,\{write:true\}\)/);
 });
 await check('Al copiar conflictos se relee la cola bajo transacción',()=>{
  assert.match(cloud,/const fresh=await q\.store\.all\('pending'\);/);
  assert.match(cloud,/window\.Hys295Recovery\.planConflictCopies\(fresh/);
 });
 await check('La app carga el módulo de recuperación antes del núcleo de guardado',()=>{
  assert.ok(html.indexOf('src="recovery-policy-v295.js')<html.indexOf('src="sync-core-v242.js'));
 });
 await check('Las banderas de escritura remota permanecen desactivadas',()=>{
  const cfg=fs.readFileSync(path.join(dir,'config-v242.js'),'utf8');
  for(const a of ['HYS242_ENABLE_CENTRAL=false','HYS242_DEPLOYMENT_READY=false','HYS292_REMOTE_WRITE_AUTHORIZED=false'])assert.ok(cfg.includes(a));
 });
 console.log('PASS · '+passed+' pruebas v295, sin conectar el servidor.');
})().catch(e=>{console.error(e);process.exitCode=1});
