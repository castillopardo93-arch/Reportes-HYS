/* QA v308 — etiquetas automáticas desde catálogo preintegrado.
   Usa datos sintéticos solo en el proceso de CI; no se publican como catálogo real.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const dir=path.resolve(__dirname,'../v333-review');
const read=file=>fs.readFileSync(path.join(dir,file),'utf8');
const codes=[...Array(73)].map((_,i)=>'1.'+(i+1))
 .concat([...Array(49)].map((_,i)=>'2.'+(i+1)))
 .concat([...Array(31)].map((_,i)=>'3.'+(i+1)));
const sample={
 archivo:'HSS-RGT-007-Flash_Final Report rev.8.xlsx',hoja:'Tabla',
 estado:'fixture-solo-qa',
 entradas:codes.map(code=>({codigo:code,descripcion:'Nombre sintético de prueba para código '+code}))
};
function init(data){
 const dom=new JSDOM(read('demo-v308.html'),{url:'https://hys.test/v333-review/demo-v308.html',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 w.HYS308_DEMO_PAGE=true;
 w.__REPORTES_HYS_ACCESS__={userId:'demo-autor',profile:{usuario_id:'demo-autor',nombre:'Elaborador simulado',rol:'usuario',activo:true},modules:[],selectedModule:null};
 w.Hys285Pillars={close:()=>true};
 w.confirm=()=>true;
 w.alert=()=>{};
 w.eval(read('investigacion-accidentes-v305.js'));
 if(data!==undefined)w.HYS308_CAUSAS_OFICIALES=data;
 else w.eval(read('causas-datos-v308.js'));
 w.eval(read('causas-catalogo-v308.js'));
 w.eval(read('investigacion-flujo-v308.js'));
 return {dom,w,d,api:w.Hys308CausaCatalogo};
}

function enterFinalForTest(fixture){
 const {d,w}=fixture;
 const workflow=w.Hys308Workflow;
 workflow.openNew('flash');
 const values={
  tipo_incidente:'Daño Material',probabilidad:'Baja',fecha_ocurrencia:'2026-11-10',hora:'09:10',
  area_proyecto:'VA4',ubicacion:'Sector de prueba',
  involucrado:'Persona ficticia',cargo:'Operador',
  primeros_auxilios:'No',ambulancia:'No',hospital:'No',existen_testigos:'No',
  hechos:'Descripción ficticia detallada y suficiente del evento de prueba.',
  causas_aparentes:'Causa aparente ficticia solo para QA.',
  acciones_inmediatas:'Medidas inmediatas ficticias para QA.',
  reportado_por:'Informante de prueba',preparado_por:'Elaborador de prueba'
 };
 for(const [name,value] of Object.entries(values)){
  const control=d.querySelector('#hys306FlashForm [name="'+name+'"]');
  assert.ok(control,name);
  control.value=value;
  control.dispatchEvent(new w.Event('input',{bubbles:true}));
 }
 d.getElementById('hys308ReviewerFlash').value='demo-supervisor';
 assert.equal(workflow.send('flash'),true);
 const expediente=workflow.state().cases[0];
 assert.ok(workflow.openCase(expediente.id,'final'));
}

const empty=init({archivo:'HSS-RGT-007-Flash_Final Report rev.8.xlsx',hoja:'Tabla',entradas:[]});
assert.equal(empty.api.ready,false);
assert.equal(empty.api.count(),0);
assert.equal(empty.d.getElementById('hys308CauseWorkbook'),null);
assert.ok(empty.d.querySelectorAll('#hys306FinalForm input[type="file"]').length>=4);
assert.ok(!read('demo-v308.html').includes('jszip.min.js'));
for(const select of empty.d.querySelectorAll('.hys306-cause-select')){
 assert.equal(select.disabled,true,'Selector de causas sin fuente debe estar bloqueado');
 assert.equal(select.options.length,1,'No publicar códigos sin descripción');
 assert.ok(!select.options[0].value);
}
console.log('OK: no se solicita al usuario cargar Excel; sin catálogo no hay códigos sin texto.');
enterFinalForTest(empty);
assert.ok([...empty.d.querySelectorAll('.hys306-cause-select')].every(x=>x.disabled),'La edición no debe habilitar catálogo sin nombres');
empty.dom.window.close();
const t=init(sample);
assert.equal(t.api.ready,true);
assert.equal(t.api.count(),153);
assert.equal(t.d.getElementById('hys308CauseWorkbook'),null);
assert.equal(t.d.querySelector('#hys308CauseStatus').dataset.complete,'true');
for(const s of t.d.querySelectorAll('.hys306-cause-select')){
 assert.equal(s.disabled,false);
 const opts=[...s.options].filter(x=>x.value);
 assert.ok(opts.length>=20);
 assert.ok(opts.every(x=>x.textContent.startsWith(x.value+' — Nombre sintético de prueba')));
}
const codeEntry=t.d.querySelector('#hys306ActionRows input[name="action_1_codigo"]');
assert.ok(codeEntry,'El punto 10 debe tener un campo de códigos');
assert.equal(codeEntry.type,'text');
assert.equal(t.d.querySelector('#hys306ActionRows select[name$="_codigo"]'),null,
 'El punto 10 no debe tener un desplegable de causas');
console.log('OK: catálogo limitado al punto 9; punto 10 con CÓDIGOS de escritura libre.');
enterFinalForTest(t);
assert.ok([...t.d.querySelectorAll('.hys306-cause-select')].every(x=>!x.disabled),'El catálogo oficial validado sigue disponible para edición');
const chooser=t.d.querySelector('.hys306-cause-select');
chooser.value='1.1';chooser.dispatchEvent(new t.w.Event('change',{bubbles:true}));
const textarea=t.d.querySelector('#hys306FinalForm [name="condiciones_subestandar"]');
assert.ok(textarea.value.includes('1.1 — Nombre sintético de prueba para código 1.1'));
t.d.getElementById('hys306AddAction').click();
const plans=t.d.querySelectorAll('#hys306ActionRows input[name$="_codigo"]');
assert.equal(plans.length,4);
assert.ok([...plans].every(x=>x.type==='text'));
plans[3].value='1.1; 2.49';plans[3].dispatchEvent(new t.w.Event('input',{bubbles:true}));
assert.equal(plans[3].value,'1.1; 2.49');
assert.ok(!t.d.querySelector('#hys306ActionRows select[name$="_codigo"]'));
console.log('OK: nombres solo en punto 9; punto 10 libre y nuevas filas libres.');
t.dom.window.close();
const partial=JSON.parse(JSON.stringify(sample));partial.entradas.pop();
const bad=init(partial);
assert.equal(bad.api.ready,false);
assert.ok([...bad.d.querySelectorAll('.hys306-cause-select')].every(x=>x.disabled));
bad.dom.window.close();
console.log('RESULTADO: catálogo integrado validado; se mantiene protección frente a catálogos parciales o incompletos.');
