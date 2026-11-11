/* Reportes HYS — Investigación de accidentes, v305.
   Acceso visual inicial. El formulario y el almacenamiento aún NO están habilitados.
   No se ejecutan RPC, escrituras, ni se leen datos personales de terceros. */
(function(root){
 'use strict';
 const d=root.document;
 if(!d||new URLSearchParams(root.location.search).get('embedded')==='otros')return;
 const review=/\/v305-review\/index\.html$/i.test(root.location.pathname)
  &&new URLSearchParams(root.location.search).get('revision')==='accidentes';
 const nav=d.getElementById('hysToolsOptions')||(review?d.createElement('nav'):null);
 if(!nav)return;
 const $=id=>d.getElementById(id);
 const access=()=>root.__REPORTES_HYS_ACCESS__;
 const authorized=()=>access()?.profile?.activo===true&&
  access().profile.rol==='administrador_global'&&
  !access().selectedModule&&d.body.classList.contains('module-choice');
 const visible=()=>review||authorized();
 const b=d.createElement('button');
 b.id='hys305OpenAccidents';
 b.className='hys-admin-open';
 b.type='button';
 b.setAttribute('aria-label','Investigación de accidentes');
 b.title='Investigación de accidentes';
 b.hidden=true;
 b.innerHTML='<span class="tools-option-icon" aria-hidden="true">⌕</span><span class="tools-option-label">Accidentes</span><span class="tools-option-full">Investigación de accidentes</span>';
 const place=()=>{
  const appearance=$('appearanceOpen242');
  const pillars=$('hys285OpenPillars');
  if(appearance&&appearance.parentElement===nav)nav.insertBefore(b,appearance);
  else if(pillars&&pillars.parentElement===nav)pillars.insertAdjacentElement('afterend',b);
  else if(b.parentElement!==nav)nav.append(b);
 };
 const panel=d.createElement('section');
 panel.id='hys305Investigation';
 panel.hidden=true;
 panel.setAttribute('role','dialog');
 panel.setAttribute('aria-modal','true');
 panel.setAttribute('aria-labelledby','hys305Title');
 panel.innerHTML=[
 '<div class="hys305-shell">',
 '<header class="hys305-heading"><div>',
 '<p class="hys305-eyebrow">REPORTES HYS · ADMINISTRADOR GENERAL</p>',
 '<h1 id="hys305Title">Investigación de accidentes</h1>',
 '<p>Registro, análisis de causas, medidas correctivas, seguimiento y verificación de cierre.</p>',
 '</div><button id="hys305Close" type="button" aria-label="Cerrar Investigación de accidentes">Cerrar ✕</button></header>',
 '<main class="hys305-content">',
 '<div class="hys305-notice" role="status"><strong>Módulo en preparación</strong><p>El acceso ya forma parte del Administrador General. Definiremos el formulario de investigación antes de habilitar registros, documentos y operaciones reales.</p></div>',
 '<section aria-labelledby="hys305ManagementTitle"><h2 id="hys305ManagementTitle">Gestión de investigaciones</h2>',
 '<div class="hys305-overview">',
 '<article><span>Investigaciones abiertas</span><strong>—</strong><small>Sin consolidación disponible</small></article>',
 '<article><span>En análisis de causas</span><strong>—</strong><small>Sin consolidación disponible</small></article>',
 '<article><span>Acciones pendientes</span><strong>—</strong><small>Sin consolidación disponible</small></article>',
 '<article><span>Pendientes de cierre</span><strong>—</strong><small>Sin consolidación disponible</small></article>',
 '</div></section>',
 '<section aria-labelledby="hys305StructureTitle" class="hys305-structure">',
 '<div class="hys305-section-head"><div><h2 id="hys305StructureTitle">Estructura propuesta</h2><p>Organizada por etapas, pendiente de adaptar a tu formulario oficial.</p></div><span class="hys305-stage-tag">6 secciones</span></div>',
 '<div class="hys305-grid">',
 '<article><span>01</span><h3>Antecedentes del evento</h3><p>Fecha, ubicación, turno, empresa y clasificación del suceso.</p></article>',
 '<article><span>02</span><h3>Personas involucradas</h3><p>Participantes y testigos, con datos personales protegidos.</p></article>',
 '<article><span>03</span><h3>Descripción y evidencias</h3><p>Secuencia de hechos, registros y fotografías con respaldo.</p></article>',
 '<article><span>04</span><h3>Análisis de causas</h3><p>Factores inmediatos, organizacionales y metodología elegida.</p></article>',
 '<article><span>05</span><h3>Medidas preventivas</h3><p>Acciones, responsables, compromisos y fechas de control.</p></article>',
 '<article><span>06</span><h3>Verificación y cierre</h3><p>Comprobación de eficacia, aprobación e historial auditado.</p></article>',
 '</div></section>',
 '<div class="hys305-actions"><button type="button" disabled title="Disponible cuando se apruebe el formulario">Nueva investigación (pendiente)</button><p>La creación y consulta de investigaciones no están conectadas a Supabase. No se generan datos ficticios ni se alteran informes existentes.</p></div>',
 '</main></div>'
 ].join('');
 d.body.append(panel);
 let previousFocus=null;
 function open(){
  if(!visible())return false;
  const users=$('hys265UsersPanel');
  if(!review&&users&&!users.hidden&&root.Hys265UserManagement?.close?.()===false)return false;
  const appearance=$('appearancePanel242');
  if(!review&&appearance&&!appearance.hidden){
   $('appearanceClose242')?.click();
   if(!appearance.hidden)return false;
  }
  root.Hys285Pillars?.close?.();
  previousFocus=d.activeElement;
  panel.hidden=false;
  $('hys305Close').focus({preventScroll:true});
  return true;
 }
 function close(){
  if(panel.hidden)return true;
  panel.hidden=true;
  if(b.isConnected&&!b.hidden&&visible())b.focus({preventScroll:true});
  else if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  return true;
 }
 function sync(){
  place();
  const yes=visible();
  b.hidden=!yes;
  if(yes)b.style.removeProperty('display');
  else b.style.display='none';
  if(!yes&&!panel.hidden)close();
 }
 b.onclick=()=>open();
 $('hys305Close').onclick=()=>close();
 d.addEventListener('keydown',e=>{
  if(!panel.hidden&&e.key==='Escape'){e.preventDefault();close()}
 });
 nav.addEventListener('click',e=>{
  if(e.target.closest('button')!==b&&!panel.hidden)close();
 },true);
 root.addEventListener('reportes-hys-access-changing',()=>{close();sync()});
 root.addEventListener('reportes-hys-access-changed',sync);
 const old=root.reportesHysAdminSync;
 root.reportesHysAdminSync=()=>{old?.();sync()};
 root.Hys305Investigation={open,close,sync,isReview:review,planned:true};
 sync();
 if(review)open();
})(window);
