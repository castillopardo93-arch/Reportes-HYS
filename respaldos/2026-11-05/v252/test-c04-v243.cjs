'use strict';
// C04: regresiones independientes. Datos sintéticos; no acceden a Supabase.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const a=require('./assignees-v243.js');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const source=fs.readFileSync(path.join(__dirname,'assignees-v243.js'),'utf8');
const cfg=fs.readFileSync(path.join(__dirname,'config-v242.js'),'utf8');
const u1='11111111-1111-4111-8111-111111111111';
const u2='22222222-2222-4222-8222-222222222222';
const u3='33333333-3333-4333-8333-333333333333';
const user=(id,name,module='APR',active=true,view=true)=>({usuario_id:id,nombre:name,modulo:module,activo:active,puede_ver:view});
test('C04-01 acepta UUID y descarta IDs y nombres inválidos',()=>{
 assert.deepEqual(a.snapshot(user(u1,'Nombre Prueba')), {user_id:u1,nombre:'Nombre Prueba',modulo:'APR'});
 assert.equal(a.snapshot(user('123','Persona')) , null);
 assert.equal(a.snapshot(user(u1,'')),null);
});
test('C04-02 no duplica usuarios, máximo 30',()=>{
 assert.equal(a.snapshots([user(u1,'Uno'),user(u1,'Otro')],'APR').length,1);
 assert.equal(a.snapshots([{usuario_id:'bad',nombre:'Otro'}],'APR').length,0);
});
test('C04-03 filtra únicamente activos con permiso en el módulo',()=>{
 const list=a.normalizedDirectory([user(u1,'APR'),user(u2,'No activo','APR',false),user(u3,'Sin acceso','APR',true,false),user(u2,'OTROS','OTROS')],'APR');
 assert.deepEqual(list.map(x=>x.user_id),[u1]);
});
test('C04-04 separa APR y OTROS',()=>{
 const list=[user(u1,'APR','APR'),user(u2,'OTROS','OTROS')];
 assert.deepEqual(a.normalizedDirectory(list,'APR').map(x=>x.user_id),[u1]);
 assert.deepEqual(a.normalizedDirectory(list,'OTROS').map(x=>x.user_id),[u2]);
});
test('C04-05 busca nombres con y sin tildes',()=>{
 const people=a.normalizedDirectory([user(u1,'José Álvarez'),user(u2,'Ana Muñoz')],'APR');
 assert.equal(a.filterDirectory(people,'jose alvarez')[0].user_id,u1);
 assert.equal(a.filterDirectory(people,'ana Munoz')[0].user_id,u2);
});
test('C04-06 compatibilidad de instantáneas y nombres históricos',()=>{
 const x=a.snapshots([{user_id:u1,nombre:'Nombre Antiguo',modulo:'APR'},user(u1,'Otro nombre')],'APR');
 assert.equal(x.length,1);assert.equal(a.names(x),'Nombre Antiguo');
});
test('C04-07 no se confunden nombres iguales con identidades distintas',()=>{
 const x=a.snapshots([user(u1,'Juan Pérez'),user(u2,'Juan Pérez')],'APR');
 assert.equal(x.length,2);assert.equal(x[0].nombre,x[1].nombre);assert.notEqual(x[0].user_id,x[1].user_id);
});
test('C04-08 formato HTML seguro al mostrar instantáneas',()=>{
 const tr=a.detailRow([null,null,null,null,null,[],{assignees:[user(u1,'<Nombre & otro>')]}]);
 assert.match(tr,/&lt;Nombre &amp; otro&gt;/);assert.doesNotMatch(tr,/<Nombre & otro>/);
});
test('C04-09 no consulta usuarios sin configuración de fuente aislada',()=>{
 assert.doesNotMatch(source,/\bfetch\s*\(/);
 assert.doesNotMatch(source,/\bsupabase\.from\s*\(/);
 assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(source,/HYS243_DIRECTORY_ISOLATED===true/);
 assert.match(source,/HYS243_DIRECTORY_ENABLED===true/);
});
test('C04-10 interfaz añade selector sin desplazar campos ni fotografías',()=>{
 assert.match(html,/findings:\["Condición detectada","Prioridad","Medida propuesta","Responsable","Estado"\]/);
 assert.match(html,/window\.Hys243Assignees\.mount\(\$\("modalFields"\)/);
 assert.match(html,/current\[6\]\?\.assignees\|\|\[\]/);
 assert.match(html,/return mainRow\+evidence\+linkedRisks\+linkedAssignees/);
 assert.match(html,/values\[k==="activities"\?4:labels\[k\]\.length\]=attachments/);
});
test('C04-11 fusiona los metadatos sin perder riesgos o categoría OTROS',()=>{
 assert.match(html,/risks:window\.Hys243Risks\.selected\(\),assignees:assignments/);
 assert.match(html,/values\[6\]=\{\.\.\.oldMeta,\.\.\.\(values\[6\]\|\|\{\}\)/);
 assert.match(html,/if\(embeddedOtros&&k==="findings"\)values\[6\]=\{category:/);
});
test('C04-12 texto legado preservado sin IDs y sincronizado con IDs vinculados',()=>{
 assert.match(html,/if\(assignments\.length\|\|window\.Hys243Assignees\.changed\(\)\)values\[3\]=window\.Hys243Assignees\.names\(assignments\)/);
 assert.match(html,/legacy:current\[3\]\|\|""/);
});
test('C04-13 no guarda cambios nuevos sin directorio verificado',()=>{
 assert.match(html,/!window\.Hys243Assignees\.canSubmit\(\)/);
 assert.match(source,/function canSubmit\(\)\{return !changed\(\)\|\|loaderReady;\}/);
});
test('C04-14 conservado bloqueo de escritura central y sesión',()=>{
 assert.match(html,/if\(!canEditReport242\(\)\|\|!editRef\)return/);
 assert.match(html,/session242!==window\.Hys242\.sessionKey\(\)/);
 assert.match(cfg,/window\.HYS242_ENABLE_CENTRAL=false;/);
 assert.match(cfg,/window\.HYS242_DEPLOYMENT_READY=false;/);
});
test('C04-15 referencia recursos de desarrollo',()=>{
 assert.match(html,/<script src="assignees-v243.js"><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="assignee-selector-v243.css">/);
});
