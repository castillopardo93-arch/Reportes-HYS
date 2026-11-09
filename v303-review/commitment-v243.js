/* C05 — Fecha compromiso del hallazgo: campo complementario, sin red ni cambios de esquema.
 * Es opcional para compatibilidad de hallazgos históricos y actividades informativas.
 */
(function(root){
'use strict';
function validDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const [y,m,d]=value.split('-').map(Number);
 if(y<1900||y>9999||m<1||m>12||d<1||d>31)return false;
 const days=new Date(Date.UTC(y,m,0)).getUTCDate();
 return d<=days;
}
function normalizeDate(value){
 if(value===undefined||value===null||value==='')return '';
 if(typeof value!=='string'||!validDate(value))throw Error('Fecha compromiso inválida. Selecciona una fecha real.');
 return value;
}
function displayDate(value){
 return validDate(value)?value.slice(8,10)+'/'+value.slice(5,7)+'/'+value.slice(0,4):'';
}
function dateFromRecord(record){
 const value=record?.[6]?.dueDate;
 return validDate(value)?value:'';
}
function escape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function detailRow(record,colspan=7){
 const formatted=displayDate(dateFromRecord(record));
 if(!formatted)return '';
 return '<tr class="hys243-commitment-detail"><td colspan="'+Math.max(1,Math.min(20,Number(colspan)||7))+'"><strong>Fecha compromiso:</strong> <time datetime="'+escape(dateFromRecord(record))+'">'+escape(formatted)+'</time></td></tr>';
}
function mount(host,record){
 if(!root.document||!host)throw Error('No se encontró el formulario del hallazgo.');
 const wrap=root.document.createElement('section');wrap.className='hys243-commitment-field';
 const label=root.document.createElement('label');label.textContent='Fecha compromiso';label.htmlFor='recordCommitmentDate243';
 const input=root.document.createElement('input');input.type='date';input.id='recordCommitmentDate243';input.name='fechaCompromiso243';input.min='1900-01-01';input.max='9999-12-31';input.value=dateFromRecord(record);
 const note=root.document.createElement('small');note.textContent='Opcional. Fecha acordada para ejecutar la medida propuesta; no cambia automáticamente el estado del hallazgo.';
 wrap.append(label,input,note);host.append(wrap);return input;
}
function readDate(input){
 if(!input||input.type!=='date')throw Error('Fecha compromiso no disponible. No se guardó el hallazgo.');
 if(input.validity&&input.validity.valid===false)throw Error('Fecha compromiso inválida. Corrige la fecha.');
 return normalizeDate(input.value);
}
function mergeMetadata(existing,date){
 const previous=existing&&typeof existing==='object'&&!Array.isArray(existing)?existing:{};
 return {...previous,dueDate:normalizeDate(date)};
}
const api={validDate,normalizeDate,displayDate,dateFromRecord,detailRow,mount,readDate,mergeMetadata};
root.Hys243Commitment=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
