// v266 · Pruebas del punto 3; ejecutar: node --test evidencias-v266/test-punto3-v266.cjs
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const folder=path.resolve(__dirname,'../v266-review');
const read=n=>fs.readFileSync(path.join(folder,n),'utf8');
const model=require(path.join(folder,'worker-model-v265.js'));
function make(){
 const data=new Map(),legacy=new Map();
 const root={
  location:{pathname:'/v266-review/index.html'},HYS266_PREVIEW_ONLY:true,HYS242_ENABLE_CENTRAL:false,HYS257_ENABLE_USER_MANAGEMENT:false,
  Hys265WorkerModel:model,document:{readyState:'loading',addEventListener(){}},
  HysStorage242:{namespace:'hys-v266-laboratorio',sharedLabStorage:{},legacyVersionedSnapshot:()=>Object.fromEntries(legacy)},
  atob:value=>Buffer.from(value,'base64').toString('latin1'),jspdf:{jsPDF:class{
   pages=1;setFontSize(){}text(){}addPage(){this.pages++}getNumberOfPages(){return this.pages}
   output(){return new Uint8Array([...Buffer.from('%PDF-1.4\\n'),...Array(550).fill(32)]).buffer}
  }},
 };
 vm.runInNewContext(read('notifications-f251.js'),{window:root,globalThis:root,module:{exports:{}}});
 vm.runInNewContext(read('verificacion-punto3-v266.js'),{window:root,globalThis:root,Option:class{}});
 return {root,api:root.Hys266VerificationCore,legacy,data};
}
test('dos tarjetas y verificación integrada, sin nueva tarjeta lateral',()=>{
 const s=read('index.html');
 assert.match(s,/id="aprModuleCard"/);assert.match(s,/id="otherModuleCard"/);
 assert.match(s,/src="verificacion-punto3-v266.js/);
 assert.doesNotMatch(read('verificacion-punto3-v266.js'),/hys-admin-open/);
});
test('el laboratorio de v266 no activa escritos reales',()=>{
 const s=read('config-v242.js');
 assert.match(s,/HYS242_ENABLE_CENTRAL=false/);
 assert.match(s,/HYS257_ENABLE_USER_MANAGEMENT=false/);
 assert.match(read('index.html'),/v266-review\\\/index/);
});
test('tarea de notificación local, sin enviar correo',()=>{
 const {api,root}=make(),r=api.checkNotification();
 assert.equal(r.ok,true);
 const tasks=root.Hys251Notifications.tasks(api.makeFinding(),'APR');
 assert.equal(tasks.length,1);assert.equal(tasks[0].closed,false);
 assert.equal(tasks[0].recipientId,'22222222-2222-4222-8222-222222222222');
});
test('PDF temporal verifica dos páginas y firma',()=>{
 const {api}=make(),out=api.checkPDF();assert.equal(out.ok,true);
 assert.match(out.detail,/No se guardó un informe/);
});
test('revisión de imagen PNG de referencia',()=>{
 const {api}=make();assert.equal(api.checkPhoto().ok,true);
});
test('aislamiento v266, sin credenciales de versiones previas',()=>{
 const {api}=make();assert.equal(api.checkStorage().ok,true);
 const storage=read('storage-v242.js'),cloud=read('cloud-v242.js');
 assert.match(storage,/hys-v266-laboratorio::/);assert.match(cloud,/hys-v266-laboratorio-queue::/);
 assert.doesNotMatch(storage,/setItem\\(k,v\\).*hys-v265-laboratorio::auth::/);
});
test('respaldo ofrece solo claves locales de usuario y tarjeta seleccionada',()=>{
 const {api,legacy}=make();
 legacy.set('hys-v265-laboratorio::ana::APR::reportes-hys-v31-draft','{"ok":1}');
 legacy.set('hys-v263-laboratorio::ana::OTROS::reportes-hys-v31-draft','{"no":1}');
 legacy.set('hys-v265-laboratorio::pedro::APR::reportes-hys-v31-draft','{"no":2}');
 legacy.set('hys-v265-laboratorio::ana::APR::auth-token','secret');
 legacy.set('hys-v265-laboratorio::ana::APR::otra-cosa','{"no":3}');
 const entries=api.backupEntries('ana','APR');
 assert.equal(entries.length,1);assert.match(entries[0].key,/ana::APR/);
 assert.equal(api.backupEntries('ana','OTROS').length,1);
 assert.equal(api.backupEntries('pedro','APR').length,1);
 assert.equal(api.backupEntries('ana','INVALID').length,0);
});
test('sin biblioteca PDF se muestra pendiente, nunca éxito falso',()=>{
 const {root,api}=make();root.jspdf={};
 assert.equal(api.checkPDF().ok,false);
});
test('cambio de las banderas de escritura dispara alerta',()=>{
 const {root,api}=make();root.HYS257_ENABLE_USER_MANAGEMENT=true;
 assert.equal(api.checkAccount().ok,false);
});
test('sintaxis JS de toda v266 y bloques incrustados de index.html',()=>{
 for(const f of fs.readdirSync(folder).filter(x=>x.endsWith('.js')))assert.doesNotThrow(()=>new vm.Script(read(f),{filename:f}));
 for(const [,script]of read('index.html').matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/g))assert.doesNotThrow(()=>new vm.Script(script));
});
