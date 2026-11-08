/* v254: ámbito local por usuario/módulo, capturas invalidables y eventos físicos. */
(function(){
 const native=window.localStorage,session=window.sessionStorage;
 const open=window.indexedDB.open.bind(window.indexedDB);
 let scope='sin-sesion',epoch=0;
 const module=new URLSearchParams(location.search).get('embedded')==='otros'?'OTROS':'APR';
 const prefix=()=>`hys-v266-laboratorio::${scope}::${module}::`;

 // Administración y Apariencia de laboratorio son GLOBALES entre las dos tarjetas,
 // mientras los borradores de informes siguen aislados por usuario y módulo.
 const LAB_KEYS=new Set(['reportes-hys-v266-simulador-local-1','reportes-hys-v266-apariencia-local']);
 const LAB_SHARED='hys-v266-lab-shared::';
 const validateLabKey=k=>{
  const name=String(k);
  if(!LAB_KEYS.has(name))throw Error('Clave de laboratorio no autorizada');
  return LAB_SHARED+name;
 };
 const sharedLabStorage={
  getItem:k=>native.getItem(validateLabKey(k)),
  setItem:(k,v)=>native.setItem(validateLabKey(k),String(v)),
  removeItem:k=>native.removeItem(validateLabKey(k))
 };
 // Migración de SOLO las claves v265 inequívocas desde el antiguo wrapper v263.
 // No importa borradores de informes de v263/v264 ni elimina copias históricas.
 function migrateLabSettings(){
  for(const key of LAB_KEYS){
   if(sharedLabStorage.getItem(key)!==null)continue;
   const candidates=[];
   for(const storageKey of Object.keys(native)){
    if(!/^hys-v266-laboratorio::/.test(storageKey)||!storageKey.endsWith('::'+key))continue;
    try{
     const raw=native.getItem(storageKey),doc=JSON.parse(raw);
     const valid=key.includes('simulador')?Array.isArray(doc.users)&&Array.isArray(doc.areas)&&Array.isArray(doc.history):
      !!doc.config&&typeof doc.config==='object'&&Number.isInteger(doc.revision);
     if(valid)candidates.push({raw,score:Number(doc.rev??doc.revision??0),storageKey});
    }catch{}
   }
   if(!candidates.length)continue;
   candidates.sort((a,b)=>b.score-a.score||a.storageKey.localeCompare(b.storageKey));
   sharedLabStorage.setItem(key,candidates[0].raw);
  }
 }
 try{migrateLabSettings()}catch{/* Almacenamiento privado o bloqueado: no se destruyen datos previos. */}

 function wrapper(store,base){return {
  get length(){return Object.keys(store).filter(k=>k.startsWith(base())).length},
  key(i){return Object.keys(store).filter(k=>k.startsWith(base())).map(k=>k.slice(base().length))[i]??null},
  getItem(k){return store.getItem((String(k).startsWith('sb-')?'hys-v266-laboratorio::auth::':base())+k)},
  setItem(k,v){store.setItem((String(k).startsWith('sb-')?'hys-v263-laboratorio::auth::':base())+k,String(v))},
  removeItem(k){store.removeItem((String(k).startsWith('sb-')?'hys-v263-laboratorio::auth::':base())+k)},
  clear(){Object.keys(store).filter(k=>k.startsWith(base())).forEach(k=>store.removeItem(k))}
 }}
 Object.defineProperty(window,'localStorage',{configurable:true,value:wrapper(native,prefix)});
 Object.defineProperty(window,'sessionStorage',{configurable:true,value:wrapper(session,()=>prefix()+'session::')});
 window.indexedDB.open=(name,...args)=>open(prefix()+name,...args);
 window.HysStorage242={
  setScope(uid){const next=uid||'sin-sesion';if(next!==scope){scope=next;epoch++;}},
  capture(){const base=prefix(),ticket=epoch;return Object.assign(wrapper(native,()=>base),{valid:()=>ticket===epoch&&base===prefix()});},
  captureDatabase(name){const base=prefix(),ticket=epoch;return {scope:base,valid:()=>ticket===epoch&&base===prefix(),open:(...args)=>open(base+name,...args)};},
  matchesEvent(event,key){return (!event.storageArea||event.storageArea===native)&&(event.key===null||event.key===prefix()+key);},
  openNative:open,
  legacySnapshot(){const out={};for(const k of Object.keys(native))if(k.startsWith('reportes-hys-')&&!k.startsWith('sb-'))out[k]=native.getItem(k);return out;},
  legacyVersionedSnapshot(){const out={};for(const k of Object.keys(native))if(k.startsWith('hys-v263-laboratorio::')&&!k.includes('::auth::'))out[k]=native.getItem(k);return out;},
  namespace:'hys-v266-laboratorio',
  sharedLabStorage
 };
})();
