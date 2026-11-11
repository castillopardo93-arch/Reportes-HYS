/* Reportes HYS v296: integridad documental, cola y concurrencia local. SIN red. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const dir=path.resolve(__dirname,'../v296-review');
const {planConflictCopies}=require(path.join(dir,'recovery-policy-v295.js'));
const {Queue242}=require(path.join(dir,'sync-core-v242.js'));
const photo=require(path.join(dir,'archive-policy-v293.js'));
const remote=require(path.join(dir,'remote-archive-v294.js'));
const identity=require(path.join(dir,'identity-policy-v296.js'));
const cloud=fs.readFileSync(path.join(dir,'cloud-v242.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const cfg=fs.readFileSync(path.join(dir,'config-v242.js'),'utf8');
const user='user-qa',id='v242-informe-prueba',moduleId='APR';
let passes=0;
async function check(title,fn){await fn();console.log('OK '+String(++passes).padStart(2,'0')+' · '+title)}
function copy(status='Finalizado',archive={metadata:{reportId:id},pdf:'histórico'}){
 let i=0;const row={id,uid:user,module:moduleId,revision:2,token:'uuid-qa',
  payload:{reportId:id,status,module:moduleId,owner:'Operador',data:{activities:[],inspections:[],findings:[]}},
  archive,at:100};
 return planConflictCopies([row],{uid:user,module:moduleId,currentDraftId:id,isGlobal:false,
  ownerName:'Operador QA',newId:()=>String(++i).padStart(5,'0'),now:()=>222});
}
function queueStore(item){
 const data={pending:new Map(item?[[item.id,item]]:[]),draft:new Map(),meta:new Map()};
 return {data,store:{
  all:async k=>[...data[k].values()],get:async(k,key)=>data[k].get(key),
  batch:async ops=>{for(const x of ops){if(x.remove)data[x.store].delete(x.id);else data[x.store].set(x.value.id,x.value)}},
  put:async(k,v)=>data[k].set(v.id,v)
 }};
}
function getCreated(plan){return plan.ops.find(x=>x.store==='pending'&&x.value).value}
function makePdf(){
 let s='%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n';
 const xref=s.length;
 s+='xref\n0 2\n0000000000 65535 f \n0000000009 00000 n \n';
 s+='trailer\n<< /Root 1 0 R /Size 2 >>\nstartxref\n'+xref+'\n%%EOF\n';
 return s;
}
function archive(pdf,idParam=id){return {metadata:{reportId:idParam},pdf:Buffer.from(pdf,'latin1').toString('base64')}}
function onSaveFixture(){
 const start=cloud.indexOf('async function onSave('),end=cloud.indexOf('async function flush(',start);
 assert.ok(start>=0&&end>start);
 const source=cloud.slice(start,end);
 const factory=new Function([
 'let generation=1,localSaved=false,lastError="",draftId="v242-informe-prueba";',
 'let queue={commitDraft:async()=>{generation++}};',
 'let H={hasPending:false};',
 'const canWrite=()=>true, clone=x=>JSON.parse(JSON.stringify(x));',
 'const message=()=>{},central=()=>false,$=()=>({checked:false}),row=()=>null,draft=()=>({});',
 'const pendingStatus=async()=>{},schedule=()=>{},localConflict255=()=>false,setWriteAccess=()=>{};',
 source,'return onSave;'].join('\n'));
 return factory();
}
function fallbackFixture(){
 const start=cloud.indexOf('function fallbackStore('),end=cloud.indexOf('async function pendingStatus(',start);
 assert.ok(start>=0&&end>start);
 const source=cloud.slice(start,end);
 const memory=new Map();let writes=0;
 const store={getItem:k=>memory.get(k)||null,setItem:(k,v)=>{writes++;memory.set(k,v)}};
 const fixture=new Function('storage',[
 'const window={HysStorage242:{capture:()=>storage}};',
 'const navigator={};',
 'const scope="QA";',
 'const clone=v=>JSON.parse(JSON.stringify(v));',
 source,'return fallbackStore;'].join('\n'))(store);
 return {store:fixture(),writes:()=>writes};
}
(async()=>{
 await check('A-01: una copia Finalizada pasa a En edición',()=>assert.equal(getCreated(copy()).payload.status,'En edición'));
 await check('A-01: la copia conserva identidad nueva, nunca reusa PDF',()=>{
  const p=getCreated(copy());assert.notEqual(p.id,id);assert.equal(p.payload.reportId,p.id);
  assert.equal(p.archive,null);assert.equal(p.requiresPdfRegeneration,true);
 });
 await check('A-01: el original con PDF queda preservado en recuperación',()=>{
  const p=copy();const old=p.ops.find(x=>x.store==='draft'&&x.value?.operation);
  assert.equal(old.value.operation.archive.pdf,'histórico');assert.equal(old.value.draftId,id);
 });
 await check('A-01: sin PDF y En edición normal no activa bloqueo especial',()=>{
  const p=getCreated(copy('En edición',null));assert.equal(p.payload.status,'En edición');
  assert.equal(p.requiresPdfRegeneration,false);
 });
 await check('A-01: estado Finalizado sin PDF genera obligación de PDF',()=>{
  const p=getCreated(copy('Finalizado',null));assert.equal(p.requiresPdfRegeneration,true);
  assert.equal(p.payload.status,'En edición');
 });
 await check('A-01: cola impide enviar copia con obligación de PDF',async()=>{
  const p=getCreated(copy()),q=queueStore(p);let calls=0;
  await assert.rejects(new Queue242(q.store,async()=>{calls++}).flush(),/PDF nuevo/);
  assert.equal(calls,0);assert.equal(q.data.pending.size,1);
 });
 await check('A-01: cambios posteriores sin PDF no quitan bloqueo',async()=>{
  const p=getCreated(copy()),q=queueStore(p);
  const next=await new Queue242(q.store,async()=>{}).prepare({...p,payload:{...p.payload,owner:'Otro'},requiresPdfRegeneration:false});
  assert.equal(next.requiresPdfRegeneration,true);assert.equal(next.payload.status,'En edición');
 });
 await check('A-01: PDF nuevo desbloquea cola y conserva identidad',async()=>{
  const p=getCreated(copy()),q=queueStore(p);
  const next=await new Queue242(q.store,async()=>{}).prepare({...p,archive:{metadata:{reportId:p.id},pdf:'nuevo'}});
  assert.equal(next.requiresPdfRegeneration,false);assert.equal(next.archive.metadata.reportId,p.id);
 });
 await check('A-01: no se provoca envío automático de conflictos con PDF pendiente',()=>{
  assert.ok(cloud.includes('if(plan.pdfsToRegenerate===0)await flush();'));
 });
 await check('A-02: informe de identidad coherente se acepta',()=>{
  assert.equal(identity.checkLoadIdentity({id,reportId:id,reportData:{reportId:id,module:'APR'}},'APR'),id);
 });
 await check('A-02: rechaza diferencia entre ID y formulario',()=>{
  assert.throws(()=>identity.checkLoadIdentity({id,reportData:{reportId:'v242-otro'}},'APR'),/identificador/);
 });
 await check('A-02: rechaza diferencia entre identificadores de archivo',()=>{
  assert.throws(()=>identity.checkLoadIdentity({id,reportId:'v242-otro',reportData:{reportId:id}},'APR'),/identificador/);
 });
 await check('A-02: rechaza módulo de otra tarjeta',()=>{
  assert.throws(()=>identity.checkLoadIdentity({id,module:'OTROS',reportData:{reportId:id}},'APR'),/tarjeta/);
 });
 await check('A-02: rechaza formulario de otro módulo',()=>{
  assert.throws(()=>identity.checkLoadIdentity({id,reportData:{reportId:id,module:'OTROS'}},'APR'),/tarjeta/);
 });
 await check('A-02: rechaza identificador ausente antes de reemplazar datos',()=>{
  assert.throws(()=>identity.checkLoadIdentity({id,reportData:{}},'APR'),/identificador/);
 });
 await check('A-02: módulo de identidad invocado antes del validador del formulario',()=>{
  assert.match(cloud,/Hys296Identity\.checkLoadIdentity\(entry,current\.selectedModule\);window\.Hys255Guard/);
 });
 await check('A-03: estructura PDF sintético correcto y metadato válido',()=>{
  assert.equal(remote.validatePdfPayload(archive(makePdf()),id),true);
 });
 await check('A-03: PDF simulado truncado no cumple estructura',()=>{
  const corrupt=makePdf().replace('%%EOF','');assert.throws(()=>remote.validatePdfPayload(archive(corrupt),id),/incompleto/);
 });
 await check('A-03: PDF con carácter Base64 inválido no se archiva',()=>{
  const a=archive(makePdf());a.pdf='!'+a.pdf.slice(1);assert.throws(()=>remote.validatePdfPayload(a,id),/incompleto/);
 });
 await check('A-03: PDF con startxref inválido no se acepta',()=>{
  const bad=makePdf().replace(/startxref\n\d+/,'startxref\n9999999');
  assert.throws(()=>remote.validatePdfPayload(archive(bad),id),/incompleto/);
 });
 await check('A-03: PDF con ID de metadatos incorrecto se rechaza',()=>{
  assert.throws(()=>remote.validatePdfPayload(archive(makePdf(),'v242-otro'),id),/incompleto/);
 });
 await check('A-03: PDF sin metadatos de identidad se rechaza',()=>{
  const a=archive(makePdf());delete a.metadata;assert.throws(()=>remote.validatePdfPayload(a,id),/incompleto/);
 });
 await check('A-03: falta de PDF no afirma descarga real',()=>{
  assert.equal(remote.validatePdfPayload(null,id),false);
 });
 await check('A-04: imagen JPEG con encabezado binario válido',()=>{
  assert.equal(photo.validatePhoto({data:'data:image/jpeg;base64,/9j/2w=='}),true);
 });
 await check('A-04: PNG con firma binaria válida',()=>{
  assert.equal(photo.validatePhoto({data:'data:image/png;base64,iVBORw0KGgo='}),true);
 });
 await check('A-04: falso PNG con Base64 correcto se rechaza',()=>{
  assert.throws(()=>photo.validatePhoto({data:'data:image/png;base64,AAAA'}),/imagen|firma/);
 });
 await check('A-04: PNG camuflado como JPEG se rechaza',()=>{
  assert.throws(()=>photo.validatePhoto({data:'data:image/jpeg;base64,iVBORw0KGgo='}),/imagen|firma/);
 });
 await check('A-05: CSS y JS locales comparten identificador de compilación',()=>{
  const a=[...html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)=["']([^"']+)["']/gi)]
   .map(m=>m[1]).filter(x=>!/^https?:|^\/\//.test(x)&&/\.(?:js|css)\?/.test(x));
  assert.ok(a.length>=60);assert.ok(a.every(x=>x.endsWith('?build=v296-integridad-09nov')));
 });
 await check('A-06: onSave devuelve false si cambió la sesión',async()=>{
  const result=await onSaveFixture()({reportId:id,module:'APR',data:{}},true);assert.equal(result,false);
 });
 await check('A-07: no se presenta cola vacía como respaldo confirmado',()=>{
  assert.ok(cloud.includes("'sin borrador local guardado'"));
  assert.ok(!cloud.includes("'sin operaciones pendientes'"));
 });
 await check('A-08: sin Navigator Locks fallback no escribe ni confirma',async()=>{
  const x=fallbackFixture();
  await assert.rejects(()=>x.store.compareAndBatch([],0),/bloqueo entre pestañas|protección entre pestañas/i);
  await assert.rejects(()=>x.store.batch([]),/bloqueo entre pestañas|protección entre pestañas/i);
  assert.equal(x.writes(),0);
 });
 await check('A-09: cierre de base en finally dentro de archivo PDF',()=>{
  const a=html.indexOf('async function archiveGeneratedPdf('),b=html.indexOf('function readBackupRecord(',a);
  const fn=html.slice(a,b);assert.match(fn,/finally\{db\?\.close\(\)\}/);assert.ok(fn.includes('db=null;'));
 });
 await check('A-09: los scripts embebidos conservan sintaxis JavaScript válida',()=>{
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
   .filter(x=>!/\bsrc\s*=/.test(x[1])&&!/application\/json/i.test(x[1]));
  assert.ok(scripts.length>=5);scripts.forEach((x,i)=>new vm.Script(x[2],{filename:'script-'+i+'.js'}));
 });
 await check('No se habilitaron escrituras a Supabase',()=>{
  for(const t of ['HYS242_ENABLE_CENTRAL=false','HYS242_DEPLOYMENT_READY=false','HYS292_REMOTE_WRITE_AUTHORIZED=false'])assert.ok(cfg.includes(t));
 });
 console.log('PASS · '+passes+' pruebas de integridad local v296, sin conexión real.');
})().catch(e=>{console.error(e);process.exitCode=1});
