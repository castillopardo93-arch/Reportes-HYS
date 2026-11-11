'use strict';
// v245: selector de Proyecto único en APR y OTROS (iframe integrado).
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const project='Proyecto Hidroeléctrico Alto Maipo';
for(const file of ['index.html','../v245-review/index.html']){
 const html=fs.readFileSync(path.join(__dirname,file),'utf8');
 test(file+' muestra exactamente un proyecto',()=>{
   const match=html.match(/<select id="project"[^>]*>([\s\S]*?)<\/select>/);
   assert.ok(match,'Existe el selector proyecto');
   assert.equal((match[1].match(/<option/g)||[]).length,1,'Solo debe haber una opción');
   assert.ok(match[1].includes(project));
   assert.ok(!html.includes('PHAM 1')&&!html.includes('PHAM 2'));
 });
 test(file+' evita que el catálogo y los borradores reintroduzcan proyectos antiguos',()=>{
   assert.match(html,/function enforceProject245\(\)/);
   assert.match(html,/\}enforceProject245\(\);\$\("area"\)\.value/); // applyPack
   assert.match(html,/\}enforceProject245\(\);for\(const id of \["otherCategory"/); // setCatalog
   assert.match(html,/\$\('shift'\)\.replaceChildren\(new Option\('Seleccione\.\.\.',''\)\);enforceProject245\(\)/);
   assert.match(html,/project:PROJECT_NAME_245/);
 });
 test(file+' mantiene salida PDF dependiente del selector actual',()=>{
   assert.match(html,/\{label:'PROYECTO',value:report\.project\}/);
   assert.match(html,/project:\$\("project"\)\.value/);
 });
}
