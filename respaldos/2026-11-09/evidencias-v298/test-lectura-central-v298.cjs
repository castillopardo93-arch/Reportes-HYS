/* HYS v298: conexión de lectura autenticada, sin escritura ni credenciales reales. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const base=path.resolve(__dirname,'../v298-review');
const read=require(path.join(base,'read-gate-v298.js'));
const src=n=>fs.readFileSync(path.join(base,n),'utf8');
const config=src('config-v242.js'),cloud=src('cloud-v242.js'),html=src('index.html'),gate=src('read-gate-v298.js');
const uid='00000000-0000-4000-8000-000000000298';
const perm={modulo:'APR',puede_ver:true,puede_editar:true};
const access=()=>({userId:uid,profile:{usuario_id:uid,nombre:'Usuario de prueba',rol:'usuario',activo:true},modules:['APR'],permissions:[{...perm}],selectedModule:'APR'});
const flags={HYS298_ENABLE_REMOTE_READS:true,HYS242_ENABLE_CENTRAL:false,HYS242_DEPLOYMENT_READY:false,HYS292_REMOTE_WRITE_AUTHORIZED:false};
const nav={onLine:true};
function client(options={}){
 const calls=[];
 const auth={getUser:async()=>{calls.push('auth.getUser');if(options.onAuth)options.onAuth();return options.authReturn||{data:{user:{id:uid}},error:null}}};
 const rpc=async(name,args)=>{
  calls.push(name);
  if(options.onRpc)options.onRpc(name,args);
  if(name==='hys242_contexto')return options.contextReturn||{data:{profile:{usuario_id:uid,activo:true},permissions:[{...perm}]},error:null};
  if(name==='hys242_consultar_informes')return options.listReturn||{data:[{id:'v242-qa-test'}],error:null};
  throw Error('RPC no autorizada en pruebas');
 };
 return {auth,rpc,calls};
}
let tests=0;
async function check(title,fn){await fn();tests++;console.log('OK '+String(tests).padStart(2,'0')+' · '+title)}
(async()=>{
 await check('Solo lectura: función autorizada con usuario activo, módulo y permiso real',()=>assert.equal(read.permitted(access(),'APR',flags,client(),nav),true));
 await check('Solo lectura: deniega bandera desactivada',()=>assert.equal(read.permitted(access(),'APR',{...flags,HYS298_ENABLE_REMOTE_READS:false},client(),nav),false));
 await check('Solo lectura: deniega perfil inactivo',()=>{const a=access();a.profile.activo=false;assert.equal(read.permitted(a,'APR',flags,client(),nav),false)});
 await check('Solo lectura: deniega identidad de perfil distinta',()=>{const a=access();a.profile.usuario_id='otro';assert.equal(read.permitted(a,'APR',flags,client(),nav),false)});
 await check('Solo lectura: deniega tarjeta no seleccionada',()=>assert.equal(read.permitted(access(),'OTROS',flags,client(),nav),false));
 await check('Solo lectura: deniega tarjeta fuera de módulos habilitados',()=>{const a=access();a.modules=[];assert.equal(read.permitted(a,'APR',flags,client(),nav),false)});
 await check('Solo lectura: deniega permiso puede_ver falso',()=>{const a=access();a.permissions[0].puede_ver=false;assert.equal(read.permitted(a,'APR',flags,client(),nav),false)});
 await check('Solo lectura: deniega cliente sin RPC',()=>assert.equal(read.permitted(access(),'APR',flags,{auth:{}},nav),false));
 await check('Solo lectura: deniega modo sin conexión',()=>assert.equal(read.permitted(access(),'APR',flags,client(),{onLine:false}),false));
 await check('La puerta de lectura no depende de la bandera de escritura central',()=>{const c=client();assert.equal(read.permitted(access(),'APR',flags,c,nav),true);assert.equal(flags.HYS242_ENABLE_CENTRAL,false)});
 await check('Preflight verifica Auth, contexto y consulta exclusivamente lectura',async()=>{
  const c=client(),r=await read.preflight({client:c,access:access(),module:'APR',nav,flags});
  assert.deepEqual(c.calls,['auth.getUser','hys242_contexto','hys242_consultar_informes']);
  assert.equal(r.verified,true);assert.equal(r.reportsOnFirstPage,1);assert.equal(r.remoteWrites,false);
 });
 await check('Preflight no devuelve los informes ni nombres consultados',async()=>{
  const c=client({listReturn:{data:[{id:'id-prueba',owner:'Nombre personal'}],error:null}});
  const r=await read.preflight({client:c,access:access(),module:'APR',nav,flags});
  assert.equal(JSON.stringify(r).includes('Nombre personal'),false);assert.equal(r.reportsOnFirstPage,1);
 });
 await check('Preflight niega identidad Auth diferente y no consulta RPC',async()=>{
  const c=client({authReturn:{data:{user:{id:'otro'}},error:null}});
  await assert.rejects(()=>read.preflight({client:c,access:access(),module:'APR',nav,flags}),/identidad/);
  assert.deepEqual(c.calls,['auth.getUser']);
 });
 await check('Preflight niega error de sesión Auth',async()=>{
  const c=client({authReturn:{data:{user:null},error:{message:'sesión caducada'}}});
  await assert.rejects(()=>read.preflight({client:c,access:access(),module:'APR',nav,flags}),/identidad/);
 });
 await check('Preflight niega contexto de otro perfil',async()=>{
  const c=client({contextReturn:{data:{profile:{usuario_id:'otro',activo:true},permissions:[perm]},error:null}});
  await assert.rejects(()=>read.preflight({client:c,access:access(),module:'APR',nav,flags}),/permisos/);
  assert.equal(c.calls.includes('hys242_consultar_informes'),false);
 });
 await check('Preflight niega perfil revocado',async()=>{
  const c=client({contextReturn:{data:{profile:{usuario_id:uid,activo:false},permissions:[perm]},error:null}});
  await assert.rejects(()=>read.preflight({client:c,access:access(),module:'APR',nav,flags}),/permisos/);
 });
 await check('Preflight niega ámbito sin puede_ver',async()=>{
  const c=client({contextReturn:{data:{profile:{usuario_id:uid,activo:true},permissions:[{...perm,puede_ver:false}]},error:null}});
  await assert.rejects(()=>read.preflight({client:c,access:access(),module:'APR',nav,flags}),/permisos/);
 });
 await check('Preflight niega RPC contexto con error',async()=>{
  const c=client({contextReturn:{data:null,error:{message:'RLS denegada'}}});
  await assert.rejects(()=>read.preflight({client:c,access:access(),module:'APR',nav,flags}),/permisos/);
 });
 await check('Preflight niega RPC listado con error',async()=>{
  const c=client({listReturn:{data:null,error:{message:'sin permiso'}}});
  await assert.rejects(()=>read.preflight({client:c,access:access(),module:'APR',nav,flags}),/índice/);
 });
 await check('Preflight niega respuesta de listado que no sea array',async()=>{
  const c=client({listReturn:{data:{id:'falso'},error:null}});
  await assert.rejects(()=>read.preflight({client:c,access:access(),module:'APR',nav,flags}),/índice/);
 });
 await check('Preflight detecta cambio de sesión durante Auth',async()=>{
  let valid=true;const c=client({onAuth:()=>{valid=false}});
  await assert.rejects(()=>read.preflight({client:c,access:access(),module:'APR',nav,flags,stillValid:()=>valid}),/identidad/);
 });
 await check('Preflight detecta cambio de sesión durante contexto',async()=>{
  let valid=true;const c=client({onRpc:n=>{if(n==='hys242_contexto')valid=false}});
  await assert.rejects(()=>read.preflight({client:c,access:access(),module:'APR',nav,flags,stillValid:()=>valid}),/permisos/);
 });
 await check('Preflight detecta cambio de sesión durante consulta',async()=>{
  let valid=true;const c=client({onRpc:n=>{if(n==='hys242_consultar_informes')valid=false}});
  await assert.rejects(()=>read.preflight({client:c,access:access(),module:'APR',nav,flags,stillValid:()=>valid}),/índice/);
 });
 await check('Preflight sin autorización local nunca solicita datos remotos',async()=>{
  const c=client(),a=access();a.modules=[];
  await assert.rejects(()=>read.preflight({client:c,access:a,module:'APR',nav,flags}),/no habilitado/);
  assert.equal(c.calls.length,0);
 });
 await check('CanReadRemote comprueba la sesión global efectiva',()=>{
  const sandbox={__REPORTES_HYS_ACCESS__:access(),reportesHysSupabase:client(),navigator:nav,...flags};
  const dom=new JSDOM('<html></html>',{url:'https://hys.local',runScripts:'outside-only'});
  Object.assign(dom.window,sandbox);
  dom.window.eval(gate);
  assert.equal(dom.window.Hys298ReadGate.canReadRemote(dom.window.navigator,dom.window),true);
  dom.window.HYS298_ENABLE_REMOTE_READS=false;
  assert.equal(dom.window.Hys298ReadGate.canReadRemote(dom.window.navigator,dom.window),false);
  dom.window.close();
 });
 await check('HTML carga política de lectura antes del módulo de guardado',()=>{
  const ix=html.indexOf('read-gate-v298.js'),c=html.indexOf('cloud-v242.js');
  assert.ok(ix>=0&&c>ix);
 });
 await check('Historial y PDF central usan puerta de lectura independiente',()=>{
  assert.match(cloud,/function canReadCentral\(\)/);
  assert.match(cloud,/async function refreshReports\([^)]*\)\{if\(!canReadCentral\(\)/);
  assert.match(cloud,/if\(!module\|\|!canReadCentral\(\)\)/);
 });
 await check('Lectura de PDF local usa la misma autorización de solo lectura',()=>{
  assert.match(html,/Hys294RemoteArchive\.chooseArchiveSource\(local,window\.Hys298ReadGate\.canReadRemote/);
  assert.match(html,/Hys293ArchivePolicy\.availability\(c\.value,window\.Hys298ReadGate\.canReadRemote/);
 });
 await check('No hay RPC de mutación en módulo de lectura',()=>{
  for(const t of ['hys242_guardar','hys282_catalogo_mutar','updateUser','resetPasswordForEmail','insert(','upsert(','delete('])assert.ok(!gate.includes(t));
 });
 await check('La interfaz ofrece comprobación manual sin contraseñas',()=>{
  assert.match(cloud,/Comprobar lectura Supabase/);
  assert.match(cloud,/Hys298ReadGate\.preflight/);
  assert.match(cloud,/Escritura central desactivada/);
 });
 await check('Guardado central sigue condicionado por tres banderas',()=>{
  assert.match(cloud,/function central\(\)\{return window\.HYS292_REMOTE_WRITE_AUTHORIZED===true&&window\.HYS242_ENABLE_CENTRAL===true&&window\.HYS242_DEPLOYMENT_READY===true\}/);
  assert.match(config,/HYS242_ENABLE_CENTRAL=false/);
  assert.match(config,/HYS242_DEPLOYMENT_READY=false/);
  assert.match(config,/HYS292_REMOTE_WRITE_AUTHORIZED=false/);
  assert.match(config,/HYS298_ENABLE_REMOTE_READS=true/);
 });
 await check('El botón de recuperación remota de borradores no habilita escritura',()=>{
  assert.match(cloud,/\$\('cloudLoad242'\)\.disabled=!write\|\|!central\(\)/);
 });
 console.log('PASS · '+tests+' pruebas v298 (sin escrituras ni autenticación real).');
})().catch(e=>{console.error(e);process.exitCode=1});
