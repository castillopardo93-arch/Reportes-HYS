/* Entrada de integración local. El servidor de pruebas inserta este script. */
(function(root){
 'use strict';
 if(root.HYS316_ADVANCED_LOCAL!==true)return;
 const d=root.document;
 const id='hys322-sin-sesion';
 const profile={usuario_id:id,nombre:'Administrador de prueba local',rol:'administrador_global',activo:true};
 const embedded=root.__REPORTES_HYS_OTROS_EMBEDDED__===true;
 const access={userId:id,profile,modules:['APR','OTROS'],permissions:[],facultades:[],selectedModule:null,offline:false};
 const begin=()=>{
  root.__REPORTES_HYS_ACCESS__=access;
  d.body.classList.remove('auth-locked');
  const gate=d.getElementById('authGate');
  if(gate){gate.hidden=true;gate.style.display='none';}
  const banner=d.createElement('div');
  banner.id='hys316LocalNotice';
  banner.textContent='Prueba local · cuenta ficticia · Borradores de informe diario e investigación en este equipo';
  banner.style.cssText='position:relative;padding:12px 18px;background:#e7f0fa;color:#123954;font-weight:700;z-index:701';
  d.body.prepend(banner);
  for(const target of ['authUserLabel','authIdentityChooser']){
   const node=d.getElementById(target);
   if(node)node.textContent=profile.nombre;
  }
  root.addEventListener('hys317-local-actor',event=>{
   const name=event.detail?.name||'Cuenta ficticia';
   for(const target of ['authUserLabel','authIdentityChooser']){
    const node=d.getElementById(target);
    if(node)node.textContent=name+' · prueba local';
   }
  });
  function applyIdentity(account){
   access.userId=account?.actor||id;
   access.profile={...profile,usuario_id:access.userId,
    nombre:account?.nombre||profile.nombre,
    rol:account&&!account.write?'usuario':'administrador_global'};
  }
  function applyCatalog(){
   root.Hys242Bridge.setCatalog({areas:access.userId==='00000000-0000-4000-8000-000000000004'?['Mecánica']:['Eléctrica','Mecánica'],owners:[access.profile.nombre],shift:['Día/Propio','Noche/Propio']});
  }
  root.Hys322UseReportSession=async account=>{
   applyIdentity(account);
   const loading=root.Hys242.onAccess(access);
   root.Hys242Bridge.applyPack(root.Hys242Bridge.blank());
   await loading;
   if(access.selectedModule&&(embedded||access.selectedModule==='APR'))applyCatalog();
   root.dispatchEvent(new root.CustomEvent('reportes-hys-access-changed'));
  };
  root.reportesHysChooseModule=async module=>{
   if(module&&!access.modules.includes(module))return false;
   const account=JSON.parse(root.HYS322_SESSION_STORAGE.getItem('hys322-sesion-informes')||'null');
   applyIdentity(account);
   access.selectedModule=module||null;
   root.reportesHysSetMode(module?module.toLowerCase():'');
   d.getElementById('moduleChange').hidden=!module;
   await root.Hys242.onAccess(access);
   if(module&&access.selectedModule===module&&(embedded||module==='APR'))applyCatalog();
   root.dispatchEvent(new root.CustomEvent('reportes-hys-access-changed'));
   return true;
  };
  if(embedded){
   void root.reportesHysChooseModule('OTROS');
   return;
  }
  root.reportesHysSetMode('');
  const aprCard=d.getElementById('aprModuleCard');
  const aprButton=d.getElementById('openAprModule');
  if(aprCard){aprCard.hidden=false;aprCard.querySelector('h2').textContent='Prevencionistas';}
  if(aprButton){aprButton.hidden=false;aprButton.disabled=false;}
  const kicker=d.querySelector('.chooser-kicker');
  if(kicker)kicker.textContent='Reportes H y S · revisión local v333';
  const logout=d.getElementById('chooserLogout');
  if(logout)logout.hidden=true;
  const other=d.getElementById('openOtherModule');
  const otherCard=d.getElementById('otherModuleCard');
  if(otherCard){otherCard.hidden=false;otherCard.querySelector('h2').textContent='Supervisores/Capataces u otros';}
  if(other){other.hidden=false;other.disabled=false;}
  const status=d.getElementById('chooserStatus');
  if(status)status.textContent='Selecciona una tarjeta para probar el informe diario con datos ficticios.';
  root.dispatchEvent(new root.CustomEvent('reportes-hys-access-changed'));
 };
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',begin,{once:true});else begin();
})(window);
