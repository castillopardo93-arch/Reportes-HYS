/* Pruebas unitarias F02-F07 v251: no se conectan a Supabase ni envían mensajes. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const f=require('./notifications-f251.js');
const ids={
 finding:'11111111-1111-4111-8111-111111111111',
 action:'22222222-2222-4222-8222-222222222222',
 apr:'33333333-3333-4333-8333-333333333333',
 other:'44444444-4444-4444-8444-444444444444',
 verifier:'55555555-5555-4555-8555-555555555555',
 evidence:'66666666-6666-4666-8666-666666666666',
 activity:'77777777-7777-4777-8777-777777777777'
};
const action=(assigned=ids.apr,status='pending')=>({
 actionId:ids.action,assigneeId:assigned,assigneeName:'Trabajador de prueba',description:'Ejecutar corrección',status
});
const report=(module='APR',findingAction=action())=>({
 module,reportId:'v242-test-f251',data:{
 findings:[['Condición insegura','Alta','Se propone corregir','Responsable','Pendiente',[],
  {findingId:ids.finding,dueDate:'2026-11-07',actions:[findingAction],
   assignees:[{user_id:findingAction.assigneeId,nombre:'Trabajador de prueba',modulo:module}]}]],
 activities:[],inspections:[]
 }
});
test('F01-F02: hallazgo válido produce tarea por UUID',()=>{
 const t=f.tasks(report(),'APR');assert.equal(t.length,1);
 assert.equal(t[0].recipientId,ids.apr);
});
test('F02: crea una propuesta por responsable y tipo',()=>{
 const t=f.tasks(report(),'APR'),out=f.diff([],t,{date:'2026-11-05',reminders:false});
 assert.equal(out.length,1);assert.equal(out[0].type,'asignacion');assert.equal(out[0].state,'preparada');
});
test('F02: nunca toma hallazgos de otro módulo',()=>{
 assert.deepEqual(f.tasks(report('OTROS'),'APR'),[]);
 assert.equal(f.tasks(report('OTROS'),'OTROS').length,1);
});
test('F02: omite UUID inexistente o identidad no vinculada',()=>{
 const bad=report();bad.data.findings[0][6].actions[0].assigneeId='sin-uuid';
 assert.deepEqual(f.tasks(bad,'APR'),[]);
});
test('F02: no duplica la misma propuesta al guardar repetidamente',()=>{
 const events=f.diff([],f.tasks(report(),'APR'),{date:'2026-11-05'});
 const first=f.merge([],events),second=f.merge(first.records,events);
 assert.equal(first.added,events.length);assert.equal(second.added,0);
 assert.equal(new Set(second.records.map(x=>x.key)).size,second.records.length);
});
test('F05: reasignación genera aviso nuevo y al anterior',()=>{
 const a=report(),b=report('APR',action(ids.other));
 const events=f.diff(f.tasks(a,'APR'),f.tasks(b,'APR'),{date:'2026-11-05',reminders:false});
 assert.deepEqual(new Set(events.map(x=>x.type)),new Set(['reasignacion','reasignacion_anterior']));
 assert.deepEqual(new Set(events.map(x=>x.recipientId)),new Set([ids.apr,ids.other]));
});
test('F05: cierre requiere verificación real registrada, no solo estado verbal',()=>{
 const before=report(),after=report('APR',action(ids.apr,'verified'));
 let events=f.diff(f.tasks(before,'APR'),f.tasks(after,'APR'),{date:'2026-11-05',reminders:false});
 assert.equal(events.some(x=>x.type==='cierre'),false);
 const a=after.data.findings[0][6].actions[0];
 Object.assign(a,{verifiedBy:ids.verifier,evidenceIds:[ids.evidence],verifiedAt:'2026-11-05T14:00:00.000Z'});
 events=f.diff(f.tasks(before,'APR'),f.tasks(after,'APR'),{date:'2026-11-05',reminders:false});
 assert.equal(events.some(x=>x.type==='cierre'),true);
});
test('F05: reapertura después de cierre verificado genera evento',()=>{
 const closed=report('APR',action(ids.apr,'verified'));
 Object.assign(closed.data.findings[0][6].actions[0],{verifiedBy:ids.verifier,evidenceIds:[ids.evidence],verifiedAt:'2026-11-05T14:00:00.000Z'});
 const events=f.diff(f.tasks(closed,'APR'),f.tasks(report(),'APR'),{date:'2026-11-05',reminders:false});
 assert.equal(events.filter(x=>x.type==='reapertura').length,1);
});
test('F03: plantilla de correo no inventa envío ni confirma lectura',()=>{
 const e=f.diff([],f.tasks(report(),'APR'),{date:'2026-11-05',reminders:false})[0];
 const mail=f.emailTemplate(e);assert.match(mail.subject,/Reportes HYS/);
 assert.match(mail.text,/APR/);assert.doesNotMatch(mail.text,/confirmad[oa]/i);
});
test('F04: preparado no se transforma en enviado, visto o confirmado',()=>{
 const e=f.merge([],f.diff([],f.tasks(report(),'APR'),{date:'2026-11-05',reminders:false})).records[0];
 assert.equal(e.state,'preparada');assert.equal(e.enviado_en,undefined);
 assert.equal(f.serverStatus(e),'No confirmado');
 assert.equal(f.serverStatus({state:'viewed',origin:'servidor_autorizado'}),'Visto');
});
test('F03-F07: recordatorios cercanos y vencidos con clave determinista',()=>{
 const a=f.tasks(report(),'APR');
 const soon=f.diff(a,a,{date:'2026-11-05'}),overdue=f.diff(a,a,{date:'2026-11-08'});
 assert.equal(soon.filter(x=>x.type==='recordatorio').length,1);
 assert.equal(overdue.filter(x=>x.type==='recordatorio').length,1);
 assert.notEqual(soon.find(x=>x.type==='recordatorio').key,overdue.find(x=>x.type==='recordatorio').key);
});
test('F07: reintentos exponenciales acotados sin modificación de clave',()=>{
 assert.deepEqual(f.retryPolicy(0),{retry:true,delaySeconds:60,deadLetter:false});
 assert.deepEqual(f.retryPolicy(2),{retry:true,delaySeconds:240,deadLetter:false});
 assert.deepEqual(f.retryPolicy(5),{retry:false,delaySeconds:0,deadLetter:true});
});
test('F06: exportación solo de tarea visible para el ámbito autorizado',()=>{
 const a=f.tasks(report(),'APR'),e=f.merge([],f.diff([],a,{date:'2026-11-05',reminders:false})).records;
 assert.equal(f.annexRows(report(),a,e).length,1);
 assert.equal(f.annexRows(report(),[],e).length,0);
 assert.equal(f.annexRows(report('OTROS'),a,e).length,0);
 assert.match(f.annexRows(report(),a,e)[0].estado,/sin envío/);
});
test('F02: actividad APR asignada participa sin filtrar actividades a OTROS',()=>{
 const r=report();
 r.data.findings=[];
 r.data.activities=[['APR','VA4','Trabajo eléctrico','Pendiente',[],{
  activityId:ids.activity,activityType:'assigned',dueDate:'2026-11-07',
  identity:{user_id:ids.apr,modulo:'APR'}
 }]];
 assert.equal(f.tasks(r,'APR').length,1);
 r.module='OTROS';assert.deepEqual(f.tasks(r,'OTROS'),[]);
});
