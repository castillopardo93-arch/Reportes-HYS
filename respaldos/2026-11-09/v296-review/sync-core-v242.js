/* Cola durable v242. No elimina una operación hasta confirmar su token en el servidor. */
(function(root){
 const clone=v=>JSON.parse(JSON.stringify(v));
 function canonical(v){return Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v}
 function fingerprint(p){const {history,authenticatedUser,aprNames,areaNames,version,localSavedAt242,...fields}=p||{};return JSON.stringify(canonical(fields))}
 function verifyServerAck(item,saved){
  // Contrato real hys242_guardar_con_motivo: devuelve fila informes_v242.
  // La función del servidor puede devolver una fila preexistente cuando
  // un reintento fue idempotente o los datos son idénticos (sin cambios).
  const fail=()=>{throw Error('Supabase no confirmó la identidad y el contenido del informe. La operación permanece pendiente.');};
  if(!item||typeof item.id!=='string'||!item.id||!['APR','OTROS'].includes(item.module)||
     typeof item.token!=='string'||!item.token||!Number.isSafeInteger(item.revision)||item.revision<0)fail();
  if(!saved||saved.id!==item.id||saved.modulo!==item.module||
     !Number.isSafeInteger(saved.revision)||saved.revision<1||saved.revision<item.revision||
     !saved.payload||typeof saved.payload!=='object'||Array.isArray(saved.payload))fail();
  if(saved.payload.reportId!==item.id)fail();
  const sameToken=String(saved.ultimo_token||'').toLowerCase()===item.token.toLowerCase();
  if(!sameToken){
   // La respuesta anterior es aceptable exclusivamente cuando la operación
   // ya está representada de forma idéntica en el servidor (no-op).
   if(fingerprint(saved.payload)!==fingerprint(item.payload))fail();
   if(item.archive!=null&&JSON.stringify(canonical(saved.archivo??null))!==JSON.stringify(canonical(item.archive)))fail();
  }
  return {revision:saved.revision,fingerprint:fingerprint(saved.payload),sameToken};
 }
 function isRemoteConfirmed(local,meta,localSaved){
  return !!(local&&localSaved&&Number.isSafeInteger(meta?.revision)&&meta.revision>0&&
   typeof meta.fingerprint==='string'&&meta.fingerprint===fingerprint(local.payload));
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
  async run(){for(let n=0;n<50;n++){
   const list=await this.transaction(()=>this.store.all('pending'));if(!list.length)return;
   const item=list.sort((a,b)=>a.at-b.at)[0];
   if(item.requiresPdfRegeneration===true&&!item.archive){
    const err=Error('El informe recuperado necesita generar un PDF nuevo antes de sincronizarse.');
    err.code='HYS_PDF_REQUIRED';throw err;
   }
   const saved=await this.send(item);
   const confirmation=verifyServerAck(item,saved);
   await this.transaction(async()=>{const current=await this.store.get('pending',item.id);await this.store.batch([{store:'meta',value:{id:item.id,revision:confirmation.revision,fingerprint:confirmation.fingerprint}},...(current?.token===item.token?[{store:'pending',id:item.id,remove:true}]:current?[{store:'pending',value:{...current,revision:saved.revision}}]:[])])});
  }}
 }
 root.Queue242=Queue242;root.HysFingerprint242=fingerprint;root.HysVerifyServerAck242=verifyServerAck;root.HysRemoteConfirmed242=isRemoteConfirmed;if(typeof module==='object')module.exports={Queue242,fingerprint,verifyServerAck,isRemoteConfirmed};
})(typeof window==='object'?window:globalThis);
