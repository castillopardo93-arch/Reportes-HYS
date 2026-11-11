// Ejecutar desde la raíz del proyecto: node --test evidencias-v264/test-facultades-desde-cero.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const vm=require('node:vm');
const root=path.join(__dirname,'../v264-review');
const roles=require(path.join(root,'role-control-v262.js'));
const modules=['APR','OTROS'];
const scope={APR:{ver:true,editar:true,areas:['apr-va4']},OTROS:{ver:true,editar:false,areas:['otr-va4']}};
const former={APR:{areas_ids:['apr-va4'],facultades:{audit:true,view:true}},OTROS:{areas_ids:['otr-va4'],facultades:{users:true,approve:true}}};
function lab(){
 const data=new Map();
 const rootWindow={HYS263_SANDBOX:true,location:{pathname:'/Reportes-HYS/v264-review/laboratorio-integral-v264.html',search:''},
  localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v))},dispatchEvent:()=>{}};
 const src=fs.readFileSync(path.join(root,'backend-simulador-v263.js'),'utf8');
 vm.runInNewContext(src,{window:rootWindow,CustomEvent:class {constructor(type,params){this.type=type;this.detail=params?.detail}}});
 return {store:rootWindow.Hys263Lab,data};
}
test('quitar Administrador limpia las facultades especiales de ambas tarjetas',()=>{
 const next=roles.roleTransitionSpecials('administrador_area','supervisor',former,modules,scope);
 assert.equal(Object.keys(next.APR.facultades).length,0);
 assert.equal(Object.keys(next.OTROS.facultades).length,0);
});
test('volver a Administrador siempre empieza con facultades desmarcadas',()=>{
 const next=roles.roleTransitionSpecials('supervisor','administrador_area',former,modules,scope);
 for(const m of modules)assert.equal(Object.keys(next[m].facultades).length,0);
 assert.deepEqual(next.APR.areas_ids,['apr-va4']);
 assert.deepEqual(next.OTROS.areas_ids,['otr-va4']);
});
test('retirar y volver a elegir Administrador sin guardar tampoco recupera privilegios',()=>{
 const removed=roles.roleTransitionSpecials('administrador_area','usuario',former,modules,scope);
 const back=roles.roleTransitionSpecials('usuario','administrador_area',removed,modules,scope);
 for(const m of modules)assert.equal(Object.keys(back[m].facultades).length,0);
});
test('mantener el mismo rol no borra facultades actuales',()=>{
 assert.equal(roles.roleTransitionSpecials('administrador_area','administrador_area',former,modules,scope),former);
});
test('cambio guardado de Administrador a Supervisor revoca privilegios en el laboratorio',async()=>{
 const {store}=lab();
 const u=store.get().users.find(x=>x.usuario_id==='prueba-admin');
 const prior=Object.fromEntries(modules.map(m=>[m,store.get().faculties.find(f=>f.usuario_id===u.usuario_id&&f.modulo===m)?.revision||0]));
 const r=await store.rpc('hys262_guardar_rol_y_facultades_atomico',{
  p_usuario:u.usuario_id,p_rol:'supervisor',p_ambitos:u.ambitos,p_facultades:{},
  p_revision_usuario:u.revision,p_revisiones_facultades:prior,p_motivo:'Retirar administración'});
 assert.equal(r.error,null);
 assert.equal(store.get().users.find(x=>x.usuario_id===u.usuario_id).rol,'supervisor');
 assert.ok(store.get().faculties.filter(f=>f.usuario_id===u.usuario_id).every(f=>Object.keys(f.facultades).length===0));
});
test('reasignación de Administrador no concede permisos históricos',async()=>{
 const {store,data}=lab();
 const original=store.get().users.find(x=>x.usuario_id==='prueba-admin');
 const rev=Object.fromEntries(modules.map(m=>[m,store.get().faculties.find(f=>f.usuario_id===original.usuario_id&&f.modulo===m)?.revision||0]));
 const off=await store.rpc('hys262_guardar_rol_y_facultades_atomico',{
  p_usuario:original.usuario_id,p_rol:'usuario',p_ambitos:original.ambitos,p_facultades:{},
  p_revision_usuario:original.revision,p_revisiones_facultades:rev,p_motivo:'Desdesignar'});
 assert.equal(off.error,null);
 const u=store.get().users.find(x=>x.usuario_id===original.usuario_id);
 const newRev=Object.fromEntries(modules.map(m=>[m,store.get().faculties.find(f=>f.usuario_id===u.usuario_id&&f.modulo===m)?.revision||0]));
 const on=await store.rpc('hys262_guardar_rol_y_facultades_atomico',{
  p_usuario:u.usuario_id,p_rol:'administrador_area',p_ambitos:u.ambitos,p_facultades:roles.blankSpecials(modules,u.ambitos),
  p_revision_usuario:u.revision,p_revisiones_facultades:newRev,p_motivo:'Reasignar desde cero'});
 assert.equal(on.error,null);
 assert.ok(store.get().faculties.filter(f=>f.usuario_id===u.usuario_id).every(f=>Object.keys(f.facultades).length===0));
 assert.equal(store.get().history.length,2);
 assert.ok(data.has('reportes-hys-v264-simulador-local-1'));
});
test('la aplicación real conserva el bloqueo a las escrituras de producción',()=>{
 const config=fs.readFileSync(path.join(root,'config-v242.js'),'utf8');
 assert.match(config,/HYS257_ENABLE_USER_MANAGEMENT=false/);
 assert.match(config,/HYS262_ATOMIC_ROLE_READY=false/);
});
test('el laboratorio autónomo incluye la lógica actualizada en un solo archivo',()=>{
 const html=fs.readFileSync(path.join(root,'laboratorio-integral-v264.html'),'utf8');
 assert.match(html,/roleTransitionSpecials\(priorRole,next,draftFac,M,draftAccess\)/);
 assert.match(html,/reportes-hys-v264-simulador-local-1/);
 assert.doesNotMatch(html,/<script src=/);
});
