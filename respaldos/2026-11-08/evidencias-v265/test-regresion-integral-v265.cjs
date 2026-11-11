// Reportes HYS v265 · Pruebas de regresión sin red ni datos reales.
// Ejecutar desde la raíz: node --test evidencias-v265/test-regresion-integral-v265.cjs
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'../v265-review');
const read=name=>fs.readFileSync(path.join(base,name),'utf8');
const worker=require(path.join(base,'worker-model-v265.js'));
function localStore(seed={}){
 const store={...seed};
 return new Proxy({
  getItem:key=>Object.prototype.hasOwnProperty.call(store,key)?store[key]:null,
  setItem:(key,value)=>{store[key]=String(value)},
  removeItem:key=>{delete store[key]},
  key:i=>Object.keys(store)[i]??null
 },{
  ownKeys:()=>Object.keys(store),
  getOwnPropertyDescriptor:(target,name)=>Object.hasOwn(store,name)?{enumerable:true,configurable:true,value:store[name]}:Object.getOwnPropertyDescriptor(target,name),
  get:(target,name)=>name in target?target[name]:store[name]
 });
}
function loadStorage(local){
 const window={localStorage:local,sessionStorage:localStore(),indexedDB:{open(name){return {name}}}};
 vm.runInNewContext(read('storage-v242.js'),{window,location:{search:''},URLSearchParams});
 return window;
}
function labWindow(){
 const storage=localStore(),w=loadStorage(storage);
 Object.assign(w,{HYS263_SANDBOX:true,HYS265_PREVIEW_ONLY:true,Hys265WorkerModel:worker,
  location:{pathname:'/repo/v265-review/index.html',search:'?qa=1'},dispatchEvent(){}});
 vm.runInNewContext(read('backend-simulador-v263.js'),{window:w,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}}});
 return w;
}
const workerValid={
 nombre:'Persona Ejemplo Ficticia',rut:'12.345.678-5',cargo:'Capataz',
 gerencia:'Construcción',empresa:'Empresa ficticia',proyecto:'Proyecto QA',
 supervisor_id:'prueba-supervisor',correo_corporativo:'ficticio@example.test'
};
test('El laboratorio solo activa modo ficticio en ruta autorizada',()=>{
 const w=labWindow();assert.ok(w.Hys263Lab);assert.equal(w.HYS265_PREVIEW_ONLY,true);
 const raw=read('backend-simulador-v263.js');assert.match(raw,/HYS263_SANDBOX!==true/);
});
test('Datos compartidos entre las dos tarjetas y sesiones de la versión',()=>{
 const w=labWindow(),a=w.Hys263Lab.createUser('Trabajador de laboratorio adicional');
 w.HysStorage242.setScope('persona-uno');
 assert.ok(w.Hys263Lab.get().users.some(u=>u.usuario_id===a.usuario_id));
 w.HysStorage242.setScope('persona-dos');
 assert.ok(w.Hys263Lab.get().users.some(u=>u.usuario_id===a.usuario_id));
});
test('Conserva datos antiguos, separa borradores, y no importa copias de otras versiones',()=>{
 const old='hys-v263-laboratorio::persona::APR::borrador';
 const store=localStore({[old]:'conservar-v264'});
 const w=loadStorage(store);w.HysStorage242.setScope('persona');
 w.localStorage.setItem('borrador','v265');
 assert.equal(store.getItem(old),'conservar-v264');
 assert.equal(w.localStorage.getItem('borrador'),'v265');
 assert.equal(store.getItem('hys-v265-laboratorio::persona::APR::borrador'),'v265');
 assert.equal(w.HysStorage242.legacyVersionedSnapshot()[old],'conservar-v264');
});
test('Modelo comprueba RUT, calendario y fecha bisiesta',()=>{
 const users=[{usuario_id:'prueba-supervisor',activo:true,trabajador:{}}];
 assert.equal(worker.validRut(workerValid.rut),true);
 assert.equal(worker.validRut('12.345.678-4'),false);
 assert.equal(worker.validate({...workerValid,fecha_ingreso:'2024-02-29'},users).ok,true);
 assert.equal(worker.validate({...workerValid,fecha_ingreso:'2026-02-31'},users).ok,false);
 assert.equal(worker.validate({...workerValid,fecha_ingreso:'2025-02-29'},users).ok,false);
});
test('Modelo rechaza cadena de supervisión circular',()=>{
 const users=[
  {usuario_id:'prueba-supervisor',activo:true,trabajador:{supervisor_id:'tercero'}},
  {usuario_id:'tercero',activo:true,trabajador:{supervisor_id:'trabajador-editado'}}
 ];
 assert.equal(worker.validate(workerValid,users,'trabajador-editado').ok,false);
});
test('Las facultades no admiten claves inventadas, valores no booleanos, áreas repetidas ni tarjetas ajenas',()=>{
 const areas=[{id:'a',modulo:'APR',activa:true}],ambitos={APR:{ver:true,editar:true,areas:['a']},OTROS:{ver:false,editar:false,areas:[]}};
 const valid={APR:{areas_ids:['a'],facultades:{view:true}},OTROS:{areas_ids:[],facultades:{}}};
 assert.equal(worker.validConfiguration('administrador_area',ambitos,valid,areas).ok,true);
 for(const f of [{superadmin:true},{view:'true'},{review:true}]){
  assert.equal(worker.validConfiguration('administrador_area',ambitos,{APR:{areas_ids:['a'],facultades:f}},areas).ok,false);
 }
 assert.equal(worker.validConfiguration('administrador_area',ambitos,{APR:{areas_ids:['a','a'],facultades:{view:true}}},areas).ok,false);
 assert.equal(worker.validConfiguration('administrador_area',ambitos,{APR:{areas_ids:[],facultades:{view:true}}},areas).ok,false);
});
test('Administrador degradado y ascendido de nuevo comienza sin derechos',()=>{
 const w=labWindow(),lab=w.Hys263Lab;
 const access={APR:{ver:true,editar:true,areas:['apr-va4']},OTROS:{ver:false,editar:false,areas:[]}};
 const fac={APR:{areas_ids:['apr-va4'],facultades:{view:true,audit:true}},OTROS:{areas_ids:[],facultades:{}}};
 const account=worker.validateAccount({correo_ingreso:'corporativo',metodo:'invitacion'},workerValid).cuenta;
 const created=lab.createWorker({trabajador:workerValid,cuenta:account,rol:'administrador_area',ambitos:access,facultades:fac,motivo:'Creación de cuenta ficticia'});
 const first=lab.get().users.find(u=>u.usuario_id===created.usuario_id);
 const removed=worker.transition('administrador_area','usuario',fac,access);
 lab.updateWorker(first.usuario_id,{trabajador:workerValid,cuenta:account,rol:'usuario',ambitos:access,facultades:removed,motivo:'Retirada de rol administrador'},first.revision);
 const second=lab.get().users.find(u=>u.usuario_id===first.usuario_id);
 const reappointed=worker.transition('usuario','administrador_area',fac,access);
 lab.updateWorker(second.usuario_id,{trabajador:workerValid,cuenta:account,rol:'administrador_area',ambitos:access,facultades:reappointed,motivo:'Nueva designación sin derechos previos'},second.revision);
 assert.ok(lab.get().faculties.filter(f=>f.usuario_id===first.usuario_id).every(f=>Object.values(f.facultades).every(v=>!v)));
 assert.equal(lab.get().history.length,3);
 const audit=JSON.stringify(lab.get().history);
 assert.ok(!audit.includes(workerValid.rut)&&!audit.includes(workerValid.correo_corporativo));
});
test('Fallo de almacenamiento no confirma cambios fantasma',()=>{
 const w=labWindow(),lab=w.Hys263Lab,old=JSON.stringify(lab.get());
 w.HysStorage242.sharedLabStorage.setItem=()=>{throw Error('cuota agotada')};
 assert.throws(()=>lab.createUser('Prueba de espacio insuficiente'),/No se pudo guardar/);
 assert.equal(JSON.stringify(lab.get()),old);
});
test('Todos los módulos JS y scripts integrados conservan sintaxis válida',()=>{
 for(const file of fs.readdirSync(base).filter(f=>f.endsWith('.js'))){
  assert.doesNotThrow(()=>new vm.Script(read(file),{filename:file}));
 }
 const html=read('index.html');
 for(const [,source] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
  assert.doesNotThrow(()=>new vm.Script(source));
});
test('Se conserva aplicación completa y se bloquea el guardado central',()=>{
 const html=read('index.html'),cfg=read('config-v242.js'),preview=read('vista-completa-preview-v265.js');
 assert.match(html,/id="aprModuleCard"/);assert.match(html,/id="otherModuleCard"/);
 assert.match(html,/id="otherAprApp"/);
 assert.match(cfg,/HYS242_ENABLE_CENTRAL=false/);
 assert.match(cfg,/HYS257_ENABLE_USER_MANAGEMENT=false/);
 assert.match(preview,/Operación no permitida en vista ficticia/);
 assert.match(preview,/listas_v242/);
});
