/* v313: regresión de interfaz avanzada completa sin panel de cierre adicional. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),review=path.join(root,'v333-review'),older=path.join(root,'v310-review');
const read=(base,name)=>fs.readFileSync(path.join(base,name),'utf8');
const html=read(review,'index.html'),old=read(older,'index.html');
const dom=new JSDOM(html,{url:'https://test.local/v333-review/index.html',runScripts:'outside-only'});
const d=dom.window.document;
const scripts=[...d.querySelectorAll('script[src]')].map(x=>x.getAttribute('src'));
const styles=[...d.querySelectorAll('link[rel="stylesheet"][href]')].map(x=>x.getAttribute('href'));
assert.ok(scripts.length>40,'La interfaz completa dejó de cargar módulos');
assert.ok(styles.length>15,'La interfaz completa dejó de cargar estilos');
const local=[...scripts,...styles].filter(x=>x&&!/^(https?:|data:|\/)/i.test(x)).map(x=>x.split('?')[0]);
const missing=local.filter(file=>!fs.existsSync(path.join(review,file)));
assert.deepEqual(missing,[],'Recurso JS/CSS no copiado a v313');
assert.ok(!html.includes('?build=v309-')&&!html.includes('?build=v308-'),'Caché de versión anterior');
assert.ok(html.includes('?build=v317-correctiva'));
for(const name of ['gestion-usuarios-v265.js','facultades-v242.js','worker-model-v265.js',
 'investigacion-accidentes-v305.js','investigacion-flujo-v308.js',
 'causas-datos-v308.js','causas-catalogo-v308.js','revisores-busqueda-v308.js']){
 assert.ok(local.includes(name),'Falta módulo original: '+name);
}
assert.ok(!local.some(x=>x.startsWith('facultades-cierre-v308.')),'El panel adicional no debe existir');
assert.ok(!html.includes('facultades-cierre-v308'),'No se debe cargar el panel que el usuario rechazó');
assert.ok(scripts.indexOf('gestion-usuarios-v265.js?build=v317-correctiva')
 <scripts.indexOf('investigacion-accidentes-v305.js?build=v317-correctiva'));
assert.ok(scripts.indexOf('causas-datos-v308.js?build=v317-causas-integradas')
 <scripts.indexOf('causas-catalogo-v308.js?build=v317-causas-integradas'));
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
assert.ok(read(review,'investigacion-accidentes-v305.js').includes('/v333-review'),
 'Ruta de investigación no adaptada a v333');
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
assert.equal(manifest.version,333);
assert.equal(manifest.integracion_v313.no_publicada,true);
assert.equal(manifest.integracion_v313.modificacion_supabase,false);
const unaffected=['operaciones-v242.js','storage-v242.js',
 'people-areas-v244.js','pending-dashboard-v250.js','risk-catalog-v243.js','appearance-v242.js'];
for(const name of unaffected){
 assert.equal(read(review,name),read(older,name),'Se alteró componente ajeno: '+name);
}
// La orden maestra exige corregir finalización. Verificar que el resto del módulo
// de persistencia permanezca idéntico. El comportamiento cambiado tiene su propia suite.
function fueraDeFinalizacion(texto){
 const inicio=texto.indexOf(' async function finalizeReport()');
 const fin=texto.indexOf(' async function startNew()',inicio);
 assert.ok(inicio>=0&&fin>inicio);
 return texto.slice(0,inicio)+texto.slice(fin);
}
const cloud=read(review,'cloud-v242.js');
const observerStart=cloud.indexOf(' const writeObserver=');
const observerEnd=cloud.indexOf(' async function finalizeReport()',observerStart);
const oldCloud=read(older,'cloud-v242.js');
const oldObserverStart=oldCloud.indexOf(' new MutationObserver');
const oldObserverEnd=oldCloud.indexOf(' async function finalizeReport()',oldObserverStart);
assert.ok(observerStart>=0&&observerEnd>observerStart);
assert.ok(cloud.includes("window.addEventListener('pagehide',()=>writeObserver.disconnect()"));
const observerNormalized=cloud.slice(0,observerStart)+oldCloud.slice(oldObserverStart,oldObserverEnd)+cloud.slice(observerEnd);
assert.equal(fueraDeFinalizacion(observerNormalized.replace("!write||el.dataset.hysArchiveEditAllowed==='false'","!write")),fueraDeFinalizacion(oldCloud));
const config = read(review,'config-v242.js');
const configBoundary = config.indexOf('// El backend de esta copia');
assert.ok(configBoundary > 0);
assert.equal(config.slice(0,configBoundary).trimEnd().replace('HYS298_ENABLE_REMOTE_READS=false','HYS298_ENABLE_REMOTE_READS=true'),read(older,'config-v242.js').trimEnd());
const authAnterior=old.match(/  const client=parentClient\|\|window.supabase.createClient[\s\S]*?  window.reportesHysSupabase=client;/)[0];
const pdfBlock=/\/\* v239:[\s\S]*?(?=<\/script>)/;
const previousPdf=old.match(pdfBlock);
assert.ok(previousPdf&&html.match(pdfBlock),'Bloque de PDF ausente');
const startValidation=/function validarDatosInicioParaPDF\([\s\S]*?(?=window.addEventListener\("afterprint")/;
const previousValidation=old.match(startValidation);
assert.ok(previousValidation&&html.match(startValidation),'Validación de Inicio ausente');
const filenameBlock=/function nombreBaseArchivo\([\s\S]*?(?=function nombreArchivoPDF)/;
const previousFilename=old.match(filenameBlock);
assert.ok(previousFilename&&html.match(filenameBlock),'Formato de nombre de archivo ausente');
let normalized=html
 .replace('async function renderArchivedReports(rows){','async function renderArchivedReports(){')
 .replace('let list;try{list=Array.isArray(rows)?rows:await getArchivedReports();}','let list;try{list=await getArchivedReports();}')
 .replace(filenameBlock,()=>previousFilename[0])
 .replace(startValidation,()=>previousValidation[0])
 .replace(pdfBlock,()=>previousPdf[0])
 .replace('if(window.Hys319Archive?.enabled())return window.Hys319Archive.list();','')
 .replace(' if(window.Hys319Archive?.enabled())return window.Hys319Archive.read(id,needPdf);\n','')
 .replace('data-hys-archive-edit-allowed="'+ "'+archiveEditAvailable(r)+'" +'" ','')
 .replace("if(b.dataset.hysArchiveEditAllowed!=='true')return;",'')
 .replace(/  \/\/ HYS314_LOCAL_ROUTING_BEGIN[\s\S]*?  window.reportesHysSupabase=client;/,authAnterior)
 .replaceAll('?build=v317-correctiva','?build=v310-facultades-lista')
 .replaceAll('?build=v317-causas-integradas','?build=v310-causas-integradas')
 .replaceAll('?build=v317-buscador-revisores','?build=v310-buscador-revisores');
assert.equal(normalized,old,'Se alteraron elementos inesperados de la interfaz avanzada v310');
assert.ok(fs.existsSync(path.join(review,'demo-final-causas-v308.html')));
console.log('RESULTADO v333: '+local.length+' recursos completos, 153 causas, punto 10 libre,');
console.log('listas originales con nuevas facultades, panel extra eliminado, módulos restantes intactos.');
dom.window.close();