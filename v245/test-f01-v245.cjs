'use strict';
/* Reportes HYS v245 — F01: bandeja local sin notificaciones enviadas. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const x=require('./inbox-v245.js');
const code=fs.readFileSync(path.join(__dirname,'inbox-v245.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const preview=fs.readFileSync(path.join(__dirname,'../v245-review/index.html'),'utf8');
const U='11111111-1111-4111-8111-111111111111', V='33333333-3333-4333-8333-333333333333', F='44444444-4444-4444-8444-444444444444';
const C='55555555-5555-4555-8555-555555555555', A='77777777-7777-4777-8777-777777777777';
const makeFinding=(module='APR')=>['Baranda de protección incompleta','Alta','Instalar baranda','Persona de prueba','Pendiente',[],
 {findingId:F,dueDate:'2026-11-04',assignees:[{user_id:module==='APR'?U:V,modulo:module}],
  actions:[{actionId:C,assigneeId:module==='APR'?U:V,assigneeName:'Persona de prueba',description:'Instalar protección en el sector',required:true,status:'pending'}]}];
const APR={module:'APR',data:{findings:[makeFinding()],activities:[['Persona de prueba A','VA4','Inspección de entorno','Sin novedades',[],
 {activityId:A,activityType:'assigned',identity:{user_id:U,nombre:'Persona de prueba A',modulo:'APR'},dueDate:'2026-11-06'}]],inspections:[]}};
const OTROS={module:'OTROS',data:{findings:[makeFinding('OTROS')],activities:[],inspections:[]}};
test('F01-01 se rechaza el informe de otro módulo',()=>{assert.equal(x.collect(APR,'OTROS').invalidModule,true);assert.equal(x.collect(APR,'OTROS').items.length,0);});
test('F01-02 APR incluye actividad y acción de hallazgo sin confundirlas',()=>{const q=x.collect(APR,'APR',{today:'2026-11-05'});assert.equal(q.items.length,2);assert.equal(new Set(q.items.map(v=>v.kind)).size,2);});
test('F01-03 OTROS no incorpora las actividades APR',()=>assert.deepEqual(x.collect(OTROS,'OTROS',{today:'2026-11-05'}).items.map(i=>i.kind),['finding']));
test('F01-04 vencidos primero, luego próximos',()=>{const q=x.collect(APR,'APR',{today:'2026-11-05'});assert.equal(q.items[0].dueStatus,'overdue');assert.equal(q.items[1].dueStatus,'upcoming');});
test('F01-05 filtro personal por UUID exacto',()=>{const items=x.collect(APR,'APR').items;assert.equal(x.mineOnly(items,U).length,2);assert.equal(x.mineOnly(items,V).length,0);assert.equal(x.mineOnly(items,'').length,0);});
test('F01-06 no se incluye una acción ajena al módulo',()=>{const copy=structuredClone(APR);copy.data.findings[0][6].assignees[0].modulo='OTROS';const q=x.collect(copy,'APR');assert.equal(q.items.filter(i=>i.kind==='finding').length,0);assert.ok(q.warnings.length);});
test('F01-07 no se cuentan acciones verificadas realmente',()=>{const copy=structuredClone(APR);const action=copy.data.findings[0][6].actions[0];action.status='verified';action.verifiedBy=U;action.verifiedAt='2026-11-04T12:00:00Z';action.evidenceIds=[A];assert.equal(x.collect(copy,'APR').items.length,1);});
test('F01-08 verificación sin evidencia no equivale a cierre',()=>{const copy=structuredClone(APR);copy.data.findings[0][6].actions[0].status='verified';const q=x.collect(copy,'APR');assert.equal(q.items[0].status,'unverified');});
test('F01-09 no se inventa tarea para actividad informativa',()=>{const copy=structuredClone(APR);copy.data.activities[0][5].activityType='informative';assert.equal(x.collect(copy,'APR').items.length,1);});
test('F01-10 las actividades sin identidad no aparecen como propias',()=>{const copy=structuredClone(APR);copy.data.activities[0][5].identity=null;const q=x.collect(copy,'APR');assert.equal(q.items.length,2);assert.equal(x.mineOnly(q.items,U).length,1);});
test('F01-11 fechas imposibles no se usan para plazos',()=>{const copy=structuredClone(APR);copy.data.activities[0][5].dueDate='2026-02-30';assert.equal(x.collect(copy,'APR').items.find(i=>i.kind==='activities').dueStatus,'undated');});
test('F01-12 duplicados de acción se ignoran y notifican como advertencia de datos',()=>{const copy=structuredClone(APR);copy.data.findings.push(structuredClone(copy.data.findings[0]));const q=x.collect(copy,'APR');assert.equal(q.items.length,2);assert.ok(q.warnings.length);});
test('F01-13 no hay APIs de envío, almacenamiento, confirmación o notificaciones falsas',()=>{assert.doesNotMatch(code,/\bfetch\s*\(/);assert.doesNotMatch(code,/localStorage|sessionStorage|supabase\.from|Notification\.requestPermission/);assert.match(code,/No son avisos entregados/);});
test('F01-14 solo vista ficticia permite filtrar equipo',()=>{assert.match(code,/HYS245_REVIEW_ONLY===true/);assert.throws(()=>x.setDemoDirectory([]),/demostración/);});
test('F01-15 se actualiza la bandeja al redibujar las tablas',()=>assert.match(html,/window\.Hys245Inbox\?\.refresh\?\.\(\)/));
test('F01-16 el acceso desde la campana navega al módulo correspondiente',()=>{assert.match(html,/Hys245Inbox\.mount/);assert.match(html,/showTab\?\.\('informe'\)/);});
test('F01-17 demo usa solo IDs y personas ficticias separadas APR/OTROS',()=>{assert.match(preview,/window\.HYS245_REVIEW_ONLY=true/);assert.match(preview,/Persona de prueba C/);assert.match(preview,/Persona de prueba A/);});
test('F01-18 F01 no altera las páginas PDF ni las tablas históricas',()=>{assert.match(html,/function pack\(\)/);assert.match(html,/HysReportPdf/);assert.match(html,/function render\(\)/);});
