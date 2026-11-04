/* Cola durable v241. No elimina una operación hasta confirmar su token en el servidor. */
(function(root){
 const clone=v=>JSON.parse(JSON.stringify(v));
 function canonical(v){return Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v}
 function fingerprint(p){const {history,authenticatedUser,aprNames,areaNames,version,localSavedAt241,...fields}=p||{};return JSON.stringify(canonical(fields))}
 class Queue241{
  constructor(store,send){this.store=store;this.send=send;this.serial=Promise.resolve();this.running=null}
  transaction(fn){const p=this.serial.then(fn);this.serial=p.catch(()=>{});return p}
  async prepare(row){const prior=await this.store.get('pending',row.id),meta=await this.store.get('meta',row.id);return {...clone(row),archive:row.archive??(prior&&fingerprint(prior.payload)===fingerprint(row.payload)?prior.archive:null)??null,revision:prior?.revision??meta?.revision??0}}
  enqueue(row){return this.transaction(async()=>{await this.store.put('pending',await this.prepare(row))})}
  commitDraft(row,draft){return this.transaction(async()=>{const prepared=row?await this.prepare(row):null;await this.store.batch([...(prepared?[{store:'pending',value:prepared}]:[]),{store:'draft',value:draft}])})}
  flush(){if(this.running)return this.running;this.running=this.run().finally(()=>{this.running=null});return this.running}
  async run(){for(let n=0;n<50;n++){
   const list=await this.transaction(()=>this.store.all('pending'));if(!list.length)return;
   const item=list.sort((a,b)=>a.at-b.at)[0],saved=await this.send(item);
   if(!saved||!Number.isInteger(saved.revision)||saved.revision<1)throw Error('Supabase no confirmó la revisión del informe');
   await this.transaction(async()=>{const current=await this.store.get('pending',item.id);await this.store.batch([{store:'meta',value:{id:item.id,revision:saved.revision,fingerprint:fingerprint(saved.payload||item.payload)}},...(current?.token===item.token?[{store:'pending',id:item.id,remove:true}]:current?[{store:'pending',value:{...current,revision:saved.revision}}]:[])])});
  }}
 }
 root.Queue241=Queue241;root.HysFingerprint241=fingerprint;if(typeof module==='object')module.exports={Queue241,fingerprint};
})(typeof window==='object'?window:globalThis);
