(function(root){
 'use strict';
 if(root.HYS316_ADVANCED_LOCAL!==true)return;
 const d=root.document;
 const revisions=new Map();
 const uncertainClosures=new Map();
 const panel=d.createElement('div');
 const status=d.createElement('p');
 status.setAttribute('role','status');
 status.id='hys318DraftStatus';
 let busy=false;
 const module=root.__REPORTES_HYS_OTROS_EMBEDDED__===true?'OTROS':'APR';
 const allowed=()=>root.__REPORTES_HYS_ACCESS__?.selectedModule===module;
 const buttons=[];
 const sessionKey='hys322-sesion-informes';
 const session=()=>JSON.parse(root.HYS322_SESSION_STORAGE.getItem(sessionKey)||'null');
 const canWrite=()=>session()?.write===true&&session()?.modules.includes(module);
 async function post(path,body,token){
  const serialized=JSON.stringify(body);
  const policy=root.Hys293ArchivePolicy;
  if(path==='/qa-borrador-diario'&&new Blob([serialized]).size>policy.reportRequestMaxBytes){
   throw Object.assign(Error(policy.reportRequestLimitMessage),{status:413});
  }
  const response=await root.fetch(path,{
   method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
   body:serialized
  });
  const result=await response.json();
  if(!response.ok)throw Object.assign(Error(result.error),{status:response.status});
  return result;
 }
 async function request(body){
  const token=session()?.token;
  try{
   const result=await post('/qa-borrador-diario',{...body,module},token);
   if(token!==session()?.token)throw Error('La cuenta de prueba cambió durante la consulta.');
   return result;
  }catch(error){
   if(error.status===401&&token&&token===session()?.token)await changeSession(null);
   throw error;
  }
 }
 const login=d.createElement('form');
 login.innerHTML='<label>Cuenta de prueba <input id="hys322User" required autocomplete="username"></label> '+
  '<label>Clave de prueba <input id="hys322Pass" type="password" required autocomplete="current-password"></label> '+
  '<button type="submit" class="btn">Ingresar a informes</button>';
 const signout=d.createElement('button');
 signout.id='hys322Signout';signout.type='button';signout.className='btn';signout.textContent='Cerrar sesión de informes';
 const identity=d.createElement('span');
 identity.id='hys322Identity';
 async function changeSession(value){
  if(value)root.HYS322_SESSION_STORAGE.setItem(sessionKey,JSON.stringify(value));
  else root.HYS322_SESSION_STORAGE.removeItem(sessionKey);
  resetSessionViews();
  await root.Hys322UseReportSession?.(value);
 }
 function resetSessionViews(){
  revisions.clear();uncertainClosures.clear();
  resetHistory();
  d.getElementById('archivedReports')?.replaceChildren();
  d.getElementById('changeHistoryModal')?.remove();
  sync();
 }
 login.addEventListener('submit',async event=>{
  event.preventDefault();
  const button=login.querySelector('button');
  button.disabled=true;
  try{
   const value=await post('/qa-sesion-informes',{action:'login',
    usuario:login.querySelector('#hys322User').value,clave:login.querySelector('#hys322Pass').value},session()?.token);
   await changeSession(value);
   status.textContent='Sesión de informes iniciada.';
   root.Hys242Bridge.renderArchivedReports();
  }catch(error){status.textContent=error.message;}
  finally{login.querySelector('#hys322Pass').value='';button.disabled=false;}
 });
 signout.onclick=async()=>{
  const token=session()?.token;
  await changeSession(null);
  try{
   await post('/qa-sesion-informes',{action:'logout'},token);
   status.textContent='Sesión de informes cerrada.';
  }catch{status.textContent='Sesión retirada de esta pantalla. El servidor no confirmó el cierre de sesión.';}
 };
 panel.append(login,identity,signout);
 function button(id,label,operation){
  const node=d.createElement('button');
  node.type='button';
  node.className='btn';
  node.id=id;
  node.textContent=label;
  buttons.push(node);
  panel.append(node);
  node.addEventListener('click',async()=>{
   if(busy||!allowed()||!canWrite()||!root.Hys242?.canWrite())return;
   const context=root.Hys255Guard.capture({report:true});
   busy=true;
   buttons.forEach(control=>control.disabled=true);
   status.textContent='Consultando PostgreSQL local…';
   try{await operation(context);}catch(error){
    status.textContent='Operación sin confirmar. '+error.message;
   }finally{
    busy=false;
    sync();
   }
  });
 }
 button('hys318SaveDraft','Guardar en base local',async context=>{
  const payload=root.Hys242Bridge.pack();
  const result=await request({action:'guardar',payload:{...payload,authenticatedUser:session().actor},revision:revisions.get(payload.reportId)||0});
  root.Hys255Guard.assert(context,{write:true});
  revisions.set(result.id,result.revision);
  const changed=root.HysFingerprint242(payload)!==root.HysFingerprint242(root.Hys242Bridge.pack());
  status.textContent='Borrador guardado en PostgreSQL local. Revisión '+result.revision+'.'+
   (changed?' Hay cambios posteriores en pantalla.':'');
 });
 button('hys318RecoverDraft','Recuperar último borrador de la base',async context=>{
  const initial=root.HysFingerprint242(root.Hys242Bridge.pack());
  const result=await request({action:'recuperar'});
  root.Hys255Guard.assert(context,{write:true});
  if(!result){status.textContent='Todavía no hay borradores en PostgreSQL local.';return;}
  if(initial!==root.HysFingerprint242(root.Hys242Bridge.pack()))throw Error('El formulario cambió durante la consulta.');
  if(!root.confirm('¿Abrir el último borrador de la base local? Se descargará un respaldo del formulario actual.')){
   status.textContent='Recuperación cancelada.';
   return;
  }
  const loaded=await root.Hys242.loadReport({id:result.id,reportData:result.payload});
  if(!loaded)throw Error('El borrador no se pudo abrir.');
  revisions.set(result.id,result.revision);
  status.textContent='Borrador recuperado de PostgreSQL local. Revisión '+result.revision+'.';
 });
 async function archiveRequest(body){
  const context=root.Hys255Guard.capture();
  const result=await request(body);
  root.Hys255Guard.assert(context);
  return result;
 }
 const more=d.createElement('button');
 more.id='hys331ArchiveMore';
 more.type='button';more.className='btn';more.textContent='Cargar más informes';
 const historyStatus=d.createElement('p');
 historyStatus.setAttribute('role','status');
 d.getElementById('archivedReports').after(more,historyStatus);
 let historyVersion=0,historyItems=[],historyNext=null;
 function resetHistory(){
  historyVersion++;
  historyItems=[];historyNext=null;
  more.hidden=true;more.disabled=false;
  historyStatus.textContent='';
 }
 resetHistory();
 async function firstHistoryPage(){
  resetHistory();
  const version=historyVersion;
  const result=await archiveRequest({action:'listarCerrados'});
  if(version!==historyVersion)return historyItems;
  historyItems=result.items;
  historyNext=result.next;
  more.hidden=!historyNext;
  return historyItems;
 }
 more.onclick=async()=>{
  if(!historyNext||more.disabled)return;
  const version=historyVersion;
  more.disabled=true;
  historyStatus.textContent='';
  try{
   const result=await archiveRequest({action:'listarCerrados',cursor:historyNext});
   if(version!==historyVersion)return;
   const known=new Set(historyItems.map(item=>item.id));
   historyItems=[...historyItems,...result.items.filter(item=>!known.has(item.id))];
   historyNext=result.next;
   await root.Hys242Bridge.renderArchivedReports(historyItems);
   more.hidden=!historyNext;
  }catch(error){
   if(version===historyVersion)historyStatus.textContent='No se cargaron más informes. '+error.message;
  }finally{
   if(version===historyVersion)more.disabled=false;
  }
 };
 root.Hys319Archive={
  enabled:allowed,
  list:firstHistoryPage,
  async read(id,pdf){
   const entry=await archiveRequest({action:'leerCerrado',id,pdf});
   if(entry?.pdf){
    entry.pdfBlob=new Blob([Uint8Array.from(atob(entry.pdf),char=>char.charCodeAt(0))],
     {type:'application/pdf'});
    delete entry.pdf;
   }
   return entry;
  }
 };
 const finalize=d.getElementById('finalize');
 finalize.onclick=async()=>{
  if(busy||!allowed()||!canWrite()||!root.Hys242?.canWrite())return false;
  const payload=root.Hys242Bridge.pack();
  const revision=revisions.get(payload.reportId);
  if(!revision||payload.status!=='En edición'){
   status.textContent='Guarda o recupera un borrador de la base local antes de finalizar.';
   return false;
  }
  if(!root.validarDatosInicioParaPDF("finalizar el informe")||!root.confirm('¿Finalizar y archivar el informe en la base local?'))return false;
  const context=root.Hys255Guard.capture({report:true});
  busy=true;
  finalize.disabled=true;
  status.textContent='Generando el PDF definitivo…';
  try{
   let attempt=uncertainClosures.get(payload.reportId);
   let saved;
   const validReceipt=value=>value?.id===payload.reportId&&value.revision===revision+1;
   const receipt=()=>request({action:'confirmarCierre',id:payload.reportId,operacion:attempt.operacion});
   if(attempt){
    status.textContent='Comprobando el cierre anterior…';
    saved=await receipt();
    if(saved&&!validReceipt(saved))throw Error('Acuse de cierre inesperado.');
    if(!saved)uncertainClosures.delete(payload.reportId);
   }
   if(!saved){
    await root.ensurePdfLibraries();
    const final={...payload,status:'Finalizado'};
    const result=await root.HysReportPdf.create(root.jspdf.jsPDF,final,{
     otros:module==='OTROS',photoColumns:root.getPhotoColumns(),photoRatio:root.getPhotoRatio()
    });
    if(result.warnings.length)throw Error(result.warnings.join(' '));
    const bytes=new Uint8Array(await result.blob.arrayBuffer());
    let raw='';
    for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));
    root.Hys255Guard.assert(context,{write:true});
    if(root.HysFingerprint242(payload)!==root.HysFingerprint242(root.Hys242Bridge.pack())){
     throw Error('El formulario cambió mientras se generaba el PDF. Vuelve a finalizar.');
    }
    attempt={operacion:root.crypto.randomUUID(),payload};
    uncertainClosures.set(payload.reportId,attempt);
    try{
     saved=await request({action:'finalizar',payload:{...payload,authenticatedUser:session().actor},revision,operacion:attempt.operacion,
      pdf:btoa(raw),filename:root.nombreArchivoPDF()});
     if(!validReceipt(saved))throw Error('Acuse de cierre inesperado.');
    }catch(error){
     if(error.status>=400&&error.status<500){
      uncertainClosures.delete(payload.reportId);
      throw error;
     }
     status.textContent='Se perdió la respuesta. Comprobando el cierre en la base local…';
     saved=await receipt();
     if(!validReceipt(saved))throw error;
    }
   }
   uncertainClosures.delete(payload.reportId);
   root.Hys255Guard.assert(context,{write:true});
   const unchanged=root.HysFingerprint242(attempt.payload)===root.HysFingerprint242(root.Hys242Bridge.pack());
   if(unchanged){
    root.Hys242Bridge.applyPack({...attempt.payload,status:'Finalizado'});
   }
   revisions.delete(saved.id);
   status.textContent='Informe finalizado y PDF archivado en PostgreSQL local. Revisión '+saved.revision+'.'+
    (unchanged?'':' Los cambios posteriores que ves en pantalla no se incluyeron en el cierre.');
   return true;
  }catch(error){
   status.textContent='Cierre sin confirmar. '+error.message+
    (uncertainClosures.has(payload.reportId)?' Vuelve a pulsar Finalizar informe para comprobar el cierre.':'');
   return false;
  }finally{
   busy=false;
   finalize.disabled=!root.Hys242?.canWrite();
  }
 };
 panel.append(status);
 d.getElementById('saveState242').after(panel);
 const sync=()=>{
  const account=session();
  panel.hidden=!allowed();
  login.hidden=!!account;
  signout.hidden=!account;
  identity.textContent=account?(account.write?'Cuenta de informes · Elaboración':'Cuenta de informes · Solo consulta'):'';
  buttons.forEach(control=>control.disabled=busy||!canWrite());
 };
 root.addEventListener('reportes-hys-access-changed',sync);
 root.addEventListener('storage',event=>{if(event.key===sessionKey){resetSessionViews();void root.Hys322UseReportSession?.(session());}});
 sync();
})(window);
