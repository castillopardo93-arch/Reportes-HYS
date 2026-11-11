/* Reportes HYS v266 · Punto 3 auditoría.
 * Diagnóstico exclusivamente local. No genera mensajes, invitaciones ni escrituras remotas.
 * Vista dentro de "Seguimiento" del Administrador general; sin nuevo botón en la cinta.
 */
(function(root){
'use strict';
const QA=()=>root.HYS266_PREVIEW_ONLY===true&&/\/(?:v266-review|v267-review|v269-review|v270-review|v271-review|v272-review|v273-review|v274-review|v275-review|v276-review)\/index\.html$/.test(root.location.pathname);
const byId=id=>root.document.getElementById(id);
const el=(tag,txt,cls)=>{const node=root.document.createElement(tag);if(txt!==undefined&&txt!==null)node.textContent=String(txt);if(cls)node.className=cls;return node};
const uuid1='11111111-1111-4111-8111-111111111111',uuid2='22222222-2222-4222-8222-222222222222';
const makeFinding=()=>({
 module:'APR',reportId:'LAB266-notificaciones',
 data:{findings:[['Condición de prueba','Alta','Revisar señalización de prueba','Responsable','Pendiente','',
 {findingId:uuid1,dueDate:'2026-11-14',assignees:[{user_id:uuid2,modulo:'APR',nombre:'Personal ficticio'}]}]]}
});
function checkNotification(){
 const engine=root.Hys251Notifications;
 if(!engine||typeof engine.tasks!=='function')return {ok:false,detail:'El motor F02–F07 no se cargó'};
 const result=engine.tasks(makeFinding(),'APR');
 if(!Array.isArray(result)||result.length!==1||result[0].recipientId!==uuid2)return {ok:false,detail:'La tarea ficticia no se generó correctamente'};
 return {ok:true,detail:'1 tarea F02–F07 creada en memoria. No representa envío ni lectura de correo.'};
}
function checkAccount(){
 const model=root.Hys265WorkerModel;
 const central=root.HYS242_ENABLE_CENTRAL===true||root.HYS257_ENABLE_USER_MANAGEMENT===true;
 const valid=!!model&&model.roles.includes('administrador_area')&&model.roles.includes('supervisor');
 return {ok:valid&&!central,detail:!valid?'Faltan validadores de ficha/roles':central?'Alerta: se detectó una bandera de escritura central activada':'Ficha y roles disponibles para prueba; invitaciones y cuentas reales siguen bloqueadas.'};
}
function checkPDF(){
 const Pdf=root.jspdf?.jsPDF;
 if(typeof Pdf!=='function')return {ok:false,detail:'La biblioteca de PDF no está cargada. Comprueba la conexión del recurso.'};
 try{
  const pdf=new Pdf({format:'a4',unit:'mm'});
  pdf.setFontSize(11);pdf.text('HYS v266 - Prueba local de PDF - NO ES INFORME',20,24);
  pdf.addPage();pdf.text('Segunda pagina de prueba',20,24);
  const bytes=pdf.output('arraybuffer');
  const pages=pdf.getNumberOfPages();
  const signature=Array.from(new Uint8Array(bytes).slice(0,5),x=>String.fromCharCode(x)).join('');
  const ok=pages===2&&signature==='%PDF-'&&bytes.byteLength>300;
  return {ok,detail:ok?'PDF de prueba de 2 páginas generado en memoria ('+bytes.byteLength+' bytes). No se guardó un informe.':'El documento temporal no superó la comprobación de firma/páginas.'};
 }catch(e){return {ok:false,detail:'Error de PDF local: '+String(e.message||e)}}
}
function checkPhoto(){
 const onePixel='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/iz8AAAAASUVORK5CYII=';
 const bytes=typeof root.atob==='function'?root.atob(onePixel):'';
 return {ok:bytes.startsWith('\x89PNG')&&bytes.length>40,detail:'Muestra PNG pequeña: '+bytes.length+' bytes. No certifica fotografías tomadas ni PDF de informes.'};
}
function checkStorage(){
 const st=root.HysStorage242;
 if(!st?.sharedLabStorage)return {ok:false,detail:'No se inicializó el almacenamiento de laboratorio'};
 const match=st.namespace==='hys-v266-laboratorio';
 return {ok:match,detail:match?'Espacio de laboratorio v266 independiente; los borradores previos no se importan automáticamente.':'La versión del almacenamiento no coincide con v266'};
}
function previewChecks(){
 const findings=[
  {name:'Seguridad del acceso de prueba',...checkAccount()},
  {name:'Motor de notificaciones F02–F07',...checkNotification()},
  {name:'Generación PDF temporal',...checkPDF()},
  {name:'Formato fotográfico temporal',...checkPhoto()},
  {name:'Aislamiento de almacenamiento v266',...checkStorage()}
 ];
 return findings;
}
function backupEntries(uid,module){
 // Se inspeccionan solamente claves del USUARIO y MÓDULO seleccionado; no explorar cuentas ajenas.
 const allowed=new Set(['APR','OTROS']);
 if(!uid||!allowed.has(module))return [];
 const raw=root.HysStorage242?.legacyVersionedSnapshot?.()||{};
 const beginning=['hys-v263-laboratorio::','hys-v265-laboratorio::'];
 const prefix=uid+'::'+module+'::';
 const results=[];
 for(const [key,value]of Object.entries(raw)){
  const source=beginning.find(x=>key.startsWith(x));
  if(!source||!key.slice(source.length).startsWith(prefix))continue;
  // Excluir credenciales y otros datos que no sean claramente borradores.
  const name=key.slice(source.length+prefix.length);
  if(/auth|session|password|token|clave/i.test(name))continue;
  if(!/reportes-hys|draft|borrador|queue-fallback/i.test(name))continue;
  if(typeof value!=='string'||value.length>10_000_000)continue;
  results.push({key,bytes:value.length,data:value});
 }
 return results.slice(0,75);
}
function exportBackup(uid,module){
 const items=backupEntries(uid,module);
 if(!items.length)return {ok:false,detail:'No hay claves de borradores heredados para la cuenta y tarjeta seleccionadas.'};
 const backup={format:'Reportes-HYS-backup-local-v266',date:new Date().toISOString(),usuario:uid,modulo:module,
  origin:'solo lectura: versiones anteriores del mismo navegador',entries:items};
 const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
 const href=root.URL.createObjectURL(blob),a=el('a');
 a.href=href;a.download='HYS_Respaldo_Local_'+module+'_v266.json';a.style.display='none';
 root.document.body.append(a);a.click();a.remove();
 root.setTimeout(()=>root.URL.revokeObjectURL(href),4000);
 return {ok:true,detail:'Respaldo descargado con '+items.length+' entradas. No se eliminaron ni restauraron datos.'};
}
function mount(){
 if(!QA()||!root.document||root.__REPORTES_HYS_OTROS_EMBEDDED__===true)return;
 const panel=byId('operations242'),head=panel?.querySelector('.management-head'),host=byId('operationsContent242');
 if(!head||!host||byId('hys266VerificationButton'))return;
 const start=el('button','Verificación técnica','btn');
 start.id='hys266VerificationButton';start.type='button';start.style.cssText='margin-left:auto';
 head.insertBefore(start,byId('operationsClose242'));
 const status=byId('operationsStatus242');
 function show(){
  const user=root.__REPORTES_HYS_ACCESS__;
  if(user?.profile?.activo!==true||user?.profile?.rol!=='administrador_global')return;
  panel.hidden=false;
  byId('operationsTitle242').textContent='Verificación técnica · v266';
  host.replaceChildren();
  const intro=el('div',null,'hys266-check-intro');
  intro.append(el('h2','Punto 3 · Auditoría integral'),el('p','Pruebas de desarrollo, sin cuentas reales, correos, modificaciones de informes ni escrituras en Supabase.'));
  const checks=previewChecks();
  const table=el('div',null,'hys266-check-results');
  for(const x of checks){
   const card=el('article',null,'hys266-check-row');
   card.append(el('strong',(x.ok?'✓ ':'! ')+x.name),el('p',x.detail));
   card.dataset.state=x.ok?'ok':'pending';table.append(card);
  }
  const security=el('section',null,'hys266-check-row');
  security.append(el('h3','Seguridad Supabase · revisión de solo lectura'),
   el('p','La revisión identificó permisos de funciones SECURITY DEFINER que requieren una decisión controlada. Esta vista no revoca permisos ni despliega Edge Functions.'),
   el('p','Cuentas e invitaciones reales: integración pendiente de una transacción segura y pruebas negativas con usuarios de ensayo.'),
   el('p','Notificaciones: avisos preparados no equivalen a correos enviados o recibidos.'));
  const backup=el('section',null,'hys266-check-row');
  backup.append(el('h3','Respaldo heredado · sin restauración automática'),
   el('p','Permite descargar claves locales de borradores pertenecientes a la cuenta ficticia y tarjeta seleccionada. No importa ni borra datos de versiones anteriores. El archivo puede contener información sensible.'));
  const select=el('select');select.id='hys266BackupModule';
  select.append(new Option('Prevencionistas','APR'),new Option('Supervisores, capataces y otros','OTROS'));
  const action=el('button','Descargar respaldo local','btn');action.type='button';
  const info=el('p');info.setAttribute('role','status');
  action.onclick=()=>{
   const a=root.__REPORTES_HYS_ACCESS__;
   if(a?.profile?.rol!=='administrador_global'){info.textContent='Operación no autorizada';return}
   if(!root.confirm('¿Descargar un respaldo que puede contener datos personales? Guárdalo de forma segura. NO se importarán ni eliminarán informes.'))return;
   const outcome=exportBackup(a.userId,select.value);info.textContent=outcome.detail;
  };
  const note=el('p','Modo sin conexión, envío real de correos, edición de cuentas y migración de producción: pendientes de aprobación y pruebas de servidor.');
  backup.append(select,action,info);
  intro.append(table,security,backup,note);
  host.append(intro);
  status.textContent='Diagnóstico local: '+checks.filter(x=>x.ok).length+' de '+checks.length+' controles básicos correctos; pendientes de integración real por separado.';
 }
 start.onclick=show;
 // Revalidar cuando cambie la identidad; no dejar abierto el diagnóstico de otro usuario.
 root.addEventListener('reportes-hys-access-changing',()=>{
  if(byId('operationsTitle242')?.textContent?.includes('Verificación técnica')){
   panel.hidden=true;host.replaceChildren();
  }
 });
 root.Hys266Verification={run:previewChecks,show,backupEntries};
}
if(root.document?.readyState==='loading')root.document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
root.Hys266VerificationCore={makeFinding,checkNotification,checkAccount,checkPDF,checkPhoto,checkStorage,backupEntries};
})(window);
