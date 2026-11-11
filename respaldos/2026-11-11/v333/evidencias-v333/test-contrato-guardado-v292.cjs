/* Reportes HYS v292: contrato de sincronización aislado, SIN operaciones remotas. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../v333-review');
const {Queue242,fingerprint,verifyServerAck,isRemoteConfirmed}=require(path.join(root,'sync-core-v242.js'));
const cloud=fs.readFileSync(path.join(root,'cloud-v242.js'),'utf8');
const flags=fs.readFileSync(path.join(root,'config-v242.js'),'utf8');
const id='v242-prueba-1',token='60feef14-e84b-4782-a5b7-b554f062de09';
const payload={reportId:id,status:'En edición',owner:'Usuaria QA',date:'2026-11-09',data:{activities:[],inspections:[],findings:[]}};
const makeItem=()=>({id,module:'APR',uid:'user-qa',token,revision:0,payload,archive:null,at:1});
const makeAck=()=>({id,modulo:'APR',ultimo_token:token,revision:1,payload});
let n=0;
async function run(label,fn){await fn();console.log('OK '+String(++n).padStart(2,'0')+' · '+label)}
function memory(item){
 const m={pending:new Map(item?[[item.id,item]]:[]),meta:new Map(),draft:new Map()};
 const store={get:async(t,k)=>m[t].get(k),all:async t=>Array.from(m[t].values()),put:async(t,v)=>{m[t].set(v.id,v)},batch:async ops=>{for(const o of ops){if(o.remove)m[o.store].delete(o.id);else m[o.store].set(o.value.id,o.value)}}};
 return {m,store};
}
(async()=>{
 await run('Confirmación con identidad, módulo y token exactos',()=>assert.equal(verifyServerAck(makeItem(),makeAck()).sameToken,true));
 await run('Rechaza respuesta con ID diferente',()=>assert.throws(()=>verifyServerAck(makeItem(),{...makeAck(),id:'otro'}),/no se confirma/));
 await run('Rechaza respuesta del módulo contrario',()=>assert.throws(()=>verifyServerAck(makeItem(),{...makeAck(),modulo:'OTROS'}),/no se confirma/));
 await run('Rechaza revisión nula',()=>assert.throws(()=>verifyServerAck(makeItem(),{...makeAck(),revision:0}),/no se confirma/));
 await run('Rechaza revisión inferior a la enviada',()=>assert.throws(()=>verifyServerAck({...makeItem(),revision:4},{...makeAck(),revision:3}),/no se confirma/));
 await run('Rechaza cuerpo del informe ausente',()=>assert.throws(()=>verifyServerAck(makeItem(),{...makeAck(),payload:null}),/no se confirma/));
 await run('Rechaza reportId que no pertenece al registro',()=>assert.throws(()=>verifyServerAck(makeItem(),{...makeAck(),payload:{...payload,reportId:'otro'}}),/no se confirma/));
 await run('Acepta repetición idempotente con el mismo token',()=>assert.equal(verifyServerAck(makeItem(),makeAck()).revision,1));
 await run('Acepta sin cambios si el servidor ya tenía contenido equivalente',()=>{
  const a={...makeAck(),ultimo_token:'token-anterior'};
  assert.equal(verifyServerAck(makeItem(),a).sameToken,false);
 });
 await run('Rechaza token viejo cuando cambia el contenido',()=>{
  const a={...makeAck(),ultimo_token:'token-anterior',payload:{...payload,owner:'Otro'}};
  assert.throws(()=>verifyServerAck(makeItem(),a),/no se confirma/);
 });
 await run('Rechaza respuesta vieja que no coincide con PDF adjunto',()=>{
  const request={...makeItem(),archive:{metadata:{reportId:id}}};
  assert.throws(()=>verifyServerAck(request,{...makeAck(),ultimo_token:'anterior',archivo:null}),/no se confirma/);
 });
 await run('Rechaza solicitud sin token',()=>assert.throws(()=>verifyServerAck({...makeItem(),token:''},makeAck()),/no se confirma/));
 await run('No declara remoto sin metadatos confirmados',()=>assert.equal(isRemoteConfirmed({payload},null,true),false));
 await run('No declara remoto si falta revisión positiva',()=>assert.equal(isRemoteConfirmed({payload},{revision:0,fingerprint:fingerprint(payload)},true),false));
 await run('No declara remoto con datos diferentes',()=>assert.equal(isRemoteConfirmed({payload},{revision:1,fingerprint:fingerprint({...payload,owner:'Diferente'})},true),false));
 await run('No declara remoto sin copia local confirmada',()=>assert.equal(isRemoteConfirmed({payload},{revision:1,fingerprint:fingerprint(payload)},false),false));
 await run('Reconoce confirmación exacta remota',()=>assert.equal(isRemoteConfirmed({payload},{revision:1,fingerprint:fingerprint(payload)},true),true));
 await run('Cola elimina solo operación confirmada por servidor',async()=>{
  const item=makeItem(),ctx=memory(item),q=new Queue242(ctx.store,async()=>makeAck());await q.flush();
  assert.equal(ctx.m.pending.size,0);assert.equal(ctx.m.meta.get(id).revision,1);
  assert.equal(ctx.m.meta.get(id).fingerprint,fingerprint(payload));
 });
 await run('Cola conserva pendiente ante token conflictivo',async()=>{
  const item=makeItem(),ctx=memory(item),q=new Queue242(ctx.store,async()=>({...makeAck(),ultimo_token:'anterior',payload:{...payload,owner:'Otro'}}));
  await assert.rejects(()=>q.flush(),/no se confirma/);
  assert.equal(ctx.m.pending.get(id).token,token);assert.equal(ctx.m.meta.size,0);
 });
 await run('Cola conserva pendiente ante respuesta de otro informe',async()=>{
  const item=makeItem(),ctx=memory(item),q=new Queue242(ctx.store,async()=>({...makeAck(),id:'otro'}));
  await assert.rejects(()=>q.flush(),/no se confirma/);assert.equal(ctx.m.pending.size,1);
 });
 await run('Cola conserva pendiente ante respuesta de otro módulo',async()=>{
  const item=makeItem(),ctx=memory(item),q=new Queue242(ctx.store,async()=>({...makeAck(),modulo:'OTROS'}));
  await assert.rejects(()=>q.flush(),/no se confirma/);assert.equal(ctx.m.pending.size,1);
 });
 await run('Cola permite no-op probado por coincidencia completa',async()=>{
  const item=makeItem(),ctx=memory(item),q=new Queue242(ctx.store,async()=>({...makeAck(),ultimo_token:'token-ya-existente'}));
  await q.flush();assert.equal(ctx.m.pending.size,0);
 });
 await run('Cola bloquea respuesta sin informe de origen',async()=>{
  const item=makeItem(),ctx=memory(item),q=new Queue242(ctx.store,async()=>({...makeAck(),payload:null}));
  await assert.rejects(()=>q.flush());assert.equal(ctx.m.pending.size,1);
 });
 await run('La interfaz solo informa sincronización con evidencia',()=>{
  assert.match(cloud,/HysRemoteConfirmed242\(local,meta,localSaved\)/);
  assert.match(cloud,/borrador no confirmado en el servidor/);
 });
 await run('El RPC se verifica antes de alterar la copia local',()=>assert.match(cloud,/if\(error\)throw error;window\.HysVerifyServerAck242\(item,data\);if\(captured\.ticket/));
 await run('Tres banderas obligatorias y desactivadas',()=>{
  assert.match(flags,/HYS242_ENABLE_CENTRAL=false/);
  assert.match(flags,/HYS242_DEPLOYMENT_READY=false/);
  assert.match(flags,/HYS292_REMOTE_WRITE_AUTHORIZED=false/);
  assert.match(cloud,/HYS292_REMOTE_WRITE_AUTHORIZED===true&&window\.HYS242_ENABLE_CENTRAL===true&&window\.HYS242_DEPLOYMENT_READY===true/);
 });
 console.log('PASS · '+n+' pruebas v292, sin red ni cambios Supabase.');
})().catch(e=>{console.error(e);process.exitCode=1});
