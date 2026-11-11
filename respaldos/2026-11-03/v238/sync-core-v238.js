(function(root){
 class Queue238{
  constructor(store,send){this.store=store;this.send=send;this.busy=false;this.serial=Promise.resolve()}
  transaction(fn){const p=this.serial.then(fn);this.serial=p.catch(()=>{});return p}
  enqueue(row){return this.transaction(async()=>{const prior=await this.store.get('pending',row.id);const meta=await this.store.get('meta',row.id);await this.store.put('pending',{...row,revision:prior?.revision??meta?.revision??0})})}
  async flush(){if(this.busy)return;this.busy=true;try{
   for(let rounds=0;rounds<50;rounds++){
    const list=await this.transaction(()=>this.store.all('pending'));if(!list.length)break;
    const item=list.sort((a,b)=>a.at-b.at)[0];const saved=await this.send(item);
    await this.transaction(async()=>{await this.store.put('meta',{id:item.id,revision:saved.revision});const current=await this.store.get('pending',item.id);if(current?.token===item.token)await this.store.remove('pending',item.id);else if(current)await this.store.put('pending',{...current,revision:saved.revision})});
   }
  }finally{this.busy=false}}
 }
 root.Queue238=Queue238;if(typeof module==='object')module.exports={Queue238};
})(typeof window==='object'?window:globalThis);

