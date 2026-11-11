/* v254: ámbito local por usuario/módulo, capturas invalidables y eventos físicos. */
(function(){
 const native=window.localStorage,session=window.sessionStorage;
 const open=window.indexedDB.open.bind(window.indexedDB);
 let scope='sin-sesion',epoch=0;
 const module=new URLSearchParams(location.search).get('embedded')==='otros'?'OTROS':'APR';
 const prefix=()=>`hys-excel-v258-lab::${scope}::${module}::`;
 function wrapper(store,base){return {
  get length(){return Object.keys(store).filter(k=>k.startsWith(base())).length},
  key(i){return Object.keys(store).filter(k=>k.startsWith(base())).map(k=>k.slice(base().length))[i]??null},
  getItem(k){return store.getItem((String(k).startsWith('sb-')?'hys-excel-v258-lab::auth::':base())+k)},
  setItem(k,v){store.setItem((String(k).startsWith('sb-')?'hys-excel-v258-lab::auth::':base())+k,String(v))},
  removeItem(k){store.removeItem((String(k).startsWith('sb-')?'hys-excel-v258-lab::auth::':base())+k)},
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
  // Acceso exclusivamente de lectura a registros ya guardados por Work v258
  // en este mismo navegador. Nunca se escriben ni se eliminan.
  readWork258Draft(uid,mod){
   if(scope==='sin-sesion'||String(uid)!==scope||mod!==module)return null;
   return native.getItem('hys-v255::'+scope+'::'+module+'::reportes-hys-v30-daily');
  },
  work258ArchiveName(uid,mod){
   if(scope==='sin-sesion'||String(uid)!==scope||mod!==module)return null;
   return 'hys-v255::'+scope+'::'+module+'::reportes-hys-pdf-archive-v242';
  },
  openNative:open,
  legacySnapshot(){const out={};for(const k of Object.keys(native))if(k.startsWith('reportes-hys-')&&!k.startsWith('sb-'))out[k]=native.getItem(k);return out;}
 };
})();
