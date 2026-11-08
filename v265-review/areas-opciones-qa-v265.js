/* V265 — Áreas y opciones: conservar ventana ORIGINAL de v264 en la aplicación completa.
 * En ?qa=1 solamente, conectar esa misma interfaz a datos de laboratorio.
 * No reemplaza la interfaz, no cambia la gestión real y no escribe en Supabase.
 */
(function(root){
'use strict';
if(root.HYS265_PREVIEW_ONLY!==true)return;
const lab=root.Hys263Lab, $=id=>document.getElementById(id);
if(!lab||!$('manageOpen242')||!$('management242'))return;
const M=['APR','OTROS'];
const names={APR:'Prevencionistas',OTROS:'Supervisores, capataces y otros'};
const panel=$('management242'),open=$('manageOpen242'),rows=$('manageRows242'),note=$('manageMessage242');
const form=$('manageForm242'),module=$('manageModule242'),input=$('manageName242'),fields=$('catalogField242');
const fieldLabels={shift:'Turno',project:'Proyecto',Resultado:'Resultado',Prioridad:'Prioridad',Estado:'Estado',owner:'Responsables',otherCategory:'Tipo de actividad',otherStatus:'Estado alternativo'};
let section='areas';
const action=(label,fn)=>{
 const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=label;b.onclick=fn;return b;
};
const line=(msg,error=false)=>{note.textContent=msg;note.style.color=error?'#b42338':''};
function write(op){try{op();render()}catch(e){line('No se guardó: '+e.message,true)}}
function available(){return lab.get()}
function render(){
 if(panel.hidden)return;
 const m=module.value||'APR',db=available();
 $('managementTitle242').textContent='Áreas y opciones';
 $('manageLists242').hidden=false;
 form.hidden=section==='audit';
 $('catalogFieldLabel242').hidden=section!=='lists';
 $('auditMore242').hidden=true;
 rows.replaceChildren();
 for(const [button,mode]of [['manageAreas242','areas'],['manageLists242','lists'],['manageAudit242','audit']]){
  const b=$(button);b.setAttribute('aria-pressed',String(section===mode));
  b.classList.toggle('primary',section===mode);
 }
 const selected=section==='areas'?db.areas.filter(x=>x.modulo===m):
  section==='lists'?db.lists.filter(x=>x.modulo===m&&x.campo===fields.value):
  db.history.filter(x=>/área|opción/i.test(x.accion||'')).filter(x=>x.usuario===m||db.areas.some(a=>a.id===x.usuario&&a.modulo===m)||db.lists.some(a=>a.id===x.usuario&&a.modulo===m)).slice(0,50);
 selected.sort((a,b)=>section==='audit'?String(b.fecha).localeCompare(String(a.fecha)):String(a.nombre||a.valor).localeCompare(String(b.nombre||b.valor),'es'));
 for(const item of selected){
  const div=document.createElement('article');div.className='manage-row';
  const h=document.createElement('strong');
  h.textContent=section==='audit'?new Date(item.fecha).toLocaleString('es-CL')+' · '+(item.accion||'Cambio'):
   (item.nombre||item.valor)+' · '+(item.activa?'Activa':'Inactiva');
  div.append(h);
  if(section==='audit'){
   const d=document.createElement('p');d.textContent='Responsable: '+item.actor+' · Motivo: '+item.motivo;div.append(d);
  }else{
   div.append(
    action('Editar nombre',()=>{
     const value=prompt('Nuevo nombre',item.nombre||item.valor);
     if(value?.trim())write(()=>section==='areas'?lab.updateArea(item.id,value,item.activa):lab.updateOption(item.id,value,item.activa));
    }),
    action(item.activa?'Desactivar':'Reactivar',()=>write(()=>section==='areas'?lab.updateArea(item.id,item.nombre,!item.activa):lab.updateOption(item.id,item.valor,!item.activa)))
   );
  }
  rows.append(div);
 }
 if(!selected.length){const p=document.createElement('p');p.textContent=section==='audit'?'Sin acciones registradas en el laboratorio.':'No hay valores de prueba para esta selección.';rows.append(p)}
 const suffix=section==='areas'?'áreas':section==='lists'?'opciones':'registros';
 line('Vista anterior conservada · '+selected.length+' '+suffix+' · Laboratorio ficticio: sin cambios en producción.');
}
function openOriginal(){
 if(!root.__REPORTES_HYS_ACCESS__||root.__REPORTES_HYS_ACCESS__.profile?.rol!=='administrador_global')return;
 section='areas';panel.hidden=false;
 module.replaceChildren(...M.map(m=>new Option(names[m],m)));
 form.reset();fields.value='shift';render();
}
open.onclick=openOriginal;
$('manageClose242').onclick=()=>{panel.hidden=true};
module.onchange=render;
fields.onchange=render;
$('manageAreas242').onclick=()=>{section='areas';render()};
$('manageLists242').onclick=()=>{section='lists';render()};
$('manageAudit242').onclick=()=>{section='audit';render()};
$('auditMore242').onclick=()=>render();
form.onsubmit=e=>{
 e.preventDefault();
 const name=input.value.trim().replace(/\s+/g,' ');
 if(!name)return line('Ingresa un nombre.',true);
 write(()=>section==='areas'?lab.newArea(module.value,name):section==='lists'?lab.createOption(module.value,fields.value,name):null);
 input.value='';
};
root.addEventListener('hys263-lab-changed',()=>{if(!panel.hidden)render()});
root.Hys265AreasQA={open:openOriginal,render};
})(window);
