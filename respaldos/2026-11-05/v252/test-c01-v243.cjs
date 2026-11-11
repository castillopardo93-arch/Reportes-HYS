'use strict';
// C01: contrato de regresión de la tarjeta Hallazgos, compartida por APR y OTROS.
// Solo lee archivos locales; no usa red, usuarios, Supabase ni datos reales.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const test=require('node:test');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const mobile=fs.readFileSync(path.join(__dirname,'mobile-v242.css'),'utf8');

test('C01-01: tarjeta Hallazgos y columnas originales',()=>{
  const m=html.match(/<section class="panel report-section"><div class="section-title purple">[\s\S]*?<tbody id="findings">/);
  assert.ok(m,'Falta tarjeta o tabla Hallazgos');
  const titles=[...m[0].matchAll(/<th(?:\s[^>]*)?>([\s\S]*?)<\/th>/g)].map(x=>x[1].trim());
  assert.deepEqual(titles,['N.º','Condición detectada','Prioridad','Medida propuesta','Responsable','Estado','']);
  assert.match(m[0],/data-add="findings"/);
});

test('C01-02: proporciones de escritorio son exactamente 100%',()=>{
  const widths=[...html.matchAll(/table:has\(> tbody#findings\) th:nth-child\((\d+)\),\s*table:has\(> tbody#findings\) td:nth-child\(\d+\)\s*\{\s*width:\s*(\d+)%/g)]
    .map(m=>[Number(m[1]),Number(m[2])]);
  assert.deepEqual(widths,[[1,5],[2,27],[3,9],[4,27],[5,13],[6,9],[7,10]]);
  assert.equal(widths.reduce((sum,[,width])=>sum+width,0),100);
  assert.match(html,/table:has\(> tbody#findings\)\{table-layout:fixed;width:100%\}/);
});

test('C01-03: APR y OTROS utilizan la misma tabla y su instancia aislada',()=>{
  assert.match(html,/const embeddedOtros=new URLSearchParams\(location.search\).get\("embedded"\)==="otros"/);
  assert.match(html,/body\.embedded-otros .layout main > section\.report-section:has\(#activities\)/);
  assert.match(html,/body\.embedded-otros .layout main > section\.report-section:has\(#inspections\)/);
  assert.match(html,/document\.body\.classList\.remove\("module-choice"\)/);
  assert.match(html,/selectedModule==="OTROS"/);
  assert.match(html,/data-add="findings"/);
});

test('C01-04: hallazgos editables sin sustituir acciones históricas',()=>{
  assert.match(html,/data-edit=/);
  assert.match(html,/data-delete=/);
  assert.match(html,/title="Editar"/);
  assert.match(html,/title="Eliminar registro"/);
  assert.match(html,/¿Eliminar este registro\?/);
  assert.match(html,/if\(!canEditReport242\(\)\)return;editRef=/);
  assert.match(html,/if\(!canEditReport242\(\)\|\|!editRef\)return;/);
});

test('C01-05: varias fotos y eliminación antes de guardar',()=>{
  assert.match(html,/id="recordFiles"/);
  assert.match(html,/type="file"[^>]*multiple/);
  assert.match(html,/data-photo-delete="existing:/);
  assert.match(html,/data-photo-delete="pending:/);
  assert.match(html,/editingActivityPhotos\.splice\(/);
  assert.match(html,/pendingActivityPhotos\.splice\(/);
  assert.match(html,/pendingActivityPhotos\)\{/);
});

test('C01-06: fotos en fila de detalle, desplegables y con visor',()=>{
  assert.match(html,/class="record-evidence-row"/);
  assert.match(html,/class="activity-photos-details"/);
  assert.match(html,/data-photo-preview="true"/);
  assert.match(html,/id="photoViewer"/);
  assert.match(html,/id="photoViewerImage"/);
  assert.match(html,/id="photoViewerClose"/);
  assert.match(html,/photos\.map\(p=>/);
});

test('C01-07: diseño adaptable en pantallas pequeñas',()=>{
  assert.match(mobile,/@media screen and \(max-width:760px\)/);
  assert.match(mobile,/\.report-section tbody>tr/);
  assert.match(mobile,/\.record-evidence\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(mobile,/@media screen and \(max-width:360px\)/);
});

test('C01-08: no se activa la base remota heredada de v242',()=>{
  const config=fs.readFileSync(path.join(__dirname,'config-v242.js'),'utf8');
  assert.match(config,/window\.HYS242_ENABLE_CENTRAL=false;/);
  assert.match(config,/window\.HYS242_DEPLOYMENT_READY=false;/);
});
