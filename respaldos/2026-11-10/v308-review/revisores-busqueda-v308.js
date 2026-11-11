/* Reportes HYS v308 — búsqueda inteligente del destinatario por nombre.
 * No realiza envíos ni mutaciones de Supabase. Lee el directorio existente
 * sólo con la facultad de Administración General. Para otras cuentas,
 * requiere una API de directorio segura y autorizada que todavía no existe.
 */
(function(root){
 'use strict';
 const d=root.document;
 const workflow=root.Hys308Workflow;
 if(!workflow)return;
 const demo=workflow.isDemo;
 const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
 const controls=[],liveData={list:[],loading:false,message:'Directorio disponible únicamente para Administrador General; falta habilitar consulta segura a usuarios básicos.'};
 let generation=0;
 const el=(tag,cls,text)=>{
  const node=d.createElement(tag);
  if(cls)node.className=cls;
  if(text!=null)node.textContent=text;
  return node;
 };
 async function readOnlyDirectory(){
  if(demo)return;
  const access=root.__REPORTES_HYS_ACCESS__;
  const id=access?.userId,token=++generation;
  liveData.list=[];
  if(!id||access.profile?.activo!==true||access.profile?.rol!=='administrador_global'||!root.reportesHysSupabase){
   liveData.message='La búsqueda de usuarios reales para este perfil requiere un directorio autorizado de Investigación de accidente.';
   controls.forEach(x=>x.render(false));return;
  }
  liveData.loading=true;liveData.message='Consultando usuarios registrados…';controls.forEach(x=>x.render(false));
  try{
   const result=await root.reportesHysSupabase.rpc('hys242_listar_usuarios');
   if(generation!==token||root.__REPORTES_HYS_ACCESS__?.userId!==id)return;
   if(result.error||!Array.isArray(result.data))throw Error('No disponible');
   const found=new Set();
   liveData.list=result.data.filter(u=>u?.activo===true&&!!u.usuario_id&&!!String(u.nombre||'').trim())
    .map(u=>({id:String(u.usuario_id),name:String(u.nombre).trim(),role:String(u.rol||'usuario'),authorized:false}))
    .filter(u=>{if(found.has(u.id))return false;found.add(u.id);return true})
    .sort((a,b)=>a.name.localeCompare(b.name,'es'));
   liveData.message='Usuarios activos registrados. La selección para revisión real requiere verificar facultades específicas antes de enviar.';
  }catch(_){liveData.list=[];liveData.message='No se pudo consultar el directorio de cuentas registradas.'}
  finally{if(generation===token){liveData.loading=false;controls.forEach(x=>x.render(false))}}
 }
 for(const suffix of ['Flash','Final']){
  const original=d.getElementById('hys308Reviewer'+suffix);
  if(!original)continue;
  const wrapper=original.closest('.hys308-assign');
  if(!wrapper)continue;
  wrapper.classList.add('hys308-searchable-reviewer');
  const title=el('label','hys308-search-label','Revisor autorizado — buscar nombre');
  const input=el('input','hys308-search-input');
  input.type='search';input.id='hys308ReviewerSearch'+suffix;
  input.placeholder='Escribe nombre o apellido…';input.autocomplete='off';
  title.htmlFor=input.id;
  input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');
  input.setAttribute('aria-haspopup','listbox');
  const matches=el('div','hys308-search-results');
  matches.id='hys308ReviewerList'+suffix;
  matches.setAttribute('role','listbox');matches.hidden=true;
  input.setAttribute('aria-controls',matches.id);
  input.setAttribute('aria-expanded','false');
  const hint=el('small','hys308-search-hint',demo?'Selecciona un revisor ficticio del laboratorio.':liveData.message);
  original.classList.add('hys308-native-reviewer');original.hidden=true;original.tabIndex=-1;
  original.setAttribute('aria-hidden','true');
  const existingLabel=wrapper.querySelector('label');
  if(existingLabel)existingLabel.hidden=true;
  wrapper.insertBefore(title,original);
  wrapper.insertBefore(input,original);
  wrapper.insertBefore(matches,original);
  wrapper.insertBefore(hint,original);
  let position=0;
  const candidates=()=>demo?
   [...original.options].filter(x=>x.value).map(x=>({id:x.value,name:x.textContent.trim(),role:'revisor autorizado de prueba',authorized:true})):
   liveData.list;
  function choose(item){
   if(![...original.options].some(x=>x.value===item.id)){
    const option=d.createElement('option');option.value=item.id;option.textContent=item.name;original.append(option);
   }
   original.value=item.id;input.value=item.name;
   matches.hidden=true;input.setAttribute('aria-expanded','false');
   hint.textContent=demo?item.name+' · autorizado en laboratorio':
     item.name+' · usuario registrado; pendiente de facultad específica';
   original.dispatchEvent(new root.Event('change',{bubbles:true}));
  }
  function render(open=false){
   const q=norm(input.value);
   const data=candidates().filter(u=>norm(u.name+' '+u.role).includes(q)).slice(0,12);
   const all=candidates();
   position=0;matches.replaceChildren();
   if(data.length===0){
    matches.append(el('p','hys308-search-empty',all.length?'Sin coincidencias por nombre.':liveData.message));
   }else data.forEach((item,index)=>{
    const button=el('button','hys308-search-option',item.name);
    button.type='button';button.setAttribute('role','option');
    button.setAttribute('aria-selected',String(original.value===item.id));
    const detail=el('small',null,item.role);
    button.append(detail);
    if(index===0)button.classList.add('hys308-search-active');
    button.addEventListener('mousedown',event=>event.preventDefault());
    button.addEventListener('click',()=>choose(item));
    matches.append(button);
   });
   matches.hidden=!open;input.setAttribute('aria-expanded',String(open));
   if(!demo&&original.value==='')hint.textContent=liveData.message;
  }
  controls.push({render,clear:()=>{
   input.value='';original.value='';matches.hidden=true;input.setAttribute('aria-expanded','false');
   hint.textContent=demo?'Selecciona un revisor ficticio del laboratorio.':liveData.message;
  }});
  input.addEventListener('focus',()=>render(true));
  input.addEventListener('input',()=>{
   if(norm(input.value)!==norm(original.selectedOptions[0]?.textContent))original.value='';
   render(true);
  });
  input.addEventListener('keydown',event=>{
   if(event.key==='Escape'){
    matches.hidden=true;input.setAttribute('aria-expanded','false');return;
   }
   const buttons=[...matches.querySelectorAll('button')];
   if(event.key==='ArrowDown'||event.key==='ArrowUp'){
    event.preventDefault();
    if(matches.hidden){render(true);return}
    position=Math.max(0,Math.min(buttons.length-1,position+(event.key==='ArrowDown'?1:-1)));
    buttons.forEach((node,i)=>node.classList.toggle('hys308-search-active',i===position));
   }else if(event.key==='Enter'&&!matches.hidden&&buttons.length){
    event.preventDefault();buttons[position].click();
   }
  });
  wrapper.addEventListener('focusout',()=>{
   root.setTimeout(()=>{if(!wrapper.contains(d.activeElement)){
    matches.hidden=true;input.setAttribute('aria-expanded','false');
   }},0);
  });
  render(false);
 }
 root.addEventListener('reportes-hys-access-changing',()=>{
  generation++;liveData.list=[];controls.forEach(x=>x.clear());
 });
 root.addEventListener('reportes-hys-access-changed',()=>{
  controls.forEach(x=>x.clear());readOnlyDirectory();
 });
 const demoActor=d.getElementById('hys308DemoActor');
 demoActor?.addEventListener('change',()=>controls.forEach(x=>x.clear()));
 readOnlyDirectory();
 root.Hys308ReviewerSearch={isDemo:demo,directoryStatus:()=>liveData.message,
  candidateCount:()=>demo?controls.length:liveData.list.length,
  clear:()=>controls.forEach(x=>x.clear())};
})(window);
