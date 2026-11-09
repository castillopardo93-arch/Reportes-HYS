/* HYS v293: pruebas aisladas de evidencia local y foto. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const dir=path.resolve(__dirname,'../v293-review');
const policySrc=fs.readFileSync(path.join(dir,'archive-policy-v293.js'),'utf8');
const integritySrc=fs.readFileSync(path.join(dir,'integrity-v255.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const policy=require(path.join(dir,'archive-policy-v293.js'));
let passed=0;
async function check(title,fn){await fn();passed++;console.log('OK '+String(passed).padStart(2,'0')+' · '+title)}
const jpeg='data:image/jpeg;base64,/9j/2w==',png='data:image/png;base64,iVBORw0KGgo=';
const flags={HYS292_REMOTE_WRITE_AUTHORIZED:true,HYS242_ENABLE_CENTRAL:true,HYS242_DEPLOYMENT_READY:true};
const img=(data)=>({name:'evidencia.jpg',type:'image/jpeg',data});
function pack(photos){return {module:'APR',data:{activities:[[1,'APR','Área','Descripción',photos,{}]],inspections:[],findings:[]},history:[]}}
(async()=>{
 await check('Validación JPG incorporado',()=>assert.equal(policy.validatePhoto(img(jpeg)),true));
 await check('Validación PNG incorporado',()=>assert.equal(policy.validatePhoto(img(png)),true));
 await check('Adjunto SVG no autorizado',()=>assert.throws(()=>policy.validatePhoto(img('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')),/Formato/));
 await check('Adjunto ajeno a imágenes bloqueado',()=>assert.throws(()=>policy.validatePhoto(img('data:text/html;base64,PGgxPg==')),/Formato/));
 await check('Base64 vacío bloqueado',()=>assert.throws(()=>policy.validatePhoto(img('data:image/png;base64,')),/incompletos/));
 await check('Base64 truncado bloqueado',()=>assert.throws(()=>policy.validatePhoto(img('data:image/jpeg;base64,/9j/')),/incompletos/));
 await check('Foto excesivamente grande bloqueada',()=>assert.throws(()=>policy.validatePhoto(img('data:image/png;base64,'+'A'.repeat(32*1024*1024))),/demasiado grande/));
 await check('Solo dos banderas no habilitan el servidor',()=>assert.equal(policy.remoteEnabled({...flags,HYS292_REMOTE_WRITE_AUTHORIZED:false}),false));
 await check('Se necesitan tres autorizaciones explícitas',()=>assert.equal(policy.remoteEnabled(flags),true));
 await check('Sin conexión no se pide archivo remoto',()=>assert.equal(policy.canFetch({onLine:false},flags),false));
 await check('Sin las tres banderas no se pide archivo remoto',()=>assert.equal(policy.canFetch({onLine:true},{...flags,HYS292_REMOTE_WRITE_AUTHORIZED:false}),false));
 await check('Solo PDF local habilita descarga sin conexión',()=>assert.deepEqual(policy.availability({pdfBlob:{bytes:42},hasPdf:true},false),{hasPdf:true,hasReportData:false}));
 await check('PDF anunciado pero no descargado no se ofrece sin conexión',()=>assert.equal(policy.availability({remote:true,hasPdf:true},false).hasPdf,false));
 await check('PDF remoto disponible con autorización se ofrece',()=>assert.equal(policy.availability({remote:true,hasPdf:true},true).hasPdf,true));
 await check('Datos editables remotos solo con conexión autorizada',()=>assert.equal(policy.availability({remote:true,hasReportData:true},false).hasReportData,false));
 await check('Conexión autorizada permite recuperar datos remotos',()=>assert.equal(policy.availability({remote:true,hasReportData:true},true).hasReportData,true));
 await check('No se falsifican datos de un informe local',()=>assert.equal(policy.availability({remote:false,hasPdf:true},true).hasPdf,false));
 await check('Resumen nuevo conserva fotografía y PDF locales previos',()=>{
  const old={id:'v242-1',revision:1,pdfBlob:{bytes:10},reportData:pack([img(jpeg)]),filename:'anterior.pdf'};
  const next=policy.mergeRemoteSummary(old,{id:old.id,revision:2,filename:'nuevo.pdf',hasPdf:true,hasReportData:true});
  assert.strictEqual(next.pdfBlob,old.pdfBlob);assert.strictEqual(next.reportData,old.reportData);
  assert.equal(next.revision,1);assert.equal(next.remoteUpdateAvailable,true);assert.equal(next.latestRemoteRevision,2);
 });
 await check('Resumen obsoleto no reemplaza informe local nuevo',()=>assert.equal(policy.mergeRemoteSummary({id:'v242-1',revision:4,pdfBlob:{}},{id:'v242-1',revision:3}),null));
 await check('Resumen con misma revisión no borra PDF',()=>assert.equal(policy.mergeRemoteSummary({id:'v242-1',revision:2,pdfBlob:{}},{id:'v242-1',revision:2}),null));
 await check('Resumen nuevo sin PDF local conserva etiqueta de descarga remota',()=>{
  const entry=policy.mergeRemoteSummary(null,{id:'v242-1',revision:3,hasPdf:true,hasReportData:true});
  assert.equal(policy.availability(entry,false).hasPdf,false);
  assert.equal(policy.availability(entry,true).hasPdf,true);
 });
 await check('No se mezclan dos identificadores de informe',()=>assert.throws(()=>policy.mergeRemoteSummary({id:'v242-1',revision:1},{id:'v242-2',revision:2}),/mezclar/));
 await check('Archivo remoto sin datos locales no inventa contenido',()=>{
  const r=policy.mergeRemoteSummary({id:'v242-1',revision:1,remote:true,pdfBlob:null,reportData:null},{id:'v242-1',revision:2,hasPdf:true});
  assert.equal(r.pdfBlob,null);assert.equal(r.remoteUpdateAvailable,false);
 });
 await check('La validación real del formulario rechaza SVG y conserva JPEG',()=>{
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://hys.local/',runScripts:'outside-only'});
  dom.window.eval(policySrc);dom.window.eval(integritySrc);
  assert.equal(dom.window.Hys255Guard.validatePack(pack([img(jpeg)]),'APR').module,'APR');
  assert.throws(()=>dom.window.Hys255Guard.validatePack(pack([img('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')]),'APR'),/Formato/);
  dom.window.close();
 });
 await check('Ambas tarjetas utilizan validación de imágenes',()=>{
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://hys.local/',runScripts:'outside-only'});
  dom.window.eval(policySrc);dom.window.eval(integritySrc);
  assert.equal(dom.window.Hys255Guard.validatePack({module:'OTROS',data:{activities:[],inspections:[],findings:[[1,'F','Alta','Propuesta','Pendiente',[img(jpeg)],{}]]}},'OTROS').module,'OTROS');
  dom.window.close();
 });
 await check('HTML integra política antes de validación del formulario',()=>assert.match(html,/archive-policy-v293\.js"><\/script><script src="integrity-v255\.js"/));
 await check('Archivo PDF exige validación antes de conservarlo',()=>assert.match(html,/const p=pdfReport\|\|pack\(\);window\.Hys255Guard\.validatePack/));
 await check('Archivo remoto utiliza exactamente tres protecciones',()=>assert.match(html,/if\(window\.Hys293ArchivePolicy\.canFetch\(navigator,window\)\)return window\.Hys242\.fetchReport/));
 await check('Resumen remoto nuevo utiliza unión sin destruir archivo local',()=>assert.match(html,/Hys293ArchivePolicy\.mergeRemoteSummary\(existing,summary\)/));
 await check('Vista diferencia copia anterior y revisión central nueva',()=>assert.match(html,/Copia local de revisión anterior; existe una revisión central pendiente de recuperar/));
 await check('Editar se deshabilita cuando no están disponibles datos',()=>assert.match(html,/!r\.hasReportData\?'disabled '/));
 console.log('PASS · '+passed+' pruebas v293. No hay acceso a datos de usuarios ni escrituras remotas.');
})().catch(e=>{console.error(e);process.exitCode=1});
