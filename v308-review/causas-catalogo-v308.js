/* Reportes HYS v308 — catálogo preintegrado de causas HSS-RGT-007 Rev. 08.
 * La información se carga desde causas-datos-v308.js, compilado UNA SOLA VEZ
 * desde el libro original. No existe carga de Excel en el formulario.
 * Sin catálogo oficial completo se deshabilita la selección para impedir
 * códigos aislados o descripciones inventadas.
 */
(function(root){
 'use strict';
 const d=root.document;
 const panel=d.getElementById('hys305Investigation');
 const form=d.getElementById('hys306FinalForm');
 if(!panel||!form)return;
 const source=root.HYS308_CAUSAS_OFICIALES;
 const expectedSource='HSS-RGT-007-Flash_Final Report rev.8.xlsx';
 const limits={'1':73,'2':49,'3':31};
 const expectedCount=153;
 const normalize=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
 const valid=code=>{
  const match=/^([123])\.(\d{1,2})$/.exec(String(code));
  return !!match&&Number(match[2])>=1&&Number(match[2])<=limits[match[1]];
 };
 const codeOrder=code=>{const [first,second]=code.split('.').map(Number);return first*100+second};
 function validateCatalog(data){
  const map=new Map();
  if(!data||data.archivo!==expectedSource||data.hoja!=='Tabla'||!Array.isArray(data.entradas))
   return {ready:false,map,error:'El catálogo de causas aún no está incorporado desde la plantilla HSS-RGT-007 Rev. 08.'};
  for(const row of data.entradas){
   const code=normalize(row?.codigo);
   const desc=normalize(row?.descripcion);
   if(!valid(code)||!desc||desc.length<4||desc.length>500||!/[\p{L}]{3}/u.test(desc)||map.has(code)||
       /\b(?:simulad[ao]s?|fictici[ao]s?|pendiente(?:\s+de)?(?:\s+validaci[oó]n)?)\b/i.test(desc))
    return {ready:false,map:new Map(),error:'El catálogo no pasó la validación de códigos y descripciones; necesita cotejo con la hoja «Tabla».'};
   map.set(code,desc);
  }
  if(map.size!==expectedCount)
   return {ready:false,map:new Map(),error:'El catálogo oficial de causas está incompleto ('+map.size+'/'+expectedCount+'). No se mostrarán códigos sin nombre.'};
  for(const [group,max] of Object.entries(limits)){
   for(let num=1;num<=max;num++){
    if(!map.has(group+'.'+num))
     return {ready:false,map:new Map(),error:'Falta un código o descripción de la hoja «Tabla». No se publicará una lista incompleta.'};
   }
  }
  return {ready:true,map,error:''};
 }
 const {ready,map,error}=validateCatalog(source);
 const get=code=>map.get(String(code))||'';
 const format=code=>ready&&get(code)?code+' — '+get(code):null;
 const section=[...form.querySelectorAll('.hys306-section')].find(x=>/9\.-?\s*ANÁLISIS DE CAUSAS/i.test(x.querySelector('legend')?.textContent||''));
 const status=d.createElement('p');
 status.id='hys308CauseStatus';status.className='hys308-catalog-status';
 status.setAttribute('role','status');
 status.textContent=ready
  ?'Catálogo HSS-RGT-007 Rev. 08 integrado: código y descripción disponibles automáticamente.'
  :error;
 status.dataset.complete=String(ready);
 if(section) {
  const intro=section.querySelector('.hys306-section-description');
  if(intro)intro.insertAdjacentElement('afterend',status);
  else section.insertBefore(status,section.firstElementChild?.nextSibling||null);
 }
 const preserved=new WeakMap();
 const selectorQuery='.hys306-cause-select,#hys306ActionRows select[name$="_codigo"]';
 function updateOptions(){
  for(const sel of form.querySelectorAll(selectorQuery)){
   if(!preserved.has(sel)){
    preserved.set(sel,[...sel.options].map(o=>o.value).filter(valid));
   }
   const available=preserved.get(sel);
   const chosen=sel.value;
   sel.replaceChildren();
   const empty=d.createElement('option');
   empty.value='';
   empty.textContent=ready?'Seleccionar código y descripción de causa…':'Catálogo oficial de causas pendiente';
   sel.append(empty);
   if(ready){
    for(const code of available){
     const opt=d.createElement('option');
     opt.value=code;opt.textContent=format(code);
     opt.title=opt.textContent;
     sel.append(opt);
    }
    sel.value=valid(chosen)?chosen:'';
   }
   sel.disabled=!ready;
   sel.setAttribute('aria-label',ready?'Seleccionar código y nombre de causa del Excel original':
    'No disponible: faltan descripciones oficiales del Excel original');
  }
 }
 updateOptions();
 const add=d.getElementById('hys306AddAction');
 add?.addEventListener('click',updateOptions);
 // Los campos de texto libre no se bloquean, preservando el ensayo del flujo
 // documental; únicamente los códigos oficiales no se aceptan sin validación.
 root.Hys308CausaCatalogo={
  ready,expected:expectedCount,count:()=>map.size,get,format,updateOptions,validateCatalog,valid,codeOrder,
  source:expectedSource
 };
})(window);
