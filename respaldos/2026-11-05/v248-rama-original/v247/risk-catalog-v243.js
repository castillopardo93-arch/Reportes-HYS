/* C03 — selector local de riesgos para Hallazgos APR y OTROS.
 * No usa red ni Supabase. El catálogo es compartido por módulo dentro del mismo origen.
 * Los riesgos seleccionados se guardan como instantáneas en cada informe.
 */
(function(root){
'use strict';
const STORAGE_KEY='reportes-hys-v243-risk-catalog-v1';
const MAX_ITEMS=15000;
const MAX_FILE_BYTES=2*1024*1024;
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/\s+/g,' ').trim();
const clean=(value,limit)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,limit);
const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const asItem=entry=>{
 if(!entry||typeof entry!=='object'||Array.isArray(entry))throw Error('Cada riesgo debe tener código y nombre.');
 const code=clean(entry.code??entry.codigo??entry.código??entry.Codigo??entry.Código,80);
 const name=clean(entry.name??entry.nombre??entry.Nombre??entry.descripcion??entry.descripción,240);
 if(!code||!name)throw Error('Se encontró un riesgo sin código o nombre.');
 return {code,name};
};
function validateCatalog(entries){
 if(!Array.isArray(entries))throw Error('El catálogo debe contener un arreglo de riesgos.');
 if(!entries.length)throw Error('El catálogo está vacío. No se reemplazó el anterior.');
 if(entries.length>MAX_ITEMS)throw Error('Demasiados riesgos para esta carga local.');
 const seen=new Set();
 return entries.map((entry,index)=>{
  const item=asItem(entry),key=normalize(item.code);
  if(seen.has(key))throw Error('Código duplicado en fila '+(index+1)+': '+item.code);
  seen.add(key);return item;
 });
}
function csvRows(text){
 const out=[],row=[];let cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='"'){
   if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!cell.trim()||quoted){quoted=!quoted;}else throw Error('Comillas CSV incorrectas.');
  }else if(!quoted&&(ch===','||ch===';')&&i>=0){
   // El separador se establece a partir de la cabecera, fuera de esta función.
   if(ch===csvRows.delimiter){row.push(cell);cell='';}else cell+=ch;
  }else if(!quoted&&(ch==='\n'||ch==='\r')){
   row.push(cell);cell='';
   if(row.some(v=>v.trim()))out.push(row.splice(0));
   else row.length=0;
   if(ch==='\r'&&text[i+1]==='\n')i++;
  }else cell+=ch;
 }
 if(quoted)throw Error('CSV contiene comillas sin cerrar.');
 row.push(cell);if(row.some(v=>v.trim()))out.push(row);
 return out;
}
function parseCatalogText(text,filename='catalogo.json'){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_FILE_BYTES)throw Error('Archivo demasiado grande (máximo 2 MB).');
 let records,version='importacion-local';
 const content=text.replace(/^\uFEFF/,'');
 if(/\.csv$/i.test(filename)){
  const firstLine=content.split(/\r?\n/,1)[0];
  csvRows.delimiter=firstLine.includes(';')?';':',';
  const rows=csvRows(content);
  if(!rows.length)throw Error('CSV vacío.');
  const head=rows.shift().map(normalize);
  const codeAt=head.findIndex(x=>['code','codigo'].includes(x));
  const nameAt=head.findIndex(x=>['name','nombre','descripcion'].includes(x));
  if(codeAt<0||nameAt<0)throw Error('El CSV requiere columnas codigo y nombre.');
  records=rows.map(row=>({code:row[codeAt],name:row[nameAt]}));
 }else{
  let parsed;
  try{parsed=JSON.parse(content)}catch{throw Error('El archivo JSON no es válido.');}
  records=Array.isArray(parsed)?parsed:(parsed.risks??parsed.riesgos);
  version=clean(parsed?.version??parsed?.version_catalogo??version,100)||version;
 }
 return {version,risks:validateCatalog(records)};
}
function filterCatalog(items,query,limit=40){
 const words=normalize(query).split(' ').filter(Boolean);
 if(!Array.isArray(items))return [];
 return items.filter(item=>words.every(word=>normalize(item.code+' '+item.name).includes(word))).slice(0,limit);
}
function snapshots(input){
 if(!Array.isArray(input))return [];
 const out=[],seen=new Set();
 for(const item of input){
  try{const safe=asItem(item),key=normalize(safe.code);if(seen.has(key))continue;seen.add(key);out.push(safe);}catch{}
 }
 return out;
}
function formatSelection(items){return snapshots(items).map(item=>item.code+' — '+item.name).join('; ');}
function detailRow(record,colspan){
 const items=snapshots(record?.[6]?.risks);
 if(!items.length)return '';
 return '<tr class="hys243-risk-detail"><td colspan="'+Number(colspan||7)+'"><strong>Riesgos vinculados:</strong> '+
  items.map(item=>'<span class="hys243-risk-tag">'+escape(item.code)+' · '+escape(item.name)+'</span>').join(' ')+'</td></tr>';
}
let catalog=[],catalogVersion='',catalogError='',current=[],mounted=false,refresh=null;
function readCatalog(){
 try{
  const raw=root.localStorage?.getItem(STORAGE_KEY);
  if(!raw){catalog=[];catalogVersion='';catalogError='';return;}
  const saved=JSON.parse(raw);
  catalog=validateCatalog(saved.risks);
  catalogVersion=clean(saved.version,100);
  catalogError='';
 }catch(e){catalog=[];catalogVersion='';catalogError='Catálogo local no disponible: '+String(e.message||e);}
}
function importCatalog(text,filename){
 const parsed=parseCatalogText(text,filename);
 if(!root.localStorage)throw Error('El navegador no permite almacenar el catálogo sin conexión.');
 try{root.localStorage.setItem(STORAGE_KEY,JSON.stringify({schema:1,version:parsed.version,importedAt:new Date().toISOString(),risks:parsed.risks}));}
 catch{throw Error('No se pudo conservar el catálogo. Revisa el espacio del navegador; no se reemplazó la copia previa.');}
 catalog=parsed.risks;catalogVersion=parsed.version;catalogError='';
 if(refresh)refresh();
 return catalog.length;
}
function selected(){return snapshots(current);}
function mountedPicker(){return mounted;}
function mount(host,initial){
 if(!host||!root.document)throw Error('No se encuentra el formulario de Hallazgos.');
 readCatalog();current=snapshots(initial);mounted=true;
 const section=root.document.createElement('section');section.className='hys243-risk-picker';
 const label=root.document.createElement('label');label.className='hys243-risk-label';label.textContent='Riesgos asociados (selección múltiple)';
 const help=root.document.createElement('p');help.className='hys243-risk-help';help.textContent='Busca por código o nombre, con o sin tildes. Los riesgos seleccionados se guardan con este hallazgo.';
 const input=root.document.createElement('input');input.type='search';input.placeholder='Buscar código o nombre del riesgo';input.setAttribute('aria-label','Buscar riesgos');input.autocomplete='off';
 const status=root.document.createElement('p');status.className='hys243-risk-status';status.setAttribute('aria-live','polite');
 const chosen=root.document.createElement('div');chosen.className='hys243-risk-chosen';
 const results=root.document.createElement('div');results.className='hys243-risk-results';results.setAttribute('role','group');results.setAttribute('aria-label','Resultados del catálogo de riesgos');
 const importWrap=root.document.createElement('div');importWrap.className='hys243-risk-import';
 const importBtn=root.document.createElement('button');importBtn.type='button';importBtn.className='btn';importBtn.textContent='Cargar catálogo local JSON/CSV';
 const file=root.document.createElement('input');file.type='file';file.accept='.json,.csv,application/json,text/csv';file.hidden=true;file.setAttribute('aria-label','Seleccionar catálogo JSON o CSV');
 const note=root.document.createElement('small');note.textContent='Solo catálogo autorizado. La carga se guarda en este navegador; no envía archivos. Excel maestro: pendiente de H01.';
 importWrap.append(importBtn,file,note);
 section.append(label,help,input,status,chosen,results,importWrap);host.append(section);
 const rerender=()=>{
  if(!section.isConnected)return;
  status.textContent=catalogError||('Catálogo local: '+catalog.length+' riesgos'+(catalogVersion?' · '+catalogVersion:'')+' · Seleccionados: '+current.length+(catalog.length?'':' · Importa un catálogo para buscar.'));
  chosen.replaceChildren();
  if(current.length){
   const tag=root.document.createElement('strong');tag.textContent='Seleccionados: ';chosen.append(tag);
   for(const item of current){
    const remove=root.document.createElement('button');remove.type='button';remove.className='hys243-risk-chip';
    remove.textContent=item.code+' · '+item.name+' ×';remove.title='Quitar '+item.code;
    remove.addEventListener('click',()=>{current=current.filter(x=>normalize(x.code)!==normalize(item.code));rerender();});
    chosen.append(remove);
   }
  }
  results.replaceChildren();
  if(!catalog.length)return;
  const matches=filterCatalog(catalog,input.value,40);
  for(const item of matches){
   const active=current.some(x=>normalize(x.code)===normalize(item.code));
   const button=root.document.createElement('button');button.type='button';button.className='hys243-risk-result'+(active?' selected':'');
   button.setAttribute('aria-pressed',String(active));button.textContent=(active?'✓ ':'＋ ')+item.code+' · '+item.name;
   button.addEventListener('click',()=>{
    if(active)current=current.filter(x=>normalize(x.code)!==normalize(item.code));else current.push({...item});
    rerender();
   });
   results.append(button);
  }
  if(!matches.length){const p=root.document.createElement('span');p.textContent='No se encontraron riesgos para esta búsqueda.';results.append(p);}
 };
 refresh=rerender;input.addEventListener('input',rerender);
 importBtn.addEventListener('click',()=>file.click());
 file.addEventListener('change',async()=>{
  const picked=file.files?.[0];if(!picked)return;
  try{
   if(picked.size>MAX_FILE_BYTES)throw Error('Archivo mayor a 2 MB.');
   importCatalog(await picked.text(),picked.name);
   status.textContent='Catálogo validado y guardado en este navegador ('+catalog.length+' riesgos).';
  }catch(e){catalogError=String(e.message||e);rerender();}
  finally{file.value='';}
 });
 rerender();return section;
}
if(root.addEventListener)root.addEventListener('storage',ev=>{if(ev.key===STORAGE_KEY){readCatalog();if(refresh)refresh();}});
const api={normalize,parseCatalogText,filterCatalog,snapshots,formatSelection,detailRow,readCatalog,importCatalog,mount,selected,mountedPicker,storageKey:STORAGE_KEY};
root.Hys243Risks=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
