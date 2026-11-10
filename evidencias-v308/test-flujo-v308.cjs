/* Reportes HYS v308 — QA de flujo, sin datos reales ni Supabase. */
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
 w.__REPORTES_HYS_ACCESS__={userId:'demo-autor',profile:{usuario_id:'demo-autor',nombre:'Elaborador',rol:role,activo:active},modules:[],permissions:[],selectedModule:null};
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
const f=fixture();
ok('Acceso para usuario activo sin permisos APR/OTROS',()=>{
 assert.equal(f.w.Hys305Investigation.open(),true);
 assert.ok(!f.get('hys308Launcher').hidden);
 assert.ok(f.get('hys306OpenFlash')&&f.get('hys306OpenFinal')&&f.get('hys308OpenTracking'));
});
ok('Flash: crea primer borrador conservando campos originales',()=>{
 f.click('hys306OpenFlash');setField(f,'flash','tipo_incidente','Daño Material');
 setField(f,'flash','ubicacion','Sector de prueba');
 f.click('hys308SaveFlash');
 const s=f.api.state();
 assert.equal(s.cases.length,1);assert.equal(s.cases[0].flash.status,'borrador');
 assert.equal(s.cases[0].flash.data.tipo_incidente,'Daño Material');
 assert.equal(s.cases[0].creatorId,'demo-autor');
});
const first=f.api.state().cases[0].id;
ok('Múltiples informes: segundo borrador no sobrescribe el primero',()=>{
 f.click('hys308New');setField(f,'flash','tipo_incidente','Cuasi Accidente');
 f.click('hys308SaveFlash');const s=f.api.state();
 assert.equal(s.cases.length,2);
 assert.notEqual(s.cases[0].id,s.cases[1].id);
 assert.equal(s.cases[0].flash.data.tipo_incidente,'Daño Material');
});
ok('Final se inicia anticipadamente con mismo correlativo',()=>{
 f.api.showTracking(true);
 assert.ok(f.api.openCase(first,'final'));
 const form=f.get('hys306FinalForm');
 assert.equal(form.querySelector('[name="tipo_incidente"]').value,'Daño Material');
 setField(f,'final','descripcion','Investigación de prueba, sin datos reales');
 f.click('hys308SaveFinal');
 const s=f.api.state().cases[0];
 assert.equal(s.final.status,'borrador');
 assert.equal(s.final.data.tipo_incidente,'Daño Material');
 assert.equal(s.id,first);
});
ok('No se simula aprobación final si Flash aún no está aprobado',()=>{
 f.get('hys308ReviewerFinal').value='demo-hys';
 f.click('hys308SendFinal');
 f.choose('demo-hys');
 assert.equal(f.api.decide(first,'final','approve','Evaluado'),false);
 assert.equal(f.api.state().cases[0].final.status,'en_revision');
 assert.ok(f.alerts.some(x=>x.includes('Flash Report aprobado')));
});
ok('Flash: envío al supervisor, asignación y trazabilidad',()=>{
 f.choose('demo-autor');
 f.api.openCase(first,'flash');
 setField(f,'flash','ubicacion','Sector de prueba corregido');
 f.get('hys308ReviewerFlash').value='demo-supervisor';
 f.click('hys308SendFlash');
 const s=f.api.state().cases[0];
 assert.equal(s.flash.status,'en_revision');
 assert.equal(s.flash.reviewerId,'demo-supervisor');
 assert.ok(s.history.some(x=>x.event==='Enviado a revisión'));
 assert.ok(s.history.some(x=>(x.changes||[]).some(v=>v.name==='ubicacion')));
});
ok('Revisor puede devolver con observaciones',()=>{
 f.choose('demo-supervisor');
 assert.equal(f.api.decide(first,'flash','return','Falta aclarar el lugar exacto del incidente.'),true);
 const doc=f.api.state().cases[0];
 assert.equal(doc.flash.status,'correccion');
 assert.equal(doc.flash.reviewerId,'demo-autor');
 assert.ok(doc.history.some(x=>x.event==='Devuelto para corrección'));
});
ok('Autor puede corregir y reenviar',()=>{
 f.choose('demo-autor');f.api.openCase(first,'flash');
 setField(f,'flash','ubicacion','Sector de prueba aclarado');
 f.get('hys308ReviewerFlash').value='demo-supervisor';
 f.click('hys308SendFlash');
 const s=f.api.state().cases[0];
 assert.equal(s.flash.status,'en_revision');
 assert.ok(s.flash.revision>=3);
});
ok('Revisión secuencial con supervisor y HYS',()=>{
 f.choose('demo-supervisor');
 assert.equal(f.api.decide(first,'flash','approve','Conforme, continúa HYS','demo-hys'),true);
 let s=f.api.state().cases[0];
 assert.equal(s.flash.status,'en_revision');assert.equal(s.flash.reviewerId,'demo-hys');
 f.choose('demo-hys');
 assert.equal(f.api.decide(first,'flash','approve','Aprobado por HYS'),true);
 s=f.api.state().cases[0];
 assert.equal(s.flash.status,'aprobado');
 assert.ok(s.history.filter(x=>x.event.includes('Aprobación')||x.event.includes('Revisión conforme')).length>=2);
});
ok('Final puede aprobarse tras aprobación Flash; expediente trazado',()=>{
 assert.equal(f.api.decide(first,'final','approve','Final conforme'),true);
 const s=f.api.state().cases[0];
 assert.equal(s.final.status,'aprobado');
 assert.ok(s.history.some(x=>x.kind==='flash'&&x.event==='Aprobación del informe'));
 assert.ok(s.history.some(x=>x.kind==='final'&&x.event==='Aprobación del informe'));
});
ok('Ninguna alteración de los títulos de los formularios desde v307',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../v307-review/investigacion-accidentes-v305.js'),'utf8');
 const getLabels=s=>[...s.matchAll(/\b(?:f|text|pick|areaField)\('([^']+)','[^']+'/g)].map(x=>x[1]);
 assert.equal(getLabels(base).length,82);
 assert.deepEqual(getLabels(base),getLabels(source));
});
ok('Integración sin retirar autorizaciones de APR/OTROS',()=>{
 assert.ok(productionPage.includes('if(embeddedOtros && !modules.includes("OTROS"))'));
 assert.ok(productionPage.includes('investigacion-flujo-v308.js'));
 assert.ok(!flow.includes('localStorage.')&&!flow.includes('indexedDB.'));
 assert.ok(!flow.includes('.from(')&&!flow.includes('.rpc('));
});
f.close();
const u=fixture({demo:false,role:'usuario'});
ok('Usuario activo real ve acceso, pero envío real está inhabilitado',()=>{
 assert.equal(u.w.Hys305Investigation.open(),true);
 u.click('hys306OpenFlash');u.click('hys308SaveFlash');
 assert.ok(u.api.state().cases.length===1);
 assert.equal(u.get('hys308SendFlash').disabled,true);
 assert.equal(u.api.serverStorageEnabled,false);
});
u.close();
const inactive=fixture({demo:false,active:false});
ok('Usuario inactivo no puede abrir ni elaborar investigaciones',()=>{
 assert.equal(inactive.w.Hys305Investigation.open(),false);
 assert.equal(inactive.get('hys308Launcher').hidden,true);
});
inactive.close();
console.log('RESULTADO: '+checked+' verificaciones v308, sin interacción con producción.');
