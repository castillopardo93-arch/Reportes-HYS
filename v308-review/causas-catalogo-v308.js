/* Reportes HYS v308 — catálogo de causas desde HSS-RGT-007.
 * IMPORTACIÓN LOCAL, SIN TRANSMISIÓN NI ALMACENAMIENTO DEL LIBRO.
 * Identificadores persistentes: valores de código; rótulos: código + texto literal.
 */
(function(root){
 'use strict';
 const d=root.document;
 const form=d.getElementById('hys306FinalForm');
 const panel=d.getElementById('hys305Investigation');
 if(!form||!panel)return;
 const section=[...form.querySelectorAll('.hys306-section')].find(x=>/9\.-?\s*ANÁLISIS DE CAUSAS/i.test(x.querySelector('legend')?.textContent||''));
 if(!section)return;
 const expected={
  '1':73,'2':49,'3':31
 };
 const total=Object.values(expected).reduce((a,b)=>a+b,0);
 let descriptions=new Map();
 const normal=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
 const valid=code=>{
  const m=/^([123])\.(\d{1,2})$/.exec(code);
  return !!m&&Number(m[2])>=1&&Number(m[2])<=expected[m[1]];
 };
 const matchCode=s=>{
  const m=/^\s*([123])\.\s*(\d{1,2})(?!\d)\s*(?:[:.)–—\-]\s*)?(.*)$/s.exec(normal(s));
  if(!m)return null;
  const code=m[1]+'.'+Number(m[2]);
  return valid(code)?{code,tail:normal(m[3]).replace(/^[\s:.\-–—]+/,'')}:null;
 };
 const descriptive=s=>/[\p{L}]{3}/u.test(s)&&!/^[-–—]+$/.test(s)&&s.length>=4&&s.length<=500;
 const selectArea=document.createElement('div');
 selectArea.className='hys308-catalog-source';
 const heading=d.createElement('strong');
 heading.textContent='Catálogo oficial de causas — HSS-RGT-007';
 const help=d.createElement('p');
 help.textContent='Selecciona el Excel original (.xlsx) para mostrar código y descripción exacta de la hoja «Tabla». El archivo se lee solamente en este dispositivo y no se guarda ni se envía.';
 const label=d.createElement('label');
 label.textContent='Cargar listas de causas desde Excel: ';
 const input=d.createElement('input');
 input.type='file';
 input.id='hys308CauseWorkbook';
 input.accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
 label.append(input);
 const status=d.createElement('p');
 status.className='hys308-catalog-status';
 status.id='hys308CauseStatus';
 status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');
 status.textContent='Falta cargar la hoja «Tabla». Por ahora los desplegables muestran únicamente los códigos.';
 selectArea.append(heading,help,label,status);
 section.insertBefore(selectArea,section.querySelector('.hys306-field-grid')||null);
 const catalogueOf=code=>descriptions.get(String(code))||'';
 const format=code=>catalogueOf(code)?code+' — '+catalogueOf(code):code;
 function updateOptions(){
  panel.querySelectorAll('.hys306-cause-select,#hys306ActionRows select[name$="_codigo"]').forEach(sel=>{
   const chosen=sel.value;
   for(const option of sel.options){
    if(!valid(option.value))continue;
    option.textContent=format(option.value);
    option.title=option.textContent;
   }
   sel.value=chosen;
  });
  const loaded=descriptions.size;
  status.textContent=loaded===total
   ?'Catálogo completo: '+loaded+'/'+total+' códigos con sus descripciones originales.'
   :loaded
    ?'Catálogo parcial: '+loaded+'/'+total+' códigos con nombre. Revisa las filas no identificadas de la hoja «Tabla».'
    :'Falta cargar la hoja «Tabla». Por ahora los desplegables muestran únicamente los códigos.';
  status.dataset.complete=String(loaded===total);
 }
 function xml(text){
  const parsed=new root.DOMParser().parseFromString(text,'application/xml');
  if(parsed.getElementsByTagName('parsererror').length)throw Error('El archivo Excel contiene XML que no se puede interpretar.');
  return parsed;
 }
 const descendants=(parent,tag)=>[...parent.getElementsByTagName('*')].filter(x=>x.localName===tag);
 const first=(parent,tag)=>descendants(parent,tag)[0]||null;
 function valueOfCell(c,shared){
  const type=c.getAttribute('t');
  if(type==='inlineStr')return normal(descendants(c,'t').map(x=>x.textContent||'').join(''));
  if(type==='s'){
   const n=Number(first(c,'v')?.textContent);
   return Number.isInteger(n)&&n>=0?normal(shared[n]||''):'';
  }
  if(type==='str')return normal(first(c,'v')?.textContent||'');
  return normal(first(c,'v')?.textContent||'');
 }
 const colNumber=ref=>{
  const text=/^[A-Z]+/.exec(String(ref).toUpperCase())?.[0]||'';
  return [...text].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
 };
 async function readEntry(zip,name,limit=4e6){
  const entry=zip.file(name);
  if(!entry)throw Error('Falta la sección '+name+' en el Excel.');
  const txt=await entry.async('string');
  if(txt.length>limit)throw Error('La sección '+name+' es demasiado grande para el formulario.');
  return txt;
 }
 function parseRows(sheetXml,shared){
  const rows=[];
  for(const row of descendants(sheetXml,'row')){
   const cells=[];
   for(const c of descendants(row,'c')){
    const text=valueOfCell(c,shared);
    if(!text)continue;
    const col=colNumber(c.getAttribute('r'));
    if(col)cells.push({col,text});
   }
   cells.sort((a,b)=>a.col-b.col);
   if(cells.length)rows.push(cells);
  }
  return rows;
 }
 function fromRows(rows){
  const found=new Map();
  for(const row of rows){
   for(let i=0;i<row.length;i++){
    const cell=row[i],code=matchCode(cell.text);
    if(!code)continue;
    let label=code.tail;
    if(!descriptive(label)){
     label='';
     for(let j=i+1;j<row.length;j++){
      const next=row[j];
      if(next.col-cell.col>5||matchCode(next.text))break;
      if(descriptive(next.text)){label=next.text;break}
     }
    }
    label=normal(label).replace(/^[\-–—: ]+/,'');
    if(!descriptive(label))continue;
    // Un código tiene una sola descripción oficial. No sobrescribir una entrada
    // ya identificada por una coincidencia posterior de igual código.
    if(!found.has(code.code))found.set(code.code,label);
   }
  }
  return found;
 }
 async function extractWorkbook(buffer){
  if(!root.JSZip?.loadAsync)throw Error('No se cargó el lector Excel. Revisa la conexión a Internet.');
  const zip=await root.JSZip.loadAsync(buffer);
  const workbook=xml(await readEntry(zip,'xl/workbook.xml',3e6));
  const sheets=descendants(workbook,'sheet');
  const table=sheets.find(x=>normal(x.getAttribute('name')).toLowerCase()==='tabla');
  if(!table)throw Error('La planilla no contiene una hoja denominada «Tabla».');
  const id=table.getAttribute('r:id')||table.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
  const rels=xml(await readEntry(zip,'xl/_rels/workbook.xml.rels'));
  const rel=descendants(rels,'Relationship').find(x=>x.getAttribute('Id')===id);
  if(!rel)throw Error('No se encontró la relación interna de la hoja «Tabla».');
  const target=String(rel.getAttribute('Target')||'').replace(/^\/+/,'');
  const sheetPath=target.startsWith('xl/')?target:'xl/'+target.replace(/^(\.\.\/)+/,'');
  if(!/^xl\/worksheets\/[^/]+\.xml$/.test(sheetPath))throw Error('Ruta inesperada de la hoja Tabla.');
  let shared=[];
  if(zip.file('xl/sharedStrings.xml')){
   const data=xml(await readEntry(zip,'xl/sharedStrings.xml',5e6));
   shared=descendants(data,'si').map(si=>descendants(si,'t').map(t=>t.textContent||'').join(''));
  }
  const sheet=xml(await readEntry(zip,sheetPath,8e6));
  const found=fromRows(parseRows(sheet,shared));
  if(found.size===0)throw Error('No se encontraron pares código y descripción en la hoja «Tabla».');
  return found;
 }
 input.addEventListener('change',async()=>{
  const file=input.files?.[0];
  if(!file)return;
  status.textContent='Leyendo hoja «Tabla»…';
  try{
   if(!/\.xlsx$/i.test(file.name)||file.size>5e6)
    throw Error('Selecciona un .xlsx original de tamaño inferior a 5 MB.');
   const next=await extractWorkbook(await file.arrayBuffer());
   descriptions=next;
   updateOptions();
  }catch(e){
   status.textContent='No se pudo importar el catálogo: '+(e?.message||'error desconocido');
   status.dataset.complete='false';
  }finally{input.value=''}
 });
 const add=d.getElementById('hys306AddAction');
 add?.addEventListener('click',updateOptions);
 updateOptions();
 root.Hys308CausaCatalogo={format,get:catalogueOf,extractWorkbook,fromRows,matchCode,
  count:()=>descriptions.size,expected:total,updateOptions};
})(window);
