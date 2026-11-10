/* QA catálogo de causas v308 — datos de Excel ficticio, ningún dato real. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const app=path.resolve(__dirname,'../v308-review');
const read=p=>fs.readFileSync(path.join(app,p),'utf8');
const dom=new JSDOM(read('demo-v308.html'),{url:'https://hys.local/v308-review/demo-v308.html',runScripts:'outside-only'});
const w=dom.window,d=w.document;
w.HYS308_DEMO_PAGE=true;
w.__REPORTES_HYS_ACCESS__={userId:'demo-autor',profile:{usuario_id:'demo-autor',nombre:'Prueba',rol:'usuario',activo:true},modules:[],selectedModule:null};
w.Hys285Pillars={close:()=>true};w.confirm=()=>true;
w.eval(read('investigacion-accidentes-v305.js'));
w.eval(read('causas-catalogo-v308.js'));
w.eval(read('investigacion-flujo-v308.js'));
const api=w.Hys308CausaCatalogo, check=(q)=>assert.ok(q);
assert.ok(api,'Módulo lector no montado');
assert.equal(api.expected,153);
assert.equal(api.matchCode('1.1').code,'1.1');
assert.equal(api.matchCode('3.31').code,'3.31');
assert.equal(api.matchCode('2.50'),null);
const codes=[];
for(const [group,count] of [['1',73],['2',49],['3',31]]){
 for(let i=1;i<=count;i++)codes.push(group+'.'+i);
}
const safeName=code=>'Descripción oficial simulada de causa '+code;
const xmlEscape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const workbook='<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Flash Report" sheetId="1" r:id="rId1"/><sheet name="Tabla" sheetId="4" r:id="rId4"/></sheets></workbook>';
const rels='<Relationships><Relationship Id="rId4" Target="worksheets/sheet4.xml"/></Relationships>';
const shared=codes.flatMap(code=>[code,safeName(code)]);
const sharedXML='<sst>'+shared.map(text=>'<si><t>'+xmlEscape(text)+'</t></si>').join('')+'</sst>';
const rows=codes.map((code,i)=>'<row r="'+(i+1)+'"><c r="A'+(i+1)+'" t="s"><v>'+(i*2)+'</v></c><c r="B'+(i+1)+'" t="s"><v>'+(i*2+1)+'</v></c></row>').join('');
const sheet='<worksheet><sheetData>'+rows+'</sheetData></worksheet>';
const xmlFiles={'xl/workbook.xml':workbook,'xl/_rels/workbook.xml.rels':rels,'xl/sharedStrings.xml':sharedXML,'xl/worksheets/sheet4.xml':sheet};
const zip={file:name=>xmlFiles[name]?{async:async()=>xmlFiles[name]}:null};
w.JSZip={loadAsync:async()=>zip};
(async()=>{
 const extracted=await api.extractWorkbook(new Uint8Array(4).buffer);
 assert.equal(extracted.size,153);
 assert.equal(extracted.get('1.1'),safeName('1.1'));
 // El control real de carga toma el Excel y reemplaza las etiquetas visibles
 const input=d.getElementById('hys308CauseWorkbook');
 Object.defineProperty(input,'files',{configurable:true,value:[{
  name:'HSS-RGT-007-Flash_Final Report rev.8.xlsx',
  size:115000,
  arrayBuffer:async()=>new Uint8Array(5).buffer
 }]});
 input.dispatchEvent(new w.Event('change',{bubbles:true}));
 await new Promise(resolve=>setTimeout(resolve,5));
 assert.equal(api.count(),153);
 const status=d.getElementById('hys308CauseStatus');
 assert.equal(status.dataset.complete,'true');
 const selector=d.querySelector('#hys306FinalForm .hys306-cause-select');
 const option=[...selector.options].find(x=>x.value==='1.1');
 assert.ok(option);
 assert.equal(option.textContent,'1.1 — '+safeName('1.1'));
 w.Hys308Workflow.openNew('flash');
 const sample={
  tipo_incidente:'Cuasi Accidente',probabilidad:'Baja',fecha_ocurrencia:'2026-11-10',
  hora:'09:10',area_proyecto:'VA4',ubicacion:'Lugar de prueba',
  involucrado:'Persona ficticia',cargo:'Operador',
  primeros_auxilios:'No',ambulancia:'No',hospital:'No',existen_testigos:'No',
  hechos:'Descripción completamente simulada para validar los datos de la investigación.',
  causas_aparentes:'Causa inmediata ficticia de prueba',
  acciones_inmediatas:'Medida preventiva simulada de prueba',
  reportado_por:'Informante ficticio',preparado_por:'Elaborador ficticio'
 };
 for(const [key,value] of Object.entries(sample)){
  const field=d.querySelector('#hys306FlashForm [name="'+key+'"]');
  assert.ok(field,key);field.value=value;field.dispatchEvent(new w.Event('input',{bubbles:true}));
 }
 d.getElementById('hys308ReviewerFlash').value='demo-supervisor';
 assert.equal(w.Hys308Workflow.send('flash'),true);
 const c=w.Hys308Workflow.state().cases[0];
 assert.ok(w.Hys308Workflow.openCase(c.id,'final'));
 const codeSelector=d.querySelector('#hys306FinalForm .hys306-cause-select');
 codeSelector.value='1.1';codeSelector.dispatchEvent(new w.Event('change',{bubbles:true}));
 const textarea=d.querySelector('#hys306FinalForm [name="condiciones_subestandar"]');
 assert.ok(textarea.value.includes('1.1 — '+safeName('1.1')),'No copió código y nombre al formulario');
 const actionCode=d.querySelector('#hys306ActionRows select[name$="_codigo"]');
 assert.ok([...actionCode.options].find(x=>x.value==='2.49').textContent.includes(safeName('2.49')));
 d.getElementById('hys306AddAction').click();
 const allActionSelects=d.querySelectorAll('#hys306ActionRows select[name$="_codigo"]');
 assert.equal(allActionSelects.length,4);
 assert.ok([...allActionSelects[3].options].find(x=>x.value==='3.31').textContent.includes(safeName('3.31')));
 assert.ok(!read('causas-catalogo-v308.js').includes('localStorage')&&!read('causas-catalogo-v308.js').includes('supabase.from'));
 console.log('OK catálogo: 153 códigos y nombres, selección completa, cuadro de texto y planes de acción.');
 dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
