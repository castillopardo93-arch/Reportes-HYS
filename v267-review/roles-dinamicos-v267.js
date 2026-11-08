/* v267 — Catálogo de roles de desarrollo. No concede permisos reales ni modifica Supabase. */
(function(root){
'use strict';
if(new URLSearchParams(location.search).get('embedded')==='otros')return;
const KEY='reportes-hys-v267-roles-local';
const CAPS=[['view','Consultar informes ajenos'],['pdf','Descargar PDF ajeno'],['review','Revisar y devolver'],['approve','Aprobar informes'],['close','Cerrar informes'],['editOthers','Modificar informes ajenos'],['areas','Administrar áreas'],['users','Administrar usuarios'],['activation','Activar/desactivar cuentas'],['audit','Consultar auditoría']];
const SCOPES=[['APR','Prevencionistas'],['OTROS','Supervisores, capataces y otros']];
const $=id=>document.getElementById(id);
const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>String(s||'').trim().replace(/\s+/g,' ');
const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x.filter(r=>r&&typeof r.id==='string'):[]}catch{return []}};
let items=read(),selected=null;
const isGlobal=()=>root.HYS266_PREVIEW_ONLY===true&&(root.__REPORTES_HYS_ACCESS__?.profile?.rol==='administrador_global'&&root.__REPORTES_HYS_ACCESS__?.profile?.activo===true||!root.__REPORTES_HYS_ACCESS__);
const css=document.createElement('style');css.textContent=`
#hys267RolesPanel{position:fixed;inset:0;z-index:99990;background:#0b203b99;overflow:auto;padding:32px 12px}
#hys267RolesPanel[hidden]{display:none!important}
.hys267-shell{background:#fff;max-width:850px;margin:0 auto;border-radius:15px;padding:24px;color:#173d68;box-shadow:0 14px 50px #122c4a44}
.hys267-head{display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap}
.hys267-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.hys267-shell label{display:block;margin:10px 0 5px;font-weight:600}
.hys267-shell input[type=text],.hys267-shell select{width:100%;padding:10px;border:1px solid #a7c5df;border-radius:7px}
.hys267-shell fieldset{border:1px solid #c9def5;border-radius:9px;margin:14px 0;padding:12px}
.hys267-shell fieldset label{font-weight:400}
.hys267-actions{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}
.hys267-actions button,.hys267-head button{border:1px solid #a7c5df;border-radius:7px;background:#eef6ff;color:#123b63;padding:9px 13px}
.hys267-shell .primary{background:#1766b5;color:white}
.hys267-note{background:#fff7e7;border-left:4px solid #c27a0b;padding:10px;margin:12px 0}
.hys267-shell .muted{color:#617d9e}
@media(max-width:600px){.hys267-grid{grid-template-columns:1fr}.hys267-shell{padding:14px}}
`;document.head.append(css);
const panel=document.createElement('section');panel.id='hys267RolesPanel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Roles y facultades de desarrollo');
panel.innerHTML='<div class="hys267-shell"><div class="hys267-head"><div><h2>Roles y facultades</h2><p class="muted">Catálogo personalizable · v267</p></div><button id="hys267Close" type="button">Cerrar</button></div><p class="hys267-note">Modo de desarrollo: los roles se guardan únicamente en este navegador. No asignan permisos reales, no crean usuarios y no se sincronizan con Supabase.</p><div id="hys267Body"></div><p id="hys267Status" role="status"></p></div>';
document.body.append(panel);
const status=t=>{$('hys267Status').textContent=t};
function form(data){
const d=data||{id:'',name:'',base:'supervisor',modules:['APR'],caps:[],active:true};
$('hys267Body').innerHTML=`<div class="hys267-grid"><div><label for="hys267Name">Nombre del rol</label><input id="hys267Name" type="text" maxlength="70" value="${safe(d.name)}"></div><div><label for="hys267Base">Plantilla inicial</label><select id="hys267Base"><option value="usuario">Usuario</option><option value="supervisor">Supervisor</option><option value="personalizado">Personalizado</option></select></div></div><fieldset><legend>Tarjetas permitidas</legend>${SCOPES.map(([id,label])=>`<label><input type="checkbox" data-scope="${id}" ${d.modules.includes(id)?'checked':''}> ${label}</label>`).join('')}</fieldset><fieldset><legend>Facultades solicitadas (no efectivas en producción)</legend><div class="hys267-grid">${CAPS.map(([id,label])=>`<label><input type="checkbox" data-cap="${id}" ${d.caps.includes(id)?'checked':''}> ${label}</label>`).join('')}</div></fieldset><label><input id="hys267Active" type="checkbox" ${d.active?'checked':''}> Rol activo</label><div class="hys267-actions"><button class="primary" id="hys267Save" type="button">Guardar borrador</button><button id="hys267Duplicate" type="button">Duplicar</button><button id="hys267Deactivate" type="button">Desactivar</button><button id="hys267New" type="button">Nuevo rol</button></div><label for="hys267List">Roles creados en este navegador</label><select id="hys267List"><option value="">Seleccionar un rol</option>${items.map(r=>`<option value="${safe(r.id)}">${safe(r.name)} ${r.active?'':'(inactivo)'}</option>`).join('')}</select>`;
$('hys267Base').value=d.base;
$('hys267List').value=d.id;
$('hys267List').onchange=e=>{selected=items.find(x=>x.id===e.target.value)||null;form(selected)};
$('hys267New').onclick=()=>{selected=null;form(null);status('Nuevo borrador')};
$('hys267Save').onclick=save;
$('hys267Duplicate').onclick=()=>{const x=collect();x.id='';x.name=normalize(x.name)+' (copia)';selected=null;form(x);status('Copia preparada. Guárdala con un nombre único.')};
$('hys267Deactivate').onclick=()=>{if(!selected)return status('Selecciona un rol guardado');if(!confirm('¿Desactivar este rol local?'))return;selected.active=false;selected.updated=new Date().toISOString();persist();form(selected);status('Rol desactivado en catálogo local')};
}
function collect(){return {id:selected?.id||'',name:normalize($('hys267Name').value),base:$('hys267Base').value,modules:[...panel.querySelectorAll('[data-scope]:checked')].map(x=>x.dataset.scope),caps:[...panel.querySelectorAll('[data-cap]:checked')].map(x=>x.dataset.cap),active:$('hys267Active').checked}};
function persist(){localStorage.setItem(KEY,JSON.stringify(items))}
function save(){
if(!isGlobal())return status('Acceso no autorizado');
const x=collect();
if(x.name.length<3)return status('El nombre debe tener al menos 3 caracteres');
if(!x.modules.length)return status('Selecciona al menos una tarjeta');
if(items.some(r=>r.id!==x.id&&r.name.toLocaleLowerCase('es')===x.name.toLocaleLowerCase('es')))return status('Ya existe un rol con ese nombre');
if(x.caps.includes('users')&&!x.caps.includes('audit'))return status('Para solicitar gestión de usuarios también debes seleccionar auditoría');
x.id=x.id||'rol-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
x.updated=new Date().toISOString();
const i=items.findIndex(r=>r.id===x.id);if(i<0)items.push(x);else items[i]=x;
selected=x;persist();form(x);status('Borrador guardado localmente. No concede permisos reales.');
}
$('hys267Close').onclick=()=>{panel.hidden=true};
function mount(){
const rail=$('hysToolsOptions');if(!rail||$('hys267Open'))return;
const b=document.createElement('button');b.id='hys267Open';b.type='button';b.className='hys-admin-open';b.hidden=true;
b.innerHTML='<span class="tools-option-icon" aria-hidden="true">♙</span><span class="tools-option-label">Roles</span><span class="tools-option-full">Roles y facultades</span>';
rail.append(b);
b.onclick=()=>{if(!isGlobal())return;const userPanel=$('hys265UsersPanel');if(userPanel&&!userPanel.hidden){status('Cierra primero Gestión de usuarios');return}items=read();selected=null;form(null);panel.hidden=false;status('')};
const sync=()=>{b.hidden=!isGlobal()};
new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
document.addEventListener('click',sync);sync();
}
mount();
root.Hys267RoleCatalog={read:()=>read().map(r=>({...r})),capabilities:CAPS.map(x=>x[0]),storageKey:KEY};
})(window);
