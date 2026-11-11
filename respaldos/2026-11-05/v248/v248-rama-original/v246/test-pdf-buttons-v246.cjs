'use strict';
/* Reportes HYS v246 — prueba de botones PDF en ambos módulos. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const normal=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const demo=fs.readFileSync(path.join(__dirname,'../v246-review/index.html'),'utf8');
for(const [version,html] of [['desarrollo',normal],['revisión',demo]]){
 test(version+' contiene una sola acción Generar PDF',()=>{
  assert.equal((html.match(/id="pdfShare"/g)||[]).length,1);
  assert.ok(html.includes('id="pdfShare">▤ Generar PDF</button>'));
  assert.ok(!html.includes('Generar PDF y compartir'));
 });
 test(version+' botón Finalizar está inmediatamente a la derecha de Generar PDF',()=>{
  assert.match(html,/<div class="btnrow pdf-final-row"><button class="btn primary" id="pdfShare">▤ Generar PDF<\/button><button class="btn primary" id="finalize">✓ Finalizar informe<\/button><\/div>/);
 });
 test(version+' botón imprimir pertenece a opciones tras generar PDF',()=>{
  const pos=html.indexOf('data-pdf-action="print"'),pdf=html.indexOf('data-pdf-action="download"'),share=html.indexOf('data-pdf-action="share"');
  assert.ok(pos>0&&pdf<pos&&pos<share);
  assert.match(html,/modal\.querySelector\('\[data-pdf-action="print"\]'\)\.onclick=\(\)=>/);
  assert.match(html,/viewer\.contentWindow\.print\(\)/);
  assert.match(html,/window\.open\(url,"_blank"\)/);
  assert.ok(!html.includes('id="print"'));
 });
 test(version+' conserva descarga, compartir y archivo local PDF',()=>{
  assert.match(html,/data-pdf-action="download"/);
  assert.match(html,/data-pdf-action="share"/);
  assert.match(html,/await archiveGeneratedPdf\(blob,filename,pdfReport242\)/);
  assert.match(html,/window\.HysReportPdf\.create/);
 });
 test(version+' conserva finalización conectada a proveedor autorizable',()=>{
  assert.match(html,/\$\("finalize"\)\.onclick=\(\)=>window\.Hys242\?\.finalizeReport\(\)/);
 });
 test(version+' no modifica el proyecto único ni menú de pendientes',()=>{
  assert.match(html,/Proyecto Hidroeléctrico Alto Maipo/);
  assert.match(html,/data-tab="pendientes"/);
 });
 test(version+' estilo adaptativo mantiene ambos controles en la misma fila',()=>{
  assert.match(html,/\.footeractions \.pdf-final-row\{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important/);
 });
 test(version+' no contiene errores de sintaxis en scripts inline',()=>{
  for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(m[1].trim())new Function(m[1]);
 });
}
