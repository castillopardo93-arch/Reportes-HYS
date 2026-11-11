// Reportes HYS v262 — regresión de rol; ejecutar: node --test evidencias-v262/test-roles-v262.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=path.resolve(__dirname,'../v262-review');
const R=require(path.join(dir,'role-control-v262.js'));
const actor={userId:'general',profile:{activo:true,rol:'administrador_global'}};
const account={usuario_id:'trabajador',rol:'supervisor'};
test('3 roles configurables sin administrador general',()=>assert.deepEqual(R.roles.map(x=>x.value),['usuario','supervisor','administrador_area']));
test('unico actor que cambia rol es Administrador general',()=>{
 assert.equal(R.mayChangeRole(actor,account),true);
 assert.equal(R.mayChangeRole({userId:'otro',profile:{activo:true,rol:'administrador_area'}},account),false);
 assert.equal(R.mayChangeRole({...actor,userId:'trabajador'},account),false);
 assert.equal(R.mayChangeRole(actor,{usuario_id:'otra',rol:'administrador_global'}),false);
});
test('rol nuevo requiere RPC atomico',()=>{
 assert.equal(R.roleSummary(account,'administrador_area').requiresAtomic,true);
 assert.equal(R.roleSummary(account,'usuario').requiresAtomic,true);
 assert.equal(R.roleSummary(account,'supervisor').changed,false);
 assert.equal(R.validRole('administrador_global'),false);
});
test('facultades especiales solamente para Administrador',()=>{
 const original={APR:{areas_ids:['a'],facultades:{view:true,users:false}},OTROS:{areas_ids:['b'],facultades:{audit:true}}};
 assert.deepEqual(R.safeSpecials('usuario',original,['APR','OTROS']),{});
 assert.deepEqual(R.safeSpecials('supervisor',original,['APR','OTROS']),{});
 const allowed=R.safeSpecials('administrador_area',original,['APR','OTROS']);
 assert.deepEqual(allowed.APR.facultades,{view:true});
 assert.deepEqual(allowed.OTROS.facultades,{audit:true});
});
test('el selector esta junto al usuario y no en Usuarios',()=>{
 const faculty=fs.readFileSync(path.join(dir,'facultades-v242.js'),'utf8');
 const people=fs.readFileSync(path.join(dir,'operaciones-v242.js'),'utf8');
 assert.match(faculty,/id="facultyRole262"/);
 assert.match(faculty,/draftRole/);
 assert.match(people,/Rol \(se administra en Facultades\)/);
 assert.match(people,/rol:u\?u\.rol:/);
});
test('no se activan escrituras remotas antes de existir RPC atomico',()=>{
 const config=fs.readFileSync(path.join(dir,'config-v242.js'),'utf8');
 const faculty=fs.readFileSync(path.join(dir,'facultades-v242.js'),'utf8');
 assert.match(config,/HYS257_ENABLE_USER_MANAGEMENT=false/);
 assert.match(config,/HYS262_ATOMIC_ROLE_READY=false/);
 assert.match(faculty,/if\(roleWasChanged&&window\.HYS262_ATOMIC_ROLE_READY!==true\)/);
 assert.match(faculty,/hys262_guardar_rol_y_facultades_atomico/);
 assert.match(faculty,/Revisar cambios \(sin guardar\)/);
});
test('copia de v262 no comparte datos locales con v261',()=>{
 assert.match(fs.readFileSync(path.join(dir,'storage-v242.js'),'utf8'),/hys-v262-roles/);
 assert.match(fs.readFileSync(path.join(dir,'cloud-v242.js'),'utf8'),/hys-v262-roles-queue/);
});
test('dependencias se cargan antes que el controlador',()=>{
 for(const file of ['index.html','demo-facultades.html']){
  const html=fs.readFileSync(path.join(dir,file),'utf8');
  assert.ok(html.indexOf('src="role-control-v262.js"')<html.indexOf('src="facultades-v242.js"'));
 }
});
test('referencias locales del HTML y sintaxis JavaScript',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const assets=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(x=>x[1]).filter(x=>!/^https?:|^data:|^#/.test(x));
 for(const file of assets)assert.ok(fs.existsSync(path.join(dir,file)),file);
 for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.js'))){
  assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(dir,file),'utf8'),{filename:file}));
 }
});
