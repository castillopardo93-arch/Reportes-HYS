/* Reportes HYS v244 — etapa E, maqueta segura de fichas, ámbitos y áreas.
 * SOLO interfaz: no usa red, bases de datos, auth real, RLS ni registro auditado.
 * En desarrollo sin backend queda bloqueada; la demo usa únicamente personas ficticias.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLES=['administrador_global','administrador_area','supervisor','usuario'];
const MODULES=['APR','OTROS'];
const uuid=x=>typeof x==='string'&&UUID.test(x);
const clean=(x,max=160)=>String(x??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
function validScope(s){
 return !!(s&&typeof s==='object'&&!Array.isArray(s)&&uuid(s.organizationId)&&uuid(s.projectId)&&MODULES.includes(s.module)&&uuid(s.areaId));
}
function sameScope(a,b){
 return validScope(a)&&validScope(b)&&a.organizationId.toLowerCase()===b.organizationId.toLowerCase()&&a.projectId.toLowerCase()===b.projectId.toLowerCase()&&a.module===b.module&&a.areaId.toLowerCase()===b.areaId.toLowerCase();
}
function validateContact(value){
 const cargo=clean(value?.cargo,100),telefono=clean(value?.telefono,24),correo=clean(value?.correo,180);
 const preferencia=clean(value?.preferencia,20)||'ninguno';
 if(telefono&&!/^\+?[0-9][0-9 \-]{6,21}$/.test(telefono))throw Error('Teléfono no válido. Usa un número de 7 a 22 caracteres.');
 if(correo&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))throw Error('Correo electrónico no válido.');
 if(!['ninguno','correo','telefono'].includes(preferencia))throw Error('Preferencia de contacto no reconocida.');
 if(preferencia==='correo'&&!correo)throw Error('Para preferir correo primero indica una dirección.');
 if(preferencia==='telefono'&&!telefono)throw Error('Para preferir teléfono primero indica un número.');
 return {cargo,telefono,correo,preferencia};
}
function normalizePerson(person){
 if(!uuid(person?.userId)||!ROLES.includes(person?.role)||!clean(person?.name)||!validScope(person?.scope))return null;
 return {userId:person.userId.toLowerCase(),name:clean(person.name),role:person.role,scope:{...person.scope},
  ...validateContact(person)};
}
function normalizeArea(a){
 if(!uuid(a?.areaId)||!uuid(a?.organizationId)||!uuid(a?.projectId)||!MODULES.includes(a?.module))return null;
 const nombre=clean(a?.nombre,70);
 if(nombre.length<2||nombre.length>70||typeof a?.activa!=='boolean')return null;
 return {areaId:a.areaId.toLowerCase(),organizationId:a.organizationId.toLowerCase(),
 projectId:a.projectId.toLowerCase(),module:a.module,nombre,activa:a.activa};
}
function uniqueAreaName(areas,entry,omitId){
 return !areas.some(a=>a.areaId!==omitId&&a.organizationId===entry.organizationId&&
 a.projectId===entry.projectId&&a.module===entry.module&&a.nombre.toLocaleLowerCase('es')===entry.nombre.toLocaleLowerCase('es'));
}
let demo=null,display=null;
function setPreviewData(data){
 if(root.HYS244_REVIEW_ONLY!==true)throw Error('Las fichas de pruebas solo están disponibles en la demostración aislada.');
 if(!data||!Array.isArray(data.people)||!Array.isArray(data.areas))throw Error('La demostración requiere datos ficticios.');
 demo={people:data.people.map(normalizePerson).filter(Boolean),
       areas:data.areas.map(normalizeArea).filter(Boolean)};
}
function el(tag,text,className){
 const d=root.document.createElement(tag);
 if(text!==undefined&&text!==null)d.textContent=String(text);
 if(className)d.className=className;
 return d;
}
function rowLabel(label,control){
 const wrap=el('label',label);
 wrap.append(control);
 return wrap;
}
function mount({host,module}={}){
 if(!root.document||!host||!MODULES.includes(module))return null;
 const rootNode=el('details',null,'hys244-people-panel');
 rootNode.id='hys244PeoplePanel';rootNode.append(el('summary','▣ Usuarios, perfiles y áreas operativas · diseño de pruebas'));
 const content=el('div',null,'hys244-people-content');
 const expl=el('p','E01–E05. Área operativa no es igual al área que autoriza el acceso a APR u OTROS. Esta sección no conecta, autoriza, audita ni modifica cuentas reales.','hys244-safety-note');
 const cards=el('div',null,'hys244-people-grid');
 const peopleCard=el('section',null,'hys244-people-card');
 peopleCard.append(el('h3','Fichas de usuarios · E01 / E02'));
 const personSelect=el('select');personSelect.setAttribute('aria-label','Persona ficticia');
 const cargo=el('input');cargo.maxLength=100;cargo.placeholder='Cargo o función';
 const telefono=el('input');telefono.maxLength=24;telefono.placeholder='Ej.: +56 9 1234 5678';
 const correo=el('input');correo.type='email';correo.maxLength=180;correo.placeholder='ejemplo@dominio.test';
 const preferencia=el('select');for(const [v,t] of [['ninguno','Sin preferencia'],['correo','Correo'],['telefono','Teléfono']])preferencia.add(new Option(t,v));
 const personScope=el('p',null,'hys244-scope');
 const personStatus=el('p',null,'hys244-status');personStatus.setAttribute('role','status');
 const savePerson=el('button','Guardar solo en la demostración');savePerson.type='button';
 peopleCard.append(rowLabel('Persona',personSelect),personScope,rowLabel('Cargo',cargo),rowLabel('Teléfono',telefono),rowLabel('Correo',correo),rowLabel('Contacto preferido',preferencia),savePerson,personStatus);
 const areaCard=el('section',null,'hys244-people-card');
 areaCard.append(el('h3','Áreas operativas · E04'));
 const areaNote=el('p','Las áreas operativas pertenecen a una organización, proyecto y módulo. No cambian los permisos de acceso ni los desplegables actuales.');
 const areaList=el('div',null,'hys244-area-list');
 const areaName=el('input');areaName.maxLength=70;areaName.placeholder='Nombre del área de ejemplo';areaName.setAttribute('aria-label','Nombre de área operativa');
 const addArea=el('button','Añadir área de prueba');addArea.type='button';
 const areaStatus=el('p',null,'hys244-status');areaStatus.setAttribute('role','status');
 areaCard.append(areaNote,areaList,rowLabel('Nueva área operativa',areaName),addArea,areaStatus);
 cards.append(peopleCard,areaCard);
 const scopeCard=el('section',null,'hys244-contract');
 scopeCard.append(el('h3','Permisos y auditoría · E03 / E05'));
 scopeCard.append(el('p','Los siguientes atributos se exigen en cada operación futura: organización, proyecto, módulo, área, usuario, rol y permiso vigente. Ningún botón de esta pantalla concede permisos.'));
 const roles=el('p','Roles previstos: administrador global · administrador de área · supervisor · usuario. La validación se hará en servidor, no desde esta maqueta.');
 scopeCard.append(roles);
 const audit=el('details');audit.append(el('summary','Historial de auditoría central'));
 audit.append(el('p','Sin conexión de auditoría. No hay eventos confirmados por servidor. No se generan eventos ficticios ni se simula un cierre.'));
 scopeCard.append(audit);
 content.append(expl,cards,scopeCard);rootNode.append(content);host.append(rootNode);
 const active=demo&&root.HYS244_REVIEW_ONLY===true;
 let people=active?demo.people.filter(p=>p.scope.module===module):[];
 let areas=active?demo.areas.filter(a=>a.module===module):[];
 if(!active){personSelect.disabled=true;savePerson.disabled=true;areaName.disabled=true;addArea.disabled=true;
  personStatus.textContent='Sin directorio aislado. No se pueden consultar o modificar fichas reales.';
  areaStatus.textContent='Gestión de áreas operativas deshabilitada hasta conectar el servidor autorizado.';
 }
 function fill(){
  const person=people.find(p=>p.userId===personSelect.value);
  for(const input of [cargo,telefono,correo,preferencia])input.disabled=!active||!person;
  savePerson.disabled=!active||!person;
  cargo.value=person?.cargo||'';telefono.value=person?.telefono||'';correo.value=person?.correo||'';preferencia.value=person?.preferencia||'ninguno';
  personScope.textContent=person?'Rol: '+person.role+' · Módulo: '+person.scope.module+' · Ámbito de pruebas: proyecto/área separados':'No hay persona seleccionada.';
 }
 function drawPeople(){
  personSelect.replaceChildren();
  if(!people.length)personSelect.add(new Option('Sin personas de demostración',''));
  for(const p of people)personSelect.add(new Option(p.name,p.userId));
  fill();
 }
 function drawAreas(){
  areaList.replaceChildren();
  if(!areas.length){areaList.append(el('p','Sin áreas de demostración.'));return;}
  for(const area of areas){
   const row=el('div',null,'hys244-area-row');
   const status=el('span',area.activa?'Activa':'Inactiva','hys244-area-status');
   row.append(el('strong',area.nombre),status);
   if(active){
    const rename=el('button','Editar');rename.type='button';
    const toggle=el('button',area.activa?'Desactivar':'Reactivar');toggle.type='button';
    rename.addEventListener('click',()=>{
     const newName=root.prompt?.('Nuevo nombre de área operativa (solo demostración):',area.nombre);
     if(newName===null||newName===undefined)return;
     const candidate=normalizeArea({...area,nombre:newName});
     if(!candidate||!uniqueAreaName(areas,candidate,area.areaId)){areaStatus.textContent='Nombre inválido, duplicado o fuera de alcance.';return;}
     area.nombre=candidate.nombre;drawAreas();areaStatus.textContent='Nombre actualizado solo en memoria de esta demostración.';
    });
    toggle.addEventListener('click',()=>{area.activa=!area.activa;drawAreas();areaStatus.textContent='Estado actualizado solo en la demostración.';});
    row.append(rename,toggle);
   }areaList.append(row);
  }
 }
 personSelect.addEventListener('change',fill);
 savePerson.addEventListener('click',()=>{
  if(!active)return;
  const p=people.find(p=>p.userId===personSelect.value);if(!p)return;
  try{Object.assign(p,validateContact({cargo:cargo.value,telefono:telefono.value,correo:correo.value,preferencia:preferencia.value}));
    personStatus.textContent='Ficha ficticia actualizada en memoria. Se perderá al recargar; no se sincronizó ni auditó.';
  }catch(e){personStatus.textContent=e.message||'Datos de contacto incorrectos.';}
 });
 addArea.addEventListener('click',()=>{
  if(!active)return;
  const first=areas[0]||demo.areas.find(a=>a.module===module);
  if(!first){areaStatus.textContent='Falta definir un ámbito de proyecto ficticio para crear áreas.';return;}
  const id=root.crypto?.randomUUID?.();
  const proposed=normalizeArea({...first,areaId:id,nombre:areaName.value,activa:true});
  if(!proposed||!uniqueAreaName(areas,proposed)){areaStatus.textContent='Nombre no válido o repetido en el mismo proyecto y módulo.';return;}
  areas.push(proposed);areaName.value='';drawAreas();areaStatus.textContent='Área añadida solo a la demostración. No altera tablas ni permisos.';
 });
 if(active){personStatus.textContent='Personas ficticias: '+people.length+'. Ediciones locales no persistentes.';areaStatus.textContent='Áreas ficticias del módulo '+module+'. No modifica desplegables actuales.';}
 drawPeople();drawAreas();display=rootNode;return rootNode;
}
const api={validScope,sameScope,validateContact,normalizePerson,normalizeArea,uniqueAreaName,setPreviewData,mount};
root.Hys244People=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
