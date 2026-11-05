'use strict';
// C06: pruebas offline con datos sintéticos; sin red ni usuarios reales.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const detail=require('./finding-detail-v243.js');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const js=fs.readFileSync(path.join(__dirname,'finding-detail-v243.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'finding-detail-v243.css'),'utf8');
const cfg=fs.readFileSync(path.join(__dirname,'config-v242.js'),'utf8');
const record=['Condición detectada','Alta','Reparar protección','Responsable histórico','En proceso',[],{category:'OTROS',risks:[{code:'R1',name:'Caída'}],dueDate:'2026-12-11'}];
function fixture(){
 const buttons=[],panels=[],group={
  querySelectorAll(selector){
   if(selector==='[data-hys243-tab]')return buttons;
   if(selector==='[data-hys243-panel]')return panels;
   return [];
  }
 };
 for(const name of detail.tabs){
  buttons.push({
   dataset:{hys243Tab:name},closest:()=>group,tabIndex:name==='followup'?0:-1,focused:false,
   setAttribute(k,v){this[k]=v;},focus(){this.focused=true;}
  });
  panels.push({dataset:{hys243Panel:name},hidden:name!=='followup'});
 }
 return {buttons,panels,group};
}
test('C06-01 tres pestañas definidas y en orden',()=>{
 assert.deepEqual(detail.tabs,['followup','notifications','history']);
});
test('C06-02 genera un detalle por registro válido sin añadir campos',()=>{
 const row=detail.detailRow(record,0,7);
 assert.match(row,/<tr class="hys243-finding-detail-row">/);
 assert.match(row,/<td colspan="7">/);
 assert.match(row,/Ver detalle y seguimiento del hallazgo/);
 assert.match(row,/hys243-hallazgo-0-tab-followup/);
});
test('C06-03 validaciones evitan índices incorrectos',()=>{
 assert.equal(detail.detailRow(record,-1,7),'');
 assert.equal(detail.detailRow(record,0,0),'');
 assert.equal(detail.detailRow(record,0,21),'');
 assert.equal(detail.detailRow({},0,7),'');
});
test('C06-04 muestra medidas y responsables reales, no registros inventados',()=>{
 const withoutDate=[...record.slice(0,6),{...record[6],dueDate:''}];
 const row=detail.detailRow(withoutDate,2,7);
 assert.match(row,/Condición detectada/);
 assert.match(row,/Reparar protección/);
 assert.match(row,/Responsable histórico/);
 assert.match(row,/En proceso/);
 assert.match(row,/Fecha compromiso/);
 assert.match(row,/No definida/);
});
test('C06-05 escapa etiquetas inyectadas por datos del informe',()=>{
 const unsafe=['<img src=x onerror=alert(1)>','Baja','Corregir & verificar','" onclick="hack','Completado',[],{}];
 const row=detail.detailRow(unsafe,0,7);
 assert.match(row,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.match(row,/Corregir &amp; verificar/);
 assert.doesNotMatch(row,/<img src=x/);
 assert.doesNotMatch(row,/onclick="hack"/);
});
test('C06-06 notificaciones en estado no implementado, sin fingir envíos',()=>{
 const row=detail.detailRow(record,0,7);
 assert.match(row,/No se ha enviado ni confirmado ningún aviso desde este panel/);
 assert.match(row,/F01–F07/);
 assert.doesNotMatch(row,/Notificación enviada correctamente/);
});
test('C06-07 historial no confunde Completado con cierre auditado',()=>{
 const row=detail.detailRow([...record.slice(0,4),'Completado',...record.slice(5)],0,7);
 assert.match(row,/El estado del formulario no es una evidencia de cierre/);
 assert.match(row,/ningún cierre o reapertura se ejecuta desde esta vista sin servidor aislado/);
});
test('C06-08 ARIA tabs tienen paneles asociados y primera pestaña visible',()=>{
 const row=detail.detailRow(record,1,7);
 for(const key of detail.tabs){
  assert.match(row,new RegExp('id="hys243-hallazgo-1-tab-'+key+'"'));
  assert.match(row,new RegExp('aria-controls="hys243-hallazgo-1-panel-'+key+'"'));
  assert.match(row,new RegExp('id="hys243-hallazgo-1-panel-'+key+'"'));
 }
 assert.match(row,/data-hys243-tab="followup" aria-controls="hys243-hallazgo-1-panel-followup" aria-selected="true" tabindex="0"/);
 assert.match(row,/data-hys243-tab="notifications" aria-controls="hys243-hallazgo-1-panel-notifications" aria-selected="false" tabindex="-1"/);
});
test('C06-09 identificadores no se repiten entre hallazgos',()=>{
 assert.notEqual(detail.detailRow(record,0,7).match(/id="hys243-hallazgo-0-tab-followup"/)?.[0],detail.detailRow(record,1,7).match(/id="hys243-hallazgo-1-tab-followup"/)?.[0]);
});
test('C06-10 seleccionar pestaña cambia ARIA y panel visible',()=>{
 const x=fixture();
 assert.equal(detail.activateTab(x.buttons[1]),true);
 assert.equal(x.buttons[1]['aria-selected'],'true');
 assert.equal(x.buttons[0]['aria-selected'],'false');
 assert.equal(x.panels[0].hidden,true);
 assert.equal(x.panels[1].hidden,false);
 assert.equal(x.panels[2].hidden,true);
});
test('C06-11 no acepta pestañas extrañas o ajenas al mismo detalle',()=>{
 const x=fixture();
 assert.equal(detail.activateTab({dataset:{hys243Tab:'invalid'},closest:()=>x.group}),false);
 assert.equal(detail.activateTab({dataset:{hys243Tab:'history'},closest:()=>x.group}),false);
 assert.equal(detail.activateTab(null),false);
});
test('C06-12 delegación de clic activa el tab elegido',()=>{
 const x=fixture();
 detail.onClick({target:{closest:()=>x.buttons[2]}});
 assert.equal(x.panels[2].hidden,false);
 assert.equal(x.buttons[2].tabIndex,0);
});
test('C06-13 navegación con flechas, Inicio y Fin conserva foco',()=>{
 const x=fixture();
 let prevented=0;
 detail.onKeydown({target:{closest:()=>x.buttons[0]},key:'ArrowRight',preventDefault:()=>{prevented++;}});
 assert.equal(x.panels[1].hidden,false);
 assert.equal(x.buttons[1].focused,true);
 detail.onKeydown({target:{closest:()=>x.buttons[1]},key:'End',preventDefault:()=>{prevented++;}});
 assert.equal(x.panels[2].hidden,false);
 detail.onKeydown({target:{closest:()=>x.buttons[2]},key:'Home',preventDefault:()=>{prevented++;}});
 assert.equal(x.panels[0].hidden,false);
 assert.equal(prevented,3);
});
test('C06-14 integra detalle solo en Hallazgos; C01–C05 intactos',()=>{
 assert.match(html,/const workflowDetail=k==="findings"&&window\.Hys243FindingDetail/);
 assert.match(html,/return mainRow\+evidence\+linkedRisks\+linkedAssignees\+dueDateRow\+workflowDetail/);
 assert.match(html,/findings:\["Condición detectada","Prioridad","Medida propuesta","Responsable","Estado"\]/);
 assert.match(html,/risks:window\.Hys243Risks\.selected\(\),assignees:assignments,dueDate:dueDate243/);
 assert.match(html,/data-photo-preview="true"/);
});
test('C06-15 CSS, bloqueo de impresión, aislamiento y ausencia de red',()=>{
 assert.match(html,/<script src="finding-detail-v243\.js"><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="finding-detail-v243\.css">/);
 assert.match(css,/@media print\{tr\.hys243-finding-detail-row\{display:none!important\}\}/);
 assert.match(cfg,/window\.HYS242_ENABLE_CENTRAL=false;/);
 assert.match(cfg,/window\.HYS242_DEPLOYMENT_READY=false;/);
 assert.doesNotMatch(js,/\bfetch\s*\(/);
 assert.doesNotMatch(js,/SUPABASE_SERVICE_ROLE_KEY/);
});
