'use strict';
// C05: pruebas locales sin Supabase, sin escritura de informes ni creación de usuarios.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const date=require('./commitment-v243.js');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const source=fs.readFileSync(path.join(__dirname,'commitment-v243.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'commitment-v243.css'),'utf8');
const config=fs.readFileSync(path.join(__dirname,'config-v242.js'),'utf8');
const historical=['Condición histórica','Alta','Corregir barrera','Nombre anterior','En proceso',[{name:'foto.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,AA'}],{category:'OTROS',risks:[{code:'R1',name:'Altura'}],assignees:[{user_id:'11111111-1111-4111-8111-111111111111',nombre:'Persona',modulo:'OTROS'}]}];

test('C05-01 reconoce fechas ISO reales, incluidos años bisiestos',()=>{
 assert.equal(date.validDate('2028-02-29'),true);
 assert.equal(date.validDate('2027-02-29'),false);
 assert.equal(date.validDate('2026-04-31'),false);
 assert.equal(date.validDate('2026-11-05'),true);
});
test('C05-02 rechaza fechas no ISO, fuera de rango y datos extraños',()=>{
 for(const v of ['05/11/2026','2026-2-5','2026-00-01','2026-13-01','2026-11-00','2026-11-32','1899-12-31','not-a-date',null,42]){
  assert.equal(date.validDate(v),false);
 }
});
test('C05-03 admite fecha vacía para informes históricos e informativos',()=>{
 assert.equal(date.normalizeDate(''),'');
 assert.equal(date.normalizeDate(null),'');
 assert.equal(date.normalizeDate('2026-11-05'),'2026-11-05');
});
test('C05-04 no acepta entrada malformada en guardado',()=>{
 assert.throws(()=>date.normalizeDate('2026-02-30'),/Fecha compromiso inválida/);
 assert.throws(()=>date.normalizeDate({date:'2026-11-05'}),/Fecha compromiso inválida/);
});
test('C05-05 presenta día, mes y año sin cambio de zona horaria',()=>{
 assert.equal(date.displayDate('2026-11-05'),'05/11/2026');
 assert.equal(date.displayDate('2027-02-29'),'');
 assert.equal(date.displayDate(''),'');
});
test('C05-06 obtiene la fecha del metadato 6, compatible con registros antiguos',()=>{
 assert.equal(date.dateFromRecord(historical),'');
 assert.equal(date.dateFromRecord([...historical.slice(0,6),{...historical[6],dueDate:'2026-12-07'}]),'2026-12-07');
 assert.equal(date.dateFromRecord(['histórico']),'');
});
test('C05-07 la fusión de metadatos conserva categoría, riesgos y responsables',()=>{
 const updated=date.mergeMetadata(historical[6],'2026-12-07');
 assert.equal(updated.dueDate,'2026-12-07');
 assert.equal(updated.category,'OTROS');
 assert.deepEqual(updated.risks,historical[6].risks);
 assert.deepEqual(updated.assignees,historical[6].assignees);
 assert.equal(historical[6].dueDate,undefined);
});
test('C05-08 se puede quitar la fecha sin borrar otros datos',()=>{
 const before={...historical[6],dueDate:'2026-12-07',notaPersonal:'legado'};
 const after=date.mergeMetadata(before,'');
 assert.equal(after.dueDate,'');
 assert.equal(after.notaPersonal,'legado');
 assert.deepEqual(after.assignees,before.assignees);
});
test('C05-09 el detalle no agrega una columna y oculta fechas vacías',()=>{
 const original=[...historical];
 assert.equal(date.detailRow(original,7),'');
 original[6]={...original[6],dueDate:'2026-12-07'};
 const cell=date.detailRow(original,7);
 assert.match(cell,/colspan="7"/);
 assert.match(cell,/datetime="2026-12-07"/);
 assert.match(cell,/07\/12\/2026/);
});
test('C05-10 el formulario usa entrada fecha accesible y se valida antes de guardar',()=>{
 const fakeDocument={
  createElement(tag){return {tag,children:[],append(...kids){this.children.push(...kids)}}}
 };
 const globalObject=global.window;
 try{
  global.window={document:fakeDocument};
  // El módulo usa window al importarse; el método ya exportado no debe alterar otra instancia.
  // Se valida con lectura estática y una entrada equivalente, sin introducir datos reales.
  assert.match(source,/input\.type='date'/);
  assert.match(source,/label\.htmlFor='recordCommitmentDate243'/);
  assert.match(source,/host\.append\(wrap\)/);
 }finally{global.window=globalObject;}
});
test('C05-11 lectura del campo detecta validez y campo inexistente',()=>{
 assert.equal(date.readDate({type:'date',value:'2026-12-07',validity:{valid:true}}),'2026-12-07');
 assert.throws(()=>date.readDate({type:'date',value:'2026-02-30',validity:{valid:true}}),/inválida/);
 assert.throws(()=>date.readDate(null),/no disponible/);
 assert.throws(()=>date.readDate({type:'date',value:'2026-12-07',validity:{valid:false}}),/inválida/);
});
test('C05-12 integración de fecha en modal, tabla y guardado con meta 6',()=>{
 assert.match(html,/window\.Hys243Commitment\.mount\(\$\("modalFields"\),current\)/);
 assert.match(html,/dueDate243=window\.Hys243Commitment\.readDate\(\$\("recordCommitmentDate243"\)\)/);
 assert.match(html,/assignees:assignments,dueDate:dueDate243/);
 assert.match(html,/return mainRow\+evidence\+linkedRisks\+linkedAssignees\+dueDateRow/);
 assert.match(css,/\.hys243-commitment-field/);
});
test('C05-13 PDF incorpora fecha opcional conservando los cinco campos',()=>{
 assert.match(html,/const findingSection=\{key:'findings',title:'Hallazgos',labels:\['Condición detectada','Prioridad','Medida propuesta','Responsable','Estado'\]/);
 assert.match(html,/label:'Fecha compromiso',value:due/);
 assert.match(html,/const due=window\.Hys243Commitment\?\.displayDate\(record\[6\]\?\.dueDate\)\|\|''/);
});
test('C05-14 no altera anchos ni acciones y mantiene configuración aislada',()=>{
 assert.match(html,/table:has\(> tbody#findings\)\{table-layout:fixed;width:100%\}/);
 assert.match(html,/data-edit=/);assert.match(html,/data-delete=/);
 assert.match(config,/window\.HYS242_ENABLE_CENTRAL=false;/);
 assert.match(config,/window\.HYS242_DEPLOYMENT_READY=false;/);
});
test('C05-15 scripts y estilos importados; módulo sin acceso remoto',()=>{
 assert.match(html,/<script src="commitment-v243\.js"><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="commitment-v243\.css">/);
 assert.doesNotMatch(source,/\bfetch\s*\(/);
 assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY/);
});
