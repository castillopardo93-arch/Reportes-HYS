'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const api=require('./risk-catalog-v243.js');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const source=fs.readFileSync(path.join(__dirname,'risk-catalog-v243.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'risk-selector-v243.css'),'utf8');
const config=fs.readFileSync(path.join(__dirname,'config-v242.js'),'utf8');
const fixture=[{codigo:'R-001',nombre:'Caída a distinto nivel'},{codigo:'R-002',nombre:'Exposición a sílice'},{codigo:'R-003',nombre:'Golpe por objeto'}];
test('C03-01 normalizar tildes, mayúsculas y espacios',()=>{
 assert.equal(api.normalize('  EXPOSICIÓN   a SÍLICE  '),'exposicion a silice');
 assert.equal(api.normalize('CÓD-1'),'cod-1');
});
test('C03-02 búsqueda por código, nombre y múltiples palabras',()=>{
 const items=api.parseCatalogText(JSON.stringify(fixture)).risks;
 assert.deepEqual(api.filterCatalog(items,'R-002').map(x=>x.code),['R-002']);
 assert.deepEqual(api.filterCatalog(items,'silice').map(x=>x.code),['R-002']);
 assert.deepEqual(api.filterCatalog(items,'Caida nivel').map(x=>x.code),['R-001']);
 assert.equal(api.filterCatalog(items,'riesgo inexistente').length,0);
});
test('C03-03 JSON con arreglo u objeto versionado sin fabricar datos',()=>{
 const a=api.parseCatalogText(JSON.stringify(fixture),'lista.json');
 const b=api.parseCatalogText(JSON.stringify({version:'2026.11',riesgos:fixture}),'catalogo.json');
 assert.equal(a.risks.length,3);assert.equal(b.version,'2026.11');
 assert.deepEqual(a.risks,b.risks);
});
test('C03-04 CSV coma y punto y coma, comillas y UTF-8',()=>{
 const coma='codigo,nombre\nR-01,"Caída, desde altura"\nR-02,Exposición a sílice';
 const punto='codigo;nombre\nR-01;"Caída; desde altura"\nR-02;Exposición a sílice';
 assert.equal(api.parseCatalogText(coma,'c.csv').risks[0].name,'Caída, desde altura');
 assert.equal(api.parseCatalogText(punto,'c.csv').risks[0].name,'Caída; desde altura');
});
test('C03-05 rechazar duplicados normalizados y filas sin códigos',()=>{
 assert.throws(()=>api.parseCatalogText(JSON.stringify([{code:'CÓD-1',name:'Uno'},{code:'cod-1',name:'Dos'}])),/duplicado/);
 assert.throws(()=>api.parseCatalogText(JSON.stringify([{code:'',name:'Uno'}])),/sin código/);
 assert.throws(()=>api.parseCatalogText('[]','c.json'),/vacío/);
});
test('C03-06 prohibir catálogo excesivo o inválido',()=>{
 assert.throws(()=>api.parseCatalogText('JSON INVALIDO','c.json'),/JSON no es válido/);
 assert.throws(()=>api.parseCatalogText('a'.repeat(2*1024*1024+1),'c.json'),/demasiado grande/);
});
test('C03-07 persistencia local sin conexión y reemplazo atómico',()=>{
 const items=new Map();
 global.localStorage={getItem:key=>items.get(key)||null,setItem:(key,value)=>{items.set(key,value);}};
 assert.equal(api.importCatalog(JSON.stringify(fixture),'a.json'),3);
 const original=items.get(api.storageKey);
 assert.equal(JSON.parse(original).risks.length,3);
 assert.throws(()=>api.importCatalog('[{"code":"XX"}]','b.json'),/sin código/);
 assert.equal(items.get(api.storageKey),original,'importación inválida no reemplaza catálogo');
 const list=api.readCatalog();assert.equal(list,undefined);
 assert.equal(api.filterCatalog(JSON.parse(items.get(api.storageKey)).risks,'R-003').length,1);
 delete global.localStorage;
});
test('C03-08 fallo por cuota no reemplaza catálogo previo',()=>{
 const items=new Map([['previous','salvo']]);
 global.localStorage={getItem:key=>items.get(key)||null,setItem:()=>{throw new Error('quota');}};
 assert.throws(()=>api.importCatalog(JSON.stringify(fixture),'a.json'),/No se pudo conservar/);
 assert.equal(items.get('previous'),'salvo');
 delete global.localStorage;
});
test('C03-09 instantáneas son independientes del catálogo posterior',()=>{
 const saved=api.snapshots([{code:'R-02',name:'Nombre histórico'},{code:'r-02',name:'Duplicado'},{code:'R-09',name:'Antiguo'}]);
 assert.equal(saved.length,2);assert.equal(api.formatSelection(saved),'R-02 — Nombre histórico; R-09 — Antiguo');
});
test('C03-10 escapar HTML en el detalle de riesgos',()=>{
 const row=api.detailRow([null,null,null,null,null,[],{risks:[{code:'<b>',name:'Riesgo & daño'}]}],7);
 assert.match(row,/&lt;b&gt;/);assert.match(row,/Riesgo &amp; daño/);
 assert.doesNotMatch(row,/<b>/);
});
test('C03-11 integración conserva campos históricos y metadatos OTROS',()=>{
 assert.match(html,/findings:\["Condición detectada","Prioridad","Medida propuesta","Responsable","Estado"\]/);
 assert.match(html,/if\(embeddedOtros&&k==="findings"\)values\[6\]=\{category:\$\("recordCategory242"\)\?\.value\|\|""\}/);
 assert.match(html,/risks:window\.Hys243Risks\.selected\(\)/);
 assert.match(html,/oldMeta,\.\.\.\(values\[6\]\|\|\{\}\)/);
 assert.match(html,/current\[6\]\?\.risks\|\|\[\]/);
});
test('C03-12 muestra riesgos sin añadir columnas ni perder evidencia',()=>{
 assert.match(html,/const linkedRisks=k==="findings"/);
 assert.match(html,/return mainRow\+evidence\+linkedRisks/);
 assert.match(html,/data-photo-preview="true"/);
 assert.match(css,/\.hys243-risk-detail/);
 assert.match(html,/table:has\(> tbody#findings\)\{table-layout:fixed;width:100%\}/);
});
test('C03-13 PDF conserva campos y añade riesgos como detalle opcional',()=>{
 assert.match(html,/const findingSection=\{key:'findings',title:'Hallazgos',labels:\['Condición detectada','Prioridad','Medida propuesta','Responsable','Estado'\]/);
 assert.match(html,/label:'Riesgos vinculados',value:linked/);
 assert.match(html,/options\.otros&&section\.key==='findings'&&record\[6\]\?\.category/);
});
test('C03-14 no contiene conexiones de red ni credenciales',()=>{
 assert.doesNotMatch(source,/\bfetch\s*\(/);
 assert.doesNotMatch(source,/https?:\/\//);
 assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(config,/window\.HYS242_ENABLE_CENTRAL=false;/);
 assert.match(config,/window\.HYS242_DEPLOYMENT_READY=false;/);
});
test('C03-15 recursos necesarios referenciados por la copia',()=>{
 assert.match(html,/<script src="risk-catalog-v243.js"><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="risk-selector-v243.css">/);
});
