'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
require('./inbox-v245.js');
const v=require('./pending-detail-v246.js');
const js=fs.readFileSync(path.join(__dirname,'pending-detail-v246.js'),'utf8');
const dev=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const demo=fs.readFileSync(path.join(__dirname,'../v246-review/index.html'),'utf8');
const build=fs.readFileSync(path.join(__dirname,'../v246-review/build-preview.sh'),'utf8');
const U='11111111-1111-4111-8111-111111111111',V='33333333-3333-4333-8333-333333333333';
const A='77777777-7777-4777-8777-777777777777',B='88888888-8888-4888-8888-888888888888';
const F='44444444-4444-4444-8444-444444444444';
const APR={module:'APR',project:'Proyecto Hidroeléctrico Alto Maipo',status:'En edición',
 data:{activities:[['Persona de prueba A','VA4','Inspección de andamios','Con observaciones',[],
  {activityId:A,activityType:'assigned',identity:{user_id:U,nombre:'Persona de prueba A',modulo:'APR'},dueDate:'2026-11-10'}]],
 inspections:[['VA4','Instalar baranda','Persona de prueba A','En proceso',[],
  {activityId:B,activityType:'assigned',identity:{user_id:U,nombre:'Persona de prueba A',modulo:'APR'},dueDate:'2026-11-12'}]],
 findings:[['Baranda incompleta','Alta','Instalar protección','Persona A','Pendiente',[],
  {findingId:F,dueDate:'2026-11-11',assignees:[{user_id:U,modulo:'APR',nombre:'Persona de prueba A'}],actions:[]}]]}};
const OTROS={module:'OTROS',project:'Proyecto Hidroeléctrico Alto Maipo',status:'En edición',
 data:{activities:[],inspections:[],findings:[['Baranda incompleta','Alta','Instalar protección','Persona C','Pendiente',[],
  {findingId:F,assignees:[{user_id:V,modulo:'OTROS',nombre:'Persona de prueba C'}],actions:[]}]]}};
const snapshot=()=>JSON.stringify(APR);
test('F01b-01 vista ficticia APR incluye las 3 tarjetas',()=>{
 const q=v.readScope(APR,'APR',U,true);
 assert.equal(q.items.length,3);
 assert.deepEqual(new Set(q.items.map(x=>x.kind)),new Set(['activities','inspections','finding']));
});
test('F01b-02 filtro real solo incluye pendientes del actor',()=>assert.equal(v.readScope(APR,'APR',U,false).items.length,3));
test('F01b-03 otro usuario no obtiene tareas ajenas',()=>assert.equal(v.readScope(APR,'APR',V,false).items.length,0));
test('F01b-04 una cuenta no válida no obtiene tareas ajenas',()=>assert.equal(v.readScope(APR,'APR','',false).items.length,0));
test('F01b-05 no accede a un informe de OTROS desde APR',()=>{const q=v.readScope(OTROS,'APR',U,true);assert.equal(q.items.length,0);assert.equal(q.report,null);});
test('F01b-06 no accede a un informe APR desde OTROS',()=>{const q=v.readScope(APR,'OTROS',V,true);assert.equal(q.items.length,0);assert.equal(q.report,null);});
test('F01b-07 OTROS incluye solamente su hallazgo',()=>{const q=v.readScope(OTROS,'OTROS',V,true);assert.equal(q.items.length,1);assert.equal(q.items[0].kind,'finding');});
test('F01b-08 la consulta no altera el informe original',()=>{const before=snapshot();v.readScope(APR,'APR',U,true);assert.equal(snapshot(),before);});
test('F01b-09 búsqueda de tarea verifica clave exacta',()=>{const q=v.readScope(APR,'APR',U,true);assert.equal(v.findSelected(q.items,q.items[0].key)?.key,q.items[0].key);assert.equal(v.findSelected(q.items,'otra:clave'),null);});
test('F01b-10 las fichas no crean verificaciones ni eventos',()=>{assert.doesNotMatch(js,/\bfetch\s*\(|supabase\.from|Notification\.requestPermission|navigator\.serviceWorker/);assert.doesNotMatch(js,/localStorage\.setItem|sessionStorage\.setItem|\.onSave\s*\(/);});
test('F01b-11 menú permite entrar a Mis pendientes',()=>assert.match(dev,/data-tab="pendientes"/));
test('F01b-12 menú de OTROS usa el mismo formulario embebido con nueva sección',()=>assert.match(demo,/data-tab="pendientes"/));
test('F01b-13 navegación de campana no redirige al formulario',()=>{assert.match(demo,/Hys246PendingDetail\?\.open\?\.\(item\)/);assert.doesNotMatch(demo,/onNavigate\(item\)\{\s*window\.Hys242Bridge\?\.showTab\?\.\('informe'\)/);});
test('F01b-14 navegación permite conservar la pestaña de pendientes',()=>assert.match(demo,/\["inicio","config","informe","historial","pendientes"\]\.includes\(candidate\)/));
test('F01b-15 al cambiar de pestaña se oculta la sección',()=>assert.match(dev,/pendingPanel246\.style\.display=isPending\?"block":"none"/));
test('F01b-16 la vista se actualiza al guardar el registro',()=>assert.match(dev,/window\.Hys246PendingDetail\?\.refresh\?\.\(\)/));
test('F01b-17 muestra sólo lectura sin ejecución ni cierre',()=>{assert.match(js,/Esta ficha no modifica el Informe Diario original/);assert.match(js,/auditoría en un servidor autorizado/);});
test('F01b-18 muestra vínculo al proyecto único aprobado',()=>{assert.match(demo,/Proyecto Hidroeléctrico Alto Maipo/);assert.doesNotMatch(demo,/PHAM 1|PHAM 2/);});
test('F01b-19 mantiene función PDF original',()=>assert.match(dev,/HysReportPdf/));
test('F01b-20 build copia el nuevo módulo y CSS al sitio aislado',()=>{assert.match(build,/pending-detail-v246\.js/);assert.match(build,/pending-detail-v246\.css/);assert.match(build,/v246-review/);});
test('F01b-21 la demostración no conecta Supabase',()=>{assert.match(demo,/Sin conexiones reales/);assert.match(build,/sin Supabase/i);});
test('F01b-22 al consultar informe incorrecto no se devuelven registros',()=>{assert.equal(v.readScope(null,'APR',U,true).items.length,0);assert.equal(v.readScope(APR,'ABCD',U,true).items.length,0);});
