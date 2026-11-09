/* Reportes HYS v285 · Pilares e Indicadores. Solo lectura y diseño; sin cálculos simulados. */
(function(root){
'use strict';
const d=root.document;
if(!d||new URLSearchParams(location.search).get('embedded')==='otros')return;
const nav=d.getElementById('hysToolsOptions');
if(!nav)return;
const preview=/\/pilares-indicadores-preview-v285\.html$/i.test(location.pathname);
const a=()=>root.__REPORTES_HYS_ACCESS__;
const allowed=()=>preview||(
 a()?.profile?.activo===true&&a().profile.rol==='administrador_global'&&
 !a().selectedModule&&d.body.classList.contains('module-choice'));
const el=(tag,cls,text)=>{const x=d.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x};
const $=id=>d.getElementById(id);
const pillars=[
 {id:'eficiencia',num:'01',icon:'◷',title:'Eficiencia en terreno',desc:'Menos tareas administrativas, más tiempo para la prevención.',goal:'Medir el ahorro operativo y simplificar la preparación de informes.',metrics:[
  ['Tiempo de elaboración','Finalización menos inicio del informe, con horas del servidor.','Eventos de creación y finalización.'],
  ['Informes finalizados','Cantidad de informes finalizados y validados en el período.','Informes centrales y estado auditado.'],
  ['Ahorro administrativo','Tiempo base previo menos tiempo medido con Reportes HYS.','Línea base e historial de creación y cierre.']]},
 {id:'cumplimiento',num:'02',icon:'✓',title:'Gestión y cumplimiento',desc:'Compromisos con responsable, plazo y resultado verificable.',goal:'Controlar vencimientos y resultados de acciones correctivas.',metrics:[
  ['Compromisos vencidos','Acciones con plazo vencido y sin verificación confirmada.','Fecha compromiso y eventos de verificación.'],
  ['Cumplimiento a tiempo','Acciones verificadas dentro de plazo / acciones exigibles × 100.','Fechas, estados y trazabilidad de acciones.'],
  ['Tiempo medio de cierre','Promedio entre detección y cierre formal verificado.','Eventos de creación y cierre.']]},
 {id:'indicadores',num:'03',icon:'▥',title:'Indicadores de gestión',desc:'Información de terreno transformada en decisiones.',goal:'Identificar tendencias y prioridades a través de indicadores confiables.',metrics:[
  ['Hallazgos registrados','Total de hallazgos válidos del período seleccionado.','Informe, fecha, hallazgo y área.'],
  ['Hallazgos abiertos','Hallazgos sin cierre formal verificado.','Registro de hallazgos y cierres.'],
  ['Distribución por área y riesgo','Agrupación de hallazgos según área y código de riesgo.','Áreas y catálogo de riesgos.']]},
 {id:'documental',num:'04',icon:'▣',title:'Gestión documental',desc:'Documentos y evidencias protegidos y localizables.',goal:'Mantener disponibles los documentos, respaldos y versiones.',metrics:[
  ['Informes respaldados','Finalizados con copia central confirmada / total finalizados × 100.','Almacenamiento y confirmación del servidor.'],
  ['Evidencia documental completa','Acciones con evidencia válida / acciones que la requieren × 100.','Adjuntos y obligación de evidencia.'],
  ['Historial íntegro','Informes con identidad estable e historial de versiones.','Auditoría y almacenamiento documental.']]},
 {id:'seguridad',num:'05',icon:'⬡',title:'Seguridad y trazabilidad',desc:'Cada intervención vinculada a usuarios y autorizaciones.',goal:'Asegurar responsabilidades y verificaciones demostrables.',metrics:[
  ['Asignaciones identificadas','Acciones con usuario responsable válido / total que exige responsable × 100.','Identidad y asignaciones.'],
  ['Notificaciones entregadas','Notificaciones confirmadas / notificaciones exigibles × 100.','Eventos reales del servicio de notificaciones.'],
  ['Auditoría completa','Acciones con actor, fecha y evento de verificación confirmados.','Bitácora inalterable.']]},
 {id:'mejora',num:'06',icon:'↻',title:'Mejora continua',desc:'Disminuir recurrencias y evaluar la eficacia de las medidas.',goal:'Detectar oportunidades de prevención sobre la base del seguimiento.',metrics:[
  ['Reincidencia potencial','Hallazgos similares por área, riesgo y ventana temporal por definir.','Riesgos codificados, fechas y áreas.'],
  ['Eficacia de medidas','Medidas que superan revisión posterior / medidas reevaluadas × 100.','Verificaciones y seguimiento posterior.'],
  ['Riesgos más repetidos','Frecuencia de cada riesgo en los informes seleccionados.','Riesgos asociados a hallazgos.']]}
];
const button=el('button','hys-admin-open');button.id='hys285OpenPillars';button.type='button';button.hidden=true;
button.setAttribute('aria-label','Pilares e Indicadores');
const glyph=el('span','tools-option-icon','▥');glyph.setAttribute('aria-hidden','true');
button.append(glyph,el('span','tools-option-label','Pilares'),el('span','tools-option-full','Pilares e Indicadores'));
nav.append(button);
const panel=el('section');panel.id='hys285PillarsPanel';panel.hidden=true;
panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','hys285Title');
panel.innerHTML=[
 '<div class="hys285-shell"><header class="hys285-head"><div class="hys285-headline"><div>',
 '<p class="hys285-overline">REPORTES HYS · ADMINISTRACIÓN GENERAL</p>',
 '<h1 id="hys285Title">Pilares e Indicadores</h1>',
 '<p class="hys285-lead">Una visión estratégica de la prevención: detectar, comunicar, corregir, verificar y mejorar a partir de los registros de terreno.</p>',
 '</div><button type="button" class="hys285-close" id="hys285Close">Cerrar ✕</button></div>',
 '<div class="hys285-vision" aria-label="Ciclo de mejora"><span>Detectar</span><span>Comunicar</span><span>Corregir</span><span>Verificar</span><span>Mejorar</span></div></header>',
 '<div class="hys285-content"><div class="hys285-toolbar" role="group" aria-label="Filtros del panel">',
 '<label class="hys285-filter">Período<select id="hys285Period"><option value="month">Mes actual</option><option value="quarter">Últimos 3 meses</option><option value="year">Últimos 12 meses</option></select></label>',
 '<label class="hys285-filter">Tarjeta de origen<select id="hys285Module"><option value="ALL">Ambas tarjetas</option><option value="APR">Prevencionistas</option><option value="OTROS">Supervisores / Capataces</option></select></label>',
 '<label class="hys285-filter">Área de trabajo<select id="hys285Area" disabled><option value="">Todas las áreas (pendiente de carga)</option></select></label>',
 '</div><p id="hys285Scope" class="hys285-scope" role="status"></p>',
 '<div class="hys285-warning" role="note"><span aria-hidden="true">ⓘ</span><div><strong>Diseño para revisión v285 · Sin cifras simuladas</strong>',
 'El consolidado de indicadores aún no está conectado. Se muestran guiones hasta que los datos estén verificados en Supabase. El diseño y la navegación ya pueden revisarse.',
 '</div></div>',
 '<section id="hys285Home" aria-label="Resumen y pilares"><div class="hys285-section-heading"><h2>Resumen de gestión</h2><span class="hys285-muted">Valores pendientes de datos centrales</span></div>',
 '<div class="hys285-stats" id="hys285Stats"></div>',
 '<div class="hys285-section-heading"><h2>Seis pilares estratégicos</h2><span class="hys285-muted">Selecciona una tarjeta para ver sus indicadores</span></div>',
 '<div class="hys285-grid" id="hys285Grid"></div></section>',
 '<section id="hys285Detail" class="hys285-detail" hidden tabindex="-1" aria-label="Detalle de pilar">',
 '<button id="hys285Back" class="hys285-back" type="button">← Volver a los pilares</button>',
 '<div class="hys285-detail-title" id="hys285DetailTitle"></div><div class="hys285-detail-head" id="hys285DetailLead"></div>',
 '<h3 class="hys285-detail-subtitle">Indicadores propuestos y fuentes de datos</h3><div class="hys285-metrics" id="hys285Metrics"></div></section>',
 '<details class="hys285-method"><summary>Metodología y trazabilidad futura</summary>',
 '<p>Las cifras se calcularán mediante consultas autorizadas sobre informes, hallazgos, tareas, responsables, documentos y eventos auditados. Cada resultado deberá permitir abrir sus registros de origen. Mientras el servidor no confirme el consolidado, no se mostrarán números ni exportaciones ficticias.</p></details>',
 '<footer class="hys285-footer"><p>Panel informativo de solo lectura. PDF y Excel ejecutivos quedarán disponibles después de conectar y validar los indicadores reales.</p>',
 '<button id="hys285Export" type="button" class="hys285-export" disabled>Exportación ejecutiva pendiente</button></footer>',
 '</div></div>'
].join('');
d.body.append(panel);
const period=$('hys285Period'),mod=$('hys285Module'),area=$('hys285Area');
const home=$('hys285Home'),detail=$('hys285Detail');
const periodNames={month:'Mes actual',quarter:'Últimos 3 meses',year:'Últimos 12 meses'};
const moduleNames={ALL:'Ambas tarjetas',APR:'Prevencionistas',OTROS:'Supervisores / Capataces'};
let knownAreas=[],requestToken=0,previousFocus=null;
function render(){
 const stats=$('hys285Stats');stats.replaceChildren();
 for(const name of ['Hallazgos registrados','Compromisos pendientes','Compromisos vencidos','Cumplimiento de plazos']){
  const card=el('article','hys285-stat');
  card.append(el('span','hys285-stat-name',name),el('strong','hys285-stat-value','—'),el('span','hys285-stat-status','Sin consolidación disponible'));
  stats.append(card);
 }
 const grid=$('hys285Grid');grid.replaceChildren();
 for(const p of pillars){
  const c=el('button','hys285-pillar');c.type='button';c.dataset.pillar=p.id;
  c.setAttribute('aria-label','Abrir '+p.title);
  c.append(el('span','hys285-pillar-icon',p.icon),el('span','hys285-pillar-code','PILAR '+p.num),el('strong','hys285-pillar-name',p.title),el('span','hys285-pillar-desc',p.desc),el('span','hys285-open','Ver indicadores y fórmulas →'));
  c.addEventListener('click',()=>showPillar(p.id));grid.append(c);
 }
}
function showPillar(id){
 if(!allowed()||panel.hidden)return;
 const p=pillars.find(x=>x.id===id);if(!p)return;
 home.hidden=true;detail.hidden=false;
 $('hys285DetailTitle').replaceChildren(el('span','hys285-pillar-icon',p.icon),el('h2',null,p.title));
 $('hys285DetailLead').replaceChildren(el('p',null,p.goal));
 const box=$('hys285Metrics');box.replaceChildren();
 for(const [name,formula,source] of p.metrics){
  const card=el('article','hys285-metric');
  card.append(el('h4','hys285-metric-name',name),el('p','hys285-metric-copy','Cálculo: '+formula),el('div','hys285-metric-source','Fuente: '+source),el('div','hys285-metric-note','Pendiente de datos consolidados'));
  box.append(card);
 }
 detail.focus({preventScroll:true});panel.scrollTop=Math.max(0,detail.offsetTop-95);
}
function back(){
 detail.hidden=true;home.hidden=false;
 const first=$('hys285Grid').querySelector('button');first?.focus({preventScroll:true});
 panel.scrollTop=Math.max(0,$('hys285Grid').offsetTop-155);
}
function scope(){
 const areaName=area.value?area.selectedOptions[0]?.textContent:'Todas las áreas';
 $('hys285Scope').textContent='Consulta prevista: '+periodNames[period.value]+' · '+moduleNames[mod.value]+' · '+areaName+'. El consolidado real se conectará posteriormente.';
}
function showAreas(){
 const original=area.value;
 area.replaceChildren(new Option('Todas las áreas',''));
 const list=knownAreas.filter(x=>mod.value==='ALL'||mod.value===x.modulo);
 const seen=new Set();
 for(const x of list){
  const key=x.modulo+':'+x.nombre;if(seen.has(key))continue;seen.add(key);
  const label=mod.value==='ALL'?x.nombre+' · '+moduleNames[x.modulo]:x.nombre;
  area.add(new Option(label,key));
 }
 area.disabled=list.length===0;
 if([...area.options].some(x=>x.value===original))area.value=original;
 scope();
}
async function getAreas(){
 if(preview){area.replaceChildren(new Option('Áreas disponibles solo con una cuenta autorizada',''));area.disabled=true;scope();return;}
 const uid=a()?.userId,client=root.reportesHysSupabase,token=++requestToken;
 if(!client||!allowed()||!uid)return;
 area.replaceChildren(new Option('Consultando áreas…',''));area.disabled=true;
 try{
  const r=await client.from('areas_trabajo_v242').select('id,nombre,modulo,activa').eq('activa',true).order('nombre');
  if(r.error)throw r.error;
  if(token!==requestToken||!allowed()||uid!==a()?.userId)return;
  knownAreas=(r.data||[]).filter(x=>['APR','OTROS'].includes(x.modulo)&&typeof x.nombre==='string');
  showAreas();
 }catch{
  if(token!==requestToken)return;
  knownAreas=[];area.replaceChildren(new Option('Áreas no disponibles (solo lectura)',''));
  area.disabled=true;scope();
 }
}
function open(){
 if(!allowed())return false;
 const users=$('hys265UsersPanel');
 if(!preview&&users&&!users.hidden&&root.Hys265UserManagement?.close?.()===false)return false;
 previousFocus=d.activeElement;panel.hidden=false;home.hidden=false;detail.hidden=true;
 period.value='month';mod.value='ALL';area.value='';
 render();scope();getAreas();$('hys285Close').focus({preventScroll:true});return true;
}
function close(){
 if(panel.hidden)return true;
 panel.hidden=true;requestToken++;knownAreas=[];home.hidden=false;detail.hidden=true;
 if(allowed())button.focus({preventScroll:true});
 else if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 return true;
}
function sync(){
 const visible=allowed();
 button.hidden=!visible;
 if(visible)button.style.removeProperty('display');
 else button.style.display='none';
 if(!visible&&!panel.hidden)close();
}
button.addEventListener('click',()=>open());
$('hys285Close').addEventListener('click',close);
$('hys285Back').addEventListener('click',back);
period.addEventListener('change',scope);
mod.addEventListener('change',showAreas);
area.addEventListener('change',scope);
d.addEventListener('keydown',e=>{if(!panel.hidden&&e.key==='Escape'){e.preventDefault();close();}});
nav.addEventListener('click',e=>{if(e.target.closest('button')!==button&&!panel.hidden)close()},true);
root.addEventListener('reportes-hys-access-changing',()=>{close();sync()});
root.addEventListener('reportes-hys-access-changed',sync);
const prior=root.reportesHysAdminSync;
root.reportesHysAdminSync=()=>{prior?.();sync()};
root.Hys285Pillars={open,close,sync,reviewOnly:true};
sync();if(preview)open();
})(window);
