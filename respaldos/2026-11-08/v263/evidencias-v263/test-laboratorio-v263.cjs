// Ejecutar: node --test evidencias-v263/test-laboratorio-v263.cjs
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'../v263-review');
const source=fs.readFileSync(path.join(root,'laboratorio-backend-v263.js'),'utf8');
function startup(map=new Map()){
 const handlers=[],sandbox={
  HYS263_SANDBOX:true,
  location:{pathname:'/Reportes-HYS/v263-review/demo-facultades.html',search:''},
  localStorage:{
   getItem:key=>map.has(key)?map.get(key):null,
   setItem:(key,value)=>map.set(key,String(value)),
   removeItem:key=>map.delete(key)
  },
  dispatchEvent:evt=>handlers.push(evt.type)
 };
 const context=vm.createContext({window:sandbox,CustomEvent:class{constructor(type,data){this.type=type;this.detail=data?.detail}},console});
 vm.runInContext(source,context,{filename:'laboratorio-backend-v263.js'});
 return {lab:sandbox.Hys263Lab,store:map,events:handlers,sandbox};
}
test('backend se ejecuta solamente con bandera y ruta de laboratorio',()=>{
 const broken={HYS263_SANDBOX:false,location:{pathname:'/v263-review/demo-facultades.html',search:''}};
 assert.throws(()=>vm.runInNewContext(source,{window:broken}),/Laboratorio/);
});
test('cuatro cuentas y dos tarjetas ficticias iniciales',()=>{
 const {lab}=startup();assert.equal(lab.get().users.length,4);
 assert.equal(lab.get().areas.filter(x=>x.modulo==='APR').length,4);
 assert.equal(lab.get().areas.filter(x=>x.modulo==='OTROS').length,4);
});
test('crear cuenta y modificar nombre y estado',()=>{
 const {lab}=startup(),u=lab.createUser('Persona ficticia');
 assert.equal(lab.get().users.length,5);lab.updateUser(u.usuario_id,'Persona modificada',false);
 assert.equal(lab.get().users.find(x=>x.usuario_id===u.usuario_id).activo,false);
 assert.equal(lab.get().history.length,2);
});
test('crear area, editar, desactivar y rechazar duplicados',()=>{
 const {lab}=startup(),newArea=lab.newArea('APR','Área adicional');
 assert.equal(lab.get().areas.some(x=>x.id===newArea.id),true);
 assert.throws(()=>lab.newArea('APR','Área adicional'),/existe/);
 lab.updateArea(newArea.id,'Área Renombrada',false);
 assert.equal(lab.get().areas.find(x=>x.id===newArea.id).activa,false);
});
test('guardar rol y permisos de ambas tarjetas en una transacción simulada',async()=>{
 const {lab}=startup(),u=lab.get().users.find(x=>x.usuario_id==='prueba-supervisor');
 const ambitos={APR:{ver:true,editar:true,areas:['apr-va4']},OTROS:{ver:true,editar:true,areas:['otr-va4']}};
 const fac={APR:{areas_ids:['apr-va4'],facultades:{audit:true}},OTROS:{areas_ids:['otr-va4'],facultades:{view:true}}};
 const result=await lab.rpc('hys262_guardar_rol_y_facultades_atomico',{p_usuario:u.usuario_id,p_rol:'administrador_area',p_ambitos:ambitos,p_facultades:fac,p_revision_usuario:u.revision,p_revisiones_facultades:{APR:0,OTROS:0},p_motivo:'Prueba'});
 assert.equal(result.error,null);const after=lab.get();
 assert.equal(after.users.find(x=>x.usuario_id===u.usuario_id).rol,'administrador_area');
 assert.equal(after.faculties.find(x=>x.usuario_id===u.usuario_id&&x.modulo==='APR').facultades.audit,true);
 assert.equal(after.users.find(x=>x.usuario_id===u.usuario_id).ambitos.OTROS.ver,true);
 assert.equal(after.history[0].accion,'Rol y facultades (atómico simulado)');
});
test('fallo de revision evita todos los cambios y no añade auditoría',async()=>{
 const {lab}=startup(),before=JSON.stringify(lab.get()),u=lab.get().users[1];
 const result=await lab.rpc('hys262_guardar_rol_y_facultades_atomico',{p_usuario:u.usuario_id,p_rol:'administrador_area',p_ambitos:u.ambitos,p_facultades:{},p_revision_usuario:99,p_revisiones_facultades:{APR:0,OTROS:0},p_motivo:'Error'});
 assert.match(result.error.message,/revisi/);assert.equal(JSON.stringify(lab.get()),before);
});
test('area inválida falla sin escritura parcial',async()=>{
 const {lab}=startup(),before=JSON.stringify(lab.get()),u=lab.get().users[1];
 const result=await lab.rpc('hys262_guardar_rol_y_facultades_atomico',{p_usuario:u.usuario_id,p_rol:'administrador_area',p_ambitos:{APR:{ver:true,areas:['apr-va4']},OTROS:{ver:true,areas:['inexistente']}},p_facultades:{},p_revision_usuario:u.revision,p_revisiones_facultades:{APR:0,OTROS:0},p_motivo:'Inválido'});
 assert.ok(result.error);assert.equal(JSON.stringify(lab.get()),before);
});
test('rebajar Administrador a Usuario revoca facultades especiales de ambas tarjetas',async()=>{
 const {lab}=startup(),u=lab.get().users[0],ambitos={APR:{ver:true,editar:false,areas:['apr-va4']}};
 const result=await lab.rpc('hys262_guardar_rol_y_facultades_atomico',{p_usuario:u.usuario_id,p_rol:'usuario',p_ambitos:ambitos,p_facultades:{},p_revision_usuario:u.revision,p_revisiones_facultades:{APR:1,OTROS:0},p_motivo:'Prueba de revocación'});
 assert.equal(result.error,null);
 assert.equal(lab.get().users.find(x=>x.usuario_id===u.usuario_id).rol,'usuario');
 assert.ok(lab.get().faculties.filter(x=>x.usuario_id===u.usuario_id).every(x=>Object.keys(x.facultades).length===0));
});
test('guardado persiste solo en clave local del laboratorio y sobreviven recargas',()=>{
 const map=new Map(),first=startup(map);first.lab.createUser('Cuenta temporal');
 const other=startup(map);
 assert.equal(other.lab.get().users.length,5);
 assert.deepEqual([...map.keys()],['reportes-hys-v263-simulador-local-1']);
});
test('restablecer elimina cambios simulados y conserva datos iniciales',()=>{
 const {lab}=startup();lab.createUser('Cuenta temporal');lab.reset();
 assert.equal(lab.get().users.length,4);assert.equal(lab.get().history.length,0);
});
test('config real queda bloqueada, mocks solo en demostración',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const demo=fs.readFileSync(path.join(root,'demo-facultades.html'),'utf8');
 const config=fs.readFileSync(path.join(root,'config-v242.js'),'utf8');
 assert.match(config,/HYS263_SANDBOX=false/);
 assert.match(config,/HYS257_ENABLE_USER_MANAGEMENT=false/);
 assert.match(demo,/HYS263_SANDBOX=true/);
 assert.match(demo,/HYS262_ATOMIC_ROLE_READY=true/);
 assert.doesNotMatch(html,/laboratorio-backend-v263\.js/);
 assert.match(demo,/laboratorio-backend-v263\.js/);
});
test('sintaxis JS y referencias locales del laboratorio',()=>{
 for(const file of fs.readdirSync(root).filter(x=>x.endsWith('.js'))){
  assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}));
 }
 for(const name of ['index.html','demo-facultades.html']){
  const doc=fs.readFileSync(path.join(root,name),'utf8');
  const files=[...doc.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(x=>!/^https?:|^data:|^#/.test(x));
  for(const file of files)assert.ok(fs.existsSync(path.join(root,file)),file);
 }
});
