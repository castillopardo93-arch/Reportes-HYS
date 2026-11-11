/* Reportes HYS v260 - pruebas repetibles sin conexión con servicios productivos.
 Ejecutar: node evidencias-v260/test-integracion-v260.cjs
 No requiere credenciales ni modifica Supabase/GitHub. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../v260-review');
let checks=0;
function verify(name,fn){fn();checks++;console.log('OK',String(checks).padStart(2,'0'),name);}
const scripts=fs.readdirSync(root).filter(f=>f.endsWith('.js'));
for(const f of scripts)verify('JS sintaxis '+f,()=>new vm.Script(fs.readFileSync(path.join(root,f),'utf8'),{filename:f}));
const css=fs.readdirSync(root).filter(f=>f.endsWith('.css'));
for(const f of css)verify('CSS llaves '+f,()=>{const s=fs.readFileSync(path.join(root,f),'utf8');assert.equal((s.match(/{/g)||[]).length,(s.match(/}/g)||[]).length);});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const inline=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(v=>v.trim());
inline.forEach((s,i)=>verify('JS interno '+(i+1),()=>new vm.Script(s)));
const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(v=>/\.(?:js|css)$/.test(v)&&!/^https?:/.test(v));
verify('recursos locales presentes',()=>{assert.equal(refs.length,45);refs.forEach(v=>assert.ok(fs.existsSync(path.join(root,v)),v));});
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
verify('id HTML no duplicados',()=>assert.equal(new Set(ids).size,ids.length));
const A=require(path.join(root,'access-settings-v259.js'));
const P=require(path.join(root,'access-policy-v256.js'));
const G=require(path.join(root,'integrity-v255.js'));
const {Queue242}=require(path.join(root,'sync-core-v242.js'));
const actor={profile:{activo:true,rol:'administrador_area'},modules:['APR'],facultades:[{modulo:'APR',areas_ids:['va4'],facultades:{users:true}}],permissions:[{modulo:'APR',puede_ver:true,puede_editar:true}]};
verify('permite área autorizada',()=>assert.equal(A.canAssignArea(actor,'APR','va4'),true));
verify('rechaza área no delegada',()=>assert.equal(A.canAssignArea(actor,'APR','va5'),false));
verify('rechaza módulo no delegado',()=>assert.equal(A.canAssignArea(actor,'OTROS','va4'),false));
verify('rechaza edición módulo no delegado',()=>assert.equal(A.canGrantEdit(actor,'OTROS'),false));
verify('permite edición módulo válido',()=>assert.equal(A.canGrantEdit(actor,'APR'),true));
verify('rechaza edición sin lectura',()=>assert.equal(A.canGrantEdit({...actor,permissions:[{modulo:'APR',puede_ver:false,puede_editar:true}]},'APR'),false));
verify('rechaza cuenta inactiva',()=>assert.equal(A.canAssignArea({...actor,profile:{rol:'administrador_area',activo:false}},'APR','va4'),false));
verify('rechaza supervisor como delegante',()=>assert.equal(A.canGrantEdit({...actor,profile:{rol:'supervisor',activo:true}},'APR'),false));
verify('permite administrador global',()=>assert.equal(A.canGrantEdit({...actor,profile:{rol:'administrador_global',activo:true}},'OTROS'),true));
verify('política deniega usuario normal',()=>assert.equal(P.can({...actor,profile:{rol:'usuario',activo:true}},'users','APR'),false));
verify('política delimita módulo',()=>{assert.equal(P.can(actor,'users','APR'),true);assert.equal(P.can(actor,'users','OTROS'),false);});
verify('supervisor con permiso administra áreas',()=>assert.equal(P.areas({...actor,profile:{rol:'supervisor',activo:true}}),true));
const account={rol:'administrador_area',nombre:'Prueba',activo:true,revision:2,ambitos:{APR:{ver:true,editar:false,areas:['va4']}}};
const previous={APR:{revision:3,areas_ids:['va4'],facultades:{users:true}}};
verify('revocación antes de cambio acceso',()=>{const seq=A.plan(account,{APR:{ver:true,editar:true,areas:['va4']}},previous,{APR:{areas_ids:['va4'],facultades:{users:false}}},true);assert.deepEqual(seq.map(s=>s.kind),['faculties','access']);});
verify('ninguna escritura sin cambio',()=>assert.equal(A.plan(account,account.ambitos,previous,previous,true).length,0));
verify('normalización de alcances',()=>assert.equal(A.stable(A.normalizedScope({areas_ids:['b','a','a'],facultades:{users:true,view:false}})),A.stable({areas_ids:['a','b'],facultades:{users:true}})));
const pack={module:'APR',data:{activities:[],inspections:[],findings:[]}};
verify('paquete válido',()=>assert.equal(G.validatePack(pack,'APR'),pack));
verify('APR/OTROS no se mezclan',()=>assert.throws(()=>G.validatePack({...pack,module:'OTROS'},'APR')));
verify('rechaza adjunto no seguro',()=>assert.throws(()=>G.validatePack({module:'APR',data:{activities:[['a','b','c','d',[{data:'javascript:alert(1)'}]]],inspections:[],findings:[]}},'APR')));
(async()=>{
const state=new Map(),sent=[];
const store={get:async(n,id)=>state.get(n+':'+id)||null,put:async(n,v)=>state.set(n+':'+v.id,v),all:async(n)=>[...state.entries()].filter(([k])=>k.startsWith(n+':')).map(([,v])=>v),batch:async ops=>{for(const op of ops)if(op.remove)state.delete(op.store+':'+op.id);else state.set(op.store+':'+op.value.id,op.value);}};
const queue=new Queue242(store,async item=>{sent.push(item.token);return {revision:1,payload:item.payload};});
await queue.enqueue({id:'r1',token:'t1',at:1,payload:{data:1}});await queue.flush();
verify('borra solo tras confirmación',()=>{assert.equal(sent.length,1);assert.equal(state.has('pending:r1'),false);});
await queue.enqueue({id:'r2',token:'t2',at:2,payload:{data:2}});
const bad=new Queue242(store,async()=>{throw Error('simulado')});await assert.rejects(bad.flush());
verify('retiene operación fallida',()=>assert.equal(state.has('pending:r2'),true));
console.log('\nTOTAL:',checks,'pruebas aprobadas. CERO comunicaciones externas.');
})().catch(e=>{console.error(e);process.exitCode=1;});
