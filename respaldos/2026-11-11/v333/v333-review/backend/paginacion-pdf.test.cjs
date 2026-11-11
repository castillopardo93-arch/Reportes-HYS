const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {writeFile}=require('node:fs/promises');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');

const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAAA8CAIAAAB+RarbAAABg0lEQVR4nO3bwW3CQBCF4SFKDy7A7oIuSB8+UgRH+ghdpAYucA8F5J7Di1bI2lkce3d2Ztb/zSAkf5plhATsrt8/1FJvtW9Aug3svebA75Pr/cdY5T7K9fV5fr5sbsLNgadHOjQ5CbY6HM+P+y36FAs22uH4N6euH6JmV0c6aBM5mXCUGh2yB3BU6/M9zJ3hy2nkPlBYBSeo6ReaXFqLtWRuwmuoyBI4qp1PRTbA6wcb0g7OSEWql1Z2LamdcAkq0gjOspy4dIHLDTakBSxARSqWlpiWqk9YkopqgosuJ646YPnBhqTBFalIdGlV15LYhDVQkQS4ynLiKgvWM9hQKbBCKiqytNRqKfuENVNRTrCq5cSVB6x/sKG1YENUtGppmdPS4glbpKIlYBPLiet/YLuDDc0FO6CiWUvLjZZeTtgTFaXAppcTV/xId/3gUkvchB/3W9cPz484oKJZS8uNlhJgIC+n0ZOWEksLP/vx92tiFd8tSdYceLf9jcd5G9h7zYF/AYyJl7/3G75kAAAAAElFTkSuQmCC';
const photos=Array.from({length:7},(_,index)=>({name:'Imagen '+(index+1),data:png}));
const lines=(n,label)=>Array.from({length:n},(_,i)=>label+' '+String(i+1).padStart(3,'0')).join('\n');

for(const otros of [false,true]){
 const name=otros?'supervisores':'prevencionistas';
 test('PDF largo '+name+': títulos unidos, texto íntegro y fotos dentro de A4',
  {skip:!process.env.HYS_JSPDF_251},async()=>{
   const {jsPDF}=require(process.env.HYS_JSPDF_251);
   const source=readFileSync(join(__dirname,'../index.html'),'utf8');
   const context={window:{}};
   runInNewContext(source.match(/\/\* v239:[\s\S]*?(?=<\/script>)/)[0],context);
   const data={activities:[],inspections:[],findings:[]};
   if(otros)data.findings=[
    [lines(4,'Hallazgo inicial'),'Alta','Asegurar el área','Equipo','Pendiente',photos],
    [lines(120,'Control detallado'),'Media',lines(39,'Medida adicional'),'Equipo','Pendiente',photos]
   ];
   else data.activities=[
    ['APR','Eléctrica',lines(2,'Actividad inicial'),'Revisión',photos],
    [lines(39,'Responsable'),'Eléctrica',lines(120,'Control detallado'),'Revisión',photos]
   ];
   const result=await context.window.HysReportPdf.create(jsPDF,{
    owner:'Equipo ficticio',dateFrom:'2026-11-10',dateTo:'2026-11-11',date:'2026-11-11',
    shift:'Día',project:'Prueba de paginación',area:'Eléctrica',status:'Finalizado',data
   },{otros,photoColumns:3,photoRatio:'4:3'});
   assert.ok(result.pages>=4);
   assert.equal(result.warnings.length,0);
   const isHeading=entry=>/^(Actividades HYS|Actividades por área|Hallazgos)(?:$| \(continuación\)| - registro)/.test(entry.text||'');
   for(let page=1;page<=result.pages;page++){
    const body=result.audit.filter(entry=>entry.page===page&&entry.y>=32);
    assert.ok(body.some(entry=>!isHeading(entry)),'Página sin datos: '+page);
    for(const entry of body){
     assert.ok(entry.y+entry.h<=279.01,'Contenido bajo el margen: '+page);
     assert.ok(entry.x+entry.w<=198.01,'Contenido fuera del margen derecho: '+page);
     if(/- registro \d+$/.test(entry.text||'')){
      const following=body.slice(body.indexOf(entry)+1);
      assert.ok(following.length&&!isHeading(following[0]),'Título de registro separado de su primera fila: '+page);
     }
    }
   }
   const text=result.audit.map(entry=>entry.text||'').join('\n');
   for(let n=1;n<=120;n++)assert.ok(text.includes('Control detallado '+String(n).padStart(3,'0')));
   assert.equal(result.audit.filter(entry=>entry.kind==='photo').length,14);
   if(process.env.HYS_PDF_MUESTRAS){
    await writeFile(join(process.env.HYS_PDF_MUESTRAS,'PDF-largo-'+name+'-v327.pdf'),
     Buffer.from(await result.blob.arrayBuffer()));
   }
 });
}
