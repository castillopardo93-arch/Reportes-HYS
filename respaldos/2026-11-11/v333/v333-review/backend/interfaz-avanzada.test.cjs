const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtemp,rm}=require('node:fs/promises');
const {join}=require('node:path');
const {tmpdir}=require('node:os');
const {randomUUID}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {JSDOM,ResourceLoader,VirtualConsole}=require('jsdom');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const {start}=require('./servidor-local.cjs');
async function wait(check){
 for(let i=0;i<300;i++){
  const value=check();if(value)return value;
  await new Promise(done=>setTimeout(done,20));
 }
 throw Error('Interfaz avanzada sin respuesta esperada.');
}
async function escenario(run){
 const dir=await mkdtemp(join(tmpdir(),'hys316-'));
 let app=await start(dir);
 let dom;
 const failures=[];
 try{
  function configureWindow(w){
     if(w.indexedDB)return;
     w.indexedDB=new IDBFactory();w.IDBKeyRange=IDBKeyRange;
     w.crypto.randomUUID=randomUUID;w.confirm=()=>true;w.TextEncoder=TextEncoder;
     w.qaDownloads=[];
     let lastBlob;
     w.URL.createObjectURL=blob=>{lastBlob=blob;return "blob:respaldo-de-prueba";};
     w.URL.revokeObjectURL=()=>{};
     const click=w.HTMLAnchorElement.prototype.click;
     w.HTMLAnchorElement.prototype.click=function(){
      if(!this.download)return click.call(this);
      w.qaDownloads.push({name:this.download,blob:lastBlob});
     };
     w.fetch=(url,opts)=>fetch(new URL(url,app.url),{...opts,headers:{...opts.headers,Origin:app.url}});
    }
  class LocalResources extends ResourceLoader {
   fetch(url,options){
    if(!url.startsWith(app.url+'/'))return null;
    const w=options.element?.ownerDocument?.defaultView;
    if(w)configureWindow(w);
    return super.fetch(url,options);
   }
  }
  const vc=new VirtualConsole();
  vc.on('jsdomError',e=>failures.push(e.message));
  const open=async()=>{
   dom=await JSDOM.fromURL(app.url+'/',{
    runScripts:'dangerously',resources:new LocalResources(),virtualConsole:vc,
    beforeParse:configureWindow
   });
   await wait(()=>dom.window.document.getElementById('hys316LocalNotice'));
   return dom.window.document;
  };
  const restart=async()=>{
   await app.close();
   app=await start(dir);
  };
  await run(open,()=>dom.window,app.url,restart);
  assert.deepEqual(failures,[]);
 }finally{
  dom?.window.close();await app.close();await rm(dir,{recursive:true,force:true});
 }
}
test('Interfaz avanzada abre Investigación y recupera borrador desde la cinta',async()=>{
 await escenario(async(open,window)=>{
  let d=await open();
  const get=id=>d.getElementById(id);
  assert.equal(get('authGate').hidden,true);
  assert.ok(get('moduleChooser'));
  assert.equal(get('aprModuleCard').hidden,false);
  const button=await wait(()=>d.querySelector('#hysToolsOptions [data-hys305-open]')||
   [...d.querySelectorAll('#hysToolsOptions button')].find(x=>x.textContent.includes('Investigación')));
  button.click();
  assert.equal(get('hys305Investigation').hidden,false);
  get('hys306OpenFinal').click();
  get('hys306-final-descripcion').value='Texto ficticio ingresado desde la interfaz avanzada';
  get('hys308SaveFinal').click();
  await wait(()=>d.body.textContent.includes('Borrador guardado en PostgreSQL local.'));
  window().close();
  d=await open();
  const again=[...d.querySelectorAll('#hysToolsOptions button')].find(x=>x.textContent.includes('Investigación'));
  assert.ok(again);again.click();
  get('hys308OpenTracking').click();
  const saved=await wait(()=>[...get('hys308List').querySelectorAll('button')].find(x=>x.textContent.startsWith('Abrir Final')));
  saved.click();
  await wait(()=>d.body.textContent.includes('Borrador recuperado de PostgreSQL local.'));
  assert.equal(get('hys306-final-descripcion').value,'Texto ficticio ingresado desde la interfaz avanzada');
 });
});
test('El modal de Investigación conserva el foco y lo devuelve al cerrar',async()=>{
 await escenario(async(open,window)=>{
  const d=await open(),w=window();
  const launch=await wait(()=>[...d.querySelectorAll('#hysToolsOptions button')].find(x=>x.textContent.includes('Investigación')));
  launch.click();
  const dialog=d.getElementById('hys305Investigation');
  const first=d.getElementById('hys305Close'),last=d.getElementById('hys306OpenFinal');
  // JSDOM no calcula geometría. Simulamos rectángulos para los dos extremos.
  first.getClientRects=last.getClientRects=()=>[{}];
  const key=(key,shiftKey=false)=>d.dispatchEvent(new w.KeyboardEvent('keydown',{key,shiftKey,cancelable:true}));
  last.focus();assert.equal(key('Tab'),false);assert.equal(d.activeElement,first);
  first.focus();assert.equal(key('Tab',true),false);assert.equal(d.activeElement,last);
  key('Escape');assert.equal(dialog.hidden,true);assert.equal(d.activeElement,launch);
 });
});
test('Prevencionistas guarda y recupera datos y fotografía en un navegador sin caché previa',async()=>{
 await escenario(async(open,window,url,restart)=>{
  let d=await open();
  const get=id=>d.getElementById(id);
  get('openAprModule').click();
  await wait(()=>window().Hys242.canWrite());
  get('hys322User').value='elaborador';
  get('hys322Pass').value='prueba-elaborador';
  get('hys322User').form.dispatchEvent(new (window().Event)('submit',{cancelable:true}));
  await wait(()=>get('hys318DraftStatus').textContent.includes('Sesión de informes iniciada'));

  const payload=window().Hys242Bridge.pack();
  payload.area='Eléctrica';
  const photo={name:'evidencia.png',type:'image/png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jK1sAAAAASUVORK5CYII='};
  payload.data.activities=[['APR','Eléctrica','Inspección ficticia','Sin novedades',[photo]]];
  window().Hys242Bridge.applyPack(payload);
  const originalPack=window().Hys242Bridge.pack;
  const originalFetch=window().fetch;
  let sent=false;
  window().fetch=(...args)=>{sent=true;return originalFetch(...args);};
  const limit=window().Hys293ArchivePolicy.reportRequestMaxBytes;
  window().Hys242Bridge.pack=()=>({...originalPack(),qa:'á'.repeat(Math.ceil(limit/2))});
  get('hys318SaveDraft').click();
  await wait(()=>get('hys318DraftStatus').textContent.includes('límite local de 7,1 MB'));
  assert.equal(sent,false,'El navegador debe rechazar antes de enviar.');
  window().Hys242Bridge.pack=originalPack;
  window().fetch=originalFetch;
  assert.equal(window().Hys242Bridge.pack().data.activities[0][2],'Inspección ficticia');
  const fetchOnline=window().fetch;
  window().fetch=async()=>{throw Error('Conexión interrumpida en prueba.');};
  get('hys318SaveDraft').click();
  await wait(()=>get('hys318DraftStatus').textContent.includes('Operación sin confirmar'));
  assert.equal(window().Hys242Bridge.pack().data.activities[0][2],'Inspección ficticia');
  window().fetch=fetchOnline;
  get('hys318SaveDraft').click();
  await wait(()=>get('hys318DraftStatus').textContent.includes('Revisión 1'));
  const post=body=>fetch(url+'/qa-borrador-diario',{method:'POST',headers:{Origin:url,'Content-Type':'application/json',Authorization:'Bearer '+JSON.parse(window().HYS322_SESSION_STORAGE.getItem('hys322-sesion-informes')).token},body:JSON.stringify({module:"APR",...body})});
  const oversize='á'.repeat(Math.ceil(limit/2)+1);
  const token=JSON.parse(window().HYS322_SESSION_STORAGE.getItem('hys322-sesion-informes')).token;
  const headers={Origin:url,'Content-Type':'application/json',Authorization:'Bearer '+token};
  const endpoint=url+'/qa-borrador-diario';
  const oversized=await fetch(endpoint,{method:'POST',headers,body:oversize});
  assert.equal(oversized.status,413);
  assert.match((await oversized.json()).error,/límite local/);
  const stream=new ReadableStream({start(controller){
   const bytes=new TextEncoder().encode(oversize);
   controller.enqueue(bytes.subarray(0,limit-100));
   controller.enqueue(bytes.subarray(limit-100));
   controller.close();
  }});
  const chunked=await fetch(endpoint,{method:'POST',headers,body:stream,duplex:'half'});
  assert.equal(chunked.status,413);
  assert.match((await chunked.json()).error,/límite local/);
  const conflict=await post({action:'guardar',payload,revision:0});
  assert.equal(conflict.status,409);
  assert.equal((await post({action:'guardar',payload:{...payload,module:'OTROS'},revision:1})).status,400);
  assert.equal((await post({action:'guardar',payload:{...payload,authenticatedUser:randomUUID()},revision:1})).status,400);
  window().close();
  await restart();
  d=await open();
  get('openAprModule').click();
  await wait(()=>window().Hys242.canWrite());
  get('hys322User').value='elaborador';
  get('hys322Pass').value='prueba-elaborador';
  get('hys322User').form.dispatchEvent(new (window().Event)('submit',{cancelable:true}));
  await wait(()=>get('hys318DraftStatus').textContent.includes('Sesión de informes iniciada'));

  assert.equal(window().Hys242Bridge.pack().data.activities.length,0);
  get('hys318RecoverDraft').click();
  await wait(()=>get('hys318DraftStatus').textContent.includes('recuperado'));
  const restored=window().Hys242Bridge.pack();
  assert.equal(restored.reportId,payload.reportId);
  assert.equal(restored.area,'Eléctrica');
  assert.equal(restored.data.activities[0][2],'Inspección ficticia');
  assert.equal(restored.data.activities[0][4][0].data,photo.data);
  get('hys318SaveDraft').click();
  await wait(()=>get('hys318DraftStatus').textContent.includes('Revisión 2'));
 });
});

test('La tarjeta Supervisores abre su formulario integrado sin pasar por Prevencionistas',async()=>{
 await escenario(async(open,window)=>{
  const d=await open();
  assert.equal(d.getElementById('otherModuleCard').hidden,false);
  d.getElementById('openOtherModule').click();
  const frame=d.getElementById('otherAprApp');
  const embedded=await wait(()=>{
   const child=frame.contentWindow;
   return child?.document.getElementById('hys316LocalNotice')&&child.Hys242?.canWrite()&&child;
  });
  await wait(()=>[...embedded.document.getElementById('area').options].some(option=>option.value==='Eléctrica'));
  await embedded.Hys242Bridge.save(false);
  assert.equal(embedded.Hys242Bridge.pack().module,'OTROS');
  assert.equal(embedded.document.querySelector('[data-tab=informe]').textContent.trim(),'▤ Hallazgos');
  assert.equal(embedded.document.getElementById('hys318SaveDraft').parentElement.hidden,false);
  assert.equal(window().__REPORTES_HYS_ACCESS__.selectedModule,'OTROS');
 });
});


test('Flash y Final descargan PDF con el mismo código y nombres abreviados',
 {skip:!process.env.HYS_JSPDF_251},async()=>{
 await escenario(async(open,window,url)=>{
  const d=await open(),w=window(),get=id=>d.getElementById(id);
  w.jspdf=require(process.env.HYS_JSPDF_251);
  const id=randomUUID();
  const names='Juan Luis Pérez Orrego / Juan Carlos Rojas Mendoza / Juan Antonio López Pérez';
  const post=body=>fetch(url+'/qa-investigacion',{
   method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body:JSON.stringify(body)
  });
  for(const [kind,data] of [['flash',{fecha_ocurrencia:'2026-11-11',involucrado:names,hechos:'Hechos ficticios'}],
    ['final',{fecha_incidente:'2026-11-12',involucrados:'Nombre distinto',descripcion:'Antecedentes ficticios'}]]){
   const saved=await post({action:'guardar',id,kind,version:0,data});
   assert.equal(saved.status,200);
  }
  const launch=await wait(()=>[...d.querySelectorAll('#hysToolsOptions button')].find(x=>x.textContent.includes('Investigación')));
  launch.click();
  for(const kind of ['Flash','Final']){
   get('hys308OpenTracking').click();
   const entry=await wait(()=>[...get('hys308List').querySelectorAll('button')].find(x=>x.textContent.startsWith('Abrir '+kind)));
   entry.click();
   await wait(()=>d.body.textContent.includes('Borrador recuperado de PostgreSQL local.'));
   const download=await wait(()=>{const button=get('hys332Download'+kind);return !button.disabled&&button;});
   download.click();
   await wait(()=>w.qaDownloads.length===(kind==='Flash'?1:2)||[...d.querySelectorAll('.hys308-warning')].find(x=>x.textContent.match(/No se descargó|Guarda los cambios/))).then(result=>{if(result!==true)throw Error(result.textContent);});
  }
  const [flash,final]=w.qaDownloads;
  const stem='2026-11-11_INV-0001_Juan Pérez-Juan Rojas-Juan López';
  assert.equal(flash.name,stem+'_Flash-Report.pdf');
  assert.equal(final.name,stem+'_Final-Report.pdf');
  for(const record of [flash,final]){
   const bytes=Buffer.from(await record.blob.arrayBuffer());
   assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
   const text=execFileSync('pdftotext',['-','-'],{input:bytes,encoding:'utf8'});
   assert.match(text,/INV-0001/);
   for(const full of ['Juan Luis Pérez Orrego','Juan Carlos Rojas Mendoza','Juan Antonio López Pérez']){
    assert.ok(text.replace(/\s+/g,' ').includes(full));
   }
  }
 });
});
