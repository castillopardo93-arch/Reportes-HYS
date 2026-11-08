'use strict';
/* Pruebas locales no destructivas para Reportes HYS v284.
   Ejecutar: node evidencias-v284/test-regresion-v284.cjs
   No invoca Supabase, no escribe datos de producción y no crea usuarios. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../v284-review');
const file=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=file('index.html');
const cloud=file('cloud-v242.js');
const config=file('config-v242.js');
const manifest=JSON.parse(file('MANIFIESTO.json'));
let ok=0;
function check(name,fn){fn();ok++;console.log('OK '+String(ok).padStart(2,'0')+' · '+name)}
check('Manifiesto v284 aislado y no publicado',()=>{
 assert.equal(manifest.version,284);
 assert.equal(manifest.branch,'desarrollo/v284-correcciones-seguras');
 assert.equal(manifest.publicada,false);
 assert.equal(manifest.supabase_modificado,false);
});
check('Permanece deshabilitada la escritura central',()=>{
 assert.match(config,/HYS242_ENABLE_CENTRAL=false/);
 assert.match(config,/HYS242_DEPLOYMENT_READY=false/);
});
check('Rutas de scripts y hojas de estilo resueltas',()=>{
 const re=/<(?:script|link)\b[^>]*?(?:src|href)=["']([^"']+)["'][^>]*>/gi;
 let total=0;
 for(const m of html.matchAll(re)){
   const uri=m[1].split('?')[0];
   if(/^(https?:|data:|#)/.test(uri))continue;
   assert.ok(fs.existsSync(path.join(root,uri)), 'Falta '+uri);total++;
 }
 assert.ok(total>30);
});
check('Sintaxis de JavaScript local y embebido',()=>{
 let total=0;
 for(const m of html.matchAll(/<script\b[^>]*?src=["']([^"']+)["'][^>]*>/gi)){
   const uri=m[1].split('?')[0];
   if(/^https?:/.test(uri))continue;
   new vm.Script(file(uri),{filename:uri});total++;
 }
 for(const m of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)){
   new vm.Script(m[1],{filename:'index.html:script'});total++;
 }
 assert.ok(total>30);
});
check('Inicio no depende del número de fotografías',()=>{
 assert.match(html,/\.metaform\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(html,/\.metaform\{[^}]*var\(--photo-columns/);
});
check('Fotografías por fila entre 2 y 8',()=>{
 for(let n=2;n<=8;n++)assert.ok(html.includes('<option value="'+n+'">'+n+' por fila</option>'));
 assert.match(html,/const columns=\[2,3,4,5,6,7,8\]/);
});
check('Fecha del archivo PDF basada en el informe',()=>{
 assert.match(html,/const fechaGeneracion=\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test/);
});
check('No se agregan filas a la cola remota en modo local',()=>{
 assert.ok(cloud.includes("await q.commitDraft(central()&&(force"));
 assert.ok(cloud.includes("central()?row(p,null,oldId):null"));
 assert.ok(cloud.includes("if(!central()){await q.commitDraft(null,draft(p,id));"));
});
check('Se protege el borrador anterior antes de crear uno nuevo',()=>{
 assert.ok(cloud.includes('await B.cacheFinalized({id:oldId'));
 assert.ok(cloud.includes('el formulario cambió desde el último PDF'));
});
check('Finalizar exige Inicio completo y fechas coherentes',()=>{
 assert.ok(cloud.includes("const campos=['date','dateFrom','dateTo','owner','shift','project','area']"));
 assert.ok(cloud.includes('if(p.dateFrom>p.dateTo)'));
});
check('La interfaz declara la falta de sincronización',()=>{
 assert.match(html,/El envío de informes a Supabase está desactivado/);
 assert.match(cloud,/NO se envían a Supabase/);
});
check('Pendientes antiguos conservados sin bloquear el historial local',()=>{
 assert.match(cloud,/const pendientesHeredados=await q\.store\.all\('pending'\)/);
 assert.match(cloud,/if\(central\(\)\)\{message\('Sincroniza o exporta/);
 assert.match(cloud,/Se conservarán sin enviarse ni borrarse/);
});
check('No se archiva un borrador completamente vacío al crear informe',()=>{
 assert.match(cloud,/const hasContents=p\.status==='Finalizado'/);
 assert.match(cloud,/if\(!central\(\)&&hasContents\)/);
});
check('Comprobar guardado no promete sincronización en modo local',()=>{
 assert.match(html,/id="cloudRetry242" type="button">Comprobar guardado local/);
 assert.match(cloud,/textContent=central\(\)\?'Sincronizar ahora':'Comprobar guardado local'/);
});
check('Prueba básica de cola durable sin acceso de red',()=>{
 const sandbox={window:{},module:{exports:{}}};
 vm.runInNewContext(file('sync-core-v242.js'),sandbox,{filename:'sync-core-v242.js'});
 const fingerprint=sandbox.module.exports.fingerprint;
 assert.equal(fingerprint({b:2,a:1}),fingerprint({a:1,b:2}));
});
(async()=>{
 const sandbox={window:{},module:{exports:{}}};
 vm.runInNewContext(file('sync-core-v242.js'),sandbox,{filename:'sync-core-v242.js'});
 const Queue242=sandbox.module.exports.Queue242;
 const data={pending:new Map(),meta:new Map(),draft:new Map()};
 const store={
  get:async(n,id)=>data[n].get(id)||null,
  all:async n=>[...data[n].values()],
  put:async(n,v)=>{data[n].set(v.id,v)},
  batch:async ops=>{for(const o of ops)o.remove?data[o.store].delete(o.id):data[o.store].set(o.value.id,o.value)}
 };
 let sends=0;
 const q=new Queue242(store,async row=>{sends++;return {revision:1,payload:row.payload}});
 await q.commitDraft(null,{id:'current',payload:{owner:'Test'}});
 assert.equal(data.pending.size,0);
 assert.equal(data.draft.size,1);
 await q.enqueue({id:'test-informe',token:'token-test',payload:{owner:'Test'},at:1});
 await q.flush();
 assert.equal(sends,1);
 assert.equal(data.pending.size,0);
 assert.equal(data.meta.get('test-informe').revision,1);
 console.log('OK '+String(++ok).padStart(2,'0')+' · Cola local sin pendientes y confirmación remota simulada');
 console.log('PASS: '+ok+' comprobaciones, sin mutaciones de Supabase ni producción.');
})().catch(err=>{console.error(err);process.exitCode=1});
