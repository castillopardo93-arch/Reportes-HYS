const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtemp,rm}=require('node:fs/promises');
const {join}=require('node:path');
const {tmpdir}=require('node:os');
const {randomUUID}=require('node:crypto');
const {JSDOM,ResourceLoader,VirtualConsole}=require('jsdom');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const {start}=require('./servidor-local.cjs');
const {autor,revisor,cierre,ajeno}=require('./fixture-local.cjs');
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1sAAAAASUVORK5CYII=';
async function wait(check){
 for(let i=0;i<400;i++){const v=check();if(v)return v;await new Promise(done=>setTimeout(done,15));}
 throw Error('Estado de prueba no alcanzado');
}
test('Interfaz avanzada: evidencia, revisión, corrección y cierre con facultad',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'hys317-'));
 const app=await start(dir);let dom;
 const errors=[];
 try{
  class Local extends ResourceLoader {fetch(url,opts){return url.startsWith(app.url+'/')?super.fetch(url,opts):null;}}
  const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  dom=await JSDOM.fromURL(app.url+'/',{
   runScripts:'dangerously',resources:new Local(),virtualConsole:vc,
   beforeParse(w){
    w.indexedDB=new IDBFactory();w.IDBKeyRange=IDBKeyRange;w.crypto.randomUUID=randomUUID;
    w.confirm=()=>true;w.prompt=()=> 'Evidencia sustituida en prueba';
    w.fetch=(url,opts)=>fetch(new URL(url,app.url),{...opts,headers:{...opts.headers,Origin:app.url}});
   }
  });
  const w=dom.window,d=w.document;
  const get=id=>d.getElementById(id);
  const control=(kind,name)=>d.querySelector('#hys306'+(kind==='flash'?'Flash':'Final')+'Form [name="'+name+'"]');
  const button=(kind,text)=>[...get(kind==='flash'?'hys306FlashForm':'hys306FinalForm').querySelectorAll('button')].find(b=>b.textContent===text);
  const api=async(body,actor=autor)=>{
   const r=await fetch(app.url+'/qa-investigacion',{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({...body,actor})});
   return {status:r.status,data:await r.json()};
  };
  const message=()=>d.querySelector('#hys308WorkspaceTools [role="status"]').textContent;
  async function clickMessage(kind,text,expected){
   const b=button(kind,text);assert.equal(b.disabled,false,'Botón deshabilitado: '+text);
   b.click();try{await wait(()=>message().includes(expected));}catch(error){throw Error(error.message+' '+text+': '+message());}
  }
  async function actor(id){
   const select=d.querySelector('[aria-label="Cuenta ficticia de prueba"]');
   select.value=id;select.dispatchEvent(new w.Event('change',{bubbles:true}));
   await wait(()=>get('hys308List').querySelector('button')||get('hys308List').textContent.includes('No hay'));
  }
  async function open(kind){
   const b=await wait(()=>[...get('hys308List').querySelectorAll('button')].find(b=>b.textContent.startsWith('Abrir '+(kind==='flash'?'Flash':'Final'))));
   b.click();await wait(()=>message().includes('recuperado'));
  }
  async function send(kind,reason=''){
   const input=d.querySelector('[aria-label="Buscar revisor autorizado '+kind+'"]');
   input.value='jose';input.dispatchEvent(new w.Event('input',{bubbles:true}));
   const sel=d.querySelector('[aria-label="Revisor autorizado '+kind+'"]');
   await wait(()=>sel.querySelector('option'));
   assert.equal(sel.value,revisor);
   d.querySelector('[aria-label="Motivo de revisión '+kind+'"]').value=reason;
   await clickMessage(kind,'Enviar a revisión','Operación registrada: en_revision');
  }
  await wait(()=>get('hys316LocalNotice')&&d.querySelector('[aria-label="Cuenta ficticia de prueba"] option'));
  get('hys305OpenAccidents').click();get('hys306OpenFlash').click();
  const flash={
   tipo_incidente:'Daño Material',probabilidad:'Baja',fecha_ocurrencia:'2026-11-10',hora:'09:30',
   area_proyecto:'VA4',ubicacion:'Zona ficticia',involucrado:'Persona ficticia',cargo:'Operador',
   primeros_auxilios:'No',ambulancia:'No',hospital:'No',existen_testigos:'No',
   hechos:'Descripción ficticia del evento suficientemente detallada',causas_aparentes:'Causa ficticia inicial',
   acciones_inmediatas:'Acción preventiva ficticia',reportado_por:'Persona ficticia',preparado_por:'Persona ficticia'
  };
  for(const [key,value] of Object.entries(flash)){control('flash',key).value=value;}
  await clickMessage('flash','Guardar borrador local','Borrador guardado');
  const files=control('flash','fotografias');
  const file=new w.File([Buffer.from(png,'base64')],'foto.png',{type:'image/png'});
  Object.defineProperty(files,'files',{configurable:true,value:[file]});
  await clickMessage('flash','Subir archivos seleccionados','Evidencias guardadas');
  Object.defineProperty(files,'files',{configurable:true,value:[]});
  const row=(await api({action:'listar',page:0})).data[0];
  const id=row.expediente;
  const list=(await api({action:'evidencia',id,kind:'flash',operation:'listar'})).data;
  assert.equal(list.length,1);assert.equal(list[0].campo,'fotografias');
  assert.equal((await api({action:'evidencia',id,kind:'flash',operation:'leer',fileId:list[0].id},ajeno)).status,403);
  const concurrent=await Promise.all([
   api({action:'evidencia',id,kind:'flash',operation:'leer',fileId:list[0].id},autor),
   api({action:'evidencia',id,kind:'flash',operation:'leer',fileId:list[0].id},ajeno),
   api({action:'evidencia',id,kind:'flash',operation:'leer',fileId:list[0].id},autor)
  ]);
  assert.deepEqual(concurrent.map(result=>result.status),[200,403,200]);
  const retry=await api({action:'evidencia',id,kind:'flash',operation:'subir',fileId:list[0].id,name:'foto.png',mime:'image/png',base64:png,field:'fotografias'});
  assert.equal(retry.status,200,'Reintentar misma evidencia no duplica archivo');
  await send('flash');
  assert.equal(control('flash','hechos').disabled,true);
  assert.equal((await api({action:'evidencia',id,kind:'flash',operation:'eliminar',fileId:list[0].id,reason:'Intento en revisión'})).status,400);
  await actor(revisor);await open('flash');
  d.querySelector('[aria-label="Motivo de revisión flash"]').value='Corregir descripción de los hechos';
  await clickMessage('flash','Devolver para corregir','Operación registrada: devuelto');
  await actor(autor);await open('flash');
  assert.equal(control('flash','hechos').disabled,false);
  control('flash','hechos').value+=' corregida';
  const del=[...get('hys306FlashForm').querySelectorAll('button')].find(b=>b.textContent==='Eliminar foto.png');
  del.click();await wait(()=>message().includes('eliminada con trazabilidad'));
  await send('flash');
  await actor(revisor);await open('flash');
  await clickMessage('flash','Aprobar revisión','Operación registrada: aprobado');
  assert.equal(button('flash','Cerrar documento').disabled,true);
  const approved=(await api({action:'leer',id,kind:'flash'},revisor)).data.documento;
  assert.equal((await api({action:'cerrar',id,kind:'flash',version:approved.version,reason:'Prueba de denegación'},revisor)).status,403);
  await actor(cierre);await open('flash');
  d.querySelector('[aria-label="Motivo de revisión flash"]').value='Cierre autorizado de prueba';
  await clickMessage('flash','Cerrar documento','Operación registrada: cerrado');
  assert.equal((await api({action:'leer',id,kind:'flash'},cierre)).data.documento.estado,'cerrado');
  const audit=(await api({action:'evidencia',id,kind:'flash',operation:'listar'},cierre)).data;
  assert.equal(audit[0].eliminado_por,autor);
  await actor(autor);
  const associated=await wait(()=>[...get('hys308List').querySelectorAll('button')].find(b=>b.textContent==='Crear Final asociado'));
  associated.click();
  const final={
   involucrados:'Persona ficticia',fecha_incidente:'2026-11-10',tipo_incidente:'Daño Material',
   lugar_incidente:'VA4',descripcion:'Descripción ficticia final del incidente',equipo_investigador:'Equipo ficticio',
   condiciones_subestandar:'1.1 — ACUÑADURA DEFICIENTE',action_1_codigo:'1.1 / texto libre',
   action_1_descripcion:'Acción preventiva recomendada de prueba'
  };
  for(const [key,value] of Object.entries(final))control('final',key).value=value;
  await clickMessage('final','Guardar borrador local','Borrador guardado');
  const pdf=Buffer.from('%PDF-1.4\nDocumento ficticio de prueba\n%%EOF\n');
  const docs=control('final','documentos');
  Object.defineProperty(docs,'files',{configurable:true,value:[new w.File([pdf],'documento.pdf',{type:'application/pdf'})]});
  await clickMessage('final','Subir archivos seleccionados','Evidencias guardadas');
  Object.defineProperty(docs,'files',{configurable:true,value:[]});
  const finalFiles=(await api({action:'evidencia',id,kind:'final',operation:'listar'})).data;
  assert.equal(finalFiles[0].campo,'documentos');
  const download=[...get('hys306FinalForm').querySelectorAll('button')].find(b=>b.textContent==='Ver / descargar documento.pdf');
  download.click();
  await wait(()=>get('hys306FinalForm').querySelector('a[download="documento.pdf"]'));
  const restored=(await api({action:'evidencia',id,kind:'final',operation:'leer',fileId:finalFiles[0].id})).data;
  assert.equal(Buffer.from(restored.base64,'base64').toString(),pdf.toString());
  const invalid=await api({action:'evidencia',id,kind:'final',operation:'subir',fileId:randomUUID(),
   name:'malo.pdf',mime:'application/pdf',base64:Buffer.from('no es un pdf válido').toString('base64'),field:'documentos'});
  assert.equal(invalid.status,400);
  await send('final');
  await actor(revisor);await open('final');
  await clickMessage('final','Aprobar revisión','Operación registrada: aprobado');
  await actor(cierre);await open('final');
  d.querySelector('[aria-label="Motivo de revisión final"]').value='Cierre Final autorizado de prueba';
  await clickMessage('final','Cerrar documento','Operación registrada: cerrado');
  const finalSaved=(await api({action:'leer',id,kind:'final'},cierre)).data;
  assert.equal(finalSaved.documento.estado,'cerrado');
  assert.equal(finalSaved.documento.datos.action_1_codigo,'1.1 / texto libre');
  assert.ok(finalSaved.historial.some(event=>event.accion==='enviar'));
  const staleId=randomUUID();
  const apply=async(kind,action,version,actor,data=null,reason=null)=>
   api({action,id:staleId,kind,version,data,reviewer:action==='enviar'?revisor:null,reason},actor);
  assert.equal((await apply('flash','guardar',0,autor,flash)).status,200);
  assert.equal((await apply('flash','enviar',1,autor)).status,200);
  assert.equal((await apply('final','guardar',0,autor,final)).status,200);
  assert.equal((await apply('final','enviar',1,autor)).status,200);
  assert.equal((await apply('flash','devolver',2,revisor,null,'Completar Flash')).status,200);
  assert.equal((await apply('flash','guardar',3,autor,{...flash,hechos:'Relato corregido con nuevos antecedentes ficticios'})).status,200);
  assert.equal((await apply('flash','enviar',4,autor)).status,200);
  assert.equal((await apply('flash','aprobar',5,revisor)).status,200);
  await actor(revisor);await open('final');
  assert.equal(button('final','Aprobar revisión').disabled,true);
  assert.match(button('final','Aprobar revisión').title,/reconciliar/);
  assert.equal((await apply('final','aprobar',2,revisor)).status,400);
  for(let i=0;i<19;i++){
   const draft=await api({action:'guardar',id:randomUUID(),kind:'flash',version:0,data:{}});
   assert.equal(draft.status,200);
  }
  const page1=(await api({action:'listar',page:0})).data;
  const page2=(await api({action:'listar',page:1})).data;
  const boundary=page1.find(row=>row.expediente===staleId);
  assert.ok(boundary);
  assert.ok(page2.some(row=>row.expediente===staleId&&row.tipo!==boundary.tipo));
  assert.equal(boundary.permite_asociado,false);
  assert.match(boundary.codigo,/^INV-\d+$/);
  assert.deepEqual(errors,[]);
 }finally{dom?.window.close();await app.close();await rm(dir,{recursive:true,force:true});}
});
