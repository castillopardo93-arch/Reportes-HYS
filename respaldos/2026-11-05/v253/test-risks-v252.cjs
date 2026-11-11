'use strict';
/* v252: catálogo maestro sin segundo buscador y sin envíos/actualizaciones remotas */
const {test}=require('node:test');
const assert=require('node:assert/strict');
require('./risk-seed-v252.js');
const risk=require('./risk-catalog-v243.js');
const fs=require('node:fs'),path=require('node:path');
const seed=globalThis.HYS252_RISK_SEED;
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const js=fs.readFileSync(path.join(__dirname,'risk-catalog-v243.js'),'utf8');
test('R252-01 precarga 393 riesgos con IDs únicos',()=>{
 assert.equal(seed.risks.length,393);
 assert.equal(new Set(seed.risks.map(x=>x.code)).size,393);
});
test('R252-02 conserva alias/keywords sin cambiar nombre principal',()=>{
 assert.ok(seed.risks.filter(x=>x.aliases.length).length>0);
 assert.ok(seed.risks.every(x=>x.code&&x.name&&Array.isArray(x.aliases)));
});
test('R252-03 normalización previa conserva código con guión',()=>{
 assert.equal(risk.normalize('CÓD-1'),'cod-1');
});
test('R252-04 errores menores de escritura tienen coincidencia',()=>{
 const hits=risk.filterCatalog(seed.risks,'Contaco eléctrico',40);
 assert.ok(hits.some(x=>x.name==='Contacto eléctrico'));
});
test('R252-05 términos relacionados encuentran caída a distinto nivel',()=>{
 assert.ok(risk.filterCatalog(seed.risks,'trabjo altura',40).some(x=>x.name==='Caída a distinto nivel'));
});
test('R252-06 búsqueda sin tildes y términos fuera de orden',()=>{
 assert.ok(risk.filterCatalog(seed.risks,'proyeccion particulas',40).some(x=>/Proyección de partículas/.test(x.name)));
});
test('R252-07 filtro vacío mantiene listado, sin duplicar resultados',()=>{
 const hits=risk.filterCatalog(seed.risks,'',40);
 assert.equal(hits.length,40);
 assert.equal(new Set(hits.map(x=>x.code)).size,hits.length);
});
test('R252-08 importación JSON guarda alias y ordena el catálogo alfabéticamente',()=>{
 const map=new Map();
 globalThis.localStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 const items=[{code:'B01',name:'Zanja',aliases:['Excavación']},{code:'A01',name:'Abrasión',keywords:['Corte']}];
 assert.equal(risk.importCatalog(JSON.stringify({version:'test-v2',risks:items}),'catalog.json'),2);
 const saved=JSON.parse(map.get(risk.storageKey));
 assert.deepEqual(saved.risks.map(x=>x.name),['Abrasión','Zanja']);
 assert.deepEqual(saved.risks[1].aliases,['Excavación']);
 delete globalThis.localStorage;
});
test('R252-09 importación inválida no reemplaza catálogo anterior',()=>{
 const map=new Map([[risk.storageKey,JSON.stringify({version:'anterior',risks:[{code:'A',name:'Riesgo'}]})]]);
 globalThis.localStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 assert.throws(()=>risk.importCatalog('{"risks":[{"code":"X"}]}','bad.json'),/sin código o nombre/);
 assert.equal(JSON.parse(map.get(risk.storageKey)).version,'anterior');
 delete globalThis.localStorage;
});
test('R252-10 instantánea guarda código/nombre, sin sinónimos anexados',()=>{
 const selected=risk.snapshots([seed.risks.find(x=>x.aliases.length>0)]);
 assert.equal(selected.length,1);
 assert.deepEqual(Object.keys(selected[0]),['code','name']);
});
test('R252-11 selector original sigue siendo único en APR y OTROS',()=>{
 assert.match(html,/Hys243Risks\.mount/);
 assert.match(html,/<script src="risk-seed-v252\.js"><\/script><script src="risk-catalog-v243\.js"><\/script>/);
 assert.doesNotMatch(html,/Buscar actividad/);
});
test('R252-12 actualización local visible solo al administrador general',()=>{
 assert.match(js,/importBtn\.hidden=!isGlobal\(\)/);
 assert.match(js,/perfil.*administrador_global|profile\?\.rol==='administrador_global'/);
});
test('R252-13 sin conexión remota, conserva bandera de solo prueba',()=>{
 assert.doesNotMatch(js,/\bfetch\s*\(/);
 assert.doesNotMatch(js,/supabase\.from/);
});
