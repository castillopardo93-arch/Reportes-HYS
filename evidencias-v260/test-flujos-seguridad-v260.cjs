/* Reportes HYS v260 — 24 pruebas complementarias de interacciones,
 * Ejecutar: node evidencias-v260/test-flujos-seguridad-v260.cjs
 * No necesita servidor, credenciales ni realiza peticiones remotas.
 */
'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../v260-review');
const Act=require(path.join(root,'actions-v243.js'));
const Audit=require(path.join(root,'audit-v243.js'));
const Corr=require(path.join(root,'corrections-v243.js'));
const Reas=require(path.join(root,'reassignment-v243.js'));
const Asg=require(path.join(root,'assignees-v243.js'));
const Risk=require(path.join(root,'risk-catalog-v243.js'));
const Work=require(path.join(root,'activity-workflow-v244.js'));
const DateCheck=require(path.join(root,'commitment-v243.js'));
let n=0;
function verify(name,condition){assert.ok(condition,name);n++;console.log('OK',String(n).padStart(2,'0'),name);}
const u1='11111111-1111-4111-8111-111111111111',u2='22222222-2222-4222-8222-222222222222';
const u3='33333333-3333-4333-8333-333333333333',u4='44444444-4444-4444-8444-444444444444';
const action={actionId:u4,assigneeId:u1,assigneeName:'Responsable Uno',description:'Corregir condición identificada',required:true,status:'verified',verifiedBy:u2,verifiedAt:'2026-11-07T12:00:00.000Z',evidenceIds:[u3]};
const report=['Peligro','','','','',[],{findingId:u3,revision:2,assignees:[{user_id:u1,nombre:'Resp',modulo:'APR'}],actions:[action]}];
const ctx={actorId:u2,profile:{activo:true,rol:'supervisor'},canWrite:true,module:'APR',reportId:'folio-1'};
verify('bisiesto correcto',DateCheck.validDate('2024-02-29'));
verify('bisiesto imposible rechazado',!DateCheck.validDate('2025-02-29'));
verify('presentación de fecha',DateCheck.displayDate('2026-11-07')==='07/11/2026');
verify('actividad rechaza fecha imposible',!Work.dateOK('2026-02-30'));
verify('actividad acepta fecha válida',Work.dateOK('2026-11-07'));
verify('catálogo normaliza acentos',Risk.normalize(' Caída DE Altura ')==='caida de altura');
verify('responsable con identidad',Asg.snapshot({user_id:u1,nombre:'Responsable',modulo:'APR'},'APR')?.user_id===u1);
verify('responsable ID inválido',Asg.snapshot({user_id:'123',nombre:'Responsable',modulo:'APR'},'APR')===null);
verify('acción con datos requeridos',Act.validAction(action));
verify('verificación con evidencia',Act.verified(action));
verify('rechazo de verificación sin evidencia',!Act.verified({...action,evidenceIds:[]}));
verify('todas las acciones requeridas verificadas',Act.allRequiredVerified(report));
verify('auditoría requiere independencia',Audit.verifiedTasks(report));
verify('cierre con comprobaciones válidas',Audit.canRequestClose(report,ctx));
verify('cierre denegado con autoverificación',!Audit.canRequestClose(['Peligro','','','','',[],{...report[6],actions:[{...action,verifiedBy:u1}]}],ctx));
verify('cierre denegado a usuario común',!Audit.canRequestClose(report,{...ctx,profile:{activo:true,rol:'usuario'}}));
verify('reapertura sin evento denegada',!Audit.canRequestReopen(report,ctx));
verify('corrección no cierra sin servidor',!Corr.mayRequestClose(report,ctx));
verify('supervisor puede solicitar reasignación',Reas.canManage(ctx));
verify('usuario común sin reasignación',!Reas.canManage({...ctx,profile:{activo:true,rol:'usuario'}}));
verify('acciones bloqueadas sin servidor',!Act.enabled());
verify('auditoría bloqueada sin servidor',!Audit.enabled());
verify('reasignación bloqueada sin servidor',!Reas.enabled());
verify('correcciones bloqueadas sin servidor',!Corr.enabled());
console.log('\nTOTAL:',n,'pruebas complementarias aprobadas.');
