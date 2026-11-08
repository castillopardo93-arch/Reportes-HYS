/* Reportes HYS v274 — Credenciales de primera entrega.
 * Solo trabaja con datos temporales en memoria; no persiste ni envía secretos.
 * Las cuentas reales deben ser creadas por el servicio autorizado de servidor.
 */
(function(root){
 'use strict';
 const groups=['ABCDEFGHJKLMNPQRSTUVWXYZ','abcdefghijkmnopqrstuvwxyz','23456789','!@#$%&*?'];
 const alphabet=groups.join('');
 function secureIndex(max){
  if(!root.crypto||typeof root.crypto.getRandomValues!=='function')throw Error('El navegador no ofrece generación criptográfica segura de contraseñas.');
  if(!Number.isSafeInteger(max)||max<1||max>4294967296)throw Error('Longitud de alfabeto inválida');
  const limit=Math.floor(4294967296/max)*max;
  const bits=new Uint32Array(1);
  let n;
  do{root.crypto.getRandomValues(bits);n=bits[0]}while(n>=limit);
  return n%max;
 }
 function generate(length=20){
  if(!Number.isInteger(length)||length<16||length>64)throw Error('La contraseña automática debe tener entre 16 y 64 caracteres.');
  const chars=groups.map(g=>g[secureIndex(g.length)]);
  while(chars.length<length)chars.push(alphabet[secureIndex(alphabet.length)]);
  for(let i=chars.length-1;i>0;i--){const j=secureIndex(i+1);[chars[i],chars[j]]=[chars[j],chars[i]]}
  return chars.join('');
 }
 function validate(method,secret,confirmation){
  if(method==='invitacion')return {ok:true,error:''};
  if(!['automatica','manual'].includes(method))return {ok:false,error:'Selecciona un método de creación válido.'};
  const value=String(secret||'');
  if(value.length<12||value.length>128)return {ok:false,error:'La contraseña debe tener entre 12 y 128 caracteres.'};
  if(/\s/.test(value))return {ok:false,error:'La contraseña no puede contener espacios.'};
  if(!/[A-Z]/.test(value)||!/[a-z]/.test(value)||!/[0-9]/.test(value)||!/[^A-Za-z0-9\s]/.test(value))
   return {ok:false,error:'Incluye mayúsculas, minúsculas, números y símbolos.'};
  if(method==='manual'&&value!==String(confirmation||''))return {ok:false,error:'Las dos contraseñas manuales deben coincidir.'};
  return {ok:true,error:''};
 }
 function deliveryText(email,secret,isQa){
  const header=isQa?'SIMULACIÓN - Esta contraseña no permite ingresar a Reportes HYS.\n\n':'';
  return header+'Acceso a Reportes HYS\nUsuario: '+String(email||'')+'\nContraseña temporal: '+String(secret||'')+'\nCambia esta contraseña en tu primer ingreso. No compartas este mensaje con otras personas.';
 }
 root.Hys274Credentials=Object.freeze({generate,validate,deliveryText});
})(window);
