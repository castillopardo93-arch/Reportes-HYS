/* HYS v298 — conexión real de SOLO LECTURA.
 * Autenticación y permisos son definidos por Supabase Auth y las RPC v242;
 * las comprobaciones cliente solo mejoran UX, no sustituyen RLS.
 * Nunca llama RPC de escritura, no habilita ninguna bandera de producción.
 */
(function(root){
 'use strict';
 const MODULES=Object.freeze(['APR','OTROS']);
 function permitted(access,module,flags,client,nav){
  if(flags?.HYS298_ENABLE_REMOTE_READS!==true||nav?.onLine===false||
     !MODULES.includes(module)||typeof client?.rpc!=='function'||!access?.userId||
     !access.profile||access.profile.activo!==true||
     access.profile.usuario_id!==access.userId||
     access.selectedModule!==module||
     !Array.isArray(access.modules)||!access.modules.includes(module))
    return false;
  return Array.isArray(access.permissions)&&
   access.permissions.some(p=>p.modulo===module&&p.puede_ver===true);
 }
 function canReadRemote(nav=root.navigator,flags=root){
  return permitted(root.__REPORTES_HYS_ACCESS__,root.__REPORTES_HYS_ACCESS__?.selectedModule,
    flags,root.reportesHysSupabase,nav);
 }
 async function preflight({client,access,module,nav,flags,stillValid}={}){
  const still=typeof stillValid==='function'?stillValid:()=>true;
  const valid=()=>still()&&permitted(access,module,flags,client,nav);
  if(!valid())throw Error('Acceso de lectura no habilitado, fuera de línea o sin permisos para esta tarjeta.');
  if(typeof client?.auth?.getUser!=='function')throw Error('No hay servicio de identidad disponible.');
  const identity=await client.auth.getUser();
  if(!valid()||identity.error||identity.data?.user?.id!==access.userId)
   throw Error('No se pudo comprobar la identidad autenticada o la sesión cambió.');
  const context=await client.rpc('hys242_contexto');
  if(!valid()||context.error||context.data?.profile?.usuario_id!==access.userId||
     context.data.profile.activo!==true||
     !Array.isArray(context.data.permissions)||
     !context.data.permissions.some(p=>p.modulo===module&&p.puede_ver===true))
    throw Error('Supabase no confirmó el perfil y los permisos actuales.');
  const result=await client.rpc('hys242_consultar_informes',{p_modulo:module,p_pagina:0});
  if(!valid()||result.error||!Array.isArray(result.data))
    throw Error('No se pudo consultar el índice autorizado de informes.');
  return Object.freeze({verified:true,module,reportsOnFirstPage:result.data.length,
    authenticated:true,remoteWrites:false});
 }
 const api=Object.freeze({permitted,canReadRemote,preflight});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.Hys298ReadGate=api;
})(typeof window==='object'?window:globalThis);
