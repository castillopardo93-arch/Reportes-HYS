/* C04 — asignación por identidad, sin consultas directas a tablas ni privilegios administrativos.
 * Bloqueado hasta enlazar un proveedor server-side de SOLO LECTURA en staging aislado.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean=(v,n=160)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const fold=v=>clean(v,300).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
const validModule=v=>v==='APR'||v==='OTROS';
function snapshot(entry,modulo){
 if(!entry||typeof entry!=='object'||Array.isArray(entry))return null;
 const user_id=clean(entry.user_id??entry.usuario_id??entry.id,40).toLowerCase();
 const nombre=clean(entry.nombre??entry.name,160);
 const target=clean(entry.modulo??modulo,10).toUpperCase();
 if(!UUID.test(user_id)||!nombre||!validModule(target))return null;
 return {user_id,nombre,modulo:target};
}
function snapshots(items,modulo){
 if(!Array.isArray(items))return [];
 const used=new Set(),result=[];
 for(const entry of items){
  const item=snapshot(entry,modulo);
  if(!item || (modulo&&item.modulo!==modulo)||used.has(item.user_id))continue;
  used.add(item.user_id);result.push(item);
  if(result.length>=30)break;
 }
 return result;
}
function normalizedDirectory(rows,modulo){
 if(!validModule(modulo)||!Array.isArray(rows))return [];
 const entries=[];
 for(const row of rows){
  const item=snapshot(row,modulo);
  const allowed=(row?.puede_ver===true||row?.can_view===true);
  const active=(row?.activo===true||row?.active===true);
  if(!item||item.modulo!==modulo||!allowed||!active)continue;
  entries.push(item);
 }
 const distinct=snapshots(entries,modulo);
 return distinct.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
}
function filterDirectory(rows,term,limit=50){
 const words=fold(term).split(' ').filter(Boolean);
 return rows.filter(x=>words.every(word=>fold(x.nombre+' '+x.user_id).includes(word))).slice(0,limit);
}
const sameIds=(a,b)=>a.map(x=>x.user_id).sort().join('|')===b.map(x=>x.user_id).sort().join('|');
const names=items=>snapshots(items).map(x=>x.nombre).join('; ');
function detailRow(record,colspan=7){
 const items=snapshots(record?.[6]?.assignees);
 if(!items.length)return '';
 const tr=root.document?.createElement?.('tr');
 if(tr){
  tr.className='hys243-assignee-detail';
  const td=root.document.createElement('td');
  td.colSpan=colspan;
  const strong=root.document.createElement('strong');
  strong.textContent='Responsables vinculados: ';
  td.append(strong);
  items.forEach((x,i)=>{const s=root.document.createElement('span');s.className='hys243-assignee-tag';s.textContent=x.nombre+(i<items.length-1?' · ':'');td.append(s);});
  tr.append(td);return tr.outerHTML;
 }
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return '<tr class="hys243-assignee-detail"><td colspan="'+Number(colspan)+'"><strong>Responsables vinculados:</strong> '+
 items.map(x=>'<span class="hys243-assignee-tag">'+escape(x.nombre)+'</span>').join(' ')+'</td></tr>';
}
let provider=null,directory=[],selectedItems=[],initialItems=[],moduleName=null,loaderReady=false,epoch=0,mounted=false;
function setProvider(fn){
 if(fn!==null && typeof fn!=='function')throw Error('El proveedor debe ser una función de lectura o null.');
 provider=fn;
}
function enabled(){
 return root.HYS243_DIRECTORY_ENABLED===true&&root.HYS243_DIRECTORY_ISOLATED===true&&typeof provider==='function';
}
function selected(){return snapshots(selectedItems,moduleName);}
function changed(){return !sameIds(selectedItems,initialItems);}
function canSubmit(){return !changed()||loaderReady;}
function mountedPicker(){return mounted;}
function mount(host,{modulo,previous=[],legacy=''}={}){
 if(!host||!root.document||!validModule(modulo))throw Error('Selector de responsables inválido.');
 epoch++;const ticket=epoch;mounted=true;moduleName=modulo;loaderReady=false;directory=[];
 selectedItems=snapshots(previous,modulo);initialItems=snapshots(previous,modulo);
 const section=root.document.createElement('section');section.className='hys243-assignee-picker';section.dataset.module=modulo;
 const heading=root.document.createElement('strong');heading.textContent='Asignación de responsables (usuarios registrados)';
 const explanation=root.document.createElement('p');explanation.className='hys243-assignee-note';explanation.textContent='Selecciona uno o varios usuarios activos de '+modulo+'. La selección requiere un directorio autorizado; escribir un nombre no equivale a asignar una cuenta.';
 const old=root.document.createElement('p');old.className='hys243-assignee-legacy';
 if(clean(legacy)&&!initialItems.length)old.textContent='Responsable histórico (texto, no vinculado a cuenta): '+clean(legacy,500);
 const search=root.document.createElement('input');search.type='search';search.placeholder='Buscar nombre del usuario autorizado';search.setAttribute('aria-label','Buscar responsables');search.autocomplete='off';
 const status=root.document.createElement('p');status.className='hys243-assignee-status';status.setAttribute('role','status');
 const chosen=root.document.createElement('div');chosen.className='hys243-assignee-chosen';
 const results=root.document.createElement('div');results.className='hys243-assignee-results';
 const refresh=()=>{
  if(!section.isConnected||epoch!==ticket)return;
  status.textContent=loaderReady?('Usuarios autorizados de '+modulo+': '+directory.length+' · Asignados: '+selectedItems.length):'Directorio de usuarios: conexión de pruebas aislada no disponible. Se conservan asignaciones históricas.';
  chosen.replaceChildren();
  for(const item of selectedItems){
   const chip=root.document.createElement('button');chip.type='button';chip.className='hys243-assignee-chip';
   chip.disabled=!loaderReady;chip.textContent=item.nombre+' ×';chip.title=loaderReady?'Quitar '+item.nombre:'Asignación conservada sin edición';
   chip.addEventListener('click',()=>{selectedItems=selectedItems.filter(x=>x.user_id!==item.user_id);refresh();});
   chosen.append(chip);
  }
  results.replaceChildren();
  if(!loaderReady)return;
  for(const item of filterDirectory(directory,search.value)){
   const active=selectedItems.some(x=>x.user_id===item.user_id);
   const button=root.document.createElement('button');button.type='button';button.className='hys243-assignee-choice'+(active?' selected':'');
   button.setAttribute('aria-pressed',String(active));button.textContent=(active?'✓ ':'＋ ')+item.nombre;
   button.addEventListener('click',()=>{
    if(active)selectedItems=selectedItems.filter(x=>x.user_id!==item.user_id);
    else if(selectedItems.length<30)selectedItems.push({...item});
    refresh();
   });results.append(button);
  }
  if(!results.childElementCount){const p=root.document.createElement('p');p.textContent='No hay usuarios elegibles para esta búsqueda.';results.append(p);}
 };
 search.addEventListener('input',refresh);section.append(heading,explanation,old,search,status,chosen,results);host.append(section);
 refresh();
 if(enabled()){
  status.textContent='Consultando únicamente usuarios autorizados del módulo…';
  Promise.resolve().then(()=>provider(modulo)).then(rows=>{
   if(epoch!==ticket||!section.isConnected)return;
   directory=normalizedDirectory(rows,modulo);loaderReady=true;refresh();
  }).catch(()=>{
   if(epoch!==ticket||!section.isConnected)return;
   loaderReady=false;directory=[];status.textContent='No se pudo consultar el directorio autorizado. Los responsables históricos permanecen intactos.';
  });
 }
 return section;
}
root.Hys243Assignees={snapshot,snapshots,normalizedDirectory,filterDirectory,names,detailRow,setProvider,mount,selected,changed,canSubmit,mountedPicker};
if(typeof module!=='undefined'&&module.exports)module.exports=root.Hys243Assignees;
})(typeof window!=='undefined'?window:globalThis);
