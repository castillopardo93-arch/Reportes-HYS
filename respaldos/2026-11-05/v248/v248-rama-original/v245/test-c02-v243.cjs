'use strict';
// C02: comprobaciones estructurales del contrato del formulario Hallazgos.
// No conecta a Supabase, no escribe registros, no publica.
const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const config=fs.readFileSync(path.join(__dirname,'config-v242.js'),'utf8');
const fields=['Condición detectada','Prioridad','Medida propuesta','Responsable','Estado'];
const quote=x=>'"'+x+'"';
const encoded=fields.map(quote).join(',');

test('C02-01: orden de cinco campos idéntico en keys y labels',()=>{
  for(const key of ['keys','labels'])assert.ok(html.includes('const '+key+'=') && html.includes('findings:['+encoded+']'),key+' no conserva el orden');
  assert.match(html,/const keys=\{activities:[\s\S]*?findings:\["Condición detectada","Prioridad","Medida propuesta","Responsable","Estado"\]/);
  assert.match(html,/const labels=\{activities:[\s\S]*?findings:\["Condición detectada","Prioridad","Medida propuesta","Responsable","Estado"\]/);
});

test('C02-02: las siete columnas visibles se conservan',()=>{
  const section=html.match(/<section class="panel report-section"><div class="section-title purple">[\s\S]*?<tbody id="findings">/)?.[0];
  assert.ok(section);
  assert.deepEqual([...section.matchAll(/<th(?:\s[^>]*)?>([\s\S]*?)<\/th>/g)].map(x=>x[1].trim()),
    ['N.º',...fields,'']);
  assert.match(section,/data-add="findings"/);
});

test('C02-03: prioridad y estado conservan las opciones originales',()=>{
  assert.match(html,/"Prioridad":\["Baja","Media","Alta","Crítica"\]/);
  assert.match(html,/"Estado":\["Pendiente","En proceso","Completado"\]/);
  assert.match(html,/choices\[label\]\?'<select name="f'/);
  assert.match(html,/choices\[label\][\s\S]*?current\[j\]/);
});

test('C02-04: textos, obligatorio y retorno de valores existentes en edición',()=>{
  assert.match(html,/labels\[k\]\.map\(\(label,j\)=>/);
  assert.match(html,/<textarea name="f'\+j\+/);
  assert.match(html, /\(j===0\?'required':''\)/);
  assert.match(html,/current\[j\]\|\|""/);
});

test('C02-05: el alta y la edición utilizan los índices de los campos históricos',()=>{
  assert.match(html,/let \{k,i\}=editRef,values=labels\[k\]\.map\(\(_,j\)=>new FormData\(e\.target\)\.get\("f"\+j\)\|\|""\)/);
  assert.match(html,/if\(i===null\)data\[k\]\.push\(values\);else data\[k\]\[i\]=values/);
  assert.match(html,/if\(!canEditReport242\(\)\|\|!editRef\)return/);
  assert.match(html,/if\(!canEditReport242\(\)\|\|session242!==window\.Hys242\.sessionKey\(\)\)return/);
});

test('C02-06: acciones de edición y eliminación conservadas',()=>{
  assert.match(html,/data-edit=/);
  assert.match(html,/data-delete=/);
  assert.match(html,/openModal\(k,\+i\)/);
  assert.match(html,/confirm\("¿Eliminar este registro\?"\)/);
  assert.match(html,/addHistory\("Registro eliminado de "\+k\)/);
});

test('C02-07: datos APR y OTROS guardan hallazgos sin alterar orden',()=>{
  assert.match(html,/let data=\{activities:\[\],inspections:\[\],findings:\[\]\}/);
  assert.match(html,/const reportData=window\.__REPORTES_HYS_OTROS_EMBEDDED__\?\{activities:\[\],inspections:\[\],findings:data\.findings\}:data/);
  assert.match(html,/data=JSON\.parse\(JSON\.stringify\(obj\.data\)\)/);
  assert.match(html,/!\["activities","inspections","findings"\]\.every\(k=>Array\.isArray\(obj\.data\[k\]\)\)/);
});

test('C02-08: fotos en índice 5 y categoría OTROS en índice 6',()=>{
  assert.match(html,/values\[k==="activities"\?4:labels\[k\]\.length\]=attachments/);
  assert.match(html,/if\(embeddedOtros&&k==="findings"\)values\[6\]=\{category:/);
  assert.match(html,/const value=current\[6\]\?\.category\|\|""/);
  assert.match(html,/if\(embeddedOtros&&k==="findings"\)/);
});

test('C02-09: PDF conserva todos los campos en APR y OTROS',()=>{
  assert.match(html,/const findingSection=\{key:'findings',title:'Hallazgos',labels:\['Condición detectada','Prioridad','Medida propuesta','Responsable','Estado'\]/);
  assert.match(html,/const sections=options\.otros\?\[findingSection\]:\[/);
  assert.match(html,/findingSection\s*\n\s*\];/);
  assert.match(html,/options\.otros&&section\.key==='findings'&&record\[6\]\?\.category/);
});

test('C02-10: viñetas históricas de textos Hallazgos y central desactivada',()=>{
  assert.match(html,/k==="findings"&&\["Condición detectada","Medida propuesta","Responsable"\]\.includes\(label\)/);
  assert.match(config,/window\.HYS242_ENABLE_CENTRAL=false;/);
  assert.match(config,/window\.HYS242_DEPLOYMENT_READY=false;/);
});
