/* Reportes HYS v312 — pruebas de integridad y regresiones del laboratorio. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const home=path.resolve(__dirname,'../v334-review');
const read=name=>fs.readFileSync(path.join(home,name),'utf8');
const dom=new JSDOM(read('demo-v308.html'),{
 url:'https://hys.test/v334-review/demo-v308.html',runScripts:'outside-only'
});
const w=dom.window,d=w.document,alerts=[];
w.HYS308_DEMO_PAGE=false;
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
set('flash','hechos','Texto privado ficticio del usuario anterior');
api.saveDraft('flash');
api.showTracking(true);
assert.ok(get('hys308List').textContent.includes('Elaborador de prueba'));
w.dispatchEvent(new w.Event('reportes-hys-access-changing'));
assert.equal(api.state().cases.length,0);
assert.equal(frm('flash').elements.namedItem('hechos').value,'');
assert.equal(get('hys308List').textContent,'');
assert.equal(get('hys308ReviewerSearchFlash').value,'');
dom.window.close();
console.log('OK v313: cambio de sesión limpia formularios, listado, búsqueda y expedientes');
