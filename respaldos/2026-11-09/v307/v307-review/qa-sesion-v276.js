/* Reportes HYS v276 — Cierre y reingreso al laboratorio ficticio.
 * Nunca se ejecuta en producción ni invoca Supabase Auth real.
 * «Cambiar módulo» sigue conservando la cuenta de prueba, «Cerrar sesión» abre el ingreso.
 */
(function(root){
 'use strict';
 const params=new URLSearchParams(root.location.search);
 const QA=root.HYS266_PREVIEW_ONLY===true&&root.HYS263_SANDBOX===true
  &&root.location.hostname==='raw.githack.com'
  &&/\/v276-review\/index\.html$/.test(root.location.pathname)
  &&params.get('qa')==='1';
 if(!QA||params.get('embedded')==='otros')return;
 const $=id=>root.document.getElementById(id);
 const gate=$('authGate'),card=gate?.querySelector('.auth-card'),login=$('authLoginForm'),recover=$('authRecover'),change=$('authChangeStart');
 const chooserLogout=$('chooserLogout'),headerLogout=$('authLogout');
 if(!gate||!card||!login||!recover||!change||!chooserLogout||!headerLogout)return;
 let moving=false,loggedOut=false;
 const help=root.document.createElement('p');
 help.id='authQaHelp276';help.className='auth-change-hint';
 help.textContent='ENTORNO DE PRUEBAS: no ingreses credenciales reales. Puedes probar «Cambiar contraseña» sin modificar cuentas y regresar a la aplicación ficticia.';
 const enter=root.document.createElement('button');
 enter.id='authQaLogin276';enter.type='button';enter.hidden=true;
 enter.textContent='Volver al laboratorio de prueba';
 card.insertBefore(help,$('authStatus'));
 card.insertBefore(enter,help);
 help.hidden=true;
 chooserLogout.textContent='Cerrar sesión de prueba';
 headerLogout.textContent='Cerrar sesión de prueba';
 
 function showLogin(){
  loggedOut=true;
  const changeForm=$('authChangeForm');
  if(changeForm)changeForm.hidden=true;
  login.reset();login.hidden=true;
  if($('authPassword'))$('authPassword').value='';
  $('authTitle').textContent='Ingreso de prueba';
  $('authQaLogin276').hidden=false;
  help.hidden=false;recover.hidden=false;change.hidden=false;
  const status=$('authStatus');
  status.textContent='Sesión ficticia cerrada. Puedes cambiar una contraseña simulada o volver al laboratorio.';
  status.dataset.kind='success';
  gate.hidden=false;gate.style.display='flex';
  root.document.body.classList.add('auth-locked');
 }
 async function logout(){
  if(moving||loggedOut)return false;
  moving=true;
  root.document.body.classList.add('auth-locked');
  try{
   root.dispatchEvent(new CustomEvent('reportes-hys-access-changing'));
   root.Hys251Notifications?.stop?.();
   root.__REPORTES_HYS_ACCESS__=null;
   await root.Hys242?.onAccess?.(null);
   root.HysAppearance242?.syncAccess?.(null);
   root.reportesHysSetMode?.('');
   const frame=$('otherAprApp');if(frame)frame.src='about:blank';
   root.reportesHysAdminSync?.();
   root.dispatchEvent(new CustomEvent('reportes-hys-access-changed'));
  }catch(error){
   console.warn('No se pudo completar el cierre visual del laboratorio:',error?.message||error);
   root.__REPORTES_HYS_ACCESS__=null;
   const frame=$('otherAprApp');if(frame)frame.src='about:blank';
  }finally{
   showLogin();
   moving=false;
  }
  return true;
 }
 async function enterLab(){
  if(moving||!loggedOut)return false;
  moving=true;enter.disabled=true;
  try{
   const entered=await root.reportesHysChooseModule?.('');
   if(entered!==true||!root.__REPORTES_HYS_ACCESS__?.userId)throw Error('El laboratorio ficticio no está disponible');
   loggedOut=false;
   gate.hidden=true;gate.style.display='none';
   root.document.body.classList.remove('auth-locked');
   enter.hidden=true;help.hidden=true;
   $('authStatus').textContent='';
   return true;
  }catch(error){
   $('authStatus').textContent='No fue posible regresar al laboratorio ficticio. Actualiza la página para restablecer la vista de prueba.';
   return false;
  }finally{moving=false;enter.disabled=false}
 }
 chooserLogout.onclick=()=>logout();
 headerLogout.onclick=()=>logout();
 root.reportesHysLogout=logout;
 enter.addEventListener('click',enterLab);
 recover.addEventListener('click',()=>{
  if(!loggedOut)return;
  $('authStatus').dataset.kind='warning';
  $('authStatus').textContent='Los correos de recuperación no se envían desde la demostración. Utiliza «Cambiar contraseña» para probar el formulario.';
 });
 // Enlace de acceso directo al formulario QA, sin autenticar con cuentas reales.
 if(params.get('ingreso-demo')==='1'){
  logout().then(done=>{if(done)root.Hys275Password?.openDemo?.()});
 }
 root.Hys276QaSession=Object.freeze({logout,enterLab,isLoggedOut:()=>loggedOut});
})(window);
