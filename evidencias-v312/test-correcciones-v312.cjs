/* Reportes HYS v312 — pruebas de integridad y regresiones del laboratorio. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const home=path.resolve(__dirname,'../v312-review');
const read=name=>fs.readFileSync(path.join(home,name),'utf8');
const dom=new JSDOM(read('demo-v308.html'),{
 url:'https://hys.test/v312-review/demo-v308.html',runScripts:'outside-only'
});
const w=dom.window,d=w.document,alerts=[];
w.HYS308_DEMO_PAGE=true;
w.__REPORTES_HYS_ACCESS__={userId:'demo-autor',profile:{
 usuario_id:'demo-autor',nombre:'Elaborador de prueba',rol:'usuario',activo:true
},modules:[],selectedModule:null};
w.Hys285Pillars={close:()=>true};
w.alert=s=>alerts.push(String(s));w.confirm=()=>true;
for(const name of ['investigacion-accidentes-v305.js','causas-datos-v308.js',
 'causas-catalogo-v308.js','investigacion-flujo-v308.js','revisores-busqueda-v308.js'])
 w.eval(read(name));
const api=w.Hys308Workflow;
const get=id=>d.getElementById(id);
const frm=kind=>get(kind==='flash'?'hys306FlashForm':'hys306FinalForm');
const set=(kind,name,value)=>{
 const field=[...frm(kind).querySelectorAll('[name]')].find(x=>x.name===name);
 assert.ok(field,'Campo no encontrado: '+name);
 field.value=value;field.dispatchEvent(new w.Event('input',{bubbles:true}));
};
const actor=id=>{const sel=get('hys308DemoActor');sel.value=id;sel.dispatchEvent(new w.Event('change',{bubbles:true}))};
const flash={
 tipo_incidente:'Daño Material',probabilidad:'Baja',fecha_ocurrencia:'2026-11-10',
 hora:'09:10',area_proyecto:'VA4',ubicacion:'Zona ficticia para prueba',
 involucrado:'Persona de prueba',cargo:'Operador',primeros_auxilios:'No',
 ambulancia:'No',hospital:'No',existen_testigos:'No',
 hechos:'Descripción ficticia suficientemente detallada para la revisión.',
 causas_aparentes:'Causa aparente de laboratorio sin personas reales.',
 acciones_inmediatas:'Detención preventiva simulada y revisión del área.',
 reportado_por:'Reportante ficticio',preparado_por:'Elaborador ficticio'
};
const fin={
 involucrados:'Persona de prueba',fecha_incidente:'2026-11-10',
 tipo_incidente:'Daño Material',lugar_incidente:'VA4',
 descripcion:'Descripción ficticia del evento para revisar y cerrar en laboratorio.',
 equipo_investigador:'Equipo de investigación ficticio',
 condiciones_subestandar:'1.1 — ACUÑADURA DEFICIENTE',
 action_1_descripcion:'Registrar inspección y corrección preventiva de las condiciones.'
};
function fill(kind,data){for(const [k,v] of Object.entries(data))set(kind,k,v)}
api.openNew('flash');
// La prueba de archivos demuestra que NO se simula guardado de adjuntos.
const input=frm('flash').querySelector('input[type="file"]');
Object.defineProperty(input,'files',{configurable:true,value:[{name:'foto-prueba.png'}]});
assert.equal(api.saveDraft('flash'),false,'No aparentar que guardó archivos temporales');
assert.equal(api.state().cases.length,0,'No crear un caso incompleto que pierda evidencia');
assert.ok(alerts.some(s=>s.includes('NO se guardan')));
Object.defineProperty(input,'files',{configurable:true,value:[]});
fill('flash',flash);
// El buscador funciona cuando el formulario es editable.
const search=get('hys308ReviewerSearchFlash');
assert.equal(search.disabled,false);
search.value='Supervisor';
search.dispatchEvent(new w.Event('input',{bubbles:true}));
const choice=get('hys308ReviewerListFlash').querySelector('button');
assert.ok(choice,'Buscador sin coincidencias ficticias');
choice.click();
assert.equal(get('hys308ReviewerFlash').value,'demo-supervisor');
assert.equal(api.send('flash'),true);
const id=api.state().cases[0].id;
assert.equal(api.openCase(id,'flash'),true);
assert.equal(get('hys308ReviewerFlash').disabled,true);
assert.equal(search.disabled,true,'No permitir buscar revisores en informe bloqueado');
assert.equal(search.getAttribute('aria-disabled'),'true');
// Un expediente nuevo no hereda el revisor del anterior.
assert.equal(api.openNew('flash'),true);
assert.equal(search.disabled,false);
assert.equal(search.value,'');
assert.equal(get('hys308ReviewerFlash').value,'');
assert.equal(api.openCase(id,'final'),true);
const actionRows=get('hys306ActionRows'),add=get('hys306AddAction');
while(actionRows.children.length<40)add.click();
assert.equal(actionRows.children.length,40);
assert.equal(add.disabled,true,'Deshabilitar botón al alcanzar 40');
assert.equal(api.saveDraft('final'),true);
assert.equal(api.showTracking(true),true);
assert.equal(api.openCase(id,'final'),true);
assert.equal(actionRows.children.length,40,'Restaurar las 40 filas');
assert.equal(add.disabled,true,'No reactivar Agregar después de restaurar 40');
assert.equal(api.send('final'),false,'No enviar Final vacío');
assert.ok(frm('final').querySelector('.hys308-required-summary'));
get('hys306FinalForm').querySelector('[data-clear-form]').click();
assert.equal(actionRows.children.length,3);
assert.equal(add.disabled,false);
assert.equal(frm('final').querySelector('.hys308-required-summary'),null,
 'Limpiar también los errores anteriores');
fill('final',fin);
get('hys308ReviewerFinal').value='demo-hys';
assert.equal(api.send('final'),true);
// Flash se devuelve y corrige mientras Final conserva versión anterior.
actor('demo-supervisor');
assert.equal(api.decide(id,'flash','return','Necesita una descripción más completa de los hechos.'),true);
actor('demo-autor');
assert.equal(api.openCase(id,'flash'),true);
set('flash','hechos','Descripción ficticia corregida y ampliada tras observaciones de supervisión.');
get('hys308ReviewerFlash').value='demo-supervisor';
assert.equal(api.send('flash'),true);
actor('demo-supervisor');
assert.equal(api.decide(id,'flash','approve','Conforme, derivar a HYS','demo-hys'),true);
actor('demo-hys');
assert.equal(api.decide(id,'flash','approve','Aprobado por HYS'),true);
assert.equal(api.decide(id,'final','return','Corregir Final con la nueva revisión del Flash.'),true);
actor('demo-autor');
assert.equal(api.openCase(id,'final'),true);
assert.ok(get('hys308WorkspaceTools').textContent.includes('Flash actualizado'));
get('hys308ReviewerFinal').value='demo-admin';
assert.equal(api.send('final'),false,'Bloquear reenvío sin reconciliar revisión Flash');
assert.ok(alerts.some(s=>s.includes('Flash Report fue corregido')));
set('final','descripcion','Descripción actualizada con el Flash ya corregido y aprobado en la revisión final.');
assert.equal(api.send('final'),true);
assert.equal(api.state().cases[0].final.sourceFlashRevision,api.state().cases[0].flash.revision);
actor('demo-admin');
assert.equal(api.decide(id,'final','approve','Conformidad de cierre de prueba'),true);
assert.equal(api.state().cases[0].final.status,'aprobado');
assert.equal(w.Hys308CausaCatalogo.count(),153);
assert.ok(frm('final').querySelector('#hys306ActionRows input[name="action_1_codigo"]'));
assert.equal(frm('final').querySelector('#hys306ActionRows select[name$="_codigo"]'),null);
dom.window.close();
console.log('OK v312: adjuntos, 40 planes y restauración, revisor bloqueado, cambio de caso, Final actualizado y cierre controlado.');