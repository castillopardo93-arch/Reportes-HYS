/* Reportes HYS v258 Excel Lab · Exportación Excel local, sin escritura ni consultas a Supabase.
   Una descarga explícita. Datos filtrados del módulo/usuario autenticado. */
(function(root){
'use strict';
const clean=v=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,1500);
const esc=v=>clean(v).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const date=v=>{const s=String(v||'');return /^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):''};
const item=(r,n)=>Array.isArray(r)?r[n]??'':'';
const riskNames=r=>(Array.isArray(r?.[6]?.risks)?r[6].risks:[]).map(x=>clean(typeof x==='string'?x:x?.name||x?.nombre||x?.code||'')).filter(Boolean);
const riskKey=r=>(Array.isArray(r?.[6]?.risks)?r[6].risks:[]).map(x=>clean(typeof x==='string'?x:x?.code||x?.name||x?.nombre||'')).filter(Boolean);
function extractReport(p,source){
 if(!p||typeof p!=='object')return null;
 const data=p.data&&typeof p.data==='object'?p.data:{};
 const list=k=>Array.isArray(data[k])?data[k]:[];
 return {id:clean(p.reportId||source?.reportId||source?.id||''),module:clean(p.module||source?.module||''),date:date(p.date||p.dateFrom||source?.dateFrom),from:date(p.dateFrom||p.date),to:date(p.dateTo||p.date),project:clean(p.project||source?.project),area:clean(p.area||source?.area),owner:clean(p.owner||source?.owner),shift:clean(p.shift||source?.shift),source:clean(source?.kind||'Informe actual'),data:{findings:list('findings'),activities:list('activities'),inspections:list('inspections')}};
}
const allowedContext=()=>{
 const a=root.__REPORTES_HYS_ACCESS__;
 const m=new URLSearchParams(root.location.search).get('embedded')==='otros'?'OTROS':'APR';
 if(!a?.userId||a.selectedModule!==m)throw Error('Inicia sesión y selecciona el módulo correspondiente para exportar.');
 return {userId:String(a.userId),module:m,key:String(a.userId)+'|'+m};
};
const rangeMatch=(d,from,to)=>Boolean(d)&&(!from||d>=from)&&(!to||d<=to);
const localToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
async function readWork258Archived(storage,scope,from,to,errors){
 const name=storage?.work258ArchiveName?.(scope.userId,scope.module);
 if(!name)return [];
 if(typeof root.indexedDB?.databases!=='function'){errors.push('El navegador no permite comprobar el archivo v258 sin alterarlo; solo se usará el borrador.');return [];}
 let databases;
 try{databases=await root.indexedDB.databases()}catch(e){errors.push('No se pudo inspeccionar el archivo v258.');return [];}
 if(!databases.some(d=>d.name===name))return [];
 return new Promise(resolve=>{
  const reports=[];
  try{
   const req=storage.openNative(name);
   req.onerror=()=>{errors.push('No se pudo abrir el archivo v258 en modo lectura.');resolve([]);};
   req.onsuccess=()=>{
    const db=req.result;
    if(!db.objectStoreNames.contains('pdfs')){db.close();resolve([]);return;}
    const tx=db.transaction('pdfs','readonly');
    const cursor=tx.objectStore('pdfs').openCursor();
    cursor.onsuccess=()=>{
     const rec=cursor.result;
     if(!rec)return;
     const entry=rec.value||{},p=entry.reportData;
     if(p&&(!entry.creador_id||String(entry.creador_id)===scope.userId)&&(!p.authenticatedUser||String(p.authenticatedUser)===scope.userId)){
      const report=extractReport(p,{...entry,kind:'Archivo v258 (solo lectura)'});
      if(report&&report.module===scope.module&&rangeMatch(report.date,from,to)&&Object.values(report.data).some(x=>x.length))reports.push(report);
     }
     if(reports.length<1000)rec.continue();
     else errors.push('Se alcanzó el límite de 1000 informes del archivo v258.');
    };
    tx.oncomplete=()=>{db.close();resolve(reports);};
    tx.onerror=()=>{db.close();errors.push('Error al leer el archivo v258.');resolve([]);};
    tx.onabort=()=>{db.close();errors.push('Lectura del archivo v258 interrumpida.');resolve([]);};
   };
  }catch(e){errors.push('No se pudo iniciar la lectura del archivo v258.');resolve([]);}
 });
}

async function gather(bridge,from,to,includeArchive,includeWork258=false){
 const scope=allowedContext(), reports=[],errors=[];
 if(from&&to&&from>to)throw Error('Fecha desde no puede superar fecha hasta.');
 const raw=bridge.pack(),live=extractReport(raw,{kind:'Informe actual'});
 if(live&&live.module===scope.module&&(!raw.authenticatedUser||String(raw.authenticatedUser)===scope.userId)&&rangeMatch(live.date,from,to)&&Object.values(live.data).some(x=>x.length))reports.push(live);
 if(includeArchive){
  let summaries=[];
  try{summaries=await bridge.getArchivedReports()}catch(e){errors.push('No fue posible consultar el archivo local: '+clean(e.message));}
  for(const summary of summaries){
   if(allowedContext().key!==scope.key)throw Error('Cambió la sesión. Operación cancelada.');
   if(!summary?.hasReportData)continue;
   if(summary.creador_id&&String(summary.creador_id)!==scope.userId)continue;
   const previewDate=date(summary.dateFrom||summary.date||summary.createdAt);
   if(previewDate&&!rangeMatch(previewDate,from,to))continue;
   try{
    const entry=await bridge.getArchivedReport(summary.id,false);
    const rawReport=entry?.reportData||entry?.report||null;
    if(!rawReport||(rawReport.authenticatedUser&&String(rawReport.authenticatedUser)!==scope.userId))continue;
    const report=extractReport(rawReport,{...summary,kind:'Reporte anterior'});
    if(report&&report.module===scope.module&&rangeMatch(report.date,from,to)&&Object.values(report.data).some(x=>x.length))reports.push(report);
   }catch(e){errors.push('Un reporte anterior no pudo leerse: '+clean(e.message));}
  }
 }
 if(includeWork258){
  const storage=root.HysStorage242;
  if(!storage?.readWork258Draft){errors.push('La lectura aislada de v258 no está disponible.');}
  else{
   try{
    const text=storage.readWork258Draft(scope.userId,scope.module);
    if(text){
     const rawOriginal=JSON.parse(text);
     if(!rawOriginal.authenticatedUser||String(rawOriginal.authenticatedUser)===scope.userId){
      const original=extractReport(rawOriginal,{kind:'Borrador v258 (solo lectura)'});
      if(original&&original.module===scope.module&&rangeMatch(original.date,from,to)&&Object.values(original.data).some(x=>x.length))reports.push(original);
     }
    }
   }catch(e){errors.push('El borrador local de v258 no pudo leerse.');}
   if(includeArchive){
    const archived=await readWork258Archived(storage,scope,from,to,errors);
    reports.push(...archived);
   }
  }
 }
 if(allowedContext().key!==scope.key)throw Error('Cambió la sesión. Operación cancelada.');
 const unique=new Map();
 // Misma identidad de informe: priorizamos el borrador actual, no sumamos copias del mismo informe.
 for(const r of reports){
  const id=r.id?r.module+'|'+r.id:r.module+'|'+r.date+'|'+r.owner+'|'+r.shift;
  if(!unique.has(id))unique.set(id,r);
 }
 return {reports:[...unique.values()],errors,scope};
}
function assemble(reports){
 const findings=[],activities=[],riskCounts=new Map(),dayCounts=new Map();
 const today=localToday();
 for(const p of reports){
  const base=[p.id,p.module,p.date,p.from,p.to,p.project,p.area,p.owner,p.shift,p.source];
  const linkedActivities=new Map();
  for(const [kind,label] of [['activities','Actividad HYS'],['inspections','Actividad por área']]){
   (p.data[kind]||[]).forEach(row=>{
    const meta=Array.isArray(row)?row[5]:null;
    const target=clean(meta?.linkedFindingId||'');
    if(!target)return;
    const description=clean(kind==='activities'?row[2]:row[1]);
    if(!linkedActivities.has(target))linkedActivities.set(target,[]);
    if(description)linkedActivities.get(target).push(label+': '+description);
   });
  }
  (p.data.findings||[]).forEach((r,i)=>{
   if(!Array.isArray(r))return;
   const meta=r[6]&&typeof r[6]==='object'?r[6]:{},risks=riskNames(r),keys=riskKey(r);
   const fid=clean(meta.findingId||meta.id||(p.id||p.date||'informe')+'-H-'+(i+1));
   const due=date(meta.dueDate||meta.commitment?.dueDate||meta.commitmentDate);
   const state=clean(item(r,4)),done=['completado','cerrado'].includes(state.toLocaleLowerCase('es'));
   const verified=date(meta.verifiedAt||meta.verification?.verifiedAt);
   const overdue=due&&!done&&due<today?Math.round((Date.parse(today+'T12:00:00')-Date.parse(due+'T12:00:00'))/86400000):0;
   const assignees=Array.isArray(meta.assignees)?meta.assignees.map(a=>clean(typeof a==='string'?a:a?.nombre||a?.name||a?.user_id||'')).filter(Boolean).join('; '):clean(item(r,3));
   const circumstance=clean(meta.circumstance||meta.contextoDeteccion||'');
   const linkedContext=clean(meta.activityContext||(linkedActivities.get(fid)||[]).join('; '));
   const photos=Array.isArray(r[5])?r[5].length:0;
   findings.push([...base,fid,clean(item(r,0)),clean(item(r,1)),clean(item(r,2)),assignees,state,due,verified,overdue,risks.join('; '),circumstance,linkedContext,clean(meta.correction?.status||''),clean(meta.updatedAt||''),clean(meta.auditReference||''),photos]);
   keys.forEach((key,k)=>{
    if(!riskCounts.has(key))riskCounts.set(key,{name:risks[k]||key,count:0,areas:new Set(),turns:new Set(),circumstances:new Set(),activities:new Set()});
    const r=riskCounts.get(key);r.count++;if(p.area)r.areas.add(p.area);if(p.shift)r.turns.add(p.shift);if(circumstance)r.circumstances.add(circumstance);if(linkedContext)r.activities.add(linkedContext);
   });
   if(p.date){
    const d=new Date(p.date+'T12:00:00');
    if(!Number.isNaN(+d)){const day=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][d.getDay()];dayCounts.set(day,(dayCounts.get(day)||0)+1);}
   }
  });
  for(const [group,label] of [['activities','Actividad HYS'],['inspections','Actividad por área']]){
   (p.data[group]||[]).forEach((r,i)=>{
    if(!Array.isArray(r))return;
    const metadata=r[5]&&typeof r[5]==='object'&&!Array.isArray(r[5])?r[5]:{};
    const media=Array.isArray(r[4])?r[4].length:0;
    activities.push([...base,label,clean(metadata.activityId||(p.id||p.date)+'-'+group+'-'+(i+1)),...r.slice(0,4).map(clean),media,date(metadata.dueDate||'')]);
   });
  }
 }
 const total=findings.length, completed=findings.filter(r=>['completado','cerrado'].includes(r[15].toLocaleLowerCase('es'))).length;
 const expired=findings.filter(r=>r[18]>0).length,withDeadline=findings.filter(r=>Boolean(r[16])).length;
 const open=total-completed;
 const riskRows=[...riskCounts.entries()].map(([code,r])=>[code,r.name,r.count,[...r.areas].join('; '),[...r.turns].join('; '),[...r.circumstances].join('; ')||'Sin registro',[...r.activities].join('; ')||'Sin actividad vinculada']).sort((a,b)=>b[2]-a[2]||String(a[1]).localeCompare(String(b[1]),'es'));
 const days=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d=>[d,dayCounts.get(d)||0]);
 const indicators=[
  ['Hallazgos registrados',total,'Conteo de hallazgos, no de accidentes'],
  ['Abiertos (estado informado)',open,'Pendiente o En proceso; cierre formal no verificado'],
  ['Vencidos (compromisos)',expired,'Fecha compromiso vencida y estado distinto de Completado/Cerrado'],
  ['Cerrados formalmente','Sin datos','La plataforma todavía no entrega un cierre central verificable en esta exportación'],
  ['Cumplimiento verificado','Sin datos','Requiere verificación autorizada y fecha de ejecución'],
  ['Tiempo medio de corrección','Sin datos','Requiere fechas de ejecución y verificación reales'],
  ['Reincidencia de hallazgos','Sin datos','Requiere vínculo validado entre hallazgos recurrentes'],
  ['Notificaciones confirmadas','Sin datos','La confirmación central de entrega/lectura no está habilitada'],
  ['Completados (estado declarado)',completed,'No equivale a cierre formal autorizado'],
  ['Con fecha compromiso',withDeadline,'Sirve para medir cobertura de planificación'],
  ['Riesgos distintos',riskRows.length,'Según códigos o nombres informados en hallazgos'],
  ['Accidentes con lesión','Sin datos','No existe un registro operativo integrado de accidentes']
 ];
 return {findings,activities,indicators,riskRows,days,total,completed,expired,open,reports:reports.length};
}
const findingHeaders=['ID informe','Módulo','Fecha','Desde','Hasta','Proyecto','Área','APR','Turno','Origen','ID hallazgo','Condición detectada','Prioridad','Medida propuesta','Responsable(s)','Estado','Fecha compromiso','Fecha verificación','Días de atraso','Riesgos','Circunstancia (si existe)','Actividad asociada (si existe)','Estado corrección','Última modificación','Referencia auditoría','N° evidencias'];
const activityHeaders=['ID informe','Módulo','Fecha','Desde','Hasta','Proyecto','Área','APR','Turno','Origen','Tipo actividad','ID actividad','Campo 1','Campo 2','Campo 3','Campo 4','Fotografías','Vencimiento'];
function workbookData(a,from,to){
 return [
 {name:'REGISTROS',rows:[findingHeaders,...a.findings]},
 {name:'ACTIVIDADES',rows:[activityHeaders,...a.activities]},
 {name:'INDICADORES',rows:[['Indicador','Valor','Interpretación'],...a.indicators]},
 {name:'ANALISIS_PREVENTIVO',rows:[['Período desde',from||'Sin límite'],['Período hasta',to||'Sin límite'],[],['Código riesgo','Riesgo','Hallazgos asociados','Áreas','Turnos','Circunstancias observadas','Actividades vinculadas'],...a.riskRows,[],['Día de la semana','Hallazgos registrados (NO accidentes)'],...a.days,[],['Nota','La distribución por día corresponde a la fecha del informe. Los accidentes requieren un registro separado.']]},
 {name:'INCIDENTES',rows:[['Fecha','Tipo evento','Área','Turno','Actividad','Circunstancia','Gravedad'],['SIN DATOS','El módulo de accidentes/incidentes aún no está implementado. No se infieren accidentes de hallazgos.']]},
 {name:'TRAZABILIDAD',rows:[['Campo','Origen','Alcance'],['Identificador informe','Informe actual / archivo local','Solo usuario y módulo de sesión'],['Fuente','Borrador o informe anterior','No constituye auditoría central'],['Fecha compromiso','Metadatos del hallazgo','Solo si está disponible'],['Verificación','Metadatos del hallazgo','No presupone aprobación formal'],['Notificaciones','Sin integración central','Sin datos confirmados']]}
 ];
}
/* XLSX mínimo Office Open XML y ZIP sin librerías externas. Celdas como textos para evitar ejecución de fórmulas importadas. */
const encoder=new TextEncoder();
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function u16(v){return[v&255,(v>>>8)&255]}function u32(v){return[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]}
function zip(entries){
 const chunks=[],central=[];let offset=0;
 for(const [name,str] of entries){
  const n=encoder.encode(name),b=encoder.encode(str),checksum=crc(b);
  const lh=Uint8Array.from([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(checksum),...u32(b.length),...u32(b.length),...u16(n.length),...u16(0),...n]);
  chunks.push(lh,b);
  central.push(Uint8Array.from([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(checksum),...u32(b.length),...u32(b.length),...u16(n.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...n]));
  offset+=lh.length+b.length;
 }
 const csize=central.reduce((n,x)=>n+x.length,0),header=Uint8Array.from([...u32(0x06054b50),...u16(0),...u16(0),...u16(entries.length),...u16(entries.length),...u32(csize),...u32(offset),...u16(0)]);
 return new Blob([...chunks,...central,header],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function col(n){let r='';for(n++;n;n=Math.floor((n-1)/26))r=String.fromCharCode(65+(n-1)%26)+r;return r;}
function sheetXml(rows,filter){
 const rs=rows.map((r,i)=>'<row r="'+(i+1)+'" ht="'+(i===0?34:23)+'" customHeight="1">'+r.map((v,j)=>{
  const ref=col(j)+(i+1),style=i===0?1:i%2===0?2:0;
  if(typeof v==='number'&&Number.isFinite(v))return '<c r="'+ref+'" s="'+style+'"><v>'+v+'</v></c>';
  return '<c r="'+ref+'" s="'+style+'" t="inlineStr"><is><t xml:space="preserve">'+esc(v)+'</t></is></c>';
 }).join('')+'</row>').join('');
 const widthCount=Math.min(rows[0]?.length||2,35);
 const widths='<cols>'+Array.from({length:widthCount},(_,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+(i===11||i===13?44:i===19?38:i===0?22:20)+'" customWidth="1"/>').join('')+'</cols>';
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="22"/>'+widths+'<sheetData>'+rs+'</sheetData>'+(filter&&rows[0]?.length?'<autoFilter ref="A1:'+col(rows[0].length-1)+Math.max(1,rows.length)+'"/>':'')+'</worksheet>';
}
function makeXlsx(sheets){
 const entries=[['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+sheets.map((s,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
 ['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
 ['xl/workbook.xml','<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>'<sheet name="'+esc(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>'],
 ['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((s,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],['xl/styles.xml',"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><fonts count=\"2\"><font><sz val=\"11\"/><name val=\"Aptos\"/></font><font><b/><sz val=\"11\"/><color rgb=\"FFFFFFFF\"/><name val=\"Aptos\"/></font></fonts><fills count=\"3\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FF123B63\"/><bgColor indexed=\"64\"/></patternFill></fill></fills><borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs><cellXfs count=\"3\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/><xf numFmtId=\"0\" fontId=\"1\" fillId=\"2\" borderId=\"0\" xfId=\"0\" applyFill=\"1\" applyFont=\"1\" applyAlignment=\"1\"><alignment wrapText=\"1\" vertical=\"center\"/></xf><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/></cellXfs><cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles></styleSheet>"]];
 sheets.forEach((s,i)=>entries.push(['xl/worksheets/sheet'+(i+1)+'.xml',sheetXml(s.rows,i===0||i===1)]));
 return zip(entries);
}
function mount(){
 const bridge=root.Hys242Bridge,config=root.document.getElementById('config');if(!bridge||!config)return;
 if(root.document.getElementById('hysxl-export'))return;
 const panel=root.document.createElement('details');panel.id='hysxl-export';
 panel.innerHTML=[
  '<summary>▤ &nbsp; SEGUIMIENTO Y ANÁLISIS PREVENTIVO · EXCEL</summary>',
  '<div class="hysxl-card-body">',
  '<p class="smallnote hysxl-help">Consulta los registros del módulo actual sin volver a digitarlos. La exportación incluye hallazgos, actividades, riesgos y trazabilidad disponible.</p>',
  '<div class="hysxl-fields">',
  '<div class="field"><label for="hysxl-month">Seleccionar mes</label><input id="hysxl-month" type="month"></div>',
  '<div class="field"><label for="hysxl-from">Fecha desde</label><input id="hysxl-from" type="date"></div>',
  '<div class="field"><label for="hysxl-to">Fecha hasta</label><input id="hysxl-to" type="date"></div>',
  '</div>',
  '<label class="hysxl-archive-option" for="hysxl-archives"><input type="checkbox" id="hysxl-archives" checked><span>Incluir reportes anteriores accesibles en esta sesión</span></label>',
  '<label class="hysxl-archive-option" for="hysxl-work258"><input type="checkbox" id="hysxl-work258" checked><span>Leer también los datos locales de v258, sin modificarlos</span></label>',
  '<div class="btnrow hysxl-actions"><button class="btn" type="button" id="hysxl-preview">Actualizar resumen</button><button class="btn primary" type="button" id="hysxl-download">▤ Generar Excel (.xlsx)</button></div>',
  '<div id="hysxl-summary" aria-live="polite" class="hysxl-summary" hidden></div>',
  '<p class="smallnote hysxl-disclaimer">No se agregan datos de otros usuarios ni módulos. Accidentes, cierres formales y notificaciones sin confirmación aparecen como «Sin datos». Esta versión es una prueba aislada.</p>',
  '<p id="hysxl-status" role="status" aria-live="polite"></p></div>'
 ].join('');
 config.appendChild(panel);
 const $=id=>panel.querySelector('#'+id),status=$('hysxl-status'),preview=$('hysxl-preview'),download=$('hysxl-download'),summary=$('hysxl-summary');
 $('hysxl-month').addEventListener('change',()=>{
  const m=$('hysxl-month').value;
  if(!/^\d{4}-\d{2}$/.test(m))return;
  const [y,mo]=m.split('-').map(Number);
  $('hysxl-from').value=m+'-01';
  $('hysxl-to').value=y+'-'+String(mo).padStart(2,'0')+'-'+String(new Date(y,mo,0).getDate()).padStart(2,'0');
 });
 const td=(row,v)=>{const cell=root.document.createElement('td');cell.textContent=String(v);row.appendChild(cell);};
 const present=(a,errors)=>{
  summary.replaceChildren();summary.hidden=false;
  const container=root.document.createElement('div');container.className='hysxl-stats';
  [['Informes',a.reports],['Hallazgos',a.total],['Abiertos',a.open],['Vencidos',a.expired],['Riesgos distintos',a.riskRows.length]].forEach(([label,value])=>{
   const card=root.document.createElement('div');card.className='hysxl-stat';const v=root.document.createElement('strong'),l=root.document.createElement('span');
   v.textContent=String(value);l.textContent=label;card.append(v,l);container.appendChild(card);
  });summary.appendChild(container);
  const caption=root.document.createElement('p');caption.className='smallnote';caption.textContent='Riesgos con mayor frecuencia (hallazgos, NO accidentes).';summary.appendChild(caption);
  const table=root.document.createElement('table');table.className='hysxl-mini-table';let tr=root.document.createElement('tr');['Riesgo','Veces','Áreas y circunstancias'].forEach(v=>{const h=root.document.createElement('th');h.textContent=v;tr.appendChild(h)});table.appendChild(tr);
  for(const risk of a.riskRows.slice(0,7)){tr=root.document.createElement('tr');td(tr,risk[1]);td(tr,risk[2]);td(tr,(risk[3]||'Sin área')+' · '+(risk[5]||'Sin circunstancia registrada')+' · '+(risk[6]||'Sin actividad vinculada'));table.appendChild(tr);}
  if(!a.riskRows.length){tr=root.document.createElement('tr');td(tr,'No hay riesgos clasificados en los hallazgos consultados');table.appendChild(tr);}
  summary.appendChild(table);
  if(errors.length){const warning=root.document.createElement('p');warning.className='smallnote';warning.textContent=errors.length+' reporte(s) no se pudieron consultar. Resultado parcial.';summary.appendChild(warning);}
 };
 const run=async exportIt=>{
  preview.disabled=download.disabled=true;status.textContent='Consultando registros disponibles...';
  try{
   const from=$('hysxl-from').value,to=$('hysxl-to').value;
   const r=await gather(bridge,from,to,$('hysxl-archives').checked,$('hysxl-work258').checked),a=assemble(r.reports);
   present(a,r.errors);
   if(!exportIt){status.textContent='Vista previa actualizada para el período seleccionado.';return;}
   if(!a.findings.length&&!a.activities.length)throw Error('No hay hallazgos o actividades en el período seleccionado.');
   const blob=makeXlsx(workbookData(a,from,to));
   if(allowedContext().key!==r.scope.key)throw Error('Cambió la sesión; no se descargó información.');
   const url=URL.createObjectURL(blob),link=root.document.createElement('a');
   link.href=url;link.download='Control_Integral_HYS_'+r.scope.module+'_'+(from||'inicio')+'_'+(to||'actual')+'.xlsx';link.click();
   setTimeout(()=>URL.revokeObjectURL(url),30000);
   status.textContent='Excel generado: '+a.total+' hallazgos y '+a.activities.length+' actividades. '+(r.errors.length?'Exportación parcial; revisar avisos.':'Sin errores de lectura detectados.');
  }catch(e){status.textContent='No fue posible completar la consulta: '+clean(e.message||e);}
  finally{preview.disabled=download.disabled=false;}
 };
 preview.addEventListener('click',()=>run(false));download.addEventListener('click',()=>run(true));
}
root.HysExcelLab={mount,assemble,makeXlsx,workbookData,extractReport,gather};
if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();

})(window);
