/* Reportes HYS v254 · Exportación Excel local, sin escritura ni consultas a Supabase.
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
 return {id:clean(p.reportId||source?.reportId||source?.id||''),module:clean(p.module||source?.module||''),date:date(p.date||p.dateFrom||source?.dateFrom),from:date(p.dateFrom||p.date),to:date(p.dateTo||p.date),project:clean(p.project||source?.project),area:clean(p.area||source?.area),owner:clean(p.owner||source?.owner),shift:clean(p.shift||source?.shift),source:clean(source?.kind||'Borrador actual'),data:p.data||{findings:[],activities:[],inspections:[]}};
}
const allowedContext=()=>{
 const a=root.__REPORTES_HYS_ACCESS__;
 const m=new URLSearchParams(root.location.search).get('embedded')==='otros'?'OTROS':'APR';
 if(!a?.userId||a.selectedModule!==m)throw Error('Inicia sesión y selecciona el módulo correspondiente para exportar.');
 return {userId:a.userId,module:m,key:String(a.userId)+'|'+m};
};
const rangeMatch=(d,from,to)=>Boolean(d)&&(!from||d>=from)&&(!to||d<=to);
async function gather(bridge,from,to,includeArchive){
 const before=allowedContext(), reports=[],errors=[];
 const raw=bridge.pack();const live=extractReport(raw,{kind:'Informe actual'});
 if(live&&live.module===before.module&&rangeMatch(live.date,from,to)&&((live.data.findings||[]).length||(live.data.activities||[]).length||(live.data.inspections||[]).length))reports.push(live);
 if(includeArchive){
  let summaries=[];
  try{summaries=await bridge.getArchivedReports()}catch(e){errors.push('Archivo local: '+clean(e.message));}
  for(const summary of summaries){
   if(!summary?.hasReportData)continue;
   if(!rangeMatch(date(summary.dateFrom||summary.createdAt),from,to))continue;
   try{
    const archive=await bridge.getArchivedReport(summary.id,false);
    const p=archive?.reportData||archive?.report||null;
    const r=extractReport(p,{...summary,kind:'Reporte anterior'});
    if(r&&r.module===before.module&&rangeMatch(r.date,from,to))reports.push(r);
   }catch(e){errors.push('Un reporte anterior no fue accesible: '+clean(e.message));}
  }
 }
 if(allowedContext().key!==before.key)throw Error('Cambió el usuario o módulo durante la lectura. Exportación cancelada.');
 const used=new Set(),distinct=[];
 for(const r of reports){const fingerprint=[r.id,r.module,r.date,JSON.stringify(r.data)].join('|');if(used.has(fingerprint))continue;used.add(fingerprint);distinct.push(r);}
 return {reports:distinct,errors,scope:before};
}
function assemble(reports){
 const findings=[],activities=[],riskCounts=new Map(),dayCounts=new Map();
 for(const p of reports){
  const base=[p.id,p.module,p.date,p.from,p.to,p.project,p.area,p.owner,p.shift,p.source];
  (p.data.findings||[]).forEach((r,i)=>{
   if(!Array.isArray(r))return;
   const meta=r[6]||{}, risks=riskNames(r),keys=riskKey(r), fid=clean(meta.findingId||meta.id||p.id+'-H-'+(i+1));
   const due=date(meta.dueDate||meta.commitment?.dueDate||meta.commitmentDate);
   const state=clean(item(r,4));const verified=date(meta.verifiedAt||meta.verification?.verifiedAt);
   const days=due&&state.toLowerCase()!=='completado'&&due<new Date().toISOString().slice(0,10)?Math.round((new Date().setHours(0,0,0,0)-Date.parse(due+'T00:00:00'))/86400000):0;
   const assignees=Array.isArray(meta.assignees)?meta.assignees.map(a=>clean(a.name||a.nombre||a.id||a)).join('; '):clean(item(r,3));
   const row=[...base,fid,clean(item(r,0)),clean(item(r,1)),clean(item(r,2)),assignees,state,due,verified,days,risks.join('; '),clean(meta.circumstance||''),clean(meta.activityContext||''),clean(meta.correction?.status||''),clean(meta.updatedAt||''),clean(meta.auditReference||''),clean((r[5]||[]).length)];
   findings.push(row);
   for(let k=0;k<keys.length;k++){const key=keys[k],name=risks[k]||key;if(!riskCounts.has(key))riskCounts.set(key,{name,count:0,areas:new Set(),turns:new Set()});const x=riskCounts.get(key);x.count++;if(p.area)x.areas.add(p.area);if(p.shift)x.turns.add(p.shift);}
   if(p.date){const d=new Date(p.date+'T12:00:00');if(!Number.isNaN(+d)){const label=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][d.getDay()];dayCounts.set(label,(dayCounts.get(label)||0)+1);}}
  });
  for(const [group,label] of [['activities','Actividad HYS'],['inspections','Actividad por área']]){
   (p.data[group]||[]).forEach((r,i)=>{if(!Array.isArray(r))return;activities.push([...base,label,clean((r[5]||{}).activityId||p.id+'-'+group+'-'+(i+1)),...r.slice(0,4).map(clean),clean(r[4]?.length?'Con fotos':''),date((r[5]||{}).dueDate||'')]);});
  }
 }
 const states=findings.map(r=>r[15].toLocaleLowerCase('es'));
 const total=findings.length,closed=states.filter(x=>x==='completado'||x==='cerrado').length;
 const expired=findings.filter(r=>r[18]>0).length;
 const open=total-closed;
 const verifiedWithin=findings.filter(r=>r[17]&&r[16]&&r[17]<=r[16]).length;
 const avgDays=(()=>{const a=findings.filter(r=>r[17]&&r[2]).map(r=>Math.max(0,(Date.parse(r[17])-Date.parse(r[2]))/86400000));return a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1):'Sin datos';})();
 const indicators=[
 ['Hallazgos',total,'Cantidad de registros de hallazgo exportados; no representa accidentes'],
 ['Abiertos',open,'Estados distintos de Completado/Cerrado'],
 ['Vencidos',expired,'Fecha compromiso vencida en registros no completados'],
 ['Cerrados',closed,'Estado completado/cerrado: no supone cierre autorizado central'],
 ['Cumplimiento en plazo',closed&&verifiedWithin?((verifiedWithin/closed)*100).toFixed(1)+' %':'Sin datos','Solo con fecha de verificación y vencimiento'],
 ['Tiempo medio de verificación (días)',avgDays,'Requiere fechas de verificación válidas; no equivale al cierre formal'],
 ['Reincidencia','Sin datos','Requiere asociación verificable entre hallazgos repetidos'],
 ['Notificaciones confirmadas','Sin datos','El flujo central de envío y lectura no está desplegado'],
 ['Accidentes con lesión','Sin datos','No existe módulo operativo de accidentes en v253']
 ];
 return {findings,activities,indicators,riskRows:[...riskCounts.entries()].map(([k,v])=>[k,v.name,v.count,[...v.areas].join('; '),[...v.turns].join('; ')]).sort((a,b)=>b[2]-a[2]),days:[...dayCounts].map(([k,v])=>[k,v]),total};
}
const findingHeaders=['ID informe','Módulo','Fecha','Desde','Hasta','Proyecto','Área','APR','Turno','Origen','ID hallazgo','Condición detectada','Prioridad','Medida propuesta','Responsable(s)','Estado','Fecha compromiso','Fecha verificación','Días de atraso','Riesgos','Circunstancia (si existe)','Actividad asociada (si existe)','Estado corrección','Última modificación','Referencia auditoría','N° evidencias'];
const activityHeaders=['ID informe','Módulo','Fecha','Desde','Hasta','Proyecto','Área','APR','Turno','Origen','Tipo actividad','ID actividad','Campo 1','Campo 2','Campo 3','Campo 4','Fotografías','Vencimiento'];
function workbookData(a,from,to){
 return [
 {name:'REGISTROS',rows:[findingHeaders,...a.findings]},
 {name:'ACTIVIDADES',rows:[activityHeaders,...a.activities]},
 {name:'INDICADORES',rows:[['Indicador','Valor','Interpretación'],...a.indicators]},
 {name:'ANALISIS_PREVENTIVO',rows:[['Período desde',from||'Sin límite'],['Período hasta',to||'Sin límite'],[],['Riesgo código','Riesgo','Frecuencia','Áreas registradas','Turnos registrados'],...a.riskRows,[],['Nota','Las frecuencias corresponden a hallazgos, no accidentes. Las circunstancias no registradas no se infieren.']]},
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
 const bridge=root.Hys242Bridge, config=root.document.getElementById('config');if(!bridge||!config)return;
 if(root.document.getElementById('hys254-export'))return;
 const panel=root.document.createElement('section');panel.id='hys254-export';panel.style='border:1px solid #bfd5ec;border-radius:12px;background:#f5f9ff;padding:16px;margin:14px 0';
 panel.innerHTML='<h3 style="margin:0 0 6px;color:#123b63">Exportar seguimiento a Excel</h3><p style="margin:0 0 12px">Los datos existentes se reutilizan automáticamente. Exportación local por usuario y módulo, sin actualizar Supabase. No se incluyen fotografías, datos de accidentes no registrados ni confirmaciones de notificaciones inexistentes.</p><div style="display:flex;flex-wrap:wrap;align-items:end;gap:10px"><label>Desde <input type="date" id="hys254-from"></label><label>Hasta <input type="date" id="hys254-to"></label><label style="display:flex;align-items:center;gap:5px"><input type="checkbox" id="hys254-archives" checked> Incluir reportes anteriores accesibles</label><button type="button" id="hys254-download" style="border:0;border-radius:8px;background:#167650;color:white;padding:10px 14px;font-weight:700">Generar Excel (.xlsx)</button></div><p id="hys254-status" role="status" style="margin:10px 0 0"></p>';
 config.appendChild(panel);
 const status=panel.querySelector('#hys254-status'),btn=panel.querySelector('#hys254-download');
 btn.addEventListener('click',async()=>{
  btn.disabled=true;status.textContent='Preparando datos autorizados...';
  try{
   const from=panel.querySelector('#hys254-from').value,to=panel.querySelector('#hys254-to').value;
   if(from&&to&&from>to)throw Error('La fecha desde no puede ser posterior a la fecha hasta.');
   const r=await gather(bridge,from,to,panel.querySelector('#hys254-archives').checked);
   const result=assemble(r.reports);
   if(!result.findings.length&&!result.activities.length)throw Error('No hay hallazgos o actividades en el período para exportar.');
   const blob=makeXlsx(workbookData(result,from,to));
   if(allowedContext().key!==r.scope.key)throw Error('La sesión cambió. No se descargó el archivo.');
   const url=URL.createObjectURL(blob),a=root.document.createElement('a');a.href=url;a.download='Control_Integral_HYS_'+r.scope.module+'_'+(from||'inicio')+'_'+(to||'actual')+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
   status.textContent='Excel generado: '+result.findings.length+' hallazgos, '+result.activities.length+' actividades. '+(r.errors.length?'Advertencia: '+r.errors.length+' reportes no accesibles; exportación parcial.':'Solo registros disponibles en esta sesión.');
  }catch(e){status.textContent='No se pudo exportar: '+clean(e.message||e);}
  finally{btn.disabled=false;}
 });
}
root.Hys254Excel={mount,assemble,makeXlsx,workbookData,extractReport};
if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})(window);
