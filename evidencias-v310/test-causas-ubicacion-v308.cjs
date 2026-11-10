/* HSS-RGT-007 Rev. 08 — QA de ubicación de códigos en Final Report.
   Solo prueba visual/DOM; no crea informes ni toca Supabase.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const dir=path.resolve(__dirname,'../v310-review');
const read=p=>fs.readFileSync(path.join(dir,p),'utf8');
const preview=read('demo-final-causas-v308.html');
const dom=new JSDOM(preview,{url:'https://hys.test/v310-review/demo-final-causas-v308.html',runScripts:'outside-only'});
const w=dom.window,d=w.document;
const inlineScripts=[...preview.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(s=>s.trim());
assert.equal(inlineScripts.length,2,'Deben existir script de acceso ficticio y script de previsualización');
w.eval(inlineScripts[0]);
w.eval(read('investigacion-accidentes-v305.js'));
w.eval(read('causas-datos-v308.js'));
w.eval(read('causas-catalogo-v308.js'));
w.eval(inlineScripts[1]);
assert.ok(w.HYS308_DIRECT_PREVIEW?.ready===true,'Catálogo sin activar');
assert.equal(w.HYS308_DIRECT_PREVIEW?.total,153,'Se esperaban 153 códigos literales');
assert.equal(w.HYS308_DIRECT_PREVIEW?.skipFlash,true);
const form=d.getElementById('hys306FinalForm');
const flash=d.getElementById('hys306FlashForm');
assert.ok(form&&!form.hidden,'Final Report debe estar abierto');
assert.equal(flash.hidden,true,'Flash permanece oculto');
assert.equal([...form.querySelectorAll('.hys306-section')].filter(x=>!x.hidden).length,2,'Solo se deben mostrar análisis y planes');
const categories=[
 {name:'condiciones_subestandar',count:37,first:'1.1',last:'1.37',firstText:'ACUÑADURA DEFICIENTE',lastText:'OTROS'},
 {name:'acciones_subestandar',count:36,first:'1.38',last:'1.73',firstText:'DECISIÓN INAPROPIADA O FALTA DE JUICIO',lastText:'OTROS'},
 {name:'factores_trabajo',count:25,first:'2.1',last:'2.25',firstText:'DESGASTE DEL EQUIPO O HERRAMIENTA POR USO NORMAL',lastText:'OTROS'},
 {name:'factores_personales',count:24,first:'2.26',last:'2.49',firstText:'AUDICION DEFECTUOSA',lastText:'OTROS'},
 {name:'requerimientos_sistema',count:31,first:'3.1',last:'3.31',firstText:'ADECUADA FORMULACION DE OBJETIVOS Y METAS',lastText:'OTROS'}
];
let n=0;
for(const group of categories){
 const textarea=form.querySelector('[name="'+group.name+'"]');
 assert.ok(textarea,'No existe campo '+group.name);
 const holder=textarea.closest('.hys306-field');
 const select=holder?.querySelector('.hys306-cause-select');
 assert.ok(select,'No hay desplegable para '+group.name);
 const values=[...select.options].filter(o=>o.value);
 assert.equal(values.length,group.count,group.name+' tiene opciones erróneas');
 assert.equal(values[0].value,group.first);
 assert.equal(values.at(-1).value,group.last);
 assert.equal(values[0].textContent,group.first+' — '+group.firstText);
 assert.equal(values.at(-1).textContent,group.last+' — '+group.lastText);
 assert.ok(values.every(o=>o.textContent.startsWith(o.value+' — ')),'Algún código carece de nombre');
 assert.equal(select.disabled,false);
 const other=categories.filter(g=>g.name!==group.name).map(g=>form.querySelector('[name="'+g.name+'"]').value);
 select.value=group.first;
 select.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.ok(textarea.value.includes(group.first+' — '+group.firstText));
 assert.deepEqual(categories.filter(g=>g.name!==group.name).map(g=>form.querySelector('[name="'+g.name+'"]').value),other,
  'La causa modificó una categoría incorrecta');
 n+=values.length;
 console.log('OK',group.name,values.length,'entradas',group.first,'...',group.last);
}
assert.equal(n,153);
const action=form.querySelector('#hys306ActionRows input[name="action_1_codigo"]');
assert.ok(action,'No hay campo CÓDIGOS del punto 10');
assert.equal(action.type,'text','Punto 10: campo libre, no selector');
assert.equal(form.querySelector('#hys306ActionRows select[name$="_codigo"]'),null,'El Excel no contiene desplegable de códigos en punto 10');
action.value='1.1 y 2.26';
action.dispatchEvent(new w.Event('input',{bubbles:true}));
assert.equal(action.value,'1.1 y 2.26','Escritura libre en CÓDIGOS');
const add=d.getElementById('hys306AddAction');
add.click();
assert.equal(form.querySelectorAll('#hys306ActionRows input[name$="_codigo"]').length,4,'También nuevos planes mantienen campo libre');
assert.equal(form.querySelector('#hys306ActionRows select[name$="_codigo"]'),null);
assert.equal(d.getElementById('hys308CauseWorkbook'),null,'El usuario no debe cargar Excel');
assert.equal(read('causas-datos-v308.js').includes('estado:"pendiente_de_fuente_original"'),false);
console.log('RESULTADO: 153 causas con código y nombre exclusivamente en punto 9; punto 10 con campo CÓDIGOS libre sin selector.');
dom.window.close();
