/* v242: permisos efectivos, conservación atómica y sincronización aislada. */
(function(){
 'use strict';
 const B=window.Hys242Bridge,$=id=>document.getElementById(id),clone=v=>JSON.parse(JSON.stringify(v));
 const roleLabel=r=>({administrador_global:'Administrador general',administrador_area:'Administrador',supervisor:'Supervisor',usuario:'Usuario'}[r]||r);
 const moduleLabel=m=>window.HysAppearance242?.moduleLabel(m)||({APR:'Prevencionista de riesgos',OTROS:'Supervisores, capataces y otros'}[m]||m);
 let current=null,generation=0,suppress=false,queue=null,store=null,timer=null,scope='',draftId='',catalog=null,conflict=false,phase='idle',preserveOwner=false,protectedOwner='',reportPage=0,lastError='',localSaved=false;
 const revisions=new Map();
 const uuid=()=>crypto.randomUUID(),access=()=>window.__REPORTES_HYS_ACCESS__;
 function editable(){return !!((window.HYS242_DEPLOYMENT_READY===true||window.HYS250_LOCAL_EDIT===true)&&current?.selectedModule&&current.profile?.activo===true&&!current.offline&&(current.profile.rol==='administrador_global'||current.permissions?.some(p=>p.modulo===current.selectedModule&&p.puede_ver===true&&p.puede_editar===true&&p.areas?.activa!==false)))}
 function canWrite(){return phase==='ready'&&!suppress&&editable()}
 function allowedManage(){return !current?.offline&&['administrador_global','administrador_area','supervisor'].includes(current?.profile.rol)}
 function message(s){const el=$('cloudStatus242');if(el)el.textContent=s;const bar=$('saveState242');if(bar)bar.textContent=s}
 function central(){return window.HYS242_ENABLE_CENTRAL===true}
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
  const batch=async ops=>applyOps(read(),ops);
  const compareAndBatch=async(ops,expected)=>{
   const commit=()=>{const all=read();if((all.draft.current?.localRevision||0)!==expected)throw Object.assign(Error('Otra pestaña guardó una versión distinta. Exporta tu copia y recarga.'),{code:'LOCAL_CONFLICT'});applyOps(all,ops);};
   return navigator.locks?.request?navigator.locks.request(lock,commit):commit();
  };
  storage.setItem(key,JSON.stringify(read()));
  return {kind:'respaldo local limitado',compareAndBatch,get:async(n,id)=>read()[n][id],all:async n=>Object.values(read()[n]),put:(n,v)=>batch([{store:n,value:v}]),remove:(n,id)=>batch([{store:n,id,remove:true}]),batch};
 }
 async function pendingStatus(q=queue){if(!q)return;const list=await q.store.all('pending');if(q!==queue)return;const local=await q.store.get('draft','current'),meta=local?await q.store.get('meta',local.draftId):null;const dirty=!!local&&window.HysFingerprint242(local.payload)!==meta?.fingerprint;if(q!==queue)return;H.hasPending=list.length>0||dirty;message(`Local: ${localSaved?'guardado ('+q.store.kind+')':'sin cambios guardados'} · Supabase: ${!central()?'no sincronizado (vista de desarrollo v255)':conflict?'conflicto; copia local conservada':lastError?'pendiente ('+lastError+')':list.length?list.length+' operación(es) pendientes':dirty?'envío manual pendiente':localSaved?'sincronizado':'sin operaciones pendientes'}`)}
 function row(payload,archive=null,id=draftId){return {id,payload:clone({...payload,reportId:id}),archive,token:uuid(),at:Date.now(),uid:current.userId,module:current.selectedModule,motivo:window.Hys242EditReason||''}}
 function draft(payload,id=draftId){return {id:'current',payload:clone({...payload,reportId:id}),draftId:id,preserveOwner,updatedAt:Date.now()}}
 function schedule(){clearTimeout(timer);if(navigator.onLine!==false&&!conflict&&central())timer=setTimeout(()=>flush(),600)}
 async function onSave(payload,force=false){if(!canWrite()||!queue)return false;const q=queue,ticket=generation,id=draftId,p=clone({...payload,reportId:id});H.hasPending=true;message(window.HYS250_LOCAL_EDIT===true?'Guardando borrador de prueba en este navegador · Supabase: sin sincronización.':'Local: guardando… · Supabase: pendiente de confirmar');try{await q.commitDraft(force||$('autosaveToggle')?.checked?row(p,null,id):null,draft(p,id));if(ticket!==generation)return true;localSaved=true;lastError='';await pendingStatus(q);schedule();return true}catch(e){if(ticket===generation){if(e.code==='LOCAL_CONFLICT'){phase='local-conflict';lastError=e.message;message('Conflicto entre pestañas: no se reemplazó la copia guardada. Exporta tu copia JSON y recarga antes de continuar.');setWriteAccess();return false;}localSaved=false;lastError=e.message;message('Local: ERROR, no se confirmó la copia · Supabase: pendiente. Conserva la pantalla y descarga un respaldo JSON.')}return false}}
 async function flush(){const q=queue;if(!q||!central())return;if(navigator.onLine===false){lastError='sin conexión';await pendingStatus(q);return}if(!editable()){lastError='sin permiso efectivo de edición';await pendingStatus(q);return}try{await q.flush();if(q!==queue)return;conflict=false;lastError='';$('cloudCopy242').hidden=true;await pendingStatus(q)}catch(e){if(q!==queue)return;conflict=e.code==='40001';lastError=e.message;$('cloudCopy242').hidden=!conflict;await pendingStatus(q)}}
 function enforceOwner(){if(!current?.selectedModule)return;const global=current.profile.rol==='administrador_global';const name=global?(B.pack().owner||current.profile.nombre):(protectedOwner||current.profile.nombre);B.setOwner(name,global&&editable())}
 function changeCatalog(c){catalog=c;const before=suppress;suppress=true;try{B.setCatalog(c);enforceOwner()}finally{suppress=before}}
 function normalizedCatalog(areas,lists){const vals=k=>lists.filter(r=>r.campo===k&&r.activa).map(r=>r.valor);return {areas:areas.filter(r=>r.activa).map(r=>r.nombre),owners:vals('owner'),shift:vals('shift'),project:vals('project'),otherCategory:vals('otherCategory'),otherStatus:vals('otherStatus'),choices:Object.fromEntries(['Resultado','Prioridad','Estado'].map(k=>[k,vals(k)]))}}
 async function refreshCatalog(ticket=generation){if(!current?.selectedModule)return;const client=window.reportesHysSupabase,module=current.selectedModule,suffix=(central()||window.HYS250_LOCAL_EDIT===true)?'v242':'v238';const [a,l]=await Promise.all([client.from('areas_trabajo_'+suffix).select('*').eq('modulo',module).order('nombre'),client.from('listas_'+suffix).select('*').eq('modulo',module).order('actualizado_en')]);if(a.error||l.error)throw a.error||l.error;if(ticket!==generation)return;const c=normalizedCatalog(a.data||[],l.data||[]);localStorage.setItem('catalogo-v242',JSON.stringify(c));changeCatalog(c)}
 function blobFromBase64(text){const raw=atob(text),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:'application/pdf'})}
 async function refreshReports(ticket=generation,more=false){if(!central()||!current?.selectedModule)return [];const page=more?reportPage+1:0,module=current.selectedModule;const r=await window.reportesHysSupabase.rpc('hys242_consultar_informes',{p_modulo:module,p_pagina:page});if(r.error)throw r.error;if(ticket!==generation)return [];reportPage=page;for(const item of r.data||[]){if(ticket!==generation)return [];await B.cacheSummary({...item,...item.metadata,id:item.id,reportId:item.id,revision:item.revision,hasPdf:item.hasPdf===true,hasReportData:true,remote:true,createdAt:item.metadata?.createdAt||item.actualizado_en,filename:item.metadata?.filename||'Informe finalizado · PDF pendiente',period:item.metadata?.period||((item.dateFrom||'—')+' al '+(item.dateTo||'—'))});}if(ticket!==generation)return [];await B.renderArchivedReports();let moreButton=$('reportsMore242');if(!moreButton){moreButton=document.createElement('button');moreButton.id='reportsMore242';moreButton.className='btn';moreButton.textContent='Cargar más informes';$('historial').append(moreButton);moreButton.onclick=()=>refreshReports(generation,true).catch(e=>message('Consulta pendiente: '+e.message))}moreButton.hidden=r.data.length<20;return r.data}
 async function fetchReport(id,needPdf=true){const ticket=generation,module=current?.selectedModule,q=queue;if(!module||!central())throw Error('El informe no está descargado. La conexión central v242 está pendiente.');const r=await window.reportesHysSupabase.rpc('hys242_cargar_informe',{p_id:id,p_pdf:needPdf});if(r.error)throw r.error;if(ticket!==generation)throw Error('La sesión cambió');const item=r.data;if(!item)throw Error('Informe no disponible en tu ámbito');const entry={...item.archivo?.metadata,id:item.id,reportId:item.id,revision:item.revision,creador_id:item.creador_id,revision_estado:item.revision_estado,reportData:item.payload,history:item.archivo?.metadata?.history||[],pdfBlob:item.archivo?.pdf?blobFromBase64(item.archivo.pdf):null,remote:true};await B.cacheArchive(entry);if(ticket!==generation)throw Error('La sesión cambió');return entry}
 async function loadReport(entry){if(!canWrite()||!queue)return false;try{window.Hys255Guard?.validatePack(entry.reportData,current.selectedModule);}catch(e){message('No se cargó el informe: '+e.message);return false;}if(['Enviado','Aprobado','Cerrado'].includes(entry.revision_estado)){message('El informe está '+entry.revision_estado+'. Solicita devolución o reapertura antes de editar.');return false}const q=queue,ticket=generation;if((await q.store.all('pending')).length){message('Sincroniza o exporta los cambios pendientes antes de cambiar de informe.');return false}if(ticket!==generation)return false;let targetReason='';if(entry.creador_id&&entry.creador_id!==current.userId&&current.profile.rol!=='administrador_global'){const reason=prompt('Motivo obligatorio para editar este informe ajeno');if(!reason?.trim())return false;targetReason=reason.trim()}const backup=B.pack(),id=entry.reportId||entry.id;download(backup,'respaldo-antes-de-editar-v242.json');phase='transition';setWriteAccess();try{await q.replaceDraft([{store:'draft',value:{id:'backup-'+uuid(),payload:backup,draftId}},{store:'meta',value:{id,revision:entry.revision||0,fingerprint:window.HysFingerprint242(entry.reportData)}},{store:'draft',value:{id:'current',payload:{...clone(entry.reportData),reportId:id},draftId:id,preserveOwner:true}}]);if(ticket!==generation)return true;draftId=id;window.Hys242EditReason=targetReason;preserveOwner=true;protectedOwner=entry.reportData.owner||current.profile.nombre;phase='ready';apply(entry.reportData);localSaved=true;await pendingStatus();return true}catch(e){if(ticket===generation&&localConflict255(e))return false;throw e;}finally{if(ticket===generation){if(phase!=='local-conflict')phase='ready';setWriteAccess()}}}
 function apply(payload){const before=suppress;suppress=true;try{B.applyPack(clone(payload));enforceOwner();if(catalog)B.setCatalog(catalog)}finally{suppress=before}setWriteAccess()}
 async function recoverDraft(){if(!canWrite()||!queue||!central())return;const q=queue,ticket=generation;try{if((await q.store.all('pending')).length){message('Hay cambios pendientes. Resuélvelos antes de recuperar otro borrador.');return}const recovered=await window.reportesHysSupabase.rpc('hys242_recuperar_borrador',{p_modulo:current.selectedModule});const r={data:recovered.data?[recovered.data]:[],error:recovered.error};if(r.error)throw r.error;if(ticket!==generation)return;const item=r.data?.[0];if(!item){message('No hay borrador central disponible.');return}if(!confirm('¿Recuperar el borrador central? Se descargará una copia del formulario actual.'))return;await loadReport({id:item.id,revision:item.revision,reportData:item.payload});localSaved=true;await pendingStatus()}catch(e){message('No se recuperó el borrador: '+e.message)}}
 function download(payload,name){const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
 async function onAccess(a){
  if(a?.selectedModule==='OTROS'&&!window.__REPORTES_HYS_OTROS_EMBEDDED__)a={...a,selectedModule:null};
  const next=a?.selectedModule?`${a.userId}:${a.selectedModule}`:'';
  if(next&&next===scope&&phase==='ready'){current=clone(a);setWriteAccess();updateManagement();return}
  window.Hys242EditReason='';const ticket=++generation;clearTimeout(timer);scope=next;current=a?clone(a):null;queue=null;store=null;draftId='';catalog=null;conflict=false;localSaved=false;lastError='';preserveOwner=false;protectedOwner='';phase=next?'loading':'idle';H.hasPending=false;
  window.Hys243Risks?.reset?.();window.Hys243Assignees?.reset?.();window.Hys243Actions?.reset?.();window.Hys244Activity?.reset?.();
  window.HysStorage242.setScope(next?a.userId:null);B.resetCatalog();B.restorePreferences?.();$('modal').style.display='none';updateManagement();setWriteAccess();
  if(!next){apply(B.blank());message('Selecciona un módulo autorizado.');return}
  try{
   let db;try{db=await database(a.userId,a.selectedModule)}catch(e){lastError='IndexedDB no disponible; se usa respaldo limitado'}
   if(ticket!==generation){db?.close();return}store=db?adapter(db):fallbackStore();const target=store,captured={ticket,uid:a.userId,module:a.selectedModule};
   const localQueue=new window.Queue242(target,async item=>{if(generation!==captured.ticket||access()?.userId!==captured.uid||!editable())throw Error('La sesión o los permisos cambiaron; la cola permanece con su propietario');const {data,error}=await window.reportesHysSupabase.rpc('hys242_guardar_con_motivo',{p_id:item.id,p_modulo:captured.module,p_payload:item.payload,p_archivo:item.archive,p_revision:item.revision,p_token:item.token,p_motivo:item.motivo||''});if(error)throw error;if(captured.ticket===generation&&draftId===item.id){const confirmedOwner=data?.payload?.owner||item.payload.owner,lockedOwner=current.profile.rol!=='administrador_global';protectedOwner=confirmedOwner;preserveOwner=true;enforceOwner();await localQueue.transaction(async()=>{const latest=await target.get('draft','current');if(latest?.draftId===item.id)await target.put('draft',{...latest,preserveOwner:true,payload:lockedOwner?{...latest.payload,owner:confirmedOwner}:latest.payload})})}return data});queue=localQueue;
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
   if(cached)catalog=cached;phase='ready';apply(saved?.payload||fallback||B.blank());const tab=sessionStorage.getItem('reportes-hys-active-tab');if(['inicio','informe','historial','config'].includes(tab))B.showTab(tab);localSaved=!!(saved||fallback);if(!saved&&fallback&&editable()){await queue.commitDraft($('autosaveToggle')?.checked?row(B.pack()):null,draft(B.pack()))}if(ticket!==generation)return;if(localSaved&&editable()&&$('autosaveToggle')?.checked){const meta=await target.get('meta',draftId);if(ticket!==generation)return;if(window.HysFingerprint242(B.pack())!==meta?.fingerprint)await onSave(B.pack(),false)}$('cloudLoad242').hidden=false;setWriteAccess();await pendingStatus();
   if(navigator.onLine!==false){try{await refreshCatalog(ticket);if(ticket!==generation)return;await flush()}catch(e){if(ticket===generation){lastError=e.message;await pendingStatus()}}}
  }catch(e){if(ticket!==generation)return;phase='error';message('Local: ERROR; edición bloqueada para evitar pérdida de datos. Descarga tu respaldo y reintenta. '+e.message)}finally{if(ticket===generation)setWriteAccess()}
 }
 const MUTATIONS='[data-add],[data-edit],[data-delete],[data-photo-delete],[data-archive-edit],#save,#saveNow,#finalize,#newReport242,#clearCards,#clearActivities,#clearInspections,#clearFindings,#restoreLocal,#resetLocal,#import,#cloudLoad242,#cloudCopy242,#recordForm input,#recordForm select,#recordForm textarea,#recordForm button[type=submit],#inicioPanel input,#inicioPanel select,#otherReportForm input,#otherReportForm select,#otherReportForm textarea,#otherReportForm button,#clearOtherForm';
 function setWriteAccess(){const write=canWrite();document.querySelectorAll(MUTATIONS).forEach(el=>el.disabled=!write);$('cloudLoad242').disabled=!write||!central();enforceOwner();const banner=$('formAccess242');if(banner)banner.textContent=phase==='loading'?'Cargando el borrador…':phase==='local-conflict'?'Otra pestaña guardó este borrador. Exporta tu copia JSON y recarga; tus cambios permanecen en pantalla.':phase==='error'?'No se confirmó el guardado local; reintenta la carga.':!editable()?'Acceso de solo lectura según permisos.':window.HYS250_LOCAL_EDIT===true?'Modo de prueba v255: los cambios se guardan SOLO en este navegador; no se envían a Supabase.':''}
 document.addEventListener('click',e=>{if(e.target.closest(MUTATIONS)&&!canWrite()){e.preventDefault();e.stopImmediatePropagation();message('Este acceso no permite modificar informes.')}},true);
 document.addEventListener('submit',e=>{if(['recordForm','otherReportForm'].includes(e.target.id)&&!canWrite()){e.preventDefault();e.stopImmediatePropagation()}},true);
 new MutationObserver(()=>{if(phase!=='ready'||!editable())document.querySelectorAll(MUTATIONS).forEach(el=>el.disabled=true)}).observe(document.body,{childList:true,subtree:true});
 async function finalizeReport(){if(!canWrite())return false;const ticket=generation,p=B.pack();p.status='Finalizado';const saving=onSave(p,true);phase='transition';setWriteAccess();try{if(!await saving||ticket!==generation)return false;phase='ready';apply(p);message('Local: informe finalizado y conservado · Supabase: sincronización pendiente. Puedes generar su PDF o iniciar un nuevo informe.');await flush();if(ticket!==generation)return true;try{const meta=await queue.store.get('meta',draftId);if(ticket!==generation)return true;await B.cacheFinalized({id:draftId,reportId:draftId,reportData:p,hasPdf:false,hasReportData:true,revision:meta?.revision||0,filename:'Informe finalizado · PDF pendiente',createdAt:new Date().toISOString(),date:p.date,dateFrom:p.dateFrom,dateTo:p.dateTo,owner:p.owner,shift:p.shift,project:p.project,area:p.area,period:(p.dateFrom||'—')+' al '+(p.dateTo||'—'),history:[]});}catch(e){message('Informe finalizado conservado. El índice local del historial está pendiente: '+e.message)}return true}finally{if(ticket===generation){if(phase!=='local-conflict')phase='ready';setWriteAccess()}}}
 async function startNew(){if(!canWrite())return false;const q=queue,ticket=generation,oldId=draftId,p=B.pack();if(!confirm('Se conservará el informe actual y se abrirá un borrador nuevo. ¿Continuar?'))return false;const id='v242-'+uuid(),blank=B.blank();blank.owner=current.profile.nombre;phase='transition';setWriteAccess();try{await q.commitDraft(row(p,null,oldId),{id:'current',payload:{...blank,reportId:id},draftId:id,preserveOwner:false,updatedAt:Date.now()});if(ticket!==generation)return true;draftId=id;window.Hys242EditReason='';preserveOwner=false;protectedOwner=current.profile.nombre;phase='ready';apply(blank);localSaved=true;H.hasPending=true;await pendingStatus();schedule();return true}catch(e){if(ticket===generation&&localConflict255(e))return false;message('No se inició un informe nuevo: '+e.message);return false}finally{if(ticket===generation){if(phase!=='local-conflict')phase='ready';setWriteAccess()}}}
 async function onArchive(entry){if(!canWrite()||!queue)throw Error('No puedes modificar este informe');const q=queue,ticket=generation,p=clone(entry.reportData),id=draftId;if(entry.reportId!==id)throw Error('El PDF no corresponde al borrador activo');const base64=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]);r.onerror=()=>no(r.error);r.readAsDataURL(entry.pdfBlob)});if(ticket!==generation)throw Error('La sesión cambió; el PDF local se conserva');if(window.HysFingerprint242(p)!==window.HysFingerprint242(B.pack()))throw Error('El formulario cambió mientras se generaba el PDF. Se conserva la edición más reciente.');const {pdfBlob,...metadata}=entry;await q.commitDraft(row(p,{metadata,pdf:base64},id),draft(p,id));localSaved=true;H.hasPending=true;await pendingStatus();schedule()}
 async function newConflictCopy(){if(!canWrite()||!queue)return;const q=queue,ticket=generation,list=await q.store.all('pending');if(!list.length)return;download(list,'conflictos-v242-'+Date.now()+'.json');if(!confirm('Se conservarán como informes nuevos todas las operaciones pendientes. Los originales centrales no se sobrescribirán. ¿Continuar?'))return;await q.transaction(async()=>{const ops=[];for(const p of list){const id='v242-'+uuid(),payload={...p.payload,reportId:id,...(current.profile.rol!=='administrador_global'?{owner:current.profile.nombre}:{})};const archive=p.archive&&payload.owner===p.payload.owner?{...p.archive,metadata:{...p.archive.metadata,id,reportId:id,reportData:payload}}:null;ops.push({store:'pending',value:{...p,id,payload,archive,revision:0,token:uuid()}},{store:'pending',id:p.id,remove:true});if(p.id===draftId){ops.push({store:'draft',value:draft(payload,id)})}}await q.writeDraftOps(ops)});if(ticket!==generation)return;const saved=await q.store.get('draft','current');draftId=saved.draftId;preserveOwner=false;protectedOwner=current.profile.nombre;apply(saved.payload);conflict=false;lastError='';await flush()}
 async function preserveBeforeRefresh(){if(!canWrite()||!queue)return true;const q=queue,ticket=generation,p=clone(B.pack());try{const saved=await q.store.get('draft','current');if(q!==queue||ticket!==generation)return true;if(saved&&window.HysFingerprint242(saved.payload)===window.HysFingerprint242(p))return true;return await onSave(p,false)}catch{message('No se pudo confirmar la copia local. Exporta un respaldo antes de actualizar la sesión.');return false}}
 // Administración central separada de Configuración APR/OTROS.
 const panel=document.createElement('section');panel.id='management242';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','managementTitle242');
 panel.innerHTML=`<div class="management-shell"><div class="management-head"><h1 id="managementTitle242">Administración central · v242</h1><button class="btn" id="manageClose242">Cerrar</button></div><p id="manageMessage242" role="status"></p><label id="manageModuleLabel242">Módulo <select id="manageModule242"></select></label><div class="btnrow"><button class="btn" id="manageAreas242">Áreas de trabajo</button><button class="btn" id="manageLists242">Opciones de informes</button><button class="btn" id="manageRegimes281">Turnos laborales</button><button class="btn" id="manageAudit242">Historial de áreas</button></div><form id="manageForm242"><label id="catalogFieldLabel242" hidden>Selector <select id="catalogField242"></select></label><label id="manageNameLabel242">Nombre <input id="manageName242" maxlength="150" required></label><button class="btn primary">Crear</button></form><div id="manageRows242"></div><button class="btn" id="auditMore242" hidden>Más registros</button><p class="smallnote">Los cambios requieren conexión y se validan en Supabase. Desactivar una opción conserva los informes históricos.</p></div>`;
 document.body.append(panel);
 const button=document.createElement('button');button.id='manageOpen242';button.type='button';button.className='hys-admin-open';button.title='Administración de áreas y opciones';button.setAttribute('aria-label','Administración de áreas y opciones');button.innerHTML='<span class="tools-option-icon" aria-hidden="true">▦</span><span class="tools-option-label">Áreas y opciones</span><span class="tools-option-full">Administración de áreas y opciones</span>';button.hidden=true;

 const fieldLabels={shift:'Turno del informe diario',project:'Proyecto',Resultado:'Resultado',Prioridad:'Prioridad',Estado:'Estado',owner:'Responsables (administrador general)',otherCategory:'Tipo de actividad',otherStatus:'Estado alternativo'};
 for(const [id,label] of Object.entries(fieldLabels))$('catalogField242').add(new Option(label,id));
 let section='areas',auditPage=0,manageVersion=0;
 function syncManagementRail(){const a=access();const chooser=$('moduleChooser');const visible=!!(a&&a.profile.activo===true&&window.Hys256Access.areas(a)&&!window.__REPORTES_HYS_OTROS_EMBEDDED__&&!a.selectedModule&&chooser&&chooser.style.display==='block');button.hidden=!visible;return visible}
 function mountManagementRail(){const options=$('hysToolsOptions');if(options&&button.parentElement!==options)options.append(button);updateManagement()}
 function updateManagement(){const a=access();const allowed=a&&['administrador_global','administrador_area','supervisor'].includes(a.profile.rol);syncManagementRail();$('manageLists242').hidden=a?.profile.rol!=='administrador_global';$('manageRegimes281').hidden=a?.profile.rol!=='administrador_global';if(!allowed){panel.hidden=true;$('manageRows242').replaceChildren()}window.reportesHysAdminSync?.() }

 function canManageModule(module){return current?.profile.activo===true&&(current.profile.rol==='administrador_global'||current.profile.rol==='supervisor'&&current.permissions?.some(p=>p.modulo===module&&p.puede_ver&&p.puede_editar)||current.facultades?.some(f=>f.modulo===module&&f.facultades?.areas===true))}
 function modulesForUser(){return current?.profile.rol==='administrador_global'?['APR','OTROS']:current?.modules||[]}
 function openManagement(){if(!allowedManage())return;const m=$('manageModule242');m.replaceChildren(...modulesForUser().map(n=>new Option(moduleLabel(n),n)));m.value=current.selectedModule||access()?.selectedModule||m.options[0]?.value;panel.hidden=false;section='areas';loadManagement()}
 async function loadManagement(more=false){if(!allowedManage())return;
  $('manageModuleLabel242').hidden=section==='regimes';$('manageNameLabel242').firstChild.textContent=section==='regimes'?'Régimen laboral (ej. 5x2) ':'Nombre ';if(section!=='regimes'){$('manageName242').maxLength=150;$('manageName242').placeholder='';}
  if(section==='regimes')return await loadRegimes281();if(!central()&&section!=='lists'){$('manageMessage242').textContent='Gestión central de áreas pendiente de autorización. Las opciones y turnos se consultan en su sección.';$('manageForm242').hidden=true;$('manageRows242').replaceChildren();return}const capabilities=section==='lists'?await window.Hys279Backend?.available():{ready:central()};const mayWrite=capabilities?.ready===true;const version=++manageVersion,module=$('manageModule242').value;const status=$('manageMessage242');status.textContent='Consultando Supabase…';$('manageForm242').hidden=section==='audit'||!canManageModule(module)||!mayWrite;$('catalogFieldLabel242').hidden=section!=='lists';$('auditMore242').hidden=true;try{let query=window.reportesHysSupabase.from(section==='areas'?'areas_trabajo_v242':section==='lists'?'listas_v242':'auditoria_areas_v242').select('*').eq('modulo',module);if(section==='lists'){if(current.profile.rol!=='administrador_global')throw Error('Solo el administrador general puede modificar listas');query=query.eq('campo',$('catalogField242').value)}if(section==='audit'){auditPage=more?auditPage+1:0;query=query.order('fecha',{ascending:false}).range(auditPage*50,auditPage*50+49)}else query=query.order(section==='areas'?'nombre':'valor');const r=await query;if(r.error)throw r.error;if(version!==manageVersion||!allowedManage())return;const rows=$('manageRows242');if(!more)rows.replaceChildren();for(const item of r.data||[]){const div=document.createElement('article');div.className='manage-row';const name=document.createElement('strong');name.textContent=section==='audit'?`${new Date(item.fecha).toLocaleString('es-CL')} · ${item.usuario_nombre} · ${roleLabel(item.rol)} · ${moduleLabel(item.modulo)} · ${item.accion}`:`${item.nombre||item.valor} · ${item.activa?'Activa':'Inactiva'}`;div.append(name);if(section==='audit'){const detail=document.createElement('p');detail.textContent=`Usuario: ${item.usuario_id||'sistema'} | Anterior: ${JSON.stringify(item.anterior)} | Nuevo: ${JSON.stringify(item.nuevo)}`;div.append(detail)}else if(canManageModule(module)&&mayWrite){const edit=document.createElement('button');edit.className='btn';edit.textContent='Editar nombre';edit.onclick=async()=>{const value=prompt('Nuevo nombre',item.nombre||item.valor);if(value?.trim())await mutate(item,{[section==='areas'?'nombre':'valor']:value.trim()})};const toggle=document.createElement('button');toggle.className='btn';toggle.textContent=item.activa?'Desactivar':'Reactivar';toggle.onclick=()=>mutate(item,{activa:!item.activa});div.append(edit,toggle)}rows.append(div)}$('auditMore242').hidden=section!=='audit'||r.data.length<50;status.textContent=!mayWrite&&section==='lists'?(capabilities?.reason||'Consulta en solo lectura: falta la integración segura de listas en Supabase.'):r.data.length?'Consulta actualizada.':'Sin registros.'}catch(e){status.textContent='No se pudo consultar: '+e.message}}
 async function mutate(item,patch){
 const sec=section,module=$('manageModule242').value;
 if(sec==='regimes')return mutateRegime281(item,patch);
 if(!allowedManage()||!canManageModule(module)||(sec==='lists'&&current.profile.rol!=='administrador_global'))return;
 if(sec==='lists'){
  const cap=await window.Hys279Backend?.available();
  if(!cap?.ready){$('manageMessage242').textContent=cap?.reason||'Backend de opciones no habilitado.';return}
  const value=String(patch.valor??patch.nombre??item?.valor??'').trim();
  if(!value){$('manageMessage242').textContent='La opción debe tener un nombre válido.';return}
  const reason=prompt('Indica motivo obligatorio (al menos 10 caracteres) para modificar la lista de opciones.');
  if(reason===null)return;
  if(reason.trim().length<10){$('manageMessage242').textContent='Motivo de 10 caracteres como mínimo.';return}
  if(!confirm('¿Confirmar la modificación REAL de «'+$('catalogField242').value+'» en '+moduleLabel(module)+'?'))return;
  try{
   await window.Hys279Backend.saveOption({
    modulo:module,campo:$('catalogField242').value,id:item?.id||null,valor:value,
    activa:patch.activa??item?.activa??true,esperado:item?.actualizado_en||null,motivo:reason
   });
   $('manageName242').value='';await loadManagement();
   if(module===current.selectedModule)await refreshCatalog();
   $('manageMessage242').textContent='Lista actualizada y auditada en Supabase.';
  }catch(e){$('manageMessage242').textContent=e.message}
  return;
 }
 if(!central()){$('manageMessage242').textContent='Activación central de áreas pendiente de autorización.';return}
 try{
  const table='areas_trabajo_v242';
  let q;
  if(item)q=window.reportesHysSupabase.from(table).update(patch).eq('id',item.id).eq('actualizado_en',item.actualizado_en);
  else q=window.reportesHysSupabase.rpc('hys242_crear_area',{p_modulo:module,p_nombre:patch.nombre});
  const r=!item?await q:await q.select('*').single();
  if(r.error)throw r.error;
  $('manageName242').value='';await loadManagement();
  if(module===current.selectedModule)await refreshCatalog();
 }catch(e){$('manageMessage242').textContent='No se guardó el cambio: '+e.message}
}

async function loadRegimes281(){
 const version=++manageVersion;
 const status=$('manageMessage242'),rows=$('manageRows242');
 status.textContent='Consultando el catálogo independiente de turnos laborales…';
 $('catalogFieldLabel242').hidden=true;$('auditMore242').hidden=true;
 $('manageName242').maxLength=7;$('manageName242').placeholder='Ej. 5x2';
 $('manageForm242').hidden=true;rows.replaceChildren();
 if(current?.profile?.rol!=='administrador_global'){
  status.textContent='Solo el Administrador general puede gestionar los turnos laborales.';return;
 }
 const cap=await window.Hys279Backend?.regimesReady();
 if(version!==manageVersion||section!=='regimes'||panel.hidden)return;
 if(!cap?.ready){status.textContent=cap?.reason||'La lista real de regímenes laborales todavía no está disponible en Supabase.';return}
 try{
  const data=await window.Hys279Backend.regimes();
  if(version!==manageVersion||section!=='regimes'||panel.hidden)return;
  $('manageForm242').hidden=false;
  for(const item of data){
   const div=document.createElement('article');div.className='manage-row';
   const label=document.createElement('strong');label.textContent=item.codigo.toLowerCase()+' · '+(item.activo?'Activo':'Desactivado');
   div.append(label);
   const edit=document.createElement('button');edit.type='button';edit.className='btn';edit.textContent='Editar';
   edit.onclick=()=>{if(item.activo){const next=prompt('Modificar régimen laboral (por ejemplo 5x2)',item.codigo.toLowerCase());if(next!==null)mutateRegime281(item,{codigo:next})}else status.textContent='Reactiva primero este régimen antes de modificarlo.'};
   const toggle=document.createElement('button');toggle.type='button';toggle.className='btn';
   toggle.textContent=item.activo?'Eliminar de las opciones (conservar historial)':'Restaurar';
   toggle.onclick=()=>mutateRegime281(item,{activo:!item.activo});
   div.append(edit,toggle);rows.append(div);
  }
  status.textContent=data.length?'Regímenes laborales consultados. Esta lista es independiente del turno Día/Noche del informe diario.':'Aún no hay regímenes registrados. Agrega el primero.';
 }catch(e){status.textContent='No fue posible consultar regímenes laborales: '+e.message}
}
async function mutateRegime281(item,patch){
 const status=$('manageMessage242');
 if(!allowedManage()||current?.profile?.rol!=='administrador_global'||section!=='regimes')return;
 const codigo=String(patch.codigo??patch.nombre??item?.codigo??'').trim();
 if(!/^[1-9]\d{0,2}\s*[xX]\s*[1-9]\d{0,2}$/.test(codigo)){
  status.textContent='Formato inválido: ingresa un régimen como 5x2, 4x3, 10x5 o 7x7.';return;
 }
 const motivo=prompt('Motivo obligatorio de la '+(item?'modificación':'creación')+' del régimen laboral (mínimo 10 caracteres):');
 if(motivo===null)return;
 if(motivo.trim().length<10){status.textContent='Indica al menos 10 caracteres en el motivo.';return}
 if(!confirm((item?'¿Confirmar cambio de':'¿Crear')+' régimen laboral '+codigo.toLowerCase()+'? Esta operación se guardará en Supabase.'))return;
 status.textContent='Guardando régimen laboral en Supabase…';
 try{
  await window.Hys279Backend.saveRegime({
   id:item?.id||null,codigo,activo:patch.activo??item?.activo??true,
   revision:item?.revision??null,motivo
  });
  $('manageName242').value='';await loadRegimes281();
  window.dispatchEvent(new CustomEvent('reportes-hys-regimenes-updated'));
 }catch(e){status.textContent=e.message}
}
 button.onclick=openManagement;$('manageClose242').onclick=()=>{panel.hidden=true;manageVersion++};$('manageModule242').onchange=()=>loadManagement();$('catalogField242').onchange=()=>loadManagement();$('manageAreas242').onclick=()=>{section='areas';loadManagement()};$('manageLists242').onclick=()=>{section='lists';loadManagement()};$('manageRegimes281').onclick=()=>{section='regimes';loadManagement()};$('manageAudit242').onclick=()=>{section='audit';loadManagement()};$('auditMore242').onclick=()=>loadManagement(true);$('manageForm242').onsubmit=e=>{e.preventDefault();const name=$('manageName242').value.trim().replace(/\s+/g,' ');if(name)mutate(null,{nombre:name})};

 const H=window.Hys242={onAccess,onSave,onArchive,preserveBeforeRefresh,enforceOwner,flush,canWrite,hasPending:false,refreshCatalog,mountManagementRail,syncManagementRail,finalizeReport,startNew,fetchReport,loadReport,reportId:()=>draftId,sessionKey:()=>generation};
 $('cloudRetry242').onclick=async()=>{if(phase==='error'){await onAccess(access());return}if(canWrite())await onSave(B.pack(),true);await flush();try{await refreshCatalog();await refreshReports()}catch(e){message('No se pudo actualizar: '+e.message)}};$('cloudLoad242').onclick=recoverDraft;const recoveries=document.createElement('button');recoveries.className='btn';recoveries.id='localRecoveries242';recoveries.textContent='Descargar recuperaciones locales';$('cloudLoad242').insertAdjacentElement('afterend',recoveries);recoveries.onclick=async()=>{const q=queue,ticket=generation;if(!q)return;const rows=(await q.store.all('draft')).filter(r=>r.id!=='current');if(ticket!==generation)return;if(rows.length)download(rows,'recuperaciones-v242.json');else message('No hay recuperaciones locales adicionales. El borrador actual se conserva por separado.');};$('cloudCopy242').onclick=()=>newConflictCopy().catch(e=>message('No se pudo conservar la copia: '+e.message));$('newReport242').onclick=startNew;
 $('autosaveToggle').addEventListener('change',()=>{if($('autosaveToggle').checked)onSave(B.pack(),true)});
 window.addEventListener('online',async()=>{await flush();refreshCatalog().catch(()=>{})});window.addEventListener('offline',()=>{lastError='sin conexión';pendingStatus()});
 window.addEventListener('beforeunload',e=>{if(H.hasPending){e.preventDefault();e.returnValue=''}});
 document.querySelector('.nav[data-tab="historial"]').addEventListener('click',()=>{if(current?.selectedModule)refreshReports().catch(e=>message('Mostrando copias locales. No se pudo consultar Supabase: '+e.message))});
 setInterval(()=>{if(queue&&navigator.onLine!==false&&!conflict)flush()},30000);
 setInterval(()=>{if(queue&&navigator.onLine!==false&&!document.hidden)refreshCatalog().catch(()=>{})},30000);
})();
