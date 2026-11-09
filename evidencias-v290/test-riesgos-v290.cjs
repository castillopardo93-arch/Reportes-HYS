/* Reportes HYS v290: pruebas aisladas sin acceso de red ni escritura a Supabase. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../v290-review');
const src=fs.readFileSync(path.join(root,'risk-catalog-v243.js'),'utf8');
const seed=fs.readFileSync(path.join(root,'risk-seed-v252.js'),'utf8');
const legacy=fs.readFileSync(path.resolve(__dirname,'../v289-review/risk-catalog-v243.js'),'utf8');
let count=0;
function test(label,fn){fn();count++;console.log('OK '+String(count).padStart(2,'0')+' · '+label);}
function make(){
 const dom=new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>',{url:'https://hys.local/',runScripts:'outside-only'});
 // jsdom no expone TextEncoder de Node por defecto; el navegador real sí lo tiene.
 dom.window.TextEncoder=TextEncoder;
 dom.window.eval(seed);
 dom.window.eval(src);
 return {dom,api:dom.window.Hys243Risks};
}
const a={code:'R0005',name:'Amago de incendio o incendio',aliases:['Amago - Incendio']};
const b={code:'R0100',name:'Caída de materiales',aliases:[]};
test('Semilla original mantiene 393 riesgos',()=>{const {dom}=make();assert.equal(dom.window.HYS252_RISK_SEED.risks.length,393);dom.window.close();});
test('Se mantiene el código heredado en instantáneas internas',()=>{const {dom,api}=make();assert.deepEqual(JSON.parse(JSON.stringify(api.snapshots([a]))),[{code:'R0005',name:a.name}]);dom.window.close();});
test('Resumen solo muestra los nombres vigentes',()=>{const {dom,api}=make();assert.equal(api.formatSelection([a,b]),a.name+'; '+b.name);assert.doesNotMatch(api.formatSelection([a,b]),/R0005|R0100/);dom.window.close();});
test('Resumen vacío no muestra datos ficticios',()=>{const {dom,api}=make();assert.equal(api.formatSelection([]),'');dom.window.close();});
test('Fila de detalle conserva las denominaciones sin códigos',()=>{const {dom,api}=make();const r=[0,0,0,0,0,0,{risks:[a,b]}];const html=api.detailRow(r,7);assert.match(html,/Amago de incendio/);assert.match(html,/Caída de materiales/);assert.doesNotMatch(html,/R0005|R0100/);dom.window.close();});
test('Detalle escapa caracteres especiales',()=>{const {dom,api}=make();const html=api.detailRow([0,0,0,0,0,0,{risks:[{code:'R0999',name:'Contacto <riesgo> & otros'}]}],7);assert.match(html,/&lt;riesgo&gt; &amp; otros/);assert.doesNotMatch(html,/<riesgo>/);dom.window.close();});
test('No hay fila de riesgos para informe sin riesgos asociados',()=>{const {dom,api}=make();assert.equal(api.detailRow([],7),'');dom.window.close();});
test('Búsqueda por denominación oficial funciona',()=>{const {dom,api}=make();assert.equal(api.filterCatalog([a,b],'incendio')[0].code,'R0005');dom.window.close();});
test('Búsqueda por variante histórica sigue funcionando',()=>{const {dom,api}=make();assert.equal(api.filterCatalog([a,b],'Amago - Incendio')[0].code,'R0005');dom.window.close();});
test('Búsqueda por identificador interno conserva compatibilidad',()=>{const {dom,api}=make();assert.equal(api.filterCatalog([a,b],'R0005')[0].name,a.name);dom.window.close();});
test('Importación JSON de compatibilidad mantiene identidad',()=>{const {dom,api}=make();const payload=JSON.stringify({version:'legacy',risks:[a,b]});const parsed=api.parseCatalogText(payload,'catalogo.json');assert.equal(parsed.risks.length,2);assert.equal(parsed.risks[0].code,'R0005');dom.window.close();});
test('Importación CSV existente sigue siendo compatible',()=>{const {dom,api}=make();const csv='codigo;nombre\nR0005;Amago de incendio o incendio\n';const x=api.parseCatalogText(csv,'catalogo.csv');assert.equal(x.risks[0].name,a.name);dom.window.close();});
test('Importación con códigos duplicados sigue bloqueada',()=>{const {dom,api}=make();assert.throws(()=>api.parseCatalogText(JSON.stringify([a,{...a,name:'otro'}]),'x.json'),/duplicado/);dom.window.close();});
test('Selector no expone códigos en su interfaz',()=>{
 const {dom,api}=make(),d=dom.window.document;
 api.mount(d.getElementById('host'),[a]);
 const host=d.getElementById('host');
 const chip=host.querySelector('.hys243-risk-chip');
 const input=host.querySelector('input[type="search"]');
 assert.ok(chip);assert.equal(chip.textContent,a.name+' ×');assert.equal(chip.title,'Quitar '+a.name);
 assert.equal(input.placeholder,'Buscar nombre del riesgo');
 assert.doesNotMatch(host.querySelector('.hys243-risk-help').textContent,/código/i);
 input.value='Amago';input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
 const btn=[...host.querySelectorAll('.hys243-risk-result')].find(x=>x.textContent.includes(a.name));
 assert.ok(btn,'Debe aparecer el riesgo estandarizado entre los resultados');assert.equal(btn.textContent,'✓ '+a.name);assert.doesNotMatch(btn.textContent,/R0005/);
 assert.equal(api.selected()[0].code,'R0005');
 dom.window.close();
});
test('Selector oculta códigos incluso cuando se busca por el código heredado',()=>{
 const {dom,api}=make(),d=dom.window.document;
 api.mount(d.getElementById('host'),[]);
 const input=d.querySelector('input[type="search"]');
 input.value='R0005';input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
 const result=d.querySelector('.hys243-risk-result');assert.ok(result);
 assert.equal(result.textContent,'＋ '+a.name);
 result.click();assert.equal(api.selected()[0].code,'R0005');
 assert.doesNotMatch(d.querySelector('.hys243-risk-chosen').textContent,/R0005/);
 dom.window.close();
});
test('Actualización local sigue identificada como local y no como carga de Excel o PDF',()=>{
 const {dom,api}=make(),d=dom.window.document;
 api.mount(d.getElementById('host'),[]);
 const btn=d.querySelector('.hys243-risk-import button');
 assert.match(btn.textContent,/catálogo local/i);
 const file=d.querySelector('.hys243-risk-import input[type="file"]');
 assert.doesNotMatch(file.accept,/xlsx|pdf/i);
 dom.window.close();
});
test('No se alteró la versión protegida v289',()=>{
 assert.match(legacy,/item\.code\+' · '\+item\.name/);
 assert.doesNotMatch(src,/button\.textContent=\(active\?'✓ ':'＋ '\)\+item\.code/);
});
console.log('TOTAL: '+count+' pruebas aprobadas (sin integraciones remotas).');
