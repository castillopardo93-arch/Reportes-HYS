/* HYS v300 · Pantallas por facultades y versión visible únicamente en selector. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const base=path.resolve(__dirname,'../v300-review');
const s=n=>fs.readFileSync(path.join(base,n),'utf8');
const html=s('index.html'),cloud=s('cloud-v242.js'),appearance=s('appearance-v242.js'),
 operations=s('operaciones-v242.js'),pilares=s('pilares-indicadores-v285.js'),config=s('config-v242.js');
const dom=new JSDOM(html,{url:'https://pruebas.hys.local/v300-review/index.html'});
const doc=dom.window.document;
const landingStart=html.indexOf('function landingModule256(');
const landingEnd=html.indexOf('  async function loadAccess(',landingStart);
assert.ok(landingStart>0&&landingEnd>landingStart);
const landing=new Function(html.slice(landingStart,landingEnd)+';return landingModule256;')();
let count=0;
async function check(label,fn){await fn();count++;console.log('OK '+String(count).padStart(2,'0')+' · '+label)}
function modeEnv(profile,modules){
 const win={__REPORTES_HYS_ACCESS__:{profile:{rol:profile},modules},reportesHysAdminSync(){}};
 const src=html.slice(html.indexOf('  function setMode(mode){'),html.indexOf('  window.reportesHysSetMode=setMode;'));
 assert.ok(src.startsWith('  function setMode(mode){'));
 const maker=new Function('window','document','embeddedOtros','chooser','otherModule','layout','header','MODE_KEY','localStorage','location','URLSearchParams',src+'\nreturn setMode;');
 const isolated=new JSDOM('<body><header></header><div id="moduleChooser"></div><div id="otherModule"></div><div class="layout"></div><iframe id="otherAprApp"></iframe></body>',{url:'https://hys.local/v300-review/index.html'});
 const d=isolated.window.document;
 const get=id=>d.getElementById(id);
 const win2={...win,reportesHysAdminSync(){}};
 const setMode=maker(win2,d,false,get('moduleChooser'),get('otherModule'),d.querySelector('.layout'),d.querySelector('header'),'TEST',isolated.window.localStorage,isolated.window.location,URLSearchParams);
 return {setMode,doc:d,win:win2,close:()=>isolated.window.close()};
}
function checkGuards(){
 const begin=html.indexOf('  window.reportesHysChooseModule=async module=>');
 const end=html.indexOf('    const ticket=++moduleTransition',begin);
 assert.ok(begin>0&&end>begin);
 const segment=html.slice(begin,end);
 const condition=segment.match(/if\(([\s\S]*?)\)return false;/);
 assert.ok(condition);
 return new Function('target','access','closing','submitting','return ('+condition[1]+');');
}
const deny=checkGuards();
(async()=>{
 await check('Selector muestra exclusivamente v300',()=>{
  const kicker=doc.querySelector('#moduleChooser .chooser-kicker');
  assert.match(kicker.textContent,/v300/);
  assert.doesNotMatch(kicker.textContent,/v(?:242|287|289|298|299)/);
 });
 await check('Pantalla de Inicio carece de banner de versión',()=>assert.equal(doc.querySelector('#devVersion242'),null));
 await check('Apariencia conserva la versión v300 solamente en selector',()=>{
  assert.match(appearance,/setText\('#moduleChooser \.chooser-kicker',c\.text\.company\+' · v300 · Revisión'\)/);
  assert.doesNotMatch(appearance,/c\.text\.company\+' · v242 · Desarrollo'/);
 });
 await check('Guardado local no muestra v298',()=>{
  assert.doesNotMatch(cloud,/v298 · Lectura/);
  assert.match(cloud,/Lectura de Supabase autorizada/);
 });
 await check('Seguimiento no muestra v242 en mensajes de error',()=>{
  assert.doesNotMatch(operations,/La sesión cambió o v242 no está activada/);
 });
 await check('Apariencia no muestra v242 en acciones compartidas',()=>{
  assert.doesNotMatch(appearance,/compartida v242 pendiente/);
 });
 await check('Indicadores no muestran v287',()=>{
  assert.doesNotMatch(pilares,/Panel integrado en v287/);
 });
 await check('Los recursos locales tienen etiqueta de compilación v300',()=>{
  const resources=[...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)].map(x=>x[1])
   .filter(x=>!/^https?:|^\/\//.test(x)&&/\.(?:js|css)\?/.test(x));
  assert.ok(resources.length>=63);
  assert.ok(resources.every(x=>x.endsWith('?build=v300-ui-09nov')));
 });
 await check('Cuenta usuario con APR únicamente entra directamente',()=>assert.equal(landing({rol:'usuario'},['APR'],null,null,false),'APR'));
 await check('Cuenta usuario con OTROS únicamente entra directamente',()=>assert.equal(landing({rol:'usuario'},['OTROS'],null,null,false),'OTROS'));
 await check('Supervisor con una tarjeta entra directamente',()=>assert.equal(landing({rol:'supervisor'},['OTROS'],null,null,false),'OTROS'));
 await check('Administrador delegado con una tarjeta entra directamente',()=>assert.equal(landing({rol:'administrador_area'},['APR'],null,null,false),'APR'));
 await check('Administrador General conserva el selector con una tarjeta',()=>assert.equal(landing({rol:'administrador_global'},['APR'],null,null,false),null));
 await check('Administrador General conserva la tarjeta activa al renovar sesión',()=>assert.equal(landing({rol:'administrador_global'},['APR','OTROS'],'APR',null,false),'APR'));
 await check('Cuenta ordinaria con dos tarjetas puede elegir',()=>assert.equal(landing({rol:'usuario'},['APR','OTROS'],null,null,false),null));
 await check('Cuenta ordinaria con dos tarjetas conserva selección',()=>assert.equal(landing({rol:'usuario'},['APR','OTROS'],'OTROS',null,false),'OTROS'));
 await check('Cuenta ordinaria con dos tarjetas conserva selección recordada',()=>assert.equal(landing({rol:'usuario'},['APR','OTROS'],null,'APR',false),'APR'));
 await check('Administración delegada con dos tarjetas abre selector',()=>assert.equal(landing({rol:'administrador_area'},['APR','OTROS'],null,'APR',false),null));
 await check('Tarjeta incrustada OTROS se limita a OTROS',()=>assert.equal(landing({rol:'usuario'},['APR','OTROS'],null,null,true),'OTROS'));
 await check('Tarjeta incrustada sin autorización OTROS no accede',()=>assert.equal(landing({rol:'usuario'},['APR'],null,null,true),null));
 await check('Una tarjeta deniega volver a selector a usuario',()=>assert.equal(deny('',{modules:['APR'],profile:{rol:'usuario'}},false,false),true));
 await check('Una tarjeta deniega volver a selector a supervisor',()=>assert.equal(deny('',{modules:['OTROS'],profile:{rol:'supervisor'}},false,false),true));
 await check('Una tarjeta deniega volver a selector a administrador delegado',()=>assert.equal(deny('',{modules:['OTROS'],profile:{rol:'administrador_area'}},false,false),true));
 await check('Administrador General puede volver a selector aun con una tarjeta',()=>assert.equal(deny('',{modules:['APR'],profile:{rol:'administrador_global'}},false,false),false));
 await check('Cuenta con dos tarjetas puede volver a selector',()=>assert.equal(deny('',{modules:['APR','OTROS'],profile:{rol:'usuario'}},false,false),false));
 await check('Se deniega intentar otra tarjeta sin facultad',()=>assert.equal(deny('OTROS',{modules:['APR'],profile:{rol:'usuario'}},false,false),true));
 await check('Se deniega valor de tarjeta desconocido',()=>assert.equal(deny('ADMIN',{modules:['APR','OTROS'],profile:{rol:'usuario'}},false,false),true));
 await check('Se deniega navegación durante cierre de sesión',()=>assert.equal(deny('APR',{modules:['APR'],profile:{rol:'usuario'}},true,false),true));
 await check('Botón Cambiar módulo se oculta con una tarjeta no global',()=>{
  assert.match(html,/\$\("moduleChange"\)\.hidden=modules\.length<=1&&profile\.rol!=='administrador_global'/);
 });
 await check('Botón especial Panel general existe para administrador de tarjeta única',()=>{
  assert.match(html,/modules\.length<=1\?'Panel general':'Cambiar módulo'/);
 });
 await check('Botón de ingreso principal se llama Cerrar sesión',()=>assert.equal(doc.getElementById('chooserLogout').textContent,'Cerrar sesión'));
 await check('La cinta lateral tiene defensa visual por rol',()=>{
  assert.match(html,/body:not\(\.hys-global-chooser\) #hysToolsRail\{display:none!important\}/);
 });
 await check('Usuario en el selector no obtiene clase de Administrador General',()=>{
  const e=modeEnv('usuario',['APR','OTROS']);e.setMode('');
  assert.equal(e.doc.body.classList.contains('module-choice'),true);
  assert.equal(e.doc.body.classList.contains('hys-global-chooser'),false);e.close();
 });
 await check('Administrador General sí obtiene clase de selector administrativo',()=>{
  const e=modeEnv('administrador_global',['APR','OTROS']);e.setMode('');
  assert.equal(e.doc.body.classList.contains('hys-global-chooser'),true);e.close();
 });
 await check('Al ingresar en módulo se elimina clase de administración',()=>{
  const e=modeEnv('administrador_global',['APR']);e.setMode('');
  assert.equal(e.doc.body.classList.contains('hys-global-chooser'),true);
  e.setMode('apr');assert.equal(e.doc.body.classList.contains('hys-global-chooser'),false);e.close();
 });
 await check('El menú Seguimiento exige Administrador General activo',()=>{
  assert.match(operations,/visible=a\?\.profile\?\.activo===true&&a\?\.profile\?\.rol==='administrador_global'/);
  assert.match(operations,/if\(!access\(\)\?\.profile\?\.activo\|\|access\(\)\?\.profile\?\.rol!=='administrador_global'\)return/);
 });
 await check('Las operaciones administrativas se cierran al perder la vista o rol',()=>{
  assert.match(operations,/if\(!visible\|\|\(mode==='users'&&\!canUsers\(\)\)\)/);
 });
 await check('Los scripts embebidos conservan sintaxis JavaScript válida',()=>{
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
   .filter(x=>!/\bsrc\s*=/.test(x[1])&&!/application\/json/i.test(x[1]));
  assert.ok(scripts.length>=5);scripts.forEach((x,i)=>new vm.Script(x[2],{filename:'inline-'+i+'.js'}));
 });
 await check('Los scripts JavaScript modificados son sintácticamente válidos',()=>{
  for(const [name,code] of [['cloud',cloud],['appearance',appearance],['operations',operations],['pilares',pilares]])
   new vm.Script(code,{filename:name+'.js'});
 });
 await check('La conexión central de escritura permanece cerrada',()=>{
  for(const key of ['HYS242_ENABLE_CENTRAL=false','HYS242_DEPLOYMENT_READY=false','HYS292_REMOTE_WRITE_AUTHORIZED=false'])assert.ok(config.includes(key));
 });
 await check('La lectura de Supabase sigue disponible con autorización independiente',()=>{
  assert.match(config,/HYS298_ENABLE_REMOTE_READS=true/);
  assert.match(cloud,/function canReadCentral\(\)/);
 });
 console.log('PASS · '+count+' pruebas v300 de interfaz, rol y versión visible; sin acceder a Supabase real.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>dom.window.close());
