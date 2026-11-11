/* HYS v243 REVIEW-ONLY runtime. No Supabase SDK, no API calls, no production data.
 * This file is copied exclusively into an isolated public static preview.
 */
(function(root){
 'use strict';
 const embedded=new URLSearchParams(location.search).get('embedded')==='otros';
 const mode=embedded?'OTROS':'APR';
 const localMessage='DEMOSTRACIÓN: los cambios solo se guardan en este navegador. No se sincronizan ni se envían a servidores.';
 let session=1;
 root.Hys242={
  canWrite(){return true}, // Solo en ESTA demo desconectada; nunca en el original.
  reportId(){return 'demo-'+mode.toLowerCase()},
  sessionKey(){return session},
  onSave(){return Promise.resolve(true)},
  onArchive(){return Promise.resolve({preview:true})},
  onAccess(){session++},
  enforceOwner(){},
  preserveBeforeRefresh(){return Promise.resolve()},
  flush(){return Promise.resolve()},
  mountManagementRail(){},
  syncManagementRail(){},
  refreshCatalog(){return Promise.resolve()},
  async finalizeReport(){root.alert?.('Finalización real deshabilitada en la demostración. Los datos quedan solamente en este navegador.');return false},
  async startNew(){
   if(root.confirm?.('¿Crear un nuevo borrador de prueba? El borrador actual no se enviará a ningún servidor.')===false)return false;
   const blank=root.Hys242Bridge?.blank?.();
   if(blank)root.Hys242Bridge.applyPack({...blank,module:mode});
   return true;
  },
  async fetchReport(){throw Error('Los reportes reales no están disponibles en la demostración.')},
  async loadReport(){throw Error('La demostración no consulta reportes de producción.')},
  hasPending:false
 };
 root.HYS242_ENABLE_CENTRAL=false;
 root.HYS242_DEPLOYMENT_READY=false;
 root.HYS243_ACTIONS_ENABLED=false;
 root.HYS243_ACTIONS_ISOLATED=false;
 root.HYS243_TASKS_ENABLED=false;
 root.HYS243_TASKS_ISOLATED=false;
 root.HYS243_REASSIGNMENT_ENABLED=false;
 root.HYS243_REASSIGNMENT_ISOLATED=false;
 root.HYS243_AUDIT_ENABLED=false;
 root.HYS243_AUDIT_ISOLATED=false;
 root.HYS243_REVIEW_STATUS=localMessage;
})(typeof window==='undefined'?globalThis:window);
