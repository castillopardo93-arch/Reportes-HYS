/* v310: Facultades de cierre en la lista existente de Administradores. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const repo=path.resolve(__dirname,'../v312-review');
const load=f=>fs.readFileSync(path.join(repo,f),'utf8');
const W=require(path.join(repo,'worker-model-v265.js'));
const R=require(path.join(repo,'role-control-v262.js'));
const users=load('gestion-usuarios-v265.js');
const faculty=load('facultades-v242.js');
const index=load('index.html');
const roleKeys=['closeFlashReport','closeFinalReport'];
const labels=['Autorizar cierre de Flash Report','Autorizar cierre de Final Report'];
const rights=users.slice(users.indexOf('const rights=['),users.indexOf('const employment=['));
const oldKeys=['view','pdf','review','approve','close','editOthers','areas','users','activation','audit'];
for(const name of oldKeys)assert.ok(rights.includes("['"+name+"',"),'Se borró permiso histórico '+name);
for(let i=0;i<roleKeys.length;i++){
 assert.equal((rights.match(new RegExp("\\['"+roleKeys[i]+"'",'g'))||[]).length,1,
  'La nueva autorización debe aparecer UNA sola vez en la lista de facultades');
 assert.ok(rights.includes(labels[i]),'Falta etiqueta '+labels[i]);
 assert.ok(faculty.includes(roleKeys[i]+":'"+labels[i]+"'"),
  'El selector original de Facultades de acceso también debe ofrecerla');
}
assert.ok(!users.includes('Hys308ClosingFaculties'),'Se mantuvo un bloque adicional de gestión');
assert.ok(!index.includes('facultades-cierre-v308'),'No se debe cargar módulo de interfaz adicional');
assert.ok(!load('demo-v308.html').includes('hys308CloseFacultyDemo'));
assert.ok(!load('demo-v308.html').includes('hys308ShowCloseFaculty'));
assert.ok(users.includes("if(state.draft.rol==='administrador_area')"));
assert.ok(faculty.includes("section.hidden=!isAdminTarget()"));
// Las dos facultades se conceden individualmente y requieren tarjeta autorizada
// y consulta, igual que las opciones existentes. La interfaz real no persiste.
const scope={APR:{ver:true,editar:true,areas:['a']},OTROS:{ver:false,editar:false,areas:[]}};
const areas=[{id:'a',modulo:'APR',nombre:'Sector ficticio',activa:true}];
const grants=(names,view=true)=>({
 APR:{areas_ids:['a'],facultades:Object.fromEntries([...(view?[['view',true]]:[]),...names.map(n=>[n,true])])},
 OTROS:{areas_ids:[],facultades:{}}
});
for(const name of roleKeys){
 assert.equal(W.validConfiguration('administrador_area',scope,grants([name]),areas).ok,true,
  'Administrador con consulta y autorización debe ser válido: '+name);
 assert.equal(W.validConfiguration('administrador_area',scope,grants([name],false),areas).ok,false,
  'No permitir cierre sin consultar informes: '+name);
 assert.equal(W.validConfiguration('usuario',scope,grants([name]),areas).ok,false,
  'No permitir facultad administrativa a usuario común');
 assert.equal(W.validConfiguration('supervisor',scope,grants([name]),areas).ok,false,
  'No permitir facultad administrativa a supervisor');
}
assert.equal(W.validConfiguration('administrador_area',scope,grants(roleKeys),areas).ok,true,
 'Una cuenta administradora puede recibir ambas facultades');
assert.equal(W.validConfiguration('administrador_area',scope,grants([]),areas).ok,true,
 'Las dos facultades son opcionales y deben iniciar desmarcadas');
const invalid={APR:{areas_ids:['a'],facultades:{view:true,notAnAllowedPermission:true}},OTROS:{areas_ids:[],facultades:{}}};
assert.equal(W.validConfiguration('administrador_area',scope,invalid,areas).ok,false,
 'No admitir claves de facultad desconocidas');
const none=R.blankSpecials(['APR','OTROS'],scope);
assert.deepEqual(Object.keys(none.APR.facultades),[],'Ninguna facultad debe concederse automáticamente');
const reset=R.roleTransitionSpecials('usuario','administrador_area',grants(roleKeys),['APR','OTROS'],scope);
assert.deepEqual(Object.keys(reset.APR.facultades),[],'Al entrar en rol Administrador todas deben iniciar desmarcadas');
const disabled={APR:{ver:false,editar:false,areas:[]},OTROS:{ver:false,editar:false,areas:[]}};
assert.equal(W.validConfiguration('administrador_area',disabled,grants(roleKeys),areas).ok,false);
assert.ok(users.includes('Guardar permisos (pendiente)'));
assert.ok(index.includes('gestion-usuarios-v265.js'));
console.log('OK v310: 2 facultades añadidas a la lista ORIGINAL, 10 históricos intactos, roles/áreas validados, sin panel extra ni guardado real.');