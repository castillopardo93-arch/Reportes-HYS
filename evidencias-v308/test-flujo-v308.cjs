/* QA v308 — formularios, campos obligatorios, revisión y Final anticipado condicionado. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const app=path.resolve(__dirname,'../v308-review');
const read=n=>fs.readFileSync(path.join(app,n),'utf8');
const base=read('investigacion-accidentes-v305.js'),flow=read('investigacion-flujo-v308.js');
const html=read('demo-v308.html'),productionPage=read('index.html');
let checked=0;
function ok(label,fn){fn();console.log('OK '+(++checked)+' '+label)}
function fixture({demo=true,active=true,role='usuario'}={}){
 const dom=new JSDOM(html,{url:'https://hys.test/v308-review/demo-v308.html?demo=1',runScripts:'outside-only'});
 const w=dom.window,d=w.document,alerts=[];
 w.HYS308_DEMO_PAGE=demo;
 w.__REPORTES_HYS_ACCESS__={userId:'demo-autor',profile:{usuario_id:'demo-autor',nombre:'Elaborador',rol,activo:active},modules:[],permissions:[],selectedModule:null};
 w.Hys285Pillars={close:()=>true};
 w.alert=s=>alerts.push(String(s));w.confirm=()=>true;
 w.eval(base);w.eval(flow);
 const api=w.Hys308Workflow;
 const choose=id=>{const x=d.getElementById('hys308DemoActor');x.value=id;x.dispatchEvent(new w.Event('change',{bubbles:true}))};
 return {dom,w,d,api,alerts,choose,get:id=>d.getElementById(id),click:id=>d.getElementById(id).click(),close:()=>dom.window.close()};
}
function setField(t,kind,key,value){
 const form=t.get('hys306'+(kind==='flash'?'Flash':'Final')+'Form');
 const e=form.querySelector('[name="'+key+'"]');
 assert.ok(e,'Campo '+key+' no encontrado');e.value=value;
 e.dispatchEvent(new t.w.Event('input',{bubbles:true}));
}
function completeFlash(t,overrides={}){
 const sample={
  tipo_incidente:'Daño Material',probabilidad:'Baja',
  fecha_ocurrencia:'2026-11-10',hora:'09:10',
  area_proyecto:'VA4',ubicacion:'Sector de prueba',
  involucrado:'Persona ficticia',cargo:'Operador',
  primeros_auxilios:'No',ambulancia:'No',hospital:'No',
  existen_testigos:'No',
  hechos:'Descripción ficticia del hecho ocurrido durante la prueba.',
  causas_aparentes:'Condición aparente ficticia en sector de prueba.',
  acciones_inmediatas:'Detención preventiva de actividad en prueba.',
  reportado_por:'Reportante simulado',preparado_por:'Elaborador simulado',
  ...overrides
 };
 for(const [key,value] of Object.entries(sample))setField(t,'flash',key,value);
}
const f=fixture();
ok('Usuario activo sin facultades APR/OTROS puede abrir investigaciones',()=>{
 assert.equal(f.w.Hys305Investigation.open(),true);
 assert.ok(!f.get('hys308Launcher').hidden);
 assert.ok(f.get('hys306OpenFlash')&&f.get('hys306OpenFinal')&&f.get('hys308OpenTracking'));
});
ok('Guardar borrador incompleto está permitido',()=>{
 f.click('hys306OpenFlash');
 setField(f,'flash','tipo_incidente','Daño Material');
 setField(f,'flash','ubicacion','Sector de prueba');
 f.click('hys308SaveFlash');
 const s=f.api.state();
 assert.equal(s.cases.length,1);assert.equal(s.cases[0].flash.status,'borrador');
 assert.equal(s.cases[0].flash.data.tipo_incidente,'Daño Material');
 assert.equal(s.cases[0].creatorId,'demo-autor');
});
const first=f.api.state().cases[0].id;
ok('Nuevo Flash permite otro borrador sin sobrescribir anterior',()=>{
 f.click('hys308New');
 setField(f,'flash','tipo_incidente','Cuasi Accidente');
 f.click('hys308SaveFlash');
 const s=f.api.state();
 assert.equal(s.cases.length,2);
 assert.notEqual(s.cases[0].id,s.cases[1].id);
 assert.equal(s.cases[0].flash.data.tipo_incidente,'Daño Material');
});
ok('Un borrador incompleto no puede enviarse ni abre Final Report',()=>{
 const second=f.api.state().cases[1].id;
 f.get('hys308ReviewerFlash').value='demo-supervisor';
 assert.equal(f.api.send('flash'),false);
 assert.equal(f.api.state().cases[1].flash.status,'borrador');
 assert.equal(f.api.state().cases[1].flash.submittedAt,null);
 assert.equal(f.api.state().cases[1].history.some(x=>x.event==='Enviado a revisión'),false);
 assert.ok(f.get('hys306FlashForm').querySelector('.hys308-required-summary'));
 assert.ok(f.get('hys306FlashForm').querySelector('[name="fecha_ocurrencia"][aria-invalid="true"]'));
 f.api.showTracking(true);
 assert.equal(f.api.openCase(second,'final'),false);
 assert.equal(f.api.saveDraft('final'),false);
 assert.equal(f.api.send('final'),false);
 assert.ok(f.alerts.some(x=>x.includes('Flash Report se habilita')||x.includes('Final Report se habilita')));
 const finalButtons=[...f.get('hys308List').querySelectorAll('button')].filter(x=>x.textContent==='Abrir Final');
 assert.ok(finalButtons.every(x=>x.disabled));
});
ok('Completar solo algunos datos aún bloquea envío',()=>{
 f.api.openCase(first,'flash');
 completeFlash(f,{hechos:'Muy breve',acciones_inmediatas:'Corta'});
 const issues=f.api.formIssues('flash',(function(){
  const data={};
  f.get('hys306FlashForm').querySelectorAll('[name]').forEach(x=>data[x.name]=x.value);
  return data;
 })());
 assert.ok(issues.some(x=>x.key==='hechos'));
 assert.ok(issues.some(x=>x.key==='acciones_inmediatas'));
 f.get('hys308ReviewerFlash').value='demo-supervisor';
 assert.equal(f.api.send('flash'),false);
 assert.equal(f.api.state().cases[0].flash.status,'borrador');
});
ok('Flash completo puede enviarse a revisor; abre Final sin esperar aprobación',()=>{
 completeFlash(f);
 f.get('hys308ReviewerFlash').value='demo-supervisor';
 assert.equal(f.api.send('flash'),true);
 const s=f.api.state().cases[0];
 assert.equal(s.flash.status,'en_revision');
 assert.ok(s.flash.submittedAt);
 assert.equal(s.flash.reviewerId,'demo-supervisor');
 assert.ok(s.history.some(x=>x.event==='Enviado a revisión'));
 assert.ok(f.api.openCase(first,'final'));
 const form=f.get('hys306FinalForm');
 assert.equal(form.querySelector('[name="tipo_incidente"]').value,'Daño Material');
 setField(f,'final','descripcion','Investigación ficticia para probar flujo Final');
 f.click('hys308SaveFinal');
 const updated=f.api.state().cases[0];
 assert.equal(updated.final.status,'borrador');
 assert.equal(updated.final.data.tipo_incidente,'Daño Material');
 assert.equal(updated.id,first);
});
ok('Final en revisión no puede aprobarse hasta que Flash sea aprobado',()=>{
 f.get('hys308ReviewerFinal').value='demo-hys';
 f.click('hys308SendFinal');
 f.choose('demo-hys');
 assert.equal(f.api.decide(first,'final','approve','Evaluado'),false);
 assert.equal(f.api.state().cases[0].final.status,'en_revision');
 assert.ok(f.alerts.some(x=>x.includes('Flash Report aprobado')));
});
ok('Revisor devuelve el Flash y solicita correcciones',()=>{
 f.choose('demo-supervisor');
 assert.equal(f.api.decide(first,'flash','return','Falta aclarar el lugar exacto del incidente.'),true);
 const doc=f.api.state().cases[0];
 assert.equal(doc.flash.status,'correccion');
 assert.equal(doc.flash.reviewerId,'demo-autor');
 assert.ok(doc.history.some(x=>x.event==='Devuelto para corrección'));
 assert.equal(f.api.openCase(first,'final'),true,'Final sigue accesible porque Flash ya se envió válidamente');
});
ok('Corrección de Flash también se valida antes de reenviar',()=>{
 f.choose('demo-autor');f.api.openCase(first,'flash');
 setField(f,'flash','hechos','Corta');
 f.get('hys308ReviewerFlash').value='demo-supervisor';
 assert.equal(f.api.send('flash'),false);
 assert.equal(f.api.state().cases[0].flash.status,'correccion');
 assert.equal(f.api.state().cases[0].flash.reviewerId,'demo-autor');
 setField(f,'flash','hechos','Relato ampliado y verificado para esta prueba de escritorio.');
 setField(f,'flash','ubicacion','Sector de prueba aclarado');
 assert.equal(f.api.send('flash'),true);
 const s=f.api.state().cases[0];
 assert.equal(s.flash.status,'en_revision');
 assert.ok(s.flash.revision>=3);
 assert.ok(s.history.some(x=>(x.changes||[]).some(y=>y.name==='ubicacion')));
});
ok('Supervisor y revisor HYS aprueban Flash secuencialmente',()=>{
 f.choose('demo-supervisor');
 assert.equal(f.api.decide(first,'flash','approve','Conforme, continúa HYS','demo-hys'),true);
 let s=f.api.state().cases[0];
 assert.equal(s.flash.status,'en_revision');assert.equal(s.flash.reviewerId,'demo-hys');
 f.choose('demo-hys');
 assert.equal(f.api.decide(first,'flash','approve','Aprobado por HYS'),true);
 s=f.api.state().cases[0];
 assert.equal(s.flash.status,'aprobado');
 assert.ok(s.history.some(x=>x.event==='Revisión conforme y reasignación'));
});
ok('Final puede aprobarse luego de Flash aprobado; historial se conserva',()=>{
 assert.equal(f.api.decide(first,'final','approve','Final conforme'),true);
 const s=f.api.state().cases[0];
 assert.equal(s.final.status,'aprobado');
 assert.ok(s.history.some(x=>x.kind==='flash'&&x.event==='Aprobación del informe'));
 assert.ok(s.history.some(x=>x.kind==='final'&&x.event==='Aprobación del informe'));
});
ok('Se conservaron las etiquetas originales de v307',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../v307-review/investigacion-accidentes-v305.js'),'utf8');
 const labels=s=>[...s.matchAll(/\b(?:f|text|pick|areaField)\('([^']+)','[^']+'/g)].map(x=>x[1]);
 assert.equal(labels(base).length,82);
 assert.deepEqual(labels(base),labels(source));
});
ok('No se alteran módulos APR/OTROS ni escribe el laboratorio en Supabase',()=>{
 assert.ok(productionPage.includes('if(embeddedOtros && !modules.includes("OTROS"))'));
 assert.ok(productionPage.includes('investigacion-flujo-v308.js'));
 assert.ok(!flow.includes('localStorage.')&&!flow.includes('indexedDB.'));
 assert.ok(!flow.includes('.from(')&&!flow.includes('.rpc('));
});
f.close();
const u=fixture({demo:false,role:'usuario'});
ok('Usuario registrado no puede enviar de verdad sin backend autorizado',()=>{
 assert.equal(u.w.Hys305Investigation.open(),true);
 u.click('hys306OpenFlash');u.click('hys308SaveFlash');
 assert.ok(u.api.state().cases.length===1);
 assert.equal(u.get('hys308SendFlash').disabled,true);
 assert.equal(u.api.serverStorageEnabled,false);
});
u.close();
const inactive=fixture({demo:false,active:false});
ok('Usuario inactivo no puede iniciar expedientes',()=>{
 assert.equal(inactive.w.Hys305Investigation.open(),false);
 assert.equal(inactive.get('hys308Launcher').hidden,true);
});
inactive.close();
console.log('RESULTADO: '+checked+' verificaciones v308 con validación obligatoria, sin producción.');
