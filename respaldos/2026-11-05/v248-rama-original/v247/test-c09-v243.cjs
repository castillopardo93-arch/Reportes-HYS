'use strict';
// C09: pruebas de contrato con identidades y eventos ficticios. Sin red.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const audit=require('./audit-v243.js');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const detail=fs.readFileSync(path.join(__dirname,'finding-detail-v243.js'),'utf8');
const js=fs.readFileSync(path.join(__dirname,'audit-v243.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'audit-v243.css'),'utf8');
const cfg=fs.readFileSync(path.join(__dirname,'config-v242.js'),'utf8');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333',F='44444444-4444-4444-8444-444444444444';
const EV1='55555555-5555-4555-8555-555555555555',EV2='66666666-6666-4666-8666-666666666666';
const PHOTO='77777777-7777-4777-8777-777777777777',T1='88888888-8888-4888-8888-888888888888';
const T2='99999999-9999-4999-8999-999999999999';
const assignees=[{user_id:A,nombre:'Ana',modulo:'APR'},{user_id:B,nombre:'Pablo',modulo:'APR'}];
const action=(id,uid,verifier,additional={})=>({actionId:id,assigneeId:uid,assigneeName:uid===A?'Ana':'Pablo',
 description:'Corregir protección física',required:true,status:'verified',verifiedBy:verifier,
 verifiedAt:'2026-11-05T14:00:00Z',evidenceIds:[PHOTO],...additional});
const rec=(actions=[action(T1,A,C),action(T2,B,C)],closure=null)=>['Condición','Alta','Medida','Ana y Pablo','Completado',[],{
 findingId:F,revision:3,assignees,actions,...(closure?{closure}:{})}];
const ctx=(role='supervisor',additional={})=>({actorId:C,profile:{activo:true,rol:role},module:'APR',canWrite:true,reportId:'report-simulado',...additional});
const event=(eventId,revision,previousEventId,changes={})=>({
 eventId,revision,previousEventId,reportId:'report-simulado',findingId:F,module:'APR',
 eventType:revision===1?'created':'reassigned',actorId:C,actorName:'Supervisora',
 actorRole:'supervisor',occurredAt:'2026-11-05T14:00:00Z',reason:'Ajuste preventivo de seguridad',
 evidenceIds:[],...changes
});
const envelope=(events=[event(EV1,1,null),event(EV2,2,EV1)])=>({
 verified:true,source:'server',module:'APR',reportId:'report-simulado',findingId:F,
 revision:3,lastEventId:events.length?events.at(-1).eventId:null,events
});
const expected={module:'APR',reportId:'report-simulado',findingId:F};

test('C09-01 perfiles supervisor y administradores pueden gestionar auditoría',()=>{
 for(const role of ['supervisor','administrador_area','administrador_global']){
  assert.equal(audit.canManage(ctx(role)),true);
 }
});
test('C09-02 usuario común y supervisor inactivo no cierran',()=>{
 assert.equal(audit.canManage(ctx('usuario')),false);
 assert.equal(audit.canManage(ctx('supervisor',{profile:{rol:'supervisor',activo:false}})),false);
});
test('C09-03 ausencia de escritura, sesión o módulo bloquea lectura',()=>{
 assert.equal(audit.canRead(ctx('supervisor',{canWrite:false})),false);
 assert.equal(audit.canRead(ctx('supervisor',{actorId:null})),false);
 assert.equal(audit.canRead(ctx('supervisor',{module:'OTRO'})),false);
});
test('C09-04 acciones obligatorias verificadas con autor independiente habilitan criterio',()=>{
 assert.equal(audit.verifiedTasks(rec()),true);
 assert.equal(audit.canRequestClose(rec(),ctx()),true);
});
test('C09-05 verificación por el propio ejecutor impide cierre',()=>{
 const obj=rec([action(T1,A,A),action(T2,B,C)]);
 assert.equal(audit.verifiedTasks(obj),false);
 assert.equal(audit.canRequestClose(obj,ctx()),false);
});
test('C09-06 tareas incompletas o sin evidencia impiden cierre',()=>{
 assert.equal(audit.verifiedTasks(rec([action(T1,A,C),action(T2,B,C,{status:'submitted'})])),false);
 assert.equal(audit.verifiedTasks(rec([action(T1,A,C,{evidenceIds:[]}),action(T2,B,C)])),false);
});
test('C09-07 un hallazgo sin tareas verificadas no se cierra por su estado visible',()=>{
 const r=rec([],null);
 assert.equal(r[4],'Completado');
 assert.equal(audit.canRequestClose(r,ctx()),false);
});
test('C09-08 el cierre previo confirmado impide un segundo cierre',()=>{
 const r=rec(undefined,{status:'closed',eventId:EV1});
 assert.equal(audit.canRequestClose(r,ctx()),false);
});
test('C09-09 reapertura solo desde cierre confirmado por evento',()=>{
 assert.equal(audit.canRequestReopen(rec(undefined,{status:'closed',eventId:EV1}),ctx()),true);
 assert.equal(audit.canRequestReopen(rec(undefined,{status:'closed',eventId:null}),ctx()),false);
 assert.equal(audit.canRequestReopen(rec(),ctx()),false);
});
test('C09-10 el actor común no puede reabrir aunque exista cierre',()=>{
 assert.equal(audit.canRequestReopen(rec(undefined,{status:'closed',eventId:EV1}),ctx('usuario')),false);
});
test('C09-11 cierre y reapertura exigen motivación de 20 a 1500 caracteres',()=>{
 assert.throws(()=>audit.validateRequest({record:rec(),context:ctx(),operation:'close',reason:'corto'}),/20 a 1500/);
 assert.throws(()=>audit.validateRequest({record:rec(),context:ctx(),operation:'close',reason:'x'.repeat(1501)}),/20 a 1500/);
 const q=audit.validateRequest({record:rec(),context:ctx(),operation:'close',reason:'Condición corregida y verificada en terreno'});
 assert.equal(q.operation,'close');assert.equal(q.expectedRevision,3);
});
test('C09-12 reapertura conserva referencia al cierre anterior',()=>{
 const r=rec(undefined,{status:'closed',eventId:EV1});
 const q=audit.validateRequest({record:r,context:ctx(),operation:'reopen',reason:'Se detectó nuevamente condición no conforme'});
 assert.equal(q.previousClosureEventId,EV1);
 assert.equal(q.findingId,F);
});
test('C09-13 no admite eventos alterados ni tipos de operación inventados',()=>{
 assert.throws(()=>audit.validateRequest({record:rec(),context:ctx(),operation:'delete',reason:'Acción no permitida por la organización'}),/no reconocida/);
 assert.throws(()=>audit.validateRequest({record:rec(),context:ctx('usuario'),operation:'close',reason:'No tengo los permisos requeridos'}),/autorización/);
});
test('C09-14 una solicitud no muta el registro local',()=>{
 const record=rec();const before=JSON.stringify(record);
 audit.validateRequest({record,context:ctx(),operation:'close',reason:'Se revisaron todas las evidencias disponibles'});
 assert.equal(JSON.stringify(record),before);
});
test('C09-15 acepta historial firmado por el contrato de servidor y encadenado',()=>{
 const items=audit.validateEventLog(envelope(),expected);
 assert.equal(items.length,2);assert.equal(items[1].previousEventId,EV1);
 assert.equal(Object.isFrozen(items),true);assert.equal(Object.isFrozen(items[0]),true);
});
test('C09-16 rechaza fuente no verificada aunque contenga eventos',()=>{
 assert.throws(()=>audit.validateEventLog({...envelope(),verified:false},expected),/respuesta verificable/);
 assert.throws(()=>audit.validateEventLog({...envelope(),source:'localStorage'},expected),/respuesta verificable/);
});
test('C09-17 ningún módulo, informe ni hallazgo ajeno aparece en la auditoría',()=>{
 assert.throws(()=>audit.validateEventLog({...envelope(),module:'OTROS'},expected),/respuesta verificable/);
 assert.throws(()=>audit.validateEventLog({...envelope(),reportId:'otro-informe'},expected),/respuesta verificable/);
 assert.throws(()=>audit.validateEventLog({...envelope(),events:[event(EV1,1,null,{findingId:B})]},expected),/cadena de eventos/);
});
test('C09-18 rechaza duplicación de evento e interrupción de cadena',()=>{
 assert.throws(()=>audit.validateEventLog(envelope([event(EV1,1,null),event(EV1,2,EV1)]),expected),/cadena de eventos/);
 assert.throws(()=>audit.validateEventLog(envelope([event(EV1,1,null),event(EV2,2,F)]),expected),/cadena de eventos/);
});
test('C09-19 rechaza revisión no ascendente y evento final erróneo',()=>{
 assert.throws(()=>audit.validateEventLog(envelope([event(EV1,2,null),event(EV2,2,EV1)]),expected),/cadena de eventos/);
 assert.throws(()=>audit.validateEventLog({...envelope(),lastEventId:C},expected),/último evento/);
});
test('C09-20 rechaza actor, fecha y evidencia inválidos',()=>{
 assert.throws(()=>audit.validateEventLog(envelope([event(EV1,1,null,{actorId:'no-uuid'})]),expected),/cadena de eventos/);
 assert.throws(()=>audit.validateEventLog(envelope([event(EV1,1,null,{occurredAt:'2026-99-99T20:00:00Z'})]),expected),/cadena de eventos/);
 assert.throws(()=>audit.validateEventLog(envelope([event(EV1,1,null,{evidenceIds:['incorrecto']})]),expected),/cadena de eventos/);
});
test('C09-21 incluye responsable anterior y nuevo en reasignación sin perder evidencia',()=>{
 const valid=audit.validateEventLog(envelope([event(EV1,1,null),event(EV2,2,EV1,{oldAssigneeName:'Antes',newAssigneeName:'Después',evidenceIds:[PHOTO]})]),expected);
 const html=audit.eventMarkup(valid);
 assert.match(html,/De Antes a Después/);
 assert.match(html,/Evidencias referenciadas: 1/);
});
test('C09-22 escapa comentarios y nombres maliciosos',()=>{
 const valid=audit.validateEventLog(envelope([event(EV1,1,null,{actorName:'<img src=x>',reason:'<script>alert(1)</script>'})]),expected);
 const markup=audit.eventMarkup(valid);
 assert.match(markup,/&lt;img src=x&gt;/);
 assert.match(markup,/&lt;script&gt;/);
 assert.doesNotMatch(markup,/<script>/);
});
test('C09-23 no muestra eventos auditados ficticios si no ha consultado servidor',()=>{
 audit.setProvider(null);
 const markup=audit.panel(rec());
 assert.match(markup,/Auditoría no conectada/);
 assert.match(markup,/No hay una consulta de auditoría verificada/);
 assert.match(markup,/Consultar historial auditado<\/button>/);
 assert.match(markup,/data-hys243-audit-load="[^"]+" disabled/);
});
test('C09-24 las operaciones de cierre y reapertura se muestran inactivas',()=>{
 const markup=audit.panel(rec());
 assert.match(markup,/data-hys243-audit-submit="close"/);
 assert.match(markup,/data-hys243-audit-submit="reopen"/);
 assert.match(markup,/Solicitar cierre formal<\/button>/);
 assert.match(markup,/Solicitar reapertura<\/button>/);
 assert.match(markup,/button type="submit" disabled/);
});
test('C09-25 un proveedor incompleto no puede habilitar el módulo',()=>{
 assert.throws(()=>audit.setProvider({submit(){},reload(){}}),/listEvents, submit y reload/);
 assert.equal(audit.enabled(),false);
});
test('C09-26 contrato de respuesta y relectura exige evento, auditoría y revisión',()=>{
 assert.match(js,/receipt\.auditRecorded!==true/);
 assert.match(js,/state\.auditRecorded!==true/);
 assert.match(js,/state\.eventId!==receipt\.eventId/);
 assert.match(js,/state\.revision!==receipt\.revision/);
 assert.match(js,/receipt\.revision<=payload\.expectedRevision/);
});
test('C09-27 preserva APR/OTROS y la tabla original sin cambios de modelo',()=>{
 assert.match(html,/findings:\["Condición detectada","Prioridad","Medida propuesta","Responsable","Estado"\]/);
 assert.match(html,/return mainRow\+evidence\+linkedRisks\+linkedAssignees\+dueDateRow\+workflowDetail/);
 assert.match(html,/data-photo-preview="true"/);
 assert.match(html,/risks:window\.Hys243Risks\.selected\(\),assignees:assignments,dueDate:dueDate243,findingId:stableId243,actions:plannedActions243/);
});
test('C09-28 la pestaña Historial/cierre integra C09 sin inventar eventos',()=>{
 assert.match(detail,/root\.Hys243Audit\?\.panel\(record\)/);
 assert.match(detail,/ningún cierre o reapertura se ejecuta desde esta vista sin servidor aislado/);
 assert.match(html,/<script src="audit-v243\.js"><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="audit-v243\.css">/);
 assert.match(css,/\.hys243-audit-panel/);
});
test('C09-29 módulo no escribe datos locales ni accede a Supabase ni red directamente',()=>{
 assert.doesNotMatch(js,/\bfetch\s*\(/);
 assert.doesNotMatch(js,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.doesNotMatch(js,/localStorage\.setItem/);
 assert.doesNotMatch(js,/record\[4\]\s*=/);
 assert.match(js,/HYS243_AUDIT_ENABLED===true/);
 assert.match(js,/HYS243_AUDIT_ISOLATED===true/);
 assert.match(cfg,/window\.HYS242_ENABLE_CENTRAL=false;/);
 assert.match(cfg,/window\.HYS242_DEPLOYMENT_READY=false;/);
});
