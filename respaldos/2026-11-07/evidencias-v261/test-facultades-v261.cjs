// Ejecutar desde la raiz: node --test evidencias-v261/test-facultades-v261.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../v261-review');
const model=require(path.join(root,'faculty-model-v261.js'));
const access=require(path.join(root,'access-settings-v259.js'));
const rows=[
 {modulo:'APR',id:'apr1',nombre:'VA4',activa:true},
 {modulo:'APR',id:'apr2',nombre:'AUCAYES',activa:true},
 {modulo:'APR',id:'apr3',nombre:'Retirada',activa:false},
 {modulo:'OTROS',id:'otros1',nombre:'VA4',activa:true},
 {modulo:'OTROS',id:'otros2',nombre:'Aucáyes',activa:true},
 {modulo:'OTROS',id:'otros3',nombre:'Prohibida',activa:true}
];
const can=(m,id)=>m==='APR'||id!=='otros3';
test('los dos modulos conservan sus identificadores internos',()=>{
 assert.deepEqual(model.MODULES,['APR','OTROS']);
});
test('todas las areas filtra modulo, vigencia y facultad del actor',()=>{
 assert.deepEqual(model.availableAreas(rows,'OTROS',can).map(a=>a.id),['otros1','otros2']);
});
test('seleccion todas exige cobertura exacta y nunca incluye conjunto vacio',()=>{
 assert.equal(model.isAllSelected(['apr1','apr2'],['apr1','apr2']),true);
 assert.equal(model.isAllSelected(['apr1'],['apr1','apr2']),false);
 assert.equal(model.isAllSelected([],[]),false);
});
test('copia areas segun nombre normalizado, nunca conserva IDs de la otra tarjeta',()=>{
 const copied=model.copyAreasByName(['apr1','apr2'],rows.filter(x=>x.modulo==='APR'),rows.filter(x=>x.modulo==='OTROS'),can,'OTROS');
 assert.deepEqual(copied.ids,['otros1','otros2']);
 assert.equal(copied.notFound.length,0);
});
test('area sin equivalencia queda informada sin otorgar acceso',()=>{
 const copy=model.copyAreasByName(['apr3'],rows.filter(x=>x.modulo==='APR'),rows.filter(x=>x.modulo==='OTROS'),can,'OTROS');
 assert.deepEqual(copy.ids,[]);
 assert.deepEqual(copy.notFound,['retirada']);
});
test('valida las areas de ambas tarjetas y rechaza areas fuera del ambito',()=>{
 const ok={APR:{ver:true,areas:['apr1']},OTROS:{ver:true,areas:['otros1']}};
 assert.equal(model.validateAreas(ok,rows,can,()=>true).ok,true);
 assert.equal(model.validateAreas({...ok,OTROS:{ver:true,areas:['otros3']}},rows,can,()=>true).ok,false);
 assert.equal(model.validateAreas({...ok,OTROS:{ver:true,areas:[]}},rows,can,()=>true).ok,false);
});
test('resumen distingue ambas tarjetas, areas y facultades por modulo',()=>{
 const summary=model.summarize({APR:{ver:true,editar:true,areas:['apr1','apr2']},OTROS:{ver:true,editar:false,areas:['otros1']}},{APR:{facultades:{view:true}},OTROS:{facultades:{}}},rows,m=>m,can,{APR:'all',OTROS:'selected'});
 assert.equal(summary.length,2);assert.equal(summary[0].all,true);assert.equal(summary[0].capabilities.length,1);
 assert.equal(summary[1].areaCount,1);assert.equal(summary[1].edit,false);
});
test('sin modificaciones no genera escrituras administrativas',()=>{
 const account={nombre:'Cuenta',rol:'usuario',activo:true,revision:1,ambitos:{APR:{ver:true,editar:true,areas:['apr1']}}};
 assert.deepEqual(access.plan(account,structuredClone(account.ambitos),{}, {},false),[]);
});
test('habilitar ambas tarjetas genera una operacion de accesos con ambos ambitos',()=>{
 const account={nombre:'Cuenta',rol:'usuario',activo:true,revision:1,ambitos:{APR:{ver:true,editar:true,areas:['apr1']}}};
 const draft={...structuredClone(account.ambitos),OTROS:{ver:true,editar:false,areas:['otros1']}};
 const steps=access.plan(account,draft,{}, {},false);
 assert.equal(steps.length,1);assert.equal(steps[0].kind,'access');
 assert.equal(steps[0].datos.ambitos.APR.ver,true);assert.equal(steps[0].datos.ambitos.OTROS.ver,true);
});
test('revocaciones de facultades especiales preceden la actualizacion de accesos',()=>{
 const account={nombre:'Cuenta',rol:'administrador_area',activo:true,revision:4,ambitos:{APR:{ver:true,editar:true,areas:['apr1']}}};
 const original={APR:{revision:7,areas_ids:['apr1'],facultades:{view:true}}};
 const draftFac={APR:{revision:7,areas_ids:[],facultades:{}}};
 const steps=access.plan(account,{},original,draftFac,true);
 assert.equal(steps[0].kind,'faculties');assert.equal(steps[1].kind,'access');
});
test('el laboratorio nunca habilita la gestion remota ni el servicio atomico',()=>{
 const config=fs.readFileSync(path.join(root,'config-v242.js'),'utf8');
 assert.match(config,/HYS257_ENABLE_USER_MANAGEMENT\s*=\s*false/);
 assert.match(config,/HYS261_ATOMIC_FACULTIES_READY\s*=\s*false/);
});
test('cargas locales y sintaxis JS se mantienen coherentes',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/src="faculty-model-v261\.js"/);
 const files=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(x=>x[1]).filter(x=>!/^https?:|^data:|^#/.test(x));
 for(const file of files)assert.equal(fs.existsSync(path.join(root,file)),true,'Falta '+file);
 for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.js'))){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  assert.doesNotThrow(()=>new vm.Script(source,{filename:file}));
 }
});
