/* v309 — comprobación estática de la interfaz avanzada completa y aislamiento. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),v309=path.join(root,'v309-review'),v308=path.join(root,'v308-review');
const read=(base,name)=>fs.readFileSync(path.join(base,name),'utf8');
const html=read(v309,'index.html'),old=read(v308,'index.html');
const dom=new JSDOM(html,{url:'https://test.local/v309-review/index.html',runScripts:'outside-only'});
const d=dom.window.document;
const scripts=[...d.querySelectorAll('script[src]')].map(x=>x.getAttribute('src'));
const css=[...d.querySelectorAll('link[rel="stylesheet"][href]')].map(x=>x.getAttribute('href'));
assert.ok(scripts.length>40,'La interfaz completa dejó de cargar módulos');
assert.ok(css.length>15,'La interfaz completa dejó de cargar estilos');
const local=[...scripts,...css].filter(x=>x&&!/^(https?:|data:|\/)/i.test(x))
 .map(x=>x.split('?')[0]);
const missing=local.filter(file=>!fs.existsSync(path.join(v309,file)));
assert.deepEqual(missing,[],'Hay archivos de CSS o JS que no se copiaron a v309');
assert.ok(!html.includes('?build=v308-'),'Caché de la v308 no actualizado');
assert.ok(html.includes('?build=v309-integracion-investigacion'));
for(const name of ['facultades-cierre-v308.js','facultades-cierre-v308.css','gestion-usuarios-v265.js',
 'investigacion-accidentes-v305.js','investigacion-flujo-v308.js','causas-datos-v308.js',
 'causas-catalogo-v308.js','revisores-busqueda-v308.js']){
 assert.ok(local.includes(name),'Módulo no cargado en la interfaz completa: '+name);
}
assert.ok(scripts.indexOf('gestion-usuarios-v265.js?build=v309-integracion-investigacion')
  <scripts.indexOf('investigacion-accidentes-v305.js?build=v309-integracion-investigacion'));
assert.ok(scripts.indexOf('causas-datos-v308.js?build=v309-causas-integradas')
  <scripts.indexOf('causas-catalogo-v308.js?build=v309-causas-integradas'));
assert.ok(html.includes('if(embeddedOtros && !modules.includes("OTROS"))'),
 'Se alteró el acceso por tarjetas de APR/OTROS');
assert.ok(read(v309,'gestion-usuarios-v265.js').includes('Hys308ClosingFaculties?.mount'),
 'Permisos adicionales de cierre no integrados en Administración General');
assert.ok(read(v309,'investigacion-accidentes-v305.js').includes('/v309-review'),
 'El acceso de revisión aún depende de la ruta v308');
const form=read(v309,'investigacion-accidentes-v305.js');
assert.ok(form.includes("f('CÓDIGOS','action_'+seq+'_codigo','text'"),
 'El punto 10 debe ser de escritura libre');
assert.ok(!form.includes("pick('Código de causa','action_"),
 'No debe existir selector de causa en planes de acción');
assert.ok(form.includes("hys306-cause-select"),
 'El punto 9 debe conservar los 5 desplegables');
assert.ok(!read(v309,'causas-catalogo-v308.js').includes('hys308CauseWorkbook'),
 'No se debe cargar manualmente el catálogo en la aplicación');
const dataJs=read(v309,'causas-datos-v308.js');
const match=/Object\.freeze\((\{.*\})\);/s.exec(dataJs);
assert.ok(match,'La aplicación no contiene el catálogo original');
const data=JSON.parse(match[1]);
assert.equal(data.entradas.length,153);
for(const [prefix,start,end] of [['1',1,73],['2',1,49],['3',1,31]]){
 for(let i=start;i<=end;i++){
  const code=prefix+'.'+i;
  assert.ok(data.entradas.some(x=>x.codigo===code&&x.descripcion.length>3),code);
 }
}
const manifest=JSON.parse(read(v309,'MANIFIESTO.json'));
assert.equal(manifest.version,309);
assert.equal(manifest.integracion_v309.no_publicada,true);
assert.equal(manifest.integracion_v309.modificacion_supabase,false);
assert.equal(manifest.base_commit,'1b6ce4f5d4ebcef5f47cac89b7f7966462f22a9c');
const unchanged=['cloud-v242.js','config-v242.js','operaciones-v242.js',
 'storage-v242.js','people-areas-v244.js','pending-dashboard-v250.js',
 'risk-catalog-v243.js','sync-core-v242.js','appearance-v242.js'];
for(const name of unchanged){
 assert.equal(read(v309,name),read(v308,name),
  'Se cambió accidentalmente un componente ajeno a la investigación: '+name);
}
let normalized=html
 .replaceAll('?build=v309-integracion-investigacion','?build=v308-flujo-investigacion')
 .replaceAll('?build=v309-integracion-facultades','?build=v308-facultades-cierre')
 .replaceAll('?build=v309-causas-integradas','?build=v308-directo')
 .replaceAll('?build=v309-buscador-revisores','?build=v308-revisores');
assert.equal(normalized,old,'La app base fue modificada más allá de los identificadores de caché de v309');
assert.ok(fs.existsSync(path.join(v309,'demo-final-causas-v308.html')));
assert.ok(fs.existsSync(path.join(v309,'demo-v308.html')));
console.log('RESULTADO v309: '+local.length+' referencias locales completas, 153 causas, planes libres,');
console.log('panel facultades integrado, acceso v309, componentes APR/OTROS intactos y desarrollo NO publicado.');
dom.window.close();
