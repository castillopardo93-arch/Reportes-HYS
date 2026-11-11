/* Reportes HYS v291: validación de seguridad sin escrituras ni identidades reales. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../v334-review');
const Faculty=require(path.join(dir,'faculty-model-v261.js'));
const Roles=require(path.join(dir,'role-control-v262.js'));
const Access=require(path.join(dir,'control-accesos-v278.js'));
const cloud=fs.readFileSync(path.join(dir,'cloud-v242.js'),'utf8');
const flags=fs.readFileSync(path.join(dir,'config-v242.js'),'utf8');
const assertions=[];
function check(title,fn){assertions.push({title,fn})}
function makeAccess(modules=['APR'],module='APR',role='administrador_global',write=true){
 const uid='6ab42510-9163-4f15-a2df-622fa5914a77';
 const profile={usuario_id:uid,rol:role,activo:true,nombre:'Administración QA'};
 const perms=[{modulo:'APR',puede_ver:true,puede_editar:true,areas:{activa:true}}];
 const current={selectedModule:module,userId:uid,profile,modules,permissions:perms,offline:false};
 const access=()=>({userId:uid,selectedModule:module,profile,modules,permissions:perms});
 const window={HYS242_DEPLOYMENT_READY:false,HYS250_LOCAL_EDIT:write};
 return {window,current,access};
}
const match=cloud.match(/function editable\(\)\{[^\n]*\}/);
if(!match)throw Error('No se encuentra la función de control de escritura.');
const executable=new Function('window','current','access',match[0]+';return editable();');
const areaRows=[{id:'A1',modulo:'APR',nombre:'VA4',activa:true},{id:'A2',modulo:'APR',nombre:'VA5',activa:false},{id:'A3',modulo:'OTROS',nombre:'VA4',activa:true}];
const allowed=()=>true;
const scope=ids=>({APR:{ver:true,areas:ids}});
check('Área activa autorizada',()=>assert.equal(Faculty.validateAreas(scope(['A1']),areaRows,allowed,()=>true).ok,true));
check('Área desactivada rechazada',()=>assert.match(Faculty.validateAreas(scope(['A2']),areaRows,allowed,()=>true).error,/desactivada/i));
check('Área inexistente rechazada',()=>assert.equal(Faculty.validateAreas(scope(['INVALIDA']),areaRows,allowed,()=>true).ok,false));
check('Área perteneciente a otra tarjeta rechazada',()=>assert.equal(Faculty.validateAreas(scope(['A3']),areaRows,allowed,()=>true).ok,false));
check('Área no autorizada rechazada',()=>assert.equal(Faculty.validateAreas(scope(['A1']),areaRows,()=>false,()=>true).ok,false));
check('Tarjeta activa requiere al menos un área',()=>assert.equal(Faculty.validateAreas(scope([]),areaRows,allowed,()=>true).ok,false));
check('Tarjeta no habilitada no exige áreas',()=>assert.equal(Faculty.validateAreas({APR:{ver:false,areas:[]}},areaRows,allowed,()=>true).ok,true));
const id='6ab42510-9163-4f15-a2df-622fa5914a77';
const target={usuario_id:'b1086b38-e1e9-4dd8-8fa3-0d7024d12e47',rol:'usuario'};
const actor={userId:id,profile:{usuario_id:id,rol:'administrador_global',activo:true}};
check('Cambio rol autorizado requiere administrador válido',()=>assert.equal(Roles.mayChangeRole(actor,target),true));
check('Cambio rol rechaza ficha nula',()=>assert.equal(Roles.mayChangeRole(actor,null),false));
check('Cambio rol rechaza ficha incompleta',()=>assert.equal(Roles.mayChangeRole(actor,{rol:'usuario'}),false));
check('Cambio rol rechaza el propio rol',()=>assert.equal(Roles.mayChangeRole(actor,{...target,usuario_id:id}),false));
check('Cambio rol protege administrador global de destino',()=>assert.equal(Roles.mayChangeRole(actor,{...target,rol:'administrador_global'}),false));
check('Cambio rol comprueba identidad actual del administrador',()=>assert.equal(Roles.mayChangeRole({...actor,userId:'otro'},target),false));
check('Cambio rol no se permite a supervisor',()=>assert.equal(Roles.mayChangeRole({userId:id,profile:{usuario_id:id,rol:'supervisor',activo:true}},target),false));
check('Cambio de rol borra facultades especiales no autorizadas',()=>{const x=Roles.roleTransitionSpecials('administrador_area','usuario',{APR:{facultades:{users:true}}},['APR'],{APR:{ver:true,areas:['A1']}});assert.deepEqual(x.APR.facultades,{});});
check('Administrador solo escribe en tarjeta autorizada',()=>{const v=makeAccess(['APR'],'APR');assert.equal(executable(v.window,v.current,v.access),true);});
check('Administrador no escribe en tarjeta denegada',()=>{const v=makeAccess(['APR'],'OTROS');assert.equal(executable(v.window,v.current,v.access),false);});
check('Un usuario necesita módulo permitido y permiso de edición',()=>{const v=makeAccess(['APR'],'APR','usuario');assert.equal(executable(v.window,v.current,v.access),true);v.current.permissions[0].puede_editar=false;assert.equal(executable(v.window,v.current,v.access),false);});
check('Sesión distinta bloquea edición y guardado local',()=>{const v=makeAccess();assert.equal(executable(v.window,v.current,()=>({...v.access(),userId:'otra-cuenta'})),false);});
check('Cambio de tarjeta sin refrescar sesión bloquea escritura',()=>{const v=makeAccess();assert.equal(executable(v.window,v.current,()=>({...v.access(),selectedModule:'OTROS'})),false);});
check('Perfil inactivo bloquea guardado',()=>{const v=makeAccess();v.current.profile.activo=false;assert.equal(executable(v.window,v.current,v.access),false);});
check('Sin autorización de guardado local no se edita',()=>{const v=makeAccess(['APR'],'APR','administrador_global',false);assert.equal(executable(v.window,v.current,v.access),false);});
check('No activar servidor ni gestión de usuarios en versión de desarrollo',()=>{assert.match(flags,/HYS242_ENABLE_CENTRAL=false/);assert.match(flags,/HYS242_DEPLOYMENT_READY=false/);assert.match(flags,/HYS257_ENABLE_USER_MANAGEMENT=false/);});
check('Cambio de acceso inválido sin motivo o confirmación',()=>{const t={...target,nombre:'Usuario QA',activo:true,revision:3,ambitos:{APR:{ver:true}}};assert.ok(Access.validate({access:actor,target:t,operation:'suspend',reason:'corto',confirmName:t.nombre}));});
const validTarget={...target,nombre:'Usuario QA',activo:true,revision:3,ambitos:{APR:{ver:true}}};
function mockClient(nextRevision,afterState=false){
 let listed=0,writeCalls=0;
 const client={rpc:async(name,payload)=>{
  if(name==='hys242_listar_usuarios'){listed++;return {data:[{...validTarget,activo:listed===1?true:afterState,revision:listed===1?3:nextRevision}],error:null};}
  if(name==='hys242_guardar_usuario'){writeCalls++;return {data:{ok:true},error:null};}
  return {data:null,error:{message:'RPC inesperada'}};
 }};
 return {client,calls:()=>writeCalls};
}
check('Acceso: revisión posterior debe incrementarse',async()=>{const q=mockClient(4,false);const r=await Access.apply({client:q.client,access:actor,target:validTarget,operation:'suspend',reason:'Acceso suspendido por medida aprobada',confirmName:'Usuario QA'});assert.equal(r.user.revision,4);assert.equal(q.calls(),1);});
check('Acceso: rechazar estado sin nueva revisión confirmada',async()=>{const q=mockClient(3,false);await assert.rejects(()=>Access.apply({client:q.client,access:actor,target:validTarget,operation:'suspend',reason:'Acceso suspendido por medida aprobada',confirmName:'Usuario QA'}),/revisión nuevos/i);});
check('Acceso: rechazar estado incorrecto aunque aumente revisión',async()=>{const q=mockClient(4,true);await assert.rejects(()=>Access.apply({client:q.client,access:actor,target:validTarget,operation:'suspend',reason:'Acceso suspendido por medida aprobada',confirmName:'Usuario QA'}),/revisión nuevos/i);});
(async()=>{for(const x of assertions){await x.fn();console.log('OK '+String(assertions.indexOf(x)+1).padStart(2,'0')+' · '+x.title);}console.log('PASS · '+assertions.length+' pruebas de seguridad y guardado, sin escrituras reales.');})().catch(e=>{console.error(e);process.exitCode=1});
