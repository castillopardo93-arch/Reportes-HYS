const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/index.html','utf8');
const fn=source.match(/  function landingModule256\([\s\S]*?\n  }/)[0];
const c={};vm.createContext(c);vm.runInContext(fn,c);
for(const rol of ['administrador_global','administrador_area']){
 for(const modules of [['APR'],['OTROS'],['APR','OTROS']])test(rol+' entra al selector con '+modules.join('/'),()=>assert.equal(c.landingModule256({rol},modules,null,modules[0],false),null));
 test(rol+' conserva módulo activo durante renovación',()=>assert.equal(c.landingModule256({rol},['APR','OTROS'],'APR',null,false),'APR'));
 test(rol+' revocación no conserva módulo anterior',()=>assert.equal(c.landingModule256({rol},['OTROS'],'APR','APR',false),null));
}
for(const rol of ['usuario','supervisor'])test(rol+' conserva ingreso directo de módulo único',()=>assert.equal(c.landingModule256({rol},['APR'],null,null,false),'APR'));
test('OTROS embebido respeta autorización',()=>{assert.equal(c.landingModule256({rol:'administrador_area'},['OTROS'],null,null,true),'OTROS');assert.equal(c.landingModule256({rol:'administrador_area'},['APR'],null,null,true),null)});
test('tarjetas visibles exclusivamente por permisos del servidor',()=>{assert(source.includes('$("openAprModule").hidden=!modules.includes("APR")'));assert(source.includes('$("openOtherModule").hidden=!modules.includes("OTROS")'));assert(source.includes('selected=landingModule256(profile,modules,module,restoredModule,embeddedOtros)'))});

const P=require('./access-policy-v256.js');
function admin(facultades=[]){return {profile:{activo:true,rol:'administrador_area'},modules:['APR'],facultades}}
const grant=(key,modulo='APR',areas_ids=['area-qa'])=>({modulo,areas_ids,facultades:{[key]:true}});
test('Administrador sin facultades no ve gestión de usuarios ni áreas',()=>{assert(!P.users(admin()));assert(!P.areas(admin()))});
test('Usuarios y activación son facultades independientes del acceso a tarjetas',()=>{assert(P.users(admin([grant('users')])));assert(P.users(admin([grant('activation')])));assert(!P.areas(admin([grant('users')])))});
test('Áreas requiere su propia facultad y ámbito no vacío',()=>{assert(P.areas(admin([grant('areas')])));assert(!P.areas(admin([grant('areas','APR',[])])))});
test('No se muestran facultades de módulos no autorizados',()=>assert(!P.users(admin([grant('users','OTROS')]))));
test('Usuario normal no obtiene gestión aunque tenga una entrada inválida de facultades',()=>{const a=admin([grant('users'),grant('areas')]);a.profile.rol='usuario';assert(!P.users(a));assert(!P.areas(a))});
test('Revocación e inactividad ocultan las herramientas',()=>{const a=admin([grant('users')]);assert(P.users(a));a.profile.activo=false;assert(!P.users(a))});
test('Administrador general conserva las herramientas',()=>{const a={profile:{activo:true,rol:'administrador_global'}};assert(P.users(a));assert(P.areas(a))});
test('Supervisor conserva áreas solo con edición autorizada',()=>{const a={profile:{activo:true,rol:'supervisor'},modules:['APR'],permissions:[{modulo:'APR',puede_ver:true,puede_editar:true}]};assert(P.areas(a));assert(!P.users(a));a.permissions[0].puede_editar=false;assert(!P.areas(a))});
