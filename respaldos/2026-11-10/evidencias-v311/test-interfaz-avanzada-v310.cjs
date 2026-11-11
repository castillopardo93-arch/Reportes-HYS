/* v311: regresión de interfaz avanzada completa sin panel de cierre adicional. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),review=path.join(root,'v311-review'),older=path.join(root,'v310-review');
const read=(base,name)=>fs.readFileSync(path.join(base,name),'utf8');
const html=read(review,'index.html'),old=read(older,'index.html');
const dom=new JSDOM(html,{url:'https://test.local/v311-review/index.html',runScripts:'outside-only'});
const d=dom.window.document;
const scripts=[...d.querySelectorAll('script[src]')].map(x=>x.getAttribute('src'));
const styles=[...d.querySelectorAll('link[rel="stylesheet"][href]')].map(x=>x.getAttribute('href'));
assert.ok(scripts.length>40,'La interfaz completa dejó de cargar módulos');
assert.ok(styles.length>15,'La interfaz completa dejó de cargar estilos');
const local=[...scripts,...styles].filter(x=>x&&!/^(https?:|data:|\/)/i.test(x)).map(x=>x.split('?')[0]);
const missing=local.filter(file=>!fs.existsSync(path.join(review,file)));
assert.deepEqual(missing,[],'Recurso JS/CSS no copiado a v311');
assert.ok(!html.includes('?build=v309-')&&!html.includes('?build=v308-'),'Caché de versión anterior');
assert.ok(html.includes('?build=v311-auditoria'));
for(const name of ['gestion-usuarios-v265.js','facultades-v242.js','worker-model-v265.js',
 'investigacion-accidentes-v305.js','investigacion-flujo-v308.js',
 'causas-datos-v308.js','causas-catalogo-v308.js','revisores-busqueda-v308.js']){
 assert.ok(local.includes(name),'Falta módulo original: '+name);
}
assert.ok(!local.some(x=>x.startsWith('facultades-cierre-v308.')),'El panel adicional no debe existir');
assert.ok(!html.includes('facultades-cierre-v308'),'No se debe cargar el panel que el usuario rechazó');
assert.ok(scripts.indexOf('gestion-usuarios-v265.js?build=v311-auditoria')
 <scripts.indexOf('investigacion-accidentes-v305.js?build=v311-auditoria'));
assert.ok(scripts.indexOf('causas-datos-v308.js?build=v311-causas-integradas')
 <scripts.indexOf('causas-catalogo-v308.js?build=v311-causas-integradas'));
assert.ok(html.includes('if(embeddedOtros && !modules.includes("OTROS"))'),
 'Se alteró acceso por tarjetas APR/OTROS');
const users=read(review,'gestion-usuarios-v265.js');
assert.ok(!users.includes('Hys308ClosingFaculties'));
assert.ok(!users.includes('hys308-fac-host'));
assert.ok(users.includes("['closeFlashReport','Autorizar cierre de Flash Report']"));
assert.ok(users.includes("['closeFinalReport','Autorizar cierre de Final Report']"));
assert.ok(users.includes("for(const [key,title] of rights)"));
assert.ok(users.includes("if(state.draft.rol==='administrador_area')"),
 'Facultades solo se deben mostrar a administradores');
const existing=read(review,'facultades-v242.js');
assert.ok(existing.includes("closeFlashReport:'Autorizar cierre de Flash Report'"));
assert.ok(existing.includes("closeFinalReport:'Autorizar cierre de Final Report'"));
assert.ok(existing.includes("section.hidden=!isAdminTarget()"),
 'Las facultades especiales no deben aparecer en otros roles');
assert.ok(read(review,'investigacion-accidentes-v305.js').includes('/v311-review'),
 'Ruta de investigación no adaptada a v311');
const form=read(review,'investigacion-accidentes-v305.js');
assert.ok(form.includes("f('CÓDIGOS','action_'+seq+'_codigo','text'"));
assert.ok(!form.includes("pick('Código de causa','action_"));
assert.ok(form.includes("hys306-cause-select"));
assert.ok(!read(review,'causas-catalogo-v308.js').includes('hys308CauseWorkbook'));
const match=/Object\.freeze\((\{.*\})\);/s.exec(read(review,'causas-datos-v308.js'));
assert.ok(match);
const data=JSON.parse(match[1]);
assert.equal(data.entradas.length,153);
for(const group of [1,2,3])for(let i=1;i<={1:73,2:49,3:31}[group];i++){
 const code=group+'.'+i;
 assert.ok(data.entradas.some(x=>x.codigo===code&&x.descripcion.length>3),code);
}
const manifest=JSON.parse(read(review,'MANIFIESTO.json'));
assert.equal(manifest.version,311);
assert.equal(manifest.integracion_v311.no_publicada,true);
assert.equal(manifest.integracion_v311.modificacion_supabase,false);
const unaffected=['cloud-v242.js','config-v242.js','operaciones-v242.js','storage-v242.js',
 'people-areas-v244.js','pending-dashboard-v250.js','risk-catalog-v243.js','sync-core-v242.js','appearance-v242.js'];
for(const name of unaffected){
 assert.equal(read(review,name),read(older,name),'Se alteró componente ajeno: '+name);
}
// HTML de v311 debe diferir de v309 exclusivamente por quitar el panel extra
// y actualizar identificadores de caché.
let normalized=html.replaceAll('?build=v311-auditoria','?build=v310-facultades-lista')
 .replaceAll('?build=v311-causas-integradas','?build=v310-causas-integradas')
 .replaceAll('?build=v311-buscador-revisores','?build=v310-buscador-revisores');
assert.equal(normalized,old,'Se alteraron elementos inesperados de la interfaz avanzada v310');
assert.ok(fs.existsSync(path.join(review,'demo-final-causas-v308.html')));
console.log('RESULTADO v311: '+local.length+' recursos completos, 153 causas, punto 10 libre,');
console.log('listas originales con nuevas facultades, panel extra eliminado, módulos restantes intactos.');
dom.window.close();