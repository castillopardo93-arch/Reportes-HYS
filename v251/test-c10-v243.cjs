'use strict';
// C10: alcance APR/OTROS y aislamientos sin conexión a producción.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const storageSrc=fs.readFileSync(path.join(__dirname,'storage-v242.js'),'utf8');
const cloud=fs.readFileSync(path.join(__dirname,'cloud-v242.js'),'utf8');
const config=fs.readFileSync(path.join(__dirname,'config-v242.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'mobile-v242.css'),'utf8');
const risk=fs.readFileSync(path.join(__dirname,'risk-catalog-v243.js'),'utf8');
const assignees=fs.readFileSync(path.join(__dirname,'assignees-v243.js'),'utf8');
const corrections=fs.readFileSync(path.join(__dirname,'corrections-v243.js'),'utf8');
const actions=fs.readFileSync(path.join(__dirname,'actions-v243.js'),'utf8');
const reassign=fs.readFileSync(path.join(__dirname,'reassignment-v243.js'),'utf8');
const audit=fs.readFileSync(path.join(__dirname,'audit-v243.js'),'utf8');
const fakeStorage=()=>({
 getItem(k){return Object.hasOwn(this,k)?this[k]:null},
 setItem(k,v){this[k]=String(v)},
 removeItem(k){delete this[k]},
 clear(){for(const k of Object.keys(this))if(!['getItem','setItem','removeItem','clear','key'].includes(k))delete this[k]},
 key(i){return Object.keys(this).filter(k=>!['getItem','setItem','removeItem','clear','key'].includes(k))[i]||null}
});
function emulateStorage(search,native,session){
 const opened=[];
 const win={localStorage:native,sessionStorage:session,indexedDB:{open(name){opened.push(name);return {}}}};
 const QueryParams=typeof URLSearchParams==='function'?URLSearchParams:class{constructor(q){this.parts=new Map(String(q).replace(/^\?/,'').split('&').filter(Boolean).map(part=>{const p=part.split('=');return [decodeURIComponent(p[0]),decodeURIComponent(p.slice(1).join('='))] }));}get(k){return this.parts.get(k)||null;}};
 new Function('window','location','URLSearchParams',storageSrc)(win,{search},QueryParams);
 return {win,opened};
}
test('C10-01 tarjeta APR y OTROS accesibles por separado',()=>{
 assert.match(html,/id="openAprModule"/);
 assert.match(html,/id="openOtherModule"/);
 assert.match(html,/id="otherAprApp"/);
});
test('C10-02 OTROS usa el formulario original por iframe integrado',()=>{
 assert.match(html,/embedded=otros/);
 assert.match(html,/window\.__REPORTES_HYS_OTROS_EMBEDDED__=embeddedOtros/);
 assert.match(html,/const keys=\{activities:.*findings:\["Condición detectada","Prioridad","Medida propuesta","Responsable","Estado"\]/);
});
test('C10-03 comparte componentes de hallazgo, sin duplicación de código C03-C09',()=>{
 for(const file of ['risk-catalog-v243.js','assignees-v243.js','commitment-v243.js','finding-detail-v243.js','corrections-v243.js','actions-v243.js','reassignment-v243.js','audit-v243.js']){
  assert.equal(html.split('<script src="'+file+'"></script>').length-1,1,file);
 }
});
test('C10-04 se conserva tabla de 7 columnas y fotos originales',()=>{
 assert.match(html,/table:has\(> tbody#findings\)\{table-layout:fixed;width:100%\}/);
 assert.match(html,/data-photo-preview="true"/);
 assert.match(html,/return mainRow\+evidence\+linkedRisks\+linkedAssignees\+dueDateRow\+workflowDetail/);
});
test('C10-05 el mismo formulario de hallazgos sirve a ambos módulos',()=>{
 assert.match(html,/if\(k==="findings"\)\{if\(!window\.Hys243Risks\)/);
 assert.match(html,/window\.Hys243Assignees\.mount\(\$\("modalFields"\),\{modulo:embeddedOtros\?"OTROS":"APR"/);
 assert.match(html,/window\.Hys243Commitment\.mount\(\$\("modalFields"\),current\)/);
 assert.match(html,/window\.Hys243Actions\.mount\(\$\("modalFields"\)/);
});
test('C10-06 se registra módulo explícito en todo nuevo informe',()=>{
 assert.match(html,/version:"v242",module:embeddedOtros\?"OTROS":"APR",reportId:/);
});
test('C10-07 no permite importar directamente respaldo etiquetado para otro módulo',()=>{
 assert.match(html,/if\(obj\.module&&obj\.module!==\(embeddedOtros\?"OTROS":"APR"\)\)throw Error\("El informe corresponde a otro módulo/);
});
test('C10-08 mantiene compatibilidad con respaldos históricos sin módulo',()=>{
 assert.match(html,/if\(obj\.module&&obj\.module!==/);
 assert.doesNotMatch(html,/if\(!obj\.module\)throw Error/);
});
test('C10-09 OTROS descarta datos APR invisibles al cargar y guardar',()=>{
 assert.match(html,/embeddedOtros\?\{activities:\[\],inspections:\[\],findings:obj\.data\.findings\}:obj\.data/);
 assert.match(html,/window\.__REPORTES_HYS_OTROS_EMBEDDED__\?\{activities:\[\],inspections:\[\],findings:data\.findings\}:data/);
});
test('C10-10 OTROS oculta áreas de actividades exclusivas de APR',()=>{
 assert.match(html,/body\.embedded-otros \.layout main > section\.report-section:has\(#activities\)/);
 assert.match(html,/body\.embedded-otros \.layout main > section\.report-section:has\(#inspections\)/);
});
test('C10-11 se conservan nombres de PDF y contenido OTROS por módulo',()=>{
 assert.match(html,/otros:window\.__REPORTES_HYS_OTROS_EMBEDDED__===true/);
 assert.match(html,/options\.otros\?'INFORME DE HALLAZGOS - OTROS':'INFORME DIARIO HYS'/);
});
test('C10-12 cada contexto de acciones usa módulo actual explícito',()=>{
 assert.match(html,/modulo:embeddedOtros\?"OTROS":"APR"/);
 assert.match(html,/module:embeddedOtros\?"OTROS":"APR"/);
 assert.match(html,/window\.Hys243Audit\?\.setContextProvider/);
});
test('C10-13 aislamiento local: usuario/módulo APR distinto de OTROS',()=>{
 const native=fakeStorage(),session=fakeStorage();
 const apr=emulateStorage('',native,session),otros=emulateStorage('?embedded=otros',native,session);
 apr.win.HysStorage242.setScope('user-uno');otros.win.HysStorage242.setScope('user-uno');
 apr.win.localStorage.setItem('reportes-hys-v30-daily','APR');
 otros.win.localStorage.setItem('reportes-hys-v30-daily','OTROS');
 assert.equal(apr.win.localStorage.getItem('reportes-hys-v30-daily'),'APR');
 assert.equal(otros.win.localStorage.getItem('reportes-hys-v30-daily'),'OTROS');
 assert.equal(native.getItem('hys-v242::user-uno::APR::reportes-hys-v30-daily'),'APR');
 assert.equal(native.getItem('hys-v242::user-uno::OTROS::reportes-hys-v30-daily'),'OTROS');
});
test('C10-14 aislamiento local: usuarios distintos del mismo módulo',()=>{
 const native=fakeStorage(),session=fakeStorage();
 const a=emulateStorage('',native,session),b=emulateStorage('',native,session);
 a.win.HysStorage242.setScope('user-a');b.win.HysStorage242.setScope('user-b');
 a.win.localStorage.setItem('borrador','uno');b.win.localStorage.setItem('borrador','dos');
 assert.equal(a.win.localStorage.getItem('borrador'),'uno');
 assert.equal(b.win.localStorage.getItem('borrador'),'dos');
});
test('C10-15 credenciales de autenticación se comparten intencionalmente, no informes',()=>{
 const native=fakeStorage(),session=fakeStorage();
 const a=emulateStorage('',native,session),b=emulateStorage('?embedded=otros',native,session);
 a.win.HysStorage242.setScope('one');b.win.HysStorage242.setScope('one');
 a.win.localStorage.setItem('sb-test-auth','token');
 assert.equal(b.win.localStorage.getItem('sb-test-auth'),'token');
 a.win.localStorage.setItem('reporte','sólo APR');
 assert.equal(b.win.localStorage.getItem('reporte'),null);
});
test('C10-16 sessionStorage también aísla pestañas del módulo',()=>{
 const native=fakeStorage(),session=fakeStorage();
 const a=emulateStorage('',native,session),b=emulateStorage('?embedded=otros',native,session);
 a.win.HysStorage242.setScope('uno');b.win.HysStorage242.setScope('uno');
 a.win.sessionStorage.setItem('tab','inicio');b.win.sessionStorage.setItem('tab','informe');
 assert.equal(a.win.sessionStorage.getItem('tab'),'inicio');
 assert.equal(b.win.sessionStorage.getItem('tab'),'informe');
});
test('C10-17 bases IndexedDB están separadas por usuario y módulo',()=>{
 const native=fakeStorage(),session=fakeStorage();
 const a=emulateStorage('',native,session),b=emulateStorage('?embedded=otros',native,session);
 a.win.HysStorage242.setScope('uno');b.win.HysStorage242.setScope('uno');
 a.win.indexedDB.open('borradores');b.win.indexedDB.open('borradores');
 assert.deepEqual(a.opened,['hys-v242::uno::APR::borradores']);
 assert.deepEqual(b.opened,['hys-v242::uno::OTROS::borradores']);
});
test('C10-18 mensajería de iframe valida origen y ventana exacta',()=>{
 assert.match(html,/event\.origin===location\.origin && event\.source===\$\("otherAprApp"\)\.contentWindow/);
 assert.match(html,/window\.parent\.postMessage\(\{type:"reportes-hys-switch-module"\},location\.origin\)/);
});
test('C10-19 no hay permisos de escritura con central v242 inactivo',()=>{
 assert.match(config,/window\.HYS242_ENABLE_CENTRAL=false;/);
 assert.match(config,/window\.HYS242_DEPLOYMENT_READY=false;/);
 assert.match(cloud,/function editable\(\)\{return !!\(window\.HYS242_DEPLOYMENT_READY===true/);
});
test('C10-20 rutas remotas de C07-C09 siguen bloqueadas por defecto',()=>{
 for(const text of [corrections,actions,reassign,audit])assert.doesNotMatch(text,/\bfetch\s*\(/);
 assert.match(corrections,/HYS243_ACTIONS_ISOLATED===true/);
 assert.match(actions,/HYS243_TASKS_ISOLATED===true/);
 assert.match(reassign,/HYS243_REASSIGNMENT_ISOLATED===true/);
 assert.match(audit,/HYS243_AUDIT_ISOLATED===true/);
});
test('C10-21 directorio C04 no carga datos de otro módulo ni inactivos',()=>{
 assert.match(assignees,/item\.modulo!==modulo\|\|!allowed\|\|!active/);
 assert.match(assignees,/HYS243_DIRECTORY_ISOLATED===true/);
});
test('C10-22 catálogo C03 es local y sin consultas remotas',()=>{
 assert.match(risk,/reportes-hys-v243-risk-catalog-v1/);
 assert.doesNotMatch(risk,/\bfetch\s*\(/);
});
test('C10-23 funcionalidades móviles y PDF originales siguen disponibles',()=>{
 assert.match(css,/record-evidence/);
 assert.match(html,/function pack\(\)/);
 assert.match(html,/window\.HysReportPdf\.create/);
});
test('C10-24 no se publica main ni se cambian cuentas desde C10',()=>{
 assert.match(config,/No publicar, desplegar ni conectar a datos reales/);
 assert.doesNotMatch(html,/HYS242_DEPLOYMENT_READY=true;/);
});
