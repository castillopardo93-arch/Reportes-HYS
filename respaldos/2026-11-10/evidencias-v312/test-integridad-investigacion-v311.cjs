/* Auditoría v311: fechas del calendario, Final incompleto y catálogo no alterado.
 * Solo datos ficticios en JSDOM; NO se llama a Supabase ni se escriben expedientes.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const dir=path.resolve(__dirname,'../v311-review');
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');
const dom=new JSDOM(read('demo-v308.html'),{
 url:'https://hys.test/v311-review/demo-v308.html',runScripts:'outside-only'
});
const w=dom.window,d=w.document;
w.HYS308_DEMO_PAGE=true;
w.__REPORTES_HYS_ACCESS__={userId:'demo-autor',profile:{
 usuario_id:'demo-autor',nombre:'Elaborador de prueba',rol:'usuario',activo:true
},modules:[],selectedModule:null};
w.Hys285Pillars={close:()=>true};
const alerts=[];
w.alert=x=>alerts.push(String(x));w.confirm=()=>true;
w.eval(read('investigacion-accidentes-v305.js'));
w.eval(read('causas-datos-v308.js'));
w.eval(read('causas-catalogo-v308.js'));
w.eval(read('investigacion-flujo-v308.js'));
const api=w.Hys308Workflow;
const add=(kind,fields)=>{
 const form=d.getElementById(kind==='flash'?'hys306FlashForm':'hys306FinalForm');
 for(const [key,value] of Object.entries(fields)){
  const item=form.querySelector('[name="'+key+'"]');
  assert.ok(item,'Campo '+key+' no encontrado');
  item.value=value;
  item.dispatchEvent(new w.Event('input',{bubbles:true}));
 }
};
const flash={
 tipo_incidente:'Daño Material',probabilidad:'Baja',fecha_ocurrencia:'2026-11-10',hora:'09:10',
 area_proyecto:'VA4',ubicacion:'Sector ficticio',involucrado:'Persona de prueba',cargo:'Operador',
 primeros_auxilios:'No',ambulancia:'No',hospital:'No',existen_testigos:'No',
 hechos:'Descripción simulada de un evento sin datos personales reales.',
 causas_aparentes:'Condición simulada de prueba en el sector.',
 acciones_inmediatas:'Detención ficticia de actividad durante prueba.',
 reportado_por:'Reportante simulado',preparado_por:'Elaborador simulado'
};
const flashInvalid={...flash,fecha_ocurrencia:'2026-02-30'};
assert.ok(api.formIssues('flash',flashInvalid).some(x=>x.key==='fecha_ocurrencia'),
 'No aceptar 30 de febrero en Flash');
assert.ok(api.formIssues('flash',{...flash,fecha_ocurrencia:'2025-02-29'}).some(x=>x.key==='fecha_ocurrencia'),
 'El 29 de febrero solo existe en años bisiestos');
assert.ok(!api.formIssues('flash',{...flash,fecha_ocurrencia:'2024-02-29'}).some(x=>x.key==='fecha_ocurrencia'),
 'Aceptar 29 de febrero de año bisiesto');
assert.ok(api.formIssues('final',{fecha_incidente:'2026-02-30'}).some(x=>x.key==='fecha_incidente'),
 'No aceptar 30 de febrero en Final');
assert.ok(api.formIssues('final',{}).some(x=>x.key==='descripcion'));
assert.ok(api.formIssues('final',{}).some(x=>x.key==='action_1_descripcion'));
assert.ok(api.formIssues('final',{}).some(x=>x.key==='condiciones_subestandar'));
api.openNew('flash');
add('flash',flash);
d.getElementById('hys308ReviewerFlash').value='demo-supervisor';
assert.equal(api.send('flash'),true);
const id=api.state().cases[0].id;
assert.equal(api.openCase(id,'final'),true);
assert.equal(api.send('final'),false,'Final en blanco no puede ir a revisión');
const finalForm=d.getElementById('hys306FinalForm');
assert.ok(finalForm.querySelector('.hys308-required-summary')?.textContent.includes('Final Report'));
assert.equal(finalForm.querySelector('[name="descripcion"]').getAttribute('aria-invalid'),'true');
const final={
 proyecto:'Proyecto de laboratorio',
 involucrados:'Persona de prueba',
 fecha_incidente:'2026-11-10',tipo_incidente:'Daño Material',
 lugar_incidente:'VA4',
 descripcion:'Descripción ficticia detallada del incidente para la revisión final.',
 equipo_investigador:'Equipo ficticio de investigadores y supervisión',
 factores_trabajo:'2.1 — DESGASTE DEL EQUIPO O HERRAMIENTA POR USO NORMAL',
 action_1_descripcion:'Implementar inspección y control documentado del equipo.'
};
add('final',final);
assert.equal(finalForm.querySelectorAll('.hys308-required-field').length,0,
 'Cada casilla roja debe desaparecer cuando se completan los mínimos');
assert.ok(!finalForm.querySelector('.hys308-required-summary'),'Resumen debe desaparecer');
assert.equal(api.formIssues('final',final).length,0);
// Regresión real: guardar y reabrir Final con más de tres planes.
d.getElementById('hys306AddAction').click();
d.getElementById('hys306AddAction').click();
add('final',{
 action_4_codigo:'1.1',
 action_4_descripcion:'Cuarta medida preventiva de seguimiento para la prueba.',
 action_5_codigo:'2.1',
 action_5_descripcion:'Quinta medida preventiva para la investigación ficticia.'
});
assert.equal(api.saveDraft('final'),true);
assert.equal(api.showTracking(true),true);
assert.equal(api.openCase(id,'final'),true);
assert.equal(finalForm.querySelectorAll('#hys306ActionRows .hys306-action-row').length,5);
assert.equal(finalForm.querySelector('[name="action_4_codigo"]').value,'1.1');
assert.equal(finalForm.querySelector('[name="action_5_codigo"]').value,'2.1');
assert.equal(finalForm.querySelector('[name="action_4_descripcion"]').value,
 'Cuarta medida preventiva de seguimiento para la prueba.');
assert.equal(finalForm.querySelector('[name="action_5_descripcion"]').value,
 'Quinta medida preventiva para la investigación ficticia.');
d.getElementById('hys306AddAction').click();
assert.ok(finalForm.querySelector('[name="action_6_codigo"]'),
 'El sexto plan debe recuperar el número 6 y no saltar al 8 o superior');

d.getElementById('hys308ReviewerFinal').value='demo-hys';
assert.equal(api.send('final'),true);
const saved=api.state().cases[0];
assert.equal(saved.final.status,'en_revision');
assert.equal(saved.final.sourceFlashRevision,saved.flash.revision);
assert.ok(saved.history.some(x=>x.kind==='final'&&x.event==='Enviado a revisión'));
assert.ok(read('causas-datos-v308.js').includes('ACUÑADURA DEFICIENTE'));
assert.equal(w.Hys308CausaCatalogo.count(),153);
assert.equal(finalForm.querySelector('#hys306ActionRows select[name$="_codigo"]'),null);
assert.ok(finalForm.querySelector('#hys306ActionRows input[name="action_1_codigo"]'));
dom.window.close();
console.log('OK v311: fechas reales, Final incompleto rojo y bloqueado, guardado parcial, revisión válida y 153 causas intactas.');
