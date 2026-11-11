const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {mkdtemp,rm,writeFile}=require('node:fs/promises');
const {join}=require('node:path');
const {tmpdir}=require('node:os');
const {execFileSync}=require('node:child_process');
const {randomUUID}=require('node:crypto');
const {JSDOM,ResourceLoader,VirtualConsole}=require('jsdom');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const {start}=require('./servidor-local.cjs');

async function until(check){
 for(let i=0;i<250;i++){
  const value=check();
  if(value)return value;
  await new Promise(resolve=>setTimeout(resolve,20));
 }
 throw Error('La interfaz no alcanzó el estado esperado.');
}

for(const module of ['APR','OTROS'])test('Recorrido '+module+': PDF real con foto, cierre e historial separado',
 {skip:!process.env.HYS_JSPDF_251},async()=>{
 const library=readFileSync(process.env.HYS_JSPDF_251);
 const dir=await mkdtemp(join(tmpdir(),'hys319-'));
 let app=await start(join(dir,'db'));
 let dom;
 const errors=[],alerts=[],downloads=[];
 const storedBlobs=new Map();
 const profile=new IDBFactory();
 class Resources extends ResourceLoader{
  fetch(url,options){
   if(url.includes('/jspdf/2.5.1/jspdf.umd.min.js'))return Promise.resolve(library);
   if(url.startsWith(app.url+'/'))return super.fetch(url,options);
   return null;
  }
 }
 async function open(indexedDB=profile,storedSession=[]){
  const vc=new VirtualConsole();
  vc.on('jsdomError',e=>{
   // El sondeo de canvas al cargar jsPDF no participa en la ruta de PNG directa.
   if(!e.message.startsWith('Not implemented: HTMLCanvasElement.prototype.getContext'))errors.push(e.message);
  });
  dom=await JSDOM.fromURL(app.url+(module==='OTROS'?'/index.html?embedded=otros':'/'),{
   runScripts:'dangerously',resources:new Resources(),virtualConsole:vc,
   beforeParse(w){
    for(const [key,value] of storedSession)w.sessionStorage.setItem(key,value);
    w.indexedDB={open:indexedDB.open.bind(indexedDB),deleteDatabase:indexedDB.deleteDatabase.bind(indexedDB)};w.IDBKeyRange=IDBKeyRange;
    w.Blob=Blob;w.crypto.randomUUID=randomUUID;w.confirm=()=>true;
    w.alert=message=>alerts.push(message);
    w.URL.createObjectURL=blob=>{
     const url='blob:'+randomUUID();storedBlobs.set(url,blob);return url;
    };
    w.URL.revokeObjectURL=url=>storedBlobs.delete(url);
    const click=w.HTMLAnchorElement.prototype.click;
    w.HTMLAnchorElement.prototype.click=function(){
     if(this.download){downloads.push({name:this.download,blob:storedBlobs.get(this.href)});return;}
     return click.call(this);
    };
    w.fetch=(url,opts)=>fetch(new URL(url,app.url),{...opts,headers:{...opts.headers,Origin:app.url}});
   }
  });
  const w=dom.window;
  await until(()=>w.document.getElementById('hys316LocalNotice'));
  if(module==='APR')await w.reportesHysChooseModule('APR');
  await until(()=>w.Hys242.canWrite());
  if(storedSession.length){
   await until(()=>[...w.document.getElementById('area').options].some(option=>option.value==='Mecánica'));
   await w.Hys242Bridge.save(false);
   return w;
  }
  const username=w.document.getElementById('hys322User');
  username.value='elaborador';
  w.document.getElementById('hys322Pass').value='prueba-elaborador';
  username.form.dispatchEvent(new w.Event('submit',{cancelable:true}));
  await until(()=>w.document.getElementById('hys318DraftStatus').textContent.includes('Sesión de informes iniciada'));
  return w;
 }
 try{
  let w=await open();
  const el=id=>w.document.getElementById(id);
  const payload=w.Hys242Bridge.pack();
  payload.area='Eléctrica';payload.shift='Día/Propio';
  const owner=module==='APR'?'ACME / Seguridad: "Turno"':'Compañía ' + 'Á'.repeat(100) + ' 🚧';
  payload.owner=owner;
  const photo={name:'evidencia.png',type:'image/png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAAA8CAIAAAB+RarbAAABg0lEQVR4nO3bwW3CQBCF4SFKDy7A7oIuSB8+UgRH+ghdpAYucA8F5J7Di1bI2lkce3d2Ztb/zSAkf5plhATsrt8/1FJvtW9Aug3svebA75Pr/cdY5T7K9fV5fr5sbsLNgadHOjQ5CbY6HM+P+y36FAs22uH4N6euH6JmV0c6aBM5mXCUGh2yB3BU6/M9zJ3hy2nkPlBYBSeo6ReaXFqLtWRuwmuoyBI4qp1PRTbA6wcb0g7OSEWql1Z2LamdcAkq0gjOspy4dIHLDTakBSxARSqWlpiWqk9YkopqgosuJ646YPnBhqTBFalIdGlV15LYhDVQkQS4ynLiKgvWM9hQKbBCKiqytNRqKfuENVNRTrCq5cSVB6x/sKG1YENUtGppmdPS4glbpKIlYBPLiet/YLuDDc0FO6CiWUvLjZZeTtgTFaXAppcTV/xId/3gUkvchB/3W9cPz484oKJZS8uNlhJgIC+n0ZOWEksLP/vx92tiFd8tSdYceLf9jcd5G9h7zYF/AYyJl7/3G75kAAAAAElFTkSuQmCC'};
  if(module==='APR')payload.data.activities=[['APR','Eléctrica','Inspección ficticia 321','Sin novedades',[photo]]];
  else payload.data.findings=[['Inspección ficticia 321','Media','Revisar acceso','Cuenta ficticia','Pendiente',[photo]]];
  w.Hys242Bridge.applyPack(payload);
  assert.equal(w.Hys242.canWrite(),true,el('saveState242').textContent+' · '+el('formAccess242').textContent);
  assert.equal(el('hys318SaveDraft').disabled,false);
  el('hys318SaveDraft').click();
  await until(()=>el('hys318DraftStatus').textContent.includes('Revisión 1'));
  const native=w.HYS322_SESSION_STORAGE;
  const storedSession=Array.from({length:native.length},(_,i)=>native.key(i))
   .map(key=>[key,native.getItem(key)]);
  dom.window.close();
  w=await open(profile,storedSession);
  assert.equal(w.Hys242.reportId(),payload.reportId);

  const validDraft=w.Hys242Bridge.pack();
  w.Hys242Bridge.applyPack({...validDraft,date:'2025-12-31',dateFrom:'2026-01-01',dateTo:'2026-01-02'});
  await el('pdfShare').onclick();
  assert.match(alerts.pop(),/generar el PDF.*dentro del período/);
  assert.equal(w.document.querySelector('[data-pdf-action=download]'),null);
  assert.equal(await el('finalize').onclick(),false);
  assert.match(alerts.pop(),/finalizar el informe.*dentro del período/);
  assert.equal(w.Hys242Bridge.pack().status,'En edición');
  w.Hys242Bridge.applyPack(validDraft);
  await w.Hys242Bridge.save(false);

  await el('pdfShare').onclick();
  assert.deepEqual(alerts,[]);
  w.document.querySelector('[data-pdf-action=download]').click();
  const pdf=downloads.at(-1).blob;
  const initialName=downloads.at(-1).name;
  assert.match(initialName,/^\d{4}-\d{2}-\d{2}_.*_Informe Diario_Día∕Propio\.pdf$/u);
  assert.doesNotMatch(initialName,/[\\/:*?"<>|]/);
  assert.ok(Buffer.byteLength(initialName)<=200);
  const file=join(dir,'informe.pdf');
  await writeFile(file,Buffer.from(await pdf.arrayBuffer()));
  const contents=execFileSync('pdftotext',[file,'-'],{encoding:'utf8'});
  assert.match(contents,/Inspección ficticia 321/);
  assert.match(contents,/Eléctrica/);
  assert.match(execFileSync('pdfimages',['-list',file],{encoding:'utf8'}),/^\s*\d+\s+\d+\s+image\s/m);
  assert.match(execFileSync('pdfinfo',[file],{encoding:'utf8'}),/Page size:.*A4/);
  const connected=w.fetch;
  const token=JSON.parse(w.HYS322_SESSION_STORAGE.getItem('hys322-sesion-informes')).token;
  w.fetch=(url,options)=>JSON.parse(options.body).action==='finalizar'
   ?Promise.reject(Error('Fallo de conexión de prueba')):connected(url,options);
  assert.equal(await el('finalize').onclick(),false);
  assert.equal(w.Hys242Bridge.pack().status,'En edición');
  w.fetch=connected;
  const draft=await (await connected('/qa-borrador-diario',{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'recuperar',module})
  })).json();
  assert.equal(draft.id,payload.reportId);
  assert.equal(draft.revision,1);

  const post=body=>connected('/qa-borrador-diario',{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({module,...body})
  });
  const other=module==='APR'?'OTROS':'APR';
  const foreign={...payload,module:other,data:{activities:[],inspections:[],findings:[]}};
  assert.equal((await post({action:'guardar',module:other,payload:foreign,revision:1})).status,409);

  const renderPdf=w.HysReportPdf.create;
  const oversizedPdf=new Blob([Buffer.alloc(5400000)],{type:'application/pdf'});
  w.HysReportPdf.create=async()=>({warnings:[],blob:oversizedPdf});
  let closeSent=false;
  w.fetch=(url,options)=>{if(JSON.parse(options.body).action==='finalizar')closeSent=true;return connected(url,options);};
  assert.equal(await el('finalize').onclick(),false);
  assert.match(el('hys318DraftStatus').textContent,/límite local de 7,1 MB/);
  assert.equal(closeSent,false);
  assert.equal(w.Hys242Bridge.pack().status,'En edición');
  w.fetch=connected;
  w.HysReportPdf.create=renderPdf;
  let closeRequest;
  let loseReceipt=module==='OTROS';
  w.fetch=async(url,options)=>{
   const body=JSON.parse(options.body);
   if(body.action==='confirmarCierre'&&loseReceipt)throw Error('Sin conexión para consultar el acuse');
   if(body.action!=='finalizar')return connected(url,options);
   closeRequest=body;
   assert.equal(body.filename,initialName);
   const unsafe=await post({...body,filename:'CON.pdf'});
   assert.equal(unsafe.status,400);
   assert.match((await unsafe.json()).error,/PDF inválido/);
   const dateCases=[
    [{date:'2026-02-30'},/fecha válida/],
    [{dateFrom:'2026-01-02',dateTo:'2026-01-01'},/posterior/],
    [{dateFrom:'2026-01-01',dateTo:'2026-01-02',date:'2026-01-03'},/dentro del período/]
   ];
   for(const [change,expected] of dateCases){
    const rejected=await post({...body,payload:{...body.payload,...change}});
    assert.equal(rejected.status,400);
    assert.match((await rejected.json()).error,expected);
   }
   assert.equal((await post({...body,pdf:'bm8='})).status,400);
   assert.equal((await post({action:'recuperar'})).status,200);
   const replies=await Promise.all([connected(url,options),post(body)]);
   assert.deepEqual(replies.map(response=>response.status).sort(),[200,409]);
   throw Error('Respuesta perdida después del cierre');
  };
  const recovered=await el('finalize').onclick();
  if(module==='OTROS'){
   assert.equal(recovered,false);
   assert.match(el('hys318DraftStatus').textContent,/comprobar el cierre/);
   loseReceipt=false;
   assert.equal(await el('finalize').onclick(),true,el('hys318DraftStatus').textContent);
  }else assert.equal(recovered,true,el('hys318DraftStatus').textContent);
  assert.notEqual(w.Hys242.reportId(),payload.reportId);
  assert.deepEqual(JSON.parse(JSON.stringify(w.Hys242Bridge.pack().data)),{activities:[],inspections:[],findings:[]});
  assert.equal(w.Hys242Bridge.pack().status,'En edición');
  assert.equal(await el('finalize').onclick(),false);
  w.fetch=connected;
  const receipt={action:'confirmarCierre',id:payload.reportId,operacion:closeRequest.operacion};
  assert.equal((await (await post(receipt)).json()).revision,2);
  assert.equal(await (await post({...receipt,module:other})).json(),null);
  assert.equal(await (await post({...receipt,operacion:randomUUID()})).json(),null);
  const after=await w.Hys242Bridge.getArchivedReport(payload.reportId);
  assert.equal(after.reportData.status,'Finalizado');
  assert.deepEqual((await (await post({action:'listarCerrados'})).json()).items.map(row=>row.id),[payload.reportId]);
  assert.equal(after.reportData.owner,owner);
  assert.ok(after.pdfBlob?.size>0);
  assert.equal((await post({action:'guardar',payload,revision:after.revision})).status,409);
  assert.deepEqual(await (await post({action:'listarCerrados',module:other})).json(),{items:[],next:null});
  assert.equal(await (await post({action:'leerCerrado',module:other,id:payload.reportId,pdf:true})).json(),null);
  assert.equal(await (await post({action:'recuperar',module:other})).json(),null);

  const api=(path,body,key)=>connected(path,{
   method:'POST',headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},
   body:JSON.stringify(body)
  });
  const login=async(usuario,clave)=>(await (await api('/qa-sesion-informes',{action:'login',usuario,clave})).json()).token;
  const report={module,action:'leerCerrado',id:payload.reportId,pdf:true};
  assert.equal((await api('/qa-borrador-diario',report)).status,401);
  assert.equal((await api('/qa-sesion-informes',{action:'login',usuario:'consulta-apr',clave:'incorrecta'})).status,401);
  const viewer=await login('consulta-apr','prueba-consulta');
  const ownerOther=await login('otro-elaborador','prueba-otro');
  if(module==='APR'){
   const readable=await api('/qa-borrador-diario',report,viewer);
   assert.equal(readable.status,200);
   assert.ok((await readable.json()).pdf);
   assert.equal((await api('/qa-borrador-diario',{...closeRequest,action:'finalizar'},viewer)).status,403);
   assert.equal(await (await api('/qa-borrador-diario',report,ownerOther)).json(),null);
   const foreign={...closeRequest,payload:{...closeRequest.payload,area:'Mecánica',authenticatedUser:'00000000-0000-4000-8000-000000000004'}};
   assert.equal((await api('/qa-borrador-diario',foreign,ownerOther)).status,409);
   assert.equal((await api('/qa-borrador-diario',{...foreign,action:'guardar',revision:0},ownerOther)).status,409);
  }else assert.equal((await api('/qa-borrador-diario',report,viewer)).status,403);
  await api('/qa-sesion-informes',{action:'logout'},viewer);
  assert.equal((await api('/qa-borrador-diario',report,viewer)).status,401);

  await w.Hys242Bridge.save(false);
  dom.window.close();
  await app.close();
  app=await start(join(dir,'db'));
  w=await open(new IDBFactory());
  w.document.querySelector('[data-tab=historial]').click();
  const download=await until(()=>w.document.querySelector('[data-archive-download]'));
  assert.equal(download.dataset.archiveDownload,payload.reportId);
  assert.equal(download.disabled,false);
  const edit=w.document.querySelector('[data-archive-edit]');
  assert.equal(edit.disabled,true);
  const count=downloads.length;
  download.click();
  await until(()=>downloads.length>count);
  assert.equal(downloads.at(-1).name,initialName);
  await writeFile(file,Buffer.from(await downloads.at(-1).blob.arrayBuffer()));
  const finalText=execFileSync('pdftotext',[file,'-'],{encoding:'utf8'});
  assert.match(finalText,/Finalizado/);
  assert.match(finalText,module==='OTROS'?/INFORME DE HALLAZGOS/:/INFORME DIARIO HYS/);
  assert.match(finalText,/Inspección ficticia 321/);
  assert.match(execFileSync('pdfimages',['-list',file],{encoding:'utf8'}),/^\s*\d+\s+\d+\s+image\s/m);
  if(module==='OTROS'){
   const originalFetch=w.fetch;
   const [item]=await w.Hys319Archive.list();
   const next={at:'2026-11-11 11:00:00.123456+00',id:item.id};
   const second={...item,id:'v242-'+randomUUID(),filename:'Informe anterior.pdf'};
   let failNext=true;
   w.fetch=async(url,options)=>{
    const body=JSON.parse(options.body);
    if(body.action!=='listarCerrados')return originalFetch(url,options);
    if(body.cursor&&failNext)throw Error('Sin conexión de prueba');
    return new Response(JSON.stringify(body.cursor?{items:[second],next:null}:{items:[item],next}),{status:200});
   };
   await w.Hys242Bridge.renderArchivedReports();
   const more=el('hys331ArchiveMore');
   assert.equal(more.hidden,false);
   await more.onclick();
   assert.match(more.nextSibling.textContent,/No se cargaron más/);
   assert.equal(w.document.querySelectorAll('[data-archive-download]').length,1);
   failNext=false;
   await more.onclick();
   assert.equal(w.document.querySelectorAll('[data-archive-download]').length,2);
   assert.equal(more.hidden,true);
   w.fetch=originalFetch;
  }
  if(module==='APR'){
   el('hys322Signout').click();
   await until(()=>el('hys318DraftStatus').textContent.includes('Sesión de informes cerrada'));
   assert.equal(w.document.querySelector('[data-archive-download]'),null);
   assert.equal(w.Hys242Bridge.pack().data.activities.length,0);
   const user=el('hys322User');
   user.value='consulta-apr';
   el('hys322Pass').value='prueba-consulta';
   user.form.dispatchEvent(new w.Event('submit',{cancelable:true}));
   await until(()=>el('hys318DraftStatus').textContent.includes('Sesión de informes iniciada'));
   assert.equal(el('hys318SaveDraft').disabled,true);
   assert.equal(w.Hys242.canWrite(),false);
   assert.equal(w.Hys242Bridge.pack().data.activities.length,0);
   assert.ok(await until(()=>w.document.querySelector('[data-archive-download]')));
  }
  assert.deepEqual(alerts,[]);
  assert.deepEqual(errors,[]);
  if(module==='OTROS'&&process.env.HYS_PDF_EVIDENCIA){
   await writeFile(process.env.HYS_PDF_EVIDENCIA,Buffer.from(await downloads.at(-1).blob.arrayBuffer()));
  }
 }finally{
  dom?.window.close();
  await app.close();
  await rm(dir,{recursive:true,force:true});
 }
});
