/* HYS v297: controles de acuses, historial y cola segura, sin red ni cuentas reales. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../v297-review');
const {Queue242,fingerprint,historyFingerprint,archiveMatches,verifyServerAck,isRemoteConfirmed}=require(path.join(dir,'sync-core-v242.js'));
const {planConflictCopies}=require(path.join(dir,'recovery-policy-v295.js'));
const cloud=fs.readFileSync(path.join(dir,'cloud-v242.js'),'utf8');
const config=fs.readFileSync(path.join(dir,'config-v242.js'),'utf8');
const id='v242-297QA-1';
const basePayload={reportId:id,status:'En edición',owner:'Persona QA',data:{activities:[],inspections:[],findings:[]},history:[{at:'2026-11-09T08:00:00Z',action:'Creación'}]};
function clone(v){return JSON.parse(JSON.stringify(v))}
function item(override={}){return {id,module:'APR',uid:'qa-owner',token:'11111111-1111-4111-8111-111111111111',revision:0,at:100,payload:clone(basePayload),archive:null,...override}}
function ack(x,override={}){
 return {id:x.id,modulo:x.module,ultimo_token:x.token,revision:Math.max(1,x.revision),payload:clone(x.payload),
 archivo:x.archive?clone(x.archive):null,...override};
}
function archive(x){
 return {metadata:{reportId:x.id,reportData:clone(x.payload),filename:'informe.pdf'},pdf:'JVBERi0xLjQK'};
}
function store(items=[]){
 const maps={pending:new Map(items.map(x=>[x.id,x])),meta:new Map(),draft:new Map()};
 const adapter={
  all:async k=>[...maps[k].values()],
  get:async(k,id)=>maps[k].get(id),
  batch:async changes=>{for(const x of changes){const m=maps[x.store];if(x.remove)m.delete(x.id);else m.set(x.value.id,x.value)}},
  put:async(k,v)=>maps[k].set(v.id,v)
 };
 return {maps,adapter};
}
let n=0;
async function check(label,fn){await fn();console.log('OK '+String(++n).padStart(2,'0')+' · '+label)}
(async()=>{
 await check('01: token exacto con contenido íntegro se confirma',()=>{
  const x=item(),c=verifyServerAck(x,ack(x));
  assert.equal(c.sameToken,true);assert.equal(c.revision,1);
 });
 await check('02: mismo token con responsable cambiado se rechaza',()=>{
  const x=item();assert.throws(()=>verifyServerAck(x,ack(x,{payload:{...x.payload,owner:'Persona ajena'}})),/datos confirmados/);
 });
 await check('03: mismo token con estado alterado se rechaza',()=>{
  const x=item();assert.throws(()=>verifyServerAck(x,ack(x,{payload:{...x.payload,status:'Finalizado'}})),/datos confirmados/);
 });
 await check('04: mismo token con actividades distintas se rechaza',()=>{
  const x=item();const p=clone(x.payload);p.data.findings=[[1,'Nueva condición']];
  assert.throws(()=>verifyServerAck(x,ack(x,{payload:p})),/datos confirmados/);
 });
 await check('05: mismo token y PDF cambiado se rechaza',()=>{
  const x=item();x.archive=archive(x);
  const y=ack(x);y.archivo.pdf='JVBERi0xLjQKOTRO';
  assert.throws(()=>verifyServerAck(x,y),/archivo PDF/);
 });
 await check('06: mismo token y archivo faltante se rechaza',()=>{
  const x=item();x.archive=archive(x);
  assert.throws(()=>verifyServerAck(x,ack(x,{archivo:null})),/archivo PDF/);
 });
 await check('07: identidad de informe equivocada se rechaza',()=>{
  const x=item();assert.throws(()=>verifyServerAck(x,ack(x,{id:'v242-otro'})),/identidad/);
 });
 await check('08: módulo contrario se rechaza',()=>{
  const x=item();assert.throws(()=>verifyServerAck(x,ack(x,{modulo:'OTROS'})),/módulo/);
 });
 await check('09: revisión inferior a la solicitada se rechaza',()=>{
  const x=item({revision:4});assert.throws(()=>verifyServerAck(x,ack(x,{revision:3})),/revisión/);
 });
 await check('10: reintento idempotente con token anterior y contenido igual se confirma',()=>{
  const x=item(),r=verifyServerAck(x,ack(x,{ultimo_token:'token-anterior'}));
  assert.equal(r.sameToken,false);
 });
 await check('11: no-op con token anterior y formulario diferente se rechaza',()=>{
  const x=item();assert.throws(()=>verifyServerAck(x,ack(x,{ultimo_token:'token-anterior',payload:{...x.payload,owner:'Otra'}})),/datos confirmados/);
 });
 await check('12: mismo token y cambio solo en historia se rechaza',()=>{
  const x=item(),p=clone(x.payload);p.history.push({at:'2026-11-09T09:00:00Z',action:'Edición'});
  assert.throws(()=>verifyServerAck(x,ack(x,{payload:p})),e=>e.code==='HYS_HISTORY_NOT_PERSISTED');
 });
 await check('13: token anterior y cambio solo en historia se rechaza',()=>{
  const x=item(),p=clone(x.payload);p.history=[];
  assert.throws(()=>verifyServerAck(x,ack(x,{ultimo_token:'anterior',payload:p})),e=>e.code==='HYS_HISTORY_NOT_PERSISTED');
 });
 await check('14: huella de historial distingue modificaciones sin cambio en campos',()=>{
  const x=clone(basePayload),y=clone(basePayload);y.history.push({action:'Seguimiento'});
  assert.equal(fingerprint(x),fingerprint(y));
  assert.notEqual(historyFingerprint(x),historyFingerprint(y));
 });
 await check('15: mismo token y PDF íntegro con normalización documentada se confirma',()=>{
  const x=item();x.archive=archive(x);const response=ack(x);
  response.archivo.metadata.reportData=clone(response.payload);
  assert.equal(verifyServerAck(x,response).sameToken,true);
 });
 await check('16: metadatos PDF arbitrariamente modificados se rechazan',()=>{
  const x=item();x.archive=archive(x);const response=ack(x);
  response.archivo.metadata.filename='otro.pdf';
  assert.equal(archiveMatches(x.archive,response.archivo,response.payload),false);
  assert.throws(()=>verifyServerAck(x,response),/archivo PDF/);
 });
 await check('17: confirmación conserva huella de historial',()=>{
  const x=item(),p=verifyServerAck(x,ack(x));
  assert.equal(p.historyFingerprint,historyFingerprint(x.payload));
 });
 await check('18: estado remoto no puede declararse sincronizado con historia sin huella',()=>{
  const x=item(),m={revision:1,fingerprint:fingerprint(x.payload)};
  assert.equal(isRemoteConfirmed({payload:x.payload},m,true),false);
 });
 await check('19: estado remoto exige ambas huellas si el historial existe',()=>{
  const x=item(),m={revision:1,fingerprint:fingerprint(x.payload),historyFingerprint:historyFingerprint(x.payload)};
  assert.equal(isRemoteConfirmed({payload:x.payload},m,true),true);
  assert.equal(isRemoteConfirmed({payload:x.payload}, {...m,historyFingerprint:'distinto'},true),false);
 });
 await check('20: documentos históricos sin historia explícita siguen compatibles',()=>{
  const x={reportId:id,status:'En edición',owner:'QA'};
  assert.equal(isRemoteConfirmed({payload:x},{revision:1,fingerprint:fingerprint(x)},true),true);
 });
 await check('21: acuse erróneo mantiene operación pendiente sin metadatos',async()=>{
  const x=item(),state=store([x]),q=new Queue242(state.adapter,async()=>ack(x,{payload:{...x.payload,owner:'Diferente'}}));
  await assert.rejects(()=>q.flush(),/datos confirmados/);
  assert.equal(state.maps.pending.get(x.id).token,x.token);assert.equal(state.maps.meta.size,0);
 });
 await check('22: acuse con historia no confirmada mantiene el pendiente',async()=>{
  const x=item(),state=store([x]),q=new Queue242(state.adapter,async()=>ack(x,{payload:{...x.payload,history:[]}}));
  await assert.rejects(()=>q.flush(),e=>e.code==='HYS_HISTORY_NOT_PERSISTED');
  assert.equal(state.maps.pending.size,1);assert.equal(state.maps.meta.size,0);
 });
 await check('23: primer informe sin PDF no bloquea segundo informe listo',async()=>{
  const a=item({id:'v242-297-blocked',payload:{...clone(basePayload),reportId:'v242-297-blocked'},requiresPdfRegeneration:true,archive:null,at:1});
  const b=item({id:'v242-297-ready',payload:{...clone(basePayload),reportId:'v242-297-ready'},at:2});
  const state=store([a,b]),sent=[],q=new Queue242(state.adapter,async x=>{sent.push(x.id);return ack(x)});
  const result=await q.flush();
  assert.deepEqual(sent,[b.id]);assert.deepEqual(result.blockedIds,[a.id]);assert.equal(result.sent,1);
  assert.equal(state.maps.pending.size,1);assert.ok(state.maps.pending.has(a.id));
  assert.ok(state.maps.meta.has(b.id));assert.equal(state.maps.meta.has(a.id),false);
 });
 await check('24: cola compuesta solo por PDF pendientes retorna bloqueo sin borrar nada',async()=>{
  const a=item({requiresPdfRegeneration:true,archive:null}),state=store([a]);
  const res=await new Queue242(state.adapter,async()=>{throw Error('No debería enviarse')}).flush();
  assert.equal(res.blocked,1);assert.equal(res.sent,0);assert.equal(state.maps.pending.size,1);
 });
 await check('25: cola no bloqueada sigue procesando todas las entradas por fecha',async()=>{
  const a=item({id:'v242-z',payload:{...clone(basePayload),reportId:'v242-z'},at:30});
  const b=item({id:'v242-x',payload:{...clone(basePayload),reportId:'v242-x'},at:10});
  const c=item({id:'v242-y',payload:{...clone(basePayload),reportId:'v242-y'},at:20});
  const state=store([a,b,c]),sent=[];
  const res=await new Queue242(state.adapter,async x=>{sent.push(x.id);return ack(x)}).flush();
  assert.deepEqual(sent,[b.id,c.id,a.id]);assert.equal(res.remaining,0);
 });
 await check('26: al reintentar se procesa el informe antes bloqueado tras agregar PDF',async()=>{
  const a=item({requiresPdfRegeneration:true,archive:null}),state=store([a]),sent=[];
  const q=new Queue242(state.adapter,async x=>{sent.push(x.id);return ack(x)});
  await q.flush();
  const updated=await q.prepare({...a,archive:archive(a)});
  state.maps.pending.set(a.id,updated);
  const r=await q.flush();assert.equal(r.sent,1);assert.equal(state.maps.pending.size,0);assert.deepEqual(sent,[a.id]);
 });
 await check('27: informativos de cola y PDF pendientes están conectados a interfaz',()=>{
  assert.match(cloud,/const result=await q\.flush\(\)/);
  assert.match(cloud,/result\?\.blocked/);
  assert.match(cloud,/informe\(s\) necesitan un PDF nuevo/);
 });
 await check('28: contador de recuperación incluye Finalizado sin PDF',()=>{
  const x=item({id:'v242-final-sin-pdf',payload:{...clone(basePayload),reportId:'v242-final-sin-pdf',status:'Finalizado'},archive:null,token:'token-test'});
  let seq=0;const plan=planConflictCopies([x],{uid:x.uid,module:x.module,currentDraftId:x.id,
   isGlobal:false,ownerName:'Persona QA',newId:()=>String(++seq),now:()=>900});
  assert.equal(plan.pdfsToRegenerate,1);
  const created=plan.ops.find(o=>o.store==='pending'&&o.value).value;
  assert.equal(created.requiresPdfRegeneration,true);assert.equal(created.payload.status,'En edición');
 });
 await check('29: copia con PDF anterior igualmente cuenta y conserva archivo histórico',()=>{
  const x=item({payload:{...clone(basePayload),status:'Finalizado'},archive:archive(item())});
  let seq=0;const plan=planConflictCopies([x],{uid:x.uid,module:x.module,currentDraftId:x.id,
   isGlobal:false,ownerName:'Persona QA',newId:()=>String(++seq),now:()=>900});
  assert.equal(plan.pdfsToRegenerate,1);
  assert.ok(plan.ops.some(o=>o.store==='draft'&&o.value?.operation?.archive?.pdf));
 });
 await check('30: copia En edición sin PDF no contabiliza regeneración',()=>{
  const x=item(),x2={...x,token:'token-test'};let seq=0;
  const plan=planConflictCopies([x2],{uid:x.uid,module:x.module,currentDraftId:x.id,
   isGlobal:false,ownerName:'Persona QA',newId:()=>String(++seq),now:()=>900});
  assert.equal(plan.pdfsToRegenerate,0);
 });
 await check('31: las tres banderas de Supabase continúan apagadas',()=>{
  for(const name of ['HYS242_ENABLE_CENTRAL=false','HYS242_DEPLOYMENT_READY=false','HYS292_REMOTE_WRITE_AUTHORIZED=false'])assert.ok(config.includes(name));
 });
 await check('32: el flujo de conflicto deja procesar entradas independientes',()=>{
  assert.ok(cloud.includes('await flush();'));
  assert.ok(!cloud.includes('if(plan.pdfsToRegenerate===0)await flush();'));
 });
 console.log('PASS · '+n+' pruebas v297 (sin red, usuario real ni despliegue).');
})().catch(e=>{console.error(e);process.exitCode=1});
