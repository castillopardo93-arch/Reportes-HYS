const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const start=html.indexOf('$("pdfShare").onclick=async()=>{');
const end=html.indexOf('$("print").onclick=printReporte;',start);
const handler=html.slice(start,end);
assert(start>0&&end>start);
async function run(otros){
 const nodes={},archives=[],downloads=[],shares=[],exports=[];
 const blob=new Blob(['PDF-SIMULADO-PARA-PRUEBA-DE-FLUJO'],{type:'application/pdf'});
 const report={data:{activities:[],inspections:[],findings:[]}};
 let modal;
 const context={Blob,File,console,URL:{createObjectURL:()=> 'blob:prueba',revokeObjectURL(){}},setTimeout:fn=>fn(),navigator:{canShare:()=>true,async share(data){shares.push(data);}},document:{querySelector:()=>({}),body:{appendChild(){}},createElement(tag){if(tag==='div'){const buttons={};return modal={style:{},querySelector:selector=>buttons[selector]||(buttons[selector]={}),remove(){}};}return {click(){downloads.push({href:this.href,name:this.download});},remove(){}};}},$:id=>nodes[id]||(nodes[id]={}),validarDatosInicioParaPDF:()=>true,save(){},updatePrintInicio(){},nombreArchivoPDF:()=> 'prueba.pdf',ensurePdfLibraries:async()=>{},pack:()=>report,getPhotoColumns:()=> '5',getPhotoRatio:()=> '4:3',archiveGeneratedPdf:async(value,name)=>archives.push({value,name}),alert:message=>{throw Error(message);}};
 context.window=context;context.__REPORTES_HYS_OTROS_EMBEDDED__=otros;context.jspdf={jsPDF:function(){}};
 context.HysReportPdf={async create(PDF,input,options){exports.push({input,options});return {blob,pages:2,warnings:[]};}};
 vm.runInNewContext(handler,context);
 await nodes.pdfShare.onclick();assert.equal(exports.length,1);assert.equal(JSON.stringify(exports[0].input),JSON.stringify(report));assert.notEqual(exports[0].input,report,'PDF debe usar una instantánea estable');assert.equal(exports[0].options.otros,otros);assert.equal(archives[0].value,blob);
 modal.querySelector('[data-pdf-action="download"]').onclick();assert.equal(downloads[0].href,'blob:prueba');assert.equal(downloads[0].name,'prueba.pdf');assert.equal(exports.length,1,'Descargar vuelve a generar otro PDF');
 await nodes.pdfShare.onclick();await modal.querySelector('[data-pdf-action="share"]').onclick();assert.equal(shares.length,1);assert.equal(shares[0].files[0].name,'prueba.pdf');assert.deepEqual(Buffer.from(await shares[0].files[0].arrayBuffer()),Buffer.from(await blob.arrayBuffer()));assert.equal(exports.length,2,'Compartir vuelve a generar otro PDF');
 console.log('OK '+(otros?'OTROS':'APR')+': vista previa, archivo local, descarga y compartido reutilizan el mismo PDF');
}
(async()=>{await run(false);await run(true);})().catch(e=>{console.error(e);process.exitCode=1;});


