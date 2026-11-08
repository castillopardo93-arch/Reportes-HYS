/* Reportes HYS v265 · Vista de QA de la aplicación completa.
 * Activada EXCLUSIVAMENTE por index.html?qa=1 en raw.githack.com bajo /v265-review/.
 * Dos tarjetas y formularios auténticos de v265, cuenta ficticia y backend local; sin Supabase real.
 */
(function(root){
'use strict';
if(root.HYS265_PREVIEW_ONLY!==true)return;
const $=id=>document.getElementById(id);
const embedded=new URLSearchParams(location.search).get('embedded')==='otros';
const lab=root.Hys263Lab;
if(!lab||root.HYS263_SANDBOX!==true){
 const warning=document.createElement('p');warning.textContent='No se pudo inicializar el laboratorio ficticio. La vista de ensayo permanece bloqueada.';
 document.body.prepend(warning);return;
}
const clone=x=>JSON.parse(JSON.stringify(x));
const USER='administrador-general-ficticio-v265';
let access={
 userId:USER,
 profile:{usuario_id:USER,nombre:'Administrador general (pruebas)',rol:'administrador_global',activo:true},
 modules:['APR','OTROS'],permissions:[],facultades:[],
 selectedModule:embedded?'OTROS':null
};
function mockSelect(table){
 let filters=[];let multiple=null;
 let orderKey=null,ascending=true,max=null;
 const query={
  select(){return query},
  eq(key,val){filters.push(x=>x[key]===val);return query},
  in(key,values){multiple={key,values};return query},
  order(key,opts){orderKey=key;ascending=opts?.ascending!==false;return query},
  limit(n){max=n;return query},
  range(start,end){max=end-start+1;return query},
  maybeSingle(){return Promise.resolve({data:take()[0]||null,error:null})},
  single(){return Promise.resolve({data:take()[0]||null,error:take()[0]?null:{message:'Registro no encontrado en datos ficticios'}})},
  then(resolve,reject){return Promise.resolve({data:take(),error:null}).then(resolve,reject)},
  insert(){return Promise.resolve({data:null,error:{message:'Operación no permitida en vista ficticia'}})},
  update(){return Promise.resolve({data:null,error:{message:'Operación no permitida en vista ficticia'}})},
  delete(){return Promise.resolve({data:null,error:{message:'Operación no permitida en vista ficticia'}})},
  upsert(){return Promise.resolve({data:null,error:{message:'Operación no permitida en vista ficticia'}})}
 };
 function take(){
  const data=lab.get();
  const rows=table==='areas_trabajo_v242'||table==='areas_trabajo_v238'?data.areas:
   table==='facultades_v242'?data.faculties:
   table==='perfiles'?data.users:
   table==='auditoria_facultades_v242'||table==='eventos_v242'?data.history:[];
  let out=rows.filter(x=>filters.every(f=>f(x))&&(multiple===null||multiple.values.includes(x[multiple.key])));
  if(orderKey)out=[...out].sort((a,b)=>String(a[orderKey]||'').localeCompare(String(b[orderKey]||''))*(ascending?1:-1));
  return clone(max===null?out:out.slice(0,max));
 }
 return query;
}
const fakeClient={
 from:mockSelect,
 rpc:(name,args)=>lab.rpc(name,args),
 channel:()=>({on(){return this},subscribe(){return this},unsubscribe(){return Promise.resolve('ok')}}),
 removeChannel:()=>Promise.resolve({error:null}),
 auth:{
  getSession:()=>Promise.resolve({data:{session:null},error:null}),
  signOut:()=>Promise.resolve({error:null}),
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
 }
};
root.reportesHysSupabase=fakeClient;
root.__REPORTES_HYS_ACCESS__=access;
const gate=$('authGate');if(gate){gate.hidden=true;gate.style.display='none'}
document.body.classList.remove('auth-locked');
const banner=document.createElement('div');
banner.id='hys265PreviewBanner';
banner.setAttribute('role','note');
banner.textContent='V265 · DESARROLLO DE PRUEBAS · Usuarios y datos ficticios · Sin conexión a producción';
banner.style.cssText='position:fixed;right:12px;bottom:10px;z-index:3500;max-width:min(400px,85vw);padding:8px 12px;border-radius:10px;background:#ffe8b8;color:#5e3c0c;font:700 12px/1.3 Segoe UI,Arial,sans-serif;box-shadow:0 3px 10px #0014;pointer-events:none';
document.body.append(banner);
const cardA=$('aprModuleCard'),cardB=$('otherModuleCard');
if(cardA)cardA.hidden=false;if(cardB)cardB.hidden=false;
for(const id of ['openAprModule','openOtherModule']){const b=$(id);if(b){b.hidden=false;b.disabled=false}}
if($('authIdentityChooser')){
 $('authIdentityChooser').textContent='Administrador general de prueba · Ambas tarjetas autorizadas';
}
if($('chooserStatus'))$('chooserStatus').textContent='Seleccione una tarjeta. Esta es la aplicación completa de desarrollo; los datos son ficticios.';
if($('moduleChange'))$('moduleChange').hidden=false;
async function enterModule(target){
 const m=target===null||target===''?null:String(target).toUpperCase();
 if(m!==null&&!['APR','OTROS'].includes(m))return false;
 if(embedded&&m!=='OTROS')return false;
 access={...access,selectedModule:m};
 root.__REPORTES_HYS_ACCESS__=access;
 root.dispatchEvent(new CustomEvent('reportes-hys-access-changing'));
 try{await root.Hys242?.onAccess?.(access)}catch(e){console.warn('Vista de prueba: no se pudo iniciar el almacenamiento local:',e?.message||e)}
 try{root.HysAppearance242?.syncAccess?.(access)}catch(e){console.warn('Vista de prueba: apariencia no disponible:',e?.message||e)}
 root.reportesHysSetMode?.(embedded?'apr':m?m.toLowerCase():'');
 if(!m&&$('otherAprApp'))$('otherAprApp').src='about:blank';
 root.reportesHysAdminSync?.();
 root.dispatchEvent(new CustomEvent('reportes-hys-access-changed'));
 return true;
}
root.reportesHysChooseModule=enterModule;
if($('authLogout'))$('authLogout').onclick=()=>enterModule(null);
if($('chooserLogout'))$('chooserLogout').onclick=()=>enterModule(null);
if($('authUserLabel'))$('authUserLabel').textContent='Administrador general (pruebas)';
if(embedded){
 if($('authUserLabel'))$('authUserLabel').textContent='Administración de prueba · Supervisores y otros';
 enterModule('OTROS');
}else{
 enterModule(null);
}
})(window);
