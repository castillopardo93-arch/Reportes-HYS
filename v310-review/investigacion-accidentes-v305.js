/* Reportes HYS — Investigación de accidente: Flash Report y Final Report.
   Formatos derivados del Excel HSS-RGT-007, revisión 08. Vista de desarrollo.
   No se cargan datos sensibles en Supabase, no hay escrituras ni almacenamiento local. */
(function(root){
 'use strict';
 const d=root.document;
 if(!d||new URLSearchParams(root.location.search).get('embedded')==='otros')return;
 const params=new URLSearchParams(root.location.search);
 const review=/\/v309-review\/index\.html$/i.test(root.location.pathname)
   &&['accidentes','flash','final','seguimiento'].includes(params.get('revision'));
 const nav=d.getElementById('hysToolsOptions')||(review?d.createElement('nav'):null);
 if(!nav)return;
 const $=id=>d.getElementById(id);
 const element=(tag,cls,text)=>{
  const e=d.createElement(tag);
  if(cls)e.className=cls;
  if(text!==undefined)e.textContent=text;
  return e;
 };
 const access=()=>root.__REPORTES_HYS_ACCESS__;
 const authorized=()=>access()?.profile?.activo===true && !!access()?.userId;
 const visible=()=>review||authorized();
 const catalogs={
  incidentes:['Con Lesión','Cuasi Accidente','Daño Material','Falla Operacional','NAT','Sin lesión','Trayecto'],
  probabilidades:['Alta','Media','Baja','No Aplica'],
  respuesta:['Sí','No','No Aplica'],
  perdidas:['Daño Material','Interrupción de Proceso Normal de Trabajo','Lesión Brazo',
   'Lesión Cabeza','Lesión Cadera','Lesión Cara','Lesión Cervical','Lesión Hombro',
   'Lesión Lumbar','Lesión Mano','Lesión Ojos','Lesión Pie','Lesión Piel',
   'Lesión Pierna','Lesión Tórax','Policontuso','Sin Daños','Sin Lesión'],
  areas:['Area 6 OOCC','Area 6 Planta','Aucayes','BCC','Bocatoma Colina',
   'Bocatoma El Morado','Bocatoma El Yeso','Bocatoma La Engorda',
   'Bocatoma Las Placas','Bodega Maitenes','Campamento El Volcan',
   'Campamento El Yeso','Colorado','Deposito de Marina','Desarenador El Volcán',
   'Forebay','L1','Pique Aucayes','Planta de Agua El Volcán',
   'Planta de Agua El Yeso','Planta de Aridos El Yeso','Planta MEKA El Volcán',
   'Planta MEKA El Yeso','Polvorin','Ruta G-25','Ruta G-345','Ruta G-455',
   'Rutas internas','Túnel El Volcán','Túnel Suelo Entrada','Túnel Suelo Salida',
   'VA1','VA2','VA4','VA5','VL2','VL4','VL5','VL7','V1','V5','Rutas Externas']
 };
 const causeGroups={
  condiciones_subestandar:['1',1,37], acciones_subestandar:['1',38,73],
  factores_trabajo:['2',1,25], factores_personales:['2',26,49],
  requerimientos_sistema:['3',1,31]
 };
 const causeCodes=group=>{
  const x=causeGroups[group];
  return x?Array.from({length:x[2]-x[1]+1},(_,i)=>x[0]+'.'+(x[1]+i)):[];
 };
 const button=element('button','hys-admin-open');
 button.id='hys305OpenAccidents';
 button.type='button';
 button.hidden=true;
 button.title='Investigación de accidente';
 button.setAttribute('aria-label','Investigación de accidente');
 const glyph=element('span','tools-option-icon','⌕');
 glyph.setAttribute('aria-hidden','true');
 button.append(glyph,
  element('span','tools-option-label','Investigación de accidente'),
  element('span','tools-option-full','Investigación de accidente'));
 function place(){
  const appearance=$('appearanceOpen242');
  const pillar=$('hys285OpenPillars');
  if(appearance&&appearance.parentElement===nav)nav.insertBefore(button,appearance);
  else if(pillar&&pillar.parentElement===nav)pillar.insertAdjacentElement('afterend',button);
  else if(button.parentElement!==nav)nav.append(button);
 }
 const panel=element('section','hys306-module');
 panel.id='hys305Investigation';
 panel.hidden=true;
 panel.setAttribute('role','dialog');
 panel.setAttribute('aria-modal','true');
 panel.setAttribute('aria-labelledby','hys305Title');
 const shell=element('div','hys305-shell');
 const head=element('header','hys305-heading');
 const intro=element('div');
 intro.append(
  element('p','hys305-eyebrow','REPORTES HYS · ADMINISTRADOR GENERAL'),
  element('h1',null,'Investigación de accidente'),
  element('p',null,'Formularios HSS-RGT-007 · Flash Report y Final Report · Rev. 08'));
 const closeButton=element('button',null,'Cerrar ✕');
 closeButton.id='hys305Close';closeButton.type='button';
 closeButton.setAttribute('aria-label','Cerrar Investigación de accidente');
 head.append(intro,closeButton);
 const main=element('main','hys305-content');
 const notice=element('div','hys306-notice');
 notice.setAttribute('role','note');
 notice.append(
  element('strong',null,'Formularios en revisión'),
  element('p',null,'Estos campos reproducen las secciones de las hojas Flash Report y Final Report del documento HSS-RGT-007 Rev. 08. El contenido permanece solo en memoria mientras la pantalla está abierta. No existe guardado ni envío a Supabase.'));
 const cards=element('section','hys306-chooser');
 cards.id='hys306Cards';
 cards.setAttribute('aria-labelledby','hys306CardsTitle');
 const cardHeading=element('div','hys306-section-heading');
 cardHeading.append(element('h2',null,'Selecciona el tipo de reporte'),
  element('p',null,'Cada tarjeta abre su propio formulario, con campos independientes y el formato de la hoja correspondiente.'));
 cardHeading.querySelector('h2').id='hys306CardsTitle';
 const cardGrid=element('div','hys306-choice-grid');
 function reportCard(id,title,desc,mark){
  const b=element('button','hys306-choice');
  b.id=id;b.type='button';
  b.append(element('span','hys306-choice-icon',mark),
   element('strong',null,title),
   element('span','hys306-choice-desc',desc),
   element('span','hys306-choice-link','Abrir formulario'));
  return b;
 }
 const flashCard=reportCard('hys306OpenFlash','Flash Report',
  'Notificación inicial: antecedentes, asistencia, testigos, fotografías, relato, causas aparentes y acciones inmediatas.','01');
 const finalCard=reportCard('hys306OpenFinal','Final Report',
  'Investigación completa: declaraciones, antecedentes adicionales, evidencias, análisis causal, planes de acción y aprobación.','02');
 cardGrid.append(flashCard,finalCard);cards.append(cardHeading,cardGrid);
 const catalogueNote=element('p','hys306-catalogue-note',
  'Listas iniciales tomadas como referencia de la hoja «Lista». La conexión administrable con el Excel y sus códigos de causas («Tabla») se implementará después de aprobar los formularios.');
 cards.append(catalogueNote);
 const workspace=element('div','hys306-workspace');workspace.id='hys306Workspace';workspace.hidden=true;
 const workspaceHeader=element('div','hys306-workspace-header');
 const back=element('button','hys306-back','← Volver a las dos tarjetas');
 back.type='button';back.id='hys306BackCards';
 const activeTitle=element('div','hys306-active-title');
 const activeSub=element('div','hys306-active-sub');
 const workspaceActions=element('div','hys306-workspace-actions');
 workspaceActions.append(back);
 workspaceHeader.append(activeTitle,activeSub,workspaceActions);
 const formContainer=element('div','hys306-form-container');
 workspace.append(workspaceHeader,formContainer);
 main.append(notice,cards,workspace);shell.append(head,main);panel.append(shell);d.body.append(panel);
 const list=element('datalist');list.id='hys306AreasList';
 for(const value of catalogs.areas){const o=element('option');o.value=value;list.append(o)}
 panel.append(list);
 const forms={},dirty={flash:false,final:false};
 const keyPrefix={flash:'hys306-flash',final:'hys306-final'};
 let active=null,previousFocus=null,token=0;

 function f(label,key,type='text',opts={}){
  if(type&&typeof type==='object'){opts=type;type='text'}
  return {label,key,type,...opts};
 }
 function text(label,key,opts={}){return f(label,key,'textarea',opts)}
 function pick(label,key,opts){return f(label,key,'select',opts)}
 function areaField(label,key){return f(label,key,'area')}
 const yes=key=>pick(key,key,{options:catalogs.respuesta});
 function field(spec,kind){
  const fullWidth=spec.wide&&(spec.type==='textarea'||spec.type==='file');
  const compact=['date','time','number'].includes(spec.type)||
   (spec.type==='select'&&spec.label.length<=28);
  const holder=element(spec.causeGroup?'div':'label','hys306-field'+
   (fullWidth?' hys306-span-2':'')+(compact?' hys306-compact':''));
  const id=keyPrefix[kind]+'-'+spec.key;
  const span=element(spec.causeGroup?'label':'span','hys306-field-name',spec.label);
  if(spec.causeGroup)span.htmlFor=id;
  holder.append(span);
  let c;
  if(spec.type==='textarea'){
   c=element('textarea');c.rows=3;
   c.addEventListener('input',()=>{
    c.style.height='auto';
    c.style.height=Math.max(96,Math.min(560,c.scrollHeight))+'px';
   });
  }else if(spec.type==='select'||spec.type==='area'){
   c=element('select');
   const empty=element('option',null,'Seleccione...');
   empty.value='';c.append(empty);
   for(const val of (spec.type==='area'?catalogs.areas:(spec.options||[]))){
    const o=element('option',null,val);o.value=val;c.append(o);
   }
  }else if(spec.type==='file'){
   c=element('input');c.type='file';
   c.accept=spec.accept||'image/*';c.multiple=true;
  }else{
   c=element('input');
   c.type=spec.type==='area'?'text':spec.type;
   if(spec.type==='area')c.setAttribute('list','hys306AreasList');
   if(spec.type==='tel')c.autocomplete='off';
  }
  c.id=id;c.name=spec.key;
  c.autocomplete='off';
  c.setAttribute('data-report-field',kind);
  if(spec.placeholder)c.placeholder=spec.placeholder;
  if(spec.maxLength)c.maxLength=spec.maxLength;
  if(spec.type==='file'){
   const status=element('small','hys306-file-status','Sin archivos adjuntos');
   c.addEventListener('change',()=>{
    const files=[...(c.files||[])];
    status.textContent=files.length?files.length+' archivo(s) seleccionado(s) solo en memoria':'Sin archivos adjuntos';
    dirty[kind]=true;
   });
   holder.append(c,status);
  }else holder.append(c);
  if(spec.causeGroup){
   const chooser=element('select','hys306-cause-select');
   chooser.setAttribute('aria-label','Seleccionar código de causa — '+spec.label);
   const initial=element('option',null,'Seleccionar código de causa…');
   initial.value='';chooser.append(initial);
   for(const code of causeCodes(spec.causeGroup)){
    const option=element('option',null,code);option.value=code;chooser.append(option);
   }
   chooser.addEventListener('change',()=>{
    const code=chooser.value;
    if(!code)return;
    const selected=root.Hys308CausaCatalogo?.format(code);
    if(!selected)return;
    c.value=[c.value.trim(),selected].filter(Boolean).join('\n');
    c.dispatchEvent(new root.Event('input',{bubbles:true}));
    chooser.value='';c.focus();
   });
   holder.insertBefore(chooser,c);
  }
  if(spec.hint)holder.append(element('small','hys306-field-hint',spec.hint));
  return holder;
 }
 function section(form,kind,title,items,opts={}){
  const fs=element('fieldset','hys306-section');
  const legend=element('legend','hys306-legend',title);fs.append(legend);
  if(opts.description)fs.append(element('p','hys306-section-description',opts.description));
  const grid=element('div','hys306-field-grid');
  for(const spec of items)grid.append(field(spec,kind));
  fs.append(grid);form.append(fs);return fs;
 }
 function witnesses(form,kind,label,fields){
  const fs=element('fieldset','hys306-section');
  fs.append(element('legend','hys306-legend',label));
  const repeater=element('div','hys306-repeat-grid');
  for(let i=1;i<=3;i++){
   const block=element('div','hys306-repeat-card');
   block.append(element('h4',null,(label.startsWith('Declar')?'Declaración':'Testigo')+' '+i));
   const grid=element('div','hys306-field-grid');
   for(const spec of fields)grid.append(field({...spec,key:'registro_'+i+'_'+spec.key},kind));
   block.append(grid);repeater.append(block);
  }
  fs.append(repeater);form.append(fs);
 }
 function plans(form,kind){
  const fs=element('fieldset','hys306-section');fs.id='hys306ActionSection';
  fs.append(element('legend','hys306-legend','10.- PLANES DE ACCIÓN'));
  fs.append(element('p','hys306-section-description',
   'CÓDIGOS y PLANES DE ACCIÓN RECOMENDADOS según el punto 10 del Excel original. Ingresa los códigos directamente, sin lista desplegable. Se conservan los campos complementarios de fecha y responsable.'));
  const list=element('div','hys306-action-list');list.id='hys306ActionRows';
  let seq=0;
  function add(){
   seq++;const block=element('div','hys306-action-row');
   block.append(element('h4',null,'Plan de acción '+seq));
   const grid=element('div','hys306-field-grid');
   for(const spec of [
    f('CÓDIGOS','action_'+seq+'_codigo','text',{placeholder:'Escribir código(s) asociado(s)'}),
    text('Plan de acción recomendado','action_'+seq+'_descripcion',{wide:true}),
    f('Fecha de cumplimiento','action_'+seq+'_fecha','date'),
    f('Responsable','action_'+seq+'_responsable','text')
   ])grid.append(field(spec,kind));
   block.append(grid);list.append(block);dirty[kind]=true;
  }
  for(let i=0;i<3;i++)add();
  dirty[kind]=false;
  const addButton=element('button','hys306-secondary','+ Agregar plan de acción');
  addButton.type='button';addButton.id='hys306AddAction';addButton.onclick=add;
  fs.append(list,addButton);form.append(fs);
 }
 function makeForm(kind){
  const form=element('form','hys306-report');
  form.id=kind==='flash'?'hys306FlashForm':'hys306FinalForm';
  form.setAttribute('novalidate','');
  form.hidden=true;
  form.addEventListener('submit',e=>e.preventDefault());
  form.addEventListener('input',()=>{dirty[kind]=true});
  form.addEventListener('change',()=>{dirty[kind]=true});
  const banner=element('div','hys306-report-banner');
  banner.append(element('span',null,'Código: HSS-RGT-007 · Rev. 08'),
   element('h3',null,kind==='flash'?'FLASH REPORT':'INFORME DE INVESTIGACIÓN DE INCIDENTE'));
  form.append(banner);
  if(kind==='flash'){
   section(form,kind,'ANTECEDENTES DEL INCIDENTE',[
    pick('TIPO DE INCIDENTE','tipo_incidente',{options:catalogs.incidentes}),
    pick('PROBABILIDAD DE LESIONES CON TIEMPO PERDIDO','probabilidad',{options:catalogs.probabilidades}),
    f('HORA','hora','time'),
    f('FECHA OCURRENCIA','fecha_ocurrencia','date'),
    areaField('ÁREA DEL PROYECTO','area_proyecto'),
    f('UBICACIÓN ESPECÍFICA','ubicacion','text',{wide:true}),
    f('NOMBRE INVOLUCRADO','involucrado','text'),
    f('CARGO','cargo','text'),
    f('RUT','rut','text',{placeholder:'Dato personal protegido'})
   ]);
   section(form,kind,'RESPONSABLES DEL ÁREA',[
    f('CAPATAZ RESPONSABLE DEL ÁREA','capataz'),
    f('SUPERINTENDENTE RESPONSABLE DEL ÁREA','superintendente'),
    f('SUPERVISOR RESPONSABLE DEL ÁREA','supervisor'),
    f('SITE MANAGER RESPONSABLE DEL ÁREA','site_manager'),
    f('GERENCIA / DEPARTAMENTO','departamento'),
    f('GERENTE RESPONSABLE','gerente')
   ]);
   section(form,kind,'PRIMERA ATENCIÓN',[
    pick('¿SE DIERON PRIMEROS AUXILIOS?','primeros_auxilios',{options:catalogs.respuesta}),
    pick('¿SE LLAMÓ A LA AMBULANCIA?','ambulancia',{options:catalogs.respuesta}),
    pick('¿NECESITA TRATAMIENTO EN HOSPITAL?','hospital',{options:catalogs.respuesta}),
    f('PARAMÉDICO QUE REALIZA LA PRIMERA ATENCIÓN','paramedico'),
    f('DIRECTOR MÉDICO','director_medico')
   ]);
   section(form,kind,'TESTIGOS',[
    pick('¿EXISTEN TESTIGOS?','existen_testigos',{options:catalogs.respuesta})
   ]);
   witnesses(form,kind,'DATOS DE TESTIGOS',[
    f('NOMBRE','nombre'),
    f('CARGO','cargo'),
    f('NÚMERO DE CONTACTO','telefono','tel')
   ]);
   section(form,kind,'FOTOGRAFÍAS',[
    f('FOTOGRAFÍAS DEL EVENTO','fotografias','file',{wide:true,
      hint:'Solo vista temporal. Los archivos no se suben ni quedan guardados.'})
   ]);
   section(form,kind,'RELATO Y ACCIONES INMEDIATAS',[
    text('DESCRIPCIÓN DE LOS HECHOS CONOCIDOS','hechos',{wide:true,rows:6}),
    text('CAUSAS APARENTES INMEDIATAS (ACCIONES Y/O CONDICIONES SUBESTÁNDAR)','causas_aparentes',{wide:true,rows:5}),
    text('ACCIONES TOMADAS INMEDIATAMENTE','acciones_inmediatas',{wide:true,rows:5})
   ]);
   section(form,kind,'INFORME Y COMUNICACIÓN',[
    f('INCIDENTE REPORTADO POR','reportado_por'),
    f('CARGO DE QUIEN REPORTA','cargo_reporta'),
    f('CONTACTO DE QUIEN REPORTA','contacto_reporta','tel'),
    f('INFORME PREPARADO POR','preparado_por'),
    f('CARGO DE QUIEN PREPARA','cargo_prepara'),
    f('CONTACTO DE QUIEN PREPARA','contacto_prepara','tel')
   ]);
  }else{
   section(form,kind,'1.- ANTECEDENTES GENERALES',[
    f('NOMBRE DEL PROYECTO','proyecto'),
    f('NOMBRE DE LOS INVOLUCRADOS','involucrados',{wide:true}),
    f('FECHA DEL INCIDENTE','fecha_incidente','date'),
    f('RUT','rut','text',{placeholder:'Dato personal protegido'}),
    f('CARGO','cargo'),
    pick('TIPO DE INCIDENTE','tipo_incidente',{options:catalogs.incidentes}),
    pick('REQUIERE TRATAMIENTO MÉDICO','tratamiento_medico',{options:catalogs.respuesta}),
    pick('TIPO DE PÉRDIDA','tipo_perdida',{options:catalogs.perdidas}),
    f('SUPERVISOR DE ÁREA','supervisor_area'),
    areaField('LUGAR DEL INCIDENTE / ÁREA','lugar_incidente'),
    f('CAPATAZ RESPONSABLE','capataz'),
    f('UBICACIÓN ESPECÍFICA','ubicacion',{wide:true}),
    f('GERENCIA / DEPTO. INVOLUCRADO','departamento')
   ]);
   section(form,kind,'2.- ANTECEDENTES ADICIONALES',[
    text('EQUIPOS, HERRAMIENTAS Y/O ESTRUCTURAS UTILIZADAS O INVOLUCRADAS','equipos',{wide:true}),
    text('¿OTROS TRABAJADORES HABÍAN MANIFESTADO DIFICULTADES EN ESTA TAREA?','dificultades',{wide:true}),
    text('ACTIVIDAD ESPECÍFICA QUE SE ESTABA REALIZANDO','actividad',{wide:true}),
    pick('¿EL PELIGRO SE ENCONTRABA IDENTIFICADO EN EL AST?','ast',{options:catalogs.respuesta}),
    f('¿CUÁNTAS PERSONAS ESTABAN INVOLUCRADAS EN LA ACTIVIDAD?','cantidad','number'),
    pick('¿HAN OCURRIDO INCIDENTES SIMILARES ANTERIORMENTE?','similares',{options:catalogs.respuesta}),
    text('OTRA INFORMACIÓN RELEVANTE PARA LA INVESTIGACIÓN','informacion_adicional',{wide:true,rows:4})
   ]);
   witnesses(form,kind,'3.- DECLARACIONES (RESÚMENES)',[
    f('NOMBRE','nombre'),
    f('CARGO','cargo'),
    f('NÚMERO DE CONTACTO','telefono','tel'),
    text('RESUMEN DE DECLARACIÓN','resumen',{wide:true,rows:3})
   ]);
   section(form,kind,'4.- DESCRIPCIÓN DE LOS HECHOS',[
    text('DESCRIPCIÓN DETALLADA DEL EVENTO','descripcion',{wide:true,rows:9})
   ]);
   section(form,kind,'5.- FOTOGRAFÍAS',[
    f('FOTOGRAFÍAS Y EVIDENCIA VISUAL','fotografias','file',{wide:true,accept:'image/*',
      hint:'Solo selección temporal; no se guardan archivos en la nube.'})
   ]);
   section(form,kind,'6.- PROCEDIMIENTOS ASOCIADOS',[
    text('PROCEDIMIENTOS E INSTRUCTIVOS ASOCIADOS','procedimientos',{wide:true,rows:4}),
    f('ADJUNTAR DOCUMENTOS DE REFERENCIA','documentos','file',{wide:true,accept:'.pdf,.doc,.docx,.xlsx,.xls,image/*'})
   ]);
   section(form,kind,'7.- MATRIZ DE IDENTIFICACIÓN DE PELIGROS Y EVALUACIÓN DE RIESGOS',[
    text('IDENTIFICACIÓN DE PELIGROS Y RIESGOS ASOCIADOS','matriz',{wide:true,rows:4}),
    f('ADJUNTAR MATRIZ O AST','matriz_archivo','file',{wide:true,accept:'.pdf,.doc,.docx,.xlsx,.xls,image/*'})
   ]);
   section(form,kind,'8.- CAPACITACIONES',[
    text('CAPACITACIONES Y REGISTROS REVISADOS','capacitaciones',{wide:true,rows:4}),
    f('ADJUNTAR RESPALDOS DE CAPACITACIÓN','capacitaciones_archivo','file',{wide:true,accept:'.pdf,.doc,.docx,.xlsx,.xls,image/*'})
   ]);
   section(form,kind,'9.- ANÁLISIS DE CAUSAS',[
    text('1. CAUSAS INMEDIATAS — CONDICIONES SUBESTÁNDAR','condiciones_subestandar',{wide:true,rows:3,causeGroup:'condiciones_subestandar',
      hint:'La selección de causas requiere los códigos y las descripciones literales del Excel original.'}),
    text('1. CAUSAS INMEDIATAS — ACCIONES SUBESTÁNDAR','acciones_subestandar',{wide:true,rows:3,causeGroup:'acciones_subestandar',
      hint:'La selección de causas requiere los códigos y las descripciones literales del Excel original.'}),
    text('2. CAUSAS BÁSICAS — FACTORES TÉCNICOS O DEL TRABAJO','factores_trabajo',{wide:true,rows:3,causeGroup:'factores_trabajo',
      hint:'La selección de causas requiere los códigos y las descripciones literales del Excel original.'}),
    text('2. CAUSAS BÁSICAS — FACTORES PERSONALES','factores_personales',{wide:true,rows:3,causeGroup:'factores_personales',
      hint:'La selección de causas requiere los códigos y las descripciones literales del Excel original.'}),
    text('3. REQUERIMIENTOS DEL SISTEMA','requerimientos_sistema',{wide:true,rows:3,causeGroup:'requerimientos_sistema',
      hint:'La selección de causas requiere los códigos y las descripciones literales del Excel original.'})
   ],{description:'La clasificación conserva las tablas del Excel original; cada lista mostrará código y nombre cuando el catálogo oficial esté integrado.'});
   plans(form,kind);
   section(form,kind,'EQUIPO INVESTIGADOR Y APROBACIONES',[
    text('EQUIPO INVESTIGADOR — NOMBRES Y CARGOS','equipo_investigador',{wide:true,rows:3}),
    f('SUPERVISOR DIRECTO — NOMBRE','supervisor_directo'),
    f('FECHA DE REVISIÓN DEL SUPERVISOR','fecha_supervisor','date'),
    f('APRUEBA SITE MANAGER — NOMBRE','aprobador'),
    f('FECHA DE APROBACIÓN','fecha_aprobacion','date'),
    f('REVISADO POR H&S — NOMBRE','revisado_hys'),
    f('FECHA DE REVISIÓN H&S','fecha_hys','date')
   ],{description:'Las firmas oficiales permanecen pendientes de una implementación de firma verificable; ingresar un nombre aquí no constituye una firma digital.'});
  }
  const footer=element('div','hys306-form-footer');
  const clear=element('button','hys306-clear','Limpiar formulario');
  clear.type='button';clear.setAttribute('data-clear-form',kind);
  clear.addEventListener('click',()=>{
   if(root.confirm&&!root.confirm('¿Limpiar los campos del '+(kind==='flash'?'Flash Report':'Final Report')+'? Esta acción no se puede deshacer.'))return;
   form.reset();
   form.querySelectorAll('textarea').forEach(x=>x.style.height='');
   form.querySelectorAll('.hys306-file-status').forEach(x=>x.textContent='Sin archivos adjuntos');
   if(kind==='final'){
    const list=$('hys306ActionRows');
    if(list){for(const row of [...list.children].slice(3))row.remove()}
   }
   dirty[kind]=false;
  });
  const save=element('button','hys306-pending','Guardar reporte (pendiente de validación)');
  save.type='button';save.disabled=true;
  footer.append(clear,save);
  form.append(footer);
  return form;
 }
 const flashForm=makeForm('flash'),finalForm=makeForm('final');
 forms.flash=flashForm;forms.final=finalForm;formContainer.append(flashForm,finalForm);
 function selectReport(kind){
  if(!visible()||panel.hidden||!forms[kind])return false;
  active=kind;
  cards.hidden=true;workspace.hidden=false;
  flashForm.hidden=kind!=='flash';finalForm.hidden=kind!=='final';
  activeTitle.textContent=kind==='flash'?'Flash Report':'Final Report';
  activeSub.textContent=kind==='flash'?'HSS-RGT-007 · Reporte inicial del evento · Rev. 08':'HSS-RGT-007 · Investigación final del incidente · Rev. 08';
  workspace.scrollIntoView?.({block:'start',behavior:'instant'});
  back.focus({preventScroll:true});
  return true;
 }
 function showCards(){
  if(!visible()||panel.hidden)return false;
  active=null;workspace.hidden=true;cards.hidden=false;
  flashForm.hidden=true;finalForm.hidden=true;
  flashCard.focus({preventScroll:true});
  return true;
 }
 function resetAll(){
  flashForm.reset();finalForm.reset();
  flashForm.querySelectorAll('.hys306-file-status').forEach(x=>x.textContent='Sin archivos adjuntos');
  finalForm.querySelectorAll('.hys306-file-status').forEach(x=>x.textContent='Sin archivos adjuntos');
  dirty.flash=false;dirty.final=false;
  const rows=$('hys306ActionRows');
  if(rows){for(const row of [...rows.children].slice(3))row.remove()}
 }
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
  active=null;workspace.hidden=true;cards.hidden=false;flashForm.hidden=true;finalForm.hidden=true;
  flashCard.focus({preventScroll:true});
  return true;
 }
 function close(force=false){
  if(panel.hidden)return true;
  if(!force&&root.Hys308Workflow?.canLeave){
   if(!root.Hys308Workflow.canLeave())return false;
  }else if(!force&&(dirty.flash||dirty.final)&&typeof root.confirm==='function'&&
   !root.confirm('Este formulario está en revisión y los datos no se han guardado. ¿Cerrar?'))return false;
  panel.hidden=true;token++;resetAll();active=null;root.Hys308Workflow?.onClosed?.();
  if(button.isConnected&&!button.hidden&&authorized())button.focus({preventScroll:true});
  else if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  return true;
 }
 function sync(){
  place();
  const yes=visible();
  button.hidden=!yes;
  button.style.display=yes?'':'none';
  if(!yes){close(true);resetAll()}
 }
 flashCard.onclick=()=>selectReport('flash');
 finalCard.onclick=()=>selectReport('final');
 back.onclick=showCards;
 button.onclick=open;
 closeButton.onclick=()=>close();
 d.addEventListener('keydown',e=>{
  if(!panel.hidden&&e.key==='Escape'){e.preventDefault();close()}
 });
 nav.addEventListener('click',e=>{
  const selected=e.target.closest('button');
  if(selected&&selected!==button&&!panel.hidden)close();
 },true);
 root.addEventListener('reportes-hys-access-changing',()=>{close(true);resetAll();sync()});
 root.addEventListener('reportes-hys-access-changed',sync);
 const oldSync=root.reportesHysAdminSync;
 root.reportesHysAdminSync=()=>{oldSync?.();sync()};
 root.Hys305Investigation={
  open,close,sync,selectReport,showCards,isReview:review,
  planned:true,formAvailable:true,serverStorageEnabled:false,
  catalogOrigin:'HSS-RGT-007 Rev. 08 — Lista provisional, códigos Tabla sin descripciones'
 };
 sync();
 if(review){
  open();
  if(params.get('revision')==='flash')selectReport('flash');
  if(params.get('revision')==='final')selectReport('final');
 }
})(window);
