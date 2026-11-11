'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..','v243-review');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const runtime=fs.readFileSync(path.join(base,'review-runtime-v243.js'),'utf8');
const build=fs.readFileSync(path.join(base,'build-preview.sh'),'utf8');
test('C10P-01 host y clave real no incluidos',()=>{
 assert.doesNotMatch(html,/ujfsugivgysyhboyirtz\.supabase\.co/);
 assert.doesNotMatch(html,/sb_publishable_/);
});
test('C10P-02 no carga SDK Supabase',()=>{
 assert.doesNotMatch(html,/src="[^"]*supabase-js/);
 assert.doesNotMatch(html,/window\.supabase\.createClient/);
});
test('C10P-03 no ejecuta cloud ni funciones administrativas',()=>{
 for(const file of ['cloud-v242.js','facultades-v242.js','operaciones-v242.js'])
  assert.ok(!html.includes('<script src="'+file+'"></script>'));
});
test('C10P-04 usa personas y riesgos ficticios',()=>{
 assert.match(html,/DEMOSTRACIÓN AISLADA/);
 assert.match(html,/Sin Supabase/);
 assert.match(html,/Persona de prueba A/);
 assert.match(html,/CATÁLOGO DEMOSTRACIÓN - NO OFICIAL/);
});
test('C10P-05 conserva tarjetas APR/OTROS y vista iframe',()=>{
 assert.match(html,/id="openAprModule"/);
 assert.match(html,/id="openOtherModule"/);
 assert.match(html,/id="otherAprApp"/);
 assert.match(html,/window\.reportesHysChooseModule=code=>/);
});
test('C10P-06 misma interfaz original de Hallazgos y PDF',()=>{
 assert.match(html,/findings:\["Condición detectada","Prioridad","Medida propuesta","Responsable","Estado"\]/);
 assert.match(html,/const workflowDetail=k==="findings"/);
 assert.match(html,/window\.HysReportPdf\.create/);
});
test('C10P-07 operaciones reales deshabilitadas en runtime',()=>{
 for(const name of ['ACTIONS','TASKS','REASSIGNMENT','AUDIT'])
  assert.ok(runtime.includes('HYS243_'+name+'_ENABLED=false'));
 assert.match(runtime,/HYS242_ENABLE_CENTRAL=false/);
 assert.match(runtime,/HYS242_DEPLOYMENT_READY=false/);
});
test('C10P-08 recursos locales incluidos explícitamente en build',()=>{
 const localFiles=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(x=>x[1])
 .filter(s=>!s.startsWith('http')&&!s.startsWith('about:')&&/\.(js|css)$/.test(s));
 for(const file of localFiles){
  if(file==='review-runtime-v243.js')continue;
  assert.ok(build.includes('  '+file+' ' )||build.includes('  '+file+'\n'),file);
 }
});
test('C10P-09 build no copia clientes de nube ni secretos',()=>{
 assert.ok(!build.includes('\n  cloud-v242.js\n'));
 assert.ok(!build.includes('\n  facultades-v242.js\n'));
 assert.ok(!build.includes('\n  operaciones-v242.js\n'));
 assert.doesNotMatch(build,/\.env|service_role|secret-key/i);
});
test('C10P-10 no ejecuta autenticación conectada',()=>{
 assert.doesNotMatch(html,/v235: ingreso único, destino según permisos/);
 assert.doesNotMatch(html,/Administración v235: todas las escrituras/);
 assert.match(html,/HYS243_PREVIEW_ONLY=true/);
});
