/* QA seguridad de búsqueda de revisores v308 — solo perfiles ficticios */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const app=path.resolve(__dirname,'../v311-review');
const read=name=>fs.readFileSync(path.join(app,name),'utf8');
function init({role='usuario',active=true,source}={}){
 const dom=new JSDOM(read('demo-v308.html'),{url:'https://hys.example/v311-review/demo-v308.html',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 w.HYS308_DEMO_PAGE=false;w.Hys285Pillars={close:()=>true};
 w.__REPORTES_HYS_ACCESS__={userId:'fake-current-user',profile:{
  usuario_id:'fake-current-user',nombre:'Persona Prueba',rol:role,activo:active
 },modules:[],selectedModule:null};
 const requests=[];
 w.reportesHysSupabase={rpc:async(name)=>{
  requests.push(name);return {data:source||[],error:null};
 }};
 w.eval(read('investigacion-accidentes-v305.js'));
 w.eval(read('investigacion-flujo-v308.js'));
 w.eval(read('revisores-busqueda-v308.js'));
 return {w,d,requests,dom};
}
(async()=>{
 const basic=init({role:'usuario'});
 await new Promise(ok=>setTimeout(ok,5));
 assert.equal(basic.requests.length,0,'Usuario sin facultades no puede consultar directorio restringido');
 assert.equal(basic.w.Hys308ReviewerSearch.directoryStatus().includes('requiere un directorio'),true);
 basic.d.getElementById('hys306OpenFlash').click();
 assert.equal(basic.d.getElementById('hys308SendFlash').disabled,true);
 assert.ok(basic.d.getElementById('hys308ReviewerSearchFlash'));
 basic.dom.window.close();
 const users=[
  {usuario_id:'a1',nombre:'María Pérez',activo:true,rol:'supervisor'},
  {usuario_id:'a2',nombre:'Andrés Gonzáles',activo:true,rol:'usuario'},
  {usuario_id:'a3',nombre:'Cuenta desactivada',activo:false,rol:'supervisor'},
  {usuario_id:'a4',nombre:'',activo:true,rol:'supervisor'}
 ];
 const admin=init({role:'administrador_global',source:users});
 await new Promise(ok=>setTimeout(ok,5));
 admin.d.getElementById('hys306OpenFlash').click();
 assert.deepEqual(admin.requests,['hys242_listar_usuarios']);
 const input=admin.d.getElementById('hys308ReviewerSearchFlash');
 input.value='maria';input.dispatchEvent(new admin.w.Event('input',{bubbles:true}));
 const options=[...admin.d.getElementById('hys308ReviewerListFlash').querySelectorAll('[role="option"]')];
 assert.equal(options.length,1);
 assert.ok(options[0].textContent.includes('María Pérez'),'Búsqueda tolerante a tildes');
 options[0].click();
 assert.equal(admin.d.getElementById('hys308ReviewerFlash').value,'a1');
 assert.ok(!admin.d.querySelector('#hys308ReviewerListFlash').textContent.includes('Cuenta desactivada'));
 assert.equal(admin.d.getElementById('hys308SendFlash').disabled,true,'No habilitar envíos reales antes de permisos RLS');
 admin.dom.window.close();
 console.log('OK buscador: usuarios activos, tildes, rol, consulta admin de solo lectura y cuenta básica sin acceso a directorio.');
})().catch(e=>{console.error(e);process.exitCode=1;});
