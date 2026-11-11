/* v242: permisos efectivos, conservación atómica y sincronización aislada. */
(function(){
 'use strict';
 const B=window.Hys242Bridge,$=id=>document.getElementById(id),clone=v=>JSON.parse(JSON.stringify(v));
 const roleLabel=r=>({administrador_global:'Administrador general',administrador_area:'Administrador',supervisor:'Supervisor',usuario:'Usuario'}[r]||r);
 const moduleLabel=m=>window.HysAppearance242?.moduleLabel(m)||({APR:'Prevencionista de riesgos',OTROS:'Supervisores, capataces y otros'}[m]||m);
 let current=null,generation=0,suppress=false,queue=null,store=null,timer=null,scope='',draftId='',catalog=null,conflict=false,phase='idle',preserveOwner=false,protectedOwner='',reportPage=0,reportsFlight=null,lastError='',localSaved=false;
 const revisions=new Map();
 const uuid=()=>crypto.randomUUID(),access=()=>window.__REPORTES_HYS_ACCESS__;
 function editable(){const m=current?.selectedModule,a=access();return !!((window.HYS242_DEPLOYMENT_READY===true||window.HYS250_LOCAL_EDIT===true)&&m&&current.profile?.activo===true&&!current.offline&&Array.isArray(current.modules)&&current.modules.includes(m)&&a?.userId===current.userId&&a?.selectedModule===m&&(current.profile.rol==='administrador_global'||current.permissions?.some(p=>p.modulo===m&&p.puede_ver===true&&p.puede_editar===true&&p.areas?.activa!==false)))}
 function canWrite(){return phase==='ready'&&!suppress&&editable()}
 function allowedManage(){return !current?.offline&&['administrador_global','administrador_area','supervisor'].includes(current?.profile.rol)}
 function message(s){const el=$('cloudStatus242');if(el)el.textContent=s;const bar=$('saveState242');if(bar)bar.textContent=s}
 function central(){return window.HYS292_REMOTE_WRITE_AUTHORIZED===true&&window.HYS242_ENABLE_CENTRAL===true&&window.HYS242_DEPLOYMENT_READY===true}
 function canReadCentral(){return window.Hys298ReadGate?.canReadRemote(navigator,window)===true}
 function localConflict255(e){if(e?.code!=='LOCAL_CONFLICT')return false;phase='local-conflict';H.hasPending=true;message('Conflicto entre pestañas: no se reemplazó la copia guardada. Exporta tu copia JSON y recarga.');setWriteAccess();return true;}
 function database(uid,module){return new Promise((ok,no)=>{let done=false;const fail=e=>{if(!done){done=true;clearTimeout(timeout);no(e)}};const timeout=setTimeout(()=>fail(Error('Almacenamiento ocupado')),5000);let req;try{req=window.HysStorage242.openNative('hys-v266-laboratorio-queue::'+uid+'::'+module,1)}catch(e){fail(e);return}req.onupgradeneeded=()=>{for(const n of ['pending','meta','draft'])if(!req.result.objectStoreNames.contains(n))req.result.createObjectStore(n,{keyPath:'id'})};req.onerror=()=>fail(req.error);req.onblocked=()=>fail(Error('Almacenamiento ocupado por otra pestaña'));req.onsuccess=()=>{if(done){req.result.close();return}done=true;clearTimeout(timeout);ok(req.result)}})}
 function adapter(db){
 function compareAndBatch(ops,expected){return new Promise((ok,no)=>{
  const tx=db.transaction([...new Set(['draft',...ops.map(o=>o.store)])],'readwrite');let conflict;
  const req=tx.objectStore('draft').get('current');req.onsuccess=()=>{
   const revision=req.result?.localRevision||0;
   if(revision!==expected){conflict=Object.assign(Error('Otra pestaña guardó una versión distinta. Conserva tu copia antes de recargar.'),{code:'LOCAL_CONFLICT'});tx.abort();return;}
   for(const o of ops)o.remove?tx.objectStore(o.store).delete(o.id):tx.objectStore(o.store).put(o.value);
  };
  tx.oncomplete=ok;tx.onerror=()=>no(conflict||tx.error);tx.onabort=()=>no(conflict||tx.error||Error('Guardado cancelado'));
 })}
 function call(n,mode,fn){return new Promise((ok,no)=>{const tx=db.transaction(n,mode);let req;try{req=fn(tx.objectStore(n))}catch(e){tx.abort();no(e);return}tx.oncomplete=()=>ok(req?.result);tx.onerror=()=>no(tx.error);tx.onabort=()=>no(tx.error||Error('Guardado cancelado'))})}return {kind:'IndexedDB',compareAndBatch,get:(n,id)=>call(n,'readonly',s=>s.get(id)),all:n=>call(n,'readonly',s=>s.getAll()),put:(n,v)=>call(n,'readwrite',s=>s.put(v)),remove:(n,id)=>call(n,'readwrite',s=>s.delete(id)),batch(ops){return new Promise((ok,no)=>{const tx=db.transaction([...new Set(ops.map(o=>o.store))],'readwrite');for(const o of ops)o.remove?tx.objectStore(o.store).delete(o.id):tx.objectStore(o.store).put(o.value);tx.oncomplete=ok;tx.onerror=()=>no(tx.error);tx.onabort=()=>no(tx.error||Error('No se conservó la operación'))})}}}
 function fallbackStore(){
  const storage=window.HysStorage242.capture(),key='queue-fallback242',lock='hys255-fallback::'+scope;
  const read=()=>JSON.parse(storage.getItem(key)||'{"pending":{},"meta":{},"draft":{}}');
  const applyOps=(all,ops)=>{for(const o of ops)o.remove?delete all[o.store][o.id]:all[o.store][o.value.id]=clone(o.value);storage.setItem(key,JSON.stringify(all));};
  const requireLock=()=>{if(!navigator.locks?.request)throw Object.assign(
   Error('Guardado limitado bloqueado: el navegador no dispone de protección entre pestañas. Exporta el formulario como JSON.'),
   {code:'LOCAL_CONFLICT'});};
  const batch=async ops=>{requireLock();return navigator.locks.request(lock,()=>applyOps(read(),ops));};
  const compareAndBatch=async(ops,expected)=>{
   const commit=()=>{const all=read();if((all.draft.current?.localRevision||0)!==expected)throw Object.assign(Error('Otra pestaña guardó una versión distinta. Exporta tu copia y recarga.'),{code:'LOCAL_CONFLICT'});applyOps(all,ops);};
   requireLock();return navigator.locks.request(lock,commit);
  };
  return {kind:'respaldo local limitado',compareAndBatch,get:async(n,id)=>read()[n][id],all:async n=>Object.values(read()[n]),put:(n,v)=>batch([{store:n,value:v}]),remove:(n,id)=>batch([{store:n,id,remove:true}]),batch};
 }
 async function pendingStatus(q=queue){if(!q)return;const list=await q.store.all('pending');if(q!==queue)return;const local=await q.store.get('draft','current'),meta=local?await q.store.get('meta',local.draftId):null;const confirmed=window.HysRemoteConfirmed242(local,meta,localSaved);const dirty=!!local&&localSaved&&!confirmed;if(q!==queue)return;if(!central()){H.hasPending=list.length>0||!localSaved;message('Local: '+(localSaved?'borrador guardado':'sin guardado confirmado')+' · Supabase: NO habilitado; los datos permanecen en este navegador.'+(list.length?' Hay '+list.length+' operación(es) antiguas conservadas para revisión.':''));return;}H.hasPending=list.length>0||dirty;message(`Local: ${localSaved?'guardado ('+q.store.kind+')':'sin cambios guardados'} · Supabase: ${conflict?'conflicto; copia local conservada':lastError?'pendiente ('+lastError+')':list.length?list.length+' operación(es) pendientes':dirty?'borrador no confirmado en el servidor':confirmed?'sincronizado':localSaved?'guardado local; sin confirmación remota':'sin borrador local guardado'}`)}
 function row(payload,archive=null,id=draftId){return {id,payload:clone({...payload,reportId:id}),archive,token:uuid(),at:Date.now(),uid:current.userId,module:current.selectedModule,motivo:window.Hys242EditReason||''}}
 function draft(payload,id=draftId){return {id:'current',payload:clone({...payload,reportId:id}),draftId:id,preserveOwner,updatedAt:Date.now()}}
 function schedule(){clearTimeout(timer);if(navigator.onLine!==false&&!conflict&&central())timer=setTimeout(()=>flush(),600)}
 async function onSave(payload,force=false){if(!canWrite()||!queue)return false;const q=queue,ticket=generation,id=draftId,p=clone({...payload,reportId:id});H.hasPending=true;message(!central()?'Guardando borrador en este navegador · Supabase: no habilitado.':'Local: guardando… · Supabase: pendiente de confirmar');try{await q.commitDraft(central()&&(force||$('autosaveToggle')?.checked)?row(p,null,id):null,draft(p,id));if(ticket!==generation)return false;localSaved=true;lastError='';await pendingStatus(q);schedule();return true}catch(e){if(ticket===generation){if(e.code==='LOCAL_CONFLICT'){phase='local-conflict';lastError=e.message;message('Conflicto entre pestañas: no se reemplazó la copia guardada. Exporta tu copia JSON y recarga antes de continuar.');setWriteAccess();return false;}localSaved=false;lastError=e.message;message('Local: ERROR, no se confirmó la copia · '+(central()?'Supabase: pendiente.':'Supabase: no habilitado.')+' Conserva la pantalla y descarga un respaldo JSON.')}return false}}
 async function flush(){const q=queue;if(!q||!central())return;if(navigator.onLine===false){lastError='sin conexión';await pendingStatus(q);return}if(!editable()){lastError='sin permiso efectivo de edición';await pendingStatus(q);return}try{const result=await q.flush();if(q!==queue)return;conflict=false;lastError=result?.blocked?result.blocked+' informe(s) necesitan un PDF nuevo antes de sincronizarse':'';$('cloudCopy242').hidden=true;await pendingStatus(q)}catch(e){if(q!==queue)return;conflict=e.code==='40001';lastError=e.message;$('cloudCopy242').hidden=!conflict;await pendingStatus(q)}}
 function enforceOwner(){if(!current?.selectedModule)return;const global=current.profile.rol==='administrador_global';const name=global?(B.pack().owner||current.profile.nombre):(protectedOwner||current.profile.nombre);B.setOwner(name,global&&editable())}
 function changeCatalog(c){catalog=c;const before=suppress;suppress=true;try{B.setCatalog(c);enforceOwner()}finally{suppress=before}}
 function normalizedCatalog(areas,lists){const vals=k=>lists.filter(r=>r.campo===k&&r.activa).map(r=>r.valor);return {areas:areas.filter(r=>r.activa).map(r=>r.nombre),owners:vals('owner'),shift:vals('shift'),project:vals('project'),otherCategory:vals('otherCategory'),otherStatus:vals('otherStatus'),choices:Object.fromEntries(['Resultado','Prioridad','Estado'].map(k=>[k,vals(k)]))}}
 async function refreshCatalog(ticket=generation){if(!current?.selectedModule)return;const client=window.reportesHysSupabase,module=current.selectedModule,suffix=(central()||window.HYS250_LOCAL_EDIT===true)?'v242':'v238';const [a,l]=await Promise.all([client.from('areas_trabajo_'+suffix).select('*').eq('modulo',module).order('nombre'),client.from('listas_'+suffix).select('*').eq('modulo',module).order('actualizado_en')]);if(a.error||l.error)throw a.error||l.error;if(ticket!==generation)return;const c=normalizedCatalog(a.data||[],l.data||[]);try{localStorage.setItem('catalogo-v242',JSON.stringify(c))}catch{/* El catálogo sigue utilizándose en memoria si se agotó el almacenamiento local. */}changeCatalog(c)}
 function blobFromBase64(text){const raw=atob(text),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:'application/pdf'})}
 async function refreshReports(ticket=generation,more=false){if(!canReadCentral()||!current?.selectedModule)return [];
 const module=current.selectedModule;
 if(reportsFlight?.ticket===ticket&&reportsFlight?.module===module)
  return reportsFlight.promise;
 const page=more?reportPage+1:0;
 const job=(async()=>{
  const guard=window.Hys255Guard.capture();
  const valid=()=>ticket===generation&&current?.selectedModule===module&&canReadCentral();
  const button=$('reportsMore242');
  if(button)button.disabled=true;
  try{
   const response=await window.reportesHysSupabase.rpc('hys242_consultar_informes',
     {p_modulo:module,p_pagina:page});
   if(!valid())return [];
   window.Hys255Guard.assert(guard);
   if(response.error)throw response.error;
   const informes=window.Hys299ReadPolicy.validatePage(response.data,module,page);
   for(const item of informes){
    if(!valid())return [];
    window.Hys255Guard.assert(guard);
    const summary={...item,reportId:item.id,hasReportData:true,remote:true,
     createdAt:item.actualizado_en,filename:'Informe central · '+item.id,
     period:(item.dateFrom||'—')+' al '+(item.dateTo||'—')};
    await B.cacheSummary(summary);
   }
   if(!valid())return [];
   window.Hys255Guard.assert(guard);
   await B.renderArchivedReports();
   if(!valid())return [];
   window.Hys255Guard.assert(guard);
   reportPage=page;
   let moreButton=$('reportsMore242');
   if(!moreButton){
    moreButton=document.createElement('button');
    moreButton.id='reportsMore242';
    moreButton.className='btn';moreButton.type='button';
    moreButton.textContent='Cargar más informes';
    $('historial').append(moreButton);
    moreButton.onclick=()=>refreshReports(generation,true)
      .catch(e=>message('Consulta pendiente: '+e.message));
   }
   moreButton.hidden=informes.length<20;
   return informes;
  }finally{if(button)button.disabled=false;}
 })();
 reportsFlight={ticket,module,promise:job};
 return job.finally(()=>{if(reportsFlight?.promise===job)reportsFlight=null;});
}
 async function fetchReport(id,needPdf=true){
 const ticket=generation,module=current?.selectedModule,context=window.Hys255Guard.capture();
 if(!module||!canReadCentral())throw Error('La consulta central no está autorizada para esta tarjeta o no hay conexión.');
 const r=await window.reportesHysSupabase.rpc('hys242_cargar_informe',{p_id:id,p_pdf:needPdf});
 if(r.error)throw r.error;
 if(ticket!==generation||current?.selectedModule!==module)throw Error('La sesión o la tarjeta cambiaron');
 window.Hys255Guard.assert(context);
 const item=window.Hys294RemoteArchive.validateRemoteRow(r.data,id,module,window.Hys255Guard.validatePack);
 const hasPdf=needPdf&&window.Hys294RemoteArchive.validatePdfPayload(item.archivo,id);
 const entry={...item.archivo?.metadata,id:item.id,reportId:item.id,revision:item.revision,
  creador_id:item.creador_id,revision_estado:item.revision_estado,reportData:item.payload,
  history:window.Hys294RemoteArchive.readableHistory(item),
  pdfBlob:hasPdf?blobFromBase64(item.archivo.pdf):null,remote:true,
  hasPdf:!!hasPdf,hasReportData:true};
 // Las consultas con p_pdf=false devuelven archivo=null por contrato
 // Supabase; no sobrescribir el PDF ni el historial completos conservados.
 if(hasPdf)await B.cacheArchive(entry);
 if(ticket!==generation||current?.selectedModule!==module)throw Error('La sesión o la tarjeta cambiaron');
 window.Hys255Guard.assert(context);
 return entry;
}
 async function loadReport(entry){if(!canWrite()||!queue)return false;if(entry?.remote===true&&!central()){message('Este informe proviene de Supabase y está disponible solo para consulta. No se cargó en el editor local ni se modificaron los datos.');return false;}try{window.Hys296Identity.checkLoadIdentity(entry,current.selectedModule);window.Hys255Guard?.validatePack(entry.reportData,current.selectedModule);}catch(e){message('No se cargó el informe: '+e.message);return false;}if(['Enviado','Aprobado','Cerrado'].includes(entry.revision_estado)){message('El informe está '+entry.revision_estado+'. Solicita devolución o reapertura antes de editar.');return false}const q=queue,ticket=generation;const pendientesHeredados=await q.store.all('pending');if(pendientesHeredados.length){if(central()){message('Sincroniza o exporta los cambios pendientes antes de cambiar de informe.');return false;}if(!confirm('Existen '+pendientesHeredados.length+' operaciones antiguas reservadas en este navegador. Se conservarán sin enviarse ni borrarse; antes de cambiar de informe se descargará un respaldo del formulario actual. ¿Continuar?'))return false}if(ticket!==generation)return false;let targetReason='';if(entry.creador_id&&entry.creador_id!==current.userId&&current.profile.rol!=='administrador_global'){const reason=prompt('Motivo obligatorio para editar este informe ajeno');if(!reason?.trim())return false;targetReason=reason.trim()}const backup=B.pack(),id=entry.reportId||entry.id;download(backup,'respaldo-antes-de-editar-v242.json');phase='transition';setWriteAccess();try{await q.replaceDraft([{store:'draft',value:{id:'backup-'+uuid(),payload:backup,draftId}},{store:'meta',value:{id,revision:entry.revision||0,fingerprint:window.HysFingerprint242(entry.reportData)}},{store:'draft',value:{id:'current',payload:{...clone(entry.reportData),reportId:id},draftId:id,preserveOwner:true}}]);if(ticket!==generation)return true;draftId=id;window.Hys242EditReason=targetReason;preserveOwner=true;protectedOwner=entry.reportData.owner||current.profile.nombre;phase='ready';apply(entry.reportData);localSaved=true;await pendingStatus();return true}catch(e){if(ticket===generation&&localConflict255(e))return false;throw e;}finally{if(ticket===generation){if(phase!=='local-conflict')phase='ready';setWriteAccess()}}}
 function apply(payload){const before=suppress;suppress=true;try{B.applyPack(clone(payload));enforceOwner();if(catalog)B.setCatalog(catalog)}finally{suppress=before}setWriteAccess()}
 async function recoverDraft(){if(!canWrite()||!queue||!central())return;const q=queue,ticket=generation;try{if((await q.store.all('pending')).length){message('Hay cambios pendientes. Resuélvelos antes de recuperar otro borrador.');return}const recovered=await window.reportesHysSupabase.rpc('hys242_recuperar_borrador',{p_modulo:current.selectedModule});const r={data:recovered.data?[recovered.data]:[],error:recovered.error};if(r.error)throw r.error;if(ticket!==generation)return;const item=r.data?.[0];if(!item){message('No hay borrador central disponible.');return}if(!confirm('¿Recuperar el borrador central? Se descargará una copia del formulario actual.'))return;if(!await loadReport({id:item.id,revision:item.revision,reportData:item.payload}))return;if(ticket!==generation||q!==queue)return;localSaved=true;await pendingStatus()}catch(e){message('No se recuperó el borrador: '+e.message)}}
 function download(payload,name){const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
 async function onAccess(a){
  if(a?.selectedModule==='OTROS'&&!window.__REPORTES_HYS_OTROS_EMBEDDED__)a={...a,selectedModule:null};
  const next=a?.selectedModule?`${a.userId}:${a.selectedModule}`:'';
  if(next&&next===scope&&phase==='ready'){current=clone(a);setWriteAccess();updateManagement();return}
  window.Hys242EditReason='';const ticket=++generation;clearTimeout(timer);scope=next;current=a?clone(a):null;queue=null;store=null;draftId='';catalog=null;reportPage=0;reportsFlight=null;conflict=false;localSaved=false;lastError='';preserveOwner=false;protectedOwner='';phase=next?'loading':'idle';H.hasPending=false;const readStatus=$('hys298ReadStatus');if(readStatus)readStatus.textContent='';const moreButton=$('reportsMore242');if(moreButton){moreButton.hidden=true;moreButton.disabled=false;}
  window.Hys243Risks?.reset?.();window.Hys243Assignees?.reset?.();window.Hys243Actions?.reset?.();window.Hys244Activity?.reset?.();
  window.HysStorage242.setScope(next?a.userId:null);B.resetCatalog();B.restorePreferences?.();$('modal').style.display='none';updateManagement();setWriteAccess();
  if(!next){apply(B.blank());message('Selecciona un módulo autorizado.');return}
  try{
   let db;try{db=await database(a.userId,a.selectedModule)}catch(e){lastError='IndexedDB no disponible; se usa respaldo limitado'}
   if(ticket!==generation){db?.close();return}store=db?adapter(db):fallbackStore();const target=store,captured={ticket,uid:a.userId,module:a.selectedModule};
   const localQueue=new window.Queue242(target,async item=>{if(generation!==captured.ticket||access()?.userId!==captured.uid||!editable())throw Error('La sesión o los permisos cambiaron; la cola permanece con su propietario');const {data,error}=await window.reportesHysSupabase.rpc('hys242_guardar_con_motivo',{p_id:item.id,p_modulo:captured.module,p_payload:item.payload,p_archivo:item.archive,p_revision:item.revision,p_token:item.token,p_motivo:item.motivo||''});if(error)throw error;window.HysVerifyServerAck242(item,data);if(captured.ticket===generation&&draftId===item.id){const confirmedOwner=data?.payload?.owner||item.payload.owner,lockedOwner=current.profile.rol!=='administrador_global';protectedOwner=confirmedOwner;preserveOwner=true;enforceOwner();await localQueue.transaction(async()=>{const latest=await target.get('draft','current');if(latest?.draftId===item.id)await target.put('draft',{...latest,preserveOwner:true,payload:lockedOwner?{...latest.payload,owner:confirmedOwner}:latest.payload})})}return data});queue=localQueue;
   let saved=await target.get('draft','current');if(ticket!==generation)return;
   // Reincorporar el respaldo alternativo de forma atómica antes de retirarlo.
   const scoped=window.HysStorage242.capture();let alternate=null;try{alternate=JSON.parse(scoped.getItem('queue-fallback242')||'null')}catch{}
   if(db&&alternate){const ops=[],alternateDraft=alternate.draft?.current;for(const p of Object.values(alternate.pending||{})){const existing=await target.get('pending',p.id);if(existing&&existing.token!==p.token)ops.push({store:'draft',value:{id:'recovery-'+uuid(),payload:existing.payload,draftId:existing.id,operation:existing,updatedAt:existing.at}});if(!existing||(p.at||0)>=(existing.at||0))ops.push({store:'pending',value:p});else ops.push({store:'draft',value:{id:'recovery-'+uuid(),payload:p.payload,draftId:p.id,operation:p,updatedAt:p.at}})}for(const backup of Object.values(alternate.draft||{}).filter(v=>v.id!=='current'))ops.push({store:'draft',value:backup});for(const m of Object.values(alternate.meta||{}))if(!await target.get('meta',m.id))ops.push({store:'meta',value:m});if(alternateDraft&&(!saved||(alternateDraft.updatedAt||0)>=(saved.updatedAt||0))){if(saved)ops.push({store:'draft',value:{...saved,id:'recovery-'+uuid()}});ops.push({store:'draft',value:alternateDraft});saved=alternateDraft}else if(alternateDraft)ops.push({store:'draft',value:{...alternateDraft,id:'recovery-'+uuid()}});if(ops.length)await target.batch(ops);if(ticket!==generation)return;scoped.removeItem('queue-fallback242')}
   if(ticket!==generation)return;
   let fallback=null;try{fallback=JSON.parse(localStorage.getItem('reportes-hys-v30-daily')||'null')}catch{}
   let newerDaily=!!fallback&&!!saved&&fallback.reportId===saved.draftId&&(fallback.localSavedAt242||0)>(saved.updatedAt||0)&&window.HysFingerprint242(fallback)!==window.HysFingerprint242(saved.payload);
   if(newerDaily){await target.put('draft',{...saved,id:'recovery-'+uuid()});if(ticket!==generation)return;saved=null}
   draftId=saved?.draftId||fallback?.reportId||'v242-'+uuid();preserveOwner=saved?.preserveOwner===true;protectedOwner=preserveOwner?saved?.payload?.owner||a.profile.nombre:a.profile.nombre;
   let cached;try{cached=JSON.parse(localStorage.getItem('catalogo-v242')||'null')}catch{}
   const persistedCurrent255=await target.get('draft','current');if(ticket!==generation)return;localQueue.setDraftRevision(persistedCurrent255?.localRevision||0);
   if(cached)catalog=cached;phase='ready';apply(saved?.payload||fallback||B.blank());let tab=null;try{tab=sessionStorage.getItem('reportes-hys-active-tab')}catch{}if(['inicio','informe','historial','config'].includes(tab))B.showTab(tab);localSaved=!!(saved||fallback);if(!saved&&fallback&&editable()){await queue.commitDraft(central()&&$('autosaveToggle')?.checked?row(B.pack()):null,draft(B.pack()))}if(ticket!==generation)return;if(localSaved&&editable()&&$('autosaveToggle')?.checked){const meta=await target.get('meta',draftId);if(ticket!==generation)return;if(window.HysFingerprint242(B.pack())!==meta?.fingerprint)await onSave(B.pack(),false)}$('cloudLoad242').hidden=false;setWriteAccess();await pendingStatus();
   if(navigator.onLine!==false){try{await refreshCatalog(ticket);if(ticket!==generation)return;await flush()}catch(e){if(ticket===generation){lastError=e.message;await pendingStatus()}}}
  }catch(e){if(ticket!==generation)return;phase='error';message('Local: ERROR; edición bloqueada para evitar pérdida de datos. Descarga tu respaldo y reintenta. '+e.message)}finally{if(ticket===generation)setWriteAccess()}
 }
 const MUTATIONS='[data-add],[data-edit],[data-delete],[data-photo-delete],[data-archive-edit],#save,#saveNow,#finalize,#newReport242,#clearCards,#clearActivities,#clearInspections,#clearFindings,#restoreLocal,#resetLocal,#import,#cloudLoad242,#cloudCopy242,#recordForm input,#recordForm select,#recordForm textarea,#recordForm button[type=submit],#inicioPanel input,#inicioPanel select,#otherReportForm input,#otherReportForm select,#otherReportForm textarea,#otherReportForm button,#clearOtherForm';
 function setWriteAccess(){const write=canWrite();document.querySelectorAll(MUTATIONS).forEach(el=>el.disabled=!write||el.dataset.hysArchiveEditAllowed==='false');$('cloudLoad242').disabled=!write||!central();const readCheck=$('hys298ReadCheck');if(readCheck)readCheck.disabled=!canReadCentral();enforceOwner();const banner=$('formAccess242');if(banner)banner.textContent=phase==='loading'?'Cargando el borrador…':phase==='local-conflict'?'Otra pestaña guardó este borrador. Exporta tu copia JSON y recarga; tus cambios permanecen en pantalla.':phase==='error'?'No se confirmó el guardado local; reintenta la carga.':!editable()?'Acceso de solo lectura según permisos.':!central()?'Lectura de Supabase autorizada; los cambios se guardan SOLO en este navegador. Exporta un respaldo JSON.':''}
 document.addEventListener('click',e=>{if(e.target.closest(MUTATIONS)&&!canWrite()){e.preventDefault();e.stopImmediatePropagation();message('Este acceso no permite modificar informes.')}},true);
 document.addEventListener('submit',e=>{if(['recordForm','otherReportForm'].includes(e.target.id)&&!canWrite()){e.preventDefault();e.stopImmediatePropagation()}},true);
 const writeObserver=new MutationObserver(()=>{
  if(!window.document)return;
  if(phase!=='ready'||!editable())document.querySelectorAll(MUTATIONS).forEach(el=>el.disabled=true);
 });
 writeObserver.observe(document.body,{childList:true,subtree:true});
 window.addEventListener('pagehide',()=>writeObserver.disconnect(),{once:true});
 async function finalizeReport(){
  if(!canWrite())return false;
  const ticket=generation,q=queue,id=draftId,p=B.pack();
  const centralAtStart=central();
  const invalid=window.Hys255Guard.validateReportStart(p);
  if(invalid){
   message('No se finalizó. '+invalid.message);
   return false;
  }
  const pregunta=centralAtStart?'¿Finalizar y sincronizar este informe?':
   '¿Finalizar el informe solo en este navegador? Podrás exportar un respaldo.';
  if(!confirm(pregunta))return false;
  p.status='Finalizado';
  const saving=onSave(p,true);
  phase='transition';setWriteAccess();
  try{
   if(!await saving||ticket!==generation)return false;
   apply(p);
   message(central()?'Local: informe finalizado; comprobando sincronización con Supabase.':
    'Informe FINALIZADO SOLO EN ESTE NAVEGADOR. No se ha enviado a Supabase. Exporta un respaldo JSON y genera el PDF.');
   await flush();
   if(ticket!==generation)return false;
   try{
    const meta=await q.store.get('meta',id);
    if(ticket!==generation||q!==queue||id!==draftId)return false;
    if(centralAtStart){
     const pending=await q.store.get('pending',id);
     if(ticket!==generation||q!==queue||id!==draftId)return false;
     const payload={...p,reportId:id};
     if(pending||!window.HysRemoteConfirmed242({payload},meta,true)){
      message('Copia local conservada. La finalización central sigue pendiente de confirmación.');
      return false;
     }
    }
    await B.cacheFinalized({
     id,reportId:id,reportData:p,hasPdf:false,hasReportData:true,
     revision:meta?.revision||0,filename:'Informe finalizado · PDF pendiente',
     createdAt:new Date().toISOString(),date:p.date,dateFrom:p.dateFrom,dateTo:p.dateTo,
     owner:p.owner,shift:p.shift,project:p.project,area:p.area,
     period:(p.dateFrom||'—')+' al '+(p.dateTo||'—'),history:[]
    });
   }catch(e){
    if(ticket!==generation)return false;
    message('Copia local conservada. No se pudo confirmar el índice del historial: '+e.message);
    return false;
   }
   return ticket===generation;
  }finally{
   if(ticket===generation){if(phase!=='local-conflict')phase='ready';setWriteAccess()}
  }
 }
 async function startNew(){if(!canWrite())return false;const q=queue,ticket=generation,oldId=draftId,p=B.pack();if(!confirm('Se conservará el informe actual y se abrirá un borrador nuevo. ¿Continuar?'))return false;const id='v242-'+uuid(),blank=B.blank();blank.owner=current.profile.nombre;const hasContents=p.status==='Finalizado'||!!String(p.area||'').trim()||!!String(p.shift||'').trim()||['activities','inspections','findings'].some(k=>Array.isArray(p.data?.[k])&&p.data[k].length>0);if(!central()&&hasContents){try{const existing=await B.getArchivedReport(oldId,false);if(existing?.pdfBlob&&window.HysFingerprint242(existing.reportData)!==window.HysFingerprint242(p)){message('No se abrió otro informe: el formulario cambió desde el último PDF. Genera nuevamente el PDF del informe actual para conservar los cambios.');return false;}await B.cacheFinalized({id:oldId,reportId:oldId,reportData:p,hasReportData:true,hasPdf:!!existing?.pdfBlob,pdfBlob:existing?.pdfBlob||null,revision:existing?.revision||0,filename:existing?.filename||'Borrador conservado · PDF pendiente',createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),date:p.date,dateFrom:p.dateFrom,dateTo:p.dateTo,owner:p.owner,shift:p.shift,project:p.project,area:p.area,period:(p.dateFrom||'—')+' al '+(p.dateTo||'—'),history:existing?.history||[]});}catch(e){message('No se abrió otro informe porque no se pudo archivar el borrador anterior: '+e.message);return false;}}phase='transition';setWriteAccess();try{await q.commitDraft(central()?row(p,null,oldId):null,{id:'current',payload:{...blank,reportId:id},draftId:id,preserveOwner:false,updatedAt:Date.now()});if(ticket!==generation)return true;draftId=id;window.Hys242EditReason='';preserveOwner=false;protectedOwner=current.profile.nombre;phase='ready';apply(blank);localSaved=true;H.hasPending=central();await pendingStatus();schedule();return true}catch(e){if(ticket===generation&&localConflict255(e))return false;message('No se inició un informe nuevo: '+e.message);return false}finally{if(ticket===generation){if(phase!=='local-conflict')phase='ready';setWriteAccess()}}}
 async function onArchive(entry){
 if(!canWrite()||!queue)throw Error('No puedes modificar este informe.');
 const q=queue,ticket=generation,id=draftId,context=window.Hys255Guard.capture({report:true});
 if(!entry||entry.reportId!==id||!(entry.pdfBlob instanceof Blob)||
    entry.pdfBlob.size<8||entry.pdfBlob.type!=='application/pdf')
   throw Error('El PDF no corresponde al informe activo o está vacío.');
 const p=clone(entry.reportData);
 const verify=()=>{
  if(q!==queue||ticket!==generation||id!==draftId||!canWrite())
   throw Error('La sesión, el informe o los permisos cambiaron. El PDF local se conserva.');
  window.Hys255Guard.assert(context,{write:true});
 };
 verify();
 if(window.HysFingerprint242(p)!==window.HysFingerprint242(B.pack()))
  throw Error('El formulario cambió mientras se generaba el PDF. Se conserva la edición más reciente.');
 if(!central()){
  await q.commitDraft(null,draft(p,id));
  verify();
  localSaved=true;H.hasPending=false;
  await pendingStatus();return;
 }
 const base64=await new Promise((ok,no)=>{
  const r=new FileReader();
  r.onload=()=>ok(String(r.result).split(',')[1]);
  r.onerror=()=>no(r.error||Error('No fue posible leer el PDF.'));
  r.readAsDataURL(entry.pdfBlob);
 });
 verify(); // La conversión es asíncrona: no continuar si se cambió de usuario.
 if(!base64)throw Error('No se obtuvo el contenido del PDF.');
 const {pdfBlob,...metadata}=entry;
 await q.commitDraft(row(p,{metadata,pdf:base64},id),draft(p,id));
 verify();
 localSaved=true;H.hasPending=true;
 await pendingStatus();schedule();
}
 async function newConflictCopy(){
 if(!canWrite()||!queue)return;
 const q=queue,ticket=generation,uid=current.userId,module=current.selectedModule;
 const list=await q.store.all('pending');
 if(q!==queue||ticket!==generation||!canWrite())return;
 if(!list.length)return;
 download(list,'conflictos-v242-'+Date.now()+'.json');
 if(!confirm('Se guardarán los originales completos como recuperaciones locales. Las copias nuevas NO reutilizarán los PDF anteriores: será necesario generarlos nuevamente. ¿Continuar?'))return;
 if(q!==queue||ticket!==generation||!canWrite())return;
 const plan=await q.transaction(async()=>{
  if(q!==queue||ticket!==generation||!canWrite()||current.userId!==uid||current.selectedModule!==module)
   throw Error('La sesión cambió antes de conservar las copias.');
  // Releer la cola después de la confirmación: puede cambiar mientras se muestra el diálogo.
  const fresh=await q.store.all('pending');
  const result=window.Hys295Recovery.planConflictCopies(fresh,{
   uid,module,currentDraftId:draftId,
   isGlobal:current.profile.rol==='administrador_global',ownerName:current.profile.nombre,
   newId:uuid,now:Date.now
  });
  await q.writeDraftOps(result.ops);
  return result;
 });
 if(q!==queue||ticket!==generation)return;
 if(plan.currentId){
  const saved=await q.store.get('draft','current');
  if(q!==queue||ticket!==generation)return;
  if(!saved||saved.draftId!==plan.currentId)throw Error('La copia actual requiere revisión manual.');
  draftId=saved.draftId;preserveOwner=false;protectedOwner=current.profile.nombre;
  apply(saved.payload);
 }
 conflict=false;lastError='';
 message('Copias conservadas. '+plan.originalCount+' operaciones nuevas; '+plan.pdfsToRegenerate+' PDF(s) deberán regenerarse. Se conservaron los originales en recuperaciones locales.');
 await flush();
}
 async function preserveBeforeRefresh(){if(!canWrite()||!queue)return true;const q=queue,ticket=generation,p=clone(B.pack());try{const saved=await q.store.get('draft','current');if(q!==queue||ticket!==generation)return true;if(saved&&window.HysFingerprint242(saved.payload)===window.HysFingerprint242(p))return true;return await onSave(p,false)}catch{message('No se pudo confirmar la copia local. Exporta un respaldo antes de actualizar la sesión.');return false}}
 // Administración central separada de Configuración APR/OTROS.
 /* v282 — Gestión única de Áreas y opciones, sin depender del guardado de informes.
  * Conservar APIs públicas originales, para no romper login, facultades ni panel lateral. */
 const management282=window.Hys282CatalogManager?.create({
  getAccess:()=>access(),
  moduleLabel,
  refreshCatalog:()=>refreshCatalog()
 });
 function mountManagementRail(){management282?.mount()}
 function syncManagementRail(){return management282?.sync()===true}
 function updateManagement(){management282?.sync()}
 const H=window.Hys242={onAccess,onSave,onArchive,preserveBeforeRefresh,enforceOwner,flush,canWrite,hasPending:false,refreshCatalog,refreshReports,canReadCentral,canEditRemote:()=>central()&&canWrite(),mountManagementRail,syncManagementRail,finalizeReport,startNew,fetchReport,loadReport,reportId:()=>draftId,sessionKey:()=>generation};
 $('cloudRetry242').textContent=central()?'Sincronizar ahora':'Comprobar guardado local';$('cloudRetry242').onclick=async()=>{if(phase==='error'){await onAccess(access());return}if(!central()){if(!canWrite()){message('Sin permiso de edición; no se realizó ningún cambio.');return;}await onSave(B.pack(),true);return;}if(canWrite())await onSave(B.pack(),true);await flush();try{await refreshCatalog();await refreshReports()}catch(e){message('No se pudo actualizar: '+e.message)}};$('cloudLoad242').onclick=recoverDraft;const readButton=document.createElement('button');
  readButton.className='btn';readButton.id='hys298ReadCheck';
  readButton.type='button';readButton.textContent='Comprobar lectura Supabase';
  $('cloudLoad242').insertAdjacentElement('afterend',readButton);
  const readStatus=document.createElement('span');
  readStatus.id='hys298ReadStatus';readStatus.setAttribute('role','status');
  readStatus.style.cssText='display:inline-block;padding:4px 8px;font-size:12px';
  readButton.insertAdjacentElement('afterend',readStatus);
  readButton.onclick=async()=>{
   const accessAtStart=access(),module=accessAtStart?.selectedModule,ticket=generation;
   if(!canReadCentral()){
    readStatus.textContent='Lectura no autorizada o sin conexión para esta tarjeta.';return;
   }
   readButton.disabled=true;readStatus.textContent='Verificando identidad y permisos…';
   try{
    const result=await window.Hys298ReadGate.preflight({
     client:window.reportesHysSupabase,access:accessAtStart,module,nav:navigator,flags:window,
     stillValid:()=>ticket===generation&&access()===accessAtStart
      &&current?.selectedModule===module
    });
    if(ticket!==generation||access()!==accessAtStart)return;
    readStatus.textContent='Lectura verificada · '+result.reportsOnFirstPage+
     ' informe(s) en la primera página autorizada. Escritura central desactivada.';
    await refreshReports(ticket);
   }catch(e){
    if(ticket===generation)readStatus.textContent='No se confirmó la lectura: '+e.message;
   }finally{readButton.disabled=false}
  };
  const recoveries=document.createElement('button');recoveries.className='btn';recoveries.id='localRecoveries242';recoveries.textContent='Descargar recuperaciones locales';$('cloudLoad242').insertAdjacentElement('afterend',recoveries);recoveries.onclick=async()=>{const q=queue,ticket=generation;if(!q)return;const rows=(await q.store.all('draft')).filter(r=>r.id!=='current');if(ticket!==generation)return;if(rows.length)download(rows,'recuperaciones-v242.json');else message('No hay recuperaciones locales adicionales. El borrador actual se conserva por separado.');};$('cloudCopy242').onclick=()=>newConflictCopy().catch(e=>message('No se pudo conservar la copia: '+e.message));$('newReport242').onclick=startNew;
 $('autosaveToggle').addEventListener('change',()=>{if($('autosaveToggle').checked)onSave(B.pack(),true)});
 window.addEventListener('online',async()=>{await flush();refreshCatalog().catch(()=>{})});window.addEventListener('offline',()=>{lastError='sin conexión';pendingStatus()});
 window.addEventListener('beforeunload',e=>{if(H.hasPending){e.preventDefault();e.returnValue=''}});
 document.querySelector('.nav[data-tab="historial"]').addEventListener('click',()=>{if(current?.selectedModule&&canReadCentral())refreshReports().catch(e=>message('Mostrando copias locales. No se pudo consultar Supabase: '+e.message))});
 setInterval(()=>{if(queue&&navigator.onLine!==false&&!conflict)flush()},30000);
 setInterval(()=>{if(queue&&navigator.onLine!==false&&!document.hidden)refreshCatalog().catch(()=>{})},30000);
})();
