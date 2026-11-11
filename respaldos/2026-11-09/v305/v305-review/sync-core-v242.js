/* Cola durable v242. No elimina una operación hasta confirmar su token en el servidor. */
(function(root){
 const clone=v=>JSON.parse(JSON.stringify(v));
 function canonical(v){return Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v}
 function fingerprint(p){const {history,authenticatedUser,aprNames,areaNames,version,localSavedAt242,...fields}=p||{};return JSON.stringify(canonical(fields))}
 // Huella adicional de trazabilidad. Nunca confundir un cambio solo de historial
 // con un informe idéntico (el backend v242 aún ignora history en su no-op).
 function historyFingerprint(p){return JSON.stringify(canonical(p?.history??null))}
 function archiveMatches(requested,returned,payload){
  if(requested==null)return true;
  if(!returned||typeof returned!=='object'||Array.isArray(returned))return false;
  const expected=clone(requested);
  // Normalización documentada del backend: reemplaza metadata.reportData
  // con el payload efectivamente persistido al almacenar un PDF nuevo.
  if(expected?.metadata&&Object.hasOwn(expected.metadata,'reportData'))
   expected.metadata.reportData=clone(payload);
  return JSON.stringify(canonical(expected))===JSON.stringify(canonical(returned));
 }
 function verifyServerAck(item,saved){
  const fail=(why,code='HYS_ACK_MISMATCH')=>{
   const error=Error(why+' La operación conserva su estado pendiente y no se confirma.');
   error.code=code;throw error;
  };
  if(!item||typeof item.id!=='string'||!item.id||!['APR','OTROS'].includes(item.module)||
     typeof item.token!=='string'||!item.token||!Number.isSafeInteger(item.revision)||item.revision<0||
     !item.payload||typeof item.payload!=='object'||Array.isArray(item.payload)||
     item.payload.reportId!==item.id)
   fail('La solicitud del informe está incompleta.');
  if(!saved||saved.id!==item.id||saved.modulo!==item.module||
     !Number.isSafeInteger(saved.revision)||saved.revision<1||saved.revision<item.revision||
     !saved.payload||typeof saved.payload!=='object'||Array.isArray(saved.payload)||
     saved.payload.reportId!==item.id)
   fail('El servidor devolvió una identidad, módulo o revisión incompatible.');
  // Un token igual solo prueba idempotencia, no identidad del contenido.
  // No admitir payload diferente ni al recibir el token solicitado.
  if(fingerprint(saved.payload)!==fingerprint(item.payload))
   fail('Los datos confirmados por Supabase no coinciden con el formulario enviado.');
  // El RPC v242 compara reportes sin history. Si no lo guardó, rechazar
  // tanto un acuse con token igual como un no-op de token anterior.
  const historyRequested=historyFingerprint(item.payload);
  const historySaved=historyFingerprint(saved.payload);
  if(historySaved!==historyRequested)
   fail('El historial de cambios no fue confirmado por Supabase. Se requiere corregir el contrato del servidor antes de sincronizarlo.','HYS_HISTORY_NOT_PERSISTED');
  if(!archiveMatches(item.archive,saved.archivo,saved.payload))
   fail('El archivo PDF confirmado no coincide con el enviado.');
  const sameToken=String(saved.ultimo_token||'').toLowerCase()===item.token.toLowerCase();
  return {revision:saved.revision,fingerprint:fingerprint(saved.payload),
   historyFingerprint:historySaved,sameToken};
 }
 function isRemoteConfirmed(local,meta,localSaved){
  if(!local||!localSaved||!Number.isSafeInteger(meta?.revision)||meta.revision<1||
     typeof meta.fingerprint!=='string'||meta.fingerprint!==fingerprint(local.payload))return false;
  // Respetar los metadatos anteriores sin historia, pero nunca informar
  // "sincronizado" para una traza no comprobada.
  const history=local.payload?.history;
  if(history!=null&&(!Array.isArray(history)||history.length>0)&&
     meta.historyFingerprint!==historyFingerprint(local.payload))return false;
  return true;
 }
 class Queue242{
  constructor(store,send){this.store=store;this.send=send;this.serial=Promise.resolve();this.running=null;this.expectedDraftRevision=null}
  setDraftRevision(value){this.expectedDraftRevision=Number.isSafeInteger(value)&&value>=0?value:0}
  async writeDraftOps(ops){
   const expected=this.expectedDraftRevision;
   const next=expected===null?null:expected+1;
   const changes=next===null?ops:ops.map(o=>o.store==='draft'&&o.value?.id==='current'?{...o,value:{...o.value,localRevision:next}}:o);
   if(expected!==null&&this.store.compareAndBatch)await this.store.compareAndBatch(changes,expected);
   else await this.store.batch(changes);
   if(next!==null)this.expectedDraftRevision=next;
  }
  replaceDraft(ops){return this.transaction(()=>this.writeDraftOps(ops))}
  transaction(fn){const p=this.serial.then(fn);this.serial=p.catch(()=>{});return p}
  async prepare(row){
   const prior=await this.store.get('pending',row.id),meta=await this.store.get('meta',row.id);
   const archive=row.archive??(prior&&fingerprint(prior.payload)===fingerprint(row.payload)?prior.archive:null)??null;
   const requiresPdfRegeneration=!archive&&(prior?.requiresPdfRegeneration===true||row.requiresPdfRegeneration===true);
   const payload=clone(row.payload);
   if(requiresPdfRegeneration)payload.status='En edición';
   return {...clone(row),payload,archive,requiresPdfRegeneration,revision:prior?.revision??meta?.revision??0};
  }
  enqueue(row){return this.transaction(async()=>{await this.store.put('pending',await this.prepare(row))})}
  commitDraft(row,draft){return this.transaction(async()=>{const prepared=row?await this.prepare(row):null;await this.writeDraftOps([...(prepared?[{store:'pending',value:prepared}]:[]),{store:'draft',value:draft}])})}
  flush(){if(this.running)return this.running;this.running=this.run().finally(()=>{this.running=null});return this.running}
  async run(){
   let sent=0;
   for(let n=0;n<50;n++){
    const list=await this.transaction(()=>this.store.all('pending'));
    if(!list.length)return {sent,blocked:0,blockedIds:[],remaining:0};
    // Un informe que necesita regenerar su PDF permanece íntegro en la cola.
    // Otros informes independientes siguen teniendo oportunidad de enviarse.
    const ordered=list.slice().sort((a,b)=>(a.at||0)-(b.at||0));
    const blocked=ordered.filter(x=>x.requiresPdfRegeneration===true&&!x.archive);
    const item=ordered.find(x=>!(x.requiresPdfRegeneration===true&&!x.archive));
    if(!item)return {sent,blocked:blocked.length,blockedIds:blocked.map(x=>x.id),remaining:list.length};
    const saved=await this.send(item);
    const confirmation=verifyServerAck(item,saved);
    await this.transaction(async()=>{
     const current=await this.store.get('pending',item.id);
     const ops=[{store:'meta',value:{
      id:item.id,revision:confirmation.revision,
      fingerprint:confirmation.fingerprint,
      historyFingerprint:confirmation.historyFingerprint
     }}];
     if(current?.token===item.token)ops.push({store:'pending',id:item.id,remove:true});
     else if(current)ops.push({store:'pending',value:{...current,revision:confirmation.revision}});
     await this.store.batch(ops);
    });
    sent++;
   }
   const remaining=await this.transaction(()=>this.store.all('pending'));
   const blocked=remaining.filter(x=>x.requiresPdfRegeneration===true&&!x.archive);
   return {sent,blocked:blocked.length,blockedIds:blocked.map(x=>x.id),remaining:remaining.length};
  }
 }
 root.Queue242=Queue242;root.HysFingerprint242=fingerprint;root.HysVerifyServerAck242=verifyServerAck;root.HysRemoteConfirmed242=isRemoteConfirmed;if(typeof module==='object')module.exports={Queue242,fingerprint,historyFingerprint,archiveMatches,verifyServerAck,isRemoteConfirmed};
})(typeof window==='object'?window:globalThis);
