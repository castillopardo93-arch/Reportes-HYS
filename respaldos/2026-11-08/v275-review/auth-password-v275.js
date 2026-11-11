/* Reportes HYS v275 — Cambio de contraseña desde el ingreso.
 * Se verifica la contraseña actual y se utiliza un cliente Auth temporal sin persistencia.
 * No se modifica la sesión habitual de la aplicación ni se envía correo en este flujo.
 */
(function(root){
 'use strict';
 const $=id=>root.document.getElementById(id);
 const form=$('authChangeForm'),start=$('authChangeStart'),back=$('authChangeCancel');
 const login=$('authLoginForm'),recover=$('authRecover'),status=$('authStatus'),title=$('authTitle');
 if(!form||!start||!back||!login||!recover||!status||!title)return;
 const params=new URLSearchParams(root.location.search);
 const isQa=root.HYS265_PREVIEW_ONLY===true&&root.location.hostname==='raw.githack.com'&&params.get('qa')==='1'
  &&/\/v275-review\/index\.html$/.test(root.location.pathname);
 const disabled=params.get('embedded')==='otros'||params.get('recuperar')==='1';
 if(disabled){start.hidden=true;form.hidden=true;return}
 const current=$('authChangeCurrent'),next=$('authChangeNew'),repeat=$('authChangeRepeat');
 const email=$('authChangeEmail'),submit=$('authChangeSubmit'),visibility=$('authChangeShow');
 let busy=false,active=false;
 function validatePassword(value){
  const pass=String(value||'');
  if(pass.length<12||pass.length>128)return 'La nueva contraseña debe tener entre 12 y 128 caracteres.';
  if(/\s/.test(pass))return 'La contraseña no puede contener espacios.';
  if(!/[A-Z]/.test(pass)||!/[a-z]/.test(pass)||!/[0-9]/.test(pass)||!/[^A-Za-z0-9\s]/.test(pass))
   return 'La nueva contraseña debe incluir mayúsculas, minúsculas, números y símbolos.';
  return '';
 }
 function showStatus(message,success=false){
  status.textContent=message;
  status.dataset.kind=success?'success':'warning';
 }
 function open(){
  if(busy)return;
  active=true;login.hidden=true;recover.hidden=true;start.hidden=true;form.hidden=false;
  title.textContent='Cambiar contraseña';
  email.value=$('authEmail')?.value?.trim()||'';
  showStatus(isQa?'DEMOSTRACIÓN: no se modificará ninguna contraseña real.':'Confirma tu contraseña actual y escribe una nueva. No necesitas un correo de recuperación.');
  if(root.document.activeElement===start||!email.value)email.focus();else current.focus();
 }
 function close(success=false){
  if(busy)return;
  const changedEmail=email.value.trim();
  active=false;form.reset();current.type='password';next.type='password';repeat.type='password';visibility.checked=false;
  form.hidden=true;login.hidden=false;recover.hidden=false;start.hidden=false;
  title.textContent='Ingresar a Reportes HYS';
  if(success){$('authEmail').value=changedEmail;showStatus('Contraseña actualizada. Ingresa con tu contraseña nueva.',true)}
  else showStatus('');
  $('authPassword').value='';
  if(success)$('authPassword').focus();else start.focus();
 }
 function errorText(error){
  const code=String(error?.code||'');
  if(error?.status===429||/rate_limit|over_request/i.test(code))return 'Demasiados intentos. Inténtalo más tarde.';
  if(code==='reauthentication_needed'||code==='reauthentication_required')return 'La configuración de seguridad requiere una verificación adicional. Usa ¿Olvidaste tu contraseña? o consulta al administrador.';
  if(code==='weak_password')return 'Supabase rechazó la contraseña por su política de seguridad. Utiliza una más robusta.';
  if(code==='same_password')return 'La nueva contraseña debe ser diferente de la actual.';
  if(code==='current_password_required'||code==='current_password_mismatch'||code==='invalid_credentials')return 'No se pudo verificar la contraseña actual.';
  return 'No se pudo completar el cambio. Comprueba los datos, la conexión y los requisitos de seguridad.';
 }
 start.addEventListener('click',open);
 back.addEventListener('click',()=>close(false));
 visibility.addEventListener('change',()=>{
  const type=visibility.checked?'text':'password';
  current.type=type;next.type=type;repeat.type=type;
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy||!active)return;
  const address=email.value.trim().toLowerCase(),oldPass=current.value,newPass=next.value,confirmation=repeat.value;
  if(!email.checkValidity()||!address){showStatus('Indica un correo de ingreso válido.');email.focus();return}
  if(!oldPass){showStatus('Ingresa la contraseña actual.');current.focus();return}
  const invalid=validatePassword(newPass);
  if(invalid){showStatus(invalid);next.focus();return}
  if(newPass!==confirmation){showStatus('Las contraseñas nuevas no coinciden.');repeat.focus();return}
  if(oldPass===newPass){showStatus('La contraseña nueva debe ser diferente de la actual.');next.focus();return}
  if(isQa){
   // Validación de UI ficticia; no efectuar conexiones ni guardar credenciales.
   form.reset();showStatus('Prueba completada: los campos y validaciones funcionan. No se cambió ninguna contraseña real.',true);
   return;
  }
  const main=root.reportesHysSupabase;
  if(!main?.supabaseUrl||!main?.supabaseKey||!root.supabase?.createClient){
   showStatus('Servicio de autenticación no disponible. Recarga la página.');return;
  }
  busy=true;submit.disabled=true;back.disabled=true;start.disabled=true;
  showStatus('Verificando identidad y actualizando contraseña…');
  let temporary=null,authenticated=false,updated=false;
  try{
   temporary=root.supabase.createClient(main.supabaseUrl,main.supabaseKey,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'sb-hys-v275-pass-change'}
   });
   const signed=await temporary.auth.signInWithPassword({email:address,password:oldPass});
   if(signed.error||!signed.data?.session?.user)throw signed.error||Error('No se pudo verificar la identidad');
   authenticated=true;
   if(signed.data.session.user.email?.toLowerCase()!==address)throw Error('La cuenta de correo no coincide');
   // Un login reciente evita depender de reautenticación por email en el flujo habitual.
   // current_password también protege cuando el servidor exige la contraseña anterior.
   const result=await temporary.auth.updateUser({password:newPass,current_password:oldPass});
   if(result.error)throw result.error;
   updated=true;
  }catch(error){showStatus(errorText(error))}
  finally{
   if(authenticated&&temporary){
    try{await temporary.auth.signOut({scope:'local'})}catch{/* Se descarta la sesión temporal sin persistencia. */}
   }
   busy=false;submit.disabled=false;back.disabled=false;start.disabled=false;
   if(updated)close(true);
   // Los secretos solo existieron en los campos mientras la operación estaba activa.
   else{current.value='';next.value='';repeat.value='';current.focus()}
  }
 });
 root.Hys275Password=Object.freeze({validatePassword,isQa,openDemo:()=>{
  if(!isQa||params.get('ingreso-demo')!=='1')return false;
  const gate=$('authGate');
  if(!gate)return false;
  gate.hidden=false;gate.style.display='flex';root.document.body.classList.add('auth-locked');
  login.hidden=false;open();return true;
 }});
})(window);
