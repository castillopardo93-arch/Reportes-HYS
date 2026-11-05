/* C06 — panel plegable del hallazgo: Seguimiento / Notificaciones / Historial y cierre.
 * Solo lectura: no crea actividades, notificaciones, cierres ni auditoría ficticios.
 * No hay conexión remota, mutación del informe o uso de credenciales.
 */
(function(root){
'use strict';
const TABS=['followup','notifications','history'];
const NAMES={followup:'Seguimiento',notifications:'Notificaciones',history:'Historial / cierre'};
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const printable=v=>String(v??'').trim()||'Sin información registrada';
const summaryText=v=>'<span class="hys243-detail-value">'+esc(printable(v))+'</span>';
function detailRow(record,index,colspan=7){
 const i=Number(index),span=Number(colspan);
 if(!Array.isArray(record)||!Number.isInteger(i)||i<0||!Number.isInteger(span)||span<1||span>20)return '';
 const id='hys243-hallazgo-'+i;
 const due=root.Hys243Commitment?.displayDate(record?.[6]?.dueDate)||'';
 const status=printable(record[4]);
 const measures=printable(record[2]);
 const responsible=printable(record[3]);
 const followup=
  '<div class="hys243-detail-fields">'+
   '<p><strong>Condición detectada</strong> '+summaryText(record[0])+'</p>'+
   '<p><strong>Medida propuesta</strong> '+summaryText(measures)+'</p>'+
   '<p><strong>Responsable registrado</strong> '+summaryText(responsible)+'</p>'+
   '<p><strong>Estado actual</strong> '+summaryText(status)+'</p>'+
   '<p><strong>Fecha compromiso</strong> '+summaryText(due||'No definida')+'</p>'+
  '</div>'+
  '<p class="hys243-detail-pending">El registro de avances, acciones individuales y evidencias de corrección se incorporará en C07–C09. Esta vista no constituye una verificación de cumplimiento.</p>';
 const notifications='<p class="hys243-detail-empty">Aún no hay un historial de notificaciones por hallazgo.</p>'+
  '<p class="hys243-detail-pending">La bandeja, los avisos internos y el correo con seguimiento se desarrollarán en F01–F07. No se ha enviado ni confirmado ningún aviso desde este panel.</p>';
 const history='<p><strong>Estado registrado</strong> '+summaryText(status)+'</p>'+
  '<p class="hys243-detail-empty">Todavía no existe un historial individual de cierre y reapertura para este hallazgo.</p>'+
  '<p class="hys243-detail-pending">Un estado «Completado» no demuestra por sí solo que el hallazgo esté cerrado y verificado. La corrección, cierre y auditoría se incorporarán en C07–C09.</p>';
 const panels={followup,notifications,history};
 const tabs=TABS.map((key,j)=>
  '<button type="button" role="tab" id="'+id+'-tab-'+key+'" data-hys243-tab="'+key+
  '" aria-controls="'+id+'-panel-'+key+'" aria-selected="'+(j===0?'true':'false')+
  '" tabindex="'+(j===0?'0':'-1')+'">'+NAMES[key]+'</button>').join('');
 const content=TABS.map((key,j)=>
  '<section role="tabpanel" id="'+id+'-panel-'+key+'" aria-labelledby="'+id+'-tab-'+key+
  '" data-hys243-panel="'+key+'"'+(j?' hidden':'')+'>'+panels[key]+'</section>').join('');
 return '<tr class="hys243-finding-detail-row"><td colspan="'+span+
  '"><details class="hys243-finding-details" data-hys243-finding="'+i+
  '"><summary>Ver detalle y seguimiento del hallazgo</summary>'+
  '<div class="hys243-detail-content"><div class="hys243-detail-tabs" role="tablist" aria-label="Detalle del hallazgo '+(i+1)+'">'+
  tabs+'</div>'+content+'</div></details></td></tr>';
}
function activateTab(tab,focus=false){
 if(!tab||!TABS.includes(tab.dataset?.hys243Tab))return false;
 const group=tab.closest?.('.hys243-finding-details');
 if(!group)return false;
 const target=tab.dataset.hys243Tab;
 const buttons=[...group.querySelectorAll('[data-hys243-tab]')];
 const panels=[...group.querySelectorAll('[data-hys243-panel]')];
 if(!buttons.includes(tab))return false;
 for(const button of buttons){
  const selected=button.dataset.hys243Tab===target;
  button.setAttribute('aria-selected',selected?'true':'false');
  button.tabIndex=selected?0:-1;
 }
 for(const panel of panels)panel.hidden=panel.dataset.hys243Panel!==target;
 if(focus)tab.focus();
 return true;
}
function onClick(event){
 const tab=event.target?.closest?.('[data-hys243-tab]');
 if(tab)activateTab(tab);
}
function onKeydown(event){
 const current=event.target?.closest?.('[data-hys243-tab]');
 if(!current||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
 const group=current.closest?.('.hys243-finding-details');
 if(!group)return;
 const buttons=[...group.querySelectorAll('[data-hys243-tab]')];
 const index=buttons.indexOf(current);
 if(index<0||!buttons.length)return;
 let next;
 if(event.key==='Home')next=0;
 else if(event.key==='End')next=buttons.length-1;
 else next=(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
 event.preventDefault();activateTab(buttons[next],true);
}
if(root.document){
 root.document.addEventListener('click',onClick);
 root.document.addEventListener('keydown',onKeydown);
}
const api={detailRow,activateTab,onClick,onKeydown,tabs:TABS.slice()};
root.Hys243FindingDetail=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
