/* QA de facultades adicionales de cierre — v308. Ficticio, sin base de datos. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const base=path.resolve(__dirname,'../v309-review');
const read=n=>fs.readFileSync(path.join(base,n),'utf8');
const users=[
 {usuario_id:'demo-autor',nombre:'Elaborador de prueba',rol:'usuario',activo:true},
 {usuario_id:'demo-supervisor',nombre:'Supervisor de prueba',rol:'supervisor',activo:true},
 {usuario_id:'demo-hys',nombre:'Revisor HYS de prueba',rol:'supervisor',activo:true},
 {usuario_id:'demo-admin',nombre:'Administrador de prueba',rol:'administrador_area',activo:true},
 {usuario_id:'retirado',nombre:'Usuario desactivado',rol:'usuario',activo:false}
];
const dom=new JSDOM(read('demo-v308.html'),{url:'https://hys.example/v309-review/demo-v308.html',runScripts:'outside-only'});
const w=dom.window,d=w.document;
w.HYS308_DEMO_PAGE=true;
w.__REPORTES_HYS_ACCESS__={userId:'demo-admin',profile:{usuario_id:'demo-admin',nombre:'Administrador de prueba',rol:'administrador_global',activo:true},modules:[],selectedModule:null};
w.Hys285Pillars={close:()=>true};
w.alert=()=>{};w.confirm=()=>true;
w.eval(read('investigacion-accidentes-v305.js'));
w.eval(read('investigacion-flujo-v308.js'));
w.eval(read('facultades-cierre-v308.js'));
const host=d.createElement('section');d.body.append(host);
const api=w.Hys308ClosingFaculties;
api.mount(host,{users,authorized:true,lab:true});
assert.ok(d.getElementById('hys308CloseFaculties'));
assert.equal(d.querySelectorAll('.hys308-fac-person').length,4,'Excluye cuenta inactiva');
assert.equal(api.canClose('demo-supervisor','flash'),false,'No da permisos por rol');
const query=d.getElementById('hys308CloseSearch');
query.value='hys';query.dispatchEvent(new w.Event('input',{bubbles:true}));
assert.equal(d.querySelectorAll('.hys308-fac-person').length,1,'Filtro por nombre');
query.value='';query.dispatchEvent(new w.Event('input',{bubbles:true}));
function toggle(id,type,checked=true){
 const input=d.querySelector('[data-hys308-close="'+type+'"][data-user-id="'+id+'"]');
 assert.ok(input,'Falta casilla '+id+'/'+type);input.checked=checked;
 input.dispatchEvent(new w.Event('change',{bubbles:true}));
}
toggle('demo-supervisor','flash');
toggle('demo-hys','flash');
toggle('demo-admin','final');
assert.equal([...api.getProposal().facultades.flash].sort().join('|'),'demo-hys|demo-supervisor');
assert.equal([...api.getProposal().facultades.final].join('|'),'demo-admin');
assert.equal(api.canClose('demo-supervisor','flash'),true);
assert.equal(api.canClose('demo-admin','flash'),false);
assert.equal(api.canClose('demo-admin','final'),true);
const principal=d.getElementById('hys308PrimaryFlash');
principal.value='demo-hys';principal.dispatchEvent(new w.Event('change',{bubbles:true}));
assert.equal(api.getProposal().responsables.flash,'demo-hys');
toggle('demo-hys','flash',false);
assert.equal(api.getProposal().responsables.flash,'','Quitar facultad limpia principal asignado');
assert.equal(api.canClose('demo-hys','flash'),false);
d.getElementById('hys308ReviewCloseProposals').click();
assert.ok(d.getElementById('hys308CloseReport').textContent.includes('NO guardada'));
assert.equal(api.getProposal().sinGuardar,true);
assert.equal(api.getProposal().cambios.length>=5,true);
assert.ok(read('gestion-usuarios-v265.js').includes('Hys308ClosingFaculties?.mount'));
assert.ok(read('index.html').includes('facultades-cierre-v308.js'));
assert.ok(read('index.html').includes('facultades-cierre-v308.css'));
assert.equal(read('facultades-cierre-v308.js').includes('supabase.from('),false);
assert.equal(read('facultades-cierre-v308.js').includes('localStorage.'),false);
console.log('OK: múltiples autorizados por tipo, principal sugerido y aislamiento APR/OTROS sin persistencia.');
// Prueba de integración con el circuito de aprobación de Flash.
api.reset();
const workflow=w.Hys308Workflow;
workflow.openNew('flash');
const values={
 tipo_incidente:'Daño Material',probabilidad:'Baja',
 fecha_ocurrencia:'2026-11-10',hora:'09:10',area_proyecto:'VA4',
 ubicacion:'Zona de prueba',involucrado:'Involucrado ficticio',cargo:'Supervisor',
 primeros_auxilios:'No',ambulancia:'No',hospital:'No',existen_testigos:'No',
 hechos:'Descripción simulada completa para probar el circuito de revisión.',
 causas_aparentes:'Causa aparente ficticia del accidente',
 acciones_inmediatas:'Acción inmediata simulada de prueba',
 reportado_por:'Persona de prueba',preparado_por:'Elaborador ficticio'
};
for(const [name,value] of Object.entries(values)){
 const control=d.querySelector('#hys306FlashForm [name="'+name+'"]');
 assert.ok(control,name);control.value=value;
 control.dispatchEvent(new w.Event('input',{bubbles:true}));
}
d.getElementById('hys308ReviewerFlash').value='demo-supervisor';
assert.equal(workflow.send('flash'),true);
const c=workflow.state().cases[0];
const actor=d.getElementById('hys308DemoActor');
actor.value='demo-supervisor';actor.dispatchEvent(new w.Event('change',{bubbles:true}));
assert.equal(workflow.decide(c.id,'flash','approve','Revisión conforme sin autorización'),false);
api.mount(host,{users,authorized:true,lab:true});
toggle('demo-supervisor','flash');
assert.equal(workflow.decide(c.id,'flash','approve','Conforme, apruebo con facultad Flash'),true);
assert.equal(workflow.state().cases[0].flash.status,'aprobado');
assert.equal(workflow.state().cases[0].history.at(-1).by,'Supervisor de prueba');
console.log('OK: quien recibe revisión no cierra salvo facultad explícita asignada en el laboratorio.');
d.getElementById('hys308DiscardCloseProposals').click();
assert.equal(api.canClose('demo-supervisor','flash'),false);
w.dispatchEvent(new w.CustomEvent('reportes-hys-access-changing'));
assert.equal(api.getProposal().facultades.flash.length,0);
dom.window.close();
console.log('RESULTADO: facultades Flash y Final revisadas en laboratorio sin modificar cuentas reales.');
