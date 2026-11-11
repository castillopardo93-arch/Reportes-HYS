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
const searchNormalize=value=>normalize(value).replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const clean=(value,limit)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,limit);
const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const asItem=entry=>{
 if(!entry||typeof entry!=='object'||Array.isArray(entry))throw Error('Cada riesgo debe tener código y nombre.');
 const code=clean(entry.code??entry.codigo??entry.código??entry.Codigo??entry.Código,80);
 const name=clean(entry.name??entry.nombre??entry.Nombre??entry.descripcion??entry.descripción,240);
 if(!code||!name)throw Error('Se encontró un riesgo sin código o nombre.');
 const lists={};for(const key of ['aliases','keywords']){const raw=Array.isArray(entry[key])?entry[key]:[];const unique=new Set();lists[key]=raw.map(v=>clean(v,240)).filter(v=>{const k=normalize(v);if(!k||unique.has(k)||k===normalize(name))return false;unique.add(k);return true}).slice(0,25)}
 return {code,name,...(lists.aliases.length?{aliases:lists.aliases}:{}),...(lists.keywords.length?{keywords:lists.keywords}:{})};
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
function sortCatalog(rows){return rows.sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'})||a.code.localeCompare(b.code,'es'));}
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
  const aliasesAt=head.findIndex(x=>['aliases','alias','variantes'].includes(x));
  const keywordsAt=head.findIndex(x=>['keywords','palabras relacionadas'].includes(x));
  records=rows.map(row=>({code:row[codeAt],name:row[nameAt],aliases:aliasesAt<0?[]:String(row[aliasesAt]||'').split('|'),keywords:keywordsAt<0?[]:String(row[keywordsAt]||'').split('|')}));
 }else{
  let parsed;
  try{parsed=JSON.parse(content)}catch{throw Error('El archivo JSON no es válido.');}
  records=Array.isArray(parsed)?parsed:(parsed.risks??parsed.riesgos);
  version=clean(parsed?.version??parsed?.version_catalogo??version,100)||version;
 }
 return {version,risks:validateCatalog(records)};
}
function editWithin(a,b,max){
 if(Math.abs(a.length-b.length)>max)return false;
 if(a===b)return true;
 let prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  const cur=[i];let best=i;
  for(let j=1;j<=b.length;j++){
   const cost=a[i-1]===b[j-1]?0:1;
   const v=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+cost);
   cur.push(v);if(v<best)best=v;
  }
  if(best>max)return false;
  prev=cur;
 }
 return prev[b.length]<=max;
}
function shouldShowResults(query){return searchNormalize(query).length>0;}
function filterCatalog(items,query,limit=40){
 if(!Array.isArray(items))return [];
 const words=searchNormalize(query).split(' ').filter(Boolean);
 if(!words.length)return items.slice(0,limit);
 const found=[];
 for(const item of items){
  const base=searchNormalize(item.code+' '+item.name);
  const aliases=(item.aliases||[]).map(searchNormalize);
  const keys=(item.keywords||[]).map(searchNormalize);
  const texts=[base,...aliases,...keys],allTokens=[...new Set(texts.join(' ').split(' ').filter(Boolean))];
  let fuzzy=false;
  if(!words.every(word=>{
    if(texts.some(t=>t.includes(word)))return true;
    if(word.length<5)return false;
    const distance=word.length>8?2:1;
    const approximate=allTokens.some(token=>token.length>=5&&token[0]===word[0]&&editWithin(word,token,distance));
    if(approximate)fuzzy=true;
    return approximate;
  }))continue;
  const score=fuzzy?3:base.includes(words.join(' '))?0:aliases.some(x=>words.every(w=>x.includes(w)))?1:2;
  found.push({item,score});
 }
 found.sort((a,b)=>a.score-b.score||a.item.name.localeCompare(b.item.name,'es'));
 return found.slice(0,limit).map(x=>x.item);
}
function snapshots(input){
 if(!Array.isArray(input))return [];
 const out=[],seen=new Set();
 for(const item of input){
  try{const safe=asItem(item),key=normalize(safe.code);if(seen.has(key))continue;seen.add(key);out.push({code:safe.code,name:safe.name});}catch{}
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
  const saved=raw?JSON.parse(raw):root.HYS252_RISK_SEED;
  if(!saved){catalog=[];catalogVersion='';catalogError='';return;}
  catalog=sortCatalog(validateCatalog(saved.risks));
  catalogVersion=clean(saved.version,100);
  catalogError='';
 }catch(e){catalog=[];catalogVersion='';catalogError='Catálogo local no disponible: '+String(e.message||e);}
}
function canImport(){const a=root.__REPORTES_HYS_ACCESS__;return !!(a?.userId&&a.profile?.activo===true&&a.profile.rol==='administrador_global');}
function importContext(){const a=root.__REPORTES_HYS_ACCESS__;return {userId:a?.userId,module:a?.selectedModule,session:root.Hys242?.sessionKey?.(),storage:root.HysStorage242?.capture?.()};}
function sameImportContext(c){const a=root.__REPORTES_HYS_ACCESS__;return canImport()&&c?.userId===a?.userId&&c.module===a?.selectedModule&&c.session===root.Hys242?.sessionKey?.()&&(!c.storage?.valid||c.storage.valid());}
function importCatalog(text,filename,expected=importContext()){
 if(!sameImportContext(expected))throw Error('Solo el administrador general de la sesión vigente puede actualizar el catálogo local.');
 const parsed=parseCatalogText(text,filename);
 if(!root.localStorage)throw Error('El navegador no permite almacenar el catálogo sin conexión.');
 const sorted=sortCatalog(parsed.risks);
 try{root.localStorage.setItem(STORAGE_KEY,JSON.stringify({schema:1,version:parsed.version,importedAt:new Date().toISOString(),risks:sorted}));}
 catch{throw Error('No se pudo conservar el catálogo. Revisa el espacio del navegador; no se reemplazó la copia previa.');}
 catalog=sorted;catalogVersion=parsed.version;catalogError='';
 if(refresh)refresh();
 return catalog.length;
}
function reset(){catalog=[];catalogVersion='';catalogError='';current=[];mounted=false;refresh=null;}
function selected(){return snapshots(current);}
function mountedPicker(){return mounted;}
function mount(host,initial){
 if(!host||!root.document)throw Error('No se encuentra el formulario de Hallazgos.');
 readCatalog();current=snapshots(initial);mounted=true;
 const section=root.document.createElement('section');section.className='hys243-risk-picker';
 const label=root.document.createElement('label');label.className='hys243-risk-label';label.textContent='Riesgos asociados (selección múltiple)';
 const help=root.document.createElement('p');help.className='hys243-risk-help';help.textContent='Busca por código, nombre o términos relacionados, incluso con errores menores. Puedes seleccionar varios riesgos.';
 const input=root.document.createElement('input');input.type='search';input.placeholder='Buscar código o nombre del riesgo';input.setAttribute('aria-label','Buscar riesgos');input.autocomplete='off';
 const status=root.document.createElement('p');status.className='hys243-risk-status';status.setAttribute('aria-live','polite');
 const chosen=root.document.createElement('div');chosen.className='hys243-risk-chosen';
 const results=root.document.createElement('div');results.className='hys243-risk-results';results.setAttribute('role','group');results.setAttribute('aria-label','Resultados del catálogo de riesgos');results.hidden=true;
 const importWrap=root.document.createElement('div');importWrap.className='hys243-risk-import';
 const isGlobal=canImport;
 const importBtn=root.document.createElement('button');importBtn.type='button';importBtn.className='btn';importBtn.textContent='Actualizar catálogo (JSON/CSV)';importBtn.hidden=!isGlobal();
 const file=root.document.createElement('input');file.type='file';file.accept='.json,.csv,application/json,text/csv';file.hidden=true;file.setAttribute('aria-label','Seleccionar catálogo JSON o CSV');
 const note=root.document.createElement('small');note.textContent=isGlobal()?'La actualización se guarda solo en este navegador. Los informes anteriores conservan sus riesgos.':'Catálogo de riesgos disponible para selección; actualizaciones reservadas al administrador general.';
 importWrap.append(importBtn,file,note);
 section.append(label,help,input,status,chosen,results,importWrap);host.append(section);
 const rerender=()=>{
  if(!section.isConnected)return;
  status.textContent=catalogError||('Seleccionados: '+current.length+' · '+(shouldShowResults(input.value)?'Buscando en '+catalog.length+' riesgos':current.length?'Escribe para agregar otros riesgos':'Escribe un término para mostrar riesgos')+(catalog.length?'':' · Catálogo vacío; importa uno para buscar.'));
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
  const searching=shouldShowResults(input.value);
  results.hidden=!searching;
  if(!catalog.length||!searching)return;
  const matches=filterCatalog(catalog,input.value,40);
  for(const item of matches){
   const active=current.some(x=>normalize(x.code)===normalize(item.code));
   const button=root.document.createElement('button');button.type='button';button.className='hys243-risk-result'+(active?' selected':'');
   button.setAttribute('aria-pressed',String(active));button.textContent=(active?'✓ ':'＋ ')+item.code+' · '+item.name;
   button.addEventListener('click',()=>{
    if(active)current=current.filter(x=>normalize(x.code)!==normalize(item.code));else current.push({code:item.code,name:item.name});
    rerender();
   });
   results.append(button);
  }
  if(!matches.length){const p=root.document.createElement('span');p.textContent='No se encontraron riesgos para esta búsqueda.';results.append(p);}
 };
 refresh=rerender;input.addEventListener('input',rerender);
 importBtn.addEventListener('click',()=>{if(!isGlobal())return;file.click();});
 file.addEventListener('change',async()=>{
  const picked=file.files?.[0];if(!picked)return;
  if(!isGlobal()){status.textContent='Solo el administrador general puede actualizar el catálogo local.';file.value='';return;}
  try{
   if(picked.size>MAX_FILE_BYTES)throw Error('Archivo mayor a 2 MB.');
   const context=importContext();
   const text=await picked.text();
   if(!section.isConnected||!sameImportContext(context))return;
   importCatalog(text,picked.name,context);
   status.textContent='Catálogo validado y guardado en este navegador ('+catalog.length+' riesgos).';
  }catch(e){catalogError=String(e.message||e);rerender();}
  finally{file.value='';}
 });
 rerender();return section;
}
if(root.addEventListener)root.addEventListener('storage',ev=>{const matches=root.HysStorage242?.matchesEvent?root.HysStorage242.matchesEvent(ev,STORAGE_KEY):ev.key===STORAGE_KEY;if(matches){readCatalog();if(refresh)refresh();}});
const api={normalize,shouldShowResults,parseCatalogText,filterCatalog,snapshots,formatSelection,detailRow,readCatalog,importCatalog,mount,selected,mountedPicker,storageKey:STORAGE_KEY,reset};
root.Hys243Risks=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
