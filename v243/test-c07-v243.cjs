'use strict';
// C07: seguridad funcional con datos artificiales; ningún backend real ni cierre persistido.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const api=require('./corrections-v243.js');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const view=fs.readFileSync(path.join(__dirname,'finding-detail-v243.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'corrections-v243.css'),'utf8');
const source=fs.readFileSync(path.join(__dirname,'corrections-v243.js'),'utf8');
const config=fs.readFileSync(path.join(__dirname,'config-v242.js'),'utf8');
const U1='11111111-1111-4111-8111-111111111111';
const U2='22222222-2222-4222-8222-222222222222';
const FINDING='33333333-3333-4333-8333-333333333333';
const record=(assignees=[{user_id:U1,nombre:'Primero',modulo:'APR'}],more={})=>['Condición','Alta','Eliminar riesgo','Primero','Pendiente',[],{findingId:FINDING,assignees,...more}];
const context=(overrides={})=>({actorId:U1,profile:{activo:true,rol:'usuario'},module:'APR',canWrite:true,reportId:'report-test',...overrides});
const pictures=()=>[{type:'image/jpeg',size:1024,name:'evidencia.jpg'}];
test('C07-01 utiliza un ID estable para hallazgos existentes',()=>{
 assert.equal(api.ensureFindingId(FINDING),FINDING);
 assert.equal(api.ensureFindingId(FINDING.toUpperCase()),FINDING);
});
test('C07-02 solo se considera elegible al UUID asignado',()=>{
 assert.equal(api.eligible(record(),context()),true);
 assert.equal(api.eligible(record(),context({actorId:U2})),false);
});
test('C07-03 compara UUID, no nombres de personas',()=>{
 const sameName=record([{user_id:U2,nombre:'Primero',modulo:'APR'}]);
 assert.equal(api.eligible(sameName,context()),false);
});
test('C07-04 bloquea módulo cruzado y otros permisos',()=>{
 assert.equal(api.eligible(record(),context({module:'OTROS'})),false);
 assert.equal(api.eligible(record(),context({canWrite:false})),false);
});
test('C07-05 impide actuar a usuarios inactivos o no identificados',()=>{
 assert.equal(api.eligible(record(),context({profile:{activo:false}})),false);
 assert.equal(api.eligible(record(),context({actorId:'sin-uuid'})),false);
 assert.equal(api.eligible(record(),context({profile:null})),false);
});
test('C07-06 rechaza cierre cuando hay varios asignados',()=>{
 const multi=record([{user_id:U1,modulo:'APR'}, {user_id:U2,modulo:'APR'}]);
 assert.equal(api.eligible(multi,context()),true);
 assert.equal(api.mayRequestClose(multi,context()),false);
});
test('C07-07 no permite cierre con acciones obligatorias incompletas',()=>{
 assert.equal(api.requiredActionsComplete(record(undefined,{actions:[{required:true,status:'pending'}]})),false);
 assert.equal(api.mayRequestClose(record(undefined,{actions:[{required:true,status:'pending'}]}),context()),false);
});
test('C07-08 distingue tareas completadas de verificadas con evidencia',()=>{
 const base={actionId:U2,assigneeId:U1,assigneeName:'Primero',description:'Reparar barrera de seguridad',required:true};
 assert.equal(api.requiredActionsComplete(record(undefined,{actions:[{...base,status:'completed'}]})),false);
 assert.equal(api.requiredActionsComplete(record(undefined,{actions:[{...base,status:'verified'}]})),false);
 assert.equal(api.requiredActionsComplete(record(undefined,{actions:[{...base,status:'verified',verifiedAt:'2026-11-05T12:00:00Z',verifiedBy:U2,evidenceIds:[FINDING]}]})),true);
});
test('C07-09 cierre ya confirmado no se vuelve a ofrecer',()=>{
 assert.equal(api.mayRequestClose(record(undefined,{closure:{status:'closed'}}),context()),false);
 assert.equal(api.mayRequestClose(record(),context()),true);
});
test('C07-10 exige al menos una foto de evidencia',()=>{
 assert.throws(()=>api.validateEvidence([]),/entre 1 y 8/);
 assert.equal(api.validateEvidence(pictures()).length,1);
});
test('C07-11 restringe formatos y tamaño de fotografías',()=>{
 assert.throws(()=>api.validateEvidence([{type:'application/pdf',size:1000}]),/JPG/);
 assert.throws(()=>api.validateEvidence([{type:'image/jpeg',size:0}]),/vacía/);
 assert.throws(()=>api.validateEvidence([{type:'image/png',size:9*1024*1024}]),/8 MB/);
});
test('C07-12 impide más de ocho fotos y total excesivo',()=>{
 assert.throws(()=>api.validateEvidence(Array.from({length:9},()=>({type:'image/png',size:100}))),/entre 1 y 8/);
 assert.throws(()=>api.validateEvidence(Array.from({length:4},()=>({type:'image/png',size:7*1024*1024}))),/24 MB/);
});
test('C07-13 la corrección requiere descripción verificable',()=>{
 assert.throws(()=>api.validateRequest({record:record(),context:context(),action:'correct',comment:'corto',files:pictures()}),/15 a 2000/);
 const valid=api.validateRequest({record:record(),context:context(),action:'correct',comment:'Se corrigió la protección existente',files:pictures()});
 assert.equal(valid.files.length,1);
});
test('C07-14 no admite acción inventada ni hallazgo sin ID',()=>{
 assert.throws(()=>api.validateRequest({record:record(),context:context(),action:'delete',comment:'Se corrigió la protección existente',files:pictures()}),/desconocida/);
 assert.throws(()=>api.validateRequest({record:record(undefined,{findingId:null}),context:context(),action:'correct',comment:'Se corrigió la protección existente',files:pictures()}),/identificador/);
});
test('C07-15 requiere un informe persistido para enviar la solicitud',()=>{
 assert.throws(()=>api.validateRequest({record:record(),context:context({reportId:null}),action:'correct',comment:'Se corrigió la protección existente',files:pictures()}),/informe/);
});
test('C07-16 el cierre directo depende de asignación única y corrección con foto',()=>{
 const result=api.validateRequest({record:record(),context:context(),action:'close',comment:'Protección reparada y verificada en terreno',files:pictures()});
 assert.match(result.description,/reparada/);
 assert.throws(()=>api.validateRequest({record:record([{user_id:U1,modulo:'APR'},{user_id:U2,modulo:'APR'}]),context:context(),action:'close',comment:'Protección reparada y verificada en terreno',files:pictures()}),/Cierre no permitido/);
});
test('C07-17 proveedor y backend ausentes no permiten envío',()=>{
 api.setProvider(null);
 api.setContextProvider(()=>context());
 assert.equal(api.enabled(),false);
 assert.throws(()=>api.setProvider({submit:()=>true}),/submit y reload/);
});
test('C07-18 formulario de revisión queda deshabilitado de fábrica',()=>{
 const markup=api.panel(record(),0);
 assert.match(markup,/Corrección y cierre · C07/);
 assert.match(markup,/data-hys243-correction-form="0"/);
 assert.match(markup,/name="action" value="correct" disabled/);
 assert.match(markup,/name="action" value="close" disabled/);
 assert.match(markup,/falta un servidor de pruebas aislado/);
});
test('C07-19 información del hallazgo y metadatos se mantienen',()=>{
 assert.match(html,/risks:window\.Hys243Risks\.selected\(\),assignees:assignments,dueDate:dueDate243,findingId:stableId243/);
 assert.match(html,/stableId243=window\.Hys243Corrections\.ensureFindingId\(oldMeta\.findingId\)/);
 assert.match(html,/let data=\{activities:\[\],inspections:\[\],findings:\[\]\}/);
 assert.match(view,/root\.Hys243Corrections\?\.panel\(record,i\)/);
 assert.match(html,/findings:\["Condición detectada","Prioridad","Medida propuesta","Responsable","Estado"\]/);
 assert.match(html,/data-photo-preview="true"/);
});
test('C07-20 cliente no realiza escrituras remotas ni confirma cierres por sí solo',()=>{
 assert.doesNotMatch(source,/\bfetch\s*\(/);
 assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(source,/HYS243_ACTIONS_ENABLED===true/);
 assert.match(source,/HYS243_ACTIONS_ISOLATED===true/);
 assert.match(source,/provider\.reload/);
 assert.match(source,/receipt\.verified!==true/);
 assert.match(source,/receipt\.revision<=record\[6\]\.revision/);
 assert.match(source,/reloaded\.eventId!==receipt\.eventId/);
 assert.match(source,/reloaded\.revision!==receipt\.revision/);
 assert.doesNotMatch(source,/record\[4\]\s*=/);
 assert.match(css,/\.hys243-correction-box/);
 assert.match(config,/window\.HYS242_ENABLE_CENTRAL=false;/);
 assert.match(config,/window\.HYS242_DEPLOYMENT_READY=false;/);
});
