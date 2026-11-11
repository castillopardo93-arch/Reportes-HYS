'use strict';
// C08-R: continuidad de acciones de trabajadores desvinculados; sin usuarios reales.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const reassign=require('./reassignment-v243.js'),actions=require('./actions-v243.js');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const view=fs.readFileSync(path.join(__dirname,'finding-detail-v243.js'),'utf8');
const source=fs.readFileSync(path.join(__dirname,'reassignment-v243.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'reassignment-v243.css'),'utf8');
const config=fs.readFileSync(path.join(__dirname,'config-v242.js'),'utf8');
const OLD='11111111-1111-4111-8111-111111111111',NEW='22222222-2222-4222-8222-222222222222';
const OTHER='33333333-3333-4333-8333-333333333333',TASK='44444444-4444-4444-8444-444444444444';
const FIND='55555555-5555-4555-8555-555555555555';
const action=(status='pending')=>({actionId:TASK,assigneeId:OLD,assigneeName:'Trabajador anterior',description:'Corregir protección perimetral',required:true,status});
const record=(status='pending',more={})=>['Condición','Alta','Medida','Original','Pendiente',[],{findingId:FIND,revision:8,assignees:[{user_id:OLD,nombre:'Trabajador anterior',modulo:'APR'}],actions:[action(status)],...more}];
const context=(rol='supervisor',extra={})=>({actorId:OTHER,profile:{rol,activo:true},canWrite:true,module:'APR',reportId:'informe-sintetico',...extra});
const candidates=[{usuario_id:NEW,nombre:'Nueva persona',modulo:'APR',activo:true,puede_ver:true}];

test('C08R-01 supervisor autorizado supera comprobación preliminar',()=>{assert.equal(reassign.canManage(context()),true)});
test('C08R-02 administrador de área y global también pueden solicitar',()=>{
 assert.equal(reassign.canManage(context('administrador_area')),true);
 assert.equal(reassign.canManage(context('administrador_global')),true);
});
test('C08R-03 usuario común no obtiene control de reasignación',()=>{assert.equal(reassign.canManage(context('usuario')),false)});
test('C08R-04 una cuenta inactiva no puede reasignar',()=>{
 assert.equal(reassign.canManage(context('supervisor',{profile:{rol:'supervisor',activo:false}})),false);
});
test('C08R-05 acceso de solo lectura no permite reasignaciones',()=>{assert.equal(reassign.canManage(context('administrador_global',{canWrite:false})),false)});
test('C08R-06 rechazo de contextos sin identidad o módulo',()=>{
 assert.equal(reassign.canManage(context('supervisor',{actorId:null})),false);
 assert.equal(reassign.canManage(context('supervisor',{module:'NO'})),false);
});
test('C08R-07 pendientes, en proceso y devueltas son reasignables',()=>{
 for(const state of ['pending','in_progress','rejected'])assert.equal(reassign.eligibleAction(record(state),TASK)?.status,state);
});
test('C08R-08 completadas, verificadas y enviadas no se transfieren',()=>{
 for(const state of ['verified','submitted','completed'])assert.equal(reassign.eligibleAction(record(state),TASK),null);
});
test('C08R-09 una acción no reconocida y un hallazgo sin UUID se bloquean',()=>{
 assert.equal(reassign.eligibleAction(record(),OTHER),null);
 assert.equal(reassign.eligibleAction(record('pending',{findingId:'falso'}),TASK),null);
});
test('C08R-10 no se incluyen trabajadores inactivos o sin permiso',()=>{
 const pool=[...candidates,{usuario_id:OTHER,nombre:'Sin acceso',modulo:'APR',activo:true,puede_ver:false},
 {usuario_id:OLD,nombre:'Actual',modulo:'APR',activo:true,puede_ver:true},
 {usuario_id:'not-id',nombre:'Sin UUID',modulo:'APR',activo:true,puede_ver:true},
 {usuario_id:FIND,nombre:'Inactivo',modulo:'APR',activo:false,puede_ver:true}];
 assert.deepEqual(reassign.normalizeCandidates(pool,context(),OLD).map(x=>x.user_id),[NEW]);
});
test('C08R-11 no se mezclan módulos APR y OTROS',()=>{
 assert.equal(reassign.normalizeCandidates([{...candidates[0],modulo:'OTROS'}],context(),OLD).length,0);
 assert.equal(reassign.normalizeCandidates([{...candidates[0],modulo:'OTROS'}],context('supervisor',{module:'OTROS'}),OLD).length,1);
});
test('C08R-12 si hay dos nombres iguales se distingue por UUID',()=>{
 const two=[...candidates,{usuario_id:OTHER,nombre:'Nueva persona',modulo:'APR',activo:true,puede_ver:true}];
 assert.equal(reassign.normalizeCandidates(two,context(),OLD).length,2);
});
test('C08R-13 rechaza asignación a sí mismo o sin lista autorizada',()=>{
 const params={record:record(),actionId:TASK,context:context(),reason:'renuncia',note:'Renuncia informada y traspaso necesario',candidates:reassign.normalizeCandidates(candidates,context(),OLD)};
 assert.throws(()=>reassign.validateRequest({...params,newAssignee:OLD}),/reemplazo activo/);
 assert.throws(()=>reassign.validateRequest({...params,newAssignee:OTHER}),/reemplazo activo/);
});
test('C08R-14 motivo y justificación se registran obligatoriamente',()=>{
 const params={record:record(),actionId:TASK,context:context(),newAssignee:NEW,candidates:reassign.normalizeCandidates(candidates,context(),OLD)};
 assert.throws(()=>reassign.validateRequest({...params,reason:'',note:'Renuncia informada y traspaso necesario'}),/motivo/);
 assert.throws(()=>reassign.validateRequest({...params,reason:'renuncia',note:'Breve'}),/20 y 1000/);
 assert.throws(()=>reassign.validateRequest({...params,reason:'renuncia',note:'a'.repeat(1001)}),/20 y 1000/);
});
test('C08R-15 la solicitud no altera el registro del responsable original',()=>{
 const original=record();const before=JSON.stringify(original);
 const request=reassign.validateRequest({record:original,actionId:TASK,context:context(),newAssignee:NEW,reason:'desvinculacion',note:'Desvinculación; reasignar ejecución pendiente',candidates:reassign.normalizeCandidates(candidates,context(),OLD)});
 assert.equal(request.oldAssigneeId,OLD);assert.equal(request.newAssigneeId,NEW);
 assert.equal(request.expectedRevision,8);assert.equal(JSON.stringify(original),before);
});
test('C08R-16 se bloquea si falta revisión persistente del servidor',()=>{
 const bad=record('pending',{revision:null});
 assert.throws(()=>reassign.validateRequest({record:bad,actionId:TASK,context:context(),newAssignee:NEW,reason:'renuncia',note:'Reemplazo necesario por ausencia del personal',candidates:reassign.normalizeCandidates(candidates,context(),OLD)}),/revisión del servidor/);
});
test('C08R-17 las tareas verificadas no pierden su autoría histórica',()=>{
 const verified=record('verified');
 assert.equal(reassign.eligibleAction(verified,TASK),null);
 assert.equal(verified[6].actions[0].assigneeId,OLD);
});
test('C08R-18 no se activa ningún proveedor ni envío por defecto',()=>{
 reassign.setProvider(null);
 assert.equal(reassign.enabled(),false);
 assert.throws(()=>reassign.setProvider({submit(){}}),/Proveedor incompleto/);
});
test('C08R-19 interfaz muestra el responsable original y controles bloqueados',()=>{
 const markup=reassign.panel(record());
 assert.match(markup,/Trabajador anterior/);
 assert.match(markup,/Reasignación no disponible/);
 assert.match(markup,/Solicitar reasignación<\/button>/);
 assert.match(markup,/data-hys243-load-candidates disabled/);
});
test('C08R-20 la UI no modifica tareas verificadas ni duplicados de estado',()=>{
 assert.equal(reassign.panel(record('verified')).includes('data-hys243-reassign'),false);
});
test('C08R-21 se escapan nombres y descripciones ingresadas',()=>{
 const obj=record();
 obj[6].actions[0].assigneeName='<b>Peligro</b>';
 obj[6].actions[0].description='Corregir <escalera> y cerrar sitio';
 const markup=reassign.panel(obj);
 assert.match(markup,/&lt;b&gt;Peligro&lt;\/b&gt;/);
 assert.match(markup,/&lt;escalera&gt;/);
 assert.doesNotMatch(markup,/<b>Peligro<\/b>/);
});
test('C08R-22 formulario está integrado sin agregar columnas ni alterar archivos',()=>{
 assert.match(html,/<script src="reassignment-v243\.js"><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="reassignment-v243\.css">/);
 assert.match(view,/root\.Hys243Reassignment\?\.panel\(record\)/);
 assert.match(html,/findings:\["Condición detectada","Prioridad","Medida propuesta","Responsable","Estado"\]/);
 assert.match(html,/data-photo-preview="true"/);
});
test('C08R-23 ningún cliente almacena reasignaciones ni registra cierres ficticios',()=>{
 assert.doesNotMatch(source,/\bfetch\s*\(/);
 assert.doesNotMatch(source,/record\[4\]\s*=/);
 assert.doesNotMatch(source,/localStorage\.setItem/);
 assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(source,/HYS243_REASSIGNMENT_ENABLED===true/);
 assert.match(source,/HYS243_REASSIGNMENT_ISOLATED===true/);
 assert.match(config,/window\.HYS242_ENABLE_CENTRAL=false;/);
 assert.match(config,/window\.HYS242_DEPLOYMENT_READY=false;/);
 assert.match(css,/\.hys243-reassign/);
});
test('C08R-24 el recibo exige auditoría y revisión correlativa',()=>{
 assert.match(source,/receipt\.revision<=request\.expectedRevision/);
 assert.match(source,/state\.auditRecorded!==true/);
 assert.match(source,/state\.eventId!==receipt\.eventId/);
 assert.match(source,/state\.revision!==receipt\.revision/);
});
