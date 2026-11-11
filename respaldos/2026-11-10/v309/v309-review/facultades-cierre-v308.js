/* Reportes HYS v308 — Facultades adicionales de cierre de investigaciones.
 * Propuesta de facultades EN MEMORIA, integrada a Permisos y facultades.
 * No escribe ni altera facultades APR/OTROS, Supabase o producción.
 */
(function(root){
 'use strict';
 const d=root.document;
 const labels={
  flash:'Autorizar cierre de Flash Report',
  final:'Autorizar cierre de Final Report'
 };
 let context=null,selected={},primary={flash:'',final:''},dirty=false,changes=[];
 const clean=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
 const el=(tag,cls,content)=>{
  const n=d.createElement(tag);if(cls)n.className=cls;
  if(content!==undefined)n.textContent=content;
  return n;
 };
 const copy=x=>JSON.parse(JSON.stringify(x));
 const usersNormalized=users=>{
  const seen=new Set();
  return (Array.isArray(users)?users:[]).filter(u=>u&&u.activo===true&&u.usuario_id&&String(u.nombre||'').trim())
   .map(u=>({id:String(u.usuario_id),nombre:String(u.nombre).trim(),rol:String(u.rol||'usuario')}))
   .filter(u=>{if(seen.has(u.id))return false;seen.add(u.id);return true})
   .sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
 };
 function resetIdentity(identity){
  if(identity===context)return;
  context=identity;selected={};primary={flash:'',final:''};changes=[];dirty=false;
 }
 function proposed(userId,key){return selected[String(userId)]?.[key]===true}
 function set(user,key,value,activeUsers){
  if(!['flash','final'].includes(key)||!activeUsers.some(u=>u.id===user))return false;
  const current=proposed(user,key);
  if(current===value)return false;
  selected[user]={...selected[user],[key]:value===true};
  if(!value&&primary[key]===user)primary[key]='';
  dirty=true;
  changes.push({at:new Date().toISOString(),usuario_id:user,facultad:key,antes:current,despues:!!value});
  return true;
 }
 function mount(host,{users,authorized=true,lab=false,onChange=()=>{}}={}){
  if(!host)return;
  host.replaceChildren();
  if(!authorized){host.append(el('p','hys308-fac-msg','Solo el Administrador General puede proponer estas facultades.'));return}
  const all=usersNormalized(users);
  const identity=root.__REPORTES_HYS_ACCESS__?.userId||(lab?'laboratorio-v308':null);
  resetIdentity(identity||'preview-admin');
  const box=el('section','hys308-close-faculties');
  box.id='hys308CloseFaculties';
  box.append(el('h3',null,'Investigación de accidente — Autorizados de cierre'));
  box.append(el('p','hys308-fac-hint',
    'Selecciona una o varias personas activas para aprobar y cerrar Flash Report y/o Final Report. Estas facultades son independientes de las tarjetas Prevencionistas y Supervisores.'));
  const caution=el('p','hys308-fac-warning',lab
   ?'LABORATORIO: cambios simulados, válidos solo durante esta página.'
   :'VISTA DE DESARROLLO: propuestas en memoria. El guardado real de estas facultades no está habilitado en Supabase.');
  box.append(caution);
  const searchLbl=el('label','hys308-fac-label','Buscar usuario registrado');
  const search=el('input','hys308-fac-search');
  search.type='search';search.id='hys308CloseSearch';search.placeholder='Nombre, apellido o rol…';
  searchLbl.append(search);box.append(searchLbl);
  const summary=el('div','hys308-fac-counts');
  summary.id='hys308CloseCounts';box.append(summary);
  const header=el('div','hys308-fac-head');
  header.append(el('span',null,'Usuario registrado'),
    el('span',null,'Cierra Flash Report'),
    el('span',null,'Cierra Final Report'));
  box.append(header);
  const rows=el('div','hys308-fac-rows');rows.id='hys308CloseRows';box.append(rows);
  const principals=el('div','hys308-fac-principals');
  const names={flash:'Responsable sugerido de cierre Flash',final:'Responsable sugerido de cierre Final'};
  const primaryWidgets={};
  for(const key of ['flash','final']){
   const label=el('label','hys308-fac-label',names[key]);
   const select=el('select','hys308-fac-principal');
   select.id=key==='flash'?'hys308PrimaryFlash':'hys308PrimaryFinal';
   select.addEventListener('change',()=>{
    primary[key]=select.value;dirty=true;
    changes.push({at:new Date().toISOString(),facultad:'responsable_'+key,despues:primary[key]});
    onChange();render();
   });
   primaryWidgets[key]=select;label.append(select);principals.append(label);
  }
  principals.append(el('p','hys308-fac-hint','El responsable sugerido se elegirá entre los autorizados. En cada investigación podrá designarse al responsable concreto mediante el circuito de revisión.'));
  box.append(principals);
  const actions=el('div','hys308-fac-actions');
  const review=el('button','btn primary','Revisar autorizaciones propuestas');
  review.type='button';review.id='hys308ReviewCloseProposals';
  const discard=el('button','btn','Descartar propuesta');
  discard.type='button';discard.id='hys308DiscardCloseProposals';
  const report=el('div','hys308-fac-report');report.id='hys308CloseReport';report.setAttribute('role','status');
  actions.append(review,discard);box.append(actions,report);host.append(box);
  function render(){
   rows.replaceChildren();
   const countFlash=all.filter(u=>proposed(u.id,'flash')).length;
   const countFinal=all.filter(u=>proposed(u.id,'final')).length;
   summary.textContent=all.length+' usuarios activos · '+countFlash+' autorizados Flash · '+countFinal+' autorizados Final';
   const q=clean(search.value);
   const filtered=all.filter(u=>clean(u.nombre+' '+u.rol).includes(q));
   if(!filtered.length)rows.append(el('p','hys308-fac-empty','No hay usuarios activos que coincidan.'));
   for(const user of filtered){
    const line=el('div','hys308-fac-person');
    const person=el('div','hys308-fac-name');
    person.append(el('strong',null,user.nombre),el('small',null,user.rol==='administrador_area'?'Administrador':user.rol));
    line.append(person);
    for(const key of ['flash','final']){
     const lbl=el('label','hys308-fac-check');
     const check=el('input');
     check.type='checkbox';check.dataset.hys308Close=key;check.dataset.userId=user.id;
     check.checked=proposed(user.id,key);
     check.setAttribute('aria-label',labels[key]+' — '+user.nombre);
     check.addEventListener('change',()=>{
      if(set(user.id,key,check.checked,all)){onChange();render()}
     });
     lbl.append(check,el('span',null,'Autorizar'));
     line.append(lbl);
    }
    rows.append(line);
   }
   for(const key of ['flash','final']){
    const input=primaryWidgets[key],previous=primary[key];
    input.replaceChildren();
    const choose=el('option',null,'Sin responsable sugerido');choose.value='';input.append(choose);
    all.filter(u=>proposed(u.id,key)).forEach(u=>{
     const opt=el('option',null,u.nombre);opt.value=u.id;input.append(opt);
    });
    input.value=previous&&all.some(u=>u.id===previous&&proposed(u.id,key))?previous:'';
    if(previous&&!input.value)primary[key]='';
    input.disabled=!input.options.length||input.options.length===1;
   }
  }
  search.addEventListener('input',render);
  review.addEventListener('click',()=>{
   report.replaceChildren();
   const heading=el('strong',null,'Propuesta de cierre — NO guardada');
   report.append(heading);
   for(const key of ['flash','final']){
    const approved=all.filter(u=>proposed(u.id,key));
    const text=(key==='flash'?'Flash Report':'Final Report')+': '+
     (approved.length?approved.map(u=>u.nombre).join(', '):'sin autorizados')+
     ' · Responsable sugerido: '+(all.find(u=>u.id===primary[key])?.nombre||'sin designar');
    report.append(el('p',null,text));
   }
   report.append(el('p','hys308-fac-warning','Requiere aprobación e integración segura con Supabase para persistencia y control efectivo de cierres.'));
  });
  discard.addEventListener('click',()=>{
   selected={};primary={flash:'',final:''};dirty=false;changes=[];
   report.replaceChildren();onChange();render();
  });
  render();
 }
 const getProposal=()=>({
  facultades:['flash','final'].reduce((acc,key)=>{
   acc[key]=Object.keys(selected).filter(id=>proposed(id,key));return acc;
  },{}),
  responsables:copy(primary),cambios:copy(changes),sinGuardar:true
 });
 const canClose=(userId,kind)=>root.HYS308_DEMO_PAGE===true&&proposed(userId,kind);
 // Sólo funciona en el laboratorio y NUNCA habilita cierres reales.
 const reset=()=>{selected={};primary={flash:'',final:''};changes=[];dirty=false};
 root.addEventListener('reportes-hys-access-changing',()=>{context=null;reset()});
 root.Hys308ClosingFaculties={mount,getProposal,canClose,reset,hasChanges:()=>dirty};
})(window);
