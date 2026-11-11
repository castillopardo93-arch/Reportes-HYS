const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { randomUUID } = require('node:crypto');
const { JSDOM, VirtualConsole } = require('jsdom');
const { start } = require('./servidor-local.cjs');

async function esperar(check){
 for(let i=0;i<200;i++){
  const result=check();
  if(result)return result;
  await new Promise(done=>setTimeout(done,20));
 }
 throw Error('La interfaz no llegó al estado esperado');
}

test('Final y Flash guardan, el navegador recupera tras reiniciar y el servidor rechaza ediciones obsoletas',async()=>{
 const path=await mkdtemp(join(tmpdir(),'hys315-'));
 let app,dom;
 const errors=[];
 async function abrir(){
  const console=new VirtualConsole();
  console.on('jsdomError',error=>errors.push(error.message));
  dom=await JSDOM.fromURL(app.url+'/laboratorio-persistente.html',{
   resources:'usable',runScripts:'dangerously',virtualConsole:console,
   beforeParse(window){
    window.fetch=(url,opts)=>fetch(new URL(url,app.url),{
     ...opts,headers:{...opts.headers,Origin:app.url}
    });
    window.crypto.randomUUID=randomUUID;
    window.confirm=()=>true;
   }
  });
  await esperar(()=>dom.window.Hys308Workflow?.serverStorageEnabled);
  return dom.window.document;
 }
 async function api(data,origin=app.url){
  return fetch(app.url+'/qa-investigacion',{method:'POST',
   headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
 }
 try{
  app=await start(path);
  let doc=await abrir();
  const get=id=>doc.getElementById(id);
  const field=name=>doc.querySelector('#hys306FinalForm [name="'+name+'"]');
  get('hys306OpenFinal').click();
  field('descripcion').value='Relato ficticio recuperable';
  get('hys306AddAction').click();
  field('action_4_codigo').value='ABC-123 libre';
  get('hys308SaveFinal').click();
  await esperar(()=>doc.body.textContent.includes('Borrador guardado en PostgreSQL local.'));
  get('hys308New').click();
  doc.querySelector('#hys306FlashForm [name="hechos"]').value='Flash ficticio';
  get('hys308SaveFlash').click();
  await esperar(()=>doc.body.textContent.includes('Borrador guardado en PostgreSQL local.'));
  dom.window.close();dom=null;
  await app.close();app=null;
  app=await start(path);
  doc=await abrir();
  get('hys308OpenTracking').click();
  const finalButton=await esperar(()=>[...get('hys308List').querySelectorAll('button')].find(x=>x.textContent.startsWith('Abrir Final')));
  assert.ok(get('hys308List').textContent.includes('Abrir Flash'));
  finalButton.click();
  await esperar(()=>doc.body.textContent.includes('Borrador recuperado de PostgreSQL local.'));
  assert.equal(field('descripcion').value,'Relato ficticio recuperable');
  assert.equal(field('action_4_codigo').value,'ABC-123 libre');

  const response=await api({action:'listar',page:0});
  const rows=await response.json();
  const id=rows.find(x=>x.tipo==='final').expediente;
  const concurrent=await api({action:'guardar',id,kind:'final',version:1,data:{descripcion:'Edición ficticia concurrente'}});
  assert.equal(concurrent.status,200);
  field('descripcion').value='Cambios que deben conservarse en el formulario';
  get('hys308SaveFinal').click();
  await esperar(()=>doc.body.textContent.includes('Guardado sin confirmar.'));
  assert.equal(field('descripcion').value,'Cambios que deben conservarse en el formulario');
  dom.window.confirm=()=>false;
  get('hys308Track').click();
  assert.equal(get('hys308Tracking').hidden,true);
  assert.equal(field('descripcion').value,'Cambios que deben conservarse en el formulario');
  const stored=await (await api({action:'leer',id,kind:'final'})).json();
  assert.equal(stored.documento.datos.descripcion,'Edición ficticia concurrente');
  assert.equal((await api({action:'listar',page:0},'https://externo.invalid')).status,403);
  assert.deepEqual(errors,[]);
 }finally{
  dom?.window.close();
  await app?.close();
  await rm(path,{recursive:true,force:true});
 }
});
