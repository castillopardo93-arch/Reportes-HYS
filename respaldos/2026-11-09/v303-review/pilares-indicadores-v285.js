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
button.title='Pilares e Indicadores';
button.append(glyph,el('span','tools-option-label','Pilares e Indicadores'),el('span','tools-option-full','Pilares e Indicadores'));
// En el menú REAL de Administrador General aparece entre Seguimiento y Apariencia.
function placeInActualRail(){
 const appearance=d.getElementById('appearanceOpen242');
 if(appearance&&appearance.parentElement===nav)nav.insertBefore(button,appearance);
 else if(button.parentElement!==nav)nav.append(button);
}
placeInActualRail();
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
 '<label class="hys285-filter">Período<select id="hys285Period"><option value="month">Mes actual</option><option value="quarter">Últimos 3 meses</option><option value="semester">Últimos 6 meses</option><option value="year">Últimos 12 meses</option><option value="twoYears">Últimos 24 meses</option><option value="currentYear">Año actual</option><option value="previousYear">Año anterior</option><option value="custom">Personalizado</option></select></label>',
 '<label class="hys285-filter">Tarjeta de origen<select id="hys285Module"><option value="ALL">Ambas tarjetas</option><option value="APR">Prevencionistas</option><option value="OTROS">Supervisores / Capataces</option></select></label>',
 '<label class="hys285-filter">Área de trabajo<select id="hys285Area" disabled><option value="">Todas las áreas (pendiente de carga)</option></select></label>',
 '</div><div id="hys303CustomDates" class="hys303-custom-dates" hidden><label class="hys285-filter">Fecha desde<input type="date" id="hys303DateFrom" aria-describedby="hys303DateError"></label><label class="hys285-filter">Fecha hasta<input type="date" id="hys303DateTo" aria-describedby="hys303DateError"></label><p id="hys303DateError" class="hys303-error" role="alert" hidden></p></div>',
 '<p id="hys285Scope" class="hys285-scope" role="status"></p>',
 '<div class="hys303-comparison" id="hys303Comparison" role="status" aria-live="polite"></div>',
 '<div class="hys285-warning" role="note"><span aria-hidden="true">ⓘ</span><div><strong>Indicadores en preparación</strong>',
 'Los datos aún no se consolidan entre usuarios: se muestran guiones, no ceros. Las acciones sin verificación tampoco se contabilizarán como cumplidas. Cada resultado deberá tener respaldo consultable.',
 '</div></div>',
 '<section id="hys285Home" aria-label="Resumen y pilares"><div class="hys285-section-heading"><h2>Resumen de gestión</h2><span class="hys285-muted">Valores pendientes de datos centrales</span></div>',
 '<div class="hys285-stats" id="hys285Stats"></div>',
 '<section class="hys303-alerts" aria-labelledby="hys303AlertsTitle"><div class="hys285-section-heading"><h2 id="hys303AlertsTitle">Alertas de gestión</h2><span class="hys285-muted">Prioridades pendientes de fuentes verificadas</span></div><div id="hys303AlertGrid" class="hys303-alert-grid"></div></section>',
 '<section class="hys303-analytics" aria-labelledby="hys303AnalysisTitle"><div class="hys285-section-heading"><h2 id="hys303AnalysisTitle">Evolución y prioridades</h2><span class="hys285-muted">Análisis comparativo preparado para la conexión central</span></div>',
 '<div class="hys303-insights">',
 '<article class="hys303-insight"><h3>Evolución mensual</h3><p class="hys303-insight-detail">Hallazgos registrados, abiertos y cerrados por mes, comparados con el período anterior equivalente.</p><div class="hys303-empty" role="note"><span aria-hidden="true">▥</span><div><strong>Sin datos consolidados</strong><p>La gráfica aparecerá cuando existan registros centrales con fecha, estado y respaldo verificado.</p></div></div></article>',
 '<article class="hys303-insight"><h3>Áreas y riesgos prioritarios</h3><p class="hys303-insight-detail">Identificará áreas con condiciones reincidentes y compromisos vencidos, vinculados a su responsable.</p><div class="hys303-empty" role="note"><span aria-hidden="true">⌕</span><div><strong>Sin datos consolidados</strong><p>Se mostrarán los riesgos y áreas con mayor recurrencia, conservando el identificador y la actividad de origen.</p></div></div><button type="button" class="hys303-drilldown" disabled title="Disponible con registros centrales auditados">Consultar registros y respaldos (pendiente)</button></article>',
 '</div><p class="hys303-cutoff">Criterio de trazabilidad: los hallazgos detectados en el período se agrupan por fecha del evento; los compromisos aún abiertos o vencidos se evaluarán también a la fecha de corte, aunque se hayan registrado antes.</p></section>',
 '<div class="hys285-section-heading"><h2>Seis pilares estratégicos</h2><span class="hys285-muted">Selecciona una tarjeta para ver sus indicadores</span></div>',
 '<div class="hys285-grid" id="hys285Grid"></div></section>',
 '<section id="hys285Detail" class="hys285-detail" hidden tabindex="-1" aria-label="Detalle de pilar">',
 '<button id="hys285Back" class="hys285-back" type="button">← Volver a los pilares</button>',
 '<div class="hys285-detail-title" id="hys285DetailTitle"></div><div class="hys285-detail-head" id="hys285DetailLead"></div>',
 '<h3 class="hys285-detail-subtitle">Indicadores y respaldo requerido</h3><div class="hys285-metrics" id="hys285Metrics"></div></section>',
 '<details class="hys285-method"><summary>Cómo se calcula y verifica</summary>',
 '<p><strong>1. Qué está pasando:</strong> cada indicador tendrá una fórmula definida, un período y una fuente de datos verificable.</p>',
 '<p><strong>2. Qué requiere intervención:</strong> las cifras habilitadas permitirán consultar los registros que las componen, con responsable y estado. El acceso estará sujeto a los permisos del servidor.</p>',
 '<p><strong>3. Estamos mejorando:</strong> se compararán períodos equivalentes y medidas realmente verificadas, no solo marcadas como realizadas.</p>',
 '<p><strong>4. Filtro temporal y Power BI:</strong> cada registro deberá mantener ID único, fecha del evento, fecha compromiso, fecha de cierre, usuario responsable, área, tarjeta, estado y evidencia. Los compromisos vencidos se evaluarán a la fecha de corte y no desaparecerán por haber nacido antes de la ventana elegida.</p>',
 '<p><strong>Regla de calidad:</strong> «Sin datos verificados» no significa cero. Cuando no exista denominador, los porcentajes deben indicar «No aplica». Las acciones no verificadas no contarán como cierres eficaces.</p>',
 '<p id="hys288Readiness" role="status">Comprobando si existen fuentes centrales habilitadas…</p></details>',
 '<footer class="hys285-footer"><p>Panel informativo de solo lectura. PDF y Excel ejecutivos quedarán disponibles después de conectar y validar los indicadores reales.</p>',
 '<button id="hys285Export" type="button" class="hys285-export" disabled>Exportación ejecutiva pendiente</button></footer>',
 '</div></div>'
].join('');
d.body.append(panel);
const period=$('hys285Period'),mod=$('hys285Module'),area=$('hys285Area');
const customPanel=$('hys303CustomDates'),customFrom=$('hys303DateFrom'),customTo=$('hys303DateTo'),
 customError=$('hys303DateError'),comparison=$('hys303Comparison');
const home=$('hys285Home'),detail=$('hys285Detail');
const periodNames={
 month:'Mes actual',quarter:'Últimos 3 meses',semester:'Últimos 6 meses',
 year:'Últimos 12 meses',twoYears:'Últimos 24 meses',currentYear:'Año actual',
 previousYear:'Año anterior',custom:'Personalizado'
};
const periodCounts={month:1,quarter:3,semester:6,year:12,twoYears:24};
const utcDay=iso=>Date.UTC(Number(iso.slice(0,4)),Number(iso.slice(5,7))-1,Number(iso.slice(8,10)));
function validDay(value){
 if(typeof value!=='string'||!/^(?:19|20|21)\d{2}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(utcDay(value));return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===value;
}
function todayLocal(){
 const d=new Date(),p=n=>String(n).padStart(2,'0');
 return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
}
function addDays(iso,days){return new Date(utcDay(iso)+days*86400000).toISOString().slice(0,10)}
function monthOffset(iso,months,first=false){
 const year=Number(iso.slice(0,4)),month=Number(iso.slice(5,7))-1,day=Number(iso.slice(8,10));
 const start=new Date(Date.UTC(year,month+months,1));
 if(first)return start.toISOString().slice(0,10);
 const last=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate();
 return new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth(),Math.min(day,last))).toISOString().slice(0,10);
}
function resolveRange(which,today,from='',to=''){
 if(!Object.prototype.hasOwnProperty.call(periodNames,which)||!validDay(today))return {valid:false,reason:'Período o fecha de referencia no válidos.'};
 let start,end,compareFrom,compareTo;
 if(Object.prototype.hasOwnProperty.call(periodCounts,which)){
  const count=periodCounts[which];
  start=monthOffset(today,1-count,true);end=today;
  compareFrom=monthOffset(start,-count,true);compareTo=monthOffset(end,-count);
 }else if(which==='currentYear'){
  const year=Number(today.slice(0,4));start=year+'-01-01';end=today;
  compareFrom=(year-1)+'-01-01';compareTo=monthOffset(today,-12);
 }else if(which==='previousYear'){
  const year=Number(today.slice(0,4));start=(year-1)+'-01-01';end=(year-1)+'-12-31';
  compareFrom=(year-2)+'-01-01';compareTo=(year-2)+'-12-31';
 }else{
  if(!validDay(from)||!validDay(to))return {valid:false,reason:'Selecciona dos fechas reales para el período personalizado.'};
  if(from>to)return {valid:false,reason:'La fecha desde debe ser anterior o igual a la fecha hasta.'};
  if(to>today)return {valid:false,reason:'El período no puede terminar después de la fecha actual.'};
  start=from;end=to;
  const count=Math.round((utcDay(end)-utcDay(start))/86400000)+1;
  compareTo=addDays(start,-1);compareFrom=addDays(start,-count);
 }
 return {valid:true,key:which,start,end,compareFrom,compareTo,cutoff:end};
}
function prettyDay(iso){
 if(!validDay(iso))return '';
 const [y,m,d]=iso.split('-');return d+'/'+m+'/'+y;
}

const moduleNames={ALL:'Ambas tarjetas',APR:'Prevencionistas',OTROS:'Supervisores / Capataces'};
let knownAreas=[],requestToken=0,previousFocus=null;
// Condiciones mínimas para aceptar un indicador como verificable.
// Son criterios de control, no resultados ni una conexión al servidor.
const checks={
 'Tiempo de elaboración':'Usar fechas fiables del servidor: inicio y primera finalización; sin marcas completas, no hay promedio.',
 'Informes finalizados':'Contar únicamente informes con estado final confirmado y no sumar nuevas versiones del mismo informe.',
 'Ahorro administrativo':'Exigir una medición inicial comparable; sin línea base, no se debe publicar ahorro.',
 'Compromisos vencidos':'Cruzar vencimiento con el cierre verificado: ejecutar una tarea no elimina por sí solo el vencimiento.',
 'Cumplimiento a tiempo':'Denominador definido por compromisos exigibles; sin compromisos aplicables, mostrar «No aplica».',
 'Tiempo medio de cierre':'Contar la primera detección y el evento de cierre formal verificado; excluir fechas incompletas.',
 'Hallazgos registrados':'Utilizar identificadores únicos; evitar contar la misma condición dos veces tras editarla.',
 'Hallazgos abiertos':'Confirmar que no existe un cierre verificado; una declaración de ejecución no equivale a cierre.',
 'Distribución por área y riesgo':'Relacionar áreas y códigos estables de riesgo, conservando el proyecto de origen.',
 'Informes respaldados':'Solo considerar respaldos cuya escritura fue confirmada por almacenamiento central.',
 'Evidencia documental completa':'Evaluar únicamente acciones donde una evidencia sea exigible y asociar el archivo al registro correcto.',
 'Historial íntegro':'Conservar versiones, actor, fecha y cambios sin sobrescribir el historial anterior.',
 'Asignaciones identificadas':'Identificar al responsable por su usuario, no solo por un nombre escrito manualmente.',
 'Notificaciones entregadas':'Exigir comprobante de entrega real; presionar «Enviar» no demuestra recepción.',
 'Auditoría completa':'Exigir autor, fecha y eventos de cambio confirmados por el servidor.',
 'Reincidencia potencial':'Separar hallazgos realmente equivalentes de simples coincidencias de texto.',
 'Eficacia de medidas':'Contar solo medidas verificadas que superaron una revisión posterior; no basarse en la fecha de cierre.',
 'Riesgos más repetidos':'Agrupar por identificador de riesgo, manteniendo las diferencias entre actividades y proyectos.'
};
function showReadiness(){
 const central=root.HYS242_ENABLE_CENTRAL===true;
 const deployed=root.HYS242_DEPLOYMENT_READY===true;
 const status=$('hys288Readiness');
 if(!status)return;
 if(!central||!deployed){
  status.textContent='Estado actual: el guardado central de informes o su despliegue no está habilitado. No hay consolidado verificable; por eso los indicadores mantienen «—».';
 }else{
  status.textContent='Configuración central habilitada. Falta validar un servicio específico de indicadores, sus permisos y los registros de origen antes de presentar cifras.';
 }
}

function render(){
 const alerts=$('hys303AlertGrid');alerts.replaceChildren();
 for(const [name,detail] of [
  ['Compromisos vencidos','Acciones con fecha compromiso anterior al corte y sin cierre verificado.'],
  ['Hallazgos de prioridad alta','Condiciones abiertas clasificadas con prioridad alta.'],
  ['Riesgos reincidentes','Hallazgos equivalentes según código de riesgo, actividad y área.'],
  ['Cierres por verificar','Acciones declaradas realizadas, pendientes de evidencia y verificación formal.']
 ]){
  const card=el('article','hys303-alert');card.append(
   el('span','hys303-alert-name',name),el('strong','hys303-alert-value','—'),
   el('span','hys303-alert-note','Sin consolidación disponible'),
   el('p','hys303-alert-detail',detail));
  alerts.append(card);
 }
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
  card.append(el('h4','hys285-metric-name',name),el('p','hys285-metric-copy','Cálculo: '+formula),el('div','hys285-metric-source','Fuente: '+source),el('div','hys285-metric-note','Sin datos verificados'));
  const rule=el('details','hys288-rule');
  rule.append(el('summary',null,'¿Qué debe verificarse?'),el('p',null,checks[name]||'Revisar la fuente, el actor y los eventos antes de publicar resultados.'));
  card.append(rule);
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
 customPanel.hidden=period.value!=='custom';
 const areaName=area.value?area.selectedOptions[0]?.textContent:'Todas las áreas';
 const range=resolveRange(period.value,todayLocal(),customFrom.value,customTo.value);
 if(!range.valid){
  customError.hidden=period.value!=='custom';customError.textContent=range.reason;
  comparison.textContent='Comparación no disponible mientras el período sea inválido.';
  $('hys285Scope').textContent='Selecciona un período válido para la consulta prevista · '+moduleNames[mod.value]+' · '+areaName+'.';
  return;
 }
 customError.hidden=true;customError.textContent='';
 $('hys285Scope').textContent='Consulta prevista: '+periodNames[period.value]+
  ' ('+prettyDay(range.start)+' al '+prettyDay(range.end)+') · '+moduleNames[mod.value]+' · '+areaName+'.';
 comparison.textContent='Comparación prevista: '+prettyDay(range.compareFrom)+' al '+prettyDay(range.compareTo)+
  '. Los porcentajes y tendencias estarán disponibles únicamente con datos centrales verificados.';
}
function changePeriod(){
 customPanel.hidden=period.value!=='custom';
 scope();
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
 const today=todayLocal();customFrom.value=monthOffset(today,-2,true);customTo.value=today;
 customFrom.max=today;customTo.max=today;
 render();scope();getAreas();showReadiness();$('hys285Close').focus({preventScroll:true});return true;
}
function close(){
 if(panel.hidden)return true;
 panel.hidden=true;requestToken++;knownAreas=[];home.hidden=false;detail.hidden=true;
 if(allowed())button.focus({preventScroll:true});
 else if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 return true;
}
function sync(){
 placeInActualRail();
 const visible=allowed();
 button.hidden=!visible;
 if(visible)button.style.removeProperty('display');
 else button.style.display='none';
 if(!visible&&!panel.hidden)close();
}
button.addEventListener('click',()=>open());
$('hys285Close').addEventListener('click',close);
$('hys285Back').addEventListener('click',back);
period.addEventListener('change',changePeriod);
customFrom.addEventListener('change',scope);
customTo.addEventListener('change',scope);
mod.addEventListener('change',showAreas);
area.addEventListener('change',scope);
d.addEventListener('keydown',e=>{if(!panel.hidden&&e.key==='Escape'){e.preventDefault();close();}});
nav.addEventListener('click',e=>{if(e.target.closest('button')!==button&&!panel.hidden)close()},true);
root.addEventListener('reportes-hys-access-changing',()=>{close();sync()});
root.addEventListener('reportes-hys-access-changed',sync);
const prior=root.reportesHysAdminSync;
root.reportesHysAdminSync=()=>{prior?.();sync()};
root.Hys285Pillars={open,close,sync,reviewOnly:true,integratedInApp:true,resolveRange,validDay,todayLocal};
sync();if(preview)open();
})(window);
