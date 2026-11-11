/* Aislamiento v242: nunca escribe claves ni archivos de versiones protegidas. */
(function(){
 const native=window.localStorage, session=window.sessionStorage;
 const open=window.indexedDB.open.bind(window.indexedDB);
 let scope='sin-sesion';const module=new URLSearchParams(location.search).get('embedded')==='otros'?'OTROS':'APR';
 const prefix=()=>`hys-v242::${scope}::${module}::`;
 function wrapper(store,base){return {get length(){return Object.keys(store).filter(k=>k.startsWith(base())).length},key(i){return Object.keys(store).filter(k=>k.startsWith(base())).map(k=>k.slice(base().length))[i]??null},getItem(k){return store.getItem((String(k).startsWith('sb-')?'hys-v242::auth::':base())+k)},setItem(k,v){store.setItem((String(k).startsWith('sb-')?'hys-v242::auth::':base())+k,String(v))},removeItem(k){store.removeItem((String(k).startsWith('sb-')?'hys-v242::auth::':base())+k)},clear(){Object.keys(store).filter(k=>k.startsWith(base())).forEach(k=>store.removeItem(k))}}}
 Object.defineProperty(window,'localStorage',{configurable:true,value:wrapper(native,prefix)});
 Object.defineProperty(window,'sessionStorage',{configurable:true,value:wrapper(session,()=> prefix()+'session::')});
 window.indexedDB.open=(name,...args)=>open(prefix()+name,...args);
 window.HysStorage242={setScope(uid){scope=uid||'sin-sesion'},capture(){const base=prefix();return wrapper(native,()=>base)},captureDatabase(name){const base=prefix();return {scope:base,valid:()=>base===prefix(),open:(...args)=>open(base+name,...args)}},openNative:open,legacySnapshot(){const out={};for(const k of Object.keys(native))if(k.startsWith('reportes-hys-')&&!k.startsWith('sb-'))out[k]=native.getItem(k);return out}};
})();


