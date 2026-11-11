'use strict';
// C08 — pruebas con datos artificiales, sin conexiones ni escrituras de producción.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const api=require('./actions-v243.js'),closure=require('./corrections-v243.js');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const view=fs.readFileSync(path.join(__dirname,'finding-detail-v243.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'actions-v243.css'),'utf8');
const src=fs.readFileSync(path.join(__dirname,'actions-v243.js'),'utf8');
const config=fs.readFileSync(path.join(__dirname,'config-v242.js'),'utf8');
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const F='33333333-3333-4333-8333-333333333333';
const V='44444444-4444-4444-8444-444444444444';
const E='55555555-5555-4555-8555-555555555555';
const assigned=[{user_id:A,nombre:'Responsable Alfa',modulo:'APR'},{user_id:B,nombre:'Responsable Beta',modulo:'APR'}];
const record=(actions,assignees=assigned)=>['Condición','Alta','Mejora propuesta','Responsable Alfa','Pendiente',[],{findingId:F,assignees,...(actions===undefined?{}:{actions})}];
const action=(id,assignee,more={})=>({actionId:id,assigneeId:assignee,assigneeName:assignee===A?'Responsable Alfa':'Responsable Beta',description:'Reparar la protección física',required:true,status:'pending',...more});
const verified=other=>action(other.actionId,other.assigneeId,{...other,status:'verified',verifiedAt:'2026-11-05T11:00:00Z',verifiedBy:V,evidenceIds:[E]});
const context=(actor=A,more={})=>({actorId:actor,module:'APR',canWrite:true,profile:{activo:true},reportId:'prueba-001',...more});

test('C08-01 crea tarea nueva solo como pendiente',()=>{
 const next=api.makeDraft({assignee:assigned[0],description:'Inspeccionar el equipo y reparar',required:true},()=>V);
 assert.equal(next.status,'pending');assert.equal(next.actionId,V);
 assert.equal(next.assigneeId,A);assert.equal(next.required,true);
 assert.equal(next.verifiedBy,undefined);
});
test('C08-02 rechaza identidades o nombres no verificables en planificación',()=>{
 assert.throws(()=>api.makeDraft({assignee:{user_id:'x',nombre:'Prueba',modulo:'APR'},description:'Acción bien descrita'},()=>V),/responsable/);
 assert.throws(()=>api.makeDraft({assignee:{user_id:A,nombre:'',modulo:'APR'},description:'Acción bien descrita'},()=>V),/responsable/);
 assert.throws(()=>api.makeDraft({assignee:assigned[0],description:'Acción bien descrita'},()=>null),/identificar/);
});
test('C08-03 requiere descripción de acción entre 10 y 500 caracteres',()=>{
 assert.throws(()=>api.makeDraft({assignee:assigned[0],description:'corta'},()=>V),/10 y 500/);
 assert.throws(()=>api.makeDraft({assignee:assigned[0],description:'x'.repeat(501)},()=>V),/10 y 500/);
});
test('C08-04 identifica tareas válidas y estados reconocidos',()=>{
 assert.equal(api.validAction(action(V,A)),true);
 assert.equal(api.validAction(action(V,A,{status:'completado'})),false);
 assert.equal(api.validAction(action('id-invalido',A)),false);
});
test('C08-05 en una tarea nueva no se puede atribuir verificación',()=>{
 const next=api.makeDraft({assignee:assigned[0],description:'Revisión preventiva necesaria'},()=>V);
 assert.equal(api.verified(next),false);
});
test('C08-06 estado completado o enviado no significa verificado',()=>{
 assert.equal(api.verified(action(V,A,{status:'completed'})),false);
 assert.equal(api.verified(action(V,A,{status:'submitted'})),false);
});
test('C08-07 verificación requiere fecha, verificador y evidencia con UUID',()=>{
 assert.equal(api.verified(action(V,A,{status:'verified'})),false);
 assert.equal(api.verified(action(V,A,{status:'verified',verifiedAt:'2026-11-05T11:00:00Z',verifiedBy:V,evidenceIds:[]})),false);
 assert.equal(api.verified(verified({actionId:V,assigneeId:A})),true);
});
test('C08-08 sin acciones un único responsable mantiene compatibilidad C07',()=>{
 assert.equal(api.allRequiredVerified(record(undefined,[assigned[0]])),true);
 assert.equal(closure.mayRequestClose(record(undefined,[assigned[0]]),context()),false); // Requiere C09 y verificación independiente
});
test('C08-09 varios responsables sin acciones no pueden cerrar globalmente',()=>{
 assert.equal(api.allRequiredVerified(record(undefined)),false);
 assert.equal(closure.mayRequestClose(record(undefined),context()),false);
});
test('C08-10 la verificación debe cubrir una acción obligatoria por cada responsable',()=>{
 const first=verified({actionId:V,assigneeId:A});
 assert.equal(api.allRequiredVerified(record([first])),false);
 const second=verified({actionId:E,assigneeId:B});
 assert.equal(api.allRequiredVerified(record([first,second])),true);
});
test('C08-11 un pendiente obligatorio bloquea el cierre del conjunto',()=>{
 const one=verified({actionId:V,assigneeId:A});
 assert.equal(api.allRequiredVerified(record([one,action(E,B)])),false);
});
test('C08-12 lo opcional no bloquea cuando todas las obligatorias están verificadas',()=>{
 const one=verified({actionId:V,assigneeId:A});
 const two=verified({actionId:E,assigneeId:B});
 const optional=action(F,A,{required:false});
 assert.equal(api.allRequiredVerified(record([one,two,optional])),true);
});
test('C08-13 tareas inválidas, repetidas o ajenas bloquean el cierre',()=>{
 const one=verified({actionId:V,assigneeId:A});
 const other=verified({actionId:E,assigneeId:B});
 assert.equal(api.allRequiredVerified(record([one,one,other])),false);
 assert.equal(api.allRequiredVerified(record([one,{...other,assigneeId:F}])),false);
 assert.equal(api.allRequiredVerified(record('datos inválidos')),false);
});
test('C08-14 si el responsable sale del hallazgo se bloquea la validación de sus tareas',()=>{
 const one=verified({actionId:V,assigneeId:A});
 const two=verified({actionId:E,assigneeId:B});
 assert.equal(api.allRequiredVerified(record([one,two],[assigned[0]])),false);
});
test('C08-15 no deja eliminar tareas históricas ni asignadas a otra persona inadvertidamente',()=>{
 const one=action(V,A);
 assert.throws(()=>api.validateActionList([one],[assigned[1]]),/no está asignado/);
 assert.equal(api.validateActionList([one],[assigned[0]]).length,1);
});
test('C08-16 exige acciones con IDs únicos y máximo 100',()=>{
 const one=action(V,A);
 assert.throws(()=>api.validateActionList([one,one],assigned),/duplicados/);
 assert.throws(()=>api.validateActionList('no-array',assigned),/listado/);
 assert.throws(()=>api.validateActionList(Array(101).fill(one),assigned),/máximo de 100/);
});
test('C08-17 el actor solo puede completar su tarea con permiso de edición',()=>{
 const own=action(V,A),other=action(E,B),r=record([own,other]);
 assert.equal(api.actorMaySubmit(own,context(),r),true);
 assert.equal(api.actorMaySubmit(other,context(),r),false);
 assert.equal(api.actorMaySubmit(own,context(A,{canWrite:false}),r),false);
});
test('C08-18 usuarios inactivos y módulos distintos quedan excluidos',()=>{
 const own=action(V,A),r=record([own]);
 assert.equal(api.actorMaySubmit(own,context(A,{module:'OTROS'}),r),false);
 assert.equal(api.actorMaySubmit(own,context(A,{profile:{activo:false}}),r),false);
 assert.equal(api.actorMaySubmit(own,context('usuario-no-uuid'),r),false);
});
test('C08-19 estados verificados o enviados no permiten volver a completar',()=>{
 const r=record();
 assert.equal(api.actorMaySubmit(action(V,A,{status:'verified'}),context(),r),false);
 assert.equal(api.actorMaySubmit(action(V,A,{status:'submitted'}),context(),r),false);
 assert.equal(api.actorMaySubmit(action(V,A,{status:'rejected'}),context(),r),true);
});
test('C08-20 las acciones se muestran pero sus envíos siguen deshabilitados',()=>{
 api.setProvider(null);
 const row=api.listMarkup(record([action(V,A),action(E,B)]),context());
 assert.match(row,/Responsable Alfa/);
 assert.match(row,/Responsable Beta/);
 assert.match(row,/data-hys243-action-submit/);
 assert.match(row,/Enviar tarea a verificación<\/button>/);
 assert.match(row,/type="submit" disabled/);
 assert.equal(api.enabled(),false);
});
test('C08-21 texto aportado por el usuario se escapa en la vista',()=>{
 const row=api.listMarkup(record([action(V,A,{description:'<svg>'})]),context());
 assert.match(row,/Datos por revisar/);
 const safe=api.listMarkup(record([action(V,A,{description:'Reparar <barandilla> por seguridad'})]),context());
 assert.match(safe,/&lt;barandilla&gt;/);
 assert.doesNotMatch(safe,/<barandilla>/);
});
test('C08-22 sólo se actualiza el metadato de acciones, preservando campos de C01–C07',()=>{
 assert.match(html,/actions:plannedActions243/);
 assert.match(html,/window\.Hys243Actions\.read\(window\.Hys243Assignees\.selected\(\)\)/);
 assert.match(html,/findings:\["Condición detectada","Prioridad","Medida propuesta","Responsable","Estado"\]/);
 assert.match(html,/risks:window\.Hys243Risks\.selected\(\),assignees:assignments,dueDate:dueDate243,findingId:stableId243/);
 assert.match(html,/data-photo-preview="true"/);
});
test('C08-23 Seguimiento incluye tareas independientes sin tocar la tabla',()=>{
 assert.match(view,/root\.Hys243Actions\?\.listMarkup\(record,root\.Hys243Actions\.context\(\)\)/);
 assert.match(html,/const workflowDetail=k==="findings"/);
 assert.match(html,/table:has\(> tbody#findings\)\{table-layout:fixed;width:100%\}/);
 assert.match(css,/\.hys243-action-tracker/);
});
test('C08-24 C07 exige verificación C08 y prohíbe corrección general por equipos',()=>{
 const correctionSource=fs.readFileSync(path.join(__dirname,'corrections-v243.js'),'utf8');
 assert.match(correctionSource,/root\.Hys243Actions\.allRequiredVerified\(record\)/);
 assert.match(correctionSource,/action==='correct'&&assignments\(record,context\.module\)\.length>1/);
 assert.throws(()=>closure.validateRequest({record:record(),context:context(),action:'correct',comment:'Se reparó el conjunto en terreno',files:[{type:'image/jpeg',size:500}]}),/varios responsables/);
});
test('C08-25 la integración permanece bloqueada sin servicio aislado',()=>{
 assert.match(src,/HYS243_TASKS_ENABLED===true/);
 assert.match(src,/HYS243_TASKS_ISOLATED===true/);
 assert.doesNotMatch(src,/\bfetch\s*\(/);
 assert.doesNotMatch(src,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(config,/window\.HYS242_ENABLE_CENTRAL=false;/);
 assert.match(config,/window\.HYS242_DEPLOYMENT_READY=false;/);
 assert.match(html,/<script src="actions-v243.js"><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="actions-v243.css">/);
});
