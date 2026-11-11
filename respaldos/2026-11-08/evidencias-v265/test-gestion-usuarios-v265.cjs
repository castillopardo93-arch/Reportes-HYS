// Reportes HYS v265. Ejecutar: node --test evidencias-v265/test-gestion-usuarios-v265.cjs
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const root=path.resolve(__dirname,'../v265-review');
const M=require(path.join(root,'worker-model-v265.js'));
function start(){
 const data=new Map(),win={HYS263_SANDBOX:true,Hys265WorkerModel:M,location:{pathname:'/v265-review/laboratorio-integral-v265.html',search:''},localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v))},dispatchEvent:()=>{}};
 const src=fs.readFileSync(path.join(root,'backend-simulador-v263.js'),'utf8');
 vm.runInNewContext(src,{window:win,CustomEvent:class{constructor(n,p){this.type=n;this.detail=p?.detail}}});
 return {lab:win.Hys263Lab,data};
}
const worker={nombre:'Trabajador de prueba HYS',rut:'12.345.678-5',cargo:'Capataz',gerencia:'Obras',empresa:'Empresa ficticia',proyecto:'Proyecto ficticio',supervisor_id:'prueba-supervisor',celular:'+56912345678',correo_corporativo:'corporativo@example.org',correo_personal:'personal@example.org',estado_laboral:'activo'};
const access={APR:{ver:true,editar:true,areas:['apr-va4']},OTROS:{ver:true,editar:false,areas:['otr-va4']}};
const rights={APR:{areas_ids:['apr-va4'],facultades:{view:true,review:true}},OTROS:{areas_ids:['otr-va4'],facultades:{}}};
const account={correo_ingreso:'personal',metodo:'invitacion'};
test('RUT válido e inválido',()=>{assert.equal(M.validRut(worker.rut),true);assert.equal(M.validRut('12.345.678-4'),false)});
test('datos laborales obligatorios y supervisión registrada',()=>{
 const {lab}=start();assert.ok(M.validate(worker,lab.get().users).ok);
 assert.equal(M.validate({...worker,gerencia:''},lab.get().users).ok,false);
 assert.equal(M.validate({...worker,supervisor_id:'inexistente'},lab.get().users).ok,false);
});
test('paso de cuenta usa correo elegido, no contraseña',()=>{
 const a=M.validateAccount(account,worker);
 assert.equal(a.ok,true);assert.equal(a.cuenta.email,'personal@example.org');
 assert.equal(a.cuenta.metodo,'invitacion');assert.equal(a.cuenta.estado,'pendiente_invitacion');
 assert.equal(M.validateAccount({...account,metodo:'password'},worker).ok,false);
});
test('cambio de correo de acceso queda pendiente de verificación',()=>{
 const a=M.validateAccount({...account,email:'viejo@example.org'},worker,true);
 assert.equal(a.cuenta.estado,'cambio_correo_pendiente');
});
test('facultades dependientes requieren consulta',()=>{
 const {lab}=start();
 assert.equal(M.validConfiguration('administrador_area',access,rights,lab.get().areas).ok,true);
 assert.equal(M.validConfiguration('administrador_area',access,{APR:{areas_ids:['apr-va4'],facultades:{review:true}}},lab.get().areas).ok,false);
});
test('creación ficticia conjunta produce usuario, cuenta y un evento de auditoría sin RUT/correos',()=>{
 const {lab}=start();
 const a=M.validateAccount(account,worker).cuenta;
 const saved=lab.createWorker({trabajador:worker,cuenta:a,rol:'administrador_area',ambitos:access,facultades:rights,motivo:'Registro de cuenta y facultades'});
 const u=lab.get().users.find(x=>x.usuario_id===saved.usuario_id);
 assert.equal(u.cuenta.estado,'pendiente_invitacion');assert.equal(u.email,'personal@example.org');
 assert.ok(lab.get().faculties.some(x=>x.usuario_id===u.usuario_id&&x.facultades.review));
 const audit=JSON.stringify(lab.get().history);
 assert.doesNotMatch(audit,/12\.345\.678|personal@example\.org|corporativo@example\.org/);
 assert.equal(lab.get().history.length,1);
});
test('rechaza duplicación de RUT y correo',()=>{
 const {lab}=start();const a=M.validateAccount(account,worker).cuenta;
 lab.createWorker({trabajador:worker,cuenta:a,rol:'usuario',ambitos:access,facultades:M.blankGrants(access),motivo:'Primera cuenta de prueba'});
 assert.equal(M.validate(worker,lab.get().users).ok,false);
});
test('revoca facultades al bajar rol y al subir exige elegir desde cero',()=>{
 const {lab}=start();const a=M.validateAccount(account,worker).cuenta;
 const added=lab.createWorker({trabajador:worker,cuenta:a,rol:'administrador_area',ambitos:access,facultades:rights,motivo:'Registro inicial para cambio de rol'});
 const old=lab.get().users.find(x=>x.usuario_id===added.usuario_id);
 const empty=M.transition('administrador_area','supervisor',rights,access);
 lab.updateWorker(old.usuario_id,{trabajador:worker,cuenta:a,rol:'supervisor',ambitos:access,facultades:empty,motivo:'Revocación de facultades'},old.revision);
 const next=lab.get().users.find(x=>x.usuario_id===old.usuario_id);
 const fromZero=M.transition('supervisor','administrador_area',rights,access);
 lab.updateWorker(next.usuario_id,{trabajador:worker,cuenta:a,rol:'administrador_area',ambitos:access,facultades:fromZero,motivo:'Nueva designación sin facultades'},next.revision);
 assert.ok(lab.get().faculties.filter(x=>x.usuario_id===old.usuario_id).every(x=>Object.keys(x.facultades).length===0));
});
test('estado de pruebas se aísla de versiones protegidas',()=>{
 const {lab,data}=start();lab.createUser('Usuario adicional ficticio');
 assert.ok(data.has('reportes-hys-v265-simulador-local-1'));
 assert.equal(data.has('reportes-hys-v264-simulador-local-1'),false);
});
test('el asistente presenta cinco etapas, incluida Creación de cuenta en segundo lugar',()=>{
 const js=fs.readFileSync(path.join(root,'gestion-usuarios-v265.js'),'utf8');
 assert.ok(js.indexOf('if(state.step===1)stepWorker(pane)')<js.indexOf('if(state.step===2)stepAccount(pane)'));
 assert.ok(js.indexOf('if(state.step===2)stepAccount(pane)')<js.indexOf('if(state.step===3)stepRoles(pane)'));
 assert.match(js,/if\(state\.step===5\)stepReview\(pane\)/);
});
test('la aplicación real no habilita guardado sin backend',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const cfg=fs.readFileSync(path.join(root,'config-v242.js'),'utf8');
 const js=fs.readFileSync(path.join(root,'gestion-usuarios-v265.js'),'utf8');
 assert.match(cfg,/HYS257_ENABLE_USER_MANAGEMENT=false/);
 assert.match(js,/if\(!lab\)\{notice\('Guardado bloqueado/);
 assert.doesNotMatch(html,/Hys244People\?\.mount/);
});
test('integridad de scripts y laboratorio autónomo sin dependencias externas',()=>{
 const lab=fs.readFileSync(path.join(root,'laboratorio-integral-v265.html'),'utf8');
 assert.doesNotMatch(lab,/<script src=/);
 for(const match of lab.matchAll(/<script>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new vm.Script(match[1]));
 for(const file of fs.readdirSync(root).filter(x=>x.endsWith('.js')))assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,file),'utf8')));
});
