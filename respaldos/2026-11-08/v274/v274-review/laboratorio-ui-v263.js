/* Reportes HYS v263: navegación y gestión interactiva del laboratorio ficticio.
 * Funciona solo junto a Hys263Lab; sin backend ni autenticación reales.
 */
(function(root){
'use strict';
const lab=root.Hys263Lab;
if(!root.HYS263_SANDBOX||!lab)throw Error('Laboratorio aislado no disponible');
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const MODULES=['APR','OTROS'];
const label=m=>lab.labels[m]||m;
const roles={usuario:'Usuario',supervisor:'Supervisor',administrador_area:'Administrador'};
let current='users';
const message=txt=>{$('labMessage263').textContent=txt};
function btn(text,fn){const b=el('button',text,'btn');b.type='button';b.onclick=fn;return b}
function safe(fn){try{const result=fn();if(result&&typeof result.catch==='function')result.catch(e=>message('No se pudo completar: '+e.message));return result}catch(e){message('No se pudo completar: '+e.message)}}
function navigate(tab){
 current=tab;
 for(const b of document.querySelectorAll('[data-lab-tab]')){
  const selected=b.dataset.labTab===tab;b.setAttribute('aria-current',selected?'page':'false');b.classList.toggle('active263',selected);
 }
 for(const panel of document.querySelectorAll('[data-lab-panel]'))panel.hidden=panel.dataset.labPanel!==tab;
 render();
}
function render(){({users:renderUsers,areas:renderAreas,history:renderHistory,access:renderAccess,settings:renderSettings,notifications:renderNotifications}[current]||renderUsers)()}
function changeNotice(){message('Cambios guardados SOLO en este navegador y SOLO dentro de la simulación v263. No se enviaron a Supabase.');}
function renderUsers(){
 const users=lab.get().users,holder=$('labUserList263');holder.replaceChildren();
 $('labUserCount263').textContent=users.length+' cuentas ficticias';
 for(const u of users){
  const card=el('article',undefined,'lab-row263');
  const name=el('input');name.value=u.nombre;name.maxLength=150;name.setAttribute('aria-label','Nombre de '+u.nombre);
  const active=el('select');for(const [v,title]of [['true','Activo'],['false','Inactivo']]){const op=new Option(title,v);active.add(op)}active.value=String(u.activo);active.setAttribute('aria-label','Estado de '+u.nombre);
  const title=el('div',undefined,'lab-user-name263');title.append(el('strong',u.nombre),el('small',(roles[u.rol]||u.rol)+' · '+Object.keys(u.ambitos||{}).filter(m=>u.ambitos[m]?.ver===true).map(label).join(' / ')));
  const actions=el('div',undefined,'lab-row-actions263');
  actions.append(btn('Guardar datos',()=>safe(()=>{lab.updateUser(u.usuario_id,name.value,active.value==='true');changeNotice();renderUsers()})));
  actions.append(btn('Rol y facultades',()=>root.Hys242Facultades.openFor(u.usuario_id)));
  card.append(title,name,active,actions);holder.append(card);
 }
}
function renderAreas(){
 const data=lab.get(),list=$('labAreaList263');list.replaceChildren();
 for(const m of MODULES){
  const box=el('section',undefined,'lab-group263'),h=el('h3',label(m));box.append(h);
  for(const a of data.areas.filter(a=>a.modulo===m)){
   const line=el('div',undefined,'lab-area-row263');
   const name=el('input');name.value=a.nombre;name.maxLength=100;name.setAttribute('aria-label','Nombre del área '+a.nombre);
   const act=el('select');for(const [v,txt]of [['true','Activa'],['false','Inactiva']])act.add(new Option(txt,v));act.value=String(a.activa);
   line.append(name,act,btn('Guardar área',()=>safe(()=>{lab.updateArea(a.id,name.value,act.value==='true');changeNotice();renderAreas()})));
   box.append(line);
  }
  list.append(box);
 }
}
function renderHistory(){
 const history=lab.get().history,host=$('labHistoryList263');host.replaceChildren();
 $('labHistoryCount263').textContent=history.length+' acciones registradas en la simulación';
 if(!history.length)host.append(el('p','Todavía no se han guardado cambios de prueba.'));
 for(const event of history){
  const card=el('article',undefined,'lab-history-row263');
  card.append(el('strong',event.accion),el('p',(new Date(event.fecha)).toLocaleString('es-CL')+' · '+event.usuario),el('small',event.motivo||'Sin motivo'));
  host.append(card);
 }
}
function renderAccess(){
 const state=lab.get(),sel=$('labAccessUser263'),previous=sel.value;
 sel.replaceChildren(...state.users.map(u=>new Option(u.nombre,u.usuario_id)));
 if(state.users.some(x=>x.usuario_id===previous))sel.value=previous;
 paintAccess();
}
function paintAccess(){
 const state=lab.get(),u=state.users.find(x=>x.usuario_id===$('labAccessUser263').value),host=$('labAccessResult263');
 host.replaceChildren();if(!u)return;
 host.append(el('h3',u.nombre),el('p','Rol: '+(roles[u.rol]||u.rol)+' · '+(u.activo?'Cuenta activa':'Cuenta inactiva')));
 const both=el('div',undefined,'lab-two-cards263');
 for(const m of MODULES){
  const card=el('article',undefined,'lab-access-card263'),a=u.ambitos?.[m];
  card.append(el('strong',label(m)));
  if(!u.activo||!a?.ver){card.append(el('p','Tarjeta oculta para esta cuenta.'))}
  else{
   card.append(el('p',(a.editar?'Puede registrar y editar':'Solo consulta')+' · '+(a.areas||[]).length+' áreas'));
   const names=state.areas.filter(x=>a.areas?.includes(x.id)&&x.modulo===m).map(x=>x.nombre).join(', ');
   card.append(el('small',names||'Sin áreas'));
   if(u.rol==='administrador_area'){
    const fac=state.faculties.find(x=>x.usuario_id===u.usuario_id&&x.modulo===m);
    card.append(el('p','Facultades especiales: '+(Object.keys(fac?.facultades||{}).filter(k=>fac.facultades[k]).join(', ')||'Ninguna')));
   }
  }
  both.append(card);
 }
 host.append(both);
}
const PREFKEY='reportes-hys-v263-lab-preferencias';
function prefs(){try{return JSON.parse(localStorage.getItem(PREFKEY)||'{}')}catch{return {}}}
function savePrefs(value){localStorage.setItem(PREFKEY,JSON.stringify(value));renderSettings();changeNotice()}
function renderSettings(){
 const p=prefs();
 $('labPhotoSize263').value=p.photoSize||'medium';
 $('labPhotosRow263').value=String(p.photosRow||3);
 $('labContrast263').value=p.contrast||'normal';
 const sample=$('labPhotoSample263');sample.style.gridTemplateColumns='repeat('+($('labPhotosRow263').value)+',minmax(0,1fr))';sample.dataset.photoSize=$('labPhotoSize263').value;
 document.body.classList.toggle('lab-high-contrast263',p.contrast==='high');
}
function renderNotifications(){
 const host=$('labNotificationList263'),list=lab.get().history.slice(0,8);
 host.replaceChildren();
 if(!list.length)host.append(el('p','Todavía no se generaron acciones de prueba.'));
 for(const event of list)host.append(el('article',event.accion+' · '+event.usuario,'lab-history-row263'));
}
for(const n of document.querySelectorAll('[data-lab-tab]'))n.onclick=()=>navigate(n.dataset.labTab);
$('labNewUser263').onsubmit=e=>{e.preventDefault();safe(()=>{lab.createUser($('labNewUserName263').value);$('labNewUserName263').value='';changeNotice();renderUsers()})};
$('labNewArea263').onsubmit=e=>{e.preventDefault();safe(()=>{lab.newArea($('labNewAreaModule263').value,$('labNewAreaName263').value);$('labNewAreaName263').value='';changeNotice();renderAreas()})};
$('labAccessUser263').onchange=paintAccess;
$('labPrefs263').onsubmit=e=>{e.preventDefault();savePrefs({photoSize:$('labPhotoSize263').value,photosRow:Number($('labPhotosRow263').value),contrast:$('labContrast263').value})};
$('labReset263').onclick=()=>{if(!confirm('¿Reiniciar todos los usuarios, áreas y facultades FICTICIOS de v263? No afecta a Reportes HYS real.'))return;lab.reset();localStorage.removeItem(PREFKEY);changeNotice();render()};
$('labOpenFaculties263').onclick=()=>root.Hys242Facultades.openFor();
root.addEventListener('hys263-lab-changed',()=>{if(current==='users'||current==='areas'||current==='history'||current==='access'||current==='notifications')render()});
navigate('users');
})(window);
