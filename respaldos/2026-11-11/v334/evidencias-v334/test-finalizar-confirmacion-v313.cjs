const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const js = fs.readFileSync(path.join(__dirname,'../v334-review/cloud-v242.js'),'utf8');
const fn = js.slice(js.indexOf(' async function finalizeReport()'),js.indexOf(' async function startNew()'));
const data = {date:'2026-11-10',dateFrom:'2026-11-10',dateTo:'2026-11-11',owner:'QA',
 shift:'Noche',project:'QA',area:'QA',status:'Borrador'};
async function ejecutar(cambios, confirma, guarda, opts={}) {
 const calls = [];
 const ctx = {
  B:{pack:()=>({...data,...cambios}),cacheFinalized:async()=>calls.push('indexar')},
  generation:1, draftId:'QA-1', phase:'ready',
  canWrite:()=>true, central:()=>opts.central===true, message:()=>{}, setWriteAccess:()=>{},
  confirm:()=>{calls.push('confirmar');return confirma},
  onSave:async()=>{calls.push('guardar');return guarda},
  apply:()=>calls.push('aplicar'), flush:async()=>calls.push('sincronizar'),
  window:{Hys255Guard:require('../v334-review/integrity-v255.js'),HysRemoteConfirmed242:()=>opts.acuse===true},
  queue:{store:{get:async tabla=>tabla==='pending'&&opts.pendiente?{}:null}}
 };
 const resultado=await vm.runInNewContext(fn+'\nfinalizeReport()',ctx);
 return {resultado,calls};
}
(async()=>{
 assert.deepEqual(await ejecutar({date:'2026-02-30'},true,true),{resultado:false,calls:[]});
 for(const date of ['2026-11-09','2026-11-12']){
  assert.deepEqual(await ejecutar({date},true,true),{resultado:false,calls:[]});
 }
 assert.deepEqual(await ejecutar({date:'2026-11-11'},false,true),{resultado:false,calls:['confirmar']});
 assert.deepEqual(await ejecutar({},false,true),{resultado:false,calls:['confirmar']});
 assert.deepEqual(await ejecutar({},true,false),{resultado:false,calls:['confirmar','guardar']});
 assert.deepEqual(await ejecutar({},true,true),{
  resultado:true,calls:['confirmar','guardar','aplicar','sincronizar','indexar']
 });
 for(const opts of [{central:true},{central:true,acuse:true,pendiente:true}]){
  assert.deepEqual(await ejecutar({},true,true,opts),{
   resultado:false,calls:['confirmar','guardar','aplicar','sincronizar']
  });
 }
 assert.deepEqual(await ejecutar({},true,true,{central:true,acuse:true}),{
  resultado:true,calls:['confirmar','guardar','aplicar','sincronizar','indexar']
 });
 console.log('Finalizar informe: 10 casos verificados.');
})().catch(e=>{console.error(e);process.exitCode=1});
